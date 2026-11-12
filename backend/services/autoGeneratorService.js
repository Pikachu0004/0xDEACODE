const { runTrellisGeneration } = require('./trellisService');
const { runHunyuanGeneration } = require('./hunyuanService');

/**
 * Executes 3D model generation using either a specific engine
 * or the Auto-fallback strategy (tries fastest/lowest quota first, then falls back).
 */
async function dispatchGeneration({ engine = 'auto', prompt, imageInput, taskId, updateTask }) {
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

  // Attempt 1: TRELLIS (Microsoft Research - fast & light on quota)
  try {
    console.log(`[Auto 3D] Attempting TRELLIS first...`);
    await updateTask({ progress: 10, status: 'RUNNING' });
    await runTrellisGeneration({ prompt, imageInput, taskId, updateTask });
    console.log(`[Auto 3D] TRELLIS succeeded for task ${taskId}!`);
    return;
  } catch (trellisErr) {
    console.warn(`[Auto 3D] TRELLIS attempt failed (${trellisErr.message}). Falling back to Hunyuan3D...`);
    await updateTask({ progress: 20, status: 'RUNNING' });
  }

  // Attempt 2: Hunyuan3D (Tencent - high detail fallback)
  try {
    console.log(`[Auto 3D] Attempting Hunyuan3D fallback...`);
    await runHunyuanGeneration({ prompt, imageInput, taskId, updateTask });
    console.log(`[Auto 3D] Hunyuan3D succeeded for task ${taskId}!`);
    return;
  } catch (hunyuanErr) {
    console.error(`[Auto 3D] Both free engines failed for task ${taskId}:`, hunyuanErr.message);
    await updateTask({
      status: 'FAILED',
      errorMessage: `Generation failed across available free engines. Please try again or switch engine: ${hunyuanErr.message}`,
    });
  }
}

module.exports = {
  dispatchGeneration,
};

