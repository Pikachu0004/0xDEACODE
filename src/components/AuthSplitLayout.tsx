import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { AUTH_HERO_VIDEO_SRC, AUTH_QUOTES } from '../constants/authHero';

type AuthSplitLayoutProps = {
  children: ReactNode;
  /** Shown under the logo line on the form side */
  eyebrow: string;
  title: string;
  subtitle: string;
};

export default function AuthSplitLayout({ children, eyebrow, title, subtitle }: AuthSplitLayoutProps) {
  const [qi, setQi] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setQi((i) => (i + 1) % AUTH_QUOTES.length), 7000);
    return () => clearInterval(t);
  }, []);

  const q = AUTH_QUOTES[qi];

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#030010] text-white flex flex-col lg:flex-row">
      {/* Left: video + quotes (desktop) */}
      <div className="relative hidden lg:block lg:w-1/2 lg:min-h-screen overflow-hidden border-r border-white/[0.06]">
        <video
          className="absolute inset-0 h-full w-full object-cover scale-105"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src={AUTH_HERO_VIDEO_SRC} type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom right, rgba(10, 0, 24, 0.95), rgba(18, 4, 40, 0.88), rgba(0, 0, 0, 0.9))',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%\\,rgb(139_92_246_/_0.25)\\,transparent_50%)] pointer-events-none" />
        <div className="relative z-10 h-full min-h-screen flex flex-col justify-end p-12 xl:p-16 pb-16">
          <div className="mb-auto pt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40 mb-4">VisiARise</p>
            <h2 className="font-display text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1] max-w-lg">
              Create in 3D.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-200 to-white">
                Publish in AR.
              </span>
            </h2>
          </div>
          <div className="min-h-[140px] max-w-xl">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={qi}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
                className="border-l-2 border-violet-500/50 pl-6"
              >
                <p className="text-lg xl:text-xl text-white/90 font-light leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                <footer className="mt-4 text-xs font-bold uppercase tracking-widest text-violet-300/80">
                  — {q.author}
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile: short quote strip */}
      <div
        className="lg:hidden relative overflow-hidden border-b border-white/10 px-4 py-6"
        style={{ background: 'linear-gradient(to right, #1a0a2e, #0d0518, #000000)' }}
      >
        <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%3E%3Cpath%20d=%22M0%2040h40V0%22%20fill=%22none%22%20stroke=%22%23fff%22%20stroke-opacity=%22.04%22/%3E%3C/svg%3E')]" />
        <p className="relative text-xs text-white/55 text-center font-light leading-relaxed max-w-md mx-auto">
          &ldquo;{q.text}&rdquo;
        </p>
      </div>

      {/* Right: form */}
      <div className="relative flex-1 flex flex-col items-stretch justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
        <Link
          to="/"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white transition-colors z-20 group"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 group-hover:bg-white/10 group-hover:border-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </span>
          <span className="hidden sm:inline font-medium">Back to home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-[420px]"
        >
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <img
                src="/Pixora_LOGO.png"
                alt="Pixora"
                className="h-10 w-auto opacity-95 group-hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400/90 mb-2">{eyebrow}</p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2">{title}</h1>
            <p className="text-sm text-white/45 leading-relaxed">{subtitle}</p>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-xl shadow-violet-500/20 ring-1 ring-inset ring-white/[0.04] p-7 sm:p-8">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
