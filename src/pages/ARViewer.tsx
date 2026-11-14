import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Share2,
  Download,
  QrCode,
  Smartphone,
  Zap,
  Globe,
  ChevronRight,
  Info,
  Loader2,
  Gamepad2,
  Camera,
} from 'lucide-react';
import { apiFetch, apiUrl, type PublicShareResponse } from '../lib/api';
import { UniversalCameraAR } from '../components/ar/UniversalCameraAR';
import { preloadGlbModel } from '../lib/modelCache';

const ModelViewer = 'model-viewer' as any;

const DEFAULT_LOCAL_MODEL = '/Human_Avatar_Kishan_Nishad_model.glb';
const EXTERNAL_CDN = /^https?:\/\/(?!localhost|127\.0\.0\.1)/i;

export default function ARViewer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [startInMotionMode, setStartInMotionMode] = useState(false);
  const [isCameraARActive, setIsCameraARActive] = useState(false);
  const location = useLocation();
  const { projects, user } = useAppStore();
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [meshyBlobUrl, setMeshyBlobUrl] = useState<string | null>(null);
  const [meshyLoadError, setMeshyLoadError] = useState<string | null>(null);
  const [meshyLoading, setMeshyLoading] = useState(false);
  const [shareMeta, setShareMeta] = useState<PublicShareResponse | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'absent' | 'error'>('idle');

  const isPublicPreview = location.pathname === '/try-ar';
  const project = id ? projects.find((p) => p.id === id) : undefined;

  const modelFromQuery = searchParams.get('model');
  const nameFromQuery = searchParams.get('name');

  useEffect(() => {
    if (!id || isPublicPreview || project) {
      setShareMeta(null);
      setShareState('idle');
      return;
    }
    let cancelled = false;
    setShareState('loading');
    (async () => {
      try {
        const data = await apiFetch<PublicShareResponse>(`/api/projects/share/${id}`);
        if (!cancelled) {
          setShareMeta(data);
          setShareState('idle');
        }
      } catch (e: unknown) {
        const status =
          typeof e === 'object' && e !== null && 'status' in e
            ? (e as { status?: number }).status
            : undefined;
        if (!cancelled) {
          setShareMeta(null);
          setShareState(status === 404 ? 'absent' : 'error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isPublicPreview, project]);

  const rawModelUrl = useMemo(() => {
    if (isPublicPreview) {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('visiarise-ar-model');
      } catch {
        /* ignore */
      }
      return modelFromQuery || stored || DEFAULT_LOCAL_MODEL;
    }
    if (project?.modelDataUrl || project?.modelUrl) {
      return project.modelDataUrl || project.modelUrl || DEFAULT_LOCAL_MODEL;
    }
    if (shareMeta?.modelUrl) {
      return apiUrl(shareMeta.modelUrl);
    }
    return DEFAULT_LOCAL_MODEL;
  }, [
    isPublicPreview,
    modelFromQuery,
    project?.modelDataUrl,
    project?.modelUrl,
    shareMeta?.modelUrl,
  ]);

  /** Preload and cache GLB model into phone memory with real-time download progress */
  useEffect(() => {
    setMeshyLoadError(null);
    if (!rawModelUrl) {
      setCachedBlobUrl(null);
      setIsModelLoading(false);
      return;
    }

    setIsModelLoading(true);
    setPreloadProgress(5);
    let cancelled = false;

    (async () => {
      try {
        const blobUrl = await preloadGlbModel(rawModelUrl, (pct) => {
          if (!cancelled) setPreloadProgress(pct);
        });
        if (!cancelled) {
          setCachedBlobUrl(blobUrl);
          setIsModelLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn('[ARViewer] Preload model error:', err);
          setCachedBlobUrl(rawModelUrl);
          setIsModelLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawModelUrl]);

  const modelUrlForViewer = cachedBlobUrl || rawModelUrl;

  const title = isPublicPreview
    ? nameFromQuery || 'AR preview'
    : project
      ? project.arPageTitle || project.name
      : shareMeta?.arPageTitle || shareMeta?.name || 'AR';

  const tagline =
    (!isPublicPreview &&
      (shareMeta?.arPageTagline ||
        project?.arPageTagline ||
        (shareMeta?.description ? shareMeta.description.slice(0, 160) : '') ||
        (project?.description ? project.description.slice(0, 160) : ''))) ||
    '';

  const ctaLabel =
    (!isPublicPreview && (shareMeta?.arCtaLabel || project?.arCtaLabel)) || 'View in your space';

  const accent =
    (!isPublicPreview && (shareMeta?.arAccentHex || project?.arAccentHex)) || '#10b981';

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.href);
    if (isPublicPreview) {
      u.pathname = '/try-ar';
      u.searchParams.set('model', rawModelUrl);
      if (nameFromQuery) u.searchParams.set('name', nameFromQuery);
    }
    return u.toString();
  }, [isPublicPreview, rawModelUrl, nameFromQuery]);

  const qrDataUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const data = encodeURIComponent(shareUrl || window.location.href);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${data}`;
  }, [shareUrl]);

  if (!isPublicPreview && id && !project && shareState === 'loading') {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-sm text-white/50">Loading AR experience…</p>
      </div>
    );
  }

  if (!isPublicPreview && id && !project && shareState === 'absent') {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <p className="text-lg font-bold tracking-tight">This experience is not available</p>
        <p className="text-sm text-white/55 max-w-md leading-relaxed">
          It may be private, not published yet, or the link is wrong. Ask the creator to publish with a{' '}
          <strong className="text-white/80">public</strong> link from AR Studio.
        </p>
        <Link
          to="/"
          className="mt-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white text-black hover:bg-white/90"
        >
          Back home
        </Link>
      </div>
    );
  }

  if (!isPublicPreview && id && !project && shareState === 'error') {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <p className="text-sm text-white/60">Could not load this AR page. Check your connection and try again.</p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-full text-sm font-bold bg-white text-black hover:bg-white/90"
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col relative">
      {isCameraARActive && modelUrlForViewer ? (
        <UniversalCameraAR
          modelUrl={modelUrlForViewer}
          title={title}
          initialMotionMode={startInMotionMode}
          onClose={() => {
            setIsCameraARActive(false);
            setStartInMotionMode(false);
          }}
        />
      ) : null}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
          <Link
            to={project ? `/project/${id}` : '/'}
            className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white/40" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">{title}</h1>
            <p
              className={
                isPublicPreview || !tagline
                  ? 'text-[10px] text-white/40 uppercase tracking-widest font-bold'
                  : 'text-[11px] text-white/50 leading-snug line-clamp-2 font-medium normal-case tracking-normal'
              }
            >
              {isPublicPreview
                ? 'Local GLB · WebAR'
                : tagline
                  ? tagline.length > 180
                    ? `${tagline.slice(0, 180)}…`
                    : tagline
                  : 'AR Experience Preview'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto justify-stretch sm:justify-end">
          <button
            type="button"
            onClick={() => {
              if (shareUrl && navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(shareUrl);
              }
            }}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            style={{ borderColor: accent && accent !== '#10b981' ? `${accent}55` : undefined }}
          >
            <Share2 className="w-3 h-3 shrink-0" />
            <span className="truncate">Copy link</span>
          </button>
          <a
            href={modelUrlForViewer || rawModelUrl}
            download
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-full text-black text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              !modelUrlForViewer ? 'pointer-events-none opacity-40' : 'hover:opacity-90'
            }`}
            style={{ backgroundColor: accent }}
          >
            <Download className="w-3 h-3 shrink-0" />
            GLB
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="flex-1 relative bg-gradient-to-br from-emerald-500/5 to-zinc-900/30 min-h-[50vh] lg:min-h-0">
          {isModelLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/85 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                {preloadProgress > 0 && preloadProgress < 100 && (
                  <span className="absolute text-[10px] font-mono font-bold text-white/90">
                    {preloadProgress}%
                  </span>
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5 px-6 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-white/90">
                  Loading 3D Experience…
                </p>
                <div className="w-48 max-w-[70vw] h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                    style={{ width: `${Math.max(8, preloadProgress)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/40">Optimizing geometry & textures for phone</p>
              </div>
            </div>
          )}
          {meshyLoadError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#0a0a0a] z-10">
              <p className="text-sm text-red-200/90 text-center max-w-md leading-relaxed">{meshyLoadError}</p>
            </div>
          ) : null}
          {modelUrlForViewer ? (
            <div className="relative w-full h-full min-h-[50vh]">
              <ModelViewer
                key={modelUrlForViewer}
                src={modelUrlForViewer}
                loading="eager"
                reveal="auto"
                interaction-prompt="none"
                ar
                ar-modes="webxr scene-viewer quick-look"
                camera-controls
                auto-rotate
                shadow-intensity="1"
                exposure="1"
                onLoad={() => setIsModelLoading(false)}
                style={{ width: '100%', height: '100%', minHeight: '50vh', backgroundColor: '#0a0a0a' }}
              >
                <button
                  slot="ar-button"
                  style={{ display: 'none' }}
                />
              </ModelViewer>

              {/* Universal Web Camera AR Primary Action (Works on ALL Devices & Phones) */}
              <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 max-w-[calc(100%-2rem)] w-full sm:w-auto px-4">
                <button
                  type="button"
                  onClick={() => setIsCameraARActive(true)}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-black text-sm sm:text-base font-bold rounded-full transition-all flex items-center justify-center gap-2.5 shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: accent,
                    boxShadow:
                      accent && accent !== '#10b981'
                        ? `0 25px 50px -12px ${accent}88`
                        : '0 25px 50px -12px rgba(16, 185, 129, 0.6)',
                  }}
                >
                  <Camera className="w-5 h-5 shrink-0" />
                  <span>{ctaLabel}</span>
                </button>
                <div className="px-3.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Universal WebAR · No ARCore Required
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStartInMotionMode(true);
                  setIsCameraARActive(true);
                }}
                className="absolute top-4 right-4 z-20 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-bold rounded-full shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Gamepad2 className="w-4 h-4 fill-black" />
                Motion (Drive)
              </button>
            </div>
          ) : !meshyLoading && !meshyLoadError && !modelUrlForViewer ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
              <p className="text-sm text-white/40">No model to display</p>
            </div>
          ) : null}

          <div className="absolute top-4 left-4 sm:top-8 sm:left-8 space-y-2 sm:space-y-4 pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-3 w-fit">
              <Globe className="w-4 h-4" style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                WebAR
              </span>
            </div>
            <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-3 w-fit">
              <Zap className="w-4 h-4 text-zinc-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Local GLB
              </span>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/5 bg-black/40 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 sm:gap-10 overflow-y-auto max-h-[55vh] lg:max-h-none">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <QrCode className="w-6 h-6" style={{ color: accent }} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Scan to open</h2>
            </div>
            <div className="p-6 rounded-3xl bg-white flex items-center justify-center aspect-square shadow-2xl">
              <div
                className="w-full h-full bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: `url('${qrDataUrl}')` }}
              />
            </div>
            <p className="text-xs text-white/40 text-center leading-relaxed break-all">
              Same URL loads this model on your phone — uses the GLB from this app (no CDN).
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Compatibility</h3>
            <div className="space-y-3">
              {[
                { label: 'Universal WebAR (Any Camera)', status: '100% Supported', color: 'text-emerald-400 font-bold' },
                { label: 'Android (Chrome / Camera)', status: 'Supported', color: 'text-emerald-500' },
                { label: 'iOS (Safari / Quick Look)', status: 'Supported', color: 'text-emerald-500' },
                { label: 'Google ARCore / Scene Viewer', status: 'Optional', color: 'text-white/40' },
              ].map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <span className="text-xs text-white/60 font-medium">{c.label}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${c.color}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="mt-auto p-6 rounded-3xl space-y-4 border border-white/10"
            style={{ backgroundColor: `${accent}12` }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Tip</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Use a well-lit room and a flat surface. On iOS, the AR button opens Quick Look when
              available.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              View Tutorial
              <ChevronRight className="w-3 h-3" />
            </motion.button>
          </div>
        </aside>
      </main>
    </div>
  );
}
