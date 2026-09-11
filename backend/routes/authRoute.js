const { protect, admin } = require('../middlewares/authMiddleware');
const express = require('express');

const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyOtp,
  getMe,
  adminGrantCredits,
  adminListUsers,
} = require('../controllers/authController');
const {
  validateSignup,
  validateLogin,
  handleValidationErrors,
} = require('../validators/authValidators');

router.post('/signup', validateSignup, handleValidationErrors, registerUser);
router.post('/login', validateLogin, handleValidationErrors, loginUser);
router.get('/me', protect, getMe);

router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.post('/admin/grant-credits', protect, admin, adminGrantCredits);
router.get('/admin/users', protect, admin, adminListUsers);

module.exports = router;
