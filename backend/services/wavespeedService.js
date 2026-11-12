const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');

const WAVESPEED_API_BASE = 'https://api.wavespeed.ai/api/v3';

function getWaveSpeedKey() {
  return process.env.WAVESPEED_API_KEY || '';
}

/**
 * Executes a 3D model generation task using WaveSpeed AI.
 * Handles task submission, polling, and saving the resulting GLB file.
 */
async function runWaveSpeedGeneration({ prompt, imageInput, taskId, updateTask }) {
  const apiKey = getWaveSpeedKey();
  if (!apiKey) {
    throw new Error('WAVESPEED_API_KEY is not configured in Render Environment Variables. Please add your WaveSpeed API key in Render.');
  }

  await updateTask({ progress: 10, status: 'RUNNING' });

  let endpoint;
  let requestBody;
  let tempImageFile = null;

  try {
    if (imageInput) {
      // Image to 3D via WaveSpeed
      endpoint = `${WAVESPEED_API_BASE}/trellis-2/image-to-3d`;
      requestBody = {
        image: imageInput,
        remove_background: true,
      };
    } else {
      // Text to 3D
      endpoint = `${WAVESPEED_API_BASE}/tripo3d/p1/text-to-3d`;
      requestBody = {
        prompt: prompt.trim(),
      };
    }

    console.log(`[WaveSpeed] Submitting 3D task to ${endpoint}...`);

    let submitRes;
    try {
      submitRes = await axios.post(endpoint, requestBody, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    } catch (subErr) {
      // If tripo3d/p1 endpoint fails, fallback to tripo3d/h3.1 or trellis-2
      const status = subErr.response?.status;
      if (status === 404 && !imageInput && prompt) {
        console.warn('[WaveSpeed] /tripo3d/p1 returned 404, attempting /tripo3d/h3.1/text-to-3d...');
        endpoint = `${WAVESPEED_API_BASE}/tripo3d/h3.1/text-to-3d`;
        submitRes = await axios.post(endpoint, requestBody, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        });
      } else {
        const errMsg = subErr.response?.data?.message || subErr.message;
        throw new Error(`WaveSpeed submission failed: ${errMsg}`);
      }
    }

    const predictionData = submitRes.data?.data || submitRes.data;
    const predictionId = predictionData?.id || predictionData?.task_id;

    if (!predictionId) {
      throw new Error(`WaveSpeed did not return a prediction ID: ${JSON.stringify(submitRes.data)}`);
    }

    console.log(`[WaveSpeed] Task submitted successfully. Prediction ID: ${predictionId}`);
    await updateTask({ progress: 25, status: 'RUNNING' });

    // Poll for prediction completion
    const resultUrl = `${WAVESPEED_API_BASE}/predictions/${predictionId}/result`;
    const maxAttempts = 120;
    let attempt = 0;
    let modelRemoteUrl = null;

    while (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      attempt += 1;

      try {
        const pollRes = await axios.get(resultUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 20000,
        });

        const data = pollRes.data?.data || pollRes.data;
        const status = (data?.status || '').toLowerCase();

        // Incrementally update progress
        const currentProgress = Math.min(90, 25 + Math.round(attempt * 1.5));
        await updateTask({ progress: currentProgress, status: 'RUNNING' });

        if (['completed', 'succeeded', 'success'].includes(status)) {
          const outputs = data.outputs || data.urls || (data.output ? [data.output] : []);
          if (Array.isArray(outputs) && outputs.length > 0) {
            modelRemoteUrl = typeof outputs[0] === 'string' ? outputs[0] : outputs[0]?.url;
          } else if (typeof data.model === 'string') {
            modelRemoteUrl = data.model;
          }
          break;
        }

        if (['failed', 'cancelled', 'timeout', 'deleted'].includes(status)) {
          throw new Error(`WaveSpeed generation ${status}: ${data?.error || data?.message || 'Processing error'}`);
        }
      } catch (pollErr) {
        if (pollErr.message.includes('WaveSpeed generation')) {
          throw pollErr;
        }
        console.warn(`[WaveSpeed] Polling attempt ${attempt} error:`, pollErr.message);
      }
    }

    if (!modelRemoteUrl) {
      throw new Error('WaveSpeed task timed out before completing.');
    }

    console.log(`[WaveSpeed] Model generated. Downloading: ${modelRemoteUrl}`);
    await updateTask({ progress: 95, status: 'RUNNING' });

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
    const glbRes = await axios.get(modelRemoteUrl, {
      responseType: 'arraybuffer',
      timeout: 90000,
    });
    fs.writeFileSync(destGlbPath, Buffer.from(glbRes.data));

    const glbServeUrl = `/uploads/ar/${taskId}.glb`;

    await updateTask({
      progress: 100,
      status: 'SUCCESS',
      modelUrls: { glb: glbServeUrl },
      completedAt: new Date(),
    });

    return glbServeUrl;
  } catch (err) {
    console.error(`[WaveSpeed] Task ${taskId} error:`, err);
    throw err;
  }
}

module.exports = {
  runWaveSpeedGeneration,
  getWaveSpeedKey,
};
