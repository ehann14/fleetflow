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

console.log(' USE_MOCK:', USE_MOCK);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    console.log('🔍 Checking auth...');
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

      console.log('📦 Stored token:', storedToken ? 'EXISTS' : 'NULL');
      console.log('📦 Stored user:', storedUser ? 'EXISTS' : 'NULL');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('✅ Restored user from storage:', parsedUser);
        setToken(storedToken);
        setUser(parsedUser);
        
        if (USE_MOCK) {
          console.log('🎭 Mock mode: skipping API verification');
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
          console.error('❌ Token verification failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } else {
        console.log('⚠️ No stored credentials');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    } finally {
      setIsLoading(false);
      console.log('✅ Auth check complete. isLoading = false');
    }
  };

  const login = async (email: string, password: string) => {
    console.log('🔐 Login attempt:', { email, password, USE_MOCK });
    
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockUser = MOCK_USERS[email];
      
      console.log(' Mock user found:', mockUser ? 'YES' : 'NO');
      
      if (mockUser && password === MOCK_PASSWORD) {
        const mockToken = 'mock-jwt-token-' + Date.now();
        console.log('✅ Mock login success! Setting user:', mockUser);
        
        setToken(mockToken);
        setUser(mockUser);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        // Verify it was saved
        console.log('📦 Saved to localStorage. Verifying...');
        console.log(' Token in storage:', localStorage.getItem('token'));
        console.log('📦 User in storage:', localStorage.getItem('user'));
        
        return;
      } else {
        console.error(' Mock login failed: invalid credentials');
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
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out...');
    if (!USE_MOCK) {
      try { await apiService.logout(); } catch (error) { console.error('Logout error:', error); }
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
    checkAuth 
  };

  console.log(' AuthContext state:', { 
    user: user?.email, 
    hasToken: !!token, 
    isAuthenticated: !!user && !!token, 
    isLoading 
  });

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