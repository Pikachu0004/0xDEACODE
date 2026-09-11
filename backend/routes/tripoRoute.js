const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  generate3DModel,
  generateFromImage,
  getTaskStatus,
  getUserTasks,
  deleteTask,
} = require('../controllers/tripoController');

// All routes require authentication
router.use(protect);

// @route   POST /api/tripo/generate
// @desc    Create a new 3D generation task (Tripo text-to-model)
// @access  Private
router.post('/generate', generate3DModel);

// @route   POST /api/tripo/generate-from-image
// @desc    Create a new 3D generation task (Tripo image-to-model)
router.post('/generate-from-image', generateFromImage);

// @route   GET /api/tripo/tasks
// @desc    Get all tasks for the authenticated user
// @access  Private
router.get('/tasks', getUserTasks);

// @route   GET /api/tripo/task/:taskId
// @desc    Get status of a specific task
// @access  Private
router.get('/task/:taskId', getTaskStatus);

// @route   DELETE /api/tripo/task/:taskId
// @desc    Delete a task
// @access  Private
router.delete('/task/:taskId', deleteTask);

module.exports = router;
