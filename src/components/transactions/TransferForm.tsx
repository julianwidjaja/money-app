import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useRecurring } from '@/hooks/useRecurring'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/common/AmountInput'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowDown, Repeat, Layers, Plus, Trash2 } from 'lucide-react'
import { NameInput } from '@/components/common/NameInput'
import type { RecurrenceFrequency, EntryType } from '@/types'

interface TransferEntryState {
  id: string
  accountId: string
  amount: number
}

export interface TransferEditData {
  groupId: string
  sources: TransferEntryState[]
  destinations: TransferEntryState[]
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

  const [_date, _setDate] = useState(editData?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [_name, _setName] = useState(editData?.name ?? '')
  const [_description, _setDescription] = useState(editData?.description ?? '')

  const date = hasShared ? shared.date : _date
  const name = hasShared ? shared.name : _name
  const description = hasShared ? shared.description : _description

  function setDate(v: string) { hasShared ? onSharedChange?.({ date: v }) : _setDate(v) }
  function setName(v: string) { hasShared ? onSharedChange?.({ name: v }) : _setName(v) }
  function setDescription(v: string) { hasShared ? onSharedChange?.({ description: v }) : _setDescription(v) }

  const [isMulti, setIsMulti] = useState(
    editData ? (editData.sources.length > 1 || editData.destinations.length > 1) : false
  )

  const [sources, setSources] = useState<TransferEntryState[]>(
    editData?.sources ?? [{ id: crypto.randomUUID(), accountId: shared?.accountId ?? '', amount: hasShared ? shared.amount : 0 }]
  )
  const [destinations, setDestinations] = useState<TransferEntryState[]>(
    editData?.destinations ?? [{ id: crypto.randomUUID(), accountId: '', amount: 0 }]
  )
  const [loading, setLoading] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')

  const totalOut = sources.reduce((s, src) => s + src.amount, 0)
  const totalIn = destinations.reduce((s, dst) => s + dst.amount, 0)

  const accountItems = accounts.map(a => ({ value: a.id, label: a.name }))

  function updateEntry(
    setter: React.Dispatch<React.SetStateAction<TransferEntryState[]>>,
    id: string,
    field: 'accountId' | 'amount',
    value: string | number,
  ) {
    setter(prev => {
      const next = prev.map(s => s.id === id ? { ...s, [field]: value } : s)
      if (setter === setSources) {
        const newTotal = next.reduce((sum, src) => sum + src.amount, 0)
        onSharedChange?.({ amount: newTotal })
        if (field === 'accountId' && next[0]?.id === id) {
          onSharedChange?.({ accountId: value as string })
        }
      }
      return next
    })
  }

  function addEntry(setter: React.Dispatch<React.SetStateAction<TransferEntryState[]>>) {
    setter(prev => [...prev, { id: crypto.randomUUID(), accountId: '', amount: 0 }])
  }

  function removeEntry(setter: React.Dispatch<React.SetStateAction<TransferEntryState[]>>, id: string) {
    setter(prev => {
      const next = prev.filter(s => s.id !== id)
      if (setter === setSources) {
        const newTotal = next.reduce((sum, src) => sum + src.amount, 0)
        onSharedChange?.({ amount: newTotal })
      }
      return next
    })
  }

  function handleToggleMulti() {
    if (isMulti) {
      const firstSrc = sources[0]
      const firstDst = destinations[0]
      setSources([firstSrc || { id: crypto.randomUUID(), accountId: '', amount: 0 }])
      setDestinations([firstDst || { id: crypto.randomUUID(), accountId: '', amount: 0 }])
      setIsMulti(false)
    } else {
      setIsMulti(true)
    }
  }

  function buildInput(destinationAmount?: number) {
    return {
      sources: sources.filter(s => s.amount > 0 && s.accountId).map(s => ({ accountId: s.accountId, amount: s.amount })),
      destinations: destinations.filter(d => (destinationAmount ?? d.amount) > 0 && d.accountId).map(d => ({ accountId: d.accountId, amount: destinationAmount ?? d.amount })),
      date,
      name: name || undefined,
      description: description || undefined,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (isMulti) {
      const validSources = sources.filter(s => s.amount > 0 && s.accountId)
      const validDests = destinations.filter(d => d.amount > 0 && d.accountId)
      if (validSources.length === 0) { toast.error('Add at least one source'); return }
      if (validDests.length === 0) { toast.error('Add at least one destination'); return }

      const srcIds = new Set(validSources.map(s => s.accountId))
      if (srcIds.size !== validSources.length) { toast.error('Duplicate source accounts'); return }
      const dstIds = new Set(validDests.map(d => d.accountId))
      if (dstIds.size !== validDests.length) { toast.error('Duplicate destination accounts'); return }

      for (const d of validDests) {
        if (srcIds.has(d.accountId)) { toast.error('An account cannot be both source and destination'); return }
      }

      const srcTotal = validSources.reduce((s, src) => s + src.amount, 0)
      const dstTotal = validDests.reduce((s, dst) => s + dst.amount, 0)
      if (srcTotal !== dstTotal) { toast.error('Source and destination totals must match'); return }

      setLoading(true)
      const result = isEdit
        ? await updateTransfer(editData.groupId, buildInput())
        : await createTransfer(buildInput())
      setLoading(false)

      if (result?.error) {
        toast.error('Failed to save transfer')
      } else {
        toast.success(isEdit ? 'Transfer updated' : 'Transfer added')
        onSuccess()
      }
    } else {
      const source = sources[0]
      const dest = destinations[0]
      if (!source || source.amount <= 0) { toast.error('Enter an amount'); return }
      if (!source.accountId) { toast.error('Select source account'); return }
      if (!dest?.accountId) { toast.error('Select destination account'); return }
      if (source.accountId === dest.accountId) { toast.error('Accounts must be different'); return }

      setLoading(true)
      const result = isEdit
        ? await updateTransfer(editData.groupId, buildInput(source.amount))
        : await createTransfer(buildInput(source.amount))
      setLoading(false)

      if (result?.error) {
        toast.error('Failed to save transfer')
      } else {
        if (isRecurring && !isEdit) {
          await createRule({ frequency, interval: 1, start_date: date, end_date: null, template_description: name || 'Transfer', template_account_id: source.accountId, template_destination_account_id: dest.accountId, template_category_id: null, template_type: 'transfer_out' as EntryType, template_amount: source.amount })
        }
        toast.success(isEdit ? 'Transfer updated' : 'Transfer added')
        onSuccess()
      }
    }
  }

  function renderEntryCard(
    title: string,
    entries: TransferEntryState[],
    setter: React.Dispatch<React.SetStateAction<TransferEntryState[]>>,
    label: string,
  ) {
    const total = entries.reduce((s, e) => s + e.amount, 0)
    return (
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> {title}
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={() => addEntry(setter)}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {entries.map((entry, idx) => (
            <div key={entry.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{label} {idx + 1}</span>
                {entries.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeEntry(setter, entry.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <Select value={entry.accountId} onValueChange={(v) => v != null && updateEntry(setter, entry.id, 'accountId', v)} items={accountItems}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AmountInput value={entry.amount} onChange={(v) => updateEntry(setter, entry.id, 'amount', v)} />
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total</span>
            <CurrencyDisplay cents={total} type="neutral" showSign={false} className="text-sm font-medium" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Multi mode
  if (isMulti) {
    const mismatch = totalOut !== totalIn && totalOut > 0 && totalIn > 0
    return (
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {renderEntryCard('From', sources, setSources, 'Source')}

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-muted-foreground" />
        </div>

        {renderEntryCard('To', destinations, setDestinations, 'Destination')}

        {mismatch && (
          <p className="text-xs text-destructive text-center">
            Totals don't match — sources and destinations must be equal
          </p>
        )}

        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label>Name (optional)</Label>
          <NameInput value={name} onChange={setName} placeholder="e.g. CC Payment..." />
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

        <button
          type="button"
          onClick={handleToggleMulti}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border text-sm transition-colors border-primary bg-primary/5 text-primary"
        >
          <Layers className="w-4 h-4" />
          <span className="flex-1 text-left">Multiple accounts</span>
          <div className="w-9 h-5 rounded-full transition-colors bg-primary">
            <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 translate-x-4.5" />
          </div>
        </button>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transfer'}
        </Button>
      </form>
    )
  }

  // Simple mode (default)
  const singleSource = sources[0] || { id: crypto.randomUUID(), accountId: '', amount: 0 }
  const singleDest = destinations[0] || { id: crypto.randomUUID(), accountId: '', amount: 0 }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-1.5">
        <Label>Amount</Label>
        <AmountInput value={singleSource.amount} onChange={(v) => {
          updateEntry(setSources, singleSource.id, 'amount', v)
          if (hasShared) onSharedChange?.({ amount: v })
        }} />
      </div>

      <div className="space-y-1.5">
        <Label>From Account</Label>
        <Select value={singleSource.accountId} onValueChange={(v) => { if (v != null) { updateEntry(setSources, singleSource.id, 'accountId', v); onSharedChange?.({ accountId: v }) } }} items={accountItems}>
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
        <Select value={singleDest.accountId} onValueChange={(v) => v != null && updateEntry(setDestinations, singleDest.id, 'accountId', v)} items={accountItems}>
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

      {isFeatureEnabled('feature_multi_transfer') && !isEdit && (
        <button
          type="button"
          onClick={handleToggleMulti}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border text-sm transition-colors border-border text-muted-foreground hover:border-primary/50"
        >
          <Layers className="w-4 h-4" />
          <span className="flex-1 text-left">Multiple accounts</span>
          <div className="w-9 h-5 rounded-full transition-colors bg-muted">
            <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 translate-x-0.5" />
          </div>
        </button>
      )}

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
