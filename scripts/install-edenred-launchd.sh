#!/usr/bin/env bash
# Instala (o desinstala) el agente launchd que ejecuta el scraper de Edenred
# cada día a las 07:00 hora local.
#
# Uso:
#   ./scripts/install-edenred-launchd.sh             # instalar
#   ./scripts/install-edenred-launchd.sh --uninstall # desinstalar

set -euo pipefail

LABEL="com.fin-app.edenred-scraper"
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

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PNPM_BIN="$(command -v pnpm || true)"
if [[ -z "$PNPM_BIN" ]]; then
  echo "Error: pnpm no está en el PATH. Instálalo antes (https://pnpm.io/installation)." >&2
  exit 1
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
    <string>$PNPM_BIN</string>
    <string>scrape:edenred</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$PROJECT_DIR</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>7</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/edenred-scraper.out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/edenred-scraper.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$PNPM_BIN"):/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Instalado: $PLIST"
echo "Verificar: launchctl list | grep $LABEL"
echo "Logs: $LOG_DIR/edenred-scraper.{out,err}.log"
echo "Disparar manualmente: launchctl start $LABEL"
echo "Desinstalar: $0 --uninstall"
