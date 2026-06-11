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
import { Bell, Plus, Trash2, ArrowRight, History } from 'lucide-react'
import { format, addMonths, addYears } from 'date-fns'
import type { FundingBreakdown, ReminderHistoryItem } from '@/hooks/useReminders'

const frequencyItems = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function RemindersPage() {
  const { reminders, loading, createReminder, deleteReminder } = useReminders()
  const { accounts } = useAccounts()
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [accountId, setAccountId] = useState<string>('')
  const [frequency, setFrequency] = useState('monthly')
  const [dueDay, setDueDay] = useState(1)
  const [saving, setSaving] = useState(false)

  const [history, setHistory] = useState<(ReminderHistoryItem & { reminder_title?: string })[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

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

  function computeFirstDue(): string {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')

    if (frequency === 'weekly' || frequency === 'biweekly') {
      const currentDay = today.getDay() || 7
      let diff = dueDay - currentDay
      if (diff <= 0) diff += 7
      const next = new Date(today)
      next.setDate(next.getDate() + diff)
      return format(next, 'yyyy-MM-dd')
    }

    const year = today.getFullYear()
    const month = today.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const day = Math.min(dueDay, daysInMonth)
    const thisMonth = new Date(year, month, day)
    const thisMonthStr = format(thisMonth, 'yyyy-MM-dd')

    if (thisMonthStr >= todayStr) return thisMonthStr

    if (frequency === 'yearly') {
      return format(addYears(thisMonth, 1), 'yyyy-MM-dd')
    }
    return format(addMonths(thisMonth, 1), 'yyyy-MM-dd')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Enter a title'); return }
    setSaving(true)

    const result = await createReminder({
      title: title.trim(),
      account_id: accountId && accountId !== 'none' ? accountId : null,
      frequency,
      due_day: dueDay,
      next_due: computeFirstDue(),
    })
    setSaving(false)

    if (result?.error) toast.error('Failed to create reminder')
    else {
      toast.success('Reminder created')
      setOpen(false)
      setTitle('')
      setAccountId('')
      setFrequency('monthly')
      setDueDay(1)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteReminder(id)
    if (error) toast.error('Failed to delete')
    else toast.success('Reminder deleted')
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
                <Label>
                  {frequency === 'weekly' || frequency === 'biweekly' ? 'Day of Week (1=Mon, 7=Sun)' : 'Day of Month'}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={frequency === 'weekly' || frequency === 'biweekly' ? 7 : 31}
                  value={dueDay}
                  onChange={e => setDueDay(parseInt(e.target.value) || 1)}
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
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {RECURRENCE_LABELS[r.frequency] || r.frequency} · Next: {formatDate(r.next_due, 'long')}
                      {r.last_dismissed_at && ` · Last paid: ${formatDate(r.last_dismissed_at, 'short')}`}
                      {account && ` · ${account.name}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
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

              return (
                <Card key={h.id} className="opacity-80">
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{h.reminder_title}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid {formatDate(h.period_end, 'long')}
                        </p>
                      </div>
                      {hTotal > 0 && (
                        <CurrencyDisplay cents={hTotal} type="expense" showSign={false} className="text-sm font-medium" />
                      )}
                    </div>

                    {hasFunding && (
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
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
