import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { addWeeks, addMonths, addYears, format, startOfDay } from 'date-fns'

export interface Reminder {
  id: string
  user_id: string
  title: string
  account_id: string | null
  frequency: string
  due_day: number
  next_due: string
  last_dismissed_at: string | null
  is_auto: boolean
  is_active: boolean
  created_at: string
}

export interface FundingBreakdown {
  funding_account_id: string
  account_name: string
  total: number
}

export interface ReminderHistoryItem {
  id: string
  period_start: string | null
  period_end: string
  funded: FundingBreakdown[]
  unfunded_total: number
  created_at: string
}

export function useReminders() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReminders = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('next_due')
    if (!error && data) setReminders(data as Reminder[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchReminders() }, [fetchReminders])

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const dueReminders = reminders.filter(r => r.next_due <= today)

  async function createReminder(reminder: { title: string; account_id: string | null; frequency: string; due_day: number; next_due: string }) {
    if (!user) return
    const { data, error } = await supabase
      .from('reminders')
      .insert({ ...reminder, user_id: user.id })
      .select()
      .single()
    if (!error && data) setReminders(prev => [...prev, data as Reminder].sort((a, b) => a.next_due.localeCompare(b.next_due)))
    return { data, error }
  }

  async function dismissReminder(id: string, details?: { funded: FundingBreakdown[]; unfundedTotal: number }) {
    if (!user) return
    const reminder = reminders.find(r => r.id === id)
    if (!reminder) return

    const now = new Date().toISOString()
    const nextDue = computeNextDue(reminder.next_due, reminder.frequency)

    await supabase.from('reminder_history').insert({
      reminder_id: id,
      user_id: user.id,
      period_start: reminder.last_dismissed_at || null,
      period_end: now,
      funded: details?.funded || [],
      unfunded_total: details?.unfundedTotal || 0,
    })

    const { error } = await supabase
      .from('reminders')
      .update({ next_due: nextDue, last_dismissed_at: now })
      .eq('id', id)

    if (!error) {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, next_due: nextDue, last_dismissed_at: now } : r))
    }
  }

  async function getReminderDetails(reminder: Reminder): Promise<{ funded: FundingBreakdown[]; unfundedTotal: number }> {
    if (!reminder.account_id) return { funded: [], unfundedTotal: 0 }

    let query = supabase
      .from('transaction_entries')
      .select('amount, funding_account_id, account:accounts!transaction_entries_funding_account_id_fkey(name)')
      .eq('account_id', reminder.account_id)
      .eq('type', 'expense')

    if (reminder.last_dismissed_at) {
      query = query.gte('created_at', reminder.last_dismissed_at)
    }

    const { data } = await query as { data: { amount: number; funding_account_id: string | null; account: { name: string } | null }[] | null }

    if (!data) return { funded: [], unfundedTotal: 0 }

    const fundedMap = new Map<string, FundingBreakdown>()
    let unfundedTotal = 0

    for (const entry of data) {
      if (entry.funding_account_id && entry.account) {
        const existing = fundedMap.get(entry.funding_account_id)
        if (existing) {
          existing.total += entry.amount
        } else {
          fundedMap.set(entry.funding_account_id, {
            funding_account_id: entry.funding_account_id,
            account_name: entry.account.name,
            total: entry.amount,
          })
        }
      } else {
        unfundedTotal += entry.amount
      }
    }

    return {
      funded: Array.from(fundedMap.values()).sort((a, b) => b.total - a.total),
      unfundedTotal,
    }
  }

  async function getReminderHistory(reminderId: string): Promise<ReminderHistoryItem[]> {
    const { data } = await supabase
      .from('reminder_history')
      .select('*')
      .eq('reminder_id', reminderId)
      .order('created_at', { ascending: false })
      .limit(10)

    return (data || []) as ReminderHistoryItem[]
  }

  async function updateReminder(id: string, updates: Partial<Pick<Reminder, 'title' | 'account_id' | 'frequency' | 'due_day'>>) {
    if (!user) return
    const reminder = reminders.find(r => r.id === id)
    if (!reminder) return

    const newFrequency = updates.frequency ?? reminder.frequency
    const newDueDay = updates.due_day ?? reminder.due_day

    let nextDue = reminder.next_due
    if (updates.frequency !== undefined || updates.due_day !== undefined) {
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      let candidate: Date
      if (newFrequency === 'weekly' || newFrequency === 'biweekly') {
        const dayOfWeek = newDueDay
        const currentDay = today.getDay() || 7
        const diff = dayOfWeek - currentDay
        candidate = new Date(today)
        candidate.setDate(today.getDate() + (diff <= 0 ? diff + 7 : diff))
      } else {
        candidate = new Date(today.getFullYear(), today.getMonth(), newDueDay)
        if (format(candidate, 'yyyy-MM-dd') <= todayStr) {
          candidate = addMonths(candidate, 1)
        }
      }
      nextDue = format(candidate, 'yyyy-MM-dd')
    }

    const { data, error } = await supabase
      .from('reminders')
      .update({ ...updates, next_due: nextDue })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setReminders(prev => prev.map(r => r.id === id ? data as Reminder : r).sort((a, b) => a.next_due.localeCompare(b.next_due)))
    }
    return { data, error }
  }

  async function deleteReminder(id: string) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    if (!error) setReminders(prev => prev.filter(r => r.id !== id))
    return { error }
  }

  return { reminders, dueReminders, loading, createReminder, updateReminder, dismissReminder, deleteReminder, getReminderDetails, getReminderHistory, refetch: fetchReminders }
}

