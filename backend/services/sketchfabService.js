const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const gltfPipeline = require('gltf-pipeline');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');
const { tryPrebuiltFallback } = require('../utils/prebuiltFallback');

function getSketchfabToken() {
  return (
    process.env.SKETCHFAB_API_TOKEN ||
    process.env.SKETCHFAB_TOKEN ||
    process.env.SKETCHFAB_API_KEY ||
    process.env.PIXORA_API_TOKEN ||
    ''
  ).trim();
}

/**
 * Extracts normalized core tokens from a prompt, filtering out noise words.
 */
function extractCoreTokens(prompt) {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    '3d',
    'model',
    'models',
    'lowpoly',
    'highpoly',
    'pbr',
    'free',
    'asset',
    'assets',
    'download',
    'render',
    'file',
    'mesh',
    'realistic',
    'simple',
    'small',
    'large',
  ]);

  const cleaned = (prompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const coreTokens = rawTokens.filter((tok) => tok.length > 1 && !stopWords.has(tok));

  return coreTokens.length > 0 ? coreTokens : rawTokens;
}

/**
 * Calculates a match relevance score between user query and a candidate model.
 * Higher score = closer, more direct match to what the user actually searched for.
 */
function calculateRelevanceScore(model, cleanQuery, coreTokens) {
  const modelName = (model.name || '').toLowerCase();
  const tags = (model.tags || []).map((t) =>
    (typeof t === 'string' ? t : t.slug || t.name || '').toLowerCase()
  );
  const normalizedQuery = cleanQuery.toLowerCase();

  let score = 0;
  let matchedTokensInTitle = 0;
  let matchedTokensInTags = 0;

  // 1. Exact title match gets massive boost
  if (modelName === normalizedQuery) {
    score += 250;
  } else if (modelName.startsWith(normalizedQuery) || modelName.endsWith(normalizedQuery)) {
    score += 120;
  } else if (modelName.includes(normalizedQuery)) {
    score += 80;
  }

  // 2. Token-level analysis for individual words
  for (const token of coreTokens) {
    const wordBoundaryRegex = new RegExp(`(^|\\s|[,._\\-!?])${token}($|\\s|[,._\\-!?])`, 'i');
    if (wordBoundaryRegex.test(modelName)) {
      matchedTokensInTitle++;
      score += 90;
    } else if (modelName.includes(token)) {
      matchedTokensInTitle += 0.5;
      score += 40;
    }

    if (tags.some((t) => t === token)) {
      matchedTokensInTags++;
      score += 35;
    } else if (tags.some((t) => t.includes(token))) {
      matchedTokensInTags += 0.5;
      score += 15;
    }
  }

  // Bonus if all query tokens appear in the model title
  if (coreTokens.length > 1 && matchedTokensInTitle >= coreTokens.length) {
    score += 100;
  }

  // Disqualification check: If none of the core tokens appear in title or tags, reject
  if (matchedTokensInTitle === 0 && matchedTokensInTags === 0) {
    return -1000;
  }

  // 3. Penalty for scenes, rooms, environments, or packs when the user searched for a standalone object
  const userWantedPack = ['pack', 'scene', 'room', 'setup', 'environment', 'interior', 'collection', 'city', 'station', 'kitbash'].some(
    (kw) => normalizedQuery.includes(kw)
  );
  if (!userWantedPack) {
    const isPackOrScene = ['pack', 'scene', 'room', 'setup', 'environment', 'interior', 'alley', 'collection', 'stationery', 'kitbash', 'diorama'].some(
      (pw) => modelName.includes(pw)
    );
    if (isPackOrScene) {
      score -= 80;
    }
  }

  // 4. Concise title bonus (prefers targeted object titles like "Keyboard" over spam titles with 20 items)
  const lengthPenalty = Math.min(30, modelName.length * 0.35);
  score -= lengthPenalty;

  // 5. Quality signal: community likes (logarithmic scaling so it doesn't overpower true semantic match)
  const likes = typeof model.likeCount === 'number' ? model.likeCount : 0;
  if (likes > 0) {
    score += Math.min(25, Math.log10(likes) * 8);
  }

  return score;
}

/**
 * Searches Sketchfab via Data API with multi-query candidate gathering and smart relevance scoring.
 */
