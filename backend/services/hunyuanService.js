const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { UPLOAD_DIR } = require('../utils/arGlbPaths');

/**
 * Robustly extracts the generated 3D model URL or file path from any Gradio return format.
 */
function extractModelUrlOrPath(data) {
  if (!data) return null;

  function checkItem(item) {
    if (!item) return null;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (
        trimmed.endsWith('.glb') ||
        trimmed.endsWith('.obj') ||
        trimmed.includes('.glb?') ||
        trimmed.includes('/file=')
      ) {
        return trimmed;
      }
      // Check if it's HTML with /static/.../textured_mesh.html
      const staticMatch = trimmed.match(/\/static\/([a-zA-Z0-9_.-]+)\/(?:textured_mesh|white_mesh)\.html/);
      if (staticMatch) {
        return `https://tencent-hunyuan3d-2-1.hf.space/static/${staticMatch[1]}/textured_mesh.glb`;
      }
      const httpGlb = trimmed.match(/https?:\/\/[^\s"'<>]+\.(?:glb|obj)/i);
      if (httpGlb) {
        return httpGlb[0];
      }
      return null;
    }

    if (typeof item === 'object') {
      if (item.url && typeof item.url === 'string') return item.url;
      if (item.path && typeof item.path === 'string') return item.path;
      if (item.value) {
        const fromVal = checkItem(item.value);
        if (fromVal) return fromVal;
      }
      if (item.data) {
        const fromData = checkItem(item.data);
        if (fromData) return fromData;
      }
    }
    return null;
  }

  if (Array.isArray(data)) {
    // Priority: index 1 (textured mesh), then index 0 (mesh), then remaining
    const priority = [data[1], data[0], ...data.slice(2)];
    for (const el of priority) {
      const found = checkItem(el);
      if (found) return found;
    }
    // Scan all string items for iframe /static/ patterns
    for (const el of data) {
      if (typeof el === 'string') {
        const m = el.match(/\/static\/([a-zA-Z0-9_.-]+)\//);
        if (m && m[1]) {
          return `https://tencent-hunyuan3d-2-1.hf.space/static/${m[1]}/textured_mesh.glb`;
        }
      }
    }
  }

  return checkItem(data);
}

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

    console.log('[Hunyuan3D] Prediction finished. Raw result data:', JSON.stringify(result?.data));

    await updateTask({ progress: 85, status: 'RUNNING' });

    // Step 5: Locate the generated 3D model
    let modelLocation = extractModelUrlOrPath(result?.data);
    if (!modelLocation) {
      console.error('[Hunyuan3D] Could not find model in data:', result?.data);
      throw new Error('Hunyuan3D finished but model file was not located in output.');
    }

    if (modelLocation.startsWith('/')) {
      modelLocation = `https://tencent-hunyuan3d-2-1.hf.space${modelLocation}`;
    }

    const destGlbPath = path.join(UPLOAD_DIR, `${taskId}.glb`);

    if (modelLocation.startsWith('http')) {
      const glbRes = await axios.get(modelLocation, { responseType: 'arraybuffer', timeout: 90000 });
      fs.writeFileSync(destGlbPath, Buffer.from(glbRes.data));
    } else if (fs.existsSync(modelLocation)) {
      fs.copyFileSync(modelLocation, destGlbPath);
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
  extractModelUrlOrPath,
};
