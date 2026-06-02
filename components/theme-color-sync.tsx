'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Sincroniza el color de la franja de la status bar (PWA iOS / isla dinámica)
 * con el tema activo. iOS pinta esa franja a partir de `<meta name="theme-color">`
 * y no reacciona al cambio de clase `.dark` de next-themes, sólo al arrancar o ante
 * cambios de esquema del sistema. Aquí actualizamos el `content` de todos los metas
 * `theme-color` cada vez que cambia `resolvedTheme`, leyendo el color directamente de
 * la variable CSS `--background` ya aplicada para no duplicar los hex de globals.css.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // `resolvedTheme === undefined` durante SSR / pre-hidratación.
    if (!resolvedTheme) return
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue('--background')
      .trim()
    if (!bg) return
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', bg))
  }, [resolvedTheme])

  return null
}