async function searchAndRankCandidates(cleanPrompt) {
  const coreTokens = extractCoreTokens(cleanPrompt);
  const candidatesMap = new Map();

  // Query A: Default relevance search (Sketchfab semantic ranking)
  const relevanceUrl = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(cleanPrompt)}`;
  // Query B: Popular search (high community favorites)
  const popularUrl = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(cleanPrompt)}&sort_by=-likeCount`;

  try {
    const resA = await axios.get(relevanceUrl, { timeout: 15000 });
    const resultsA = resA.data?.results || [];
    for (const m of resultsA) {
      if (m?.uid) candidatesMap.set(m.uid, m);
    }
  } catch (errA) {
    console.warn('[Pixora AI] Relevance search request failed:', errA.message);
  }

  try {
    const resB = await axios.get(popularUrl, { timeout: 15000 });
    const resultsB = resB.data?.results || [];
    for (const m of resultsB) {
      if (m?.uid && !candidatesMap.has(m.uid)) {
        candidatesMap.set(m.uid, m);
      }
    }
  } catch (errB) {
    console.warn('[Pixora AI] Popular search request failed:', errB.message);
  }

  if (candidatesMap.size === 0) {
    return [];
  }

  // Score all candidate models against the user query
  const scoredCandidates = [];
  for (const model of candidatesMap.values()) {
    const score = calculateRelevanceScore(model, cleanPrompt, coreTokens);
    if (score > 0) {
      const thumbnail =
        model.thumbnails?.images?.[0]?.url ||
        model.thumbnails?.images?.[1]?.url ||
        undefined;

      scoredCandidates.push({
        uid: model.uid,
        name: model.name || cleanPrompt,
        likeCount: model.likeCount || 0,
        score,
        thumbnail,
      });
    }
  }

  // Sort candidates strictly descending by relevance score
  scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates;
}

/**
 * Pixora AI 3D Generation Engine (backed by high-fidelity community 3D asset library)
 * Downloads, converts glTF/GLB archives into self-contained WebAR/AR Studio GLB meshes.
 * If candidate #1 fails or is not accessible, automatically advances to candidate #2, #3, etc.
 */
