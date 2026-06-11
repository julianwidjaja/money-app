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

  async function deleteReminder(id: string) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    if (!error) setReminders(prev => prev.filter(r => r.id !== id))
    return { error }
  }

  return { reminders, dueReminders, loading, createReminder, dismissReminder, deleteReminder, getReminderDetails, getReminderHistory, refetch: fetchReminders }
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
