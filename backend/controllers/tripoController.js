const axios = require('axios');
const Tripo3DTask = require('../models/Tripo3DTask');
const { assertCanAfford, deductCredits, getCreditsRemaining, previewCost, refineCost } = require('../utils/credits');

const TRIPO_API_BASE = process.env.TRIPO_API_URL || 'https://api.tripo3d.ai/v2/openapi';

const getTripoApiKey = () => {
  if (!process.env.TRIPO_API_KEY) {
    throw new Error('TRIPO_API_KEY is not configured in environment variables');
  }
  return process.env.TRIPO_API_KEY;
};

const tripoHeaders = () => ({
  Authorization: `Bearer ${getTripoApiKey()}`,
  'Content-Type': 'application/json',
});

function applyTripoTaskToDoc(task, data) {
  task.status = (data.status || task.status).toUpperCase();
  task.progress = typeof data.progress === 'number' ? data.progress : task.progress ?? 0;
  
  const output = data.output || data.result || {};
  const modelUrl = output.pbr_model || output.model;
  
  if (['success', 'succeeded'].includes(task.status.toLowerCase())) {
    task.modelUrls = {
      glb: modelUrl,
    };
    task.thumbnailUrl = output.rendered_image;
    task.completedAt = new Date();
  } else if (['failed', 'expired', 'cancelled'].includes(task.status.toLowerCase())) {
    const rawError = data.error;
    const errMsg = typeof rawError === 'string' ? rawError : rawError?.message || 'Generation failed';
    task.errorMessage = errMsg;
  }
}

function mapPolyToTarget(poly) {
  if (poly === 'low') return 12000;
  if (poly === 'high') return 100000;
  return 30000;
}

