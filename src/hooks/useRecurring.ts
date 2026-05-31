import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { RecurringRule } from '@/types'
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, startOfDay } from 'date-fns'

export function useRecurring() {
  const { user } = useAuth()
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRules = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (!error && data) setRules(data as RecurringRule[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchRules() }, [fetchRules])

  async function createRule(rule: Omit<RecurringRule, 'id' | 'user_id' | 'created_at' | 'last_generated_date' | 'is_active'>) {
    if (!user) return
    const { data, error } = await supabase
      .from('recurring_rules')
      .insert({ ...rule, user_id: user.id, last_generated_date: rule.start_date })
      .select()
      .single()
    if (!error && data) setRules(prev => [data as RecurringRule, ...prev])
    return { data, error }
  }

  async function deleteRule(id: string) {
    const { error } = await supabase
      .from('recurring_rules')
      .update({ is_active: false })
      .eq('id', id)
    if (!error) setRules(prev => prev.filter(r => r.id !== id))
    return { error }
  }

  async function generatePendingTransactions() {
    if (!user) return
    const today = startOfDay(new Date())

    for (const rule of rules) {
      const lastGenerated = rule.last_generated_date
        ? startOfDay(new Date(rule.last_generated_date + 'T00:00:00'))
        : null
      const startDate = startOfDay(new Date(rule.start_date + 'T00:00:00'))
      const endDate = rule.end_date ? startOfDay(new Date(rule.end_date + 'T00:00:00')) : null

      if (endDate && isAfter(today, endDate)) continue

      let nextDate = lastGenerated ? getNextDate(lastGenerated, rule.frequency, rule.interval) : startDate
      if (isBefore(nextDate, startDate)) nextDate = startDate

      while (!isAfter(nextDate, today)) {
        if (endDate && isAfter(nextDate, endDate)) break

        const dateStr = nextDate.toISOString().split('T')[0]

        const { data: group } = await supabase
          .from('transaction_groups')
          .insert({
            user_id: user.id,
            type: 'simple',
            description: rule.template_description,
            date: dateStr,
            recurring_rule_id: rule.id,
          })
          .select()
          .single()

        if (group) {
          await supabase.from('transaction_entries').insert({
            group_id: group.id,
            user_id: user.id,
            account_id: rule.template_account_id,
            category_id: rule.template_category_id,
            type: rule.template_type,
            amount: rule.template_amount,
            is_personal_expense: rule.template_type === 'expense',
          })
        }

        await supabase
          .from('recurring_rules')
          .update({ last_generated_date: dateStr })
          .eq('id', rule.id)

        nextDate = getNextDate(nextDate, rule.frequency, rule.interval)
      }
    }

    await fetchRules()
  }

  return { rules, loading, createRule, deleteRule, generatePendingTransactions, refetch: fetchRules }
}

function getNextDate(from: Date, frequency: string, interval: number): Date {
  switch (frequency) {
    case 'daily': return addDays(from, interval)
    case 'weekly': return addWeeks(from, interval)
    case 'biweekly': return addWeeks(from, 2 * interval)
    case 'monthly': return addMonths(from, interval)
    case 'yearly': return addYears(from, interval)
    default: return addMonths(from, interval)
  }
}
