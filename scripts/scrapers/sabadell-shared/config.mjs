// Configuración común a TODOS los scrapers de Banco Sabadell (visa, ahorro,
// futura hipoteca…). Login, perfil de navegador y anti-detección son idénticos
// entre productos: mantenerlos en un único sitio evita que los scripts se
// desincronicen. Lo específico de cada producto (selectores/URLs de sus
// movimientos, endpoint, secreto) vive en el descriptor de cada scraper.

// Sesión Playwright de Sabadell. A diferencia de Edenred (storage-state suelto),
// la banca online liga la sesión a un fingerprint de dispositivo, así que usamos
// un PERFIL PERSISTENTE de Chrome (userDataDir): conserva cookies, localStorage e
// indexedDB entre ejecuciones, que es lo que mantiene viva la sesión del banco.
// El storage-state JSON se exporta sólo para validar/inspeccionar cookies.
//
// El perfil vive en `sabadell-shared/` porque es el ÚNICO dispositivo enrolado y
// lo COMPARTEN todos los scrapers de Sabadell. Por eso `pnpm scrape:sabadell:login`
// enrola la sesión para todos. La confianza del dispositivo vive DENTRO de estos
// ficheros (cookies/localStorage/indexedDB), así que se puede mover con el perfil
// sin re-enrolar; solo un perfil vacío nuevo obligaría a re-enrolar con OTP.
export const USER_DATA_DIR = 'scripts/scrapers/sabadell-shared/.userdata'
export const LOCAL_STORAGE_PATH = 'scripts/scrapers/sabadell-shared/storage-state.json'
export const LOCAL_STORAGE_BACKUP_PATH = 'scripts/scrapers/sabadell-shared/storage-state.json.bak'

// URL de la página de login de BS Online particulares. Configurable por si
// cambia. Se puede sobreescribir con SABADELL_LOGIN_URL en .env.local.
export const SABADELL_LOGIN_URL =
  process.env.SABADELL_LOGIN_URL || 'https://www.bancsabadell.com/bsnacional/es/particulares/login/'

// Home logueado tras el login (sirve para detectar sesión válida y como punto
// de partida para navegar a tarjetas/cuentas).
export const SABADELL_HOME_URL = 'https://www.bancsabadell.com/bsnacional/es/particulares/'

// Selectores del formulario de login (DNI + PIN de 8 dígitos). El form visible lo
// construye formconstructor.js dentro del web component <bs-login-classics>
// (light DOM): campos #username y #password. OJO: existe además una plantilla
// OCULTA con name="userDNI"/"pinDNI" (#input-placeholder) — NO usar esa.
// Capturado en Fase 0 (#147). Si Sabadell cambia el front, revisar con el login.
export const LOGIN_SELECTORS = {
  user: '#username',
  pass: '#password',
  submit: '#login-button',
  // Indicador de que aún se pide credencial (login no completado).
  passwordVisible: '#password',
  otp: 'input[name="otp"], input[autocomplete="one-time-code"], input[name*="sms" i], input[name*="codigo" i], input[id*="otp" i]',
  // Modal "Confirmar dispositivo": paso de ENROLAMIENTO del dispositivo de
  // confianza de la SCA (PSD2, Directiva UE 2015/2366). El banco lo muestra
  // cuando deja de confiar en este navegador/perfil (caducidad del enrolamiento,
  // cookie de confianza expirada o evento de seguridad — el TTL/cookie exactos se
  // investigan en headed, ver login.mjs y #286). Vive dentro del lightbox SCA
  // (`sca`) como el paso `#enrollment`. Confirmar re-enrola el dispositivo y
  // persiste la confianza en el perfil, curando la causa raíz del fallo recurrente.
  // OJO: su botón usa id="acceptButton", que NO es único (el paso de firma reusa
  // el mismo id), por eso `deviceConfirm` se acota a `#enrollment`.
  deviceModal: '#enrollment',
  deviceConfirm: '#enrollment button.comp-button.primary',
  deviceContinueWithout: '#enrollment a[href*="setEnrollmentValue(false)"]',
  // Lightbox SCA que envuelve enrollment/firma. Tras pulsar Confirmar, si sigue
  // visible es que el banco pide un segundo factor (firma en la app / OTP) que NO
  // es automatizable desatendido → tratarlo como sesión caducada (re-enrolar).
  sca: '#capaSCA',
}

// Anti-detección: la banca online detecta navegadores automatizados (el tell más
// obvio es navigator.webdriver === true) y bloquea el login "por seguridad".
// Lanzar el Chrome REAL del sistema (channel 'chrome', no el Chromium de
// Playwright) + desactivar la bandera AutomationControlled + ocultar webdriver
// elimina las señales más comunes sin recurrir todavía a playwright-extra/stealth
// (decisión de #147: empezar sin stealth y escalar sólo si hay bloqueo).
export const CHROME_CHANNEL = 'chrome'
export const CHROME_ARGS = ['--disable-blink-features=AutomationControlled']
export const STEALTH_INIT_SCRIPT =
  "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"

// Considera el state "sano" si tiene al menos una cookie del dominio Sabadell.
export function isStorageStateValid(state) {
  if (!state || typeof state !== 'object') return false
  const cookies = Array.isArray(state.cookies) ? state.cookies : []
  return cookies.some(c => typeof c?.domain === 'string' && c.domain.includes('sabadell'))
}
