import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Github, Chrome, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demo';
import AuthSplitLayout from '../components/AuthSplitLayout';
import { apiFetch, type LoginResponse, type LoginSuccessResponse, type VerifyOtpResponse } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userIdForOtp, setUserIdForOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  const continueAsDemo = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      if ('needsVerification' in data && data.needsVerification) {
        setUserIdForOtp(data.userId);
        setOtp('');
        setInfo(data.message);
        return;
      }
      const ok = data as LoginSuccessResponse;
      setUser({
        id: ok._id,
        email: ok.email,
        name: ok.name,
        token: ok.token,
        credits: ok.credits,
        isAdmin: ok.isAdmin,
        isVerified: ok.isVerified,
      });
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdForOtp) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await apiFetch<VerifyOtpResponse>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ userId: userIdForOtp, otp: otp.trim() }),
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
      setError((err as Error).message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Pick up where you left off — projects, AR Studio, and marketplace stay in sync on this device."
    >
      {!userIdForOtp ? (
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">{error}</div>
        ) : null}

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
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Password</label>
            <Link
              to="/forgot-password"
              className="text-[10px] font-bold uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors"
            >
              Forgot?
            </Link>
          </div>
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
          {loading ? 'Signing in…' : 'Sign in'}
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.07] p-4 space-y-3">
          <div className="flex items-center gap-2 text-violet-200/90">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold">Try instantly</span>
          </div>
          <button
            type="button"
            onClick={continueAsDemo}
            className="w-full rounded-xl bg-white text-black font-bold py-3 text-sm hover:bg-white/90 transition-colors"
          >
            Continue as demo account
          </button>
          <p className="text-[10px] text-white/40 text-center">
            Local preview only — Meshy generation needs a verified account with API access.
          </p>
          <button
            type="button"
            onClick={fillDemo}
            className="w-full text-[11px] font-medium text-violet-300/80 hover:text-violet-200 py-1 transition-colors"
          >
            Or fill demo email &amp; password for manual sign-in
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
      ) : (
      <form onSubmit={handleVerifyOtp} className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">{error}</div>
        ) : null}
        {info ? (
          <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.08] px-4 py-3 text-sm text-violet-100/90">{info}</div>
        ) : null}
        <p className="text-sm text-white/60">
          Enter the 6-digit code we emailed to <span className="text-white font-medium">{email.trim() || 'your inbox'}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={otp}
          onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full bg-black/40 border border-white/[0.08] rounded-2xl py-3.5 px-4 text-center text-lg tracking-[0.4em] font-mono placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        />
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-3.5 text-sm disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify & continue'}
        </button>
        <button
          type="button"
          onClick={() => {
            setUserIdForOtp(null);
            setOtp('');
            setError(null);
            setInfo(null);
          }}
          className="w-full text-xs text-white/40 hover:text-white/70"
        >
          Back to sign in
        </button>
      </form>
      )}

      <p className="text-center mt-8 text-sm text-white/40">
        New here?{' '}
        <Link to="/signup" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
          Create an account
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
