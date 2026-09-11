import { useCallback, useEffect, useLayoutEffect, useRef, useState, memo, Fragment, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { motion, useReducedMotion } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  ChevronRight,
  MessageSquare,
  QrCode,
  Cpu,
  Leaf,
  ShoppingBag,
  Layout,
  MousePointer2,
  Smartphone,
  Send,
  Loader2,
  Users,
  GraduationCap,
  Recycle,
  SkipForward,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { ArdyaWordmark } from '../components/ArdyaWordmark';
import { Link, useLocation } from 'react-router-dom';
import DroneScene from '../components/DroneScene';
import { useGLTF } from '@react-three/drei';
import {
  LANDING_DEMO_SCENES,
  HERO_DECK_COPY,
  buildTryArUrl,
  type LandingDemoScene,
} from '../lib/demoAssets';
import { prefersLightMedia, subscribeConnectionChange } from '../lib/perf';
import { apiFetch } from '../lib/api';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/** Fewer main-thread blur repaints during scroll (blur is very expensive to animate). */
ScrollTrigger.config({ ignoreMobileResize: true });

/** Demo timings in ms (0.5× = half the wait vs earlier = ~2× faster overall) */
const DEMO_MS = {
  intro: 700,
  perChar: 31,
  pauseAfterType: 500,
  userBubble: 900,
  generating: 2400,
  imageHold: 2600,
  convertUi: 1400,
  meshLoading: 1900,
  modelHold: 2600,
  qrHold: 3000,
} as const;

/** 0 type · 1 user sent · 2 generating · 3 image · 4 convert btn · 5 loading 3D · 6 model · 7 QR */
type DemoPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Gradient accent line — GSAP cycles while its slide is active; memo avoids resets when Ardya demo re-renders */
const HeroDeckAccentLine = memo(
  function HeroDeckAccentLine({
    panelIdx,
    activePanel,
    phrases,
  }: {
    panelIdx: number;
    activePanel: number;
    phrases: readonly [string, string, ...string[]];
  }) {
    const spanRef = useRef<HTMLSpanElement>(null);
    const reduceMotion = useReducedMotion() ?? false;
    const isActive = activePanel === panelIdx;

    useLayoutEffect(() => {
      const el = spanRef.current;
      if (!el) return;
      if (!isActive || reduceMotion) {
        el.textContent = phrases[0];
      }
    }, [isActive, reduceMotion, phrases]);

    useEffect(() => {
      const el = spanRef.current;
      if (!el) return;
      if (reduceMotion || phrases.length < 2) {
        el.textContent = phrases[0];
        return;
      }
      if (!isActive) {
        gsap.killTweensOf(el);
        el.textContent = phrases[0];
        return;
      }

      gsap.killTweensOf(el);
      el.textContent = phrases[0];
      let i = 0;
      let delayed: gsap.core.Tween | undefined;
      const swap = () => {
        gsap.to(el, {
          opacity: 0,
          y: -10,
          filter: 'blur(8px)',
          duration: 0.32,
          ease: 'power2.in',
          onComplete: () => {
            i = (i + 1) % phrases.length;
            el.textContent = phrases[i] ?? phrases[0];
            gsap.fromTo(
              el,
              { opacity: 0, y: 12, filter: 'blur(10px)' },
              {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.42,
                ease: 'power2.out',
                onComplete: () => {
                  delayed = gsap.delayedCall(2.5, swap);
                },
              }
            );
          },
        });
      };
      delayed = gsap.delayedCall(2.6, swap);
      return () => {
        delayed?.kill();
        gsap.killTweensOf(el);
        el.textContent = phrases[0];
      };
    }, [isActive, reduceMotion, phrases]);

    return (
      <span
        ref={spanRef}
        className="text-gradient-shine inline-block min-h-[1.15em] align-bottom"
      />
    );
  },
  (prev, next) =>
    prev.panelIdx === next.panelIdx &&
    prev.activePanel === next.activePanel &&
    prev.phrases === next.phrases
);

/** Panels 2–4 (and reduced-motion panel 1): glass preview + GLB when scrolled into view */
function HeroStaticDemoCard({
  scene,
  live,
}: {
  scene: LandingDemoScene;
  live: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="demo-ardya-glass relative isolate z-10 flex w-full max-w-full flex-col overflow-hidden rounded-[1.75rem] sm:max-w-md sm:rounded-[2rem]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-22 bg-[radial-gradient(ellipse_at_50%_0%\\,rgb(255_255_255_/_0.05)_0%\\,transparent_55%)]"
      />
      <div className="demo-ardya-glass__header relative z-10 flex shrink-0 flex-col gap-1 border-b border-white/[0.09] p-4 sm:p-5">
        <ArdyaWordmark />
        <div className="text-[9px] font-medium tracking-wide text-white/45">Preview · {scene.label}</div>
      </div>
      <div className="demo-ardya-glass__stage relative z-10 h-[268px] w-full shrink-0 overflow-hidden sm:h-[300px]">
        <div className="relative h-full w-full min-h-0">
          {live ? (
            <DroneScene
              key={scene.id}
              frame="hero"
              modelScale={(scene.modelScale ?? 1) * 1.08}
              modelUrl={scene.modelUrl}
              interactive
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <img
              src={scene.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain p-4 opacity-45"
            />
          )}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-white/10 bg-black/20 px-3 py-3 backdrop-blur-md sm:px-4">
        <p className="line-clamp-2 text-[10px] leading-snug text-white/50">{scene.prompt}</p>
        <a
          href={buildTryArUrl(scene.modelUrl, `Landing · ${scene.label}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-900"
        >
          <Smartphone className="h-3 w-3" />
          Open AR
        </a>
      </div>
      <div className="demo-ardya-glass__footer relative z-10 flex shrink-0 border-t border-white/[0.09] px-3 py-3 sm:px-4">
        <div className="w-full truncate rounded-full border border-white/[0.1] bg-black/12 px-3 py-2 text-[10px] text-white/40 backdrop-blur-lg">
          {scene.label} · GLB in library
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const droneRef = useRef<HTMLDivElement>(null);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>(0);
  const [demoIndex, setDemoIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const reduceUiMotion = useReducedMotion() ?? false;
  const activeDemo = LANDING_DEMO_SCENES[demoIndex] ?? LANDING_DEMO_SCENES[0];
  const heroCopy = HERO_DECK_COPY[0]!;

  useEffect(() => {
    for (const s of LANDING_DEMO_SCENES) {
      useGLTF.preload(s.modelUrl);
    }
  }, []);

  const [lightMedia, setLightMedia] = useState(() => prefersLightMedia());
  useEffect(() => {
    setLightMedia(prefersLightMedia());
    return subscribeConnectionChange(() => setLightMedia(prefersLightMedia()));
  }, []);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactStatus, setContactStatus] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const onContactSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError(null);
    setContactStatus(null);
    try {
      const data = await apiFetch<{ message: string }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
        }),
      });
      setContactStatus(data.message);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setContactLoading(false);
    }
  }, [contactName, contactEmail, contactMessage]);

  /** Skip hero → #ecosystem (“One platform, several ideas”) — not the GLB block (#section-2) */
  const skipHeroDeck = useCallback(() => {
    const el = document.getElementById('ecosystem');
    if (!el) return;
    ScrollTrigger.refresh();
    gsap.killTweensOf(window);
    gsap.to(window, {
      duration: 0.95,
      scrollTo: {
        y: el,
        autoKill: true,
      },
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: () => ScrollTrigger.refresh(),
    });
  }, []);

  useEffect(() => {
    const id = location.hash.replace(/^#/, '');
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (reduceUiMotion) return;
    let isMounted = true;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const prompt = activeDemo.prompt;

    const runSequence = async () => {
      if (!isMounted) return;
      setDemoPhase(0);
      setInputText("");
      await delay(DEMO_MS.intro);

      for (let i = 0; i <= prompt.length; i++) {
        if (!isMounted) return;
        setInputText(prompt.slice(0, i));
        await delay(DEMO_MS.perChar);
      }
      await delay(DEMO_MS.pauseAfterType);

      if (!isMounted) return;
      setDemoPhase(1);
      setInputText("");
      await delay(DEMO_MS.userBubble);

      if (!isMounted) return;
      setDemoPhase(2);
      await delay(DEMO_MS.generating);

      if (!isMounted) return;
      setDemoPhase(3);
      await delay(DEMO_MS.imageHold);

      if (!isMounted) return;
      setDemoPhase(4);
      await delay(DEMO_MS.convertUi);

      if (!isMounted) return;
      setDemoPhase(5);
      await delay(DEMO_MS.meshLoading);

      if (!isMounted) return;
      setInputText("");
      setDemoPhase(6);
      await delay(DEMO_MS.modelHold);

      if (!isMounted) return;
      setDemoPhase(7);
      await delay(DEMO_MS.qrHold);

      runSequence();
    };
    runSequence();
    return () => {
      isMounted = false;
    };
  }, [reduceUiMotion, demoIndex, activeDemo.prompt]);

  useEffect(() => {
    if (demoPhase < 6) return;
    try {
      localStorage.setItem('visiarise-ar-model', activeDemo.modelUrl);
    } catch {
      /* ignore quota */
    }
  }, [demoPhase, activeDemo.modelUrl]);

  // Scroll Animations
  useEffect(() => {
    let mm: { revert: () => void } | undefined;
    const ctx = gsap.context(() => {
      if (droneRef.current) {
        gsap.to(droneRef.current, {
          scrollTrigger: {
            trigger: "#section-2",
            start: "top bottom",
            end: "top center",
            scrub: 0.35,
            fastScrollEnd: true,
          },
          opacity: 0,
          scale: 0.92,
          force3D: true,
        });
      }

      gsap.fromTo(
        ".reveal-drone-inner",
        { opacity: 0, y: 24 },
        {
          scrollTrigger: {
            trigger: "#section-2",
            start: "top 78%",
            end: "top 48%",
            scrub: 0.45,
            fastScrollEnd: true,
          },
          opacity: 1,
          y: 0,
          ease: "none",
          force3D: true,
        }
      );

      mm = ScrollTrigger.matchMedia({
        "(prefers-reduced-motion: reduce)": () => {
          gsap.utils.toArray(".reveal").forEach((block) => {
            gsap.set(block as gsap.TweenTarget, { opacity: 1, y: 0, filter: "none" });
          });
          gsap.utils.toArray(".step-card").forEach((card) => {
            gsap.set(card as gsap.TweenTarget, { opacity: 1, y: 0 });
          });
          gsap.utils.toArray(".stat-card").forEach((card) => {
            gsap.set(card as gsap.TweenTarget, { y: 0 });
          });
          return () => {};
        },
        "(prefers-reduced-motion: no-preference)": () => {
          gsap.utils.toArray(".reveal").forEach((block) => {
            gsap.fromTo(
              block as gsap.TweenTarget,
              { opacity: 0.25, y: 36 },
              {
                opacity: 1,
                y: 0,
                ease: "none",
                force3D: true,
                scrollTrigger: {
                  trigger: block as gsap.DOMTarget,
                  start: "top 88%",
                  end: "top 52%",
                  scrub: 0.55,
                  fastScrollEnd: true,
                },
              }
            );
          });

          gsap.from(".step-card", {
            scrollTrigger: {
              trigger: "#how-it-works",
              start: "top 70%",
            },
            y: 100,
            opacity: 0,
            stagger: 0.2,
            duration: 1,
            ease: "power4.out",
          });

          gsap.to(".stat-card", {
            scrollTrigger: {
              trigger: ".stat-card",
              start: "top bottom",
              scrub: 0.6,
              fastScrollEnd: true,
            },
            y: -50,
            stagger: 0.1,
            force3D: true,
          });

          return () => {};
        },
      }) as unknown as { revert: () => void };
    }, containerRef);

    return () => {
      mm?.revert();
      ctx.revert();
    };
  }, []);

  const skipIntroButton = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        skipHeroDeck();
      }}
      className="pointer-events-auto fixed right-4 top-[max(6.5rem\\,env(safe-area-inset-top)+5rem)] z-[200] flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_8px_32px_rgb(0_0_0_/_0.45)] backdrop-blur-md transition-colors hover:border-white/28 hover:bg-black/85 sm:right-8 sm:top-[max(7rem\\,env(safe-area-inset-top)+5.25rem)]"
    >
      <SkipForward className="h-3.5 w-3.5 opacity-90" strokeWidth={2} />
      Skip intro
    </button>
  );

  return (
    <Fragment>
    <div ref={containerRef} className="relative bg-brand-bg text-white selection:bg-white/25 font-sans overflow-x-hidden">
      <Navbar />
      
      {/* Global Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Keep subtle — high opacity reads as a gray/purple band over semi-transparent sections */}
        <div className="absolute inset-0 noise-bg opacity-[0.045]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%\\,rgb(255_255_255_/_0.06)_0%\\,transparent_55%)]" />
      </div>

      {/* 1. Hero — single viewport (no horizontal scroll deck) */}
      <section
        id="hero"
        className="relative isolate min-h-0 min-h-[100dvh] touch-pan-y overflow-x-clip overflow-y-visible"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          {lightMedia ? (
            <div className="h-full w-full bg-[#06040c]" aria-hidden />
          ) : (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover scale-105"
            >
              <source src="/197336-904610122_tiny.mp4" type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-black/68" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-black/88 via-zinc-950/58 to-black/94" aria-hidden />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%\\,rgb(255_255_255_/_0.06)_0%\\,transparent_58%)]" aria-hidden />
          <div className="absolute inset-0 bg-[linear-gradient(90deg\\,transparent_0%\\,rgb(255_255_255_/_0.025)_50%\\,transparent_100%)]" aria-hidden />
        </div>

        <div className="relative z-10 w-full max-w-[100vw] overflow-x-hidden">
          <div className="flex w-full flex-col gap-14 sm:gap-20 py-8 sm:py-12">
            <div className="flex w-full shrink-0 justify-center px-4 sm:px-6 md:px-20">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-8 pb-8 pt-20 sm:gap-10 sm:pb-10 sm:pt-24 md:pt-28 md:pb-14 lg:grid-cols-2 lg:gap-12 lg:pb-16 lg:pt-28">
                <motion.div
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none"
                >
                  <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted backdrop-blur-xl">
                    <Leaf className="h-3 w-3 text-emerald-400/90" />
                    <span>{heroCopy.badges[0]}</span>
                  </div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted backdrop-blur-xl">
                    <Sparkles className="h-3 w-3 shrink-0 text-zinc-300/90" />
                    <span>{heroCopy.badges[1]}</span>
                  </div>
                  <h1 className="mb-6 max-w-xl font-display text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl md:text-5xl lg:text-6xl">
                    <span className="block sm:inline">{heroCopy.heroLead} </span>
                    <HeroDeckAccentLine
                      panelIdx={0}
                      activePanel={0}
                      phrases={heroCopy.heroAccentPhrases}
                    />
                  </h1>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.38em] text-white/40">{heroCopy.kicker}</p>
                  <p className="mb-6 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">{heroCopy.subtitle}</p>
                  <p className="mb-8 max-w-xl border-l border-emerald-500/25 pl-4 text-sm leading-relaxed text-white/50">
                    {heroCopy.quote}
                  </p>
                  <ul className="mb-10 max-w-xl space-y-3">
                    {heroCopy.bullets.map((b) => (
                      <li key={b} className="flex gap-3 text-sm text-white/72">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link to="/login" className="btn-neon-purple group w-full px-8 py-3.5 text-sm sm:w-auto">
                      Start Creating
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to={heroCopy.secondaryCta.to}
                      className="w-full rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-center text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 sm:w-auto"
                    >
                      {heroCopy.secondaryCta.label}
                    </Link>
                    <Link
                      to="/login"
                      className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45 transition-colors hover:text-white/85"
                    >
                      Enter workspace →
                    </Link>
                  </div>
                </motion.div>

                <div className="relative z-10 order-2 flex min-h-[520px] w-full items-stretch justify-center sm:min-h-[600px] lg:order-none lg:min-h-[640px]">
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 max-lg:left-1/2 max-lg:w-[min(100%\\,520px)] max-lg:-translate-x-1/2 scale-110 rounded-full bg-zinc-950/30 opacity-30 blur-[88px]"
                    animate={{ opacity: [0.16, 0.26, 0.16] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {!reduceUiMotion ? (
                        <div className="relative z-10 flex w-full max-w-full flex-col gap-3 lg:max-w-md">
                          <div>
                            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                              Browse demos · same pipeline
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {LANDING_DEMO_SCENES.map((s, i) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setDemoIndex(i)}
                                  className={`group flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-all ${
                                    i === demoIndex
                                      ? "border-white/35 bg-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)]"
                                      : "border-white/[0.1] bg-black/25 hover:border-white/22"
                                  }`}
                                >
                                  <div className="aspect-square overflow-hidden rounded-lg bg-black/50 ring-1 ring-white/[0.06]">
                                    <img
                                      src={s.imageUrl}
                                      alt=""
                                      decoding="async"
                                      fetchPriority="low"
                                      className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100"
                                    />
                                  </div>
                                  <span className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-white/65">
                                    {s.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        <motion.div
                          id="ardya-demo"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                          className="demo-ardya-glass relative isolate z-10 flex w-full max-w-full shrink-0 flex-col overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]"
                        >
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-22 bg-[radial-gradient(ellipse_at_50%_0%\\,rgb(255_255_255_/_0.05)_0%\\,transparent_55%)]"
                          />
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-16 bg-[radial-gradient(ellipse_at_100%_100%\\,rgb(255_255_255_/_0.03)_0%\\,transparent_45%)]"
                          />
                          <div className="demo-ardya-glass__header relative z-10 flex min-h-[5.25rem] shrink-0 flex-col gap-3 border-b border-white/[0.09] p-4 sm:min-h-[4.75rem] sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-5">
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <ArdyaWordmark />
                              <div className="text-[9px] font-medium tracking-wide text-white/45">Text & image → AR</div>
                              <div className="flex items-center gap-2 text-[10px] font-medium text-white/55">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/55 shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)]"
                                  aria-hidden
                                />
                                Online
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Active demo">
                              {LANDING_DEMO_SCENES.map((s, i) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  role="tab"
                                  aria-selected={i === demoIndex}
                                  onClick={() => setDemoIndex(i)}
                                  className={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors ${
                                    i === demoIndex
                                      ? "border border-white/28 bg-white/[0.12] text-white"
                                      : "border border-white/[0.08] bg-black/20 text-white/45 hover:border-white/18 hover:text-white/75"
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="demo-ardya-glass__stage relative z-10 flex h-[320px] w-full shrink-0 flex-col overflow-hidden sm:h-[360px] lg:h-[384px]">
                            {demoPhase === 0 && (
                              <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6">
                                <p className="max-w-[280px] text-center text-[11px] leading-relaxed text-brand-muted">
                                  Type a prompt in Ardya. We generate a concept from your brief, then you convert to a real GLB and open in AR — using local assets in this demo.
                                </p>
                              </div>
                            )}

                            {(demoPhase === 1 || demoPhase === 2) && (
                              <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto p-4">
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.5 }}
                                  className="flex justify-end"
                                >
                                  <div className="max-w-[92%] rounded-2xl rounded-tr-none border border-white/15 bg-white/10 px-3.5 py-2.5 text-[12px] leading-snug text-white/95">
                                    {activeDemo.prompt}
                                  </div>
                                </motion.div>
                                {demoPhase >= 2 && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.6 }}
                                    className="flex justify-start"
                                  >
                                    <div className="max-w-[90%] rounded-2xl rounded-tl-none border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[11px] text-brand-muted">
                                      Generating concept image
                                      <span className="inline-block w-6 animate-pulse text-left">…</span>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            )}

                            {demoPhase === 3 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1.35, ease: "easeOut" }}
                                className="flex min-h-0 flex-1 flex-col items-center justify-center p-3"
                              >
                                <div className="flex h-[60%] w-full min-h-0 items-center justify-center">
                                  <img
                                    src={activeDemo.imageUrl}
                                    alt="Generated concept"
                                    decoding="async"
                                    className="max-h-full max-w-full rounded-xl border border-white/10 object-contain"
                                  />
                                </div>
                              </motion.div>
                            )}

                            {(demoPhase === 4 || demoPhase === 5) && (
                              <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-3">
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="relative h-[60%] w-full min-h-0 overflow-hidden rounded-xl border border-white/10"
                                >
                                  <img
                                    src={activeDemo.imageUrl}
                                    alt=""
                                    decoding="async"
                                    className="absolute inset-0 h-full w-full object-contain opacity-90"
                                  />
                                  {demoPhase === 4 && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.2, duration: 0.5 }}
                                      className="absolute bottom-0 left-0 right-0 z-[1] bg-gradient-to-t from-black/85 to-transparent p-3"
                                    >
                                      <motion.button
                                        type="button"
                                        aria-hidden
                                        animate={{ scale: [1, 0.98, 1] }}
                                        transition={{ duration: 0.45, times: [0, 0.5, 1] }}
                                        className="w-full rounded-xl border border-white/20 bg-gradient-to-b from-zinc-100 to-zinc-400 py-2.5 text-xs font-bold text-zinc-950 shadow-lg"
                                      >
                                        Convert to 3D
                                      </motion.button>
                                    </motion.div>
                                  )}
                                  {demoPhase === 5 && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-[2px]"
                                    >
                                      <Loader2 className="h-10 w-10 animate-spin text-brand-primary" strokeWidth={1.5} />
                                      <p className="text-[11px] text-white/75">Building 3D mesh…</p>
                                    </motion.div>
                                  )}
                                </motion.div>
                              </div>
                            )}

                            {(demoPhase === 6 || demoPhase === 7) && (
                              <div className="relative h-full w-full min-h-0">
                                <div ref={droneRef} className="absolute inset-0 z-0 h-full w-full min-h-[200px]">
                                  <DroneScene
                                    key={activeDemo.id}
                                    frame="hero"
                                    modelScale={(activeDemo.modelScale ?? 1) * 1.08}
                                    modelUrl={activeDemo.modelUrl}
                                    interactive
                                    className="h-full w-full min-h-[200px]"
                                  />
                                </div>
                                {demoPhase === 7 && (
                                  <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-3">
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.94 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.45 }}
                                      className="self-end rounded-md border border-black/10 bg-white p-1.5 shadow-md"
                                      title="Scan in AR"
                                    >
                                      <QrCode className="h-8 w-8 text-black" />
                                    </motion.div>
                                    <a
                                      href={buildTryArUrl(activeDemo.modelUrl, `Landing · ${activeDemo.label}`)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-900 shadow-md transition-colors hover:bg-white"
                                    >
                                      <Smartphone className="h-3.5 w-3.5" />
                                      Open AR link
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="demo-ardya-glass__footer relative z-10 flex shrink-0 gap-2 border-t border-white/[0.09] p-3 sm:gap-3 sm:p-4">
                            <div className="flex min-w-0 flex-1 items-center rounded-full border border-white/[0.11] bg-black/12 px-3 py-2.5 backdrop-blur-lg sm:px-4">
                              <input
                                readOnly
                                value={inputText}
                                placeholder="Type your vision..."
                                className="w-full border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
                              />
                              {demoPhase === 0 && inputText.length < activeDemo.prompt.length && (
                                <span className="ml-0.5 inline-block h-3.5 w-0.5 shrink-0 animate-pulse bg-brand-primary" />
                              )}
                            </div>
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-[0_2px_12px_rgb(0_0_0_/_0.35)] transition-colors ${
                                demoPhase === 0 && inputText.length === activeDemo.prompt.length
                                  ? "bg-gradient-to-b from-zinc-100 to-zinc-400"
                                  : "bg-gradient-to-b from-zinc-200 to-zinc-500"
                              }`}
                            >
                              <Send className="h-4 w-4 text-zinc-900" />
                            </div>
                          </div>
                        </motion.div>
                        </div>
                      ) : (
                        <HeroStaticDemoCard scene={LANDING_DEMO_SCENES[0]!} live={false} />
                      )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint — centered bottom */}
        <div className="pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center [bottom:max(0.75rem\\,env(safe-area-inset-bottom))] sm:bottom-6">
          <motion.div
            animate={reduceUiMotion ? undefined : { y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            {!reduceUiMotion && (
              <div className="mb-1 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.35em] text-white/50">
                <span>Scroll</span>
                <span className="text-white/30">↓</span>
              </div>
            )}
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/50 to-transparent sm:w-16" />
            <span className="max-w-[14rem] text-center text-[8px] font-bold uppercase tracking-[0.4em] text-white/35">
              {reduceUiMotion ? 'Scroll' : 'More below'}
            </span>
          </motion.div>
        </div>
      </section>

      {/* Ecosystem: five pillars */}
      <section
        id="ecosystem"
        className="relative z-10 scroll-mt-[5.5rem] border-t border-white/[0.06] bg-brand-bg py-14 sm:py-20 md:py-24 px-4 sm:px-6 md:px-20"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16 reveal">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold text-white mb-4">
              One platform, several ideas
            </h2>
            <p className="text-brand-muted max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              VisiARise combines products you can mix and match — from quick AR with Ardya to community learning.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { name: 'Ardya', desc: 'Text or image → AR, fast.', href: '/#ardya-demo', icon: Smartphone },
              { name: 'Marketplace', desc: 'Buy & sell real 3D assets.', href: '/marketplace', icon: ShoppingBag },
              { name: 'Freelancers', desc: 'Hire designers & AR devs.', href: '/freelancers', icon: Users },
              { name: 'Learn', desc: '3D, AR & VR for students.', href: '/learn', icon: GraduationCap },
              { name: 'Sustainability', desc: 'Digital-first, less waste.', href: '/sustainability', icon: Recycle },
            ].map((p) => (
              <Link
                key={p.name}
                to={p.href}
                className="reveal group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-display font-bold text-lg text-white group-hover:text-brand-primary transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-white/45 leading-relaxed">{p.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Free try-on & retail discovery */}
      <section
        id="free-tryon"
        className="relative z-10 border-t border-white/[0.06] bg-zinc-950/90 py-14 sm:py-20 md:py-24 px-4 sm:px-6 md:px-20"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 reveal">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Free AR exposure for your product
            </h2>
            <p className="text-brand-muted max-w-2xl mx-auto leading-relaxed">
              When you publish with VisiARise, you can opt in to <span className="text-white/80">free visibility</span>{' '}
              in our discovery feed — shoppers try your 3D in AR before they buy. You control whether the experience
              is free to try; purchases can route to your existing retail partners.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-12">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4">You choose</h3>
              <ul className="space-y-3 text-sm text-white/65 leading-relaxed">
                <li>• Publish as <strong className="text-white/90">try for free</strong> or gated</li>
                <li>• List whether the AR preview is promotional or full product-accurate</li>
                <li>• Link out to where people actually buy — no lock-in</li>
              </ul>
            </div>
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center gap-5 sm:gap-6">
              <p className="text-xs text-white/45 text-center uppercase tracking-widest">Buy where you already sell</p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-10 opacity-90">
                <a
                  href="https://www.amazon.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0f1111] border border-white/10 hover:border-white/25 transition-colors"
                  aria-label="Amazon"
                >
                  <span className="text-xs font-bold tracking-[0.2em] text-white">amazon</span>
                  <span className="text-[10px] text-amber-600 font-bold">.in</span>
                </a>
                <a
                  href="https://www.flipkart.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2874f0] text-white font-bold text-sm hover:opacity-95 transition-opacity"
                  aria-label="Flipkart"
                >
                  Flipkart
                </a>
              </div>
              <p className="text-[10px] text-white/35 text-center max-w-xs">
                Logos are shown as partner-style links; wire your real affiliate or storefront URLs in the product
                dashboard when available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Real GLB showcase — full column, no shrink wrapper */}

<section
  id="section-2"
  className="relative z-10 min-h-0 scroll-mt-[5.5rem] sm:scroll-mt-28 lg:min-h-screen border-t border-white/[0.06] bg-black px-4 sm:px-6 md:px-12 lg:px-16 xl:px-24 py-14 sm:py-20 md:py-24"
>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 xl:gap-20 items-stretch w-full max-w-[1600px] mx-auto relative z-10">

    {/* 3D viewer — mounted with page; model loads inside Canvas (Suspense fallback is null) */}
    <div className="relative w-full h-[52vh] min-h-[280px] sm:h-[60vh] sm:min-h-[320px] lg:h-auto lg:min-h-[720px] reveal-drone order-2 lg:order-none">

      <div className="absolute inset-0 w-full h-full reveal-drone-inner bg-zinc-950/80">
        <DroneScene
          frame="section"
          modelUrl="models/ironman_basic_pbr.glb"
          modelScale={0.5}
          interactive
          className="absolute inset-0 w-full h-full"
        />
      </div>

    </div>

    <div className="reveal flex flex-col justify-center order-1 lg:order-none">
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/35 mb-4">
        Real asset · /public
      </p>

      <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-6 sm:mb-8 leading-tight text-white">
        From file <br />
        <span className="text-brand-primary">to AR</span>
      </h2>

      <p className="text-brand-muted text-base sm:text-lg mb-8 sm:mb-10 leading-relaxed">
        This viewer loads a real GLB from your project — same pipeline as Ardya and the marketplace.
        No placeholder renders: what you see is the mesh you ship to WebAR.
      </p>

      <div className="space-y-6">
        {[
          'PBR materials & environment lighting',
          'Rig-friendly workflow for animated assets',
          'WebAR-ready exports you can preview on device',
          'Pair with sustainability: fewer physical iterations',
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-4 text-white/80">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgb(255_255_255_/_0.35)]" />
            <span className="text-sm font-medium tracking-wide">{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
        <Link
          to="/marketplace"
          className="btn-neon-purple inline-flex items-center gap-2 text-sm px-6 py-3"
        >
          VisiARise Marketplace <ChevronRight className="w-4 h-4" />
        </Link>

        <Link
          to="/#ardya-demo"
          className="inline-flex items-center gap-2 text-sm px-6 py-3 rounded-full border border-white/15 text-white/80 hover:bg-white/5 transition-colors"
        >
          Try Ardya
        </Link>
      </div>
    </div>

  </div>
</section>

      {/* 3. How It Works: The Workflow */}
      <section id="how-it-works" className="section-surface-dark relative z-10 py-16 sm:py-24 md:py-32 px-4 sm:px-6 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-20 md:mb-24 reveal">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-5 sm:mb-6 tracking-tight text-white">From idea to <span className="text-brand-primary">AR</span></h2>
            <p className="text-brand-muted text-base sm:text-lg max-w-2xl mx-auto px-1">
              Ardya for prompts & concepts, VisiARise for publishing — fewer physical rounds in between.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {[
              { 
                step: "01", 
                title: "Prompt", 
                desc: "Describe what you need in Ardya — text or reference-driven. Get a concrete visual before you commit to fabrication.",
                icon: MessageSquare
              },
              { 
                step: "02", 
                title: "Generate", 
                desc: "Move from concept art to a real GLB you can inspect, optimize, and reuse — digital-first, fewer throwaway samples.",
                icon: Cpu
              },
              { 
                step: "03", 
                title: "Publish AR", 
                desc: "Push to WebAR: share a link or QR. Stakeholders see it in their space — no app install required.",
                icon: Smartphone
              }
            ].map((item, i) => (
              <div key={i} className="reveal group step-card">
                <div className="relative mb-6 sm:mb-8">
                  <div className="text-6xl sm:text-7xl md:text-8xl font-display font-black text-white/5 absolute -top-6 sm:-top-10 -left-2 sm:-left-4 group-hover:text-brand-primary/10 transition-colors pointer-events-none">{item.step}</div>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10 group-hover:border-brand-primary/50 transition-all">
                    <item.icon className="w-8 h-8 text-brand-primary" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{item.title}</h3>
                <p className="text-brand-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Sustainability — honest positioning */}
      <section
        id="sustainability"
        className="relative z-10 border-t border-white/[0.06] py-16 sm:py-24 md:py-32 px-4 sm:px-6 md:px-20 overflow-hidden"
        style={{
          background:
            'linear-gradient(to bottom, #050210, rgba(6, 78, 59, 0.1), var(--color-brand-bg, #0a0a0b))',
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw\\,800px)] h-[min(100vw\\,800px)] max-w-[800px] max-h-[800px] bg-green-500/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12 sm:mb-16 reveal">
            <Leaf className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400/90 mx-auto mb-6 sm:mb-8" />
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-5 sm:mb-6 tracking-tight text-white px-1">
              Sustainable creation through <span className="text-emerald-400/95">AI & AR</span>
            </h2>
            <p className="text-brand-muted text-base sm:text-lg max-w-3xl mx-auto leading-relaxed px-1">
              Digital creation → 3D → AR is naturally lighter than shipping samples everywhere. We don’t promise
              “100% eco-friendly” — we help you{' '}
              <span className="text-white/85">replace physical prototypes with digital previews</span>, which can
              reduce plastic, packaging, logistics, and scrap over time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 mb-12 sm:mb-16 reveal">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 text-left">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">
                Where it fits your product
              </h3>
              <ul className="space-y-3 text-sm text-brand-muted leading-relaxed">
                <li>• Fewer printed samples and one-off physical mocks</li>
                <li>• Less rush shipping between teams and factories</li>
                <li>• AR packaging or product previews instead of disposable POS</li>
                <li>• Reusable 3D assets across campaigns (QR → AR)</li>
              </ul>
            </div>
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 text-left">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">
                On the roadmap (real impact)
              </h3>
              <ul className="space-y-3 text-sm text-brand-muted leading-relaxed">
                <li>• Carbon-saving estimates after AR publish (illustrative, not audited)</li>
                <li>• “Eco mode” mesh generation — lighter files, less GPU load</li>
                <li>• Sustainability score per project from size, reuse & AR vs physical</li>
                <li>• Education track for students → digital skills (see Learn)</li>
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-white/40 max-w-2xl mx-auto reveal stat-card">
            Core angle: <span className="text-white/70">Replace physical with digital using AR</span> — design the
            future with less waste, not greenwashing.
          </p>
        </div>
      </section>

      {/* 5. Previews: Studio, Marketplace, Dashboard */}
      <section className="section-surface-dark relative z-10 py-16 sm:py-24 md:py-32 px-4 sm:px-6 md:px-20">
        <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24 md:space-y-32">
          
          {/* Studio Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20 items-center reveal group/studio">
            <div className="order-2 lg:order-1 relative overflow-hidden rounded-3xl">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-brand-primary/10 blur-3xl rounded-full" />
                <picture>
                  <source srcSet="/AR_studio.jpg" type="image/heic" />
                  <img
                    src="/AR_studio.jpg"
                    alt="AR Studio"
                    loading="lazy"
                    decoding="async"
                    className="relative rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl w-full object-cover aspect-[5/4] sm:aspect-video"
                    onError={(e) => {
                      e.currentTarget.src = '/drone-genertated.png';
                    }}
                  />
                </picture>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-full bg-gradient-to-b from-zinc-200 to-zinc-500 flex items-center justify-center shadow-[0_0_28px_rgb(255_255_255_/_0.2)]"
                  >
                    <MousePointer2 className="w-8 h-8 text-zinc-900" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[8px] font-bold uppercase tracking-widest mb-6">
                AR Studio
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-5 sm:mb-6 tracking-tight">AR Studio editor</h3>
              <p className="text-brand-muted text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Inspect transforms, materials, and lighting before you publish to WebAR — built for real GLBs, not a
                film timeline.
              </p>
              <Link to="/login" className="btn-neon-purple inline-flex items-center gap-3">
                Open Studio <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Marketplace Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20 items-center reveal">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[8px] font-bold uppercase tracking-widest mb-6">
                VisiARise Marketplace
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-5 sm:mb-6 tracking-tight">Real GLBs, real previews</h3>
              <p className="text-brand-muted text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Every listing uses meshes and posters from our public library — spin the model before you buy. Need
                something custom?{' '}
                <Link to="/freelancers" className="text-brand-primary hover:underline">
                  Hire a freelancer
                </Link>
                .
              </p>
              <Link to="/marketplace" className="btn-neon-purple inline-flex items-center gap-3">
                Visit Marketplace <ShoppingBag className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { src: '/Human_Avatar_Kishan_Nishad_img.png', price: '$89' },
                  { src: '/Shoes.png', price: '$34' },
                  { src: '/Lamborgini_image.png', price: '$129' },
                  { src: '/ironMan .png', price: '$79' },
                  { src: '/drone-generated.png', price: '$45' },
                ].map((item) => (
                  <motion.div 
                    key={item.src} 
                    whileHover={{ y: -10 }}
                    className="aspect-square rounded-2xl overflow-hidden border border-white/10 relative group"
                  >
                    <img 
                      src={item.src}
                      alt="" 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[8px] font-bold uppercase tracking-widest border border-white/10">
                      {item.price}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20 items-center reveal">
            <div className="order-2 lg:order-1 relative">
              <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-brand-muted">Analytics Overview</div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-primary" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="space-y-6">
                  {[
                    { label: "Total AR Views", value: "12,482", trend: "+12%" },
                    { label: "Active Projects", value: "48", trend: "+5%" },
                    { label: "Revenue Generated", value: "$3,240", trend: "+24%" }
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <div className="text-[8px] uppercase tracking-widest text-brand-muted mb-1">{stat.label}</div>
                        <div className="text-xl font-bold">{stat.value}</div>
                      </div>
                      <div className="text-[10px] text-green-500 font-bold">{stat.trend}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-5 sm:mb-6 tracking-tight">Manage Your Empire</h3>
              <p className="text-brand-muted text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Track your model performance, manage your marketplace sales, and monitor your AR engagement with our minimal, futuristic dashboard.
              </p>
              <Link to="/login" className="btn-neon-purple inline-flex items-center gap-3">
                Go to Dashboard <Layout className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 6. CTA: The Final Hook */}
      <section id="contact" className="relative z-10 border-t border-white/[0.06] bg-gradient-to-b from-zinc-950/80 via-brand-bg to-[#030010] py-20 sm:py-32 md:py-48 px-4 sm:px-6 md:px-20 text-center reveal">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw\\,720px)] h-[min(100vw\\,720px)] bg-teal-500/[0.07] blur-[140px] rounded-full opacity-70" />
          <div className="absolute top-1/3 right-1/4 w-[min(80vw\\,480px)] h-[min(80vw\\,480px)] bg-white/[0.04] blur-[100px] rounded-full opacity-60" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-[clamp(2.25rem\\,10vw\\,8rem)] md:text-9xl font-display font-bold tracking-tighter mb-8 sm:mb-12 leading-[1.02] text-white px-1">
            The Future is <br />{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 via-teal-100/95 to-zinc-400 drop-shadow-[0_0_24px_rgb(45_212_191_/_0.15)]">
              Augmented
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-brand-muted mb-10 sm:mb-16 max-w-xl mx-auto font-light leading-relaxed px-2">
            Join the elite circle of creators building the next generation of digital experiences.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 sm:gap-6 max-w-md sm:max-w-none mx-auto">
            <Link to="/login" className="w-full sm:w-auto btn-neon-purple px-8 sm:px-16 py-4 sm:py-6 text-base sm:text-lg justify-center">
              Get Started for Free
            </Link>
            <a
              href="mailto:team@visiarise.com"
              className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white text-sm sm:text-base font-bold hover:bg-white/10 transition-all text-center"
            >
              Talk to Sales
            </a>
          </div>

          <form
            onSubmit={onContactSubmit}
            className="mt-14 sm:mt-20 max-w-xl mx-auto text-left rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 space-y-4"
          >
            <h3 className="text-center text-lg sm:text-xl font-display font-semibold text-white mb-1">Send a message</h3>
            <p className="text-center text-sm text-brand-muted mb-4">
              We&apos;ll reply from <span className="text-white/80">team@visiarise.com</span>
            </p>
            <div>
              <label htmlFor="contact-name" className="block text-[10px] uppercase tracking-widest text-brand-muted mb-2">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                autoComplete="name"
                value={contactName}
                onChange={(ev) => setContactName(ev.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-[10px] uppercase tracking-widest text-brand-muted mb-2">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                autoComplete="email"
                value={contactEmail}
                onChange={(ev) => setContactEmail(ev.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-[10px] uppercase tracking-widest text-brand-muted mb-2">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={contactMessage}
                onChange={(ev) => setContactMessage(ev.target.value)}
                className="w-full resize-y min-h-[120px] rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                placeholder="How can we help?"
              />
            </div>
            {contactError ? (
              <p className="text-sm text-red-400/90 text-center" role="alert">
                {contactError}
              </p>
            ) : null}
            {contactStatus ? (
              <p className="text-sm text-teal-400/90 text-center" role="status">
                {contactStatus}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={contactLoading}
              className="w-full btn-neon-purple py-4 justify-center inline-flex items-center gap-2 disabled:opacity-60"
            >
              {contactLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden />
                  Send message
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-14 sm:py-20 md:py-24 px-4 sm:px-6 md:px-20 z-10 border-t border-white/10 bg-brand-bg backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-10 sm:gap-12 mb-14 sm:mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <img src="/Pixora_LOGO.png" alt="Pixora Logo" className="h-16 sm:h-24 md:h-32 w-auto" referrerPolicy="no-referrer" />
              </div>
              <p className="text-brand-muted max-w-xs leading-relaxed text-sm">
                Empowering creators to bridge the gap between imagination and reality through spatial computing.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-[10px] uppercase tracking-[0.2em] text-white">Platform</h4>
              <ul className="space-y-4 text-brand-muted text-xs">
                <li><Link to="/login" className="hover:text-brand-primary transition-colors">AR Studio</Link></li>
                <li><Link to="/marketplace" className="hover:text-brand-primary transition-colors">Marketplace</Link></li>
                <li><Link to="/try-ar" className="hover:text-brand-primary transition-colors">Try AR</Link></li>
                <li><Link to="/learn" className="hover:text-brand-primary transition-colors">Learn</Link></li>
                <li><Link to="/freelancers" className="hover:text-brand-primary transition-colors">Freelancers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-[10px] uppercase tracking-[0.2em] text-white">Company</h4>
              <ul className="space-y-4 text-brand-muted text-xs">
                <li><a href="#" className="hover:text-brand-primary transition-colors">About</a></li>
                <li><a href="/#sustainability" className="hover:text-brand-primary transition-colors">Sustainability</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-[10px] uppercase tracking-[0.2em] text-white">Support</h4>
              <ul className="space-y-4 text-brand-muted text-xs">
                <li><a href="#" className="hover:text-brand-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Docs</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-[10px] uppercase tracking-[0.2em] text-white">Social</h4>
              <ul className="space-y-4 text-brand-muted text-xs">
                <li><a href="#" className="hover:text-brand-primary transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-brand-muted text-[10px] font-bold tracking-[0.2em] uppercase">
            <span>© 2026 VisiARise Inc. All rights reserved.</span>
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    {typeof document !== 'undefined' ? createPortal(skipIntroButton, document.body) : null}
    </Fragment>
  );
}
