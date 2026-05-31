import { useEffect } from 'react'
import { Link } from 'react-router'
import { useAccountBalances } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useRecurring } from '@/hooks/useRecurring'
import { useCategorySpending } from '@/hooks/useCategorySpending'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, formatDate, getYearMonth } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { Wallet, ArrowRight, TrendingDown } from 'lucide-react'
import { getCategoryIcon } from '@/lib/icons'

export function DashboardPage() {
  const { balances, loading: balancesLoading } = useAccountBalances()
  const { transactions, loading: txLoading } = useTransactions({ limit: 5 })
  const { budgetStatus } = useBudgets()
  const { generatePendingTransactions } = useRecurring()

  const now = new Date()
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`
  const { spending } = useCategorySpending(startOfMonth, endOfMonth)

  useEffect(() => {
    generatePendingTransactions()
  }, [])

  const totalBalance = balances.reduce((sum, b) => sum + b.current_balance, 0)
  const totalSpending = spending.reduce((sum, s) => sum + s.personal_total, 0)

  return (
    <div className="space-y-6 py-4">
      {/* Net Balance */}
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      {/* Accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Accounts</h2>
          <Link to="/accounts" className="text-xs text-primary">View all</Link>
        </div>
        {balancesLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
          </div>
        ) : balances.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <EmptyState
                icon={Wallet}
                title="No accounts yet"
                description="Add your first account to start tracking"
                action={<Link to="/accounts"><Button size="sm">Add Account</Button></Link>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {balances.map(b => (
              <Link key={b.account_id} to={`/accounts/${b.account_id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[b.type]}</p>
                    </div>
                    <CurrencyDisplay cents={b.current_balance} type={b.current_balance < 0 ? 'expense' : 'neutral'} showSign={b.current_balance < 0} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Spending */}
      {spending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              This Month's Spending
            </h2>
            <Link to="/reports" className="text-xs text-primary">Details</Link>
          </div>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <CurrencyDisplay cents={totalSpending} type="expense" showSign={false} />
              </div>
              {spending.slice(0, 5).map(s => {
                const Icon = getCategoryIcon(s.icon)
                return (
                  <div key={s.category_id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: s.color + '20' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{s.name}</p>
                    </div>
                    <CurrencyDisplay cents={s.personal_total} type="expense" showSign={false} className="text-sm" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Progress */}
      {budgetStatus.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Budgets</h2>
            <Link to="/budgets" className="text-xs text-primary">View all</Link>
          </div>
          <Card>
            <CardContent className="pt-4 space-y-4">
              {budgetStatus.slice(0, 3).map(b => (
                <div key={b.budget_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{b.category_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(b.spent)} / {formatCurrency(b.budget_limit)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(b.percentage, 100)}
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent</h2>
          <Link to="/transactions" className="text-xs text-primary flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {txLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg" />)}
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <EmptyState
                icon={TrendingDown}
                title="No transactions yet"
                description="Add your first transaction to get started"
                action={<Link to="/transactions/add"><Button size="sm">Add Transaction</Button></Link>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income') || tx.entries[0]
              if (!mainEntry) return null
              const cat = mainEntry.category
              const isExpense = mainEntry.type === 'expense'
              const displayAmount = mainEntry.personal_amount ?? mainEntry.amount
              const Icon = getCategoryIcon(cat?.icon)

              return (
                <Link key={tx.id} to={`/transactions/${tx.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (cat?.color || '#6b7280') + '20' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: cat?.color || '#6b7280' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.description || cat?.name || 'Transaction'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.date)} · {mainEntry.account?.name}
                          {tx.type === 'split' && ' · Split'}
                        </p>
                      </div>
                      <CurrencyDisplay
                        cents={displayAmount}
                        type={isExpense ? 'expense' : 'income'}
                      />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
