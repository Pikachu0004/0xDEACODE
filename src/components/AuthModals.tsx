import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Github } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, type }: AuthModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-brand-bg border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-purple-500 to-brand-primary" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-brand-muted" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">
                {type === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-brand-muted text-sm">
                {type === 'signin' 
                  ? 'Enter your credentials to access your studio' 
                  : 'Join the next generation of spatial creators'}
              </p>
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {type === 'signup' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input 
                  type="email" 
                  placeholder="Email Address"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input 
                  type="password" 
                  placeholder="Password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>

              <button className="w-full btn-neon-purple py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgb(119_67_219_/_0.3)]">
                {type === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <span className="relative px-4 bg-brand-bg text-xs font-bold uppercase tracking-widest text-brand-muted">Or continue with</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  <span className="text-sm font-medium">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <Github className="w-4 h-4" />
                  <span className="text-sm font-medium">GitHub</span>
                </button>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-brand-muted">
              {type === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button className="text-brand-primary font-bold hover:underline">
                {type === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
