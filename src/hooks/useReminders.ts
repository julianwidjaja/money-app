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
  is_active: boolean
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

  async function dismissReminder(id: string) {
    const reminder = reminders.find(r => r.id === id)
    if (!reminder) return

    const nextDue = computeNextDue(reminder.next_due, reminder.frequency)

    const { error } = await supabase
      .from('reminders')
      .update({ next_due: nextDue })
      .eq('id', id)

    if (!error) {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, next_due: nextDue } : r))
    }
  }

  async function deleteReminder(id: string) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    if (!error) setReminders(prev => prev.filter(r => r.id !== id))
    return { error }
  }

  return { reminders, dueReminders, loading, createReminder, dismissReminder, deleteReminder, refetch: fetchReminders }
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
