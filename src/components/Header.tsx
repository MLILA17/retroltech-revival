import { useState } from 'react';
import { ShoppingCart, Search, Menu, X, Cpu, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../types';

export function Header() {
  const { navigate, cart, page } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ name: 'shop', search: searchQuery.trim() });
      setMenuOpen(false);
    }
  }

  const isShop = page.name === 'shop';
  const isHome = page.name === 'home';

  return (
    <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <button
            onClick={() => { navigate({ name: 'home' }); setMenuOpen(false); }}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-sm leading-tight font-['Space_Grotesk']">Retro-Tech</div>
              <div className="text-green-400 text-xs font-medium leading-tight">Revival</div>
            </div>
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ name: 'cart' })}
              className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.totalItems > 9 ? '9+' : cart.totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Nav categories */}
        <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto">
          <button
            onClick={() => navigate({ name: 'shop' })}
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
              isShop && !('category' in page && page.category)
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => navigate({ name: 'shop', category: cat })}
              className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
                isShop && 'category' in page && page.category === cat
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 pb-4">
          <form onSubmit={handleSearch} className="pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              />
            </div>
          </form>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { navigate({ name: 'shop' }); setMenuOpen(false); }}
              className="text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
            >
              All Products
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { navigate({ name: 'shop', category: cat }); setMenuOpen(false); }}
                className="text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
