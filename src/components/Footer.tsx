import { RefreshCw, MapPin, Phone, Mail, Facebook, Twitter, Instagram } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../types';

export function Footer() {
  const { navigate } = useApp();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white font-['Space_Grotesk']">Retro-Tech Revival</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Bringing technology back to life. Affordable refurbished and retro tech, tested and certified.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <div key={i} className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors cursor-pointer">
                  <Icon className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 font-['Space_Grotesk']">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Home', page: { name: 'home' as const } },
                { label: 'Shop All', page: { name: 'shop' as const } },
              ].map(({ label, page }) => (
                <li key={label}>
                  <button
                    onClick={() => navigate(page)}
                    className="hover:text-green-400 transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4 font-['Space_Grotesk']">Categories</h4>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => navigate({ name: 'shop', category: cat })}
                    className="hover:text-green-400 transition-colors"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 font-['Space_Grotesk']">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-green-400 shrink-0" />
                <span>Dar es Salaam, Tanzania</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400 shrink-0" />
                <span>+255 700 000 000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-400 shrink-0" />
                <span>info@retrotechrevival.co.tz</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-500">
          <p>© 2026 Retro-Tech Revival. All rights reserved.</p>
          <p>DIT BENG24COE Group 02</p>
        </div>
      </div>
    </footer>
  );
}
