import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAppStore } from '../store/useAppStore';

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useAppStore();
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold">Your cart</h1>
            <p className="text-white/45 text-sm mt-2">VisiARise Marketplace</p>
          </div>
          <Link to="/marketplace" className="text-sm text-brand-primary hover:underline">
            Continue shopping
          </Link>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
            <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/45 mb-6">Your cart is empty.</p>
            <Link to="/marketplace" className="btn-neon-purple inline-flex items-center gap-2 px-8 py-3 text-sm">
              Browse models <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {cart.map((item) => (
              <motion.div
                layout
                key={item.id}
                className="flex gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/10"
              >
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="w-24 h-24 rounded-xl object-cover border border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.id}`}
                    className="font-bold text-lg hover:text-brand-primary transition-colors line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-white/40 mt-1">Qty {item.quantity}</p>
                  <p className="text-xl font-bold mt-2">${item.price * item.quantity}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="p-3 h-fit rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-8 border-t border-white/10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/35">Total</p>
                <p className="text-3xl font-bold">${total.toFixed(2)}</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="px-6 py-3 rounded-full border border-white/15 text-sm text-white/60 hover:bg-white/5"
                >
                  Clear cart
                </button>
                <button
                  type="button"
                  className="btn-neon-purple px-10 py-3 text-sm font-bold"
                >
                  Checkout (mock)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
