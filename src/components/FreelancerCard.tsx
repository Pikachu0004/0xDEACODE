import { motion } from 'motion/react';
import { Star, Award, ArrowRight } from 'lucide-react';
import type { Freelancer } from '../store/useAppStore';

export default function FreelancerCard({ freelancer }: { freelancer: Freelancer }) {
  return (
    <motion.div
      whileHover={{ y: -12 }}
      className="p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:border-brand-primary/30 transition-all group backdrop-blur-xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="flex items-center gap-8 mb-10">
        <div className="relative">
          <img
            src={freelancer.avatar}
            alt=""
            className="w-24 h-24 rounded-[2rem] object-cover border-2 border-white/5 group-hover:border-brand-primary/50 transition-all duration-500"
          />
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-primary rounded-2xl flex items-center justify-center border-4 border-black shadow-lg">
            <Award className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2 group-hover:text-brand-primary transition-colors font-display tracking-tight">
            {freelancer.name}
          </h3>
          <div className="flex items-center gap-2.5 text-brand-primary">
            <Star className="w-4.5 h-4.5 fill-current" />
            <span className="text-base font-bold">{freelancer.rating}</span>
            <span className="text-white/20 text-xs font-bold uppercase tracking-widest ml-1">
              (48 reviews)
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        <div className="flex flex-wrap gap-2.5">
          {freelancer.skills.map((skill, i) => (
            <span
              key={i}
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white group-hover:border-white/20 transition-all"
            >
              {skill}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6 py-8 border-y border-white/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Hourly Rate</p>
            <p className="text-2xl font-bold text-brand-primary">${freelancer.hourlyRate}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Availability</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-lg font-bold text-white/80">Available Now</p>
            </div>
          </div>
        </div>
        <button type="button" className="btn-neon-purple w-full flex items-center justify-center gap-3 group">
          Hire Designer
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
