'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Navigasi client-side (bukan reload penuh). Cookie token sudah
      // di-set secara sinkron di dalam login(), jadi middleware tetap
      // bisa membacanya tanpa perlu window.location.href.
      const redirectTo = searchParams.get('from') || '/dashboard';
      router.replace(redirectTo);
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Login gagal. Periksa email dan password Anda.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Masuk ke Akun Anda</CardTitle>
        <CardDescription>Masukkan kredensial untuk mengakses sistem</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="admin@fleetflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Memproses...
              </div>
            ) : (
              'Masuk'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
          <Truck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">FleetFlow</h2>
        <p className="mt-2 text-sm text-gray-600">Fleet & Delivery Management System</p>
      </div>

      <LoginForm />

      <div className="mt-8 text-center text-xs text-gray-500">
        <p>Demo Credentials:</p>
        <p>admin@fleetflow.com / password</p>
      </div>
    </div>
  );
}