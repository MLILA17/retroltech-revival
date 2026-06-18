import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { AuthPage } from './pages/AuthPage';
import { AdminPage } from './pages/AdminPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

function Router() {
  const { page } = useApp();

  switch (page.name) {
    case 'home': return <HomePage />;
    case 'shop': return <ShopPage />;
    case 'product': return <ProductDetailPage slug={page.slug} />;
    case 'cart': return <CartPage />;
    case 'checkout': return <CheckoutPage />;
    case 'order-confirmation': return <OrderConfirmationPage orderId={page.orderId} />;
    case 'auth': return <AuthPage />;
    case 'admin': return <AdminPage />;
    case 'verify-email': return <VerifyEmailPage />;
    default: return <HomePage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-1">
            <Router />
          </div>
          <Footer />
        </div>
      </AppProvider>
    </AuthProvider>
  );
}
