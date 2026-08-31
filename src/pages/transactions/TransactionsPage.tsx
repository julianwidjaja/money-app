import { useState, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/icons'
import { ListOrdered, ArrowLeftRight, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns'

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const categoryParam = searchParams.get('category')
  const startFilter = searchParams.get('start')
  const endFilter = searchParams.get('end')
  const monthParam = searchParams.get('month')

  const currentDate = useMemo(() => {
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    if (startFilter) return new Date(startFilter + 'T00:00:00')
    return new Date()
  }, [monthParam, startFilter])

  function setCurrentDate(updater: (d: Date) => Date) {
    const next = updater(currentDate)
    const val = format(next, 'yyyy-MM')
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('month', val)
      return next
    }, { replace: true })
  }

  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || '')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedType, setSelectedType] = useState<TypeFilter>('all')

  const { categories, expenseCategories, incomeCategories } = useCategories()
  const { accounts } = useAccounts()

  const activeCategoryId = categoryParam || selectedCategory || undefined
  const filterCategory = activeCategoryId ? categories.find(c => c.id === activeCategoryId) : null
  const allCategories = [...expenseCategories, ...incomeCategories]

  const dateRange = useMemo(() => {
    if (startFilter && endFilter) {
      return { startDate: startFilter, endDate: endFilter }
    }
    return {
      startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
    }
  }, [currentDate, startFilter, endFilter])

  const fetchOptions = useMemo(() => ({
    ...dateRange,
    ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
    ...(selectedAccount ? { accountId: selectedAccount } : {}),
  }), [dateRange, activeCategoryId, selectedAccount])

  const { transactions, loading } = useTransactions(fetchOptions)

  const filteredTransactions = useMemo(() => {
    if (selectedType === 'all') return transactions
    return transactions.filter(tx => {
      if (selectedType === 'transfer') return tx.type === 'transfer'
      if (selectedType === 'expense') return tx.type === 'simple' && tx.entries.some(e => e.type === 'expense') || tx.type === 'split'
      if (selectedType === 'income') return tx.type === 'simple' && tx.entries.some(e => e.type === 'income')
      return true
    })
  }, [transactions, selectedType])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof filteredTransactions>()
    for (const tx of filteredTransactions) {
      const list = groups.get(tx.date) || []
      list.push(tx)
      groups.set(tx.date, list)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredTransactions])

  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 11; i >= -1; i--) {
      const d = subMonths(now, i)
      options.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
      })
    }
    return options
  }, [])

  const currentMonthValue = format(currentDate, 'yyyy-MM')

  function handleMonthSelect(value: string | null) {
    if (value == null) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('month', value)
      return next
    }, { replace: true })
  }

  function clearCategoryParam() {
    navigate(-1)
  }

  const hasActiveFilters = selectedCategory || selectedAccount || selectedType !== 'all'

  function clearAllFilters() {
    setSelectedCategory('')
    setSelectedAccount('')
    setSelectedType('all')
  }

  const hasDateFilter = !!(startFilter && endFilter)

  const categoryItems = [
    { value: '__all__', label: 'All categories' },
    ...allCategories.map(c => ({ value: c.id, label: c.name })),
  ]
  const accountItems = [
    { value: '__all__', label: 'All accounts' },
    ...accounts.map(a => ({ value: a.id, label: a.name })),
  ]
  const typeItems = [
    { value: 'all', label: 'All types' },
    { value: 'expense', label: 'Expenses' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfers' },
  ]

  return (
    <div className="space-y-4 py-4">
      {categoryParam && filterCategory && (
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = getCategoryIcon(filterCategory.icon)
            return (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: filterCategory.color + '20' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: filterCategory.color }} />
                </div>
                <span className="text-sm font-medium truncate">{filterCategory.name}</span>
              </div>
            )
          })()}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={clearCategoryParam}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {!hasDateFilter && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={currentMonthValue} onValueChange={handleMonthSelect} items={monthOptions}>
            <SelectTrigger className="w-auto border-none shadow-none font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Filter toggle */}
      {!categoryParam && (
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-primary-foreground/20 rounded-full px-1.5 text-[10px]">
                {(selectedCategory ? 1 : 0) + (selectedAccount ? 1 : 0) + (selectedType !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={clearAllFilters}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Filter dropdowns */}
      {showFilters && !categoryParam && (
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={selectedType}
            onValueChange={(v) => v != null && setSelectedType(v as TypeFilter)}
            items={typeItems}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {typeItems.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedCategory || '__all__'}
            onValueChange={(v) => v != null && setSelectedCategory(v === '__all__' ? '' : v)}
            items={categoryItems}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAccount || '__all__'}
            onValueChange={(v) => v != null && setSelectedAccount(v === '__all__' ? '' : v)}
            items={accountItems}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              {accountItems.map(a => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No transactions"
          description={filterCategory
            ? `No ${filterCategory.name} transactions found for this period`
            : `No transactions for ${format(currentDate, 'MMMM yyyy')}`}
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, txs]) => {
            const dayTotal = txs.reduce((sum, tx) => {
              if (selectedAccount) {
                return sum + tx.entries.filter(e => e.account_id === selectedAccount).reduce((s, e) => {
                  if (['income', 'transfer_in', 'reimbursement'].includes(e.type)) return s + e.amount
                  if (['expense', 'transfer_out'].includes(e.type)) return s - e.amount
                  return s
                }, 0)
              }
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
                <div className="flex flex-col gap-2">
                  {txs.map(tx => {
                    const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income') || tx.entries[0]
                    if (!mainEntry) return null
                    const cat = mainEntry.category
                    const isTransfer = tx.type === 'transfer'

                    let displayAmount: number
                    let isExpense: boolean
                    if (selectedAccount) {
                      const netForAccount = tx.entries.filter(e => e.account_id === selectedAccount).reduce((s, e) => {
                        if (['income', 'transfer_in', 'reimbursement'].includes(e.type)) return s + e.amount
                        if (['expense', 'transfer_out'].includes(e.type)) return s - e.amount
                        return s
                      }, 0)
                      displayAmount = Math.abs(netForAccount)
                      isExpense = netForAccount < 0
                    } else {
                      displayAmount = mainEntry.personal_amount ?? mainEntry.amount
                      isExpense = mainEntry.type === 'expense'
                    }

                    const Icon = isTransfer ? ArrowLeftRight : getCategoryIcon(cat?.icon)

                    return (
                      <Link key={tx.id} to={`/transactions/${tx.id}`} className="block">
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
                                {isTransfer && (tx.entries.filter(e => e.type === 'transfer_out').length > 1 || tx.entries.filter(e => e.type === 'transfer_in').length > 1)
                                  ? `${tx.entries.filter(e => e.type === 'transfer_out').length} → ${tx.entries.filter(e => e.type === 'transfer_in').length} accounts`
                                  : mainEntry.account?.name}
                                {tx.type === 'split' && ` · Split (${formatCurrency(displayAmount)} yours)`}
                              </p>
                            </div>
                            {selectedAccount ? (
                              <CurrencyDisplay
                                cents={displayAmount}
                                type={isExpense ? 'expense' : 'income'}
                              />
                            ) : !isTransfer ? (
                              <CurrencyDisplay
                                cents={displayAmount}
                                type={isExpense ? 'expense' : 'income'}
                              />
                            ) : (
                              <CurrencyDisplay cents={tx.entries.filter(e => e.type === 'transfer_out').reduce((s, e) => s + e.amount, 0)} type="neutral" showSign={false} />
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
