'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent, Input, useToast } from '@/components';
import useAuth from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const { login, isLoading, isAuthenticated, isRecepcionOrAdmin, user } = useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  React.useEffect(() => {
    if (isAuthenticated && user) {
      const finalRedirect =
        redirect === '/dashboard'
          ? isRecepcionOrAdmin
            ? '/dashboard/admin'
            : '/dashboard/mis-reservas'
          : redirect;
      router.replace(finalRedirect);
    }
  }, [isAuthenticated, isRecepcionOrAdmin, redirect, router, user]);

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values);
      toast.success('Bienvenido de nuevo', 'Has iniciado sesión correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo iniciar sesión';
      toast.error('Error al iniciar sesión', message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/30">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Hotel<span className="text-primary-600">Reserva</span>
          </span>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Iniciar sesión
        </h1>
        <p className="text-sm text-slate-500">
          Bienvenido de nuevo. Ingresa tus credenciales para continuar.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@correo.com"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              showPasswordToggle
              {...register('password')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                loading={isLoading || isSubmitting}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Iniciar sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
        >
          Crea una cuenta
        </Link>
      </p>
    </div>
  );
}

function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh items-center justify-center">
          <div className="animate-pulse text-sm text-slate-500">Cargando...</div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

export default LoginPage;
