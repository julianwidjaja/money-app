import { useState } from 'react'
import { useRecurring } from '@/hooks/useRecurring'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { getCategoryIcon } from '@/lib/icons'
import { toast } from 'sonner'
import { Repeat, Plus, Trash2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import type { EntryType, RecurrenceFrequency, RecurringRule } from '@/types'

export function RecurringSettingsPage() {
  const { rules, loading, createRule, updateRule, deleteRule } = useRecurring()
  const { accounts } = useAccounts()
  const { expenseCategories, incomeCategories } = useCategories()

  const [open, setOpen] = useState(false)
  const [txType, setTxType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState(0)
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRule, setEditRule] = useState<RecurringRule | null>(null)
  const [editTxType, setEditTxType] = useState<'expense' | 'income'>('expense')
  const [editAmount, setEditAmount] = useState(0)
  const [editAccountId, setEditAccountId] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>('monthly')
  const [editDescription, setEditDescription] = useState('')

  const categories = txType === 'expense' ? expenseCategories : incomeCategories
  const editCategories = editTxType === 'expense' ? expenseCategories : incomeCategories

  function openEditDialog(rule: RecurringRule) {
    setEditRule(rule)
    setEditTxType(rule.template_type as 'expense' | 'income')
    setEditAmount(rule.template_amount)
    setEditAccountId(rule.template_account_id)
    setEditCategoryId(rule.template_category_id || '')
    setEditFrequency(rule.frequency)
    setEditDescription(rule.template_description || '')
    setEditOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) { toast.error('Enter an amount'); return }
    if (!accountId) { toast.error('Select an account'); return }
    if (!categoryId) { toast.error('Select a category'); return }

    setSaving(true)
    const result = await createRule({
      frequency,
      interval: 1,
      start_date: startDate,
      end_date: null,
      template_description: description || null,
      template_account_id: accountId,
      template_category_id: categoryId,
      template_type: txType as EntryType,
      template_amount: amount,
    })
    setSaving(false)

    if (result?.error) toast.error('Failed to create rule')
    else {
      toast.success('Recurring transaction created')
      setOpen(false)
      setAmount(0)
      setDescription('')
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editRule) return
    if (editAmount <= 0) { toast.error('Enter an amount'); return }
    if (!editAccountId) { toast.error('Select an account'); return }
    if (!editCategoryId) { toast.error('Select a category'); return }

    setSaving(true)
    const result = await updateRule(editRule.id, {
      frequency: editFrequency,
      template_description: editDescription || null,
      template_account_id: editAccountId,
      template_category_id: editCategoryId,
      template_type: editTxType as EntryType,
      template_amount: editAmount,
    })
    setSaving(false)

    if (result?.error) toast.error('Failed to update rule')
    else {
      toast.success('Rule updated — future transactions will use the new settings')
      setEditOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteRule(id)
    if (error) toast.error('Failed to delete')
    else toast.success('Recurring rule removed')
  }

  function renderForm(
    mode: 'create' | 'edit',
    onSubmit: (e: React.FormEvent) => void,
    type: 'expense' | 'income', setType: (v: 'expense' | 'income') => void,
    amt: number, setAmt: (v: number) => void,
    accId: string, setAccId: (v: string) => void,
    catId: string, setCatId: (v: string) => void,
    freq: RecurrenceFrequency, setFreq: (v: RecurrenceFrequency) => void,
    desc: string, setDesc: (v: string) => void,
    cats: typeof expenseCategories,
  ) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v != null && setType(v as 'expense' | 'income')} items={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Amount</Label>
          <AmountInput value={amt} onChange={setAmt} />
        </div>
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={accId} onValueChange={(v) => v != null && setAccId(v)} items={accounts.map(a => ({ value: a.id, label: a.name }))}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={catId} onValueChange={(v) => v != null && setCatId(v)} items={cats.map(c => ({ value: c.id, label: c.name }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {cats.map(c => {
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
          <Label>Frequency</Label>
          <Select value={freq} onValueChange={(v) => v != null && setFreq(v as RecurrenceFrequency)} items={Object.entries(RECURRENCE_LABELS).map(([value, label]) => ({ value, label }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mode === 'create' && (
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Input placeholder="e.g. Monthly rent" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Create Rule' : 'Save Changes'}
        </Button>
      </form>
    )
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recurring</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Recurring Transaction</DialogTitle></DialogHeader>
            {renderForm('create', handleCreate, txType, setTxType, amount, setAmount, accountId, setAccountId, categoryId, setCategoryId, frequency, setFrequency, description, setDescription, categories)}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring transactions"
          description="Set up automatic recurring transactions like rent or salary"
        />
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.template_description || 'Recurring transaction'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(r.template_amount)} · {RECURRENCE_LABELS[r.frequency]}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(r)}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Recurring Transaction</DialogTitle></DialogHeader>
          {renderForm('edit', handleEdit, editTxType, setEditTxType, editAmount, setEditAmount, editAccountId, setEditAccountId, editCategoryId, setEditCategoryId, editFrequency, setEditFrequency, editDescription, setEditDescription, editCategories)}
        </DialogContent>
      </Dialog>
    </div>
  )
}
