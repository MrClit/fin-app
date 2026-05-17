'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <div className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground">
      <span className="flex items-center gap-3">
        <Moon className="size-4.5" strokeWidth={2} />
        Tema
      </span>
      <span
        role="group"
        aria-label="Seleccionar tema"
        className="flex items-center gap-1 rounded-lg bg-muted p-0.5"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Tema claro"
          aria-pressed={mounted ? !isDark : undefined}
          className={`grid size-7 place-items-center rounded-md transition-colors ${
            mounted && !isDark
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sun className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Tema oscuro"
          aria-pressed={mounted ? isDark : undefined}
          className={`grid size-7 place-items-center rounded-md transition-colors ${
            isDark
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Moon className="size-4" strokeWidth={2} />
        </button>
      </span>
    </div>
  )
}
