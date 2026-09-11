import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingBag, Star, Truck, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import MarketplaceModelPreview from '../components/MarketplaceModelPreview';
import { buildTryArUrl } from '../lib/demoAssets';

export default function MarketplaceProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { marketplaceItems, addToCart } = useAppStore();
  const item = marketplaceItems.find((i) => i.id === id);

  if (!item) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-10">
        <p className="text-white/50">Product not found.</p>
        <Link to="/marketplace" className="ml-4 text-brand-primary">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] aspect-[4/5] max-h-[min(80vh\\,720px)]"
          >
            <MarketplaceModelPreview src={item.modelUrl} poster={item.thumbnailUrl} className="h-full" />
          </motion.div>

          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/35 mb-4">
              VisiARise Marketplace
            </p>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{item.name}</h1>
            <p className="text-sm text-white/45 mb-2">by {item.creator}</p>
            <div className="flex items-center gap-3 mb-8">
              <span className="text-4xl font-bold">${item.price}</span>
              <span className="inline-flex items-center gap-1 text-brand-primary font-bold">
                <Star className="w-4 h-4 fill-current" />
                {item.rating}
              </span>
              <span className="text-xs text-white/35">{item.sales} sales</span>
            </div>
            <p className="text-white/60 leading-relaxed mb-8 flex-1">{item.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Truck className="w-5 h-5 text-white/40" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/35">Delivery</div>
                  <div className="font-medium">Instant GLB</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Shield className="w-5 h-5 text-white/40" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/35">License</div>
                  <div className="font-medium">Commercial use</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <ShoppingBag className="w-5 h-5 text-white/40" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/35">Format</div>
                  <div className="font-medium">GLB / WebAR</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => {
                  addToCart(item);
                  navigate('/cart');
                }}
                className="btn-neon-purple flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold"
              >
                <ShoppingBag className="w-5 h-5" />
                Add to cart
              </button>
              <a
                href={buildTryArUrl(item.modelUrl, item.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-4 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5 transition-colors text-center"
              >
                Try in AR
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
