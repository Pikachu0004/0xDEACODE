const mongoose = require('mongoose');

const freelancerApplicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerJob', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, trim: true },
    name: { type: String, default: '' },
    message: { type: String, default: '' },
    status: { type: String, enum: ['new', 'reviewed', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

freelancerApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('FreelancerApplication', freelancerApplicationSchema);
