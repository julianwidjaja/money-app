import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransferForm } from '@/components/transactions/TransferForm'
import { ArrowLeft } from 'lucide-react'
import type { TransactionWithEntries } from '@/types'
import type { SimpleEditData } from '@/components/transactions/TransactionForm'
import type { TransferEditData } from '@/components/transactions/TransferForm'

export function EditTransactionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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
        .select('*, account:accounts!transaction_entries_account_id_fkey(*), category:categories(*)')
        .eq('group_id', id)

      setTx({
        ...group,
        entries: (entries || []) as TransactionWithEntries['entries'],
      } as TransactionWithEntries)
      setLoading(false)
    }
    load()
  }, [id, user])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  if (!tx) {
    return <div className="py-12 text-center text-muted-foreground">Transaction not found</div>
  }

  function handleSuccess() {
    navigate(`/transactions/${id}`)
  }

  if (tx.type === 'simple') {
    const mainEntry = tx.entries.find(e => e.type === 'expense' || e.type === 'income')
    if (!mainEntry) return <div className="py-12 text-center text-muted-foreground">Invalid transaction</div>

    const editData: SimpleEditData = {
      groupId: tx.id,
      amount: mainEntry.amount,
      accountId: mainEntry.account_id,
      categoryId: mainEntry.category_id || '',
      date: tx.date,
      name: tx.description || '',
      description: mainEntry.note || '',
      fundingAccountId: mainEntry.funding_account_id || undefined,
    }

    return (
      <div className="space-y-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <TransactionForm
          type={mainEntry.type as 'income' | 'expense'}
          onSuccess={handleSuccess}
          editData={editData}
        />
      </div>
    )
  }

  if (tx.type === 'transfer') {
    const outEntry = tx.entries.find(e => e.type === 'transfer_out')
    const inEntry = tx.entries.find(e => e.type === 'transfer_in')
    if (!outEntry || !inEntry) return <div className="py-12 text-center text-muted-foreground">Invalid transfer</div>

    const editData: TransferEditData = {
      groupId: tx.id,
      amount: outEntry.amount,
      fromAccountId: outEntry.account_id,
      toAccountId: inEntry.account_id,
      date: tx.date,
      name: tx.description || '',
      description: outEntry.note || '',
    }

    return (
      <div className="space-y-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <TransferForm onSuccess={handleSuccess} editData={editData} />
      </div>
    )
  }

  if (tx.type === 'split') {
    const expenseEntry = tx.entries.find(e => e.type === 'expense')
    const reimbursementEntries = tx.entries.filter(e => e.type === 'reimbursement')
    if (!expenseEntry) return <div className="py-12 text-center text-muted-foreground">Invalid split transaction</div>

    const editData: SimpleEditData = {
      groupId: tx.id,
      amount: expenseEntry.amount,
      accountId: expenseEntry.account_id,
      categoryId: expenseEntry.category_id || '',
      date: tx.date,
      name: tx.description || '',
      description: expenseEntry.note || '',
      fundingAccountId: expenseEntry.funding_account_id || undefined,
      isSplit: true,
      reimbursements: reimbursementEntries.map(r => ({
        id: r.id,
        friendName: (r.note || '').replace('Reimbursement from ', ''),
        amount: r.amount,
        accountId: r.account_id,
      })),
    }

    return (
      <div className="space-y-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <TransactionForm type="expense" onSuccess={handleSuccess} editData={editData} />
      </div>
    )
  }

  return <div className="py-12 text-center text-muted-foreground">Unknown transaction type</div>
}
