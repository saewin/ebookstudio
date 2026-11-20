import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthConfig,
  isSafeNextPath,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth'

const PUBLIC_API_ROUTES = new Set(['/api/auth/login', '/api/auth/logout'])

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Always allow auth endpoints
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  const config = getAuthConfig()

  // If credentials are not configured:
  // - In local development, allow access so local workflow is uninterrupted
  // - In production, fail closed so strangers cannot access the app
  if (!config.configured) {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.next()
    }
    if (pathname === '/login') {
      return NextResponse.next()
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication is not configured on the server.' },
        { status: 503 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'unconfigured')
    return NextResponse.redirect(loginUrl)
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  // If already logged in and visiting /login, redirect to destination
  if (pathname === '/login') {
    if (session) {
      const nextParam = isSafeNextPath(request.nextUrl.searchParams.get('next'))
      return NextResponse.redirect(new URL(nextParam, request.url))
    }
    return NextResponse.next()
  }

  if (session) {
    return NextResponse.next()
  }

  // Block unauthenticated API calls with 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect unauthenticated page requests to /login
  const loginUrl = new URL('/login', request.url)
  const fullPath = `${pathname}${search}`
  if (fullPath && fullPath !== '/') {
    loginUrl.searchParams.set('next', fullPath)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
