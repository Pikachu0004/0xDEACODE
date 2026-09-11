import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Box, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setIsSent(true);
    } catch (err) {
      setError((err as Error).message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Box className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tighter">VisiARise</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
          <p className="text-brand-muted">We'll send you a link to reset your password</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">{error}</div>
              ) : null}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted ml-4">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full btn-neon-purple py-4 text-sm group disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Check your email</h3>
              <p className="text-sm text-brand-muted mb-8">
                We've sent a password reset link to <span className="text-white font-medium">{email}</span>
              </p>
              <button 
                onClick={() => setIsSent(false)}
                className="text-brand-primary font-bold hover:underline text-sm"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-white/5">
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
