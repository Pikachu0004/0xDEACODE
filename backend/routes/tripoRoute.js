const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  generate3DModel,
  generateFromImage,
  getTaskStatus,
  getUserTasks,
  deleteTask,
  proxyAsset,
} = require('../controllers/tripoController');

// @route   POST /api/tripo/proxy-asset
// @desc    Proxy fetch 3D models to bypass CORS (Public for AR preview)
// @access  Public
router.post('/proxy-asset', proxyAsset);

// All routes below require authentication
router.use(protect);

// @route   POST /api/tripo/generate
// @desc    Generate a 3D model from text prompt
// @access  Private
router.post('/generate', generate3DModel);

// @route   POST /api/tripo/generate-image
// @desc    Generate a 3D model from image
// @access  Private
router.post('/generate-image', generateFromImage);

// @route   GET /api/tripo/tasks
// @desc    Get all user tasks
// @access  Private
router.get('/tasks', getUserTasks);

// @route   GET /api/tripo/task/:taskId
// @desc    Get task status
// @access  Private
router.get('/task/:taskId', getTaskStatus);

// @route   DELETE /api/tripo/task/:taskId
// @desc    Delete a task
// @access  Private
router.delete('/task/:taskId', deleteTask);

module.exports = router;