// POST /api/tripo/generate — Tripo text-to-3d
exports.generate3DModel = async (req, res) => {
  const { prompt, target_polycount, poly_budget } = req.body || {};

  try {
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const charge = previewCost() + refineCost(); // Tripo does a full model generation
    await assertCanAfford(req.user._id, charge);

    const face_limit = typeof target_polycount === 'number'
      ? target_polycount
      : poly_budget ? mapPolyToTarget(poly_budget) : 30000;

    const body = {
      type: 'text_to_model',
      prompt: prompt.trim().slice(0, 600),
      face_limit: Math.min(300000, Math.max(100, Math.round(face_limit))),
    };

    const createRes = await axios.post(`${TRIPO_API_BASE}/task`, body, {
      headers: tripoHeaders(),
    });

    const data = createRes.data?.data || createRes.data;
    const taskId = data.task_id || data.taskId;

    if (!taskId) {
      return res.status(502).json({ message: 'Tripo did not return a task id' });
    }

    const task = await Tripo3DTask.create({
      userId: req.user._id,
      taskId,
      prompt: body.prompt,
      tripoApiKind: 'text_to_model',
      status: 'QUEUED',
    });

    await deductCredits(req.user._id, charge);
    const creditsRemaining = await getCreditsRemaining(req.user._id);

    res.status(201).json({
      message: '3D model task created',
      creditsCharged: charge,
      creditsRemaining,
      task: {
        _id: task._id,
        taskId: task.taskId,
        prompt: task.prompt,
        status: task.status,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    const status = error.status || error.response?.status;
    if (status === 402) {
      return res.status(402).json({ message: error.message });
    }
    console.error('Generate 3D Model Error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to create 3D generation task',
      error: error.response?.data?.message || error.message,
    });
  }
};

// POST /api/tripo/generate-from-image — Tripo image-to-3d
exports.generateFromImage = async (req, res) => {
  const { image_url, image_data_url, poly_budget, target_polycount } = req.body || {};
  const imageInput = String(image_data_url || image_url || '').trim();

  try {
    if (!imageInput) {
      return res.status(400).json({ message: 'image_data_url or image_url is required' });
    }

    const charge = previewCost() + refineCost();
    await assertCanAfford(req.user._id, charge);

    const face_limit = typeof target_polycount === 'number'
      ? target_polycount
      : poly_budget ? mapPolyToTarget(poly_budget) : 30000;

    const body = {
      type: 'image_to_model',
      face_limit: Math.min(300000, Math.max(100, Math.round(face_limit))),
    };

    const isDataUrl = imageInput.startsWith('data:image/');

    if (isDataUrl) {
      // Extract mime type and base64 payload from data URL
      const matches = imageInput.match(/^data:(image\/(\w+));base64,(.+)$/s);
      if (!matches) {
        return res.status(400).json({ message: 'Invalid image data URL format' });
      }
      const base64Data = matches[3];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Tripo /upload only accepts WebP — convert with sharp
      const sharp = require('sharp');
      const webpBuffer = await sharp(imageBuffer).webp({ quality: 90 }).toBuffer();

      // Upload image to Tripo to get an image_token
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', webpBuffer, {
        filename: 'upload.webp',
        contentType: 'image/webp',
      });

      const uploadRes = await axios.post(`${TRIPO_API_BASE}/upload`, form, {
        headers: {
          Authorization: `Bearer ${getTripoApiKey()}`,
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const uploadData = uploadRes.data?.data || uploadRes.data;
      const imageToken = uploadData?.image_token || uploadData?.token;

      if (!imageToken) {
        console.error('Tripo upload response:', JSON.stringify(uploadData));
        return res.status(502).json({ message: 'Tripo image upload did not return a token' });
      }

      body.file = { type: 'jpg', file_token: imageToken };
    } else {
      // Public URL — derive extension from URL or default to jpeg
      const urlLower = imageInput.toLowerCase();
      const ext = urlLower.endsWith('.png') ? 'png'
        : urlLower.endsWith('.webp') ? 'webp'
        : 'jpeg';
      body.file = { type: ext, url: imageInput };
    }

    const createRes = await axios.post(`${TRIPO_API_BASE}/task`, body, {
      headers: tripoHeaders(),
    });

    const data = createRes.data?.data || createRes.data;
    const newTaskId = data.task_id || data.taskId;

    if (!newTaskId) {
      return res.status(502).json({ message: 'Tripo did not return a task id' });
    }

    const task = await Tripo3DTask.create({
      userId: req.user._id,
      taskId: newTaskId,
      prompt: '[image-to-3d]',
      tripoApiKind: 'image_to_model',
      status: 'QUEUED',
    });

    await deductCredits(req.user._id, charge);
    const creditsRemaining = await getCreditsRemaining(req.user._id);

    res.status(201).json({
      message: 'Image-to-3D task created',
      creditsCharged: charge,
      creditsRemaining,
      task: {
        _id: task._id,
        taskId: task.taskId,
        prompt: task.prompt,
        status: task.status,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    const status = error.status || error.response?.status;
    if (status === 402) {
      return res.status(402).json({ message: error.message });
    }
    console.error('Generate From Image Error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to create image-to-3D task',
      error: error.response?.data?.message || error.message,
    });
  }
};


// GET /api/tripo/task/:taskId
exports.getTaskStatus = async (req, res) => {
  const { taskId } = req.params;

  try {
    const task = await Tripo3DTask.findOne({ taskId, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const statusRes = await axios.get(`${TRIPO_API_BASE}/task/${encodeURIComponent(taskId)}`, {
      headers: tripoHeaders(),
    });

    const data = statusRes.data?.data || statusRes.data;
    applyTripoTaskToDoc(task, data);
    await task.save();

    res.json({
      task: {
        _id: task._id,
        taskId: task.taskId,
        prompt: task.prompt,
        tripoApiKind: task.tripoApiKind,
        status: task.status,
        progress: task.progress,
        modelUrls: task.modelUrls,
        thumbnailUrl: task.thumbnailUrl,
        videoUrl: task.videoUrl,
        errorMessage: task.errorMessage,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      },
    });
  } catch (error) {
    console.error('Get Task Status Error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to get task status',
      error: error.response?.data?.message || error.message,
    });
  }
};

exports.getUserTasks = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const tasks = await Tripo3DTask.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

    const total = await Tripo3DTask.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error('Get User Tasks Error:', error.message);
    res.status(500).json({ message: 'Failed to get user tasks', error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await Tripo3DTask.findOne({ taskId, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete Task Error:', error.message);
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
};

exports.proxyAsset = async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  // Basic SSRF protection — only allow known model hosting domains
  const allowedDomains = ['assets.meshy.ai', 'tripo3d.ai', 'amazonaws.com'];
  try {
    const parsed = new URL(url);
    const isAllowed = allowedDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
    if (!isAllowed) {
      return res.status(403).json({ message: 'URL domain not allowed for proxying' });
    }
  } catch (e) {
    return res.status(400).json({ message: 'Invalid URL format' });
  }

  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
    });
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    response.data.pipe(res);
  } catch (error) {
    console.error('Proxy Asset Error:', error.message);
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch asset', error: error.message });
  }
};
