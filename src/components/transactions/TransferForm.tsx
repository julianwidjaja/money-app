import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useRecurring } from '@/hooks/useRecurring'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowDown, Repeat } from 'lucide-react'
import type { RecurrenceFrequency, EntryType } from '@/types'

export interface TransferEditData {
  groupId: string
  amount: number
  fromAccountId: string
  toAccountId: string
  date: string
  note: string
}

interface TransferFormProps {
  onSuccess: () => void
  editData?: TransferEditData
}

export function TransferForm({ onSuccess, editData }: TransferFormProps) {
  const { accounts } = useAccounts()
  const { createTransfer, updateTransfer } = useTransactions()
  const { createRule } = useRecurring()
  const isEdit = !!editData

  const [amount, setAmount] = useState(editData?.amount ?? 0)
  const [fromAccountId, setFromAccountId] = useState(editData?.fromAccountId ?? '')
  const [toAccountId, setToAccountId] = useState(editData?.toAccountId ?? '')
  const [date, setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(editData?.note ?? '')
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
    const input = { amount, fromAccountId, toAccountId, date, note: note || undefined }

    const result = isEdit
      ? await updateTransfer(editData.groupId, input)
      : await createTransfer(input)
    setLoading(false)

    if (result?.error) {
      toast.error('Failed to save transfer')
    } else {
      if (isRecurring && !isEdit) {
        await createRule({ frequency, interval: 1, start_date: date, end_date: null, template_description: note || 'Transfer', template_account_id: fromAccountId, template_category_id: null, template_type: 'transfer_out' as EntryType, template_amount: amount })
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
        <Select value={fromAccountId} onValueChange={(v) => v != null && setFromAccountId(v)} items={accountItems}>
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transfer'}
      </Button>
    </form>
  )
}
