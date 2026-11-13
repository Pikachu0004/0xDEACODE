const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');

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
async function runThreeDaiImageTo3D({ imageInput, taskId, updateTask, polyBudget = 'medium' }) {
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

  // Prepare payload: supports base64 data URI or public image URL
  const isDataUri = typeof imageInput === 'string' && imageInput.startsWith('data:image/');
  const payload = {
    texture: true,
    pbr: true,
  };

  if (isDataUri) {
    payload.image = imageInput;
  } else {
    payload.image_url = imageInput;
  }

  // Model endpoints: try Tripo image-to-3d or fallback to Tencent Rapid
  const endpoints = [
    `${THREEDAI_API_BASE}/v1/3d-models/tripo/image-to-3d/`,
    `${THREEDAI_API_BASE}/v1/3d-models/tencent/generate/rapid/`,
    `${THREEDAI_API_BASE}/v1/3d-models/trellis2/generate/`,
  ];

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

  console.log(`[3D AI Studio] Task created with ID: ${studioTaskId}. Starting polling...`);
  await updateTask({ progress: 25, status: 'RUNNING' });

  // Poll status endpoint: GET /v1/generation-request/{task_id}/status/
  const statusEndpoint = `${THREEDAI_API_BASE}/v1/generation-request/${studioTaskId}/status/`;
  const maxAttempts = 120; // ~4-5 minutes
  let finishedData = null;

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

      if (status === 'FINISHED' || status === 'SUCCESS' || status === 'SUCCEEDED') {
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

  // Extract model URL from results array
  // Schema: results: [ { asset_url: "https://..." } ] or [ { url: "https://..." } ]
  let remoteGlbUrl = null;
  let thumbnailUrl = null;

  if (Array.isArray(finishedData.results) && finishedData.results.length > 0) {
    const first = finishedData.results[0];
    remoteGlbUrl = typeof first === 'string' ? first : (first.asset_url || first.url || first.glb_url || first.download_url);
    thumbnailUrl = typeof first === 'object' ? (first.thumbnail || first.preview_url || first.thumbnail_url) : undefined;
  } else if (finishedData.asset_url || finishedData.url || finishedData.glb) {
    remoteGlbUrl = finishedData.asset_url || finishedData.url || finishedData.glb;
  }

  if (!remoteGlbUrl) {
    console.error('[3D AI Studio] Raw finished response:', JSON.stringify(finishedData));
    throw new Error('3D AI Studio task finished but no 3D asset URL was found in results.');
  }

  await updateTask({ progress: 95, status: 'RUNNING' });

  // Download GLB locally to server to ensure 100% same-origin, fast AR loading
  const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
  console.log(`[3D AI Studio] Downloading GLB asset from ${remoteGlbUrl}...`);

  try {
    const glbStream = await axios.get(remoteGlbUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    fs.writeFileSync(destGlbPath, Buffer.from(glbStream.data));
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
