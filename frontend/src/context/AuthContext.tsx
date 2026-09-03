'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, ReactElement } from 'react';
import { User } from '@/types';
import apiService from '@/services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USERS: Record<string, User> = {
  'admin@fleetflow.com': { id: 1, email: 'admin@fleetflow.com', name: 'Admin User', role: 'admin', created_at: '2024-01-01', updated_at: '2024-01-01' },
  'dispatcher@fleetflow.com': { id: 2, email: 'dispatcher@fleetflow.com', name: 'Dispatcher User', role: 'dispatcher', created_at: '2024-01-01', updated_at: '2024-01-01' },
  'driver@fleetflow.com': { id: 3, email: 'driver@fleetflow.com', name: 'Driver User', role: 'driver', created_at: '2024-01-01', updated_at: '2024-01-01' },
  'manager@fleetflow.com': { id: 4, email: 'manager@fleetflow.com', name: 'Manager User', role: 'manager', created_at: '2024-01-01', updated_at: '2024-01-01' },
};

const MOCK_PASSWORD = 'password';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Helper: middleware.ts (server-side) tidak bisa baca localStorage,
// jadi kita simpan salinan token di cookie khusus untuk keperluan routing saja.
// Sumber kebenaran untuk request API tetap localStorage (dipakai di services/api.ts).
function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24; // 1 hari, samakan dengan JWT_EXPIRATION di backend
  document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
}

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setAuthCookie(storedToken);

        if (USE_MOCK) {
          setIsLoading(false);
          return;
        }

        try {
          const response = await apiService.getMe();
          if (response.data.success) {
            setUser(response.data.data);
            localStorage.setItem('user', JSON.stringify(response.data.data));
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          clearAuthCookie();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockUser = MOCK_USERS[email];

      if (mockUser && password === MOCK_PASSWORD) {
        const mockToken = 'mock-jwt-token-' + Date.now();

        setToken(mockToken);
        setUser(mockUser);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        setAuthCookie(mockToken);

        return;
      } else {
        throw new Error('Email atau password salah (mode mock)');
      }
    }

    const response = await apiService.login(email, password);
    if (response.data.success) {
      const { token: newToken, user: userData } = response.data.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setAuthCookie(newToken);
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  };

  const logout = async () => {
    if (!USE_MOCK) {
      try { await apiService.logout(); } catch (error) { console.error('Logout error:', error); }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearAuthCookie();
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}