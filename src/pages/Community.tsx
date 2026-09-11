import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Box, Glasses, GraduationCap, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

const TRACKS = [
  {
    title: '3D foundations',
    desc: 'Meshes, UVs, PBR materials, and export for real-time engines.',
    icon: Box,
  },
  {
    title: 'AR on the web',
    desc: 'WebXR, model-viewer, lighting, and performance on phones.',
    icon: Glasses,
  },
  {
    title: 'VR & spatial UX',
    desc: 'Comfort, scale, and interaction patterns for immersive scenes.',
    icon: GraduationCap,
  },
];

export default function Community() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <Navbar />
      <section className="pt-36 pb-20 px-6 border-b border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            <BookOpen className="w-3.5 h-3.5" />
            VisiARise Learn
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
            Educational community
          </h1>
          <p className="text-lg text-white/50 leading-relaxed max-w-2xl mx-auto">
            A dedicated space for students and creators to learn 3D, AR, VR, and sustainable
            digital-first workflows — no physical waste, just skills you can use anywhere.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-display font-bold mb-12 text-center">Learning tracks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TRACKS.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                <t.icon className="w-6 h-6 text-brand-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 max-w-3xl mx-auto text-center border-t border-white/10">
        <p className="text-white/40 text-sm mb-6">
          Structured courses and cohorts are in progress. We’re prioritizing honest, practical
          curriculum over hype.
        </p>
        <Link
          to="/signup"
          className="btn-neon-purple inline-flex items-center gap-2 px-8 py-4 text-sm font-bold"
        >
          Get notified
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-[10px] text-white/25 uppercase tracking-widest mt-8">
          <Link to="/" className="hover:text-white/50">
            ← Back home
          </Link>
        </p>
      </section>
    </div>
  );
}
