const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const gltfPipeline = require('gltf-pipeline');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');

function getSketchfabToken() {
  return (
    process.env.SKETCHFAB_API_TOKEN ||
    process.env.SKETCHFAB_TOKEN ||
    process.env.SKETCHFAB_API_KEY ||
    ''
  ).trim();
}

/**
 * Searches Sketchfab for free downloadable 3D models matching a prompt,
 * downloads the model archive, converts/extracts to a self-contained GLB,
 * and serves it for WebAR and AR Studio.
 */
async function runSketchfabGeneration({ prompt, taskId, updateTask }) {
  const token = getSketchfabToken();
  if (!token) {
    throw new Error(
      'SKETCHFAB_API_TOKEN is not configured in Render (or backend/.env). Please get your free API token from Sketchfab (Settings -> Password & API) and add it to your Environment Variables.'
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

  console.log(`[Sketchfab] Searching for downloadable models matching "${cleanPrompt}"...`);

  // 1. Search for downloadable models sorted by community favorites
  let searchUrl = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(cleanPrompt)}&sort_by=-likeCount`;
  let searchRes;

  try {
    searchRes = await axios.get(searchUrl, { timeout: 15000 });
  } catch (err) {
    console.warn('[Sketchfab] Search with likeCount failed, trying general search:', err.message);
    searchUrl = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(cleanPrompt)}`;
    searchRes = await axios.get(searchUrl, { timeout: 15000 });
  }

  const results = searchRes.data?.results || [];
  if (results.length === 0) {
    throw new Error(`No free downloadable 3D models found on Sketchfab for "${cleanPrompt}". Try a broader term (e.g., "dog", "keyboard", "car").`);
  }

  const topMatch = results[0];
  const modelUid = topMatch.uid;
  const modelName = topMatch.name || cleanPrompt;
  const modelThumbnail =
    topMatch.thumbnails?.images?.[0]?.url ||
    topMatch.thumbnails?.images?.[1]?.url ||
    undefined;

  console.log(`[Sketchfab] Found top match: "${modelName}" (UID: ${modelUid})`);
  await updateTask({
    progress: 35,
    status: 'RUNNING',
    thumbnailUrl: modelThumbnail,
  });

  // 2. Request temporary signed download URL from Sketchfab API
  const downloadApiUrl = `https://api.sketchfab.com/v3/models/${modelUid}/download`;
  console.log(`[Sketchfab] Requesting download link for ${modelUid}...`);

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
    if (status === 401 || status === 403) {
      throw new Error(`Sketchfab authentication failed (${errorDetail}). Please check your SKETCHFAB_API_TOKEN in Render.`);
    }
    throw new Error(`Sketchfab download request failed: ${errorDetail}`);
  }

  const downloadData = downloadRes.data || {};
  const glbUrl = downloadData.glb?.url;
  const gltfUrl = downloadData.gltf?.url;

  if (!glbUrl && !gltfUrl) {
    throw new Error(`Model "${modelName}" does not have a downloadable GLB or glTF format available on Sketchfab.`);
  }

  await updateTask({ progress: 60, status: 'RUNNING' });

  const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
  let tempDir = null;

  try {
    if (glbUrl) {
      // Direct GLB download
      console.log(`[Sketchfab] Downloading direct GLB from signed URL...`);
      const glbStream = await axios.get(glbUrl, {
        responseType: 'arraybuffer',
        timeout: 90000,
      });
      fs.writeFileSync(destGlbPath, Buffer.from(glbStream.data));
    } else {
      // glTF zip archive download & conversion to self-contained GLB
      console.log(`[Sketchfab] Downloading glTF archive and compiling to GLB...`);
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
        // Search subdirectories
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
        throw new Error('Downloaded archive from Sketchfab does not contain a valid .gltf file.');
      }

      const gltfFilePath = path.join(gltfDir, gltfFileName);
      const gltfJson = JSON.parse(fs.readFileSync(gltfFilePath, 'utf8'));

      console.log(`[Sketchfab] Converting ${gltfFileName} into binary GLB...`);
      const glbResult = await gltfPipeline.gltfToGlb(gltfJson, {
        resourceDirectory: gltfDir,
      });

      fs.writeFileSync(destGlbPath, glbResult.glb);
    }
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }

  await updateTask({ progress: 90, status: 'RUNNING' });

  const glbServeUrl = `/uploads/ar/${taskId}.glb`;

  await updateTask({
    progress: 100,
    status: 'SUCCESS',
    modelUrls: {
      glb: glbServeUrl,
      originalUrl: glbServeUrl,
      source: `https://sketchfab.com/3d-models/${modelUid}`,
    },
    thumbnailUrl: modelThumbnail,
    completedAt: new Date(),
  });

  console.log(`[Sketchfab] Model "${modelName}" successfully imported and ready as ${glbServeUrl}!`);
  return glbServeUrl;
}

module.exports = {
  runSketchfabGeneration,
  getSketchfabToken,
};
