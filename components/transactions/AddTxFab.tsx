'use client'

import { Plus } from 'lucide-react'

interface AddTxFabProps {
  onClick: () => void
}

export function AddTxFab({ onClick }: AddTxFabProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 'calc(max(env(safe-area-inset-bottom), 1.5rem) + 84px)',
        right: 'max(20px, calc(50vw - 190px))',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#6366f1',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
        zIndex: 110,
      }}
    >
      <Plus size={24} color="white" strokeWidth={2.5} />
    </button>
  )
}
