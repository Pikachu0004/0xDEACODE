import { apiUrl, type ModelUrlsPayload } from './api';

const MESHY_CDN = /^https:\/\/assets\.meshy\.ai\//i;

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
    return dataUrlToArrayBuffer(modelDataUrl);
  }
  const url = modelUrls?.glb || modelUrl;
  if (!url) throw new Error('No GLB to publish');
  if (url.startsWith('data:')) return dataUrlToArrayBuffer(url);
  if (url.startsWith('blob:')) {
    throw new Error(
      'This model uses a temporary browser link — open AR Studio, export, and publish, or regenerate the model.'
    );
  }
  if (MESHY_CDN.test(url)) {
    if (!token) throw new Error('Sign in to publish Meshy-hosted models.');
    const res = await fetch(apiUrl('/api/meshy/proxy-asset'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Could not fetch model for publish');
    }
    return res.arrayBuffer();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download model (${res.status})`);
  return res.arrayBuffer();
}
