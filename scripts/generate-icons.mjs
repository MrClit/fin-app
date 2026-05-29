// Genera los iconos PWA a partir de una marca tipográfica geométrica "€"
// (blanco sobre indigo #6366f1). El glifo se dibuja con primitivas SVG —sin
// depender de fuentes del sistema— para que el rasterizado sea reproducible.
//
//   pnpm icons:generate
//
// Salidas en public/icons/: icon-192.png, icon-512.png, icon-maskable.png
// (512×512 con safe zone interior) y apple-touch-icon.png (180×180).

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons')

const BG = '#6366f1' // theme_color (indigo)
const FG = '#ffffff'
const CANVAS = 512

/**
 * Construye un SVG 512×512 con el glifo "€" centrado.
 * @param {number} scale Fracción de la altura del lienzo que ocupa el glifo
 *   (≈0.58 uso normal; ≈0.46 maskable, dentro del 80% central / safe zone).
 */
function buildSvg(scale) {
  const c = CANVAS / 2
  const R = (CANVAS * scale) / 2 // radio del arco "C"
  const sw = R * 0.26 // grosor de trazo
  const gap = (52 * Math.PI) / 180 // semiángulo del hueco (lado derecho)

  // Arco "C" abierto a la derecha; recorre el lado izquierdo (large-arc).
  // y hacia abajo en SVG → usamos (c - R·sin) para orientación estándar.
  const p1x = c + R * Math.cos(gap)
  const p1y = c - R * Math.sin(gap)
  const p2x = c + R * Math.cos(-gap)
  const p2y = c - R * Math.sin(-gap)
  const arc = `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} A ${R.toFixed(2)} ${R.toFixed(2)} 0 1 0 ${p2x.toFixed(2)} ${p2y.toFixed(2)}`

  // Dos barras horizontales cruzando la parte izquierda del glifo.
  const barX1 = c - R * 1.15
  const barX2 = c + R * 0.45
  const barY1 = c - R * 0.3
  const barY2 = c + R * 0.3
  const barSw = sw * 0.82

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" fill="${BG}"/>
  <g fill="none" stroke="${FG}" stroke-linecap="round">
    <path d="${arc}" stroke-width="${sw.toFixed(2)}"/>
    <line x1="${barX1.toFixed(2)}" y1="${barY1.toFixed(2)}" x2="${barX2.toFixed(2)}" y2="${barY1.toFixed(2)}" stroke-width="${barSw.toFixed(2)}"/>
    <line x1="${barX1.toFixed(2)}" y1="${barY2.toFixed(2)}" x2="${barX2.toFixed(2)}" y2="${barY2.toFixed(2)}" stroke-width="${barSw.toFixed(2)}"/>
  </g>
</svg>`
}

const NORMAL = buildSvg(0.58)
const MASKABLE = buildSvg(0.46)

const targets = [
  { file: 'icon-192.png', size: 192, svg: NORMAL },
  { file: 'icon-512.png', size: 512, svg: NORMAL },
  { file: 'icon-maskable.png', size: 512, svg: MASKABLE },
  { file: 'apple-touch-icon.png', size: 180, svg: NORMAL },
]

await mkdir(ICONS_DIR, { recursive: true })

for (const { file, size, svg } of targets) {
  // flatten() garantiza fondo opaco (sin alfa) en todos los formatos.
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .flatten({ background: BG })
    .png()
    .toFile(path.join(ICONS_DIR, file))
  console.log(`✓ ${file} (${size}×${size})`)
}

console.log('Iconos generados en public/icons/')
