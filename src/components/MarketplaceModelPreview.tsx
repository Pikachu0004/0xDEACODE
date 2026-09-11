const MV = 'model-viewer' as any;

type Props = {
  src: string;
  poster: string;
  className?: string;
};

/** Interactive 3D card preview (model-viewer is loaded globally from index.html). */
export default function MarketplaceModelPreview({ src, poster, className = '' }: Props) {
  return (
    <div className={`relative bg-[#0a0a0a] ${className}`}>
      <MV
        src={src}
        poster={poster}
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="1"
        loading="eager"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '280px',
          backgroundColor: '#0a0a0a',
        }}
      />
    </div>
  );
}
