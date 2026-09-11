/** Typography wordmark for Ardya (text/image → AR). No separate asset required yet. */
export function ArdyaWordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-display font-bold tracking-tight text-[1.05rem] sm:text-lg bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent ${className}`}
    >
      Pixora
    </span>
  );
}
