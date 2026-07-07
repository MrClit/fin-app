// Genera los iconos PWA a partir del monograma de marca "Nummo": la inicial
// "N" en blanco sobre el cuadrado indigo #6366f1. El glifo se dibuja con
// primitivas SVG —sin depender de fuentes del sistema— para que el rasterizado
// sea reproducible.
//
//   pnpm icons:generate
//
// Salidas:
//   public/icons/icon.svg          fuente única del SVG (variante normal)
//   public/icons/icon-192.png      192×192
//   public/icons/icon-512.png      512×512
//   public/icons/icon-maskable.png 512×512 con safe zone interior
//   public/icons/apple-touch-icon.png 180×180
//   app/favicon.ico                ICO multi-tamaño (32 + 48) con PNG embebido

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons')
const APP_DIR = path.join(__dirname, '..', 'app')

const BG = '#6366f1' // theme_color (indigo)
const FG = '#ffffff'
const CANVAS = 512

/**
 * Construye un SVG 512×512 con el monograma "N" centrado.
 *
 * La N se traza como una única polilínea (abajo-izq → arriba-izq → abajo-der →
 * arriba-der) con uniones y remates redondeados, lo que da la forma clásica de
 * N con esquinas suaves y sin depender de ninguna fuente.
 *
 * @param {number} scale Fracción de la ALTURA del lienzo que ocupa el glifo
 *   (≈0.56 uso normal; ≈0.42 maskable, dentro del 80% central / safe zone).
 */
function buildSvg(scale) {
  const c = CANVAS / 2
  const h = CANVAS * scale // altura del glifo
  const w = h * 0.74 // ancho (N ligeramente más estrecha que alta)
  const sw = h * 0.16 // grosor de trazo (monograma en negrita)

  const xL = (c - w / 2).toFixed(2)
  const xR = (c + w / 2).toFixed(2)
  const yT = (c - h / 2).toFixed(2)
  const yB = (c + h / 2).toFixed(2)

  const d = `M ${xL} ${yB} L ${xL} ${yT} L ${xR} ${yB} L ${xR} ${yT}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" fill="${BG}"/>
  <path d="${d}" fill="none" stroke="${FG}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
}

const NORMAL = buildSvg(0.56)
const MASKABLE = buildSvg(0.42)

/**
 * Rasteriza un SVG a un buffer PNG cuadrado opaco de `size` px.
 * @param {string} svg
 * @param {number} size
 * @param {boolean} [rgba] Fuerza canal alfa (opaco) → PNG RGBA. Necesario para
 *   los PNG embebidos en el ICO: el decodificador de ICO de Next exige RGBA.
 */
async function renderPng(svg, size, rgba = false) {
  let pipeline = sharp(Buffer.from(svg))
    .resize(size, size)
    // flatten() garantiza fondo opaco (sin alfa) en todos los formatos.
    .flatten({ background: BG })
  // ensureAlpha() reañade un canal alfa opaco → RGBA (mismo aspecto).
  if (rgba) pipeline = pipeline.ensureAlpha()
  return pipeline.png().toBuffer()
}

/**
 * Empaqueta varios PNG en un contenedor ICO (un icono por tamaño). Los
 * navegadores aceptan PNG embebido dentro del ICO, así que no hace falta
 * convertir a BMP. Wrapper en node puro: sin dependencias ni herramientas
 * externas.
 * @param {{ size: number, png: Buffer }[]} images
 */
function buildIco(images) {
  const count = images.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // tipo: 1 = icono
  header.writeUInt16LE(count, 4)

  const dirSize = 16 * count
  let offset = 6 + dirSize
  const entries = []
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // ancho (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // alto
    entry.writeUInt8(0, 2) // nº de colores de la paleta (0 = sin paleta)
    entry.writeUInt8(0, 3) // reservado
    entry.writeUInt16LE(1, 4) // planos de color
    entry.writeUInt16LE(32, 6) // bits por píxel
    entry.writeUInt32LE(png.length, 8) // tamaño de la imagen
    entry.writeUInt32LE(offset, 12) // offset a los datos
    entries.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

await mkdir(ICONS_DIR, { recursive: true })

// Fuente única del SVG (variante normal), para que icon.svg y los PNG deriven
// del mismo trazado.
await writeFile(path.join(ICONS_DIR, 'icon.svg'), NORMAL + '\n')
console.log('✓ icon.svg')

const targets = [
  { file: 'icon-192.png', size: 192, svg: NORMAL },
  { file: 'icon-512.png', size: 512, svg: NORMAL },
  { file: 'icon-maskable.png', size: 512, svg: MASKABLE },
  { file: 'apple-touch-icon.png', size: 180, svg: NORMAL },
]

for (const { file, size, svg } of targets) {
  const png = await renderPng(svg, size)
  await writeFile(path.join(ICONS_DIR, file), png)
  console.log(`✓ ${file} (${size}×${size})`)
}

// favicon.ico: 32 + 48 px del glifo normal, empaquetados en un ICO.
const favicon = buildIco([
  { size: 32, png: await renderPng(NORMAL, 32, true) },
  { size: 48, png: await renderPng(NORMAL, 48, true) },
])
await writeFile(path.join(APP_DIR, 'favicon.ico'), favicon)
console.log('✓ favicon.ico (32 + 48)')

console.log('Iconos generados.')
