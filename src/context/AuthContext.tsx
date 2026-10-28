import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { Spinner } from '../components/ui';
import type { User } from '../types';

interface AuthCtx { user: User | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthCtx | null>(null);
const KEY = 'pp_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem(KEY);
    if (!id) { setReady(true); return; }
    api.get<User>('users', id).then(setUser).catch(() => localStorage.removeItem(KEY)).finally(() => setReady(true));
  }, []);

  const login = async (email: string, password: string) => {
    const found = await api.list<User>('users', { email: email.trim().toLowerCase() });
    const u = found[0];
    if (!u || u.password !== password) throw new Error('Invalid email or password.');
    localStorage.setItem(KEY, String(u.id));
    setUser(u);
  };
  const logout = () => { localStorage.removeItem(KEY); setUser(null); };

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
