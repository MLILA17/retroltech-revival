import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function fetchUserRole(userId: string) {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.role || 'user';
  }

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const role = await fetchUserRole(data.user.id);
      setUser({ id: data.user.id, email: data.user.email!, role });
      setIsAdmin(role === 'admin');
    } else {
      setUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        (async () => {
          const role = await fetchUserRole(session.user.id);
          setUser({ id: session.user.id, email: session.user.email!, role });
          setIsAdmin(role === 'admin');
        })();
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const role = await fetchUserRole(data.user.id);
      setUser({ id: data.user.id, email: data.user.email!, role });
      setIsAdmin(role === 'admin');
    }
    return { error: null };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: 'user' });
      if (roleError) {
        return { error: roleError.message };
      }

      // Send verification email
      try {
        await supabase.functions.invoke('send-verification-email', {
          body: { email, userId: data.user.id },
        });
      } catch (e) {
        console.error('Failed to send verification email:', e);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        setUser({ id: data.user.id, email: data.user.email!, role: 'user' });
      }
    }
    return { error: null, needsVerification: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
