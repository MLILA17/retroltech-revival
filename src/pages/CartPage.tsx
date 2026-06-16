import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatTZS } from '../types';

const DELIVERY_FEE = 10000;

export function CartPage() {
  const { cart, navigate } = useApp();
  const { items, removeFromCart, updateQuantity, subtotal } = cart;
  const total = subtotal + DELIVERY_FEE;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-6">Looks like you haven't added anything yet.</p>
          <button
            onClick={() => navigate({ name: 'shop' })}
            className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
          >
            Start Shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ name: 'shop' })} className="text-gray-500 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk']">
            Your Cart ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-start"
              >
                <button onClick={() => navigate({ name: 'product', slug: product.slug })}>
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0 hover:opacity-90 transition-opacity"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-green-600 font-medium mb-0.5">{product.category}</div>
                  <button
                    onClick={() => navigate({ name: 'product', slug: product.slug })}
                    className="text-sm font-semibold text-gray-900 hover:text-green-700 transition-colors text-left line-clamp-2"
                  >
                    {product.name}
                  </button>
                  <div className="text-sm font-bold text-gray-900 mt-1">{formatTZS(product.price)}</div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, Math.min(product.stock, quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 hidden sm:block">
                        {formatTZS(product.price * quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate({ name: 'shop' })}
              className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </button>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-5 font-['Space_Grotesk']">Order Summary</h2>
              <div className="space-y-3 text-sm">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2">{product.name} × {quantity}</span>
                    <span className="shrink-0 font-medium">{formatTZS(product.price * quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatTZS(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="font-medium">{formatTZS(DELIVERY_FEE)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-gray-900 font-bold text-base">
                  <span>Total</span>
                  <span className="text-green-700">{formatTZS(total)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate({ name: 'checkout' })}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-center text-gray-400 mt-3">
                Secure payment via Snippe — M-Pesa, Airtel, Card
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
