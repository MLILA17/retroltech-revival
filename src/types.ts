export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  condition: string;
  stock: number;
  images: string[];
  specs: Record<string, string>;
  featured: boolean;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string;
  city: string;
  total_amount: number;
  delivery_fee: number;
  status: string;
  payment_status: string;
  snippe_session_reference: string | null;
  snippe_checkout_url: string | null;
  created_at: string;
}

export type Page =
  | { name: 'home' }
  | { name: 'shop'; category?: string; search?: string }
  | { name: 'product'; slug: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'order-confirmation'; orderId: string }
  | { name: 'auth' }
  | { name: 'admin' }
  | { name: 'verify-email' };

export const CATEGORIES = [
  'Refurbished Laptops',
  'Smartphones',
  'Tablets',
  'Retro Technology',
  'Accessories',
] as const;

export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString('en-TZ')}`;
}
