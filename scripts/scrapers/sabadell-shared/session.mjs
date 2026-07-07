// Login común a los scrapers de Sabadell: aceptar cookies, rellenar DNI+PIN,
// detectar OTP y reintentar fallos transitorios. Idéntico para todos los
// productos (comparten formulario y perfil enrolado). La orquestación recibe la
// `infra` del scraper (dump/notify/die) y su `loginCommand` para los mensajes.

import { SABADELL_LOGIN_URL, LOGIN_SELECTORS } from './config.mjs'

// Número de intentos de login ante fallo transitorio (#212). Pequeño a propósito:
// el form lo construye formconstructor.js dinámicamente y puede haber una carrera
// que deja el PIN sin enviar; un par de reintentos absorbe ese glitch. NUNCA se
// reintenta ante OTP (reenviar credenciales dispararía SMS y un bloqueo real).
const LOGIN_MAX_ATTEMPTS = 3

export async function acceptCookies(page) {
  // El banner OneTrust tapa el formulario de login (campo DNI queda "hidden").
  const btn = page.locator('#onetrust-accept-btn-handler')
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(500)
  }
}

// Cierra los avisos informativos que Sabadell muestra tras el login (p.ej. "Tu
// DNI/TIE ha caducado", BSO_WELCOME…). Son modales `.comp-modal` con un control
// `.close` que SÓLO descarta el aviso; el botón de acción del pie ("Actualizar",
// que navega a Onfido) NUNCA se toca. Puede haber varios encolados, así que se
// cierran en bucle. Best-effort: si no hay ninguno, no hace nada. Debe llamarse
// tras `login`, antes de navegar, porque el modal bloquea la interacción.
export async function dismissNotices(page, { infra, debug = false, maxModals = 5 } = {}) {
  for (let i = 0; i < maxModals; i++) {
    // `:visible` descarta las plantillas de modal ocultas que Sabadell deja en el
    // DOM; sólo actuamos sobre el aviso realmente mostrado.
    const close = page.locator('.comp-modal .close:visible').first()
    if (!(await close.isVisible().catch(() => false))) return
    if (debug && infra) await infra.dump(page, `notice-${i}`)
    await close.click().catch(() => {})
    await page.waitForTimeout(600)
  }
}

// Clasifica el estado del login a partir de señales del DOM ya leídas. Pura (sin
// Playwright) y por tanto testeable de forma aislada. Precedencia:
//   'device_confirmation'  modal "Confirmar dispositivo" (enrolamiento SCA, #286).
//                          Va PRIMERO: cuando aparece, el lightbox SCA reemplaza al
//                          form (a veces #password ya no está) y es la acción real.
//   'otp'                  el banco pide OTP/segundo factor (dispositivo no enrolado)
//   'retry'                seguimos en el form de password (login no completado)
//   'ok'                   login completado
export function classifyLoginState({ otpVisible, deviceModalVisible, passwordVisible }) {
  if (deviceModalVisible) return 'device_confirmation'
  if (otpVisible) return 'otp'
  if (passwordVisible) return 'retry'
  return 'ok'
}

// Lee del DOM las señales de estado del login y las clasifica. Compartido por
// `attemptLogin` (tras enviar credenciales) y por la re-evaluación posterior a
// pulsar "Confirmar". `.first()` + catch para tolerar selectores ausentes.
async function readLoginState(page) {
  const isVisible = sel => page.locator(sel).first().isVisible().catch(() => false)
  const [otpVisible, deviceModalVisible, passwordVisible] = await Promise.all([
    isVisible(LOGIN_SELECTORS.otp),
    isVisible(LOGIN_SELECTORS.deviceModal),
    isVisible(LOGIN_SELECTORS.pass),
  ])
  return classifyLoginState({ otpVisible, deviceModalVisible, passwordVisible })
}

// Rellena el form y lo envía una vez. Devuelve:
//   'ok'                  login completado
//   'otp'                 el banco pide OTP (dispositivo no enrolado)
//   'device_confirmation' modal "Confirmar dispositivo" (re-enrolamiento SCA, #286)
//   'retry'               seguimos en el form de password (login no completado, transitorio)
//   'no-field'            el campo de DNI no apareció (fallo estructural, no transitorio)
export async function attemptLogin(page, user, pass) {
  await page.goto(SABADELL_LOGIN_URL, { waitUntil: 'domcontentloaded' })
  await acceptCookies(page)

  const userInput = page.locator(LOGIN_SELECTORS.user).first()
  try {
    await userInput.waitFor({ state: 'visible', timeout: 15000 })
  } catch {
    return 'no-field'
  }
  await userInput.fill(user)

  // Verifica que el PIN quedó realmente escrito antes de enviar: el form dinámico
  // (formconstructor.js) a veces gana la carrera y deja #password vacío → el envío
  // se resetea y parece "credenciales incorrectas". Re-rellena si hace falta.
  const passInput = page.locator(LOGIN_SELECTORS.pass).first()
  await passInput.fill(pass)
  if (!(await passInput.inputValue().catch(() => ''))) {
    await page.waitForTimeout(500)
    await passInput.fill(pass)
  }

  await page.locator(LOGIN_SELECTORS.submit).first().click()
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})

  return readLoginState(page)
}

