import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Product, Order, formatTZS, CATEGORIES } from '../types';
import {
  Shield, ArrowLeft, Loader2, Package, ShoppingBag, DollarSign, CreditCard,
  Plus, Trash2, Edit, Save, X, CheckCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Search, Image, Box
} from 'lucide-react';

type Tab = 'dashboard' | 'products' | 'orders' | 'transactions';

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

export function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { navigate } = useApp();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0, pendingOrders: 0, totalTransactions: 0 });
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  async function fetchData() {
    setLoading(true);
    const [{ data: prodData }, { data: orderData }, { data: txnData }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    ]);
    setProducts(prodData || []);
    setOrders(orderData || []);
    setTransactions(txnData || []);
    setStats({
      totalProducts: (prodData || []).length,
      totalOrders: (orderData || []).length,
      totalRevenue: (orderData || []).filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + o.total_amount, 0),
      pendingOrders: (orderData || []).filter(o => o.status === 'pending').length,
      totalTransactions: (txnData || []).length,
    });
    setLoading(false);
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

  const filteredOrders = orderFilter === 'all'
    ? orders
    : orders.filter(o => o.status === orderFilter || o.payment_status === orderFilter);

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
    setProductForm({
      name: '', slug: '', description: '', price: 0, original_price: null,
      category: CATEGORIES[0], condition: 'refurbished', stock: 0, images: [],
      specs: {}, featured: false,
    });
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
      showSuccess('Order status updated');
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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate({ name: 'home' })} className="text-gray-500 hover:text-green-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" /> Admin Panel
            </h1>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: 'dashboard' as Tab, label: 'Dashboard', icon: DollarSign },
              { key: 'products' as Tab, label: 'Products', icon: Package },
              { key: 'orders' as Tab, label: 'Orders', icon: ShoppingBag },
              { key: 'transactions' as Tab, label: 'Transactions', icon: CreditCard },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === key ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {saveSuccess}
          </div>
        )}

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'bg-blue-50 text-blue-600' },
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'bg-green-50 text-green-600' },
                { label: 'Total Revenue', value: formatTZS(stats.totalRevenue), icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
                { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'bg-red-50 text-red-600' },
                { label: 'Transactions', value: stats.totalTransactions, icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 font-['Space_Grotesk']">Recent Orders</h3>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : orders.slice(0, 5).length === 0 ? (
                <p className="text-gray-500 text-sm">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{o.order_number}</div>
                        <div className="text-xs text-gray-500">{o.customer_name} · {o.customer_phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{formatTZS(o.total_amount)}</div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          o.payment_status === 'completed' ? 'bg-green-100 text-green-700' :
                          o.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{o.payment_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products */}
        {tab === 'products' && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={openCreateProduct}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {showProductForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 font-['Space_Grotesk']">
                  {editingProduct ? 'Edit Product' : 'New Product'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                    <input
                      type="text"
                      value={productForm.name || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Slug *</label>
                    <input
                      type="text"
                      value={productForm.slug || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Price (TZS) *</label>
                    <input
                      type="number"
                      value={productForm.price || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Original Price (TZS)</label>
                    <input
                      type="number"
                      value={productForm.original_price || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, original_price: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category *</label>
                    <select
                      value={productForm.category || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Condition</label>
                    <select
                      value={productForm.condition || 'refurbished'}
                      onChange={e => setProductForm(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    >
                      <option value="refurbished">Refurbished</option>
                      <option value="vintage">Vintage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      value={productForm.stock || ''}
                      onChange={e => setProductForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={productForm.featured || false}
                      onChange={e => setProductForm(prev => ({ ...prev, featured: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    <label htmlFor="featured" className="text-sm text-gray-700">Featured</label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea
                    value={productForm.description || ''}
                    onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Images */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Images</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={imageInput}
                      onChange={e => setImageInput(e.target.value)}
                      placeholder="Image URL..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                    <button onClick={addImage} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(productForm.images || []).map((img, i) => (
                      <div key={i} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs">
                        <Image className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[150px]">{img}</span>
                        <button onClick={() => removeImage(i)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specs */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Specifications</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={specKey}
                      onChange={e => setSpecKey(e.target.value)}
                      placeholder="Key (e.g. RAM)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                    <input
                      type="text"
                      value={specValue}
                      onChange={e => setSpecValue(e.target.value)}
                      placeholder="Value (e.g. 8GB)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                    <button onClick={addSpec} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(productForm.specs || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs">
                        <span className="font-medium">{k}:</span> {v}
                        <button onClick={() => removeSpec(k)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProduct}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" /> {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Price</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Stock</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={product.images[0] || '/vite.svg'} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100" />
                              <div>
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{product.category}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{formatTZS(product.price)}</div>
                            {product.original_price && <div className="text-xs text-gray-400 line-through">{formatTZS(product.original_price)}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {product.featured && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditProduct(product)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                            No products found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <select
                value={orderFilter}
                onChange={e => setOrderFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                          <Box className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">{order.order_number}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              order.payment_status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{order.payment_status}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{order.customer_name} · {order.customer_phone} · {order.city}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{formatTZS(order.total_amount)}</div>
                          <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => toggleOrderDetails(order.id)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Delivery Address</div>
                            <div className="text-sm text-gray-900">{order.delivery_address}, {order.city}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Email</div>
                            <div className="text-sm text-gray-900">{order.customer_email || '—'}</div>
                          </div>
                        </div>

                        {(order.items || []).length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-medium text-gray-500 mb-2">Items</div>
                            <div className="space-y-2">
                              {(order.items || []).map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                                  <span className="font-medium text-gray-900">{formatTZS(item.total_price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Update status:</span>
                          {['pending', 'processing', 'completed', 'cancelled'].map(status => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(order.id, status)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                                order.status === status
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredOrders.length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-sm">No orders found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transactions */}
        {tab === 'transactions' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Order</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                          No transactions yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map(txn => (
                        <tr key={txn.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {new Date(txn.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900 text-xs">{txn.order_id?.slice(0, 8)}...</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium capitalize text-gray-700">{txn.type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                              txn.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{txn.status}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {txn.amount ? formatTZS(txn.amount) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {txn.method || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {txn.reference || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
