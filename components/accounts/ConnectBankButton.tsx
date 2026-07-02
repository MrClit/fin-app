'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface Aspsp {
  name: string
  country: string
}

type Step = 'idle' | 'selecting' | 'connecting'

export function ConnectBankButton() {
  const [step, setStep] = useState<Step>('idle')
  const [country, setCountry] = useState('ES')
  const [aspsps, setAspsps] = useState<Aspsp[]>([])
  const [loadingAspsps, setLoadingAspsps] = useState(false)
  const [selected, setSelected] = useState<Aspsp | null>(null)

  async function handleOpenSelector() {
    setStep('selecting')
    setLoadingAspsps(true)
    try {
      const res = await fetch(`/api/banking/aspsps?country=${country}`)
      if (res.ok) setAspsps(await res.json())
    } finally {
      setLoadingAspsps(false)
    }
  }

  async function handleCountryChange(newCountry: string) {
    setCountry(newCountry)
    setSelected(null)
    setLoadingAspsps(true)
    try {
      const res = await fetch(`/api/banking/aspsps?country=${newCountry}`)
      if (res.ok) setAspsps(await res.json())
    } finally {
      setLoadingAspsps(false)
    }
  }

  async function handleConnect() {
    if (!selected) return
    setStep('connecting')
    try {
      const res = await fetch('/api/banking/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aspspName: selected.name, aspspCountry: selected.country }),
      })
      if (!res.ok) throw new Error('connect failed')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setStep('selecting')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={handleOpenSelector}
        className="w-full rounded-[20px] border-2 border-dashed p-5 flex items-center justify-center gap-2 transition-opacity"
        style={{ borderColor: '#6366f140', background: '#6366f108' }}
      >
        <Plus className="size-4.5" style={{ color: '#6366f1' }} />
        <span className="text-sm font-semibold" style={{ color: '#6366f1' }}>
          Conectar nueva cuenta
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-[20px] border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-md font-bold text-foreground">Selecciona tu banco</span>
        <button onClick={() => setStep('idle')} className="text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground">País</label>
        <select
          value={country}
          onChange={e => handleCountryChange(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-background px-3 py-2.5 text-sm text-foreground"
        >
          <option value="ES">España</option>
          <option value="FI">Finlandia</option>
          <option value="SE">Suecia</option>
          <option value="GB">Reino Unido</option>
          <option value="FR">Francia</option>
          <option value="DE">Alemania</option>
          <option value="IT">Italia</option>
          <option value="PT">Portugal</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground">Banco</label>
        {loadingAspsps ? (
          <div className="text-sm text-muted-foreground py-2">Cargando bancos…</div>
        ) : aspsps.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No hay bancos disponibles para este país.
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-[10px] border border-border">
            {aspsps.map(aspsp => (
              <button
                key={aspsp.name}
                onClick={() => setSelected(aspsp)}
                className="px-3 py-2.5 text-sm text-left transition-colors"
                style={{
                  background: selected?.name === aspsp.name ? '#6366f115' : undefined,
                  color: selected?.name === aspsp.name ? '#6366f1' : undefined,
                  fontWeight: selected?.name === aspsp.name ? 600 : undefined,
                }}
              >
                {aspsp.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleConnect}
        disabled={!selected || step === 'connecting'}
        className="w-full rounded-[14px] py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        {step === 'connecting' ? 'Iniciando…' : selected ? `Conectar ${selected.name}` : 'Selecciona un banco'}
      </button>
    </div>
  )
}
