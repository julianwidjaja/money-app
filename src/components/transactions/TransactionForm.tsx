import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { useRecurring } from '@/hooks/useRecurring'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { formatCurrency } from '@/lib/utils'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { getCategoryIcon } from '@/lib/icons'
import { Plus, Trash2, Users, Repeat } from 'lucide-react'
import type { RecurrenceFrequency, EntryType } from '@/types'

interface Reimbursement {
  id: string
  friendName: string
  amount: number
  accountId: string
}

export interface SimpleEditData {
  groupId: string
  amount: number
  accountId: string
  categoryId: string
  date: string
  note: string
  isSplit?: boolean
  reimbursements?: Reimbursement[]
}

interface TransactionFormProps {
  type: 'income' | 'expense'
  onSuccess: () => void
  editData?: SimpleEditData
}

export function TransactionForm({ type, onSuccess, editData }: TransactionFormProps) {
  const { accounts } = useAccounts()
  const { expenseCategories, incomeCategories } = useCategories()
  const { createSimpleTransaction, updateSimpleTransaction, createSplitTransaction, updateSplitTransaction } = useTransactions()
  const { createRule } = useRecurring()

  const categories = type === 'expense' ? expenseCategories : incomeCategories
  const isEdit = !!editData

  const [amount, setAmount] = useState(editData?.amount ?? 0)
  const [accountId, setAccountId] = useState(editData?.accountId ?? '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId ?? '')
  const [date, setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(editData?.note ?? '')
  const [loading, setLoading] = useState(false)

  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')

  const [isSplit, setIsSplit] = useState(editData?.isSplit ?? false)
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>(
    editData?.reimbursements ?? [{ id: crypto.randomUUID(), friendName: '', amount: 0, accountId: '' }]
  )

  const totalReimbursed = reimbursements.reduce((s, r) => s + r.amount, 0)
  const personalAmount = amount - totalReimbursed
  const isOverReimbursed = isSplit && totalReimbursed > amount

  const accountItems = accounts.map(a => ({ value: a.id, label: a.name }))
  const categoryItems = categories.map(c => ({ value: c.id, label: c.name }))

  function addReimbursement() {
    setReimbursements(prev => [
      ...prev,
      { id: crypto.randomUUID(), friendName: '', amount: 0, accountId: '' },
    ])
  }

  function removeReimbursement(id: string) {
    setReimbursements(prev => prev.filter(r => r.id !== id))
  }

  function updateReimbursement(id: string, field: keyof Reimbursement, value: string | number) {
    setReimbursements(prev => prev.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) { toast.error('Enter an amount'); return }
    if (!accountId) { toast.error('Select an account'); return }
    if (!categoryId) { toast.error('Select a category'); return }

    if (isSplit) {
      if (isOverReimbursed) { toast.error('Reimbursements exceed total'); return }
      const validReimbursements = reimbursements.filter(r => r.amount > 0 && r.accountId)
      if (validReimbursements.length === 0) { toast.error('Add at least one reimbursement'); return }
      for (const r of validReimbursements) {
        if (!r.friendName.trim()) { toast.error('Enter a name for each friend'); return }
      }

      setLoading(true)
      const splitInput = {
        totalAmount: amount,
        accountId,
        categoryId,
        date,
        description: note || 'Split transaction',
        reimbursements: validReimbursements.map(r => ({
          friendName: r.friendName,
          amount: r.amount,
          accountId: r.accountId,
        })),
      }
      const result = isEdit
        ? await updateSplitTransaction(editData!.groupId, splitInput)
        : await createSplitTransaction(splitInput)
      setLoading(false)

      if (result?.error) toast.error('Failed to save transaction')
      else {
        if (isRecurring && !isEdit) {
          await createRule({ frequency, interval: 1, start_date: date, end_date: null, template_description: note || 'Split transaction', template_account_id: accountId, template_category_id: categoryId, template_type: 'expense' as EntryType, template_amount: amount })
        }
        toast.success(isEdit ? 'Transaction updated' : 'Expense added')
        onSuccess()
      }
      return
    }

    setLoading(true)
    const input = { type, amount, accountId, categoryId, date, note: note || undefined }
    const result = isEdit
      ? await updateSimpleTransaction(editData!.groupId, input)
      : await createSimpleTransaction(input)
    setLoading(false)

    if (result?.error) {
      toast.error('Failed to save transaction')
    } else {
      if (isRecurring && !isEdit) {
        await createRule({ frequency, interval: 1, start_date: date, end_date: null, template_description: note || null, template_account_id: accountId, template_category_id: categoryId, template_type: type as EntryType, template_amount: amount })
      }
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
        <Select value={accountId} onValueChange={(v) => v != null && setAccountId(v)} items={accountItems}>
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
        <Select value={categoryId} onValueChange={(v) => v != null && setCategoryId(v)} items={categoryItems}>
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
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label>Note (optional)</Label>
        <Input placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
      </div>

      {/* Recurring toggle */}
      {!isEdit && (
        <>
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className={`flex items-center gap-2 w-full px-4 py-3 rounded-lg border text-sm transition-colors ${
              isRecurring
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span className="flex-1 text-left">Make recurring</span>
            <div className={`w-9 h-5 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${isRecurring ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {isRecurring && (
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => v != null && setFrequency(v as RecurrenceFrequency)} items={Object.entries(RECURRENCE_LABELS).map(([value, label]) => ({ value, label }))}>
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Split toggle — only for expenses */}
      {type === 'expense' && (
        <button
          type="button"
          onClick={() => setIsSplit(!isSplit)}
          className={`flex items-center gap-2 w-full px-4 py-3 rounded-lg border text-sm transition-colors ${
            isSplit
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="flex-1 text-left">Split with friends</span>
          <div className={`w-9 h-5 rounded-full transition-colors ${isSplit ? 'bg-primary' : 'bg-muted'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${isSplit ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </div>
        </button>
      )}

      {/* Reimbursement fields — shown when split is on */}
      {isSplit && (
        <>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Reimbursements
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addReimbursement}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {reimbursements.map((r, idx) => (
                <div key={r.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Friend {idx + 1}</span>
                    {reimbursements.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeReimbursement(r.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Friend's name"
                    value={r.friendName}
                    onChange={e => updateReimbursement(r.id, 'friendName', e.target.value)}
                  />
                  <AmountInput
                    value={r.amount}
                    onChange={(v) => updateReimbursement(r.id, 'amount', v)}
                    placeholder="Amount they owe"
                  />
                  <Select value={r.accountId} onValueChange={(v) => v != null && updateReimbursement(r.id, 'accountId', v)} items={accountItems}>
                    <SelectTrigger><SelectValue placeholder="Receiving account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className={isOverReimbursed ? 'border-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total paid</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Friends reimburse</span>
                  <span className="text-success">-{formatCurrency(totalReimbursed)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Your share</span>
                  <CurrencyDisplay
                    cents={personalAmount}
                    type={isOverReimbursed ? 'income' : 'expense'}
                    showSign={false}
                    className={isOverReimbursed ? 'text-destructive' : ''}
                  />
                </div>
                {isOverReimbursed && (
                  <p className="text-xs text-destructive">Reimbursements exceed the total amount</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Button type="submit" className="w-full" disabled={loading || isOverReimbursed}>
        {loading ? 'Saving...' : isEdit ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
      </Button>
    </form>
  )
}
