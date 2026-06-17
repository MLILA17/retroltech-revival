import { useEffect, useState } from 'react';
import { CheckCircle, Clock, XCircle, Package, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order, formatTZS } from '../types';
import { useApp } from '../context/AppContext';

export function OrderConfirmationPage({ orderId }: { orderId: string }) {
  const { navigate } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  async function fetchOrder() {
    if (!orderId) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    setOrder(data);
    setLoading(false);
  }

  async function fetchItems() {
    if (!orderId) return;
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    setItems(data || []);
  }

  useEffect(() => {
    fetchOrder();
    fetchItems();
  }, [orderId]);

  // Poll for payment completion when status is pending
  useEffect(() => {
    if (!order || order.payment_status !== 'pending') return;

    setPolling(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .maybeSingle();

      if (data && data.payment_status !== 'pending') {
        setOrder(prev => prev ? { ...prev, ...data } : prev);
        setPolling(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [order?.payment_status, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Order not found.</p>
          <button onClick={() => navigate({ name: 'home' })} className="text-green-600 hover:underline font-medium">
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === 'completed';
  const isFailed = order.payment_status === 'failed';
  const isPending = order.payment_status === 'pending';

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Status card */}
        <div className={`rounded-2xl p-8 text-center mb-6 ${
          isPaid ? 'bg-green-50 border-2 border-green-200' :
          isFailed ? 'bg-red-50 border-2 border-red-200' :
          'bg-white border-2 border-amber-200'
        }`}>
          {isPaid && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-900 mb-2 font-['Space_Grotesk']">Payment Successful!</h1>
              <p className="text-green-700 text-sm">Your order has been placed successfully.</p>
            </>
          )}
          {isFailed && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-9 h-9 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-2 font-['Space_Grotesk']">Payment Failed</h1>
              <p className="text-red-700 text-sm">Your payment could not be processed. Please try again.</p>
            </>
          )}
          {isPending && (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {polling ? (
                  <Loader2 className="w-9 h-9 text-amber-500 animate-spin" />
                ) : (
                  <Clock className="w-9 h-9 text-amber-500" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-amber-900 mb-2 font-['Space_Grotesk']">
                {polling ? 'Waiting for Payment...' : 'Payment Pending'}
              </h1>
              <p className="text-amber-700 text-sm">
                {polling
                  ? 'We are checking your payment status. Please complete the payment on your phone.'
                  : 'Your payment has not been confirmed yet.'}
              </p>
              {!polling && (
                <button
                  onClick={fetchOrder}
                  className="mt-3 flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh Status
                </button>
              )}
            </>
          )}
        </div>

        {/* Order details */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 font-['Space_Grotesk']">Order Details</h2>
            <span className="text-xs bg-gray-100 text-gray-600 font-mono px-2 py-1 rounded">{order.order_number}</span>
          </div>

          <div className="space-y-2 text-sm mb-5">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span className="font-medium text-gray-900 text-right max-w-[200px]">{order.delivery_address}, {order.city}</span>
            </div>
          </div>

          {items.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" /> Items Ordered
              </h3>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.product_image && (
                      <img src={item.product_image} alt={item.product_name} className="w-12 h-12 object-cover rounded-lg border border-gray-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product_name}</p>
                      <p className="text-xs text-gray-500">× {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatTZS(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatTZS(order.total_amount - order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span className="text-green-700">{formatTZS(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isFailed && order.snippe_checkout_url && (
            <a
              href={order.snippe_checkout_url}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Retry Payment
            </a>
          )}
          <button
            onClick={() => navigate({ name: 'home' })}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-green-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Continue Shopping <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
