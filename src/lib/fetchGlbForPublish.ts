import { apiUrl, type ModelUrlsPayload } from './api';

const EXTERNAL_CDN = /^https?:\/\/(?!localhost|127\.0\.0\.1)/i;

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('Invalid data URL');
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (meta.includes('base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  const enc = new TextEncoder().encode(decodeURIComponent(payload));
  return enc.buffer;
}

/** Same MIME prefix as `studio3d` — avoids importing Three.js on chat-only routes. */
export function glbArrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}

const GLB_MAGIC = 0x46546c67; // 'glTF' in little-endian

function isGlbBuffer(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 20) return false;
  const view = new DataView(buf);
  return view.getUint32(0, true) === GLB_MAGIC;
}

/**
 * Resolve a project / chat message GLB into binary for `POST /api/projects/:id/ar-glb`.
 */
export async function fetchGlbArrayBufferForPublish(params: {
  modelUrl?: string;
  modelUrls?: ModelUrlsPayload | null;
  modelDataUrl?: string;
  token?: string | null;
}): Promise<ArrayBuffer> {
  const { modelUrl, modelUrls, modelDataUrl, token } = params;
  if (modelDataUrl?.startsWith('data:')) {
    const buf = dataUrlToArrayBuffer(modelDataUrl);
    if (isGlbBuffer(buf)) return buf;
  }
  let url = modelUrls?.glb || modelUrl;
  if (!url) throw new Error('No GLB to publish');
  if (url.startsWith('data:')) {
    const buf = dataUrlToArrayBuffer(url);
    if (isGlbBuffer(buf)) return buf;
    throw new Error('Provided data URL is not a valid GLB 3D model.');
  }
  if (url.startsWith('blob:')) {
    throw new Error(
      'This model uses a temporary browser link — open AR Studio, export, and publish, or regenerate the model.'
    );
  }

  // Ensure relative backend paths (/uploads/ar/..., /api/...) resolve to backend API origin
  if (url.startsWith('/uploads/') || url.startsWith('/api/')) {
    url = apiUrl(url);
  }

  if (url.includes('assets.meshy.ai') || url.includes('3daistudio.com') || EXTERNAL_CDN.test(url)) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (isGlbBuffer(buf)) return buf;
      }
    } catch (_) {}

    // Fall back to proxy asset on backend
    const res = await fetch(apiUrl('/api/tripo/proxy-asset'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (isGlbBuffer(buf)) return buf;
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download model (${res.status})`);
    const buf = await res.arrayBuffer();
    if (isGlbBuffer(buf)) return buf;
    throw new Error('Downloaded asset is not a valid binary GLB model.');
  } catch (directErr: any) {
    // If direct fetch fails (e.g. CORS or relative host mismatch), attempt proxy fallback
    try {
      const res = await fetch(apiUrl('/api/tripo/proxy-asset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (isGlbBuffer(buf)) return buf;
      }
    } catch (_) {}
    throw new Error(directErr?.message || 'Failed to download valid GLB for publish.');
  }
}
