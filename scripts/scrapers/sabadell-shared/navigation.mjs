// Navegación común del webflow legacy de Sabadell.
//
// Los deep-links directos están bloqueados por el WAF; hay que llegar a cada
// sección clicando su enlace en el menú. Ese webflow es sensible al timing: el
// enlace puede no estar (página a medio cargar) o el click no cuajar. El patrón
// robusto (capturado en #212 para tarjetas) es: si el menú no trae el enlace o el
// destino no aparece, RECARGAR la posición global (que siempre trae el menú) y
// reintentar, en vez de sólo esperar. Se generaliza aquí para tarjetas, ahorro y
// futura hipoteca.

// Navega a una sección clicando el enlace del menú que casa `hrefPattern` y espera
// a que aparezca `readySelector`. Reintenta recargando `homeUrl`. Sale (die) si no
// lo consigue tras `maxAttempts`.
export async function navigateFromMenu(page, {
  hrefPattern,          // selector del enlace de menú, p.ej. 'a[href*="TJMovementsQueryDebt.init.bs"]'
  readySelector,        // selector que confirma que la sección cargó, p.ej. '#cardAccountTable'
  homeUrl,              // posición global a la que recargar entre reintentos
  infra,                // helpers dump/die del scraper
  readyTimeout = 12000,
  maxAttempts = 4,
  failTag = 'nav-no-target',
  failMsg = 'No se encontró el destino de navegación en el menú',
  debug = false,
  debugTag,             // tag de dump en éxito cuando debug=true
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const link = page.locator(hrefPattern).first()
    if (!(await link.count().catch(() => 0))) {
      // El menú no está: recargar la posición global, que siempre lo trae.
      await page.goto(homeUrl, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(1000)
      continue
    }
    await link.click().catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    try {
      await page.locator(readySelector).first().waitFor({ state: 'attached', timeout: readyTimeout })
      if (debug && debugTag) await infra.dump(page, debugTag)
      return
    } catch {
      // Click hecho pero el destino no apareció: volver a la posición global para
      // reintentar el clic desde un estado limpio.
      if (attempt < maxAttempts) {
        await page.goto(homeUrl, { waitUntil: 'domcontentloaded' }).catch(() => {})
        await page.waitForTimeout(1000)
      }
    }
  }
  await infra.dump(page, failTag)
  infra.die(4, failMsg)
}
