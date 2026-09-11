const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const defaultCredits = () => Number(process.env.DEFAULT_SIGNUP_CREDITS || 100);

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    isAdmin: !!user.isAdmin,
    credits: user.isAdmin ? null : user.credits ?? defaultCredits(),
  };
}

async function ensureCreditsField(user) {
  if (!user) return user;
  if (typeof user.credits !== 'number' || Number.isNaN(user.credits)) {
    user.credits = defaultCredits();
    await user.save();
  }
  return user;
}

exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const emailLower = (email || '').toLowerCase().trim();

  const isAdminEmail = !!(adminEmail && emailLower === adminEmail);


  try {
    const userExists = await User.findOne({ email: emailLower });
    if (userExists) return res.status(400).json({ message: 'Email already exists' });

    const payload = {
      name,
      email: emailLower,
      password,
      credits: defaultCredits(),
      isVerified: true,
    };

    if (adminEmail && emailLower === adminEmail) {
      payload.isAdmin = true;
      payload.credits = Number(process.env.ADMIN_INITIAL_CREDITS || 999999);
    }

    const user = await User.create(payload);

    const fresh = await User.findById(user._id).select('-password');
    res.status(201).json({
      message: 'User registered successfully.',
      token: generateToken(user._id),
      user: publicUser(fresh),
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId).select('+otp +otpExpiry');

  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
  if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired code' });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await ensureCreditsField(user);
  await user.save();

  const fresh = await User.findById(user._id).select('-password');
  res.json({
    message: 'Email verified successfully',
    token: generateToken(user._id),
    user: publicUser(fresh),
  });
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const emailLower = (email || '').toLowerCase().trim();

  try {
    const user = await User.findOne({ email: emailLower }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      const otpExpiry = Date.now() + 10 * 60 * 1000;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      try {
        await sendEmail({
          email: user.email,
          subject: 'VisiARise — sign in verification',
          message: `<p>Your verification code is: <b>${otp}</b></p><p>It expires in 10 minutes.</p>`,
        });
      } catch (mailErr) {
        console.error('Login OTP email failed:', mailErr.message);
      }

      return res.status(200).json({
        needsVerification: true,
        userId: user._id.toString(),
        message:
          'We sent a verification code to your email. Enter it below to finish signing in.',
      });
    }

    await ensureCreditsField(user);

    res.json({
      ...publicUser(user),
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No user with this email' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    await user.save({ validateBeforeSave: false });

    const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${clientBase}/reset-password?token=${resetToken}`;
    const sanitizedName = DOMPurify.sanitize(user.name);
    const message = `
    <p>Hello ${sanitizedName},</p>
    <p>You requested to reset your password. Open this link in the app:</p>
    <p><a href="${resetUrl}">Reset password</a></p>
    <p>If you didn&apos;t request this, you can ignore this email.</p>
  `;

    await sendEmail({
      email: user.email,
      subject: 'VisiARise — password reset',
      message,
    });

    res.json({ message: 'Reset email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Could not send reset email', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body.token;
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset failed', error: err.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  await ensureCreditsField(user);
  res.status(200).json(publicUser(user));
};

exports.adminGrantCredits = async (req, res) => {
  const { email, amount } = req.body;
  const n = Number(amount);
  if (!email || typeof email !== 'string' || !Number.isFinite(n) || n === 0) {
    return res.status(400).json({ message: 'email and non-zero numeric amount are required' });
  }

  const u = await User.findOne({ email: email.toLowerCase().trim() });
  if (!u) return res.status(404).json({ message: 'User not found' });
  if (u.isAdmin) {
    return res.json({ message: 'Admin accounts use unlimited Meshy access', user: publicUser(u) });
  }

  u.credits = Math.max(0, (u.credits ?? 0) + Math.round(n));
  await u.save();
  res.json({ message: 'Credits updated', user: publicUser(u) });
};

exports.adminListUsers = async (req, res) => {
  const users = await User.find()
    .select('name email isVerified isAdmin credits createdAt')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({
    users: users.map((u) => ({
      ...u,
      credits: u.isAdmin ? null : u.credits ?? defaultCredits(),
    })),
  });
};
