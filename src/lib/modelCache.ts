import { apiUrl } from './api';

const memoryBlobCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

/**
 * Preloads and caches a 3D GLB model directly in device memory.
 * Emits real-time progress callbacks (0% -> 100%) and returns an instant blob: URL
 * so mobile browsers, <model-viewer>, and Three.js GLTFLoader render immediately with 0s network latency.
 */
export async function preloadGlbModel(
  url: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!url) return '';

  let normalizedUrl = url.trim();
  if (normalizedUrl.startsWith('/uploads/') || normalizedUrl.startsWith('/api/')) {
    normalizedUrl = apiUrl(normalizedUrl);
  }

  // Already a blob or inline data URI
  if (normalizedUrl.startsWith('blob:') || normalizedUrl.startsWith('data:')) {
    onProgress?.(100);
    return normalizedUrl;
  }

  // Return cached memory blob URL if already downloaded
  if (memoryBlobCache.has(normalizedUrl)) {
    onProgress?.(100);
    return memoryBlobCache.get(normalizedUrl)!;
  }

  // Deduplicate concurrent requests
  if (inFlightRequests.has(normalizedUrl)) {
    return inFlightRequests.get(normalizedUrl)!;
  }

  const promise = (async () => {
    try {
      let res: Response;

      // Handle CORS-sensitive origins via backend proxy
      if (normalizedUrl.includes('assets.meshy.ai') || normalizedUrl.includes('3daistudio.com')) {
        try {
          res = await fetch(apiUrl('/api/tripo/proxy-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: normalizedUrl }),
          });
        } catch (_) {
          res = await fetch(normalizedUrl);
        }
      } else {
        res = await fetch(normalizedUrl);
      }

      if (!res.ok) {
        throw new Error(`Failed to load 3D model (${res.status})`);
      }

      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      let blob: Blob;

      if (total > 0 && res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            if (onProgress) {
              onProgress(Math.min(99, Math.round((loaded / total) * 100)));
            }
          }
        }

        blob = new Blob(chunks, { type: 'model/gltf-binary' });
      } else {
        blob = await res.blob();
      }

      const blobUrl = URL.createObjectURL(blob);
      memoryBlobCache.set(normalizedUrl, blobUrl);
      onProgress?.(100);
      return blobUrl;
    } catch (err) {
      console.warn('[modelCache] Preload failed, returning direct URL:', err);
      return normalizedUrl;
    } finally {
      inFlightRequests.delete(normalizedUrl);
    }
  })();

  inFlightRequests.set(normalizedUrl, promise);
  return promise;
}

export function getCachedModelUrl(url: string): string | null {
  if (!url) return null;
  let normalized = url.trim();
  if (normalized.startsWith('/uploads/') || normalized.startsWith('/api/')) {
    normalized = apiUrl(normalized);
  }
  return memoryBlobCache.get(normalized) || null;
}
