'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { login } from '@/lib/api/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';
import { defaultHomePath } from '@/lib/constants/navigation';
import type { Role } from '@/types';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, isLoading: authLoading, setAuth, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace(defaultHomePath(user.role));
    }
  }, [authLoading, isAuthenticated, user, router]);

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      const res = await login(data.email, data.password);
      setAuth(res.accessToken, {
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email,
        role: res.user.role,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      });
      router.push(defaultHomePath(res.user.role as Role));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (
        err instanceof TypeError &&
        String((err as Error).message).toLowerCase().includes('fetch')
      ) {
        setError(
          'Cannot reach the API. Confirm NEXT_PUBLIC_API_URL on Vercel and redeploy the Railway API after updating FRONTEND_URL (no trailing slash needed).'
        );
      } else if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred');
      } else {
        setError('An unexpected error occurred');
      }
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bar/Depot Manager</CardTitle>
          <CardDescription>Sign in to manage your operations</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
