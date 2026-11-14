const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const StudioProject = require('../models/StudioProject');
const ProjectChatMessage = require('../models/ProjectChatMessage');
const { toClientProject, toClientMessage } = require('../utils/projectMapper');
const { arGlbFilePath, UPLOAD_DIR } = require('../utils/arGlbPaths');

const GLB_MAGIC_LE = 0x46546c67; // "glTF" binary container

function badId(res) {
  return res.status(400).json({ message: 'Invalid project id' });
}

exports.listProjects = async (req, res) => {
  try {
    const docs = await StudioProject.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ projects: docs.map((d) => toClientProject(d)) });
  } catch (e) {
    console.error('listProjects', e);
    res.status(500).json({ message: 'Failed to list projects' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const n = typeof name === 'string' && name.trim() ? name.trim() : 'Untitled Project';
    const desc = typeof description === 'string' ? description : 'A new AR experience with ARdya.';
    const doc = await StudioProject.create({
      userId: req.user._id,
      name: n.slice(0, 200),
      description: desc.slice(0, 2000),
      status: 'draft',
    });
    res.status(201).json({ project: toClientProject(doc) });
  } catch (e) {
    console.error('createProject', e);
    if (e.name === 'ValidationError') {
      return res.status(400).json({ message: e.message || 'Invalid project data' });
    }
    const dev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      message: 'Failed to create project',
      ...(dev && e.message ? { detail: e.message } : {}),
    });
  }
};

exports.getProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const doc = await StudioProject.findOne({ _id: id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Project not found' });
    res.json({ project: toClientProject(doc) });
  } catch (e) {
    console.error('getProject', e);
    res.status(500).json({ message: 'Failed to get project' });
  }
};

const PATCHABLE = new Set([
  'name',
  'description',
  'status',
  'modelUrl',
  'thumbnailUrl',
  'tripoTaskId',
  'modelUrls',
  'useCase',
  'category',
  'studioTransforms',
  'studioRigs',
  'studioExtras',
  'logoScale',
  'logoOffsetY',
  'arSharePublic',
  'arPageTitle',
  'arPageTagline',
  'arCtaLabel',
  'arAccentHex',
  'capabilities',
  'interactiveParts',
]);

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const body = req.body || {};
    const updates = {};
    for (const key of PATCHABLE) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (updates.name && typeof updates.name === 'string') {
      updates.name = updates.name.trim().slice(0, 200);
    }
    if (updates.description && typeof updates.description === 'string') {
      updates.description = updates.description.slice(0, 2000);
    }
    if (updates.arSharePublic !== undefined) {
      updates.arSharePublic = Boolean(updates.arSharePublic);
    }
    if (updates.arPageTitle !== undefined && typeof updates.arPageTitle === 'string') {
      updates.arPageTitle = updates.arPageTitle.trim().slice(0, 120);
    }
    if (updates.arPageTagline !== undefined && typeof updates.arPageTagline === 'string') {
      updates.arPageTagline = updates.arPageTagline.trim().slice(0, 280);
    }
    if (updates.arCtaLabel !== undefined && typeof updates.arCtaLabel === 'string') {
      updates.arCtaLabel = updates.arCtaLabel.trim().slice(0, 80);
    }
    if (updates.arAccentHex !== undefined) {
      if (typeof updates.arAccentHex !== 'string') {
        return res.status(400).json({ message: 'arAccentHex must be a string' });
      }
      const h = updates.arAccentHex.trim();
      if (h === '') updates.arAccentHex = '';
      else if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) {
        return res.status(400).json({ message: 'arAccentHex must be empty or #RGB / #RRGGBB' });
      } else {
        updates.arAccentHex = h;
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    const doc = await StudioProject.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Project not found' });
    res.json({ project: toClientProject(doc) });
  } catch (e) {
    console.error('updateProject', e);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const del = await StudioProject.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!del) return res.status(404).json({ message: 'Project not found' });
    await ProjectChatMessage.deleteMany({ projectId: id });
    res.json({ message: 'Project deleted' });
  } catch (e) {
    console.error('deleteProject', e);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

exports.listChat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const owns = await StudioProject.exists({ _id: id, userId: req.user._id });
    if (!owns) return res.status(404).json({ message: 'Project not found' });
    const msgs = await ProjectChatMessage.find({ projectId: id }).sort({ createdAt: 1 }).lean();
    res.json({ messages: msgs.map((m) => toClientMessage(m)) });
  } catch (e) {
    console.error('listChat', e);
    res.status(500).json({ message: 'Failed to load chat' });
  }
};

