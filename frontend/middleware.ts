import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register'];
const AUTH_STORAGE_KEY = 'hotel-auth-storage';
const TOKEN_COOKIE = 'hotel_auth_token';

interface AuthStorage {
  state?: {
    token?: string;
  };
}

function parseAuthCookie(cookieValue: string | undefined): AuthStorage | null {
  if (!cookieValue) return null;
  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as AuthStorage;
  } catch {
    return null;
  }
}

function extractTokenFromSimpleCookie(
  cookieValue: string | undefined
): string | null {
  if (!cookieValue) return null;
  return cookieValue;
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/static/')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard/admin');
}

function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard');
}

function decodeJwtPayload<T = { rol?: string }>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const storageCookie = req.cookies.get(AUTH_STORAGE_KEY)?.value;
  const simpleTokenCookie = req.cookies.get(TOKEN_COOKIE)?.value;

  const parsedStorage = parseAuthCookie(storageCookie);
  const token = parsedStorage?.state?.token || extractTokenFromSimpleCookie(simpleTokenCookie);

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute(pathname)) {
    const payload = decodeJwtPayload<{ rol?: string }>(token);
    const rol = payload?.rol;
    if (rol !== 'ADMIN' && rol !== 'RECEPCION') {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/mis-reservas';
      return NextResponse.redirect(url);
    }
  }

  if (isDashboardRoute(pathname) && pathname === '/dashboard') {
    const payload = decodeJwtPayload<{ rol?: string }>(token);
    const rol = payload?.rol;
    const url = req.nextUrl.clone();
    if (rol === 'ADMIN' || rol === 'RECEPCION') {
      url.pathname = '/dashboard/admin';
    } else {
      url.pathname = '/dashboard/mis-reservas';
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
