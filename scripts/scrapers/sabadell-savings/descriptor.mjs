// Identidad del scraper Sabadell Ahorro (plan de ahorro Bansabadell Vida, #197).
// Comparte login, perfil de Chrome y credenciales con Sabadell VISA (mismo módulo
// sabadell-shared); solo cambia el producto que lee, el endpoint y su secreto.

export const DESCRIPTOR = {
  name: 'sabadell-savings',
  displayName: 'Sabadell Ahorro',
  logPrefix: 'sabadell-savings-scrape',
  notifySource: 'sabadell_savings',
  secretEnv: 'SABADELL_SAVINGS_WEBHOOK_SECRET',
  webhookPath: '/api/sabadell-savings',
  // El login/enrolado es compartido: se hace con el comando de la VISA.
  loginCommand: 'pnpm scrape:sabadell-visa:login',
  agentLabel: 'com.fin-app.sabadell-savings-scraper',
  logBasename: 'sabadell-savings-scraper',
  notifyText: {
    session_expired: {
      title: 'Sabadell Ahorro: sesión caducada',
      body: 'Ejecuta pnpm scrape:sabadell-visa:login para re-enrolar el dispositivo.',
    },
    login_failed: {
      title: 'Sabadell Ahorro: login fallido',
      body: 'El acceso fue rechazado varias veces (posible bloqueo temporal). Reintenta más tarde.',
    },
    // Fallo de scraping/webhook (exit 4/3): el banco cambió el DOM o el POST falló (#295).
    scrape_failed: {
      title: 'Sabadell Ahorro: fallo de sincronización',
      body: 'El scraper no pudo traer datos. Revisa el estado con pnpm cron:sabadell-savings:status.',
    },
  },
}
