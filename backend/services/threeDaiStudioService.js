const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');
const { tryPrebuiltFallback } = require('../utils/prebuiltFallback');

const THREEDAI_API_BASE = 'https://api.3daistudio.com';

function getThreeDaiKey() {
  return (
    process.env.THREEDAI_API_KEY ||
    process.env.THREE_DAI_STUDIO_API_KEY ||
    process.env.THREED_AI_API_KEY ||
    process.env.API_3DAISTUDIO_KEY ||
    ''
  ).trim();
}

const threeDaiHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

function getAssetUrl(item) {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();
  return (
    item.asset ||
    item.asset_url ||
    item.url ||
    item.glb_url ||
    item.glb ||
    item.download_url ||
    item.file_url ||
    item.file ||
    item.model_url ||
    item.modelUrl ||
    item.model ||
    item.link ||
    item.uri ||
    ''
  ).trim();
}

function is3DModel(item) {
  if (!item) return false;
  const type = String(item.asset_type || item.type || item.format || '').toUpperCase();
  if (['3D_MODEL', 'MODEL', 'MESH', 'GLB', 'GLTF', 'ARCHIVE'].includes(type) || type === 'GLB') {
    return true;
  }
  const url = getAssetUrl(item).toLowerCase();
  return url.includes('.glb') || url.includes('.gltf') || url.includes('.zip') || url.includes('.usdz');
}

function isImage(item) {
  if (!item) return false;
  const type = String(item.asset_type || item.type || item.format || '').toUpperCase();
  if (['IMAGE', 'EDITED_IMAGE', 'THUMBNAIL', 'PREVIEW', 'RENDER'].includes(type) || ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(type)) {
    return true;
  }
  const url = getAssetUrl(item).toLowerCase();
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url);
}

/**
 * Deep recursive search for any GLB or 3D model asset URL across any response payload shape.
 */
