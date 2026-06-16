import { useState } from 'react';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { formatTZS } from '../types';

const DELIVERY_FEE = 10000;

interface FormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
}

function generateOrderNumber(): string {
  const prefix = 'RTR';
  const num = Math.floor(100000000 + Math.random() * 900000000);
  return `${prefix}${num}`;
}

export function CheckoutPage() {
  const { cart, navigate } = useApp();
  const { items, subtotal, clearCart } = cart;
  const total = subtotal + DELIVERY_FEE;

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) {
    navigate({ name: 'shop' });
    return null;
  }

  function validate(): boolean {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^(\+?255|0)[67]\d{8}$/.test(form.phone.replace(/\s/g, '')))
      errs.phone = 'Enter a valid Tanzanian phone number';
    if (!form.address.trim()) errs.address = 'Delivery address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function setField(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const orderNumber = generateOrderNumber();

      // Create order in Supabase
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || null,
          delivery_address: form.address,
          city: form.city,
          total_amount: total,
          delivery_fee: DELIVERY_FEE,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderErr || !order) throw new Error(orderErr?.message || 'Failed to create order');

      // Create order items
      const orderItems = items.map(({ product, quantity }) => ({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.images[0] || null,
        quantity,
        unit_price: product.price,
        total_price: product.price * quantity,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw new Error(itemsErr.message);

      // Create Snippe payment session via Edge Function
      const lineItems = items.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        description: product.category,
        quantity,
        unit_price: product.price,
      }));

      const redirectUrl = `${window.location.origin}${window.location.pathname}#/order-confirmation?order=${order.id}`;

      const sessionRes = await supabase.functions.invoke('create-payment-session', {
        body: {
          orderId: order.id,
          orderNumber,
          amount: total,
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          description: `Retro-Tech Revival Order #${orderNumber}`,
          lineItems,
          redirectUrl,
        },
      });

      if (sessionRes.error) throw new Error(sessionRes.error.message);
      const sessionData = sessionRes.data;

      if (sessionData?.error) throw new Error(`Payment error: ${sessionData.error}`);
      if (!sessionData?.checkout_url) throw new Error('No checkout URL received from payment provider');

      // Update order with session reference
      await supabase
        .from('orders')
        .update({
          snippe_session_reference: sessionData.reference,
          snippe_checkout_url: sessionData.checkout_url,
        })
        .eq('id', order.id);

      clearCart();

      // Redirect to Snippe checkout
      window.location.href = sessionData.checkout_url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ name: 'cart' })} className="text-gray-500 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk']">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-5 font-['Space_Grotesk']">Shipping Information</h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    placeholder="+255712345678 or 0712345678"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="your@email.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address *</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setField('address', e.target.value)}
                    placeholder="Street address, area"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors ${
                      errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setField('city', e.target.value)}
                    placeholder="e.g. Dar es Salaam"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors ${
                      errors.city ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
              </div>
            </div>

            {/* Payment info */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mt-4">
              <h2 className="text-base font-bold text-gray-900 mb-3 font-['Space_Grotesk']">Payment Method</h2>
              <p className="text-sm text-gray-600 mb-4">
                You'll be redirected to Snippe's secure checkout to complete payment via:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['M-Pesa', 'Airtel Money', 'Halotel', 'Visa/MasterCard'].map(method => (
                  <div key={method} className="border border-gray-200 rounded-lg px-3 py-2 text-center text-xs font-medium text-gray-700 bg-gray-50">
                    {method}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 rounded-xl transition-colors text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Proceed to Payment — {formatTZS(total)}
                </>
              )}
            </button>
          </form>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-20">
              <h2 className="text-base font-bold text-gray-900 mb-4 font-['Space_Grotesk']">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 line-clamp-2">{product.name}</p>
                      <p className="text-xs text-gray-500">× {quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-900 shrink-0">{formatTZS(product.price * quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatTZS(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>{formatTZS(DELIVERY_FEE)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-green-700">{formatTZS(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
