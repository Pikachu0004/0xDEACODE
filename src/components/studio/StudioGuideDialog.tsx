import { X, BookOpen } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  uiTheme: 'dark' | 'light';
};

export function StudioGuideDialog({ open, onClose, uiTheme }: Props) {
  if (!open) return null;
  const panel = uiTheme === 'light' ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-[#0a0a0a] border-white/10 text-white';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl max-h-[88vh] overflow-y-auto ${panel}`} role="dialog">
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-inherit">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest">AR Studio guide</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          className={`p-4 space-y-4 text-[13px] leading-relaxed ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/85'}`}
        >
          <section>
            <h3 className="font-bold text-brand-primary mb-1">Scale (important for AR)</h3>
            <p className={uiTheme === 'light' ? 'text-zinc-600' : 'text-white/70'}>
              One scene unit = <strong>1 meter</strong>. Bounding sizes show in <strong>inches</strong> (and meters) so
              you can match real products (e.g. a 12&quot; box). Use “Normalize height” or target W×H×D to lock
              real-world size before publishing.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-brand-primary mb-1">Mobile</h3>
            <p className={uiTheme === 'light' ? 'text-zinc-600' : 'text-white/70'}>
              Bottom tabs: <strong>Canvas</strong> (default viewport), <strong>Tools</strong> (gizmos),{' '}
              <strong>Scene</strong> (hierarchy &amp; settings), <strong>AI</strong> (generate &amp; chat).
            </p>
          </section>
          <section>
            <h3 className="font-bold text-brand-primary mb-1">Desktop</h3>
            <p className={uiTheme === 'light' ? 'text-zinc-600' : 'text-white/70'}>
              Use <strong>AI</strong> for Meshy text or image→3D; models save to the project. <strong>Download</strong>{' '}
              opens format choices. <strong>Motion rig</strong> adds a preview turntable or bob on the selection.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-brand-primary mb-1">Selection</h3>
            <p className={uiTheme === 'light' ? 'text-zinc-600' : 'text-white/70'}>
              Cmd/Ctrl+click hierarchy for multi-select. The last selected object gets the transform gizmo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
