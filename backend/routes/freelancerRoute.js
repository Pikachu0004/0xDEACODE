const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { listJobs, applyToJob } = require('../controllers/freelancerController');

const router = express.Router();

router.get('/jobs', listJobs);
router.post('/apply', protect, applyToJob);

module.exports = router;
