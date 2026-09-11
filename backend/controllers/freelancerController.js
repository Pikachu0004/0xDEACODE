const mongoose = require('mongoose');
const FreelancerJob = require('../models/FreelancerJob');
const FreelancerApplication = require('../models/FreelancerApplication');

const DEFAULT_JOBS = [
  {
    title: 'WebAR product viewer — footwear launch',
    company: 'Independent brand',
    location: 'Remote',
    type: 'Contract',
    budget: '$2.5k – $4k',
  },
  {
    title: 'Optimize GLB for mobile AR (under 8MB)',
    company: 'Retail pilot',
    location: 'Remote',
    type: 'Fixed',
    budget: '$800 – $1.2k',
  },
  {
    title: 'Blender hard-surface + AR export',
    company: 'Hardware startup',
    location: 'EU / Remote',
    type: 'Part-time',
    budget: '$45–65/hr',
  },
];

async function seedJobsIfEmpty() {
  const n = await FreelancerJob.countDocuments();
  if (n > 0) return;
  await FreelancerJob.insertMany(
    DEFAULT_JOBS.map((j, i) => ({
      ...j,
      postedAt: new Date(Date.now() - (i + 1) * 86400000 * 3),
    }))
  );
}

exports.listJobs = async (req, res) => {
  try {
    await seedJobsIfEmpty();
    const jobs = await FreelancerJob.find({ open: true }).sort({ postedAt: -1 }).lean();
    res.json({
      jobs: jobs.map((j) => ({
        id: String(j._id),
        title: j.title,
        company: j.company,
        location: j.location,
        type: j.type,
        budget: j.budget,
        posted: j.postedAt ? new Date(j.postedAt).toISOString() : undefined,
      })),
    });
  } catch (e) {
    console.error('listJobs', e);
    res.status(500).json({ message: 'Failed to load jobs' });
  }
};

exports.applyToJob = async (req, res) => {
  try {
    const { jobId, message } = req.body || {};
    const user = req.user;
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Valid job id required' });
    }
    const jid = new mongoose.Types.ObjectId(jobId);
    const job = await FreelancerJob.findOne({ _id: jid, open: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const doc = await FreelancerApplication.findOneAndUpdate(
      { jobId: jid, userId: user._id },
      {
        $setOnInsert: { jobId: jid, userId: user._id },
        $set: {
          email: user.email,
          name: user.name || '',
          message: typeof message === 'string' ? message.slice(0, 4000) : '',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({
      message: 'Application submitted. We will email you about next steps.',
      applicationId: String(doc._id),
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ message: 'You already applied to this job' });
    }
    console.error('applyToJob', e);
    res.status(500).json({ message: 'Failed to submit application' });
  }
};
