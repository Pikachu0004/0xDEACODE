import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Briefcase, MapPin, Clock, Loader2, Mail, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FreelancerCard from '../components/FreelancerCard';
import { useAppStore } from '../store/useAppStore';
import { apiFetch, type FreelancerJobsResponse } from '../lib/api';

function formatPosted(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString();
}

export default function FreelancersHub() {
  const { freelancers, user } = useAppStore();
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState<FreelancerJobsResponse['jobs']>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [applyFor, setApplyFor] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setJobsLoading(true);
      setJobsError(null);
      try {
        const res = await apiFetch<FreelancerJobsResponse>('/api/freelancers/jobs');
        if (!cancelled) setJobs(res.jobs || []);
      } catch (e) {
        if (!cancelled) setJobsError((e as Error).message || 'Could not load jobs');
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return freelancers.filter(
      (f) =>
        f.name.toLowerCase().includes(s) ||
        f.skills.some((k) => k.toLowerCase().includes(s))
    );
  }, [freelancers, q]);

  const submitApply = async () => {
    if (!applyFor || !user?.token) {
      setApplyStatus('Sign in to apply.');
      return;
    }
    setApplyLoading(true);
    setApplyStatus(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/freelancers/apply', {
        method: 'POST',
        token: user.token,
        body: JSON.stringify({ jobId: applyFor, message: applyMsg.trim() }),
      });
      setApplyStatus(res.message);
      setApplyFor(null);
      setApplyMsg('');
    } catch (e) {
      setApplyStatus((e as Error).message || 'Apply failed');
    } finally {
      setApplyLoading(false);
    }
  };

  const contactSales = () => {
    window.location.href =
      'mailto:hello@visiarise.com?subject=VisiARise%20freelancer%20%2F%20studio%20booking&body=Hi%20VisiARise%2C%0A%0AI%20would%20like%20to%20book%20a%20call%20for%20AR%20%2F%203D%20work.%0A';
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <Navbar />
      <section className="pt-36 pb-16 px-6 border-b border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/50 mb-6">
            VisiARise · Talent
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
            Freelancers & jobs
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Hire spatial designers for modeling, AR optimization, and WebAR delivery — or apply to open roles. Job
            listings sync from our database; applications are stored for the VisiARise team to follow up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={contactSales}
              className="btn-neon-purple inline-flex items-center gap-2 px-8 py-4 text-sm font-bold w-full sm:w-auto justify-center"
            >
              <Mail className="w-4 h-4" />
              Book a call · payments & scope
            </button>
            <a
              href="https://cal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 bg-white/5 text-sm font-bold hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
            >
              <Calendar className="w-4 h-4" />
              Schedule (Cal.com)
            </a>
          </div>
          <p className="text-[10px] text-white/35 mt-4 uppercase tracking-widest">
            Replace the Cal.com link with your team&apos;s scheduling URL in the codebase when ready.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Briefcase className="w-6 h-6 text-brand-primary" />
          <h2 className="text-2xl md:text-3xl font-display font-bold">Open roles</h2>
          {jobsLoading ? <Loader2 className="w-5 h-5 animate-spin text-white/40" /> : null}
        </div>
        {jobsError ? (
          <p className="text-amber-400/90 text-sm mb-6">{jobsError} — start the API and MongoDB to load live listings.</p>
        ) : null}

        <div className="space-y-4 mb-24">
          {!jobsLoading && jobs.length === 0 && !jobsError ? (
            <p className="text-white/40 text-sm">No open roles yet.</p>
          ) : null}
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              layout
              className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-primary/25 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h3 className="text-lg font-bold mb-1">{job.title}</h3>
                <p className="text-sm text-white/45">{job.company}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-white/40 uppercase tracking-widest">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {job.location}
                  </span>
                  <span>{job.type}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatPosted(job.posted)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <div className="text-brand-primary font-bold text-lg">{job.budget}</div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user?.token) {
                      window.location.href = '/login';
                      return;
                    }
                    setApplyFor(job.id);
                    setApplyStatus(null);
                  }}
                  className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-brand-primary/15 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/25"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {applyFor ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-2">Apply to role</h3>
              <p className="text-xs text-white/45 mb-4">
                We&apos;ll attach your account email. Add a short note about your fit and availability.
              </p>
              <textarea
                value={applyMsg}
                onChange={(e) => setApplyMsg(e.target.value)}
                rows={4}
                placeholder="Your pitch…"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm mb-4"
              />
              {applyStatus ? (
                <p className="text-xs text-emerald-400/90 mb-3 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {applyStatus}
                </p>
              ) : null}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm text-white/60"
                  onClick={() => setApplyFor(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={applyLoading}
                  onClick={() => void submitApply()}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold disabled:opacity-50"
                >
                  {applyLoading ? 'Sending…' : 'Submit application'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold">Featured freelancers</h2>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-primary/40"
            />
          </div>
          <button
            type="button"
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40"
            aria-label="Filter"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {filtered.map((f) => (
            <FreelancerCard key={f.id} freelancer={f} />
          ))}
        </div>
        <p className="text-center text-white/35 text-sm mt-16">
          Want assets instead?{' '}
          <Link to="/marketplace" className="text-brand-primary hover:underline">
            VisiARise Marketplace
          </Link>
        </p>
      </section>
    </div>
  );
}