function wrapDay(day: number): number {
  if (day < 1) return day + 28
  if (day > 28) return day - 28
  return day
}

function computeFirstDueForDay(dueDay: number): string {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(dueDay, daysInMonth)
  const thisMonth = new Date(year, month, day)
  const thisMonthStr = format(thisMonth, 'yyyy-MM-dd')
  if (thisMonthStr >= todayStr) return thisMonthStr
  return format(addMonths(thisMonth, 1), 'yyyy-MM-dd')
}

export async function createCCReminders(account: { id: string; user_id: string; name: string; statement_day: number | null; credit_limit: number | null }) {
  if (!account.statement_day || !account.credit_limit) return

  const preDay = wrapDay(account.statement_day - 3)
  const postDay = wrapDay(account.statement_day + 1)

  await supabase.from('reminders').insert([
    {
      user_id: account.user_id,
      title: `Pay ${account.name} to 9%`,
      account_id: account.id,
      frequency: 'monthly',
      due_day: preDay,
      next_due: computeFirstDueForDay(preDay),
      is_auto: true,
    },
    {
      user_id: account.user_id,
      title: `Pay remaining ${account.name}`,
      account_id: account.id,
      frequency: 'monthly',
      due_day: postDay,
      next_due: computeFirstDueForDay(postDay),
      is_auto: true,
    },
  ])
}

export async function deleteCCReminders(accountId: string) {
  await supabase
    .from('reminders')
    .delete()
    .eq('account_id', accountId)
    .eq('is_auto', true)
}

export async function updateCCReminders(account: { id: string; user_id: string; name: string; statement_day: number | null; credit_limit: number | null }) {
  await deleteCCReminders(account.id)
  await createCCReminders(account)
}

function computeNextDue(currentDue: string, frequency: string): string {
  const date = new Date(currentDue + 'T00:00:00')
  let next: Date
  switch (frequency) {
    case 'weekly': next = addWeeks(date, 1); break
    case 'biweekly': next = addWeeks(date, 2); break
    case 'monthly': next = addMonths(date, 1); break
    case 'yearly': next = addYears(date, 1); break
    default: next = addMonths(date, 1)
  }
  return format(next, 'yyyy-MM-dd')
}
