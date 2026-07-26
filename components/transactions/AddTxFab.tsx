'use client'

import { Plus } from 'lucide-react'

interface AddTxFabProps {
  onClick: () => void
}

export function AddTxFab({ onClick }: AddTxFabProps) {
  // El FAB se ancla al borde derecho de la columna de contenido, no al viewport.
  // En móvil (`--content-offset: 0`, `--content-read: 420px`) la fórmula del `right`
  // da exactamente `50vw - 190px` —idéntico al valor de siempre—; en md+ sigue el
  // rail (offset) y la columna de lectura, pegándose 20px dentro de su borde. El
  // bottom deja de reservar los 84px del BottomNav en md+, que ahí no existe.
  return (
    <button
      onClick={onClick}
      aria-label="Añadir movimiento"
      // El fondo va en `style` inline, así que un `hover:bg-*` no podría ganarle:
      // el realce de puntero se hace con `brightness`, que compone con él (#369).
      className="fixed bottom-[calc(max(env(safe-area-inset-bottom),1.5rem)+84px)] transition-[filter] hover:brightness-110 md:bottom-[max(env(safe-area-inset-bottom),1.5rem)]"
      style={{
        right: 'max(20px, calc(50vw - var(--content-offset) / 2 - var(--content-read) / 2 + 20px))',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#6366f1',
        border: 'none',
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
