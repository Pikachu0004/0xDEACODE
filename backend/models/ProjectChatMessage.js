const mongoose = require('mongoose');

const projectChatMessageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudioProject',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: { type: String, required: true },
    images: [String],
    modelUrl: String,
    modelUrls: {
      glb: String,
      fbx: String,
      usdz: String,
      obj: String,
      mtl: String,
      stl: String,
    },
    tripoTaskId: String,
    /** Client-generated id for dedup / optimistic UI */
    clientMessageId: { type: String, index: true },
  },
  { timestamps: true }
);

projectChatMessageSchema.index({ projectId: 1, createdAt: 1 });

module.exports = mongoose.model('ProjectChatMessage', projectChatMessageSchema);