exports.appendChat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const owns = await StudioProject.exists({ _id: id, userId: req.user._id });
    if (!owns) return res.status(404).json({ message: 'Project not found' });

    const {
      role,
      content,
      images,
      modelUrl,
      modelUrls,
      tripoTaskId,
      clientMessageId,
    } = req.body || {};

    if (role !== 'user' && role !== 'assistant') {
      return res.status(400).json({ message: 'role must be user or assistant' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'content is required' });
    }

    if (clientMessageId) {
      const existing = await ProjectChatMessage.findOne({
        projectId: id,
        clientMessageId: String(clientMessageId),
      });
      if (existing) {
        return res.status(200).json({ message: toClientMessage(existing) });
      }
    }

    const doc = await ProjectChatMessage.create({
      projectId: id,
      userId: req.user._id,
      role,
      content: content.slice(0, 32000),
      images: Array.isArray(images) ? images.filter((x) => typeof x === 'string').slice(0, 20) : undefined,
      modelUrl: typeof modelUrl === 'string' ? modelUrl : undefined,
      modelUrls: modelUrls && typeof modelUrls === 'object' ? modelUrls : undefined,
      tripoTaskId: typeof tripoTaskId === 'string' ? tripoTaskId : undefined,
      clientMessageId: clientMessageId ? String(clientMessageId).slice(0, 64) : undefined,
    });

    res.status(201).json({ message: toClientMessage(doc) });
  } catch (e) {
    console.error('appendChat', e);
    res.status(500).json({ message: 'Failed to save message' });
  }
};

async function ensureArUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Fast server-side publish (< 200ms) without client-side buffer re-uploading.
 * Copies already stored server files or downloads server-to-server with high throughput.
 */
exports.publishFast = async (req, res) => {
  const started = Date.now();
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const {
      tripoTaskId,
      modelUrl,
      arPageTitle,
      arPageTagline,
      arCtaLabel,
      arAccentHex,
      arSharePublic,
    } = req.body || {};

    const doc = await StudioProject.findOne({ _id: id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Project not found' });

    await ensureArUploadDir();
    const targetPath = arGlbFilePath(id);

    let copied = false;

    // 1. Try copying from uploads/ar/${tripoTaskId}.glb if taskId provided
    const taskId = tripoTaskId || doc.tripoTaskId;
    if (taskId && typeof taskId === 'string') {
      const sourceTaskPath = path.join(UPLOAD_DIR, `${taskId}.glb`);
      try {
        await fs.access(sourceTaskPath);
        await fs.copyFile(sourceTaskPath, targetPath);
        copied = true;
      } catch (_) {}
    }

    // 2. If not copied yet, check if modelUrl is a relative path or local file
    const effectiveUrl = String(modelUrl || doc.modelUrl || '').trim();
    if (!copied && effectiveUrl) {
      if (effectiveUrl.includes('/uploads/ar/')) {
        const basename = path.basename(effectiveUrl.split('?')[0]);
        const localPath = path.join(UPLOAD_DIR, basename);
        try {
          await fs.access(localPath);
          await fs.copyFile(localPath, targetPath);
          copied = true;
        } catch (_) {}
      } else if (
        effectiveUrl.startsWith('/models/') ||
        effectiveUrl.startsWith('/Human_Avatar') ||
        effectiveUrl.startsWith('/scifi') ||
        effectiveUrl.startsWith('/astronaut') ||
        effectiveUrl.startsWith('/Shoes') ||
        effectiveUrl.startsWith('/ironMan')
      ) {
        const publicPath = path.resolve(__dirname, '../../public', effectiveUrl.replace(/^\//, ''));
        try {
          await fs.access(publicPath);
          await fs.copyFile(publicPath, targetPath);
          copied = true;
        } catch (_) {}
      } else if (effectiveUrl.startsWith('http://') || effectiveUrl.startsWith('https://')) {
        // Fetch remote GLB server-to-server (e.g. from 3daistudio storage or Sketchfab)
        try {
          const dlRes = await axios.get(effectiveUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'User-Agent': 'Pixora-Server/1.0' },
          });
          const buf = Buffer.from(dlRes.data);
          if (buf.length > 20 && buf.readUInt32LE(0) === GLB_MAGIC_LE) {
            await fs.writeFile(targetPath, buf);
            copied = true;
          }
        } catch (_) {}
      }
    }

    // Update project fields
    if (typeof arPageTitle === 'string') doc.arPageTitle = arPageTitle.slice(0, 160);
    if (typeof arPageTagline === 'string') doc.arPageTagline = arPageTagline.slice(0, 320);
    if (typeof arCtaLabel === 'string') doc.arCtaLabel = arCtaLabel.slice(0, 80);
    if (typeof arAccentHex === 'string' && /^#[0-9a-fA-F]{6}$/.test(arAccentHex)) {
      doc.arAccentHex = arAccentHex;
    }
    doc.arSharePublic = arSharePublic !== false;
    doc.status = 'published';
    doc.arGlbUploadedAt = new Date();
    if (copied) {
      doc.modelUrl = `/api/projects/share/${id}/model.glb`;
    }
    await doc.save();

    console.info('[projects] publishFast completed in', Date.now() - started, 'ms', {
      projectId: id,
      copied,
    });

    res.json({
      ok: true,
      copied,
      modelPath: `/api/projects/share/${id}/model.glb`,
      arUrl: `/ar/${id}`,
    });
  } catch (e) {
    console.error('publishFast', e);
    res.status(500).json({ message: 'Failed to fast publish WebAR' });
  }
};

exports.uploadArGlb = async (req, res) => {
  const started = Date.now();
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length < 20) {
      return res.status(400).json({ message: 'GLB binary body required' });
    }
    if (buf.readUInt32LE(0) !== GLB_MAGIC_LE) {
      return res.status(400).json({ message: 'Invalid GLB (expected glTF binary header)' });
    }

    await ensureArUploadDir();
    const filePath = arGlbFilePath(id);
    await fs.writeFile(filePath, buf);

    const doc = await StudioProject.findOne({ _id: id, userId: req.user._id });
    if (!doc) {
      try {
        await fs.unlink(filePath);
      } catch (_) {
        /* ignore */
      }
      return res.status(404).json({ message: 'Project not found' });
    }

    doc.arGlbUploadedAt = new Date();
    await doc.save();

    console.info('[projects] ar-glb uploaded', {
      projectId: id,
      bytes: buf.length,
      userId: String(req.user._id),
      ms: Date.now() - started,
    });

    res.json({
      ok: true,
      modelPath: `/api/projects/share/${id}/model.glb`,
    });
  } catch (e) {
    console.error('uploadArGlb', e);
    res.status(500).json({ message: 'Failed to store AR bundle' });
  }
};

