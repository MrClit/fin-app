'use client'

import { useState } from 'react'
import { BarChart2, Wallet, Home } from 'lucide-react'

const FEATURES = [
  {
    icon: Wallet,
    title: 'Conexión bancaria PSD2',
    desc: 'Vía Open Banking, lectura segura y sin contraseñas',
  },
  {
    icon: BarChart2,
    title: 'Análisis automático',
    desc: 'Categorías, tendencias y comparativas mensuales',
  },
  {
    icon: Home,
    title: 'Todo en un solo sitio',
    desc: 'Cuentas, tarjetas, Edenred y más',
  },
]

export function OnboardingClient() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch('/api/banking/connect', { method: 'POST' })
      if (!res.ok) throw new Error('connect failed')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-[60px] pb-10 flex flex-col overflow-clip">
      <div className="flex-1 flex flex-col justify-center text-center">
        <div
          className="size-24 mx-auto mb-7 rounded-[28px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)',
            boxShadow: '0 20px 60px rgba(99,102,241,0.4)',
          }}
        >
          <BarChart2 className="size-11 text-white" strokeWidth={2.2} />
        </div>

        <h1 className="text-[28px] font-extrabold text-foreground tracking-tight mb-2.5">
          Bienvenido a tus finanzas
        </h1>
        <p className="text-sm text-muted-foreground mb-10 leading-relaxed px-3">
          Conecta tus cuentas y empieza a entender en qué se va tu dinero.
          Privado, seguro y bajo tu control.
        </p>

        <div className="flex flex-col gap-3 mb-10 text-left">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card border border-border"
            >
              <div
                className="size-10 rounded-[12px] shrink-0 flex items-center justify-center"
                style={{ background: '#6366f115' }}
              >
                <Icon className="size-[18px]" style={{ color: '#6366f1' }} strokeWidth={2} />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground mb-0.5">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full rounded-2xl py-4 text-[15px] font-bold text-white transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 10px 30px rgba(99,102,241,0.35)',
          }}
        >
          {loading ? 'Iniciando…' : 'Conectar mi primer banco'}
        </button>
        <button className="py-2.5 text-[13px] font-semibold text-muted-foreground">
          Empezar con datos de ejemplo
        </button>
      </div>
    </div>
  )
}
