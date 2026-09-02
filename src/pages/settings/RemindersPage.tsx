import { useEffect, useState } from 'react'
import { useReminders } from '@/hooks/useReminders'
import { useAccounts } from '@/hooks/useAccounts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { Bell, Plus, Trash2, Pencil, ArrowRight, History, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import type { FundingBreakdown, ReminderHistoryItem } from '@/hooks/useReminders'

const frequencyItems = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const weekdayItems = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
]

export function RemindersPage() {
  const { reminders, loading, createReminder, updateReminder, deleteReminder } = useReminders()
  const { accounts } = useAccounts()
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [accountId, setAccountId] = useState<string>('')
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editAccountId, setEditAccountId] = useState('')
  const [editFrequency, setEditFrequency] = useState('monthly')
  const [editDueDay, setEditDueDay] = useState(1)
  const [editYearlyDate, setEditYearlyDate] = useState('')

  const [history, setHistory] = useState<(ReminderHistoryItem & { reminder_title?: string })[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())

  const accountItems = [{ value: 'none', label: 'No account' }, ...accounts.map(a => ({ value: a.id, label: a.name }))]

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('reminder_history')
      .select('*, reminder:reminders(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: any[] | null }) => {
        if (cancelled) return
        if (data) {
          setHistory(data.map(h => ({
            ...h,
            reminder_title: h.reminder?.title || 'Deleted reminder',
          })))
        }
        setHistoryLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Enter a title'); return }
    if (!startDate) { toast.error('Select a start date'); return }
    setSaving(true)

    const date = new Date(`${startDate}T00:00:00`)
    const dueDay = frequency === 'weekly' || frequency === 'biweekly'
      ? (date.getDay() || 7)
      : date.getDate()

    const result = await createReminder({
      title: title.trim(),
      account_id: accountId && accountId !== 'none' ? accountId : null,
      frequency,
      due_day: dueDay,
      next_due: startDate,
    })
    setSaving(false)

    if (result?.error) toast.error('Failed to create reminder')
    else {
      toast.success('Reminder created')
      setOpen(false)
      setTitle('')
      setAccountId('')
      setFrequency('monthly')
      setStartDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteReminder(id)
    if (error) toast.error('Failed to delete')
    else toast.success('Reminder deleted')
  }

  function openEdit(id: string) {
    const r = reminders.find(rem => rem.id === id)
    if (!r) return
    setEditId(r.id)
    setEditTitle(r.title)
    setEditAccountId(r.account_id || 'none')
    setEditFrequency(r.frequency)
    setEditDueDay(r.due_day)
    setEditYearlyDate(`${new Date().getFullYear()}-${r.next_due.slice(5)}`)
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim()) { toast.error('Enter a title'); return }
    if (editFrequency === 'yearly' && !editYearlyDate) { toast.error('Select a date'); return }
    setSaving(true)
    const result = await updateReminder(editId, {
      title: editTitle.trim(),
      account_id: editAccountId && editAccountId !== 'none' ? editAccountId : null,
      frequency: editFrequency,
      due_day: editFrequency === 'yearly'
        ? new Date(`${editYearlyDate}T00:00:00`).getDate()
        : editDueDay,
      ...(editFrequency === 'yearly' ? { yearly_date: editYearlyDate } : {}),
    })
    setSaving(false)
    if (result?.error) toast.error('Failed to update reminder')
    else {
      toast.success('Reminder updated')
      setEditOpen(false)
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Reminders</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="e.g. Pay Visa CC" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Linked Account (optional)</Label>
                <Select value={accountId || 'none'} onValueChange={(v) => v != null && setAccountId(v)} items={accountItems}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No account</SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => v != null && setFrequency(v)} items={frequencyItems}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {frequencyItems.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Creating...' : 'Create Reminder'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      ) : reminders.length === 0 ? (
        <EmptyState icon={Bell} title="No reminders" description="Set up reminders for credit card payments or other recurring tasks" />
      ) : (
        <div className="space-y-2">
          {reminders.map(r => {
            const account = accounts.find(a => a.id === r.account_id)
            const isDue = r.next_due <= today
            return (
              <Card key={r.id} className={isDue ? 'border-warning/50' : ''}>
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <Bell className={`w-4 h-4 shrink-0 ${isDue ? 'text-warning' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{r.title}</p>
                      {isDue && <Badge variant="secondary" className="text-warning border-warning/30 text-xs">Due</Badge>}
                      {r.is_auto && <Badge variant="secondary" className="text-xs">Auto</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {RECURRENCE_LABELS[r.frequency] || r.frequency} · Next: {formatDate(r.next_due, 'long')}
                      {r.last_dismissed_at && ` · Last paid: ${formatDate(r.last_dismissed_at, 'short')}`}
                      {account && ` · ${account.name}`}
                    </p>
                  </div>
                  {!r.is_auto && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r.id)}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {!r.is_auto && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Past Payments */}
      {!historyLoading && history.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <History className="w-4 h-4" /> Past Payments
          </h2>
          <div className="space-y-2">
            {history.map(h => {
              const hTotal = (h.funded || []).reduce((s: number, f: FundingBreakdown) => s + f.total, 0) + (h.unfunded_total || 0)
              const hasFunding = (h.funded || []).length > 0
              const isExpanded = expandedHistory.has(h.id)

              return (
                <Card
                  key={h.id}
                  className="opacity-80 cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => setExpandedHistory(prev => {
                    const next = new Set(prev)
                    if (next.has(h.id)) next.delete(h.id)
                    else next.add(h.id)
                    return next
                  })}
                >
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{h.reminder_title}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid {formatDate(h.period_end, 'long')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hTotal > 0 && (
                          <CurrencyDisplay cents={hTotal} type="expense" showSign={false} className="text-sm font-medium" />
                        )}
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && hasFunding && (
                      <>
                        <Separator />
                        <div className="space-y-1.5">
                          {(h.funded as FundingBreakdown[]).map((f: FundingBreakdown) => (
                            <div key={f.funding_account_id} className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground">From</span>
                              <span className="font-medium">{f.account_name}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                              <span>{formatCurrency(f.total)}</span>
                            </div>
                          ))}
                          {(h.unfunded_total || 0) > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground">Other spending</span>
                              <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                              <span>{formatCurrency(h.unfunded_total)}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {isExpanded && !hasFunding && (
                      <>
                        <Separator />
                        <p className="text-xs text-muted-foreground">No funding breakdown recorded</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Reminder</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Linked Account (optional)</Label>
              <Select value={editAccountId || 'none'} onValueChange={(v) => v != null && setEditAccountId(v)} items={accountItems}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={editFrequency} onValueChange={(v) => v != null && setEditFrequency(v)} items={frequencyItems}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {frequencyItems.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editFrequency === 'yearly' ? (
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editYearlyDate}
                  onChange={e => setEditYearlyDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            ) : editFrequency === 'weekly' || editFrequency === 'biweekly' ? (
              <div className="space-y-1.5">
                <Label>Day of Week</Label>
                <Select value={String(editDueDay)} onValueChange={v => v != null && setEditDueDay(parseInt(v))} items={weekdayItems}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weekdayItems.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={editDueDay}
                  onChange={e => setEditDueDay(parseInt(e.target.value) || 1)}
                  className="text-sm"
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
