import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage        = pathname === '/login'
  const isTenantLoginPage  = pathname === '/portal/login'
  const isAuthRoute        = pathname.startsWith('/auth/') || pathname === '/set-password' || isTenantLoginPage
  const isPortalRoute      = pathname.startsWith('/portal')
  const isAdminRoute       = !isLoginPage && !isAuthRoute && !isPortalRoute

  // Unauthenticated: portal routes → tenant login, everything else → admin login
  if (!user && !isLoginPage && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = isPortalRoute ? '/portal/login' : '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const role = user.app_metadata?.role as string | undefined

    // Tenant user
    if (role === 'tenant') {
      // Redirect from login to portal
      if (isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/portal'
        return NextResponse.redirect(url)
      }
      // Block tenant from admin routes
      if (isAdminRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/portal'
        return NextResponse.redirect(url)
      }
    } else {
      // Admin user
      // Redirect from login to dashboard
      if (isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      // Block admin from portal routes
      if (isPortalRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
