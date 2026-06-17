import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Page, CartItem, Product } from '../types';
import { useCart } from '../store/useCart';

interface AppContextValue {
  page: Page;
  navigate: (page: Page) => void;
  cart: {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

function parsePage(hash: string): Page {
  const path = hash.replace(/^#\/?/, '');
  const [route, query] = path.split('?');
  const params = new URLSearchParams(query || '');

  if (!route || route === '') return { name: 'home' };
  if (route === 'shop') {
    return {
      name: 'shop',
      category: params.get('category') || undefined,
      search: params.get('search') || undefined,
    };
  }
  if (route.startsWith('product/')) return { name: 'product', slug: route.slice(8) };
  if (route === 'cart') return { name: 'cart' };
  if (route === 'checkout') return { name: 'checkout' };
  if (route === 'order-confirmation') {
    return { name: 'order-confirmation', orderId: params.get('order') || '' };
  }
  if (route === 'auth') return { name: 'auth' };
  if (route === 'admin') return { name: 'admin' };
  return { name: 'home' };
}

function pageToHash(page: Page): string {
  switch (page.name) {
    case 'home': return '#/';
    case 'shop': {
      const q = new URLSearchParams();
      if (page.category) q.set('category', page.category);
      if (page.search) q.set('search', page.search);
      return `#/shop${q.toString() ? '?' + q.toString() : ''}`;
    }
    case 'product': return `#/product/${page.slug}`;
    case 'cart': return '#/cart';
    case 'checkout': return '#/checkout';
    case 'order-confirmation':
      return `#/order-confirmation?order=${page.orderId}`;
    case 'auth':
      return '#/auth';
    case 'admin':
      return '#/admin';
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>(() => parsePage(window.location.hash));
  const cartData = useCart();

  useEffect(() => {
    const handler = () => setPage(parsePage(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((target: Page) => {
    window.location.hash = pageToHash(target);
    window.scrollTo(0, 0);
  }, []);

  return (
    <AppContext.Provider value={{ page, navigate, cart: cartData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
