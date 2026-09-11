import { X, Sparkles, CreditCard } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  balance: number | null;
  isAdmin: boolean;
  onDemoAddCredits: (amount: number) => void;
};

const PACKS = [
  { id: 'starter', label: 'Starter', price: '$9', credits: 120, blurb: 'Try more Meshy runs' },
  { id: 'creator', label: 'Creator', price: '$29', credits: 450, blurb: 'Regular AR iterations' },
  { id: 'studio', label: 'Studio', price: '$79', credits: 1400, blurb: 'Team campaigns' },
] as const;

export function ProjectChatCreditsDialog({ open, onClose, balance, isAdmin, onDemoAddCredits }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d12] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-brand-primary mb-1">
              <CreditCard className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Credits</span>
            </div>
            <h2 className="text-lg font-bold">Top up (demo)</h2>
            <p className="text-[11px] text-white/45 mt-1">
              Checkout is not wired yet — choosing a pack adds credits in this session for testing. Balance after refresh
              may sync from the server.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-white/50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAdmin ? (
          <p className="text-sm text-emerald-400/90 py-4">Admin account — unlimited Meshy credits on the backend.</p>
        ) : (
          <p className="text-xs text-white/50 mb-4">
            Current balance:{' '}
            <span className="text-brand-primary font-bold font-mono">{balance ?? '—'}</span>
          </p>
        )}

        <div className="space-y-3">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={isAdmin}
              onClick={() => {
                if (isAdmin) return;
                onDemoAddCredits(p.credits);
                onClose();
              }}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <div>
                <p className="text-sm font-bold">{p.label}</p>
                <p className="text-[10px] text-white/40">{p.blurb}</p>
                <p className="text-[10px] text-brand-primary/90 mt-1">+{p.credits} credits (demo)</p>
              </div>
              <span className="text-sm font-bold text-white shrink-0">{p.price}</span>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/30 mt-4 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Production billing will use your payment provider; this dialog stays in-app so you do not lose your place in
          ARdya LLM.
        </p>
      </div>
    </div>
  );
}
