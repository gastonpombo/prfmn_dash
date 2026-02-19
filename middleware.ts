import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Exclude API, static, and Next.js internals explicitly
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/static')
  ) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. Protect Routes (Dashboard and Root)
  // We treat this app as a private Admin Dashboard, so we protect commonly accessed routes or just everything except login.
  // Here we explicitly protect '/' and '/dashboard'.
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/dashboard')) {
    // If no user, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user exists but is NOT admin, redirect to login
    const role = user.user_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is admin and tries to access root '/', redirect to '/dashboard/orders' which is the main view
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard/orders', request.url))
    }
  }

  // 3. Redirect logged-in admins away from Login page
  if (request.nextUrl.pathname === '/login') {
    if (user && user.user_metadata?.role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard/orders', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /api (API routes - handled separately or unprotected by this middleware)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
