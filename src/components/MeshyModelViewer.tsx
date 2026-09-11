import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiUrl } from '../lib/api';

const ModelViewer = 'model-viewer' as any;

const MESHY_CDN = /^https:\/\/assets\.meshy\.ai\//i;

type Props = {
  src: string;
  token: string | null | undefined;
  className?: string;
};

/**
 * Meshy GLB URLs are on assets.meshy.ai — blocked by CORS in the browser.
 * Proxies through `/api/meshy/proxy-asset` when signed in.
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
    if (!MESHY_CDN.test(src)) {
      setResolved(src);
      return;
    }
    if (!token) {
      setErr('Sign in to preview Meshy models (CDN requires server proxy).');
      setResolved(null);
      return;
    }

    let blobUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(apiUrl('/api/meshy/proxy-asset'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: src }),
        });
        if (!res.ok) {
          const t = await res.text();
          if (res.status === 405) {
            throw new Error(
              'Model proxy got 405 — the request hit the static site, not the API. Set VITE_API_URL to your backend URL on the frontend service and redeploy.'
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
          setErr((e as Error).message || 'Could not load model');
          setResolved(null);
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
        className={`flex flex-col items-center justify-center gap-2 text-center text-xs text-red-200/90 p-6 ${className ?? ''}`}
      >
        {err}
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
    />
  );
}
