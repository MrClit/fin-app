// Configuración compartida entre login.mjs y scrape.mjs.
// Mantener selectores, rutas y opciones de navegador en un único sitio evita
// que el script de login y el de scraping se desincronicen.

// Sesión Playwright de Sabadell. A diferencia de Edenred (storage-state suelto),
// la banca online liga la sesión a un fingerprint de dispositivo, así que usamos
// un PERFIL PERSISTENTE de Chrome (userDataDir): conserva cookies, localStorage e
// indexedDB entre ejecuciones, que es lo que mantiene viva la sesión del banco.
// El storage-state JSON se exporta sólo para validar/inspeccionar cookies.
export const USER_DATA_DIR = 'scripts/scrapers/sabadell-visa/.userdata'
export const LOCAL_STORAGE_PATH = 'scripts/scrapers/sabadell-visa/storage-state.json'
export const LOCAL_STORAGE_BACKUP_PATH = 'scripts/scrapers/sabadell-visa/storage-state.json.bak'

// URL de la página de login de BS Online particulares. Configurable por si
// cambia. Se puede sobreescribir con SABADELL_LOGIN_URL en .env.local.
export const SABADELL_LOGIN_URL =
  process.env.SABADELL_LOGIN_URL || 'https://www.bancsabadell.com/bsnacional/es/particulares/login/'

// Home logueado tras el login (sirve para detectar sesión válida y como punto
// de partida para navegar a tarjetas).
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
