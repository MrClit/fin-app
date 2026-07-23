/**
 * Canonicalización de descripciones bancarias (issue #359).
 *
 * Convierte el descriptor que emite el banco —lleno de ruido de trámite, números
 * de tarjeta, fechas y referencias— en una **clave de comercio** estable, de modo
 * que «buscar movimientos del mismo sitio» sea una igualdad de texto que un
 * índice resuelve al instante:
 *
 *   COMPRA TARJ. 4106 MERCADONA (SANT BOI) 12/03  →  mercadona sant boi
 *   RECIBO ENDESA ENERGIA S.A.                    →  endesa energia
 *
 * Dos niveles por movimiento, aprovechando que en los descriptores bancarios el
 * comercio va delante y el ruido detrás:
 *
 *   clave completa  `mercadona sant boi`  precisa, poco recall
 *   clave raíz      `mercadona`           menos precisa, mucho recall
 *
 * La raíz es lo que hace que corregir *un* Mercadona arregle los de todas las
 * ciudades.
 *
 * Módulo puro y sin dependencias a propósito: lo importan la ingesta (servidor),
 * las server actions y el script de backfill (Node suelto, con type stripping).
 *
 * IMPORTANTE: cambiar esta tubería invalida las claves ya persistidas. Tras
 * tocarla hay que repasar el histórico con `pnpm backfill:tx-keys --all`, o las
 * filas viejas quedarán agrupadas con un criterio y las nuevas con otro.
 */

/**
 * Máximo de tokens de una clave completa. Acota la clave a la parte con señal:
 * en los descriptores el comercio va primero y lo que sigue (población, oficina)
 * es cada vez menos discriminativo.
 */
const MAX_KEY_TOKENS = 4

/**
 * Palabras de trámite que el banco antepone al comercio. Se retiran SOLO mientras
 * encabezan la descripción: `compra` al principio es ruido, pero en «bazar compra
 * facil» forma parte del nombre.
 */
const LEADING_NOISE = new Set([
  'compra', 'compras', 'tarj', 'tarjeta', 'targ',
  'pago', 'pagos', 'pagado',
  'recibo', 'recibos', 'rbo',
  'adeudo', 'adeudos', 'domiciliado', 'domiciliacion',
  'transferencia', 'transf', 'traspaso', 'trasp',
  'bizum', 'cargo', 'abono', 'ingreso',
  'emitida', 'recibida', 'favor', 'ordenante', 'beneficiario',
  // Pasarelas de pago: anteponen su marca al comercio real (`HPY*PRIVALIA ES`,
  // `PAYPAL *STEAM`). Quien identifica el gasto es lo que va detrás.
  'hpy', 'paypal', 'pp', 'sumup', 'zettle', 'izettle', 'stripe', 'adyen', 'redsys',
])

/**
 * Palabras vacías que no aportan señal en ninguna posición. Se retiran en todo
 * el descriptor para no gastar el presupuesto de `MAX_KEY_TOKENS` en artículos.
 */
const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'con', 'por', 'para',
  'sin', 'al', 'sobre', 'entre', 'desde', 'hasta',
  // Ruido de URL: sin esto `WWW.AMAZON.*` y `AMAZON*` producen claves distintas
  // (y una raíz `www` que agruparía cualquier comercio con dominio).
  'www', 'http', 'https', 'com',
])

/** Sufijos societarios: `s.l.` sobrevive a la limpieza como tokens sueltos. */
const COMPANY_SUFFIXES = new Set(['sl', 'sa', 'slu', 'sau', 'sccl', 'scp', 'sll', 'srl', 'sc'])

/**
 * Claves no discriminativas: describen la mecánica de la operación, no a quién se
 * le paga. Sin esta lista el sistema aprendería basura de los descriptores
 * genéricos —los mismos que en `AUTO_RULES` viven al final como catch-all— y le
 * asignaría una categoría a todo lo que compartiera trámite.
 */
