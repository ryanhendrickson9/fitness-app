import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.APP_PASSWORD ?? 'pulse';
const COOKIE = 'percy_auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  const auth = req.cookies.get(COOKIE)?.value;
  if (auth === PASSWORD) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/).*)'],
};
