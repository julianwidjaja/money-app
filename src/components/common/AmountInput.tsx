import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AmountInputProps {
  value: number
  onChange: (cents: number) => void
  className?: string
  placeholder?: string
}

export function AmountInput({ value, onChange, className, placeholder = '0.00' }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? (value / 100).toFixed(2) : ''
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    if (parts.length > 2) return

    if (parts[1] && parts[1].length > 2) return

    setDisplayValue(raw)
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      onChange(Math.round(num * 100))
    } else if (raw === '' || raw === '.') {
      onChange(0)
    }
  }

  function handleBlur() {
    if (value > 0) {
      setDisplayValue((value / 100).toFixed(2))
    } else {
      setDisplayValue('')
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn('pl-7 text-right text-lg', className)}
      />
    </div>
  )
}
