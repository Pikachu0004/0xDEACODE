import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token')?.trim() || '', [params]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Open the link from your email again.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password/' + encodeURIComponent(token), {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      setDone(true);
      window.setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError((err as Error).message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Box className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tighter">VisiARise</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">New password</h1>
          <p className="text-brand-muted">Choose a strong password (uppercase, lowercase, number).</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
          {done ? (
            <p className="text-center text-sm text-white/70">Password updated. Redirecting to sign in…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">{error}</div>
              ) : null}
              {!token ? (
                <p className="text-sm text-amber-200/80">Invalid link. Request a new reset from the login page.</p>
              ) : null}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted ml-4">New password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full btn-neon-purple py-4 text-sm group disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Update password'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5">
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
