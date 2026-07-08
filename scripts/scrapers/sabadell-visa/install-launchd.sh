#!/usr/bin/env bash
# Instala (o desinstala) el agente launchd que ejecuta el scraper de Sabadell VISA
# una vez al día. Define varios slots horarios para tolerar que el Mac esté
# dormido en algunos: el primero que pille la máquina despierta ejecuta; los
# siguientes salen no-op gracias al guard SABADELL_CRON=1 (marker diario en
# ~/Library/Logs/fin-app), SIN abrir Chrome. RunAtLoad dispara un intento al
# instalar/reiniciar.
#
# IMPORTANTE: el scraper corre HEADED (Sabadell bloquea Chrome headless vía WAF),
# así que el agente abre una ventana de Chrome en la sesión gráfica del usuario.
# Requisito previo (una vez): `pnpm scrape:sabadell:login` para enrolar el
# dispositivo de confianza (login con OTP). Luego el cron entra solo (DNI+PIN).
#
# Por defecto el agente ejecuta el worktree de cron fijado a origin/main vía
# cron-wrapper.sh (#256), alineado con lo desplegado en Vercel e independiente
# de la rama activa en la carpeta de desarrollo. Requiere haber creado antes el
# worktree con scripts/scrapers/setup-cron-worktree.sh. Con --dev se instala el
# modo antiguo: ejecutar directamente este checkout (la rama que esté activa).
#
# Uso:
#   ./scripts/scrapers/sabadell-visa/install-launchd.sh             # instalar (pinned a origin/main)
#   ./scripts/scrapers/sabadell-visa/install-launchd.sh --dev       # instalar sobre este checkout
#   ./scripts/scrapers/sabadell-visa/install-launchd.sh --uninstall # desinstalar

set -euo pipefail

LABEL="com.fin-app.sabadell-visa-scraper"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/fin-app"

if [[ "${1:-}" == "--uninstall" ]]; then
  if [[ -f "$PLIST" ]]; then
    launchctl unload "$PLIST" 2>/dev/null || true
    rm "$PLIST"
    echo "Desinstalado: $PLIST"
  else
    echo "No estaba instalado."
  fi
  exit 0
fi

if [[ -n "${1:-}" && "${1:-}" != "--dev" ]]; then
  echo "Error: flag desconocido '${1}'. Usa --dev o --uninstall." >&2
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PNPM_BIN="$(command -v pnpm || true)"
if [[ -z "$PNPM_BIN" ]]; then
  echo "Error: pnpm no está en el PATH. Instálalo antes (https://pnpm.io/installation)." >&2
  exit 1
fi

if [[ "${1:-}" == "--dev" ]]; then
  WORK_DIR="$PROJECT_DIR"
  PROGRAM_ARGUMENTS="    <string>$PNPM_BIN</string>
    <string>scrape:sabadell-visa</string>"
  MODE="dev (este checkout: $WORK_DIR)"
else
  WORK_DIR="${FIN_APP_CRON_WORKTREE:-$HOME/Projects/fin-app-cron}"
  WRAPPER="$WORK_DIR/scripts/scrapers/cron-wrapper.sh"
  if [[ ! -f "$WRAPPER" ]]; then
    echo "Error: no existe $WRAPPER." >&2
    echo "Crea antes el worktree de cron: ./scripts/scrapers/setup-cron-worktree.sh" >&2
    echo "(o instala en modo dev sobre este checkout con: $0 --dev)" >&2
    exit 1
  fi
  PROGRAM_ARGUMENTS="    <string>/bin/bash</string>
    <string>$WRAPPER</string>
    <string>scrape:sabadell-visa</string>"
  MODE="pinned a origin/main (worktree: $WORK_DIR)"
fi

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
$PROGRAM_ARGUMENTS
  </array>
  <key>WorkingDirectory</key>
  <string>$WORK_DIR</string>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>13</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>16</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>19</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>22</integer><key>Minute</key><integer>30</integer></dict>
  </array>
  <!-- Intento inmediato al instalar/reiniciar. El guard del marker diario
       (SABADELL_CRON=1) hace no-op si ya hubo un éxito hoy, sin abrir Chrome. -->
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/sabadell-visa-scraper.out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/sabadell-visa-scraper.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$PNPM_BIN"):/usr/local/bin:/usr/bin:/bin</string>
    <key>SABADELL_CRON</key>
    <string>1</string>
  </dict>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Instalado: $PLIST"
echo "Modo: $MODE"
echo "Verificar: launchctl list | grep $LABEL"
echo "Logs: $LOG_DIR/sabadell-visa-scraper.{out,err}.log"
echo "Estado: pnpm cron:sabadell-visa:status"
echo "Disparar manualmente: launchctl start $LABEL"
echo "Desinstalar: $0 --uninstall"
