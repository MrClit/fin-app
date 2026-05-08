import type { CategoryId } from '@/types'

export const AUTO_RULES: { pattern: RegExp; category: CategoryId }[] = [
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|eroski/i, category: 'groceries' },
  { pattern: /netflix|spotify|hbo|disney|amazon prime/i,    category: 'leisure'   },
  { pattern: /repsol|cepsa|bp\b|galp|campsa/i,              category: 'transport' },
  { pattern: /farmacia|clinica|hospital|sanitas|adeslas/i,  category: 'health'    },
  { pattern: /nomina|salario|payroll/i,                     category: 'income'    },
]

export function categorize(description: string): CategoryId | null {
  for (const rule of AUTO_RULES) {
    if (rule.pattern.test(description)) return rule.category
  }
  return null
}
