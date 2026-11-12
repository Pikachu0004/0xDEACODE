const { runWaveSpeedGeneration, getWaveSpeedKey } = require('./wavespeedService');
const { runTrellisGeneration } = require('./trellisService');
const { runHunyuanGeneration } = require('./hunyuanService');

/**
 * Executes 3D model generation using either a specific engine
 * or the Auto-fallback strategy (tries WaveSpeed first if key configured, then free engines).
 */
async function dispatchGeneration({ engine = 'auto', prompt, imageInput, taskId, updateTask }) {
  if (engine === 'wavespeed') {
    try {
      await runWaveSpeedGeneration({ prompt, imageInput, taskId, updateTask });
    } catch (err) {
      await updateTask({
        status: 'FAILED',
        errorMessage: err.message || 'WaveSpeed 3D generation failed',
      });
    }
    return;
  }

  if (engine === 'trellis') {
    try {
      await runTrellisGeneration({ prompt, imageInput, taskId, updateTask });
    } catch (err) {
      await updateTask({
        status: 'FAILED',
        errorMessage: err.message || 'TRELLIS generation failed',
      });
    }
    return;
  }

  if (engine === 'hunyuan') {
    try {
      await runHunyuanGeneration({ prompt, imageInput, taskId, updateTask });
    } catch (err) {
      await updateTask({
        status: 'FAILED',
        errorMessage: err.message || 'Hunyuan3D generation failed',
      });
    }
    return;
  }

  // Engine === 'auto': Smart Fallback
  console.log(`[Auto 3D] Starting Auto mode for task ${taskId}...`);

  // If user configured WAVESPEED_API_KEY in Render, prioritize WaveSpeed AI
  if (getWaveSpeedKey()) {
    try {
      console.log(`[Auto 3D] Attempting WaveSpeed AI with user API key...`);
      await updateTask({ progress: 10, status: 'RUNNING' });
      await runWaveSpeedGeneration({ prompt, imageInput, taskId, updateTask });
      console.log(`[Auto 3D] WaveSpeed AI succeeded for task ${taskId}!`);
      return;
    } catch (wsErr) {
      console.warn(`[Auto 3D] WaveSpeed attempt failed (${wsErr.message}). Falling back to TRELLIS...`);
      await updateTask({ progress: 20, status: 'RUNNING' });
    }
  }

  // Attempt: TRELLIS
  try {
    console.log(`[Auto 3D] Attempting TRELLIS...`);
    await updateTask({ progress: 30, status: 'RUNNING' });
    await runTrellisGeneration({ prompt, imageInput, taskId, updateTask });
    console.log(`[Auto 3D] TRELLIS succeeded for task ${taskId}!`);
    return;
  } catch (trellisErr) {
    console.warn(`[Auto 3D] TRELLIS attempt failed (${trellisErr.message}). Falling back to Hunyuan3D...`);
    await updateTask({ progress: 40, status: 'RUNNING' });
  }

  // Attempt: Hunyuan3D
  try {
    console.log(`[Auto 3D] Attempting Hunyuan3D fallback...`);
    await runHunyuanGeneration({ prompt, imageInput, taskId, updateTask });
    console.log(`[Auto 3D] Hunyuan3D succeeded for task ${taskId}!`);
    return;
  } catch (hunyuanErr) {
    console.error(`[Auto 3D] All engines failed for task ${taskId}:`, hunyuanErr.message);
    await updateTask({
      status: 'FAILED',
      errorMessage: `Generation failed across available engines: ${hunyuanErr.message}`,
    });
  }
}

module.exports = {
  dispatchGeneration,
};
