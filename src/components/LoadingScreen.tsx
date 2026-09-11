import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const HERO_WORDS = ['Generate', 'Place in AR', 'Preview in 3D', 'Ship digitally'];

const STATUS_LINES = [
  'Starting VisiARise…',
  'Loading 3D library…',
  'Preparing WebAR pipeline…',
  'Workspace ready.',
];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stepMs = reducedMotion ? 220 : mobile ? 360 : 460;

    const wordTick = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 520);

    let step = 0;
    setStatusIndex(0);
    const stepTimer = window.setInterval(() => {
      step += 1;
      if (step < STATUS_LINES.length) {
        setStatusIndex(step);
      } else {
        window.clearInterval(stepTimer);
        window.clearInterval(wordTick);
        window.setTimeout(() => onCompleteRef.current(), reducedMotion ? 100 : 260);
      }
    }, stepMs);

    return () => {
      window.clearInterval(wordTick);
      window.clearInterval(stepTimer);
    };
  }, []);

  const barProgress = (statusIndex + 1) / STATUS_LINES.length;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[9999] bg-[#070708] flex flex-col items-center justify-center overflow-hidden px-6"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.09) 50%, transparent 60%)`,
          backgroundSize: '200% 100%',
          animation: 'loading-shine 2.8s ease-in-out infinite',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="absolute top-6 left-6 sm:top-10 sm:left-10 flex items-center gap-3"
      >
        <img src="/Pixora_LOGO.png" alt="" className="h-8 w-auto opacity-90 sm:h-9" />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/55">VisiARise</span>
          <span className="text-[9px] tracking-widest text-teal-500/70 uppercase">Spatial workspace</span>
        </div>
      </motion.div>

      <div className="relative flex flex-col items-center justify-center text-center max-w-lg">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/30 mb-8">Loading experience</p>
        <div className="h-[3.5rem] sm:h-[4.5rem] flex items-center justify-center mb-10">
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIndex}
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-5xl md:text-6xl font-display font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-white to-zinc-400"
            >
              {HERO_WORDS[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="absolute bottom-10 left-6 right-6 sm:left-auto sm:right-12 sm:bottom-12 sm:w-full sm:max-w-sm sm:ml-auto flex flex-col items-start gap-3"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={statusIndex}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.25 }}
            className="text-xs sm:text-sm text-zinc-400 font-medium tracking-wide"
          >
            {STATUS_LINES[statusIndex]}
          </motion.p>
        </AnimatePresence>
        <div className="relative w-full h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 w-full rounded-full origin-left"
            style={{
              background: 'linear-gradient(90deg, #5eead4 0%, #e4e4e7 45%, #a1a1aa 100%)',
              boxShadow: '0 0 12px rgba(94, 234, 212, 0.22)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: barProgress }}
            transition={{ type: 'spring', stiffness: 140, damping: 24 }}
          />
        </div>
      </motion.div>

      <style>{`
        @keyframes loading-shine {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </motion.div>
  );
}
