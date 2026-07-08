#!/usr/bin/env bash
# Setup one-shot (y re-ejecutable) del worktree de cron fijado a origin/main (#256).
#
# Crea un git worktree hermano del checkout de desarrollo, detached en
# origin/main, desde el que los agentes launchd ejecutan los scrapers vía
# cron-wrapper.sh — independientemente de la rama activa en desarrollo.
# Los ficheros gitignored (secretos y sesiones) NO existen en un worktree
# nuevo: se symlinkan hacia el checkout de desarrollo, que queda como única
# fuente de verdad (re-loguear desde dev actualiza ambos árboles).
#
# Uso (desde el checkout de desarrollo):
#   ./scripts/scrapers/setup-cron-worktree.sh
#
# Ruta del worktree configurable: FIN_APP_CRON_WORKTREE (default ~/Projects/fin-app-cron).

set -euo pipefail

DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREE="${FIN_APP_CRON_WORKTREE:-$HOME/Projects/fin-app-cron}"

echo "Checkout de desarrollo: $DEV_DIR"
echo "Worktree de cron:       $WORKTREE"

git -C "$DEV_DIR" fetch origin main

if [[ ! -e "$WORKTREE" ]]; then
  git -C "$DEV_DIR" worktree add --detach "$WORKTREE" origin/main
else
  # Guard: no tocar la carpeta si no es un worktree de ESTE repo.
  common_dev="$(git -C "$DEV_DIR" rev-parse --path-format=absolute --git-common-dir)"
  common_wt="$(git -C "$WORKTREE" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [[ -z "$common_wt" || "$common_wt" != "$common_dev" ]]; then
    echo "Error: $WORKTREE existe pero no es un worktree de $DEV_DIR. Resuélvelo a mano." >&2
    exit 1
  fi
  git -C "$WORKTREE" reset --hard origin/main
fi

# Symlinks de los ficheros gitignored que necesitan los scrapers. `ln -sfn`
# reemplaza el symlink si ya existe (idempotente). Un symlink dangling (p. ej.
# los .bak aún no creados) es válido: la primera escritura crea el target en dev.
link() {
  local target="$1" dest="$2"
  if [[ -e "$dest" && ! -L "$dest" ]]; then
    echo "Error: $dest existe y no es un symlink (¿se hizo login desde el worktree?)." >&2
    echo "Compáralo con $target, conserva el más reciente en el checkout de desarrollo y borra el del worktree." >&2
    exit 1
  fi
  ln -sfn "$target" "$dest"
  echo "  symlink: $dest -> $target"
}

echo "Symlinks de secretos y sesiones:"
link "$DEV_DIR/.env.scrapers" "$WORKTREE/.env.scrapers"
link "$DEV_DIR/scripts/scrapers/edenred/storage-state.json" "$WORKTREE/scripts/scrapers/edenred/storage-state.json"
link "$DEV_DIR/scripts/scrapers/edenred/storage-state.json.bak" "$WORKTREE/scripts/scrapers/edenred/storage-state.json.bak"
link "$DEV_DIR/scripts/scrapers/sabadell-shared/storage-state.json" "$WORKTREE/scripts/scrapers/sabadell-shared/storage-state.json"
link "$DEV_DIR/scripts/scrapers/sabadell-shared/storage-state.json.bak" "$WORKTREE/scripts/scrapers/sabadell-shared/storage-state.json.bak"
# Perfil persistente de Chrome (enrolado del banco, caro de regenerar): symlink
# de directorio; asegurar que el target existe para que Chrome pueda escribir.
mkdir -p "$DEV_DIR/scripts/scrapers/sabadell-shared/.userdata"
link "$DEV_DIR/scripts/scrapers/sabadell-shared/.userdata" "$WORKTREE/scripts/scrapers/sabadell-shared/.userdata"

echo "Instalando dependencias en el worktree (pnpm comparte el store global)..."
(cd "$WORKTREE" && pnpm install --frozen-lockfile)
# pnpm 10 bloquea el postinstall de Playwright: instalar el browser explícitamente
# (no-op instantáneo si ya está en la cache global compartida con dev).
(cd "$WORKTREE" && pnpm exec playwright install chromium)

# Reconfigurar los agentes launchd con los instaladores DEL WORKTREE (la versión
# released). Hasta que esta issue llegue a origin/main vía release, el wrapper
# no existe ahí: en ese caso avisar y dejar los agentes actuales como están.
if [[ ! -f "$WORKTREE/scripts/scrapers/cron-wrapper.sh" ]]; then
  echo ""
  echo "⚠ cron-wrapper.sh aún no está en origin/main (falta cortar release)."
  echo "  Los agentes launchd NO se han reconfigurado; siguen apuntando a su setup actual."
  echo "  Vuelve a ejecutar este script tras la próxima release develop → main."
  exit 0
fi

echo "Reconfigurando los agentes launchd (modo pinned):"
for scraper in edenred sabadell-visa sabadell-savings; do
  FIN_APP_CRON_WORKTREE="$WORKTREE" "$WORKTREE/scripts/scrapers/$scraper/install-launchd.sh"
done

echo ""
echo "Listo. El cron ejecuta ahora origin/main desde $WORKTREE."
echo "Estado: pnpm cron:edenred:status / cron:sabadell-visa:status / cron:sabadell-savings:status"
