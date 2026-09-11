import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Sparkles, Building2, Rocket, Crown, Zap, Globe, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';

const TIERS = [
  {
    name: 'Starter',
    price: '$0',
    period: 'free trial',
    blurb: 'Explore prompts and AR preview with signup credits.',
    icon: Zap,
    highlight: false,
    features: ['Account + referral bonus', 'WebAR try-on (HTTPS)', 'Community marketplace browse'],
  },
  {
    name: 'Pay as you go',
    price: '$9',
    period: '/ one-time pack',
    blurb: 'Top-up credits for occasional Meshy / AI 3D runs.',
    icon: Sparkles,
    highlight: false,
    features: ['Credit pack (indicative)', 'Email support', 'Same studio + AR pipeline'],
  },
  {
    name: 'Creator',
    price: '$29',
    period: '/ mo',
    blurb: 'Regular creators listing assets and publishing AR.',
    icon: Rocket,
    highlight: true,
    features: ['Higher monthly credits', 'Priority generation queue', 'Marketplace listing tools'],
  },
  {
    name: 'Pro Studio',
    price: '$79',
    period: '/ mo',
    blurb: 'Teams shipping campaigns and client previews.',
    icon: Crown,
    highlight: false,
    features: ['Team seats (add-on)', 'Shared projects', 'Usage reporting'],
  },
  {
    name: 'Business',
    price: '$199',
    period: '/ mo',
    blurb: 'Brands needing SLAs and onboarding.',
    icon: Building2,
    highlight: false,
    features: ['Dedicated success check-ins', 'Custom env / SSO (roadmap)', 'Invoice billing'],
  },
  {
    name: 'Agency',
    price: '$499',
    period: '/ mo',
    blurb: 'Studios managing multiple brand workspaces.',
    icon: Globe,
    highlight: false,
    features: ['Multi-project governance', 'White-label options (roadmap)', 'Partner margin'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    blurb: 'Global rollouts, security review, private deployment.',
    icon: Shield,
    highlight: false,
    features: ['VPC / private API (roadmap)', 'Legal & DPA', 'Custom Meshy / infra'],
  },
  {
    name: 'Education · NPO',
    price: 'Ask us',
    period: '',
    blurb: 'Discounted programs for schools and nonprofits.',
    icon: Sparkles,
    highlight: false,
    features: ['Verified org pricing', 'Classroom-safe workflows', 'Grant-friendly billing'],
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <Navbar />
      <section className="pt-32 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-brand-primary mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight mb-4">
            Credits & plans
          </h1>
          <p className="text-white/50 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            VisiARise combines AI 3D generation with WebAR. Pay for what you use, or scale with a plan. Final checkout and
            invoicing are rolling out — use <strong className="text-white/80">in-app credits</strong> and admin top-ups
            today; this page sets expectations for teams and procurement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {TIERS.map((t) => (
            <motion.div
              key={t.name}
              layout
              className={`rounded-2xl border p-6 flex flex-col ${
                t.highlight
                  ? 'border-brand-primary/50 bg-brand-primary/5 shadow-[0_0_40px_rgba(167,139,250,0.12)]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-xl ${t.highlight ? 'bg-brand-primary/20 text-brand-primary' : 'bg-white/5 text-white/60'}`}
                >
                  <t.icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold">{t.name}</h2>
              </div>
              <div className="mb-2">
                <span className="text-3xl font-bold text-white">{t.price}</span>
                {t.period ? <span className="text-sm text-white/40 ml-1">{t.period}</span> : null}
              </div>
              <p className="text-xs text-white/45 mb-4 min-h-[2.5rem]">{t.blurb}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-[11px] text-white/65">
                    <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`block text-center py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${
                  t.highlight
                    ? 'bg-brand-primary text-black hover:bg-brand-primary/90'
                    : 'bg-white/10 border border-white/10 hover:bg-white/15'
                }`}
              >
                Get started
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[11px] text-white/35 mt-12 max-w-3xl mx-auto leading-relaxed">
          Need a custom quote or vendor onboarding? Email{' '}
          <a href="mailto:hello@visiarise.com" className="text-brand-primary hover:underline">
            hello@visiarise.com
          </a>
          . Credits for Meshy generation are consumed per job; see your dashboard for the live balance.
        </p>
      </section>
    </div>
  );
}
