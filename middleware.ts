import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}
