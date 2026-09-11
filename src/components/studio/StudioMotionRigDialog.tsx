import { X } from 'lucide-react';
import type { StudioRigConfig } from '../../store/useAppStore';

type Props = {
  open: boolean;
  onClose: () => void;
  uiTheme: 'dark' | 'light';
  rig: StudioRigConfig;
  onChange: (next: StudioRigConfig) => void;
  onApply: () => void;
  targetLabel: string;
};

export function StudioMotionRigDialog({ open, onClose, uiTheme, rig, onChange, onApply, targetLabel }: Props) {
  if (!open) return null;
  const panel = uiTheme === 'light' ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-[#0a0a0a] border-white/10 text-white';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${panel}`} role="dialog">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-sm font-bold uppercase tracking-widest">Motion rig</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 text-[13px]">
          <p className="text-white/60 text-[12px]">
            Procedural turntable / bob runs <strong className="text-white">only in this editor</strong> as a preview. The
            merged GLB export does not bake this motion—turn the rig off before export if you need a static pose. Settings
            are saved on the project when you tap below (and sync to your account when logged in).
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rig.enabled}
              onChange={(e) => onChange({ ...rig, enabled: e.target.checked })}
            />
            Enable preview
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-white/40">Mode</span>
            <select
              value={rig.mode}
              onChange={(e) => onChange({ ...rig, mode: e.target.value as StudioRigConfig['mode'] })}
              className="rounded-lg border border-white/15 bg-transparent px-2 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="rotate">Rotate (Y turntable)</option>
              <option value="bob">Bob (vertical)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-white/40">Speed</span>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={rig.speed}
              onChange={(e) => onChange({ ...rig, speed: parseFloat(e.target.value) })}
              className="w-full accent-brand-primary"
            />
            <span className="text-[10px] font-mono text-white/50">{rig.speed.toFixed(1)}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-white/40">Bob amplitude (m)</span>
            <input
              type="range"
              min={0.02}
              max={0.5}
              step={0.02}
              value={rig.amplitude}
              onChange={(e) => onChange({ ...rig, amplitude: parseFloat(e.target.value) })}
              className="w-full accent-brand-primary"
            />
            <span className="text-[10px] font-mono text-white/50">{rig.amplitude.toFixed(2)} m</span>
          </label>
          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-brand-primary text-black font-bold text-xs uppercase tracking-widest"
          >
            Save rig to project
          </button>
        </div>
      </div>
    </div>
  );
}
