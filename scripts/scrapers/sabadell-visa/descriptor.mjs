// Identidad del scraper Sabadell VISA (tarjetas de crédito, #147). Alimenta la
// infra compartida (markers/notify/webhook) y el renderer de estado. Un scraper
// Sabadell nuevo aporta su propio descriptor con esta misma forma.

export const DESCRIPTOR = {
  // Prefijo de los ficheros de estado en ~/Library/Logs/fin-app
  // (marker de éxito, aviso, dumps de fallo).
  name: 'sabadell-visa',
  // Nombre legible para la cabecera del status.
  displayName: 'Sabadell VISA',
  // Prefijo de las líneas de consola del scraper.
  logPrefix: 'sabadell-scrape',
  // `source` del webhook unificado de fallos /api/scrapers/notify (#177).
  notifySource: 'sabadell_visa',
  // Env var del secreto Bearer compartido (webhook de datos + de fallos).
  secretEnv: 'SABADELL_VISA_WEBHOOK_SECRET',
  // Ruta del webhook de datos al que se hace POST del payload.
  webhookPath: '/api/sabadell-visa',
  // Comando de re-enrolado que se sugiere ante OTP.
  loginCommand: 'pnpm scrape:sabadell-visa:login',
  // Agente launchd y basename de sus logs (usados por el status).
  agentLabel: 'com.fin-app.sabadell-visa-scraper',
  logBasename: 'sabadell-visa-scraper',
  // Textos de los avisos de fallo de login (#212).
  notifyText: {
    session_expired: {
      title: 'Sabadell VISA: sesión caducada',
      body: 'Ejecuta pnpm scrape:sabadell-visa:login para re-enrolar el dispositivo.',
    },
    login_failed: {
      title: 'Sabadell VISA: login fallido',
      body: 'El acceso fue rechazado varias veces (posible bloqueo temporal). Reintenta más tarde.',
    },
    // Fallo de scraping/webhook (exit 4/3): el banco cambió el DOM o el POST falló (#295).
    scrape_failed: {
      title: 'Sabadell VISA: fallo de sincronización',
      body: 'El scraper no pudo traer datos. Revisa el estado con pnpm cron:sabadell-visa:status.',
    },
  },
}
