'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Mantiene el `<meta name="theme-color">` en sincronía con el tema activo para los
 * navegadores que sí lo usan para la franja de la status bar (Android / Chrome, que
 * además repinta en vivo). En iOS standalone Safari ya no usa este meta: allí la franja
 * la define el elemento fijo del layout pintado con `--background` (ver `app/layout.tsx`).
 * Actualizamos el `content` de todos los metas `theme-color` cuando cambia `resolvedTheme`,
 * leyendo el color de la variable CSS `--background` para no duplicar los hex de globals.css.
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
