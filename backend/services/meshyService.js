const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');

const MESHY_API_BASE = 'https://api.meshy.ai';

function getMeshyApiKey() {
  return (
    process.env.MESHY_API_KEY ||
    process.env.MESHY_API_TOKEN ||
    process.env.MESHY_TOKEN ||
    ''
  ).trim();
}

const meshyHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

/**
 * Runs Image-to-3D or Text-to-3D using the official Meshy API.
 * Meshy offers 200 free credits on sign up (worth ~10-12 free 3D models with full PBR textures).
 */
async function runMeshyGeneration({ prompt, imageInput, taskId, updateTask, polyBudget = 'medium' }) {
  const apiKey = getMeshyApiKey();
  if (!apiKey) {
    throw new Error(
      'MESHY_API_KEY is not configured in Render (or backend/.env). Please create a free account at meshy.ai, copy your API key from Account Settings, and add it to your Environment Variables.'
    );
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  await updateTask({ progress: 10, status: 'RUNNING' });

  let createEndpoint;
  let payload;

  if (imageInput) {
    // Image-to-3D via Meshy v1 API
    createEndpoint = `${MESHY_API_BASE}/openapi/v1/image-to-3d`;
    payload = {
      image_url: imageInput,
      enable_pbr: true,
      should_remesh: true,
      should_texture: true,
      ai_model: 'meshy-4',
    };

    if (polyBudget === 'low') {
      payload.target_polycount = 15000;
    } else if (polyBudget === 'high') {
      payload.target_polycount = 80000;
    } else {
      payload.target_polycount = 35000;
    }
  } else {
    // Text-to-3D via Meshy v2 API
    createEndpoint = `${MESHY_API_BASE}/openapi/v2/text-to-3d`;
    payload = {
      mode: 'preview',
      prompt: prompt?.trim(),
      art_style: 'realistic',
      should_remesh: true,
    };
  }

  console.log(`[Meshy 3D] Creating ${imageInput ? 'image-to-3d' : 'text-to-3d'} task for ${taskId}...`);

  let createRes;
  try {
    createRes = await axios.post(createEndpoint, payload, {
      headers: meshyHeaders(apiKey),
      timeout: 30000,
    });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.message || err.response?.data?.error || err.message;
    if (status === 401 || status === 403) {
      throw new Error(`Meshy authentication failed: ${detail}. Please check your MESHY_API_KEY.`);
    }
    if (status === 402 || (typeof detail === 'string' && /credit/i.test(detail))) {
      throw new Error('Meshy free credits exhausted. Please check your Meshy account balance.');
    }
    throw new Error(`Meshy task creation failed: ${detail}`);
  }

  const meshyTaskId = createRes.data?.result;
  if (!meshyTaskId) {
    throw new Error('Meshy API did not return a valid task ID.');
  }

  console.log(`[Meshy 3D] Task created with Meshy ID: ${meshyTaskId}. Starting polling...`);
  await updateTask({ progress: 20, status: 'RUNNING' });

  // Poll status until completed or timed out
  const statusEndpoint = imageInput
    ? `${MESHY_API_BASE}/openapi/v1/image-to-3d/${meshyTaskId}`
    : `${MESHY_API_BASE}/openapi/v2/text-to-3d/${meshyTaskId}`;

  const maxAttempts = 120; // up to ~4-5 minutes
  let completedData = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2500));

    try {
      const statusRes = await axios.get(statusEndpoint, {
        headers: meshyHeaders(apiKey),
        timeout: 15000,
      });

      const taskData = statusRes.data || {};
      const status = (taskData.status || '').toUpperCase();
      const progress = typeof taskData.progress === 'number' ? taskData.progress : 25;

      await updateTask({
        progress: Math.min(95, Math.max(20, progress)),
        status: 'RUNNING',
      });

      if (status === 'SUCCEEDED') {
        completedData = taskData;
        break;
      }

      if (status === 'FAILED' || status === 'EXPIRED') {
        const errorMsg = taskData.task_error?.message || taskData.message || 'Generation failed on Meshy';
        throw new Error(`Meshy generation failed: ${errorMsg}`);
      }
    } catch (pollErr) {
      if (pollErr.message && pollErr.message.includes('Meshy generation failed')) {
        throw pollErr;
      }
      console.warn(`[Meshy 3D] Polling transient error: ${pollErr.message}`);
    }
  }

  if (!completedData) {
    throw new Error('Meshy generation timed out. Please try again.');
  }

  // Extract model URLs
  const remoteGlbUrl =
    completedData.model_urls?.glb ||
    completedData.result?.glb ||
    completedData.model_url;

  if (!remoteGlbUrl) {
    throw new Error('Meshy completed but did not provide a GLB download URL.');
  }

  await updateTask({ progress: 95, status: 'RUNNING' });

  // Download GLB to local server to avoid browser CORS on assets.meshy.ai
  const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
  console.log(`[Meshy 3D] Downloading GLB from Meshy CDN (${remoteGlbUrl})...`);

  try {
    const glbStream = await axios.get(remoteGlbUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    fs.writeFileSync(destGlbPath, Buffer.from(glbStream.data));
  } catch (dlErr) {
    console.warn(`[Meshy 3D] Local download failed (${dlErr.message}), will serve remote URL directly.`);
  }

  const glbServeUrl = fs.existsSync(destGlbPath) ? `/uploads/ar/${taskId}.glb` : remoteGlbUrl;
  const thumbnailUrl =
    completedData.thumbnail_url ||
    completedData.rendered_image ||
    completedData.texture_urls?.[0];

  const modelUrls = {
    glb: glbServeUrl,
    originalUrl: remoteGlbUrl,
    source: remoteGlbUrl,
    ...(completedData.model_urls || {}),
  };

  await updateTask({
    progress: 100,
    status: 'SUCCESS',
    modelUrls,
    thumbnailUrl,
    completedAt: new Date(),
  });

  console.log(`[Meshy 3D] Task ${taskId} successfully finished and ready!`);
  return glbServeUrl;
}

module.exports = {
  runMeshyGeneration,
  getMeshyApiKey,
};
