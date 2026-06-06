'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { login } from '@/lib/api/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { ApiError } from '@/lib/api/client';
import { defaultHomePath } from '@/lib/constants/navigation';
import type { Role } from '@/types';
import { Loader2, ShieldCheck, BarChart3, Boxes } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-lg">
            <Image
              src="/branding/diamond-luxea-logo.png"
              alt="Diamond Luxea"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            Diamond Luxea
          </span>
        </div>

        <div className="relative max-w-md text-white">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Run your business with clarity.
          </h1>
          <p className="mt-4 text-base text-white/80">
            Sales, stock, purchases and reports — all in one elegant place.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-white/90">
            <li className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 shrink-0 text-white/80" />
              Real-time sales &amp; profit insights
            </li>
            <li className="flex items-center gap-3">
              <Boxes className="h-5 w-5 shrink-0 text-white/80" />
              Live inventory &amp; restock alerts
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-white/80" />
              Role-based access for your team
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Diamond Luxea. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center bg-background p-6 lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient p-2 shadow-lg shadow-primary/30">
              <Image
                src="/branding/diamond-luxea-logo.png"
                alt="Diamond Luxea"
                width={56}
                height={56}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span className="mt-3 font-display text-xl font-bold tracking-tight text-foreground">
              Diamond Luxea
            </span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to manage your operations
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                  className="h-11"
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
                  className="h-11"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={isSubmitting}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
