import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/icons'
import { Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { TransactionWithEntries } from '@/types'

export function TransactionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { deleteTransaction } = useTransactions()
  const [tx, setTx] = useState<TransactionWithEntries | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id || !user) return
      const { data: group } = await supabase
        .from('transaction_groups')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (!group) { setLoading(false); return }

      const { data: entries } = await supabase
        .from('transaction_entries')
        .select('*, account:accounts(*), category:categories(*)')
        .eq('group_id', id)

      setTx({
        ...group,
        entries: (entries || []) as TransactionWithEntries['entries'],
      } as TransactionWithEntries)
      setLoading(false)
    }
    load()
  }, [id, user])

  async function handleDelete() {
    if (!id) return
    const { error } = await deleteTransaction(id)
    if (error) {
      toast.error('Failed to delete transaction')
    } else {
      toast.success('Transaction deleted')
      navigate('/transactions')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  if (!tx) {
    return <div className="py-12 text-center text-muted-foreground">Transaction not found</div>
  }

  const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income') || tx.entries[0]
  const reimbursements = tx.entries.filter(e => e.type === 'reimbursement')
  const isSplit = tx.type === 'split'

  return (
    <div className="space-y-4 py-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {tx.description || mainEntry?.category?.name || 'Transaction'}
            </CardTitle>
            <Badge variant={isSplit ? 'default' : 'secondary'}>
              {tx.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            {mainEntry && (
              <CurrencyDisplay
                cents={mainEntry.personal_amount ?? mainEntry.amount}
                type={mainEntry.type === 'expense' ? 'expense' : mainEntry.type === 'income' ? 'income' : 'neutral'}
                className="text-3xl"
              />
            )}
            {isSplit && mainEntry && mainEntry.personal_amount != null && mainEntry.personal_amount !== mainEntry.amount && (
              <p className="text-sm text-muted-foreground mt-1">
                Original: {formatCurrency(mainEntry.amount)} · Your share: {formatCurrency(mainEntry.personal_amount)}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(tx.date, 'long')}</span>
            </div>
            {mainEntry?.account && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account</span>
                <span>{mainEntry.account.name}</span>
              </div>
            )}
            {mainEntry?.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <div className="flex items-center gap-1.5">
                  {(() => { const Icon = getCategoryIcon(mainEntry.category.icon); return <Icon className="w-3.5 h-3.5" style={{ color: mainEntry.category.color }} /> })()}
                  <span>{mainEntry.category.name}</span>
                </div>
              </div>
            )}
          </div>

          {isSplit && reimbursements.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Reimbursements</h3>
                <div className="space-y-2">
                  {reimbursements.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p>{r.note || 'Reimbursement'}</p>
                        <p className="text-xs text-muted-foreground">{r.account?.name}</p>
                      </div>
                      <CurrencyDisplay cents={r.amount} type="income" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tx.type === 'transfer' && tx.entries.length >= 2 && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span>{tx.entries.find(e => e.type === 'transfer_out')?.account?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span>{tx.entries.find(e => e.type === 'transfer_in')?.account?.name}</span>
                </div>
              </div>
            </>
          )}

          <Separator />

          <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete Transaction
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
