import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Lock, Sparkles, Palette, Type } from 'lucide-react';

export type StudioPublishOptions = {
  arPageTitle: string;
  arPageTagline: string;
  arCtaLabel: string;
  arAccentHex: string;
  arSharePublic: boolean;
};

type StudioPublishDialogProps = {
  open: boolean;
  busy: boolean;
  defaults: StudioPublishOptions;
  projectName: string;
  onClose: () => void;
  onConfirm: (opts: StudioPublishOptions) => void | Promise<void>;
};

export function StudioPublishDialog({
  open,
  busy,
  defaults,
  projectName,
  onClose,
  onConfirm,
}: StudioPublishDialogProps) {
  const [arPageTitle, setArPageTitle] = useState(defaults.arPageTitle);
  const [arPageTagline, setArPageTagline] = useState(defaults.arPageTagline);
  const [arCtaLabel, setArCtaLabel] = useState(defaults.arCtaLabel);
  const [arAccentHex, setArAccentHex] = useState(defaults.arAccentHex || '#10b981');
  const [arSharePublic, setArSharePublic] = useState(defaults.arSharePublic);

  useEffect(() => {
    if (!open) return;
    setArPageTitle(defaults.arPageTitle || projectName);
    setArPageTagline(defaults.arPageTagline);
    setArCtaLabel(defaults.arCtaLabel || 'View in your space');
    setArAccentHex(defaults.arAccentHex || '#10b981');
    setArSharePublic(defaults.arSharePublic);
  }, [open, defaults, projectName]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-ar-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0a0a0f] shadow-2xl max-h-[min(92vh,640px)] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-white/5 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Publish WebAR
                </p>
                <h2 id="publish-ar-title" className="text-lg font-bold tracking-tight mt-1">
                  Customize your public page
                </h2>
                <p className="text-xs text-white/45 mt-1 leading-relaxed">
                  Export merges your scene to one GLB. Choose how it looks when people open the link or scan your QR.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Page heading
                </span>
                <input
                  value={arPageTitle}
                  onChange={(e) => setArPageTitle(e.target.value)}
                  placeholder={projectName}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tagline / subtitle</span>
                <input
                  value={arPageTagline}
                  onChange={(e) => setArPageTagline(e.target.value)}
                  placeholder="e.g. Scan to try our new sneaker in your room"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">AR button label</span>
                <input
                  value={arCtaLabel}
                  onChange={(e) => setArCtaLabel(e.target.value)}
                  placeholder="View in your space"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Accent color
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={arAccentHex.length >= 4 ? arAccentHex : '#10b981'}
                    onChange={(e) => setArAccentHex(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    value={arAccentHex}
                    onChange={(e) => setArAccentHex(e.target.value)}
                    placeholder="#10b981"
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Visibility</p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="ar-vis"
                    checked={arSharePublic}
                    onChange={() => setArSharePublic(true)}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      Public link &amp; QR
                    </div>
                    <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                      Anyone with the URL can view this experience — ideal for campaigns, packaging, and sharing.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="ar-vis"
                    checked={!arSharePublic}
                    onChange={() => setArSharePublic(false)}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Lock className="w-4 h-4 text-zinc-400" />
                      Private (this device / your account)
                    </div>
                    <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                      Scene is still exported for you locally; the share link only works on signed-in devices with this
                      project synced.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 flex gap-3 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-bold text-white/70 hover:bg-white/5 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void onConfirm({
                    arPageTitle: arPageTitle.trim() || projectName,
                    arPageTagline: arPageTagline.trim(),
                    arCtaLabel: arCtaLabel.trim() || 'View in your space',
                    arAccentHex: arAccentHex.trim() || '#10b981',
                    arSharePublic,
                  })
                }
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
