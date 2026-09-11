const mongoose = require('mongoose');

const tripo3DTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: String,
      required: true,
      unique: true,
    },
    prompt: {
      type: String,
      default: '',
    },
    tripoApiKind: {
      type: String,
      enum: ['text_to_model', 'image_to_model'],
      default: 'text_to_model',
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'PENDING', 'IN_PROGRESS', 'SUCCEEDED'],
      default: 'QUEUED',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    modelUrls: {
      glb: String,
      fbx: String,
      usdz: String,
      obj: String,
      mtl: String,
      stl: String,
    },
    thumbnailUrl: String,
    videoUrl: String,
    errorMessage: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

tripo3DTaskSchema.index({ userId: 1, createdAt: -1 });
tripo3DTaskSchema.index({ status: 1 });

module.exports = mongoose.model('Tripo3DTask', tripo3DTaskSchema);
