const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');

/**
 * Runs Hunyuan3D-2.1 generation asynchronously.
 * Supports both prompt-to-3D (via Pollinations concept image) and image-to-3D.
 */
async function runHunyuanGeneration({ prompt, imageInput, taskId, updateTask }) {
  let tempImageFile = null;

  try {
    const { Client, handle_file } = await import('@gradio/client');

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    let imageToProcess = imageInput;
    let conceptImageUrl = null;

    // Step 1: If prompt only, generate 2D concept image for free using Pollinations Flux
    if (!imageToProcess && prompt) {
      await updateTask({ progress: 10, status: 'RUNNING' });
      const encodedPrompt = encodeURIComponent(prompt.trim());
      conceptImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux`;

      try {
        const imgRes = await axios.get(conceptImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
        tempImageFile = path.join(UPLOAD_DIR, `temp_concept_${taskId}.jpg`);
        fs.writeFileSync(tempImageFile, Buffer.from(imgRes.data));
        imageToProcess = tempImageFile;
      } catch (pollErr) {
        console.warn('[Hunyuan3D] Pollinations fetch failed, falling back to direct URL:', pollErr.message);
        imageToProcess = conceptImageUrl;
      }

      await updateTask({ progress: 25, thumbnailUrl: conceptImageUrl });
    }

    // Step 2: Prepare file payload for Gradio
    let filePayload;
    if (typeof imageToProcess === 'string' && imageToProcess.startsWith('data:image/')) {
      const matches = imageToProcess.match(/^data:(image\/(\w+));base64,(.+)$/s);
      if (!matches) throw new Error('Invalid image data URL');
      const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
      tempImageFile = path.join(UPLOAD_DIR, `temp_upload_${taskId}.${ext}`);
      fs.writeFileSync(tempImageFile, Buffer.from(matches[3], 'base64'));
      filePayload = await handle_file(tempImageFile);
    } else if (tempImageFile) {
      filePayload = await handle_file(tempImageFile);
    } else {
      filePayload = await handle_file(imageToProcess);
    }

    await updateTask({ progress: 40, status: 'RUNNING' });

    // Step 3: Connect to Hugging Face space
    const connectOptions = {};
    if (process.env.HF_TOKEN) {
      connectOptions.hf_token = process.env.HF_TOKEN;
    }
    const app = await Client.connect('tencent/Hunyuan3D-2.1', connectOptions);

    await updateTask({ progress: 55, status: 'RUNNING' });

    // Step 4: Run prediction
    const seed = Math.floor(Math.random() * 1000000);
    const result = await app.predict('/generation_all', [
      null,          // caption (state)
      filePayload,   // image
      null,          // mv_image_front
      null,          // mv_image_back
      null,          // mv_image_left
      null,          // mv_image_right
      30,            // steps
      5,             // guidance_scale
      seed,          // seed
      256,           // octree_resolution
      true,          // check_box_rembg
      8000,          // num_chunks
      true,          // randomize_seed
    ]);

    await updateTask({ progress: 85, status: 'RUNNING' });

    // Step 5: Locate the generated GLB
    // result.data: [File (shape), File (textured), Html, Json, Seed]
    const glbFileInfo = result.data?.[1] || result.data?.[0];
    if (!glbFileInfo || (!glbFileInfo.url && !glbFileInfo.path)) {
      throw new Error('Hunyuan3D finished but did not return a 3D model file.');
    }

    const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
    const downloadUrl = glbFileInfo.url || glbFileInfo.path;

    if (downloadUrl.startsWith('http')) {
      const glbRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
      fs.writeFileSync(destGlbPath, Buffer.from(glbRes.data));
    } else if (fs.existsSync(downloadUrl)) {
      fs.copyFileSync(downloadUrl, destGlbPath);
    }

    // Clean up temporary image
    if (tempImageFile && fs.existsSync(tempImageFile)) {
      try {
        fs.unlinkSync(tempImageFile);
      } catch (_) {}
    }

    const glbServeUrl = `/uploads/ar/${taskId}.glb`;
    const finalThumbnail = conceptImageUrl || (typeof imageInput === 'string' && imageInput.startsWith('http') ? imageInput : undefined);

    await updateTask({
      progress: 100,
      status: 'SUCCESS',
      modelUrls: { glb: glbServeUrl },
      thumbnailUrl: finalThumbnail,
      completedAt: new Date(),
    });
  } catch (err) {
    console.error(`[Hunyuan3D] Task ${taskId} error:`, err);
    if (tempImageFile && fs.existsSync(tempImageFile)) {
      try {
        fs.unlinkSync(tempImageFile);
      } catch (_) {}
    }
    await updateTask({
      status: 'FAILED',
      errorMessage: err.message || 'Hunyuan3D generation failed',
    });
  }
}

module.exports = {
  runHunyuanGeneration,
};
