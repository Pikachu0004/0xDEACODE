import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore, MarketplaceItem } from '../store/useAppStore';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Star, 
  ArrowRight, 
  Box, 
  CheckCircle2, 
  X,
  Plus,
  Trash2,
  CreditCard,
  Zap,
  Heart,
  LayoutGrid,
  ChevronRight,
  DollarSign,
  Clock,
  Award
} from 'lucide-react';
import Navbar from '../components/Navbar';
import MarketplaceModelPreview from '../components/MarketplaceModelPreview';
import { Link } from 'react-router-dom';
import { buildTryArUrl } from '../lib/demoAssets';

export default function Marketplace() {
  const { marketplaceItems, addToCart, cart, removeFromCart, addMarketplaceItem } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listForm, setListForm] = useState({
    name: '',
    description: '',
    price: '29',
    category: 'models',
    thumbnailUrl: '/Human_Avatar_Kishan_Nishad_img.png',
    modelUrl: '/Human_Avatar_Kishan_Nishad_model.glb',
  });
  const [listStatus, setListStatus] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('list') === '1') {
      setListModalOpen(true);
      const pid = searchParams.get('project');
      if (pid) {
        try {
          const raw = sessionStorage.getItem(`visiarise-listing-${pid}`);
          if (raw) {
            const d = JSON.parse(raw) as { name?: string; description?: string; modelUrl?: string; thumb?: string };
            setListForm((f) => ({
              ...f,
              name: d.name || f.name,
              description: d.description || f.description,
              modelUrl: d.modelUrl || f.modelUrl,
              thumbnailUrl: d.thumb || f.thumbnailUrl,
            }));
          }
        } catch {
          /* ignore */
        }
      }
      const next = new URLSearchParams(searchParams);
      next.delete('list');
      next.delete('project');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCheckout = () => {
    setIsCheckoutSuccess(true);
    setTimeout(() => {
      setIsCheckoutSuccess(false);
      setIsCartOpen(false);
    }, 3000);
  };

  const submitListing = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(listForm.price);
    if (!listForm.name.trim() || Number.isNaN(price) || price <= 0) {
      setListStatus('Add a title and valid price.');
      return;
    }
    const item: MarketplaceItem = {
      id: `creator-${Date.now()}`,
      name: listForm.name.trim(),
      description: listForm.description.trim() || 'Listed from VisiARise Ardya / Studio.',
      price,
      creator: 'You · VisiARise',
      thumbnailUrl: listForm.thumbnailUrl.trim() || '/Human_Avatar_Kishan_Nishad_img.png',
      modelUrl: listForm.modelUrl.trim() || '/Human_Avatar_Kishan_Nishad_model.glb',
      category: listForm.category,
      rating: 5,
      sales: 0,
    };
    addMarketplaceItem(item);
    setListStatus('Listing published to this catalog (demo).');
    window.setTimeout(() => {
      setListModalOpen(false);
      setListStatus(null);
    }, 1400);
  };

  const filteredItems = useMemo(() => {
    return marketplaceItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [marketplaceItems, searchQuery, selectedCategory]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-black white-shine text-white selection:bg-white/20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 md:pt-40 pb-14 sm:pb-20 md:pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-brand-primary/5 blur-[120px] rounded-full"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col items-center gap-6 mb-10">
              <img src="/Pixora_LOGO.png" alt="Pixora" className="h-20 md:h-24 w-auto opacity-95" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40 mb-2">VisiARise</p>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter font-display leading-[0.95] text-white">
                  Marketplace
                </h1>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-8">
              <Zap className="w-3.5 h-3.5" />
              <span>Real GLBs from our library</span>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed font-light px-1">
              Buy and sell production-ready 3D assets for WebAR. Need a custom build instead?{' '}
              <Link to="/freelancers" className="text-brand-primary hover:underline">
                Hire a freelancer
              </Link>
              .
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setListModalOpen(true)}
                className="w-full sm:w-auto btn-neon-purple flex items-center justify-center gap-3 group"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                List Your Model
              </button>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="w-full sm:w-auto relative px-10 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-xl flex items-center justify-center gap-3"
              >
                <ShoppingBag className="w-5 h-5" />
                View Bag 
                {cart.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-brand-primary text-white text-[10px] rounded-full">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        {/* Tabs & Search */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 mb-16">
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <Box className="w-5 h-5 text-brand-primary" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2">
              <span className="font-semibold text-white/90">Marketplace catalog</span>
              <span className="text-white/35 text-xs font-normal">
                {marketplaceItems.length} GLBs · posters match each mesh
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-96 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-brand-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-brand-primary/50 transition-all backdrop-blur-xl"
              />
            </div>
            <button className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all backdrop-blur-xl">
              <Filter className="w-6 h-6" />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10"
        >
          {filteredItems.map((item) => (
            <ModelCard key={item.id} item={item} onAddToCart={() => addToCart(item)} />
          ))}
        </motion.div>
      </section>

      <AnimatePresence>
        {listModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110]"
              onClick={() => setListModalOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="marketplace-list-glb-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed left-1/2 top-[8%] z-[120] w-[min(100%\\,440px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl max-h-[85vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 id="marketplace-list-glb-title" className="text-lg font-bold font-display">
                    List a GLB
                  </h2>
                  <p className="text-[11px] text-white/45 mt-1">
                    Creator listing (demo) — appears in the catalog below for your session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setListModalOpen(false);
                  }}
                  className="relative z-10 p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={submitListing} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Title</label>
                  <input
                    required
                    value={listForm.name}
                    onChange={(e) => setListForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
                    placeholder="e.g. Concept sneaker — PBR"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Description</label>
                  <textarea
                    value={listForm.description}
                    onChange={(e) => setListForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
                    placeholder="Polycount, rig, license notes…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Price USD</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={listForm.price}
                      onChange={(e) => setListForm((f) => ({ ...f, price: e.target.value }))}
                      className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Category</label>
                    <select
                      value={listForm.category}
                      onChange={(e) => setListForm((f) => ({ ...f, category: e.target.value }))}
                      className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
                    >
                      <option value="models">3D models</option>
                      <option value="characters">Characters</option>
                      <option value="product">Product viz</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    GLB URL (public path)
                  </label>
                  <input
                    value={listForm.modelUrl}
                    onChange={(e) => setListForm((f) => ({ ...f, modelUrl: e.target.value }))}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-mono"
                    placeholder="/models/your.glb"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Poster image URL</label>
                  <input
                    value={listForm.thumbnailUrl}
                    onChange={(e) => setListForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-mono"
                  />
                </div>
                {listStatus && <p className="text-xs text-emerald-400/90">{listStatus}</p>}
                <button type="submit" className="btn-neon-purple w-full py-3 text-sm">
                  Publish listing
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0A0A0A] border-l border-white/10 z-[70] flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold font-display tracking-tight">Your Bag</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest mt-1">{cart.length} Items</p>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {isCheckoutSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-6"
                  >
                    <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">Order Confirmed!</h3>
                      <p className="text-sm text-white/40">Your 3D assets are being prepared for download.</p>
                    </div>
                  </motion.div>
                ) : cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-white/20" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold">Your bag is empty</p>
                      <p className="text-sm text-white/40">Looks like you haven't added anything yet.</p>
                    </div>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="btn-neon-purple"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-6 group">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-brand-primary/30 transition-colors">
                        <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h3 className="font-bold text-lg text-white group-hover:text-brand-primary transition-colors">{item.name}</h3>
                          <p className="text-sm text-white/40">by {item.creator}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brand-primary text-xl">${item.price}</span>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-2.5 text-white/20 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && !isCheckoutSuccess && (
                <div className="p-8 bg-[#0D0D0D] border-t border-white/10 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">Subtotal</span>
                      <span className="text-white font-medium">${cartTotal}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">Tax</span>
                      <span className="text-white font-medium">$0.00</span>
                    </div>
                    <div className="flex items-center justify-between text-xl pt-3 border-t border-white/5">
                      <span className="font-display font-bold">Total</span>
                      <span className="font-bold text-brand-primary">${cartTotal}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="btn-neon-purple w-full flex items-center justify-center gap-3"
                  >
                    <CreditCard className="w-5 h-5" />
                    Complete Purchase
                  </button>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 uppercase tracking-widest font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Secure Checkout by Stripe
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sell CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto p-16 md:p-24 rounded-[4rem] bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-primary/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-8">
                <Award className="w-3.5 h-3.5" />
                <span>Creator Program</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[0.9] font-display">
                Turn your 3D art <br /> into <span className="text-brand-primary italic font-serif font-light">passive income</span>.
              </h2>
              <p className="text-white/60 text-xl mb-12 leading-relaxed font-light">
                Join our elite creator network and sell your models to thousands of developers worldwide. We handle the licensing, hosting, and global payments.
              </p>
              <div className="flex flex-wrap gap-10 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <DollarSign className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">80% Share</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Revenue Split</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Clock className="w-6 h-6 text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">Instant Pay</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">No Wait Periods</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setListModalOpen(true)}
                className="btn-neon-purple px-12 py-6 flex items-center gap-3 group"
              >
                Start Selling Today
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="relative aspect-square rounded-[3.5rem] overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl p-16 flex items-center justify-center group/upload">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 opacity-40 group-hover/upload:opacity-60 transition-opacity"></div>
              <div className="w-full h-full border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-8 group-hover/upload:border-brand-primary/50 transition-all">
                <div className="w-28 h-28 bg-brand-primary/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
                  <Box className="w-14 h-14 text-brand-primary" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold font-display">Upload Your GLB</p>
                  <p className="text-sm text-white/40">Drag and drop your 3D model here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="space-y-8">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/Pixora_LOGO.png" alt="Pixora" className="w-10 h-10 object-contain" />
            </Link>
            <p className="text-base text-white/40 leading-relaxed font-light">
              The world's first AI-driven platform to create, customize, and publish 3D models directly into Augmented Reality.
            </p>
            <div className="flex gap-4">
              {/* Social icons could go here */}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-8">Marketplace</h4>
            <ul className="space-y-5 text-sm text-white/40">
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">All 3D Models</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">Top Creators</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">New Releases</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">Hire Designers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-8">Platform</h4>
            <ul className="space-y-5 text-sm text-white/40">
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">AI Studio</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">AR Engine</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">Developer API</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors font-medium">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-8">Newsletter</h4>
            <p className="text-sm text-white/40 mb-8 font-light">Join 10,000+ creators getting weekly AI & AR insights.</p>
            <div className="flex gap-3">
              <input type="email" placeholder="Email address" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-brand-primary/50 transition-all" />
              <button className="p-4 bg-brand-primary text-white rounded-2xl hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
          <p>© 2026 VisiARise Inc. Crafted for the Spatial Web.</p>
          <div className="flex items-center gap-10">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ModelCard({ item, onAddToCart }: { item: MarketplaceItem; onAddToCart: () => void }) {
  const tryArHref = buildTryArUrl(item.modelUrl, item.name);
  return (
    <motion.div
      whileHover={{ y: -12 }}
      className="group relative bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden hover:border-brand-primary/30 transition-all duration-500 backdrop-blur-xl"
    >
      <div className="aspect-[4/5] overflow-hidden relative">
        <Link to={`/product/${item.id}`} className="block h-full w-full">
          <MarketplaceModelPreview
            src={item.modelUrl}
            poster={item.thumbnailUrl}
            className="h-full w-full"
          />
        </Link>
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #0a0a0a, transparent)' }}
        />
        
        <div className="absolute top-6 right-6 flex gap-2">
          <span className="px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
            {item.category}
          </span>
        </div>
        
        <div className="absolute bottom-6 left-6 right-6 translate-y-16 group-hover:translate-y-0 transition-all duration-500 ease-out flex flex-col gap-2 z-10 pointer-events-auto">
          <a
            href={tryArHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-widest text-center hover:bg-white/15 transition-colors"
          >
            Try in AR
          </a>
          <button 
            onClick={onAddToCart}
            className="btn-neon-purple w-full flex items-center justify-center gap-3"
          >
            <ShoppingBag className="w-4.5 h-4.5" />
            Add to Bag
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-4">
            <Link to={`/product/${item.id}`} className="block">
              <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-brand-primary transition-colors font-display tracking-tight leading-tight">
                {item.name}
              </h3>
            </Link>
            <p className="text-sm text-white/40">by {item.creator}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white tracking-tighter">${item.price}</div>
            <div className="flex items-center gap-1.5 text-brand-primary justify-end font-bold mt-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              {item.rating}
            </div>
          </div>
        </div>

        <p className="text-sm text-white/40 line-clamp-2 mb-8 h-10 leading-relaxed">
          {item.description}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/20 hover:text-brand-primary hover:bg-brand-primary/10 transition-all">
              <Heart className="w-4.5 h-4.5" />
            </button>
            <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/20 hover:text-brand-primary hover:bg-brand-primary/10 transition-all">
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{item.sales} Sales</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mt-0.5">Verified Asset</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

