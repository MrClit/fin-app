import type { TransactionWithAccount } from '@/types'

export interface TxDayGroup {
  date: string
  transactions: TransactionWithAccount[]
  net: number
}

export function groupTxByDate(txs: TransactionWithAccount[]): TxDayGroup[] {
  const map = new Map<string, TxDayGroup>()
  for (const tx of txs) {
    const existing = map.get(tx.date)
    if (existing) {
      existing.transactions.push(tx)
      existing.net += tx.amount
    } else {
      map.set(tx.date, { date: tx.date, transactions: [tx], net: tx.amount })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function formatDayLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  const yesterdayStr = yest.toISOString().slice(0, 10)
  if (dateStr === today) return 'Hoy'
  if (dateStr === yesterdayStr) return 'Ayer'
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}
