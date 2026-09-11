import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

function useFinePointer() {
  const [ok, setOk] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const fn = () => setOk(mq.matches);
    mq.addEventListener('change', fn);
    fn();
    return () => mq.removeEventListener('change', fn);
  }, []);
  return ok;
}

/**
 * Decorative cursor only: `pointer-events: none` so clicks hit real targets underneath.
 * Hidden on touch / coarse pointer. Optional system cursor hide while active.
 */
export default function PurpleBallCursor() {
  const finePointer = useFinePointer();
  const reduced = useReducedMotion() ?? false;
  const ballRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!finePointer || reduced) return;

    const root = document.documentElement;
    const prev = root.style.cursor;
    root.style.cursor = 'none';

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (ballRef.current) ballRef.current.style.opacity = '1';
    };
    const onLeave = () => {
      if (ballRef.current) ballRef.current.style.opacity = '0';
    };

    let raf = 0;
    const lerp = 0.22;
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * lerp;
      pos.current.y += (target.current.y - pos.current.y) * lerp;
      const el = ballRef.current;
      if (el) {
        el.style.transform = `translate3d(${pos.current.x}px,${pos.current.y}px,0) translate(-50%,-50%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      root.style.cursor = prev;
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [finePointer, reduced]);

  if (!finePointer || reduced) return null;

  return (
    <div
      ref={ballRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] opacity-0"
      style={{
        width: 22,
        height: 22,
        borderRadius: 9999,
        willChange: 'transform, opacity',
        background:
          'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, rgba(216,180,254,0.35) 28%, rgba(147,51,234,0.92) 52%, rgba(88,28,135,0.95) 100%)',
        boxShadow:
          '0 0 28px rgba(168,85,247,0.55), 0 0 12px rgba(192,132,252,0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
      }}
    />
  );
}
