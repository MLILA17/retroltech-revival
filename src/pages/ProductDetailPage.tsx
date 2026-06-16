import { useEffect, useState } from 'react';
import { ShoppingCart, ArrowLeft, Star, Shield, Package, ChevronRight, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, formatTZS } from '../types';
import { useApp } from '../context/AppContext';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, cart } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState('');
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-200 rounded-2xl h-80" />
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-10 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500 mb-4">Product not found.</p>
        <button onClick={() => navigate({ name: 'shop' })} className="text-green-600 font-medium hover:underline">
          Back to Shop
        </button>
      </div>
    );
  }

  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  function addToCart() {
    cart.addToCart(product!, quantity);
    setToast(`${product!.name} added to cart!`);
    setTimeout(() => setToast(''), 2500);
  }

  function buyNow() {
    cart.addToCart(product!, quantity);
    navigate({ name: 'cart' });
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <button onClick={() => navigate({ name: 'home' })} className="hover:text-green-600">Home</button>
            <ChevronRight className="w-4 h-4" />
            <button onClick={() => navigate({ name: 'shop', category: product.category })} className="hover:text-green-600">{product.category}</button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 truncate max-w-xs">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate({ name: 'shop', category: product.category })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-3">
              <img
                src={product.images[activeImg] || product.images[0]}
                alt={product.name}
                className="w-full h-80 object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImg === i ? 'border-green-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="text-sm text-green-600 font-medium mb-2">{product.category}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3 font-['Space_Grotesk']">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-500">4.0 (24 reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-gray-900">{formatTZS(product.price)}</span>
              {product.original_price && (
                <span className="text-lg text-gray-400 line-through">{formatTZS(product.original_price)}</span>
              )}
              {discount && discount > 0 && (
                <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-full">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-5">
              <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </span>
            </div>

            {/* Condition badge */}
            <div className="mb-5">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${
                product.condition === 'vintage'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {product.condition === 'vintage' ? 'Vintage / Retro' : 'Refurbished & Certified'}
              </span>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>

            {/* Quantity */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={addToCart}
                disabled={product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-green-600 text-green-600 hover:bg-green-50 disabled:border-gray-200 disabled:text-gray-400 font-semibold py-3 rounded-xl transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={buyNow}
                disabled={product.stock === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white disabled:text-gray-400 font-semibold py-3 rounded-xl transition-colors"
              >
                Buy Now
              </button>
            </div>

            {/* Trust badges */}
            <div className="border-t border-gray-100 pt-5 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-green-500" />
                3-month warranty
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="w-4 h-4 text-green-500" />
                Fast delivery TZ-wide
              </div>
            </div>
          </div>
        </div>

        {/* Specs */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="mt-10 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 font-['Space_Grotesk']">Specifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-500 w-28 shrink-0 capitalize">{key}</span>
                  <span className="text-sm text-gray-900">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
