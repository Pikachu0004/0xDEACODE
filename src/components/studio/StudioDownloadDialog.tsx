import type { ModelUrlsPayload } from '../../lib/api';
import { MeshyFormatDownloadLinks } from '../MeshyFormatDownloadLinks';
import { X, FileDown, ImageIcon, Link2 } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  themeMuted: string;
  uiTheme: 'dark' | 'light';
  meshyUrls?: ModelUrlsPayload;
  onDownloadMergedGlb: () => void;
  onScreenshot: () => void;
  onCopyShareLink: () => void;
};

export function StudioDownloadDialog({
  open,
  onClose,
  themeMuted,
  uiTheme,
  meshyUrls,
  onDownloadMergedGlb,
  onScreenshot,
  onCopyShareLink,
}: Props) {
  if (!open) return null;
  const panel = uiTheme === 'light' ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-[#0a0a0a] border-white/10 text-white';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl max-h-[85vh] overflow-y-auto ${panel}`}
        role="dialog"
        aria-labelledby="dl-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 id="dl-title" className="text-sm font-bold uppercase tracking-widest">
            Export &amp; download
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <button
            type="button"
            onClick={() => {
              onDownloadMergedGlb();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 text-left"
          >
            <FileDown className="w-5 h-5 shrink-0 text-brand-primary" />
            <div>
              <p className="font-bold">Merged scene (GLB)</p>
              <p className={`text-[11px] ${themeMuted}`}>Current AR Studio export — all layers combined.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onScreenshot();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 text-left"
          >
            <ImageIcon className="w-5 h-5 shrink-0 text-brand-primary" />
            <div>
              <p className="font-bold">Viewport PNG</p>
              <p className={`text-[11px] ${themeMuted}`}>Screenshot of the current view.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onCopyShareLink();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 text-left"
          >
            <Link2 className="w-5 h-5 shrink-0 text-brand-primary" />
            <div>
              <p className="font-bold">Copy AR link</p>
              <p className={`text-[11px] ${themeMuted}`}>Share WebAR preview URL.</p>
            </div>
          </button>
          {meshyUrls ? (
            <div className="pt-2 border-t border-white/10">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${themeMuted}`}>Meshy source formats</p>
              <MeshyFormatDownloadLinks urls={meshyUrls} />
            </div>
          ) : (
            <p className={`text-[11px] ${themeMuted}`}>No Meshy multi-format URLs on this project yet (generate via AI).</p>
          )}
        </div>
      </div>
    </div>
  );
}
