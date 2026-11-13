const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');
const { extractModelUrlOrPath } = require('./hunyuanService');

/**
 * Executes a 3D model generation task using OpenAI Shap-E.
 * Shap-E is a lightweight text/image conditional 3D diffusion model released by OpenAI under the MIT license.
 * It decodes implicit 3D representations directly into textured GLB meshes.
 */
async function runShapeGeneration({ prompt, imageInput, taskId, updateTask }) {
  let tempImageFile = null;

  try {
    const { Client, handle_file } = await import('@gradio/client');

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    await updateTask({ progress: 10, status: 'RUNNING' });

    let conceptImageUrl = null;

    // Optional 2D preview thumbnail generation via Pollinations Flux if prompt is text
    if (prompt && !imageInput) {
      try {
        const encodedPrompt = encodeURIComponent(prompt.trim());
        conceptImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux`;
        await updateTask({ progress: 20, thumbnailUrl: conceptImageUrl });
      } catch (thumbErr) {
        console.warn('[Shap-E] Thumbnail generation skipped:', thumbErr.message);
      }
    }

    // Connect to the public Shap-E space
    const connectOptions = {};
    if (process.env.HF_TOKEN) {
      connectOptions.hf_token = process.env.HF_TOKEN;
    }

    console.log('[Shap-E] Connecting to hysts/Shap-E space...');
    const app = await Client.connect('hysts/Shap-E', connectOptions);

    await updateTask({ progress: 35, status: 'RUNNING' });

    let result;
    const seed = Math.floor(Math.random() * 2147483647);

    if (imageInput) {
      // Image-to-3D mode
      console.log(`[Shap-E] Task ${taskId}: Running image-to-3d inference...`);
      let filePayload;

      if (typeof imageInput === 'string' && imageInput.startsWith('data:image/')) {
        const matches = imageInput.match(/^data:(image\/(\w+));base64,(.+)$/s);
        if (!matches) throw new Error('Invalid image data URL');
        const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
        tempImageFile = path.join(UPLOAD_DIR, `temp_shape_${taskId}.${ext}`);
        fs.writeFileSync(tempImageFile, Buffer.from(matches[3], 'base64'));
        filePayload = await handle_file(tempImageFile);
      } else {
        filePayload = await handle_file(imageInput);
      }

      await updateTask({ progress: 50, status: 'RUNNING' });

      result = await app.predict('/image-to-3d', [
        filePayload, // image
        seed,        // seed
        3.0,         // guidance_scale (default for image)
        40,          // num_inference_steps
      ]);
    } else {
      // Text-to-3D mode
      const cleanPrompt = (prompt || '').trim();
      console.log(`[Shap-E] Task ${taskId}: Running text-to-3d inference for "${cleanPrompt}"...`);

      await updateTask({ progress: 50, status: 'RUNNING' });

      result = await app.predict('/text-to-3d', [
        cleanPrompt, // prompt
        seed,        // seed
        15.0,        // guidance_scale (default for text)
        40,          // num_inference_steps
      ]);
    }

    console.log(`[Shap-E] Task ${taskId}: Inference finished. Raw output:`, JSON.stringify(result?.data));
    await updateTask({ progress: 85, status: 'RUNNING' });

    // Step 4: Extract model URL or path
    let modelLocation = extractModelUrlOrPath(result?.data);
    if (!modelLocation && Array.isArray(result?.data) && result.data.length > 0) {
      const first = result.data[0];
      modelLocation = typeof first === 'string' ? first : (first?.url || first?.path || first?.value);
    }

    if (!modelLocation) {
      throw new Error('Shap-E completed but no 3D GLB model was returned.');
    }

    // Step 5: Save GLB locally and preserve remote CDN URL
    const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
    let modelRemoteUrl = null;

    if (modelLocation.startsWith('http://') || modelLocation.startsWith('https://')) {
      modelRemoteUrl = modelLocation;
      try {
        const glbRes = await axios.get(modelLocation, {
          responseType: 'arraybuffer',
          timeout: 60000,
        });
        fs.writeFileSync(destGlbPath, Buffer.from(glbRes.data));
      } catch (dlErr) {
        console.warn(`[Shap-E] Failed to save local file, using direct remote URL: ${dlErr.message}`);
      }
    } else if (fs.existsSync(modelLocation)) {
      fs.copyFileSync(modelLocation, destGlbPath);
    }

    const glbServeUrl = `/uploads/ar/${taskId}.glb`;
    const finalGlbUrl = modelRemoteUrl || glbServeUrl;

    await updateTask({
      progress: 100,
      status: 'SUCCESS',
      modelUrls: {
        glb: glbServeUrl,
        originalUrl: finalGlbUrl,
        source: modelRemoteUrl || glbServeUrl,
      },
      thumbnailUrl: conceptImageUrl || (typeof imageInput === 'string' && imageInput.startsWith('http') ? imageInput : undefined),
      completedAt: new Date(),
    });

    console.log(`[Shap-E] Task ${taskId} successfully generated 3D model!`);
    return glbServeUrl;
  } catch (err) {
    console.error(`[Shap-E] Task ${taskId} error:`, err);
    throw err;
  } finally {
    if (tempImageFile && fs.existsSync(tempImageFile)) {
      try { fs.unlinkSync(tempImageFile); } catch (_) {}
    }
  }
}

module.exports = {
  runShapeGeneration,
};
