import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Webhooks públicos con auth Bearer: saltar el chequeo de sesión.
  if (
    pathname.startsWith('/api/edenred') ||
    pathname.startsWith('/api/sabadell-visa') ||
    pathname === '/api/sync/enablebanking/cron'
  ) {
    return NextResponse.next({ request })
  }

  // Ingesta de errores (issue #200): debe ser alcanzable sin sesión para poder
  // registrar fallos ocurridos en pantallas públicas (login, callback). El
  // handler adjunta user/household sólo si hay cookies; la inserción usa service
  // role. Sin esta excepción, el POST de los error boundaries se redirige a /login.
  if (pathname === '/api/error-log') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session and gets the current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && pathname !== '/login' && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
