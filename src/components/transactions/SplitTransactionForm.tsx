import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { getCategoryIcon } from '@/lib/icons'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Trash2, Users } from 'lucide-react'

interface Reimbursement {
  id: string
  friendName: string
  amount: number
  accountId: string
}

export interface SplitEditData {
  groupId: string
  totalAmount: number
  accountId: string
  categoryId: string
  date: string
  description: string
  reimbursements: Reimbursement[]
}

interface SplitTransactionFormProps {
  onSuccess: () => void
  editData?: SplitEditData
}

export function SplitTransactionForm({ onSuccess, editData }: SplitTransactionFormProps) {
  const { accounts } = useAccounts()
  const { expenseCategories } = useCategories()
  const { createSplitTransaction, updateSplitTransaction } = useTransactions()
  const isEdit = !!editData

  const [totalAmount, setTotalAmount] = useState(editData?.totalAmount ?? 0)
  const [accountId, setAccountId] = useState(editData?.accountId ?? '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId ?? '')
  const [date, setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState(editData?.description ?? '')
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>(
    editData?.reimbursements ?? [{ id: crypto.randomUUID(), friendName: '', amount: 0, accountId: '' }]
  )
  const [loading, setLoading] = useState(false)

  const totalReimbursed = reimbursements.reduce((s, r) => s + r.amount, 0)
  const personalAmount = totalAmount - totalReimbursed
  const isOverReimbursed = totalReimbursed > totalAmount

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
    if (totalAmount <= 0) { toast.error('Enter the total amount'); return }
    if (!accountId) { toast.error('Select payment account'); return }
    if (!categoryId) { toast.error('Select a category'); return }
    if (isOverReimbursed) { toast.error('Reimbursements exceed total'); return }

    const validReimbursements = reimbursements.filter(r => r.amount > 0 && r.accountId)
    if (validReimbursements.length === 0) { toast.error('Add at least one reimbursement'); return }

    for (const r of validReimbursements) {
      if (!r.friendName.trim()) { toast.error('Enter a name for each friend'); return }
    }

    setLoading(true)
    const input = {
      totalAmount,
      accountId,
      categoryId,
      date,
      description: description || 'Split transaction',
      reimbursements: validReimbursements.map(r => ({
        friendName: r.friendName,
        amount: r.amount,
        accountId: r.accountId,
      })),
    }

    const result = isEdit
      ? await updateSplitTransaction(editData.groupId, input)
      : await createSplitTransaction(input)
    setLoading(false)

    if (result?.error) {
      toast.error('Failed to save split transaction')
    } else {
      toast.success(isEdit ? 'Split transaction updated' : 'Split transaction added')
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      {/* Original Payment */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Original Payment
          </h3>

          <div className="space-y-1.5">
            <Label>Total Amount Paid</Label>
            <AmountInput value={totalAmount} onChange={setTotalAmount} />
          </div>

          <div className="space-y-1.5">
            <Label>Paid With</Label>
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
                {expenseCategories.map(c => {
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
            <Label>Description</Label>
            <Input placeholder="e.g. Dinner with friends" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Reimbursements */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Reimbursements
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
              <Select value={r.accountId} onValueChange={(v) => v != null && updateReimbursement(r.id, 'accountId', v)}>
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
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total paid</span>
              <span>{formatCurrency(totalAmount)}</span>
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

      <Button type="submit" className="w-full" disabled={loading || isOverReimbursed}>
        {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Split Transaction'}
      </Button>
    </form>
  )
}
