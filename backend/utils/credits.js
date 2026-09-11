const User = require('../models/User');

exports.previewCost = () => Number(process.env.CREDIT_COST_MESHY_PREVIEW || 5);
exports.refineCost = () => Number(process.env.CREDIT_COST_MESHY_REFINE || 10);

exports.assertCanAfford = async (userId, cost) => {
  const user = await User.findById(userId).select('credits isAdmin');
  if (!user) {
    const e = new Error('User not found');
    e.status = 404;
    throw e;
  }
  if (user.isAdmin) {
    return user;
  }
  const balance = user.credits ?? 0;
  if (balance < cost) {
    const e = new Error('Insufficient credits');
    e.status = 402;
    throw e;
  }
  return user;
};

exports.deductCredits = async (userId, cost) => {
  const user = await User.findById(userId).select('credits isAdmin');
  if (!user) {
    const e = new Error('User not found');
    e.status = 404;
    throw e;
  }
  if (user.isAdmin) {
    return user;
  }
  user.credits = Math.max(0, (user.credits ?? 0) - cost);
  await user.save();
  return user;
};

exports.getCreditsRemaining = async (userId) => {
  const user = await User.findById(userId).select('credits isAdmin');
  if (!user) return null;
  if (user.isAdmin) return null;
  return user.credits ?? 0;
};
