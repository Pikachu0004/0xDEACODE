import type { ModelUrlsPayload } from '../lib/api';

const ORDER = ['glb', 'fbx', 'usdz', 'obj', 'mtl', 'stl'] as const;

export function MeshyFormatDownloadLinks({
  urls,
  className = '',
  compact = false,
}: {
  urls?: ModelUrlsPayload;
  className?: string;
  /** Smaller chips for inline chat */
  compact?: boolean;
}) {
  if (!urls) return null;
  const items = ORDER.filter((k) => urls[k]);
  if (items.length === 0) return null;
  return (
    <div className={className}>
      {!compact ? (
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Download formats</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {items.map((k) => (
          <a
            key={k}
            href={urls[k]}
            target="_blank"
            rel="noopener noreferrer"
            download
            className={
              compact
                ? 'px-2 py-1 rounded-lg bg-white/10 text-[9px] font-bold uppercase tracking-wider text-white/70 hover:bg-brand-primary/20 hover:text-brand-primary border border-white/10'
                : 'px-3 py-1.5 rounded-xl bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-brand-primary/20 hover:text-brand-primary border border-white/10 transition-colors'
            }
          >
            .{k}
          </a>
        ))}
      </div>
    </div>
  );
}
