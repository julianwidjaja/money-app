import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useRecurring } from '@/hooks/useRecurring'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowDown, Repeat } from 'lucide-react'
import { NameInput } from '@/components/common/NameInput'
import type { RecurrenceFrequency, EntryType } from '@/types'

export interface TransferEditData {
  groupId: string
  amount: number
  fromAccountId: string
  toAccountId: string
  date: string
  name: string
  description: string
}

interface SharedFormState {
  amount: number
  date: string
  name: string
  description: string
  accountId: string
}

interface TransferFormProps {
  onSuccess: () => void
  editData?: TransferEditData
  shared?: SharedFormState
  onSharedChange?: (updates: Partial<SharedFormState>) => void
}

export function TransferForm({ onSuccess, editData, shared, onSharedChange }: TransferFormProps) {
  const { accounts } = useAccounts()
  const { createTransfer, updateTransfer } = useTransactions()
  const { createRule } = useRecurring()
  const { isFeatureEnabled } = useSettings()
  const isEdit = !!editData
  const hasShared = !!shared

  const [_amount, _setAmount] = useState(editData?.amount ?? 0)
  const [_date, _setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [_name, _setName] = useState(editData?.name ?? '')
  const [_description, _setDescription] = useState(editData?.description ?? '')

  const amount = hasShared ? shared.amount : _amount
  const date = hasShared ? shared.date : _date
  const name = hasShared ? shared.name : _name
  const description = hasShared ? shared.description : _description

  function setAmount(v: number) { hasShared ? onSharedChange?.({ amount: v }) : _setAmount(v) }
  function setDate(v: string) { hasShared ? onSharedChange?.({ date: v }) : _setDate(v) }
  function setName(v: string) { hasShared ? onSharedChange?.({ name: v }) : _setName(v) }
  function setDescription(v: string) { hasShared ? onSharedChange?.({ description: v }) : _setDescription(v) }

  const [fromAccountId, setFromAccountId] = useState(editData?.fromAccountId ?? shared?.accountId ?? '')
  const [toAccountId, setToAccountId] = useState(editData?.toAccountId ?? '')
  const [loading, setLoading] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')

  const accountItems = accounts.map(a => ({ value: a.id, label: a.name }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) { toast.error('Enter an amount'); return }
    if (!fromAccountId) { toast.error('Select source account'); return }
    if (!toAccountId) { toast.error('Select destination account'); return }
    if (fromAccountId === toAccountId) { toast.error('Accounts must be different'); return }

    setLoading(true)
    const input = { amount, fromAccountId, toAccountId, date, name: name || undefined, description: description || undefined }

    const result = isEdit
      ? await updateTransfer(editData.groupId, input)
      : await createTransfer(input)
    setLoading(false)

    if (result?.error) {
      toast.error('Failed to save transfer')
    } else {
      if (isRecurring && !isEdit) {
        await createRule({ frequency, interval: 1, start_date: date, end_date: null, template_description: name || 'Transfer', template_account_id: fromAccountId, template_category_id: null, template_type: 'transfer_out' as EntryType, template_amount: amount })
      }
      toast.success(isEdit ? 'Transfer updated' : 'Transfer added')
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
        <Label>From Account</Label>
        <Select value={fromAccountId} onValueChange={(v) => { if (v != null) { setFromAccountId(v); onSharedChange?.({ accountId: v }) } }} items={accountItems}>
          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="space-y-1.5">
        <Label>To Account</Label>
        <Select value={toAccountId} onValueChange={(v) => v != null && setToAccountId(v)} items={accountItems}>
          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label>Name (optional)</Label>
        <NameInput value={name} onChange={setName} placeholder="e.g. Savings transfer..." />
      </div>

      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none min-h-[60px] resize-y dark:bg-input/30"
          placeholder="Add more details..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* Recurring toggle */}
      {!isEdit && isFeatureEnabled('feature_recurring') && (
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transfer'}
      </Button>
    </form>
  )
}
