const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listChat,
  appendChat,
  uploadArGlb,
  getPublicShare,
  streamShareModel,
} = require('../controllers/projectController');

const glbBodyParser = express.raw({
  type: ['application/octet-stream', 'model/gltf-binary'],
  limit: '80mb',
});

/** Public WebAR share (no auth) — must stay above `protect`. */
router.get('/share/:id/model.glb', streamShareModel);
router.get('/share/:id', getPublicShare);

router.use(protect);

router.get('/', listProjects);
router.post('/', createProject);
router.post('/:id/ar-glb', glbBodyParser, uploadArGlb);
router.get('/:id/chat', listChat);
router.post('/:id/chat', appendChat);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
