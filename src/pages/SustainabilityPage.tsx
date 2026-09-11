import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Leaf, Heart, Sprout, Globe2, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function SustainabilityPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <Navbar />
      <section className="pt-32 pb-20 px-6 border-b border-white/10">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            <Leaf className="w-3.5 h-3.5" />
            VisiARise · Impact
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8">
            Sustainability & giving
          </h1>
          <p className="text-lg text-white/50 leading-relaxed">
            We believe digital creation and AR can reduce physical waste — samples, shipping, and scrap — when
            teams preview in AR first. This page is where we&apos;ll publish commitments: donations, partner
            programs, and education grants as we grow. Nothing here is greenwashing — we&apos;ll be explicit about
            what we&apos;ve verified vs what&apos;s planned.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 max-w-3xl mx-auto space-y-16">
        {[
          {
            icon: Sprout,
            title: 'Planned: creator grants',
            body: 'Support students and indie creators learning 3D & AR — stipends for tools, courses, and hardware where it helps.',
          },
          {
            icon: Heart,
            title: 'Planned: nonprofit partnerships',
            body: 'Work with orgs that reuse hardware, teach digital skills, or run climate literacy in schools — we want to align spend with outcomes we can name.',
          },
          {
            icon: Globe2,
            title: 'Already true: digital-first',
            body: 'ARdya and VisiARise are built to replace physical prototypes with interactive previews — fewer one-off prints and express shipments.',
          },
        ].map((b) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex gap-6 p-8 rounded-3xl bg-white/[0.03] border border-white/10"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <b.icon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold mb-3">{b.title}</h2>
              <p className="text-white/50 text-sm leading-relaxed">{b.body}</p>
            </div>
          </motion.div>
        ))}

        <p className="text-sm text-white/35 text-center pt-8 border-t border-white/10">
          Questions? Email <span className="text-white/60">team@visiarise.com</span> — we&apos;ll post updates
          here as programs go live.
        </p>
      </section>
    </div>
  );
}