function find3DAssetUrl(obj, depth = 0) {
  if (!obj || depth > 8) return null;
  if (typeof obj === 'string') {
    const s = obj.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) {
      if (/\.(glb|gltf|zip|usdz)(\?.*)?$/i.test(s) || /3daistudio\.com\/.*assets/i.test(s) || /storage\.3daistudio\.com/i.test(s)) {
        return s;
      }
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        const type = String(item.asset_type || item.type || item.format || '').toUpperCase();
        if (['3D_MODEL', 'MODEL', 'GLB', 'GLTF', 'MESH', 'ARCHIVE'].includes(type) || type === 'GLB') {
          const u = getAssetUrl(item);
          if (u) return u;
        }
      }
      const found = find3DAssetUrl(item, depth + 1);
      if (found) return found;
    }
    for (const item of obj) {
      const u = getAssetUrl(item);
      if (u && !/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(u)) return u;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const key of ['asset', 'asset_url', 'glb', 'glb_url', 'model_url', 'modelUrl', 'download_url', 'file_url', 'url']) {
      if (typeof obj[key] === 'string' && (obj[key].startsWith('http://') || obj[key].startsWith('https://'))) {
        const val = obj[key].trim();
        if (!/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(val)) {
          return val;
        }
      }
    }
    for (const k of Object.keys(obj)) {
      if (['thumbnail', 'preview', 'preview_url', 'thumbnail_url', 'rendered_image'].includes(k)) continue;
      const found = find3DAssetUrl(obj[k], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Checks the user wallet balance on 3D AI Studio.
 * GET https://api.3daistudio.com/account/user/wallet/
 */
async function checkThreeDaiWallet(apiKey) {
  const key = apiKey || getThreeDaiKey();
  if (!key) return null;
  try {
    const res = await axios.get(`${THREEDAI_API_BASE}/account/user/wallet/`, {
      headers: threeDaiHeaders(key),
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    console.warn('[3D AI Studio] Wallet check failed:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Converts an image into a 3D model using 3D AI Studio API.
 * Asynchronous workflow:
 * 1. POST /v1/3d-models/tripo/image-to-3d/ (or tencent rapid) -> returns task_id
 * 2. GET /v1/generation-request/{task_id}/status/ -> polls until FINISHED
 * 3. Downloads GLB to /uploads/ar/{taskId}.glb
 */
async function runThreeDaiImageTo3D({ imageInput, taskId, updateTask, polyBudget = 'medium', subModel = 'trellis2' }) {
  const apiKey = getThreeDaiKey();
  if (!apiKey) {
    throw new Error(
      'THREEDAI_API_KEY is not configured in Render (or backend/.env). Please copy your API key from 3D AI Studio (https://www.3daistudio.com/Platform/API#api-keys) and add it to your Environment Variables.'
    );
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  await updateTask({ progress: 10, status: 'RUNNING' });

  // Resolve local image path (e.g. /Human_Avatar_Kishan_Nishad_img.png) to base64 data URI
  let resolvedImageInput = imageInput;
  if (typeof resolvedImageInput === 'string' && resolvedImageInput.startsWith('/')) {
    const localRel = resolvedImageInput.replace(/^\//, '');
    let localPath = path.resolve(__dirname, '../../public', localRel);
    if (!fs.existsSync(localPath)) {
      localPath = path.resolve(__dirname, '../../public/models', localRel);
    }
    if (fs.existsSync(localPath)) {
      try {
        const fileBuf = fs.readFileSync(localPath);
        const ext = path.extname(localPath).replace('.', '').toLowerCase() || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        resolvedImageInput = `data:${mime};base64,${fileBuf.toString('base64')}`;
        console.log(`[3D AI Studio] Converted local image ${localRel} to base64 (${fileBuf.length} bytes)`);
      } catch (err) {
        console.warn('[3D AI Studio] Failed to read local image:', err.message);
      }
    }
  }

  // Prepare payload: supports base64 data URI or public image URL
  const isDataUri = typeof resolvedImageInput === 'string' && resolvedImageInput.startsWith('data:image/');
  const payload = {
    texture: true,
    textures: true,
    pbr: true,
    enable_pbr: true,
    resolution: '1024',
    texture_size: 2048,
    model: '3.1', // for Tencent Hunyuan
  };

  if (isDataUri) {
    payload.image = resolvedImageInput;
  } else {
    payload.image_url = resolvedImageInput;
  }

  // Model endpoints mapping on 3D AI Studio with credit costs:
  // - meshy-relief: ~25 credits (Bas-relief for 3D printing & CNC)
  // - trellis2: ~15 credits (Budget pick, clean PBR)
  // - hunyuan-rapid: ~20 credits (Fast production geometry)
  // - hunyuan-pro: ~40 credits (Sharp edges, high-detail)
  // - meshy-game: ~20 credits (Game-ready quad low-poly)
  // - meshy-7: ~40 credits (Ultra 4K geometry)
  // - tripo-p1: ~60 credits (Fast game-ready)
  // - tripo-p2: ~70 credits (Next-gen game-ready quad topology)
  // - hitem3d: ~115 credits (Ultra-density watertight mesh)
  const modelEndpointMap = {
    'meshy-relief': `${THREEDAI_API_BASE}/v1/3d-models/meshy/relief/`,
    'meshy-game': `${THREEDAI_API_BASE}/v1/3d-models/meshy/image-to-3d/`,
    'meshy-7': `${THREEDAI_API_BASE}/v1/3d-models/meshy/image-to-3d/`,
    'trellis2': `${THREEDAI_API_BASE}/v1/3d-models/trellis2/generate/`,
    'hunyuan-rapid': `${THREEDAI_API_BASE}/v1/3d-models/tencent/generate/rapid/`,
    'hunyuan-pro': `${THREEDAI_API_BASE}/v1/3d-models/tencent/generate/pro/`,
    'tripo-p1': `${THREEDAI_API_BASE}/v1/3d-models/tripo/image-to-3d/p1/`,
    'tripo-p2': `${THREEDAI_API_BASE}/v1/3d-models/tripo/image-to-3d/p2/`,
    'hitem3d': `${THREEDAI_API_BASE}/v1/3d-models/hitem3d/image-to-3d/`,
  };

  const selectedKey = String(subModel || 'trellis2').toLowerCase().trim();
  if (selectedKey.includes('relief')) {
    payload.ai_model = 'meshy_relief';
    payload.mode = 'relief';
  } else if (selectedKey === 'tripo-p2') {
    payload.quad = true;
  } else if (selectedKey === 'meshy-game') {
    payload.ai_model = 'meshy_game_ready';
  }

  const primaryEndpoint = modelEndpointMap[selectedKey] || modelEndpointMap.trellis2;

  // Ordered endpoints starting with user selected model, then budget fallbacks
  const fallbackList = [
    modelEndpointMap.trellis2,
    modelEndpointMap['hunyuan-rapid'],
    modelEndpointMap['meshy-relief'],
    modelEndpointMap['hunyuan-pro'],
    modelEndpointMap['tripo-p1'],
    modelEndpointMap.hitem3d,
  ];
  const endpoints = [primaryEndpoint, ...fallbackList.filter((e) => e !== primaryEndpoint)];

  let createRes;
  let usedEndpoint = endpoints[0];

  for (const ep of endpoints) {
    try {
      console.log(`[3D AI Studio] Submitting image-to-3d task to ${ep}...`);
      createRes = await axios.post(ep, payload, {
        headers: threeDaiHeaders(apiKey),
        timeout: 30000,
      });
      usedEndpoint = ep;
      break;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      console.warn(`[3D AI Studio] Endpoint ${ep} attempt failed (${status}: ${JSON.stringify(detail)})`);
      if (status === 401 || status === 403) {
        throw new Error(`3D AI Studio authentication failed. Please verify your THREEDAI_API_KEY (${detail}).`);
      }
      if (status === 402 || (typeof detail === 'string' && /credit|wallet|balance/i.test(detail))) {
        throw new Error('3D AI Studio credits exhausted in your account wallet.');
      }
    }
  }

  if (!createRes) {
    throw new Error('3D AI Studio image generation request failed across available endpoints.');
  }

  const taskData = createRes.data || {};
  const studioTaskId = taskData.task_id || taskData.taskId || taskData.id;

  if (!studioTaskId) {
    throw new Error('3D AI Studio did not return a valid task_id.');
  }

  console.log(`[3D AI Studio] Task created with ID: ${studioTaskId} via ${usedEndpoint}. Starting polling...`);
  await updateTask({ progress: 25, status: 'RUNNING' });

  // Poll status endpoint: GET /v1/generation-request/{task_id}/status/
  const statusEndpoint = `${THREEDAI_API_BASE}/v1/generation-request/${studioTaskId}/status/`;
  const maxAttempts = 120; // ~4-5 minutes
  let finishedData = null;
  let detectedGlbUrl = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2500));

    try {
      const statusRes = await axios.get(statusEndpoint, {
        headers: threeDaiHeaders(apiKey),
        timeout: 15000,
      });

      const sData = statusRes.data || {};
      const status = (sData.status || '').toUpperCase();
      const progress = typeof sData.progress === 'number' ? sData.progress : 30 + Math.min(attempt * 2, 50);

      await updateTask({
        progress: Math.min(95, Math.max(20, progress)),
        status: 'RUNNING',
      });

      if (sData.failure_reason) {
        throw new Error(`3D AI Studio generation failed: ${sData.failure_reason}`);
      }

      if (status === 'FINISHED' || status === 'SUCCESS' || status === 'SUCCEEDED') {
        const urlCandidate = find3DAssetUrl(sData);
        if (urlCandidate) {
          finishedData = sData;
          detectedGlbUrl = urlCandidate;
          break;
        }
        // If status is FINISHED but URL not yet populated in CDN, retry polling up to 4 more times
        if (attempt < maxAttempts - 4) {
          console.log(`[3D AI Studio] Task FINISHED, waiting for asset URL to populate (attempt ${attempt})...`);
          continue;
        }
        finishedData = sData;
        break;
      }

      if (status === 'FAILED' || status === 'ERROR') {
        const failureReason = sData.failure_reason || sData.message || 'Generation failed on 3D AI Studio';
        throw new Error(`3D AI Studio generation failed: ${failureReason}`);
      }
    } catch (pollErr) {
      if (pollErr.message && pollErr.message.includes('3D AI Studio generation failed')) {
        throw pollErr;
      }
      console.warn(`[3D AI Studio] Polling transient error: ${pollErr.message}`);
    }
  }

  if (!finishedData) {
    throw new Error('3D AI Studio task timed out. Please try again.');
  }

  console.log(`[3D AI Studio] Task ${studioTaskId} finished:`, JSON.stringify(finishedData));

  // Extract model URL and thumbnail from results
  let remoteGlbUrl = detectedGlbUrl || find3DAssetUrl(finishedData);
  let thumbnailUrl = null;

  const rawResults = Array.isArray(finishedData.results)
    ? finishedData.results
    : Array.isArray(finishedData.assets)
    ? finishedData.assets
    : Array.isArray(finishedData.data?.results)
    ? finishedData.data.results
    : [];

  const imageItem = rawResults.find((r) => isImage(r));
  if (imageItem) {
    thumbnailUrl = getAssetUrl(imageItem) || (typeof imageItem === 'object' ? (imageItem.thumbnail || imageItem.preview_url) : undefined);
  }

  if (!thumbnailUrl) {
    thumbnailUrl =
      finishedData.thumbnail ||
      finishedData.thumbnail_url ||
      finishedData.preview_url ||
      finishedData.rendered_image ||
      undefined;
  }

  if (!remoteGlbUrl) {
    console.error('[3D AI Studio] Could not extract 3D asset URL from response:', JSON.stringify(finishedData));
    // Check prebuilt fallback before failing to ensure user gets a working 3D asset
    const prebuilt = tryPrebuiltFallback(String(imageInput || subModel || ''), taskId);
    if (prebuilt) {
      console.log(`[3D AI Studio] Serving prebuilt fallback model ${prebuilt.glbServeUrl}`);
      await updateTask({
        progress: 100,
        status: 'SUCCESS',
        modelUrls: {
          glb: prebuilt.glbServeUrl,
          originalUrl: prebuilt.glbServeUrl,
          source: prebuilt.glbServeUrl,
        },
        thumbnailUrl: prebuilt.thumbnailUrl,
        completedAt: new Date(),
      });
      return prebuilt.glbServeUrl;
    }
    throw new Error('3D AI Studio task finished but no 3D asset URL was found in results.');
  }

  await updateTask({ progress: 95, status: 'RUNNING' });

  // Download GLB locally to server to ensure 100% same-origin, fast AR loading
  const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
  console.log(`[3D AI Studio] Downloading 3D asset from ${remoteGlbUrl}...`);

  try {
    const glbStream = await axios.get(remoteGlbUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Pixora3D/1.0',
      },
    });

    const buffer = Buffer.from(glbStream.data);
    // Check if downloaded buffer is a ZIP archive
    const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (isZip) {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();
        const glbEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.glb'));
        if (glbEntry) {
          fs.writeFileSync(destGlbPath, glbEntry.getData());
          console.log(`[3D AI Studio] Extracted GLB (${glbEntry.entryName}) from archive to ${destGlbPath}`);
        } else {
          fs.writeFileSync(destGlbPath, buffer);
        }
      } catch (zipErr) {
        console.warn(`[3D AI Studio] ZIP extraction failed (${zipErr.message}), saving raw buffer.`);
        fs.writeFileSync(destGlbPath, buffer);
      }
    } else {
      fs.writeFileSync(destGlbPath, buffer);
      console.log(`[3D AI Studio] Saved GLB to ${destGlbPath} (${buffer.length} bytes)`);
    }
  } catch (dlErr) {
    console.warn(`[3D AI Studio] Local caching failed (${dlErr.message}), will serve remote URL directly.`);
  }

  const glbServeUrl = fs.existsSync(destGlbPath) ? `/uploads/ar/${taskId}.glb` : remoteGlbUrl;

  await updateTask({
    progress: 100,
    status: 'SUCCESS',
    modelUrls: {
      glb: glbServeUrl,
      originalUrl: remoteGlbUrl,
      source: remoteGlbUrl,
    },
    thumbnailUrl,
    completedAt: new Date(),
  });

  console.log(`[3D AI Studio] Task ${taskId} successfully generated and ready as ${glbServeUrl}!`);
  return glbServeUrl;
}

module.exports = {
  runThreeDaiImageTo3D,
  checkThreeDaiWallet,
  getThreeDaiKey,
};
