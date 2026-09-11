import { Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Store, Users, Sparkles } from 'lucide-react';
import OSDialog from './OSDialog';

const FREELANCERS = [
  { name: 'Priya Sharma', role: 'Blender · PBR', rate: '$10/hr · ₹830/hr' },
  { name: 'Arjun Mehta', role: 'WebAR · Three.js', rate: '$10/hr · ₹830/hr' },
  { name: 'Vikram Desai', role: 'ARCore · Unity', rate: '$10/hr · ₹830/hr' },
] as const;

export type PostFlowStep = 'feedback' | 'sell';

type Props = {
  step: PostFlowStep;
  onStep: (s: PostFlowStep) => void;
  onClose: () => void;
  onLiked?: (liked: boolean) => void;
  projectId: string;
  onOpenMarketplaceList: () => void;
};

export default function PostModelFlow({
  step,
  onStep,
  onClose,
  onLiked,
  projectId,
  onOpenMarketplaceList,
}: Props) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 pointer-events-none">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />
      <div className="relative z-10 pointer-events-auto w-full max-w-md">
        {step === 'feedback' && (
          <OSDialog title="VisiARise — How was this result?" onClose={onClose}>
            <p className="text-xs text-white/55 mb-4">
              Your 3D asset is ready. Quick feedback helps us tune Ardya — this dialog stays compact like a system
              alert.
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-2">Rate this response</p>
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => onLiked?.(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25"
              >
                <ThumbsUp className="w-4 h-4" /> Helpful
              </button>
              <button
                type="button"
                onClick={() => onLiked?.(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/10"
              >
                <ThumbsDown className="w-4 h-4" /> Not quite
              </button>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3 mb-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-white/45 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400/90" />
                Want to personalise this?
              </div>
              <p className="text-xs text-white/55 mb-3">
                Match with freelancers from <span className="text-white/80">~$10 USD / hour</span> (indicative INR
                shown). Typical specialists:
              </p>
              <ul className="space-y-2 mb-3">
                {FREELANCERS.map((f) => (
                  <li
                    key={f.name}
                    className="flex justify-between gap-2 text-[11px] border-b border-white/[0.06] pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-white/80 font-medium">{f.name}</span>
                    <span className="text-white/40 shrink-0">{f.role}</span>
                    <span className="text-emerald-400/90 font-mono text-[10px]">{f.rate}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <Link
                  to="/freelancers"
                  className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline"
                  onClick={onClose}
                >
                  <Users className="w-3.5 h-3.5" />
                  Browse freelancers &amp; open jobs
                </Link>
                <a
                  href="mailto:hello@visiarise.com?subject=Book%20a%203D%20%2F%20AR%20designer&body=Hi%20VisiARise%2C%0A%0AI%20want%20to%20hire%20for%20project%3A%20"
                  className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/70 hover:text-white"
                  onClick={onClose}
                >
                  Schedule &amp; scope · email the team
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onStep('sell')}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90"
              >
                Continue
              </button>
            </div>
          </OSDialog>
        )}

        {step === 'sell' && (
          <OSDialog title="List on marketplace?" onClose={onClose}>
            <p className="text-xs text-white/55 mb-4">
              Are you looking to <strong className="text-white/90">sell this 3D model</strong> you generated? You can
              submit title, price, and category — buyers get the same GLB pipeline as Ardya.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenMarketplaceList();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-400 text-zinc-950 text-sm font-bold border border-white/30 shadow-lg"
              >
                <Store className="w-4 h-4" />
                Open listing form
              </button>
              <Link
                to={`/studio/${projectId}`}
                className="text-center text-[11px] text-white/40 hover:text-white/70 py-1"
                onClick={onClose}
              >
                Skip — open AR Studio instead
              </Link>
            </div>
          </OSDialog>
        )}
      </div>
    </div>
  );
}
