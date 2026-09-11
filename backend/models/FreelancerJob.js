const mongoose = require('mongoose');

const freelancerJobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    location: { type: String, default: 'Remote' },
    type: { type: String, default: 'Contract' },
    budget: { type: String, default: '' },
    postedAt: { type: Date, default: Date.now },
    open: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FreelancerJob', freelancerJobSchema);
