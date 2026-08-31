'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LayoutDashboard, Settings2, Hotel } from 'lucide-react';
import { cn } from '../../../lib/utils';
import useAuth from '../../../hooks/useAuth';
import type { UserRole } from '../../../types';

function DashboardSidebar() {
  const pathname = usePathname();
  const { isRecepcionOrAdmin } = useAuth();

  const navItems = React.useMemo(() => {
    type Item = {
      href: string;
      label: string;
      icon: React.ReactNode;
      roles: readonly UserRole[];
    };
    const items: Item[] = [
      {
        href: '/dashboard/mis-reservas',
        label: 'Mis Reservas',
        icon: <CalendarDays className="h-4 w-4" />,
        roles: ['HUESPED', 'ADMIN', 'RECEPCION'],
      },
    ];
    if (isRecepcionOrAdmin) {
      items.unshift({
        href: '/dashboard/admin',
        label: 'Panel Administrativo',
        icon: <Hotel className="h-4 w-4" />,
        roles: ['ADMIN', 'RECEPCION'],
      });
    }
    return items;
  }, [isRecepcionOrAdmin]);

  return (
    <aside className="w-full shrink-0 lg:w-64 lg:border-r lg:border-slate-200 lg:bg-white/40">
      <nav className="flex gap-1 overflow-x-auto px-4 py-3 lg:flex-col lg:gap-1.5 lg:px-3 lg:py-5">
        {navItems.map((item) => {
          const active =
            item.href === '/dashboard/mis-reservas'
              ? pathname?.startsWith('/dashboard/mis-reservas') ?? false
              : pathname?.startsWith(item.href) ?? false;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex w-full shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isRecepcionOrAdmin } = useAuth();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname ?? '/dashboard');
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (pathname?.startsWith('/dashboard/admin') && !isRecepcionOrAdmin) {
      router.replace('/dashboard/mis-reservas');
    }
  }, [isAuthenticated, isLoading, isRecepcionOrAdmin, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 text-sm text-slate-500">
          <svg
            className="h-5 w-5 animate-spin text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Cargando panel...
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Panel de Control
            </h1>
            <p className="text-sm text-slate-500">
              Gestiona tus reservas y tu cuenta.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <DashboardSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </AuthGate>
  );
}
