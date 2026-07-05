#!/usr/bin/env node
// Estado del cron de Sabadell Ahorro — resumen del último éxito, últimos logs y
// estado del agente launchd. Uso: pnpm cron:sabadell-savings:status

import { printStatus } from '../sabadell-shared/status.mjs'
import { DESCRIPTOR } from './descriptor.mjs'

printStatus(DESCRIPTOR)