exports.getPublicShare = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const doc = await StudioProject.findById(id).lean();
    if (!doc || !doc.arSharePublic) {
      return res.status(404).json({ message: 'Not found' });
    }

    const filePath = arGlbFilePath(id);
    let hasLocalFile = false;
    try {
      await fs.access(filePath);
      hasLocalFile = true;
    } catch {
      hasLocalFile = false;
    }

    const remoteUrl =
      (doc.modelUrl && doc.modelUrl.startsWith('http') && !doc.modelUrl.includes('/api/projects/share/') ? doc.modelUrl : null) ||
      (doc.modelUrls?.glb && doc.modelUrls.glb.startsWith('http') && !doc.modelUrls.glb.includes('/api/projects/share/') ? doc.modelUrls.glb : null);

    if (!hasLocalFile && !remoteUrl) {
      return res.status(404).json({ message: 'Published model not available' });
    }

    const title = (doc.arPageTitle && String(doc.arPageTitle).trim()) || doc.name;
    const tagline = doc.arPageTagline ? String(doc.arPageTagline).trim() : '';
    const cta = doc.arCtaLabel ? String(doc.arCtaLabel).trim() : '';

    res.json({
      projectId: id,
      name: doc.name,
      arPageTitle: title,
      arPageTagline: tagline,
      arCtaLabel: cta || 'View in your space',
      arAccentHex: doc.arAccentHex ? String(doc.arAccentHex).trim() : '',
      description: doc.description ? String(doc.description).slice(0, 2000) : '',
      modelUrl: hasLocalFile ? `/api/projects/share/${id}/model.glb` : remoteUrl,
      capabilities: doc.capabilities || {},
      interactiveParts: doc.interactiveParts || {},
    });
  } catch (e) {
    console.error('getPublicShare', e);
    res.status(500).json({ message: 'Failed to load share' });
  }
};

exports.streamShareModel = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const doc = await StudioProject.findById(id).lean();
    if (!doc || !doc.arSharePublic) {
      return res.status(404).json({ message: 'Not found' });
    }

    const filePath = arGlbFilePath(id);
    try {
      await fs.access(filePath);
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Content-Disposition', 'inline; filename="experience.glb"');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Access-Control-Allow-Origin', '*');

      console.info('[projects] share model served from disk', { projectId: id });
      return res.sendFile(filePath);
    } catch {
      // Local file missing (e.g. Render restarted container) — check remote URL
      const remoteUrl =
        (doc.modelUrl && doc.modelUrl.startsWith('http') && !doc.modelUrl.includes('/api/projects/share/') ? doc.modelUrl : null) ||
        (doc.modelUrls?.glb && doc.modelUrls.glb.startsWith('http') && !doc.modelUrls.glb.includes('/api/projects/share/') ? doc.modelUrls.glb : null);

      if (remoteUrl) {
        console.info('[projects] share model redirected to remote URL', { projectId: id, remoteUrl });
        return res.redirect(302, remoteUrl);
      }
      return res.status(404).json({ message: 'Not found' });
    }
  } catch (e) {
    console.error('streamShareModel', e);
    res.status(500).json({ message: 'Failed to serve model' });
  }
};
