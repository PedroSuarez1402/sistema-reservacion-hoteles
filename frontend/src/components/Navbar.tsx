'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import { cn, roleLabels } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import useAuth from '../hooks/useAuth';
import { useToast } from './ui/Toast';

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === '/' ? pathname === '/' : pathname?.startsWith(href) ?? false;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      {children}
    </Link>
  );
}

function Navbar() {
  const router = useRouter();
  const { isAuthenticated, user, logout, isRecepcionOrAdmin } = useAuth();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function handleLogout() {
    logout();
    toast.success('Sesión cerrada', 'Vuelve pronto');
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-slate-900 hover:bg-slate-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm shadow-primary-600/30">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Hotel<span className="text-primary-600">Reserva</span>
            </span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/">
            <CalendarDays className="h-4 w-4" /> Inicio
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink
                href={
                  isRecepcionOrAdmin
                    ? '/dashboard/admin'
                    : '/dashboard/mis-reservas'
                }
              >
                <LayoutDashboard className="h-4 w-4" /> Panel
              </NavLink>
            </>
          ) : null}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-slate-800">
                    {user.nombre}
                  </span>
                  <Badge variant="default" className="h-4 px-1.5 py-0 text-[10px]">
                    {roleLabels[user.rol]}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Salir
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Crear cuenta</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen((s) => !s)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </nav>

      {mobileOpen ? (
        <div className="md:hidden">
          <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 shadow-inner">
            <NavLink href="/" onClick={() => setMobileOpen(false)}>
              <CalendarDays className="h-4 w-4" /> Inicio
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink
                  href={
                    isRecepcionOrAdmin
                      ? '/dashboard/admin'
                      : '/dashboard/mis-reservas'
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" /> Panel
                </NavLink>
              </>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              {isAuthenticated ? (
                <>
                  <div className="col-span-2 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {user?.nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user ? roleLabels[user.rol] : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="col-span-2"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Iniciar sesión
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Crear cuenta</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export { Navbar };
