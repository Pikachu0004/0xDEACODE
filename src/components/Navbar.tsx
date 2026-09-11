import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Menu, ShoppingBag, X, User } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function Navbar() {
  const user = useAppStore((s) => s.user);
  const cart = useAppStore((s) => s.cart);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleHashNav = useCallback(
    (e: React.MouseEvent, hash: string) => {
      e.preventDefault();
      const id = hash.replace(/^#/, '');
      if (location.pathname !== '/') {
        navigate({ pathname: '/', hash: `#${id}` });
      } else {
        scrollToId(id);
      }
    },
    [location.pathname, navigate, scrollToId]
  );

  type NavItem =
    | { type: 'hash'; name: string; hash: string }
    | { type: 'route'; name: string; path: string };

  const navLinks: NavItem[] = [
    { type: 'route', name: 'Home', path: '/' },
    { type: 'hash', name: 'Ecosystem', hash: '#ecosystem' },
    { type: 'route', name: 'Sustainability', path: '/sustainability' },
    { type: 'route', name: 'Learn', path: '/learn' },
    { type: 'route', name: 'Marketplace', path: '/marketplace' },
    { type: 'route', name: 'Pricing', path: '/pricing' },
    { type: 'route', name: 'Freelancers', path: '/freelancers' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled ? 'py-3 lg:py-4' : 'py-3 sm:py-4 lg:py-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink">
          <motion.img
            src="/Pixora_LOGO.png"
            alt="Pixora"
            className="h-14 w-auto sm:h-16 md:h-20 lg:h-24 xl:h-28 transition-transform duration-500 group-hover:scale-110"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          />
        </Link>

        <div className="hidden lg:flex items-center glass-pill px-2 py-1.5">
          {navLinks.map((link) => {
            if (link.type === 'hash') {
              const isActive = location.pathname === '/' && hash === link.hash;
              return (
                <a
                  key={link.name}
                  href={`/${link.hash}`}
                  onClick={(e) => handleHashNav(e, link.hash)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 relative group ${
                    isActive ? 'text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="nav-glow"
                      className="absolute inset-0 bg-white/10 rounded-full -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-brand-primary transition-all duration-300 group-hover:w-1/2 shadow-[0_0_8px_rgb(255_255_255_/_0.25)]" />
                </a>
              );
            }

            const isActive =
              link.path === '/'
                ? location.pathname === '/' && !hash
                : location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 relative group ${
                  isActive ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-brand-primary transition-all duration-300 group-hover:w-1/2 shadow-[0_0_8px_rgb(255_255_255_/_0.25)]" />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link
            to="/cart"
            className="relative p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-[10px] font-bold flex items-center justify-center text-black">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
              title={user.name || 'Account'}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-violet-600 text-sm font-bold text-black ring-2 ring-white/20 shadow-md">
                {(user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
              </span>
              <span className="max-w-[100px] lg:max-w-[140px] truncate text-xs font-semibold text-white/90">
                {user.name || 'Account'}
              </span>
            </Link>
          ) : null}
          <button
            type="button"
            className="lg:hidden p-2 rounded-full text-white/85 hover:bg-white/10 transition-colors"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          {!user ? (
            <Link to="/login" className="hidden sm:inline-flex btn-neon-purple text-sm px-5 py-2.5 lg:px-6">
              Get Started
            </Link>
          ) : null}
        </div>
      </div>

      {/* Mobile menu: starts below bar so backdrop covers rest of viewport */}
      <div
        id="mobile-nav"
        className={`lg:hidden fixed left-0 right-0 bottom-0 z-[99] top-20 sm:top-24 transition-[visibility\\,opacity] duration-200 ${
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
        <div className="relative mx-3 sm:mx-6 mt-2 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-[calc(100dvh-5rem)] overflow-y-auto">
          <nav className="p-4 flex flex-col gap-1">
            {navLinks.map((link) => {
              if (link.type === 'hash') {
                const isActive = location.pathname === '/' && hash === link.hash;
                return (
                  <a
                    key={link.name}
                    href={`/${link.hash}`}
                    onClick={(e) => handleHashNav(e, link.hash)}
                    className={`px-4 py-3 rounded-xl text-base font-medium ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5'
                    }`}
                  >
                    {link.name}
                  </a>
                );
              }
              const isActive =
                link.path === '/'
                  ? location.pathname === '/' && !hash
                  : location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-3 rounded-xl text-base font-medium ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="h-px bg-white/10 my-2" />
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white font-medium"
                onClick={() => setMobileOpen(false)}
              >
                <User className="w-5 h-5 text-brand-primary" />
                {user.name || 'Workspace'}
              </Link>
            ) : null}
            <Link
              to={user ? '/dashboard' : '/login'}
              className="btn-neon-purple text-sm py-3 justify-center mx-1 mb-1"
              onClick={() => setMobileOpen(false)}
            >
              {user ? 'Open workspace' : 'Get Started'}
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}
