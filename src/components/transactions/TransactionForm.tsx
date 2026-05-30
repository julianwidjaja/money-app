import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { getCategoryIcon } from '@/lib/icons'

export interface SimpleEditData {
  groupId: string
  amount: number
  accountId: string
  categoryId: string
  date: string
  note: string
}

interface TransactionFormProps {
  type: 'income' | 'expense'
  onSuccess: () => void
  editData?: SimpleEditData
}

export function TransactionForm({ type, onSuccess, editData }: TransactionFormProps) {
  const { accounts } = useAccounts()
  const { expenseCategories, incomeCategories } = useCategories()
  const { createSimpleTransaction, updateSimpleTransaction } = useTransactions()

  const categories = type === 'expense' ? expenseCategories : incomeCategories
  const isEdit = !!editData

  const [amount, setAmount] = useState(editData?.amount ?? 0)
  const [accountId, setAccountId] = useState(editData?.accountId ?? '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId ?? '')
  const [date, setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(editData?.note ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) { toast.error('Enter an amount'); return }
    if (!accountId) { toast.error('Select an account'); return }
    if (!categoryId) { toast.error('Select a category'); return }

    setLoading(true)
    const input = { type, amount, accountId, categoryId, date, note: note || undefined }

    const result = isEdit
      ? await updateSimpleTransaction(editData.groupId, input)
      : await createSimpleTransaction(input)
    setLoading(false)

    if (result?.error) {
      toast.error('Failed to save transaction')
    } else {
      toast.success(isEdit ? 'Transaction updated' : `${type === 'expense' ? 'Expense' : 'Income'} added`)
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-1.5">
        <Label>Amount</Label>
        <AmountInput value={amount} onChange={setAmount} />
      </div>

      <div className="space-y-1.5">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={(v) => v != null && setAccountId(v)}>
          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={(v) => v != null && setCategoryId(v)}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => {
              const Icon = getCategoryIcon(c.icon)
              return (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: c.color }} />
                    {c.name}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Note (optional)</Label>
        <Input placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : isEdit ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
      </Button>
    </form>
  )
}