export const KEY_STOPLIST: ReadonlySet<string> = new Set([
  'varios', 'efectivo', 'cajero', 'reintegro', 'reintegro efectivo',
  'movimiento', 'movimientos', 'operacion', 'operaciones',
  // `describe()` de la ingesta de Enable Banking cae a «Sin descripción» cuando el
  // proveedor no manda ninguno de sus campos de texto.
  'sin descripcion', 'descripcion', 'concepto', 'liquidacion',
])

/**
 * Primeros tokens que NO predicen categoría: como raíz agruparían comercios sin
 * relación entre sí.
 *
 * El criterio es predictivo, no de frecuencia. Un nombre de tipo común
 * —`farmacia`, `bar`, `taller`, `supermercat`— es un magnífico agrupador aunque
 * aparezca en cien comercios distintos: todos van a la misma categoría, así que
 * corregir una farmacia acierta con las demás. Lo que hay que descartar son los
 * tokens que encabezan la descripción sin decir de qué es el gasto (`casa`,
 * `centro`, `grupo`, `help`) y los topónimos y viales, que atraviesan categorías.
 *
 * El voto por mayoría toleraría igualmente una raíz mala —la confianza caería por
 * debajo del umbral—, pero descartarla aquí evita el trabajo y hace la oferta de
 * aplicación retroactiva menos alarmante.
 */
const ROOT_STOPLIST: ReadonlySet<string> = new Set([
  'casa', 'can', 'cal', 'centro', 'centre', 'club', 'grupo', 'group',
  'nueva', 'nuevo', 'gran', 'help', 'estudios', 'servicio', 'servicios',
  'plaza', 'placa', 'avenida', 'avda', 'calle', 'carrer', 'sant', 'santa', 'san',
])

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/**
 * Clave completa de un descriptor, o `null` si no queda nada con señal.
 *
 * Tubería: minúsculas y sin acentos → puntuación a espacios → fuera los tokens
 * con dígitos (tarjeta, fecha, importe, referencia) → fuera el trámite de
 * cabecera, las palabras vacías, los sufijos societarios y los tokens de una
 * letra → recorte a `MAX_KEY_TOKENS`.
 */
export function descriptionKey(description: string): string | null {
  const cleaned = stripDiacritics(description.toLowerCase())
    // Todo lo que no sea letra, dígito o espacio actúa de separador: así
    // `mercadona (sant boi)`, `amzn*mktp` y `s.l.` se parten en tokens.
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')

  const tokens: string[] = []
  let leading = true

  for (const token of cleaned.split(/\s+/)) {
    if (!token) continue
    // Un token con dígitos nunca identifica al comercio: es el PAN de la tarjeta,
    // la fecha, el importe o el código de referencia de la operación.
    if (/\p{Number}/u.test(token)) continue
    // Los tokens de una letra son restos de la puntuación (`s.l.` → `s`, `l`).
    if (token.length === 1) continue
    if (COMPANY_SUFFIXES.has(token)) continue
    if (STOPWORDS.has(token)) continue
    if (leading && LEADING_NOISE.has(token)) continue

    leading = false
    tokens.push(token)
    if (tokens.length === MAX_KEY_TOKENS) break
  }

  if (tokens.length === 0) return null

  const key = tokens.join(' ')
  return KEY_STOPLIST.has(key) ? null : key
}

/**
 * Raíz de una clave: su primer token.
 *
 * Devuelve `null` cuando la clave ya es de un solo token (la raíz no aportaría un
 * segundo nivel, solo duplicaría el voto) o cuando el token es demasiado común
 * para agrupar comercios por él.
 */
export function descriptionKeyRoot(key: string | null): string | null {
  if (!key) return null
  const root = key.split(' ')[0]
  if (!root || root === key) return null
  if (ROOT_STOPLIST.has(root) || KEY_STOPLIST.has(root)) return null
  return root
}

/** Las dos claves de un descriptor, tal y como se persisten en `transactions`. */
export function descriptionKeys(description: string): {
  key: string | null
  root: string | null
} {
  const key = descriptionKey(description)
  return { key, root: descriptionKeyRoot(key) }
}
