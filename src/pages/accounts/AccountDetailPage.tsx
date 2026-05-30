import { useParams } from 'react-router'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { getCategoryIcon } from '@/lib/icons'
import { Link } from 'react-router'
import { ListOrdered, ArrowLeftRight } from 'lucide-react'

export function AccountDetailPage() {
  const { id } = useParams()
  const { accounts } = useAccounts()
  const { balances } = useAccountBalances()
  const { transactions, loading } = useTransactions({ accountId: id })

  const account = accounts.find(a => a.id === id)
  const balance = balances.find(b => b.account_id === id)

  if (!account) {
    return <div className="py-12 text-center text-muted-foreground">Account not found</div>
  }

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">{account.name}</p>
          <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
          <p className="text-3xl font-bold mt-2">
            {balance ? formatCurrency(balance.current_balance) : '—'}
          </p>
        </CardContent>
      </Card>

      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Transactions</h2>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState icon={ListOrdered} title="No transactions" description="No transactions for this account yet" />
      ) : (
        <div className="space-y-1.5">
          {transactions.map(tx => {
            const entry = tx.entries.find(e => e.account_id === id) || tx.entries[0]
            if (!entry) return null
            const cat = entry.category
            const isTransfer = entry.type === 'transfer_out' || entry.type === 'transfer_in'
            const isIncome = entry.type === 'income' || entry.type === 'transfer_in' || entry.type === 'reimbursement'
            const Icon = isTransfer ? ArrowLeftRight : getCategoryIcon(cat?.icon)

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
                      <p className="text-sm font-medium truncate">{tx.description || cat?.name || 'Transaction'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                    <CurrencyDisplay
                      cents={entry.amount}
                      type={isIncome ? 'income' : 'expense'}
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
