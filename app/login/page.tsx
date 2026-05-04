'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError('No se pudo enviar el enlace. Inténtalo de nuevo.')
    } else {
      setSent(true)
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
          {sent ? (
            <div className="text-center py-2">
              <p className="text-white font-medium">Revisa tu email</p>
              <p className="mt-2 text-sm text-neutral-400">
                Te hemos enviado un enlace de acceso a <span className="text-neutral-200">{email}</span>.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Usar otro email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-neutral-400 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {loading ? 'Enviando…' : 'Continuar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
