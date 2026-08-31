import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { getCategoryIcon } from '@/lib/icons'
import { ListOrdered, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns'

export function AccountDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { accounts } = useAccounts()
  const account = accounts.find(a => a.id === id)

  const monthParam = searchParams.get('month')
  const currentDate = useMemo(() => {
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  }, [monthParam])

  function setCurrentDate(updater: (d: Date) => Date) {
    const next = updater(currentDate)
    setSearchParams({ month: format(next, 'yyyy-MM') }, { replace: true })
  }

  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')

  const { transactions, loading } = useTransactions({
    accountId: id,
    startDate: monthStart,
    endDate: monthEnd,
  })

  const [startBalance, setStartBalance] = useState<number | null>(null)

  useEffect(() => {
    async function loadStartBalance() {
      if (!user || !id || !account) return

      const { data } = await supabase
        .from('transaction_entries')
        .select('type, amount, group:transaction_groups!inner(date)')
        .eq('account_id', id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .lt('group.date' as any, monthStart)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const beforeTotal = (data || []).reduce((sum: number, e: any) => {
        if (['income', 'transfer_in', 'reimbursement'].includes(e.type)) return sum + e.amount
        if (['expense', 'transfer_out'].includes(e.type)) return sum - e.amount
        return sum
      }, 0)

      setStartBalance(account.initial_balance + beforeTotal)
    }
    loadStartBalance()
  }, [user, id, account, monthStart])

  const monthChange = useMemo(() => {
    if (!id) return 0
    return transactions.reduce((sum, tx) => {
      const entries = tx.entries.filter(e => e.account_id === id)
      return sum + entries.reduce((s, e) => {
        if (['income', 'transfer_in', 'reimbursement'].includes(e.type)) return s + e.amount
        if (['expense', 'transfer_out'].includes(e.type)) return s - e.amount
        return s
      }, 0)
    }, 0)
  }, [transactions, id])

  const endBalance = startBalance != null ? startBalance + monthChange : null

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
    setSearchParams({ month: value }, { replace: true })
  }

  if (!account) {
    return <div className="py-12 text-center text-muted-foreground">Account not found</div>
  }

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">{account.name}</p>
          <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        </CardContent>
      </Card>

      {/* Month picker */}
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

      {/* Balance summary */}
      {startBalance != null && endBalance != null && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Start</p>
                <p className={`font-medium ${startBalance < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(startBalance)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Change</p>
                <p className={`font-medium ${monthChange > 0 ? 'text-green-600' : monthChange < 0 ? 'text-destructive' : ''}`}>
                  {monthChange >= 0 ? '+' : ''}{formatCurrency(monthChange)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">End</p>
                <p className={`font-medium ${endBalance < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(endBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CC Funding Breakdown */}
      {account.type === 'credit_card' && transactions.length > 0 && (() => {
        const fundingMap = new Map<string, { name: string; total: number }>()
        let unfunded = 0
        const defaultFundingName = account.default_funding_account_id
          ? accounts.find(a => a.id === account.default_funding_account_id)?.name
          : null

        for (const tx of transactions) {
          for (const e of tx.entries.filter(e => e.account_id === id && e.type === 'expense')) {
            const fid = (e as any).funding_account_id || account.default_funding_account_id
            if (fid) {
              const existing = fundingMap.get(fid)
              const fname = (e as any).funding_account?.name
                || (fid === account.default_funding_account_id ? defaultFundingName : null)
                || accounts.find(a => a.id === fid)?.name
                || 'Unknown'
              if (existing) { existing.total += e.amount }
              else { fundingMap.set(fid, { name: fname, total: e.amount }) }
            } else {
              unfunded += e.amount
            }
          }
        }

        if (fundingMap.size === 0 && unfunded === 0) return null

        return (
          <Card>
            <CardContent className="py-3 px-4 space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Funded By</h3>
              {Array.from(fundingMap.values()).sort((a, b) => b.total - a.total).map(f => (
                <div key={f.name} className="flex justify-between text-sm">
                  <span>{f.name}</span>
                  <span>{formatCurrency(f.total)}</span>
                </div>
              ))}
              {unfunded > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Unfunded</span>
                  <span>{formatCurrency(unfunded)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Transactions</h2>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState icon={ListOrdered} title="No transactions" description={`No transactions for ${format(currentDate, 'MMMM yyyy')}`} />
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map(tx => {
            const entriesForAccount = tx.entries.filter(e => e.account_id === id)
            if (entriesForAccount.length === 0) return null

            const netAmount = entriesForAccount.reduce((sum, e) => {
              if (e.type === 'income' || e.type === 'transfer_in' || e.type === 'reimbursement') return sum + e.amount
              if (e.type === 'expense' || e.type === 'transfer_out') return sum - e.amount
              return sum
            }, 0)

            const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income') || entriesForAccount[0]
            const cat = mainEntry.category
            const isTransfer = entriesForAccount[0].type === 'transfer_out' || entriesForAccount[0].type === 'transfer_in'
            const isNet = netAmount >= 0
            const Icon = isTransfer ? ArrowLeftRight : getCategoryIcon(cat?.icon)

            return (
              <Link key={tx.id} to={`/transactions/${tx.id}`} className="block">
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (cat?.color || '#6b7280') + '20' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cat?.color || '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || cat?.name || 'Transaction'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                        {tx.type === 'split' && ' · Split'}
                      </p>
                    </div>
                    <CurrencyDisplay
                      cents={Math.abs(netAmount)}
                      type={isNet ? 'income' : 'expense'}
                    />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
