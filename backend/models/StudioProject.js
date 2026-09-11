const mongoose = require('mongoose');

const modelUrlsSchema = new mongoose.Schema(
  {
    glb: String,
    fbx: String,
    usdz: String,
    obj: String,
    mtl: String,
    stl: String,
  },
  { _id: false }
);

const studioExtraSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: '' },
    modelUrl: String,
  },
  { _id: false }
);

const studioProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    modelUrl: String,
    thumbnailUrl: String,
    tripoTaskId: String,
    modelUrls: modelUrlsSchema,
    useCase: { type: String, default: '' },
    category: { type: String, default: '' },
    studioTransforms: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Motion rig preview configs keyed by scene node id (primary / extra ids). */
    studioRigs: { type: mongoose.Schema.Types.Mixed, default: {} },
    studioExtras: [studioExtraSchema],
    logoScale: Number,
    logoOffsetY: Number,
    /** When true, `GET /api/projects/share/:id` and hosted GLB are world-readable. */
    arSharePublic: { type: Boolean, default: false },
    /** Viewer page heading (falls back to `name`). */
    arPageTitle: { type: String, default: '' },
    arPageTagline: { type: String, default: '' },
    arCtaLabel: { type: String, default: '' },
    /** Optional `#RRGGBB` accent for the public viewer. */
    arAccentHex: { type: String, default: '' },
    arGlbUploadedAt: { type: Date },
  },
  { timestamps: true }
);

studioProjectSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('StudioProject', studioProjectSchema);
