// Configuración compartida entre edenred-login.mjs y edenred-scrape.mjs.
// Mantener selectores y rutas en un único sitio evita que el script de
// login y el de scraping se desincronicen (causa típica de exit code 2).

export const LOCAL_STORAGE_PATH = 'scripts/storage-state.json'
export const LOCAL_STORAGE_BACKUP_PATH = 'scripts/storage-state.json.bak'

export const EDENRED_LOGIN_URL = 'https://empleados.edenred.es/login'
export const EDENRED_ACCOUNT_URL = 'https://empleados.edenred.es'

// Considera el state "sano" si tiene al menos una cookie del dominio Edenred.
// Lo usamos para validar el JSON guardado tras un login y para no pisar el
// state vigente con uno vacío.
export function isStorageStateValid(state) {
  if (!state || typeof state !== 'object') return false
  const cookies = Array.isArray(state.cookies) ? state.cookies : []
  return cookies.some(c => typeof c?.domain === 'string' && c.domain.includes('edenred'))
}
