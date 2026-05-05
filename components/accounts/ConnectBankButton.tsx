'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

export function ConnectBankButton() {
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
    <button
      onClick={handleConnect}
      disabled={loading}
      className="w-full rounded-[20px] border-2 border-dashed p-5 flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
      style={{ borderColor: '#6366f140', background: '#6366f108' }}
    >
      <Plus className="size-[18px]" style={{ color: '#6366f1' }} />
      <span className="text-[14px] font-semibold" style={{ color: '#6366f1' }}>
        {loading ? 'Iniciando…' : 'Conectar nueva cuenta'}
      </span>
    </button>
  )
}
