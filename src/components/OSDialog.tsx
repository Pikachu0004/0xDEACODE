import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
};

/** Compact OS-style window — not fullscreen; looks like a system dialog. */
export default function OSDialog({ title, children, onClose, className = '' }: Props) {
  return (
    <div
      className={`pointer-events-auto w-full max-w-md rounded-xl border border-white/[0.14] bg-[#1c1c1e] shadow-2xl ring-1 ring-inset ring-white/[0.06] overflow-hidden ${className}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] bg-[#2c2c2e]/90">
        <div className="flex gap-1.5 shrink-0">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <p className="flex-1 text-center text-[11px] font-semibold text-white/55 truncate px-2">{title}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/10"
          >
            Close
          </button>
        ) : (
          <span className="w-10 shrink-0" />
        )}
      </div>
      <div className="p-4 sm:p-5 text-sm text-white/85 leading-relaxed">{children}</div>
    </div>
  );
}
