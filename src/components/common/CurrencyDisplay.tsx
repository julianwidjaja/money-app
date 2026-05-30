import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  cents: number
  type?: 'income' | 'expense' | 'neutral'
  className?: string
  showSign?: boolean
}

export function CurrencyDisplay({ cents, type = 'neutral', className, showSign = true }: CurrencyDisplayProps) {
  const formatted = formatCurrency(Math.abs(cents))
  const prefix = showSign && type === 'income' ? '+' : showSign && type === 'expense' ? '-' : ''

  return (
    <span className={cn(
      'font-medium tabular-nums',
      type === 'income' && 'text-success',
      type === 'expense' && 'text-destructive',
      className,
    )}>
      {prefix}{formatted}
    </span>
  )
}
