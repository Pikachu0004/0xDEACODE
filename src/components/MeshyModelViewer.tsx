import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiUrl } from '../lib/api';

const ModelViewer = 'model-viewer' as any;

type Props = {
  src: string;
  token?: string | null;
  className?: string;
};

/**
 * Meshy GLB URLs on assets.meshy.ai are blocked by CORS in the browser.
 * Other URLs (WaveSpeed CDN, local backend, data URLs) load directly.
 */
export default function MeshyModelViewer({ src, token, className }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    if (!src) {
      setResolved(null);
      return;
    }

    // Only assets.meshy.ai is known to block browser CORS
    const needsProxy = src.includes('assets.meshy.ai');
    if (!needsProxy) {
      setResolved(src);
      return;
    }

    let blobUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(apiUrl('/api/tripo/proxy-asset'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: src }),
        });
        if (!res.ok) {
          const t = await res.text();
          if (res.status === 405) {
            throw new Error(
              'Model proxy got 405 — set VITE_API_URL to your backend URL.'
            );
          }
          throw new Error(t || res.statusText);
        }
        const blob = await res.blob();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setResolved(blobUrl);
      } catch (e) {
        if (!cancelled) {
          console.warn('[MeshyModelViewer] Proxy failed, falling back to direct URL:', e);
          setResolved(src);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, token]);

  if (err) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 text-center text-xs text-white/70 p-6 bg-white/5 rounded-2xl ${className ?? ''}`}
      >
        <AlertCircle className="w-6 h-6 text-brand-primary/80 mb-1" />
        <p className="font-semibold text-white/90">3D Preview Unavailable</p>
        <p className="text-white/50 text-[11px] max-w-[280px]">
          The asset could not be loaded or expired during server maintenance. Generate a new prompt to view in 3D.
        </p>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className={`flex items-center justify-center aspect-square bg-black/30 ${className ?? ''}`}>
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <ModelViewer
      src={resolved}
      camera-controls
      auto-rotate
      shadow-intensity="1"
      style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      className={className}
      onError={() => {
        console.warn('[ModelViewer] Failed to load 3D asset:', resolved);
        setErr('Unable to load 3D model.');
      }}
    />
  );
}
