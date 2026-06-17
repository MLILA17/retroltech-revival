import { ShoppingCart, Star } from 'lucide-react';
import { Product, formatTZS } from '../types';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  onAddToCart?: () => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { navigate, cart } = useApp();
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    cart.addToCart(product, 1);
    onAddToCart?.();
  }

  return (
    <div
      onClick={() => navigate({ name: 'product', slug: product.slug })}
      className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-50 h-48">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount && discount > 0 && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </div>
        )}
        {product.condition === 'vintage' && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Vintage
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-sm font-semibold px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="text-xs text-green-600 font-medium mb-1">{product.category}</div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
          {product.name}
        </h3>

        {/* Rating placeholder */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`w-3 h-3 ${i <= 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
          ))}
          <span className="text-xs text-gray-500 ml-1">(4.0)</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-gray-900">{formatTZS(product.price)}</span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through">{formatTZS(product.original_price)}</span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
