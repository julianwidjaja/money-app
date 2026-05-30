import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowDown } from 'lucide-react'

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
  const isEdit = !!editData

  const [amount, setAmount] = useState(editData?.amount ?? 0)
  const [fromAccountId, setFromAccountId] = useState(editData?.fromAccountId ?? '')
  const [toAccountId, setToAccountId] = useState(editData?.toAccountId ?? '')
  const [date, setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(editData?.note ?? '')
  const [loading, setLoading] = useState(false)

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
        <Select value={fromAccountId} onValueChange={(v) => v != null && setFromAccountId(v)}>
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
        <Select value={toAccountId} onValueChange={(v) => v != null && setToAccountId(v)}>
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
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Note (optional)</Label>
        <Input placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transfer'}
      </Button>
    </form>
  )
}
