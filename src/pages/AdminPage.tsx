import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Product, Order, formatTZS, CATEGORIES } from '../types';
import {
  Shield, ArrowLeft, Loader2, Package, ShoppingBag, DollarSign, CreditCard,
  Plus, Trash2, Edit, Save, X, CheckCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Search, Image, Box, Users, MessageSquare,
  Bell, TrendingUp, Activity, BarChart3, Send, RefreshCw,
  Mail, Phone, MapPin, Calendar, Filter, Eye, XCircle
} from 'lucide-react';

type Tab = 'overview' | 'orders' | 'products' | 'customers' | 'transactions' | 'notifications' | 'sms-logs';

interface OrderWithItems extends Order {
  items?: { product_name: string; quantity: number; total_price: number }[];
}

interface Transaction {
  id: string;
  order_id: string;
  type: string;
  status: string;
  amount: number | null;
  method: string | null;
  reference: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface SmsLog {
  id: string;
  phone: string;
  message: string;
  status: string;
  order_id: string | null;
  sms_type: string | null;
  error: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: Record<string, any>;
}

export function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { navigate } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalTransactions: 0,
    smsSent: 0,
    smsFailed: 0,
    newUsersToday: 0,
  });
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', slug: '', description: '', price: 0, original_price: null,
    category: CATEGORIES[0], condition: 'refurbished', stock: 0, images: [],
    specs: {}, featured: false,
  });
  const [imageInput, setImageInput] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  if (!authLoading && !isAdmin) {
    navigate({ name: 'home' });
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  async function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [prodRes, orderRes, txnRes, smsRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('sms_logs').select('*').order('created_at', { ascending: false }),
    ]);

    const prodData = prodRes.data || [];
    const orderData = orderRes.data || [];
    const txnData = txnRes.data || [];
    const smsData = smsRes.data || [];

    setProducts(prodData);
    setOrders(orderData);
    setTransactions(txnData);
    setSmsLogs(smsData);

    const completedRevenue = orderData
      .filter((o: Order) => o.payment_status === 'completed')
      .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

    setStats({
      totalProducts: prodData.length,
      totalOrders: orderData.length,
      totalRevenue: completedRevenue,
      pendingOrders: orderData.filter((o: Order) => o.status === 'pending').length,
      completedOrders: orderData.filter((o: Order) => o.status === 'completed').length,
      totalTransactions: txnData.length,
      smsSent: smsData.filter((s: SmsLog) => s.status === 'sent').length,
      smsFailed: smsData.filter((s: SmsLog) => s.status === 'failed').length,
      newUsersToday: 0,
    });

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function showSuccess(msg: string) {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(''), 3000);
  }

  function showError(msg: string) {
    setSaveError(msg);
    setTimeout(() => setSaveError(''), 3000);
  }

  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (orderFilter !== 'all' && o.payment_status !== orderFilter) return false;
    return true;
  });

  async function handleDeleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showError(error.message);
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
      showSuccess('Product deleted');
    }
  }

  async function handleSaveProduct() {
    setSaveError('');
    if (!productForm.name || !productForm.slug || !productForm.price || !productForm.category) {
      showError('Name, slug, price, and category are required');
      return;
    }

    const payload = {
      name: productForm.name,
      slug: productForm.slug,
      description: productForm.description || '',
      price: Number(productForm.price),
      original_price: productForm.original_price ? Number(productForm.original_price) : null,
      category: productForm.category,
      condition: productForm.condition || 'refurbished',
      stock: Number(productForm.stock || 0),
      images: productForm.images || [],
      specs: productForm.specs || {},
      featured: productForm.featured || false,
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      if (error) {
        showError(error.message);
        return;
      }
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } as Product : p));
      showSuccess('Product updated');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error || !data) {
        showError(error?.message || 'Failed to create product');
        return;
      }
      setProducts(prev => [data, ...prev]);
      showSuccess('Product created');
    }

    setShowProductForm(false);
    setEditingProduct(null);
    resetProductForm();
  }

  function resetProductForm() {
    setProductForm({
      name: '', slug: '', description: '', price: 0, original_price: null,
      category: CATEGORIES[0], condition: 'refurbished', stock: 0, images: [],
      specs: {}, featured: false,
    });
    setImageInput('');
    setSpecKey('');
    setSpecValue('');
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductForm({ ...product });
    setShowProductForm(true);
  }

  function openCreateProduct() {
    setEditingProduct(null);
    resetProductForm();
    setShowProductForm(true);
  }

  function addImage() {
    if (!imageInput.trim()) return;
    setProductForm(prev => ({ ...prev, images: [...(prev.images || []), imageInput.trim()] }));
    setImageInput('');
  }

  function removeImage(idx: number) {
    setProductForm(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));
  }

  function addSpec() {
    if (!specKey.trim()) return;
    setProductForm(prev => ({
      ...prev,
      specs: { ...(prev.specs || {}), [specKey.trim()]: specValue.trim() },
    }));
    setSpecKey('');
    setSpecValue('');
  }

  function removeSpec(key: string) {
    setProductForm(prev => {
      const next = { ...(prev.specs || {}) };
      delete next[key];
      return { ...prev, specs: next };
    });
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      showError(error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

      // Send SMS notification
      const order = orders.find(o => o.id === orderId);
      if (order?.customer_phone) {
        const smsType = status === 'processing' ? 'order_processing' :
                       status === 'completed' ? 'order_delivered' :
                       status === 'cancelled' ? 'order_cancelled' : null;
        if (smsType) {
          await supabase.functions.invoke('send-sms', {
            body: {
              phone: order.customer_phone,
              type: smsType,
              orderId: order.id,
              orderNumber: order.order_number,
              amount: formatTZS(order.total_amount),
            },
          });
        }
      }
      showSuccess(`Order status updated to ${status}`);
    }
  }

  async function toggleOrderDetails(orderId: string) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: data || [] } : o));
    setExpandedOrder(orderId);
  }

  async function sendOrderSms(order: OrderWithItems, type: string) {
    if (!order.customer_phone) {
      showError('No phone number for this order');
      return;
    }

    const { error } = await supabase.functions.invoke('send-sms', {
      body: {
        phone: order.customer_phone,
        type,
        orderId: order.id,
        orderNumber: order.order_number,
        amount: formatTZS(order.total_amount),
      },
    });

    if (error) {
      showError('Failed to send SMS');
    } else {
      showSuccess('SMS sent successfully');
      fetchData(true);
    }
  }

  return (
    <main className="min-h-screen bg-gray-900">
      {/* Admin Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate({ name: 'home' })} className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white font-['Space_Grotesk']">Admin Dashboard</h1>
                  <p className="text-xs text-gray-400">Retro-Tech Revival Management</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
              { key: 'orders' as Tab, label: 'Orders', icon: ShoppingBag },
              { key: 'products' as Tab, label: 'Products', icon: Package },
              { key: 'customers' as Tab, label: 'Customers', icon: Users },
              { key: 'transactions' as Tab, label: 'Transactions', icon: CreditCard },
              { key: 'notifications' as Tab, label: 'Notifications', icon: Bell },
              { key: 'sms-logs' as Tab, label: 'SMS Logs', icon: MessageSquare },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  tab === key
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Alerts */}
        {saveError && (
          <div className="mb-4 bg-red-900/50 border border-red-800 text-red-200 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 bg-green-900/50 border border-green-800 text-green-200 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {saveSuccess}
          </div>
        )}

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total Revenue', value: formatTZS(stats.totalRevenue), icon: DollarSign, color: 'from-green-500 to-emerald-600', change: '+12%' },
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'from-blue-500 to-cyan-600', change: `${stats.pendingOrders} pending` },
                { label: 'Products', value: stats.totalProducts, icon: Package, color: 'from-purple-500 to-violet-600', change: 'Active' },
                { label: 'Transactions', value: stats.totalTransactions, icon: CreditCard, color: 'from-amber-500 to-orange-600', change: 'Processed' },
                { label: 'SMS Sent', value: stats.smsSent, icon: MessageSquare, color: 'from-teal-500 to-cyan-600', change: `${stats.smsFailed} failed` },
              ].map(({ label, value, icon: Icon, color, change }) => (
                <div key={label} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                  <div className="text-xs text-green-400 mt-1">{change}</div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Recent Orders
                  </h3>
                  <button onClick={() => setTab('orders')} className="text-xs text-green-400 hover:text-green-300">View All</button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-700/50 rounded-lg animate-pulse" />)}
                  </div>
                ) : orders.slice(0, 5).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                            <Box className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{o.order_number}</div>
                            <div className="text-xs text-gray-400">{o.customer_name} · {o.customer_phone}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{formatTZS(o.total_amount)}</div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.payment_status === 'completed' ? 'bg-green-900/50 text-green-400' :
                            o.payment_status === 'failed' ? 'bg-red-900/50 text-red-400' :
                            'bg-amber-900/50 text-amber-400'
                          }`}>{o.payment_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent SMS Activity */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-teal-500" />
                    SMS Activity
                  </h3>
                  <button onClick={() => setTab('sms-logs')} className="text-xs text-green-400 hover:text-green-300">View All</button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-700/50 rounded-lg animate-pulse" />)}
                  </div>
                ) : smsLogs.slice(0, 6).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No SMS logs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {smsLogs.slice(0, 6).map(sms => (
                      <div key={sms.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            sms.status === 'sent' ? 'bg-green-900/50' : 'bg-red-900/50'
                          }`}>
                            <Send className={`w-4 h-4 ${sms.status === 'sent' ? 'text-green-400' : 'text-red-400'}`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{sms.phone}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[180px]">{sms.message}</div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          sms.status === 'sent' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                        }`}>{sms.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tab === 'orders' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={orderFilter}
                onChange={e => setOrderFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All Payments</option>
                <option value="completed">Paid</option>
                <option value="pending">Payment Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                          <Box className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{order.order_number}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              order.payment_status === 'completed' ? 'bg-green-900/50 text-green-400' :
                              order.payment_status === 'failed' ? 'bg-red-900/50 text-red-400' :
                              'bg-amber-900/50 text-amber-400'
                            }`}>{order.payment_status}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              order.status === 'pending' ? 'bg-gray-700 text-gray-300' :
                              order.status === 'processing' ? 'bg-blue-900/50 text-blue-400' :
                              order.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                              'bg-red-900/50 text-red-400'
                            }`}>{order.status}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{order.customer_name}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer_phone}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.city}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{formatTZS(order.total_amount)}</div>
                          <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => toggleOrderDetails(order.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          {expandedOrder === order.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="border-t border-gray-700 px-4 py-4 bg-gray-900/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</div>
                            <div className="text-sm text-white">{order.customer_email || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Delivery Address</div>
                            <div className="text-sm text-white">{order.delivery_address}, {order.city}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Created</div>
                            <div className="text-sm text-white">{new Date(order.created_at).toLocaleString()}</div>
                          </div>
                        </div>

                        {(order.items || []).length > 0 && (
                          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                            <div className="text-xs font-medium text-gray-500 mb-2">Order Items</div>
                            <div className="space-y-2">
                              {(order.items || []).map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-gray-300">{item.product_name} × {item.quantity}</span>
                                  <span className="font-medium text-white">{formatTZS(item.total_price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500 mr-2">Update Status:</span>
                          {['pending', 'processing', 'completed', 'cancelled'].map(status => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(order.id, status)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                                order.status === status
                                  ? 'bg-green-600 text-white shadow-lg'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                          <div className="flex-1" />
                          <button
                            onClick={() => sendOrderSms(order, 'order_confirmation')}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-900/50 text-teal-400 hover:bg-teal-900/70 transition-colors"
                          >
                            <Send className="w-3 h-3" /> Resend SMS
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredOrders.length === 0 && (
                  <div className="text-center py-16 text-gray-500">No orders found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {tab === 'products' && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={openCreateProduct}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {showProductForm && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
                <h3 className="font-bold text-white mb-4 font-['Space_Grotesk']">
                  {editingProduct ? 'Edit Product' : 'New Product'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={productForm.name || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Slug *</label>
                    <input
                      type="text"
                      value={productForm.slug || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Price (TZS) *</label>
                    <input
                      type="number"
                      value={productForm.price || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Original Price (TZS)</label>
                    <input
                      type="number"
                      value={productForm.original_price || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, original_price: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
                    <select
                      value={productForm.category || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Stock</label>
                    <input
                      type="number"
                      value={productForm.stock || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                  <textarea
                    value={productForm.description || ''}
                    onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={productForm.featured || false}
                    onChange={e => setProductForm(prev => ({ ...prev, featured: e.target.checked }))}
                    className="w-4 h-4 accent-green-500"
                  />
                  <label htmlFor="featured" className="text-sm text-gray-300">Featured Product</label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProduct}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" /> {editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/50 border-b border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-400">Product</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-400">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-400">Price</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-400">Stock</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-400">Status</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={product.images[0] || '/vite.svg'} alt={product.name} className="w-10 h-10 object-cover rounded-lg bg-gray-700" />
                              <div>
                                <div className="font-medium text-white">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{product.category}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{formatTZS(product.price)}</div>
                            {product.original_price && <div className="text-xs text-gray-500 line-through">{formatTZS(product.original_price)}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {product.featured && <span className="text-xs font-medium bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full">Featured</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditProduct(product)} className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-gray-500">No products found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {tab === 'transactions' && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No transactions yet.</td>
                    </tr>
                  ) : (
                    transactions.map(txn => (
                      <tr key={txn.id} className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(txn.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-white text-xs">{txn.order_id?.slice(0, 8)}...</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium capitalize text-gray-300">{txn.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            txn.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                            txn.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                            'bg-amber-900/50 text-amber-400'
                          }`}>{txn.status}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {txn.amount ? formatTZS(txn.amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {txn.method || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                          {txn.reference || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SMS Logs Tab */}
        {tab === 'sms-logs' && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Message</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
                      </td>
                    </tr>
                  ) : smsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No SMS logs yet.</td>
                    </tr>
                  ) : (
                    smsLogs.map(sms => (
                      <tr key={sms.id} className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(sms.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{sms.phone}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium bg-gray-700 text-gray-300 px-2 py-0.5 rounded capitalize">{sms.sms_type || 'custom'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs max-w-[300px] truncate">{sms.message}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            sms.status === 'sent' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                          }`}>{sms.status}</span>
                          {sms.error && <div className="text-xs text-red-400 mt-1 truncate max-w-[200px]">{sms.error}</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {tab === 'customers' && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Customer Management</h3>
            <p className="text-gray-400 text-sm">Customer profiles and order history will appear here.</p>
          </div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-500" />
              Notification Settings
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Order Notifications</div>
                    <div className="text-xs text-gray-400 mt-1">Send SMS when order status changes</div>
                  </div>
                  <div className="w-10 h-5 bg-green-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Payment Notifications</div>
                    <div className="text-xs text-gray-400 mt-1">Send SMS when payment is received or failed</div>
                  </div>
                  <div className="w-10 h-5 bg-green-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Email Notifications</div>
                    <div className="text-xs text-gray-400 mt-1">Send email confirmations to customers</div>
                  </div>
                  <div className="w-10 h-5 bg-green-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
