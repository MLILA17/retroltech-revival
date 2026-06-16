import { useEffect, useState } from 'react';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, CATEGORIES, formatTZS } from '../types';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name';

const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  name: 'Name A-Z',
};

export function ShopPage() {
  const { page, navigate, cart } = useApp();
  const shopPage = page as Extract<typeof page, { name: 'shop' }>;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('featured');
  const [condition, setCondition] = useState<string>('');
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [toast, setToast] = useState('');

  const activeCategory = shopPage.category;
  const searchQuery = shopPage.search;

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('products').select('*');
    if (activeCategory) query = query.eq('category', activeCategory);
    if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
    if (condition) query = query.eq('condition', condition);

    query.then(({ data }) => {
      let results = data || [];
      if (priceMax) results = results.filter(p => p.price <= Number(priceMax));

      switch (sort) {
        case 'price-asc': results.sort((a, b) => a.price - b.price); break;
        case 'price-desc': results.sort((a, b) => b.price - a.price); break;
        case 'name': results.sort((a, b) => a.name.localeCompare(b.name)); break;
        case 'featured': results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
      }

      setProducts(results);
      setLoading(false);
    });
  }, [activeCategory, searchQuery, sort, condition, priceMax]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const clearFilters = () => {
    setCondition('');
    setPriceMax('');
    navigate({ name: 'shop' });
  };

  const hasFilters = !!activeCategory || !!searchQuery || !!condition || !!priceMax;

  return (
    <main className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk']">
            {activeCategory || (searchQuery ? `Search: "${searchQuery}"` : 'All Products')}
          </h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">{products.length} products found</p>
          )}

          {/* Active filters */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {activeCategory && (
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
                  {activeCategory}
                  <button onClick={() => navigate({ name: 'shop', search: searchQuery })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
                  "{searchQuery}"
                  <button onClick={() => navigate({ name: 'shop', category: activeCategory })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {condition && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1 rounded-full border border-amber-200">
                  {condition}
                  <button onClick={() => setCondition('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 underline ml-2">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-green-400 hover:text-green-600 transition-colors bg-white"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 hidden sm:block">Sort:</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400"
            >
              {Object.entries(SORT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          {filterOpen && (
            <aside className="w-56 shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 p-4 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
                  <button onClick={() => setFilterOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>

                {/* Category */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</h4>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cat" checked={!activeCategory} onChange={() => navigate({ name: 'shop', search: searchQuery })} className="accent-green-600" />
                      <span className="text-sm text-gray-700">All</span>
                    </label>
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="cat" checked={activeCategory === cat} onChange={() => navigate({ name: 'shop', category: cat, search: searchQuery })} className="accent-green-600" />
                        <span className="text-sm text-gray-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Condition */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Condition</h4>
                  <div className="space-y-1">
                    {['', 'refurbished', 'vintage'].map((c) => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="cond" checked={condition === c} onChange={() => setCondition(c)} className="accent-green-600" />
                        <span className="text-sm text-gray-700">{c === '' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Max price */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Max Price (TZS)</h4>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 500000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  />
                </div>
              </div>
            </aside>
          )}

          {/* Products grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-300 text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search term.</p>
                <button onClick={clearFilters} className="text-green-600 font-medium hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => showToast(`${product.name} added to cart!`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
