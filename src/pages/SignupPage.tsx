import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Github, Chrome, User, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DEMO_EMAIL } from '../constants/demo';
import AuthSplitLayout from '../components/AuthSplitLayout';
import { apiFetch, type VerifyOtpResponse } from '../lib/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillDemo = () => {
    setName('Demo Creator');
    setEmail(DEMO_EMAIL);
    setPassword('DemoPass1');
  };

  const signupAsDemo = () => {
    setUser({
      id: 'visiarise-demo-user',
      email: DEMO_EMAIL,
      name: 'Demo Creator',
      token: null,
      credits: null,
      isAdmin: false,
    });
    navigate('/dashboard');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<VerifyOtpResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const u = res.user;
      setUser({
        id: u._id,
        email: u.email,
        name: u.name,
        token: res.token,
        credits: u.credits,
        isAdmin: u.isAdmin,
        isVerified: u.isVerified,
      });
      navigate('/dashboard');
    } catch (err) {
      const e = err as Error & { body?: { errors?: { msg?: string; message?: string }[]; message?: string } };
      const v = e.body?.errors?.map((x) => x.msg || x.message).filter(Boolean).join(' ');
      setError(v || e.body?.message || e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Create account"
      title="Join VisiARise"
      subtitle="Build with ARdya, manage GLBs in AR Studio, and publish WebAR — all from one workspace."
    >
      <form onSubmit={handleSignup} className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">{error}</div>
        ) : null}
        <p className="text-[11px] text-white/40">
          Password must include uppercase, lowercase, and a number (min 6 characters).
        </p>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/35 ml-1">Full name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/40" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              className="w-full bg-black/40 border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/35 ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/40" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-black/40 border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/35 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/40" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-3.5 text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 transition-all disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create account'}
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.07] p-4 space-y-3">
          <div className="flex items-center gap-2 text-violet-200/90">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold">Skip the form</span>
          </div>
          <button
            type="button"
            onClick={signupAsDemo}
            className="w-full rounded-xl bg-white text-black font-bold py-3 text-sm hover:bg-white/90 transition-colors"
          >
            Continue as demo account
          </button>
          <button
            type="button"
            onClick={fillDemo}
            className="w-full text-[11px] font-medium text-violet-300/80 hover:text-violet-200 py-1 transition-colors"
          >
            Or fill demo fields ({DEMO_EMAIL} — use password with Aa1)
          </button>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0c0618] px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all text-xs font-semibold text-white/80"
          >
            <Chrome className="w-4 h-4" />
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all text-xs font-semibold text-white/80"
          >
            <Github className="w-4 h-4" />
            GitHub
          </button>
        </div>
      </form>

      <p className="text-center mt-8 text-sm text-white/40">
        Already have an account?{' '}
        <Link to="/login" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
