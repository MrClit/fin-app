'use client'

import { BarChart2, Wallet, Home } from 'lucide-react'
import { ConnectBankButton } from '@/components/accounts/ConnectBankButton'

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
  return (
    <div className="min-h-screen bg-background px-6 pt-15 pb-10 flex flex-col">
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
                className="size-10 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: '#6366f115' }}
              >
                <Icon className="size-4.5" style={{ color: '#6366f1' }} strokeWidth={2} />
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
        <ConnectBankButton />
        <button className="py-2.5 text-[13px] font-semibold text-muted-foreground">
          Empezar con datos de ejemplo
        </button>
      </div>
    </div>
  )
}
