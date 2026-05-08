import { CATEGORY_META } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import type { CategoryId, TransactionWithAccount } from '@/types'

interface TxRowProps {
  tx: TransactionWithAccount
}

export function TxRow({ tx }: TxRowProps) {
  const effectiveCategory = (tx.category_manual ?? tx.category ?? 'other') as CategoryId
  const meta = CATEGORY_META[effectiveCategory] ?? CATEGORY_META.other
  const Icon = meta.Icon

  const absAmount = fmt(Math.abs(tx.amount), 2)
  const amountStr = (tx.amount > 0 ? '+' : '-') + absAmount + ' €'
  const amountColor = tx.amount > 0 ? '#22c55e' : '#ef4444'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
      <div
        className="flex items-center justify-center rounded-[14px] shrink-0"
        style={{
          width: 42,
          height: 42,
          background: meta.color + '18',
        }}
      >
        <Icon size={18} style={{ color: meta.color }} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="rounded-full shrink-0"
            style={{ width: 7, height: 7, background: meta.color }}
          />
          <span className="text-[11px] text-muted-foreground truncate">{meta.label}</span>
        </div>
      </div>

      <span
        className="text-[15px] font-bold shrink-0"
        style={{ color: amountColor }}
      >
        {amountStr}
      </span>
    </div>
  )
}
