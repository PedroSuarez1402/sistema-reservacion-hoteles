'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, CalendarDays, LayoutDashboard, LogOut, Menu, User, X, Bed, Gift, ClipboardCheck, Users } from 'lucide-react';
import { cn, roleLabels } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { WhatsAppIcon } from './WhatsAppButton';
import { buildWhatsAppUrl, buildGeneralWhatsAppMessage } from '../lib/whatsapp';
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
  const { isAuthenticated, user, logout } = useAuth();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isStaff = Boolean(isAuthenticated && (user?.rol === 'RECEPCION' || user?.rol === 'ADMIN'));
  const homeHref = isStaff
    ? user?.rol === 'ADMIN'
      ? '/dashboard/admin'
      : '/dashboard/recepcion'
    : '/';

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
            href={homeHref}
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

        {/* Enlaces de navegación principales */}
        <div className="hidden items-center gap-1 md:flex">
          {isStaff ? (
            <>
              <NavLink href="/dashboard/recepcion">
                <ClipboardCheck className="h-4 w-4" /> Recepción
              </NavLink>
              <NavLink href="/dashboard/habitaciones">
                <Bed className="h-4 w-4" /> Habitaciones
              </NavLink>
              {user?.rol === 'ADMIN' && (
                <NavLink href="/dashboard/admin">
                  <LayoutDashboard className="h-4 w-4" /> Inventario
                </NavLink>
              )}
            </>
          ) : (
            <>
              <NavLink href="/">
                <CalendarDays className="h-4 w-4" /> Inicio
              </NavLink>
              <NavLink href="/#habitaciones">
                <Bed className="h-4 w-4" /> Habitaciones
              </NavLink>
              <NavLink href="/#paquetes">
                <Gift className="h-4 w-4" /> Paquetes
              </NavLink>
            </>
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {/* Botón WhatsApp solo visible para visitantes públicos */}
          {!isStaff && (
            <a
              href={buildWhatsAppUrl(buildGeneralWhatsAppMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              <span>WhatsApp</span>
            </a>
          )}

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
            <Link href="/login">
              <Button size="sm" variant="outline">
                Acceso Personal
              </Button>
            </Link>
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
            {isStaff ? (
              <>
                <NavLink href="/dashboard/recepcion" onClick={() => setMobileOpen(false)}>
                  <ClipboardCheck className="h-4 w-4" /> Recepción
                </NavLink>
                <NavLink href="/dashboard/habitaciones" onClick={() => setMobileOpen(false)}>
                  <Bed className="h-4 w-4" /> Habitaciones
                </NavLink>
                {user?.rol === 'ADMIN' && (
                  <NavLink href="/dashboard/admin" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> Inventario
                  </NavLink>
                )}
              </>
            ) : (
              <>
                <NavLink href="/" onClick={() => setMobileOpen(false)}>
                  <CalendarDays className="h-4 w-4" /> Inicio
                </NavLink>
                <NavLink href="/#habitaciones" onClick={() => setMobileOpen(false)}>
                  <Bed className="h-4 w-4" /> Habitaciones
                </NavLink>
                <NavLink href="/#paquetes" onClick={() => setMobileOpen(false)}>
                  <Gift className="h-4 w-4" /> Paquetes
                </NavLink>
                <a
                  href={buildWhatsAppUrl(buildGeneralWhatsAppMessage())}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                  <span>Chatear por WhatsApp</span>
                </a>
              </>
            )}

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
                <Link href="/login" onClick={() => setMobileOpen(false)} className="col-span-2">
                  <Button variant="outline" className="w-full">
                    Acceso Personal (Recepción)
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export { Navbar };
