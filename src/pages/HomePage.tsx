import { useEffect, useState } from 'react';
import { ArrowRight, Shield, Wrench, Truck, Leaf, Laptop, Smartphone, Tablet, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, formatTZS, CATEGORIES } from '../types';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Refurbished Laptops': Laptop,
  'Smartphones': Smartphone,
  'Tablets': Tablet,
  'Retro Technology': Clock,
};

const HERO_FEATURES = [
  { icon: Shield, label: 'Tested & Certified', desc: 'Every product thoroughly tested' },
  { icon: Wrench, label: 'Warranty Support', desc: '3-month warranty included' },
  { icon: Truck, label: 'Fast Delivery', desc: 'Delivery across Tanzania' },
  { icon: Leaf, label: 'Eco Friendly', desc: 'Reduce e-waste together' },
];

export function HomePage() {
  const { navigate } = useApp();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('featured', true)
      .limit(8)
      .then(({ data }) => {
        setFeatured(data || []);
        setLoading(false);
      });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <main>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Hero */}
      <section className="bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-green-600/20 text-green-400 text-sm font-medium px-3 py-1.5 rounded-full mb-6 border border-green-600/30">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Dar es Salaam's Premier Refurbished Tech Store
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight font-['Space_Grotesk']">
              Bringing Technology<br />
              <span className="text-green-400">Back to Life</span>
            </h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Refurbished. Tested. Trusted. Affordable tech for today, vintage classics for forever.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate({ name: 'shop' })}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate({ name: 'shop', category: 'Retro Technology' })}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-white/20"
              >
                View Retro Tech
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.slice(0, 4).map(cat => {
              const Icon = CATEGORY_ICONS[cat] || Laptop;
              return (
                <button
                  key={cat}
                  onClick={() => navigate({ name: 'shop', category: cat })}
                  className="bg-white rounded-xl p-5 text-center border border-gray-100 hover:border-green-300 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-100 transition-colors">
                    <Icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{cat}</h3>
                  <p className="text-xs text-gray-500 mt-1">Shop Now →</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk']">Featured Products</h2>
              <p className="text-gray-500 text-sm mt-1">Handpicked deals on quality tech</p>
            </div>
            <button
              onClick={() => navigate({ name: 'shop' })}
              className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-sm"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => showToast(`${product.name} added to cart!`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Banner */}
      <section className="bg-green-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 font-['Space_Grotesk']">
            Giving Technology a Second Life
          </h2>
          <p className="text-green-100 mb-6 max-w-xl mx-auto">
            We refurbish, test, and certify every device so you get quality technology at a fraction of the cost.
          </p>
          <button
            onClick={() => navigate({ name: 'shop' })}
            className="bg-white text-green-700 font-semibold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
          >
            Browse All Products
          </button>
        </div>
      </section>
    </main>
  );
}
