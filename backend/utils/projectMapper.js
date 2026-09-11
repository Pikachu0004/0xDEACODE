function stripUndefined(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

exports.toClientProject = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return stripUndefined({
    id: String(o._id),
    name: o.name,
    description: o.description,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : undefined,
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : undefined,
    status: o.status,
    modelUrl: o.modelUrl,
    thumbnailUrl: o.thumbnailUrl,
    tripoTaskId: o.tripoTaskId,
    modelUrls: o.modelUrls && Object.keys(o.modelUrls).length ? o.modelUrls : undefined,
    useCase: o.useCase,
    category: o.category,
    studioTransforms: o.studioTransforms,
    studioRigs: o.studioRigs,
    studioExtras: o.studioExtras,
    logoScale: o.logoScale,
    logoOffsetY: o.logoOffsetY,
    arSharePublic: o.arSharePublic,
    arPageTitle: o.arPageTitle,
    arPageTagline: o.arPageTagline,
    arCtaLabel: o.arCtaLabel,
    arAccentHex: o.arAccentHex,
    arGlbUploadedAt: o.arGlbUploadedAt ? new Date(o.arGlbUploadedAt).toISOString() : undefined,
  });
};

exports.toClientMessage = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return stripUndefined({
    id: o.clientMessageId || String(o._id),
    _id: String(o._id),
    role: o.role,
    content: o.content,
    images: o.images?.length ? o.images : undefined,
    modelUrl: o.modelUrl,
    modelUrls: o.modelUrls && Object.keys(o.modelUrls).length ? o.modelUrls : undefined,
    tripoTaskId: o.tripoTaskId,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : undefined,
  });
};
