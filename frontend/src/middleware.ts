import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read cookies for session details
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  const userRole = request.cookies.get('userRole')?.value;

  console.log(`[Next Middleware] Path: ${pathname} | Authed: ${isAuthenticated} | Role: ${userRole}`);

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password');

  const isDashboardRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/recruiter') ||
    pathname.startsWith('/employee') ||
    pathname.startsWith('/candidate');

  // 1. If not authenticated and trying to access dashboard, redirect to login
  if (isDashboardRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Add current URL as redirect parameter
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If authenticated and trying to access auth pages (login/register), redirect to their home
  if (isAuthRoute && isAuthenticated && userRole) {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url));
  }

  // 3. Role-based routing authorization
  if (isDashboardRoute && isAuthenticated && userRole) {
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url));
    }
    if (pathname.startsWith('/manager') && userRole !== 'manager' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url));
    }
    if (pathname.startsWith('/recruiter') && userRole !== 'hr_recruiter' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url));
    }
    if (pathname.startsWith('/employee') && userRole !== 'employee' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url));
    }
    if (pathname.startsWith('/candidate') && userRole !== 'candidate' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url));
    }
  }

  return NextResponse.next();
}

function getRoleHomePath(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'manager':
      return '/manager';
    case 'hr_recruiter':
      return '/recruiter';
    case 'candidate':
      return '/candidate';
    case 'employee':
    default:
      return '/employee';
  }
}

// Config to specify matching paths
export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/recruiter/:path*',
    '/employee/:path*',
    '/candidate/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
};