async function runSketchfabGeneration({ prompt, taskId, updateTask }) {
  const token = getSketchfabToken();
  if (!token) {
    throw new Error(
      'Pixora AI requires SKETCHFAB_API_TOKEN to be configured in Render (or backend/.env). Please set your token in Environment Variables.'
    );
  }

  await updateTask({ progress: 15, status: 'RUNNING' });

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const cleanPrompt = (prompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('Search query is required.');
  }

  console.log(`[Pixora AI] Searching and ranking 3D models for "${cleanPrompt}"...`);

  // Step 1: Search and rank all candidates with intelligent matching
  const candidates = await searchAndRankCandidates(cleanPrompt);

  if (candidates.length === 0) {
    // Check if prebuilt model matches
    const fallback = tryPrebuiltFallback(cleanPrompt, taskId);
    if (fallback) {
      console.log(`[Pixora AI] Served matching prebuilt asset for "${cleanPrompt}"`);
      await updateTask({
        progress: 100,
        status: 'SUCCESS',
        modelUrls: {
          glb: fallback.glbServeUrl,
          originalUrl: fallback.glbServeUrl,
          source: fallback.glbServeUrl,
        },
        thumbnailUrl: fallback.thumbnailUrl,
        completedAt: new Date(),
      });
      return fallback.glbServeUrl;
    }

    throw new Error(
      `Pixora AI: No matching 3D models found for "${cleanPrompt}". Please try a more specific or common keyword (e.g., "dog", "keyboard", "car", "chair").`
    );
  }

  console.log(`[Pixora AI] Found ${candidates.length} relevant candidate(s) for "${cleanPrompt}". Top candidate: "${candidates[0].name}" (score: ${candidates[0].score.toFixed(1)})`);

  // Step 2: Iterate through candidates in order of closest match until a working model is downloaded
  const maxAttempts = Math.min(candidates.length, 6);
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = candidates[attempt];
    const candidateRank = attempt + 1;

    console.log(
      `[Pixora AI] Attempting candidate #${candidateRank}/${maxAttempts}: "${candidate.name}" (Score: ${candidate.score.toFixed(1)}, UID: ${candidate.uid})...`
    );

    await updateTask({
      progress: Math.min(30 + attempt * 10, 60),
      status: 'RUNNING',
      thumbnailUrl: candidate.thumbnail,
    });

    const downloadApiUrl = `https://api.sketchfab.com/v3/models/${candidate.uid}/download`;
    let downloadRes;

    try {
      downloadRes = await axios.get(downloadApiUrl, {
        headers: {
          Authorization: `Token ${token}`,
        },
        timeout: 20000,
      });
    } catch (dlErr) {
      const status = dlErr.response?.status;
      const errorDetail = dlErr.response?.data?.detail || dlErr.message;

      // If token is invalid (401/403), stop immediately as retrying other candidates won't help
      if (status === 401 || status === 403) {
        throw new Error(`Pixora AI authentication failed (${errorDetail}). Please check your SKETCHFAB_API_TOKEN in Render.`);
      }

      console.warn(
        `[Pixora AI] Candidate #${candidateRank} "${candidate.name}" download link failed: ${errorDetail}. Jumping to next closest match...`
      );
      lastError = new Error(`Download request failed for "${candidate.name}": ${errorDetail}`);
      continue;
    }

    const downloadData = downloadRes.data || {};
    const glbUrl = downloadData.glb?.url;
    const gltfUrl = downloadData.gltf?.url;

    if (!glbUrl && !gltfUrl) {
      console.warn(
        `[Pixora AI] Candidate #${candidateRank} "${candidate.name}" has no GLB or glTF format available. Jumping to next closest match...`
      );
      lastError = new Error(`Model "${candidate.name}" does not have a downloadable 3D format available.`);
      continue;
    }

    await updateTask({ progress: 65, status: 'RUNNING' });

    const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
    let tempDir = null;

    try {
      if (glbUrl) {
        // Direct GLB download
        console.log(`[Pixora AI] Downloading direct binary GLB for "${candidate.name}"...`);
        const glbStream = await axios.get(glbUrl, {
          responseType: 'arraybuffer',
          timeout: 90000,
        });
        fs.writeFileSync(destGlbPath, Buffer.from(glbStream.data));
      } else {
        // glTF zip archive download & compile to self-contained GLB
        console.log(`[Pixora AI] Downloading glTF archive and compiling to GLB for "${candidate.name}"...`);
        const zipStream = await axios.get(gltfUrl, {
          responseType: 'arraybuffer',
          timeout: 90000,
        });

        tempDir = path.join(UPLOAD_DIR, `temp_sf_${taskId}`);
        fs.mkdirSync(tempDir, { recursive: true });

        const zip = new AdmZip(Buffer.from(zipStream.data));
        zip.extractAllTo(tempDir, true);

        // Locate scene.gltf or any .gltf
        const files = fs.readdirSync(tempDir);
        let gltfFileName = files.find((f) => f.toLowerCase().endsWith('.gltf'));
        let gltfDir = tempDir;

        if (!gltfFileName) {
          // Check immediate subdirectories
          for (const sub of files) {
            const subPath = path.join(tempDir, sub);
            if (fs.statSync(subPath).isDirectory()) {
              const subFiles = fs.readdirSync(subPath);
              const found = subFiles.find((f) => f.toLowerCase().endsWith('.gltf'));
              if (found) {
                gltfFileName = found;
                gltfDir = subPath;
                break;
              }
            }
          }
        }

        if (!gltfFileName) {
          throw new Error('Downloaded archive does not contain a valid .gltf file.');
        }

        const gltfFilePath = path.join(gltfDir, gltfFileName);
        const gltfJson = JSON.parse(fs.readFileSync(gltfFilePath, 'utf8'));

        console.log(`[Pixora AI] Converting ${gltfFileName} into binary GLB...`);
        const glbResult = await gltfPipeline.gltfToGlb(gltfJson, {
          resourceDirectory: gltfDir,
        });

        fs.writeFileSync(destGlbPath, glbResult.glb);
      }

      // Verify file size
      const stat = fs.statSync(destGlbPath);
      if (stat.size < 1000) {
        throw new Error('Generated GLB file is empty or corrupted.');
      }

      await updateTask({ progress: 90, status: 'RUNNING' });

      const glbServeUrl = `/uploads/ar/${taskId}.glb`;

      await updateTask({
        progress: 100,
        status: 'SUCCESS',
        modelUrls: {
          glb: glbServeUrl,
          originalUrl: glbServeUrl,
          source: glbServeUrl,
        },
        thumbnailUrl: candidate.thumbnail,
        completedAt: new Date(),
      });

      console.log(
        `[Pixora AI] Match succeeded! Model "${candidate.name}" (candidate #${candidateRank}) successfully imported as ${glbServeUrl}!`
      );
      return glbServeUrl;
    } catch (importErr) {
      console.warn(
        `[Pixora AI] Candidate #${candidateRank} "${candidate.name}" compilation failed (${importErr.message}). Jumping to next closest match...`
      );
      lastError = importErr;
      if (fs.existsSync(destGlbPath)) {
        try { fs.unlinkSync(destGlbPath); } catch (_) {}
      }
    } finally {
      if (tempDir && fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (_) {}
      }
    }
  }

  // If all candidate attempts failed, check offline prebuilt library
  const fallback = tryPrebuiltFallback(cleanPrompt, taskId);
  if (fallback) {
    console.log(`[Pixora AI] Seamlessly served prebuilt fallback model for "${cleanPrompt}"`);
    await updateTask({
      progress: 100,
      status: 'SUCCESS',
      modelUrls: {
        glb: fallback.glbServeUrl,
        originalUrl: fallback.glbServeUrl,
        source: fallback.glbServeUrl,
      },
      thumbnailUrl: fallback.thumbnailUrl,
      completedAt: new Date(),
    });
    return fallback.glbServeUrl;
  }

  throw new Error(
    `Pixora AI: Could not import a 3D model for "${cleanPrompt}". ${lastError ? lastError.message : 'No accessible models found'}. Try a different search term.`
  );
}

module.exports = {
  runSketchfabGeneration,
  getSketchfabToken,
  searchAndRankCandidates,
  calculateRelevanceScore,
};
