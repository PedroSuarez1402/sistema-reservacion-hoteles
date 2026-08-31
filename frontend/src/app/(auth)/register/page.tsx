'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Lock, UserPlus, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardContent, Input, useToast } from '@/components';
import useAuth from '@/hooks/useAuth';

const registerSchema = z
  .object({
    nombre: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre es demasiado largo')
      .trim(),
    email: z
      .string()
      .min(1, 'El correo es requerido')
      .email('Ingresa un correo electrónico válido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .max(100),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const router = useRouter();

  const { register: registerAuth, isLoading, isAuthenticated, isRecepcionOrAdmin, user } =
    useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  React.useEffect(() => {
    if (isAuthenticated && user) {
      const finalRedirect = isRecepcionOrAdmin
        ? '/dashboard/admin'
        : '/dashboard/mis-reservas';
      router.replace(finalRedirect);
    }
  }, [isAuthenticated, isRecepcionOrAdmin, router, user]);

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerAuth(values);
      toast.success('Cuenta creada', 'Tu cuenta ha sido creada exitosamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear la cuenta';
      toast.error('Error al crear cuenta', message);
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
          Crear cuenta
        </h1>
        <p className="text-sm text-slate-500">
          Regístrate para empezar a reservar habitaciones.
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
              label="Nombre completo"
              placeholder="Juan Pérez"
              autoComplete="name"
              leftIcon={<UserIcon className="h-4 w-4" />}
              error={errors.nombre?.message}
              {...register('nombre')}
            />
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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              type="password"
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                loading={isLoading || isSubmitting}
                rightIcon={<UserPlus className="h-4 w-4" />}
              >
                Crear cuenta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
