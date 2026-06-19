'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  // Si el callback OAuth falla (p. ej. el usuario cancela en Google), vuelve
  // aquí con ?error=auth. Lo leemos en el render inicial y limpiamos la URL.
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('error') === 'auth'
      ? 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.'
      : null
  })

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('error')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })

    // Si signInWithOAuth tiene éxito, el navegador redirige a Google y este
    // código ya no se ejecuta. Solo gestionamos el caso de error.
    if (error) {
      setGoogleLoading(false)
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Finanzas</h1>
          <p className="mt-1 text-sm text-neutral-400">Gestión financiera personal</p>
        </div>

        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-white hover:bg-neutral-100 disabled:bg-neutral-300 disabled:text-neutral-500 px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors"
          >
            <GoogleIcon />
            {googleLoading ? 'Conectando…' : 'Continuar con Google'}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
      </div>
    </main>
  )
}
