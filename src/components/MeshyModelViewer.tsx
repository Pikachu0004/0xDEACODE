import { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiUrl } from '../lib/api';
import { preloadGlbModel } from '../lib/modelCache';

const ModelViewer = 'model-viewer' as any;

type Props = {
  src: string;
  token?: string | null;
  className?: string;
};

/**
 * High-performance 3D Model Viewer for Chat and Studio Previews.
 * Features eager memory preloading, streaming progress indicator,
 * CORS proxy fallback, and automatic cache retention.
 */
export default function MeshyModelViewer({ src, token, className }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setErr(null);
    setIsLoading(true);
    setProgress(5);

    if (!src) {
      setResolved(null);
      setIsLoading(false);
      return;
    }

    let target = src.trim();
    if (target.startsWith('/uploads/') || target.startsWith('/api/')) {
      target = apiUrl(target);
    }

    let cancelled = false;

    (async () => {
      try {
        const blobUrl = await preloadGlbModel(target, (pct) => {
          if (!cancelled) setProgress(pct);
        });
        if (!cancelled) {
          setResolved(blobUrl);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[MeshyModelViewer] Preload failed, using direct URL:', e);
          setResolved(target);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, token]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = async (event: any) => {
      console.warn('[ModelViewer] Asset render failed on direct URL:', resolved, event);
      if (resolved && !resolved.startsWith('blob:') && !resolved.includes('proxy-asset')) {
        // Try proxying once before giving up
        try {
          const res = await fetch(apiUrl('/api/tripo/proxy-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: resolved }),
          });
          if (res.ok) {
            const blob = await res.blob();
            const proxiedUrl = URL.createObjectURL(blob);
            setResolved(proxiedUrl);
            return;
          }
        } catch (_) {}
      }
      setIsLoading(false);
      setErr('Unable to render 3D model.');
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [resolved]);

  if (err) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 text-center text-xs text-white/70 p-6 bg-white/5 rounded-2xl border border-white/10 ${className ?? ''}`}
      >
        <AlertCircle className="w-6 h-6 text-brand-primary/80 mb-1" />
        <p className="font-semibold text-white/90">3D Preview Unavailable</p>
        <p className="text-white/50 text-[11px] max-w-[280px]">
          The 3D model could not be loaded into WebGL. Click below to retry or view in AR Studio.
        </p>
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setIsLoading(true);
            setResolved(src.startsWith('/') ? apiUrl(src) : src);
          }}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Preview
        </button>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className={`relative flex flex-col items-center justify-center aspect-square bg-black/40 rounded-2xl border border-white/5 ${className ?? ''}`}>
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-2" />
        <span className="text-[11px] font-mono text-white/50">Resolving 3D asset…</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-2xl ${className ?? ''}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          <Loader2 className="w-7 h-7 animate-spin text-brand-primary mb-2" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-primary/90">
            {progress > 0 && progress < 100 ? `Downloading 3D Model… ${progress}%` : 'Rendering 3D Model…'}
          </span>
          {progress > 0 && progress < 100 && (
            <div className="w-28 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-brand-primary transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
      <ModelViewer
        ref={viewerRef}
        src={resolved}
        loading="eager"
        reveal="auto"
        camera-controls
        auto-rotate
        rotation-per-second="25deg"
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      />
    </div>
  );
}
