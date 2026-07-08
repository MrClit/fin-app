#!/usr/bin/env bash
# Wrapper que launchd ejecuta en lugar del scraper directo (#256): pone al día
# el worktree de cron fijado a origin/main y lanza el scraper con `exec`, de
# forma que su exit code (1 config / 2 sesión caducada / 3 webhook / 4 fallo de
# scraping, #295) llega intacto a launchd y las notificaciones existentes no se
# ven afectadas.
#
# La fase de update es best-effort: si falla la red o el install, avisa por
# stderr (→ *-scraper.err.log) y ejecuta la copia actual del worktree — que
# siempre es una release completa de main. Abortar aquí sería un fallo
# silencioso, justo lo que #295 eliminó.
#
# Uso: cron-wrapper.sh <script-pnpm>
#   p. ej. cron-wrapper.sh scrape:edenred
#
# Sin `set -e` a propósito: los fallos de la fase de update se gestionan con
# guards explícitos para no impedir la ejecución del scraper.
set -uo pipefail

warn() {
  echo "[cron-wrapper] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

main() {
  local task="${1:-}"
  if [[ -z "$task" ]]; then
    warn "falta el script pnpm a ejecutar (p. ej. scrape:edenred)"
    exit 1
  fi

  # El wrapper vive en <worktree>/scripts/scrapers/, así que el worktree es ../..
  local worktree
  worktree="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" || exit 1
  cd "$worktree" || exit 1

  if ! command -v pnpm >/dev/null; then
    warn "pnpm no está en el PATH"
    exit 1
  fi

  # Guard: el worktree de cron está siempre detached (el setup usa --detach).
  # Si hay una rama activa, esto es un checkout de desarrollo: jamás hacer
  # reset --hard aquí — ejecutar tal cual, sin update.
  if git symbolic-ref -q HEAD >/dev/null; then
    warn "rama activa detectada (¿checkout de desarrollo?); salto el update"
    exec pnpm run "$task"
  fi

  # Lock para la fase de update: con RunAtLoad=true, tras un reboot los tres
  # agentes arrancan a la vez sobre este mismo worktree y solo uno debe
  # actualizarlo. mkdir es atómico; el pid permite detectar locks huérfanos.
  local lock_dir="$worktree/.cron-update.lock"
  local waited=0 owner_pid
  while ! mkdir "$lock_dir" 2>/dev/null; do
    owner_pid="$(cat "$lock_dir/pid" 2>/dev/null || true)"
    if [[ -n "$owner_pid" ]] && ! kill -0 "$owner_pid" 2>/dev/null; then
      warn "lock huérfano (pid $owner_pid muerto); lo libero"
      rm -rf "$lock_dir"
      continue
    fi
    if (( waited >= 600 )); then
      warn "lock ocupado >10 min; salto el update y ejecuto la copia actual"
      exec pnpm run "$task"
    fi
    sleep 5
    waited=$((waited + 5))
  done
  echo $$ > "$lock_dir/pid"
  trap 'rm -rf "$lock_dir"' EXIT

  # Update best-effort a origin/main. Solo hay trabajo real tras una release.
  if git fetch --quiet origin main; then
    if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
      warn "actualizando a origin/main ($(git rev-parse --short origin/main))"
      # reset --hard no toca lo gitignored: los symlinks de secretos/sesión
      # (.env.scrapers, storage-state, .userdata) quedan intactos.
      if git reset --hard --quiet origin/main; then
        pnpm install --frozen-lockfile --silent \
          || warn "pnpm install falló; sigo con el node_modules actual"
        # pnpm 10 bloquea el postinstall de Playwright (sin onlyBuiltDependencies),
        # así que los browsers salen de la cache global ~/Library/Caches/ms-playwright.
        # Esto solo descarga algo si la release bumpeó la versión de Playwright.
        pnpm exec playwright install chromium \
          || warn "playwright install falló; sigo con el browser en cache"
      else
        warn "git reset falló; ejecuto la copia actual"
      fi
    fi
  else
    warn "git fetch falló (¿sin red?); ejecuto la copia actual"
  fi

  # exec no dispara el trap EXIT: liberar el lock explícitamente antes.
  rm -rf "$lock_dir"
  trap - EXIT
  exec pnpm run "$task"
}

# Última línea a propósito: bash parsea main() entera antes de ejecutarla, así
# el `git reset --hard` de arriba no puede rompernos aunque reescriba este
# mismo fichero a mitad de ejecución.
main "$@"