// Orquesta el login con reintentos. `cronMode` habilita los avisos de fallo (solo
// bajo launchd). `loginCommand` es el comando de re-enrolado que se sugiere en el
// mensaje de OTP. Sale del proceso (die) ante fallo irrecuperable.
export async function login(page, { infra, cronMode = false, loginCommand, debug = false }) {
  const user = infra.requireEnv('SABADELL_USER')
  const pass = infra.requireEnv('SABADELL_PASS')

  for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt++) {
    const result = await attemptLogin(page, user, pass)

    if (result === 'no-field') {
      // El campo no aparece: fallo estructural (front cambiado o banner de
      // cookies), no transitorio → no tiene sentido reintentar.
      await infra.dump(page, 'login-no-field')
      await infra.failScrape(4, 'No apareció el campo de DNI en el login (¿cambió el front o el banner de cookies?)')
    }

    if (result === 'ok') {
      if (debug) await infra.dump(page, 'after-login')
      return
    }

    if (result === 'otp') {
      // OTP visible: el dispositivo no está enrolado. Cortar de inmediato, NO
      // reintentar (evita reenviar credenciales y disparar SMS repetidos).
      await infra.dump(page, 'login-otp')
      if (cronMode) await infra.notifyExpired('session_expired')
      infra.die(2, `Sabadell pide OTP: el dispositivo no está enrolado. Ejecuta ${loginCommand}`)
    }

    if (result === 'device_confirmation') {
      // Modal "Confirmar dispositivo" (enrolamiento SCA/PSD2, #286): el banco dejó
      // de confiar en este navegador. Pulsar "Confirmar" re-enrola el dispositivo y
      // persiste la confianza en el perfil → cura la causa raíz. Tras el clic
      // re-evaluamos el estado sin reenviar credenciales.
      await infra.dump(page, 'login-device-confirm')
      await page.locator(LOGIN_SELECTORS.deviceConfirm).first().click().catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})

      // Si el lightbox SCA sigue arriba, Confirmar disparó un segundo factor (firma
      // en la app / OTP) que NO es automatizable desatendido → sesión caducada.
      const scaStillUp = await page.locator(LOGIN_SELECTORS.sca).first().isVisible().catch(() => false)
      const after = await readLoginState(page)

      if (after === 'ok' && !scaStillUp) {
        if (debug) await infra.dump(page, 'after-login')
        return
      }
      if (after === 'otp' || scaStillUp) {
        await infra.dump(page, 'login-device-confirm-otp')
        if (cronMode) await infra.notifyExpired('session_expired')
        infra.die(2, `Confirmar dispositivo requirió OTP/firma: no se pudo re-enrolar desatendido. Ejecuta ${loginCommand}`)
      }
      // El modal reapareció o seguimos en el form: dejar que el bucle reintente.
      infra.logError(`"Confirmar dispositivo" no se resolvió (intento ${attempt}/${LOGIN_MAX_ATTEMPTS})`)
      if (attempt < LOGIN_MAX_ATTEMPTS) await page.waitForTimeout(1500 * attempt)
      continue
    }

    // result === 'retry': login no completado (transitorio). Reintentar si quedan.
    await infra.dump(page, `login-failed-attempt-${attempt}`)
    infra.logError(`login no completado (intento ${attempt}/${LOGIN_MAX_ATTEMPTS})`)
    if (attempt < LOGIN_MAX_ATTEMPTS) await page.waitForTimeout(1500 * attempt)
  }

  // Agotados los intentos sin OTP: posible bloqueo blando, no sesión caducada.
  // Aviso DISTINTO al de 2FA/sesión caducada.
  if (cronMode) await infra.notifyExpired('login_failed')
  infra.die(2, `Login no completado tras ${LOGIN_MAX_ATTEMPTS} intentos (posible bloqueo o credenciales incorrectas)`)
}
