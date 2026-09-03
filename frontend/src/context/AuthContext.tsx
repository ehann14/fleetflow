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

// Mock users untuk development (ketika backend belum ready)
const MOCK_USERS: Record<string, User> = {
  'admin@fleetflow.com': {
    id: 1,
    email: 'admin@fleetflow.com',
    name: 'Admin User',
    role: 'admin',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  'dispatcher@fleetflow.com': {
    id: 2,
    email: 'dispatcher@fleetflow.com',
    name: 'Dispatcher User',
    role: 'dispatcher',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  'driver@fleetflow.com': {
    id: 3,
    email: 'driver@fleetflow.com',
    name: 'Driver User',
    role: 'driver',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  'manager@fleetflow.com': {
    id: 4,
    email: 'manager@fleetflow.com',
    name: 'Manager User',
    role: 'manager',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
};

const MOCK_PASSWORD = 'password';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

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
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Jika menggunakan mock, skip API call
        if (USE_MOCK) {
          setIsLoading(false);
          return;
        }

        try {
          const response = await apiService.getMe();
          if (response.success) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
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
    // Jika mode mock aktif, gunakan dummy data
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulasi delay network
      
      const mockUser = MOCK_USERS[email];
      
      if (mockUser && password === MOCK_PASSWORD) {
        const mockToken = 'mock-jwt-token-' + Date.now();
        setToken(mockToken);
        setUser(mockUser);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        return;
      } else {
        throw new Error('Email atau password salah (mode mock)');
      }
    }

    // Jika backend ready, gunakan API asli
    const response = await apiService.login(email, password);
    if (response.success) {
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const logout = async () => {
    if (!USE_MOCK) {
      try {
        await apiService.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    checkAuth,
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