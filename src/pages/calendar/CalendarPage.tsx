import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns'
import { Link } from 'react-router'

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = format(monthStart, 'yyyy-MM-dd')
  const endDate = format(monthEnd, 'yyyy-MM-dd')

  const { transactions } = useTransactions({ startDate, endDate })

  const txByDate = useMemo(() => {
    const map = new Map<string, typeof transactions>()
    for (const tx of transactions) {
      const list = map.get(tx.date) || []
      list.push(tx)
      map.set(tx.date, list)
    }
    return map
  }, [transactions])

  const calendarDays = useMemo(() => {
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedTxs = selectedDateStr ? txByDate.get(selectedDateStr) || [] : []

  function handleDayClick(day: Date) {
    setSelectedDate(day)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-medium">{format(currentDate, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayTxs = txByDate.get(dateStr) || []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, new Date())
              const hasExpense = dayTxs.some(tx => tx.entries.some(e => e.type === 'expense'))
              const hasIncome = dayTxs.some(tx => tx.entries.some(e => e.type === 'income'))

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-md text-sm transition-colors relative',
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && dayTxs.length > 0 && 'bg-accent hover:bg-accent/80',
                    !isToday && dayTxs.length === 0 && 'hover:bg-muted',
                  )}
                >
                  {format(day, 'd')}
                  {dayTxs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasExpense && <div className="w-1 h-1 rounded-full bg-destructive" />}
                      {hasIncome && <div className="w-1 h-1 rounded-full bg-success" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && formatDate(selectedDate, 'long')}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4 overflow-y-auto">
            {selectedTxs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions on this day</p>
            ) : (
              selectedTxs.map(tx => {
                const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income') || tx.entries[0]
                if (!mainEntry) return null
                const cat = mainEntry.category
                const isExpense = mainEntry.type === 'expense'
                const amount = mainEntry.personal_amount ?? mainEntry.amount
                const Icon = getCategoryIcon(cat?.icon)

                return (
                  <Link key={tx.id} to={`/transactions/${tx.id}`} onClick={() => setSheetOpen(false)}>
                    <Card className="hover:bg-accent/50 transition-colors">
                      <CardContent className="flex items-center gap-3 py-3 px-4">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: (cat?.color || '#6b7280') + '20' }}>
                          <Icon className="w-4 h-4" style={{ color: cat?.color || '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description || cat?.name || 'Transaction'}</p>
                          <p className="text-xs text-muted-foreground">{mainEntry.account?.name}</p>
                        </div>
                        <CurrencyDisplay cents={amount} type={isExpense ? 'expense' : 'income'} />
                      </CardContent>
                    </Card>
                  </Link>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
