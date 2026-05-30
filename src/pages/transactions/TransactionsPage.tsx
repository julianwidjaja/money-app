import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { useTransactions } from '@/hooks/useTransactions'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/icons'
import { ListOrdered, ArrowLeftRight } from 'lucide-react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

type Period = 'daily' | 'weekly' | 'monthly' | 'all'

export function TransactionsPage() {
  const [period, setPeriod] = useState<Period>('monthly')
  const now = new Date()

  const dateRange = useMemo(() => {
    switch (period) {
      case 'daily':
        const today = format(now, 'yyyy-MM-dd')
        return { startDate: today, endDate: today }
      case 'weekly':
        return {
          startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        }
      case 'monthly':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        }
      case 'all':
        return {}
    }
  }, [period])

  const { transactions, loading } = useTransactions(dateRange)

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof transactions>()
    for (const tx of transactions) {
      const list = groups.get(tx.date) || []
      list.push(tx)
      groups.set(tx.date, list)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions])

  return (
    <div className="space-y-4 py-4">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1">Week</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">Month</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No transactions"
          description={`No transactions found for this ${period === 'all' ? 'period' : period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}`}
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, txs]) => {
            const dayTotal = txs.reduce((sum, tx) => {
              const main = tx.entries.find(e => e.type === 'expense' || e.type === 'income')
              if (!main) return sum
              const amount = main.personal_amount ?? main.amount
              return sum + (main.type === 'expense' ? -amount : amount)
            }, 0)

            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium text-muted-foreground">{formatDate(date, 'long')}</span>
                  <span className="text-xs text-muted-foreground">{formatCurrency(dayTotal)}</span>
                </div>
                <div className="space-y-1.5">
                  {txs.map(tx => {
                    const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income') || tx.entries[0]
                    if (!mainEntry) return null
                    const cat = mainEntry.category
                    const isTransfer = tx.type === 'transfer'
                    const isExpense = mainEntry.type === 'expense'
                    const displayAmount = mainEntry.personal_amount ?? mainEntry.amount
                    const Icon = isTransfer ? ArrowLeftRight : getCategoryIcon(cat?.icon)

                    return (
                      <Link key={tx.id} to={`/transactions/${tx.id}`}>
                        <Card className="hover:bg-accent/50 transition-colors">
                          <CardContent className="flex items-center gap-3 py-3 px-4">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: isTransfer ? '#6b728020' : (cat?.color || '#6b7280') + '20' }}
                            >
                              <Icon className="w-4 h-4" style={{ color: isTransfer ? '#6b7280' : (cat?.color || '#6b7280') }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {tx.description || cat?.name || (isTransfer ? 'Transfer' : 'Transaction')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {mainEntry.account?.name}
                                {tx.type === 'split' && ` · Split (${formatCurrency(displayAmount)} yours)`}
                              </p>
                            </div>
                            {!isTransfer && (
                              <CurrencyDisplay
                                cents={displayAmount}
                                type={isExpense ? 'expense' : 'income'}
                              />
                            )}
                            {isTransfer && (
                              <CurrencyDisplay cents={mainEntry.amount} type="neutral" showSign={false} />
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
