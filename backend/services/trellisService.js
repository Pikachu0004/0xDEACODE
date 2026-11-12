const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');
const { extractModelUrlOrPath } = require('./hunyuanService');

/**
 * Runs TRELLIS generation asynchronously (Microsoft Research SOTA 3D).
 * Ultra-fast inference (8-15s), low GPU quota usage.
 */
async function runTrellisGeneration({ prompt, imageInput, taskId, updateTask }) {
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
      await updateTask({ progress: 15, status: 'RUNNING' });
      const encodedPrompt = encodeURIComponent(prompt.trim());
      conceptImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux`;

      try {
        const imgRes = await axios.get(conceptImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
        tempImageFile = path.join(UPLOAD_DIR, `temp_trellis_${taskId}.jpg`);
        fs.writeFileSync(tempImageFile, Buffer.from(imgRes.data));
        imageToProcess = tempImageFile;
      } catch (pollErr) {
        console.warn('[TRELLIS] Pollinations fetch failed, falling back to direct URL:', pollErr.message);
        imageToProcess = conceptImageUrl;
      }

      await updateTask({ progress: 30, thumbnailUrl: conceptImageUrl });
    }

    // Step 2: Prepare file payload for Gradio
    let filePayload;
    if (typeof imageToProcess === 'string' && imageToProcess.startsWith('data:image/')) {
      const matches = imageToProcess.match(/^data:(image\/(\w+));base64,(.+)$/s);
      if (!matches) throw new Error('Invalid image data URL');
      const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
      tempImageFile = path.join(UPLOAD_DIR, `temp_trellis_up_${taskId}.${ext}`);
      fs.writeFileSync(tempImageFile, Buffer.from(matches[3], 'base64'));
      filePayload = await handle_file(tempImageFile);
    } else if (tempImageFile) {
      filePayload = await handle_file(tempImageFile);
    } else {
      filePayload = await handle_file(imageToProcess);
    }

    await updateTask({ progress: 45, status: 'RUNNING' });

    // Step 3: Connect to TRELLIS space
    const connectOptions = {};
    if (process.env.HF_TOKEN) {
      connectOptions.hf_token = process.env.HF_TOKEN;
    }
    const app = await Client.connect('trellis-community/TRELLIS', connectOptions);

    await updateTask({ progress: 60, status: 'RUNNING' });

    // Step 4: Run prediction
    const seed = Math.floor(Math.random() * 1000000);
    const result = await app.predict('/generate_and_extract_glb', [
      filePayload,       // image
      [],                // multiimages
      null,              // state
      seed,              // seed
      7.5,               // ss_guidance_strength
      12,                // ss_sampling_steps
      3,                 // slat_guidance_strength
      12,                // slat_sampling_steps
      'stochastic',      // multiimage_algo
      0.95,              // mesh_simplify
      1024,              // texture_size
    ]);

    console.log('[TRELLIS] Prediction finished. Raw result data:', JSON.stringify(result?.data));

    await updateTask({ progress: 85, status: 'RUNNING' });

    // Step 5: Locate the generated GLB
    let modelLocation = extractModelUrlOrPath(result?.data);
    if (!modelLocation) {
      const item2 = result?.data?.[2] || result?.data?.[1];
      if (item2) {
        modelLocation = typeof item2 === 'string' ? item2 : (item2.url || item2.path || item2.value);
      }
    }

    if (!modelLocation) {
      throw new Error('TRELLIS completed but 3D GLB file was not returned.');
    }

    if (typeof modelLocation === 'string' && modelLocation.startsWith('/')) {
      modelLocation = `https://trellis-community-trellis.hf.space${modelLocation}`;
    }

    const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);

    if (typeof modelLocation === 'string' && modelLocation.startsWith('http')) {
      const glbRes = await axios.get(modelLocation, { responseType: 'arraybuffer', timeout: 90000 });
      fs.writeFileSync(destGlbPath, Buffer.from(glbRes.data));
    } else if (typeof modelLocation === 'string' && fs.existsSync(modelLocation)) {
      fs.copyFileSync(modelLocation, destGlbPath);
    }

    // Clean up temporary image
    if (tempImageFile && fs.existsSync(tempImageFile)) {
      try { fs.unlinkSync(tempImageFile); } catch (_) {}
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

    return glbServeUrl;
  } catch (err) {
    console.error(`[TRELLIS] Task ${taskId} error:`, err);
    if (tempImageFile && fs.existsSync(tempImageFile)) {
      try { fs.unlinkSync(tempImageFile); } catch (_) {}
    }
    throw err;
  }
}

module.exports = {
  runTrellisGeneration,
};

