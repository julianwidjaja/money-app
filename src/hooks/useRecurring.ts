import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { RecurringRule } from '@/types'
import { addDays, addWeeks, addMonths, addYears, format, isAfter, isBefore, startOfDay } from 'date-fns'

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  async function updateRule(id: string, updates: Partial<RecurringRule>) {
    if (!user) return
    const { data, error } = await supabase
      .from('recurring_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setRules(prev => prev.map(r => r.id === id ? data as RecurringRule : r))
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

  const generating = useRef(false)

  const generatePendingTransactions = useCallback(async () => {
    if (!user || generating.current) return
    generating.current = true

    try {
      const today = startOfDay(new Date())

      const { data: freshRules, error: rulesError } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

      if (rulesError || !freshRules || freshRules.length === 0) return

      for (const rule of freshRules) {
        const lastGenerated = rule.last_generated_date
          ? startOfDay(new Date(rule.last_generated_date + 'T00:00:00'))
          : null
        const startDate = startOfDay(new Date(rule.start_date + 'T00:00:00'))
        const endDate = rule.end_date ? startOfDay(new Date(rule.end_date + 'T00:00:00')) : null

        const interval = Math.max(1, Number(rule.interval) || 1)
        // The recorded date is the occurrence the user created. Start with the
        // following occurrence so deleting an old transaction is permanent.
        let nextDate = lastGenerated ? getNextDate(lastGenerated, rule.frequency, interval) : startDate
        if (isBefore(nextDate, startDate)) nextDate = startDate

        while (!isAfter(nextDate, today)) {
          if (endDate && isAfter(nextDate, endDate)) break

          // Keep the user's local calendar date. toISOString() shifts local midnight
          // to the previous day in time zones west of UTC.
          const dateStr = format(nextDate, 'yyyy-MM-dd')

          const { data: existingGroups, error: existingError } = await supabase
            .from('transaction_groups')
            .select('id')
            .eq('user_id', user.id)
            .eq('recurring_rule_id', rule.id)
            .eq('date', dateStr)
            .limit(1)

          if (existingError) break

          if (existingGroups && existingGroups.length > 0) {
            await supabase
              .from('recurring_rules')
              .update({ last_generated_date: dateStr })
              .eq('id', rule.id)
            nextDate = getNextDate(nextDate, rule.frequency, interval)
            continue
          }

          const isTransfer = rule.template_type === 'transfer_out' && !!rule.template_destination_account_id
          const { data: group, error: groupError } = await supabase
            .from('transaction_groups')
            .insert({
              user_id: user.id,
              type: isTransfer ? 'transfer' : 'simple',
              description: rule.template_description,
              date: dateStr,
              recurring_rule_id: rule.id,
            })
            .select()
            .single()

          if (groupError || !group) break

          const entries = isTransfer && rule.template_destination_account_id
            ? [
                { account_id: rule.template_account_id, type: 'transfer_out' as const },
                { account_id: rule.template_destination_account_id, type: 'transfer_in' as const },
              ]
            : [{ account_id: rule.template_account_id, type: rule.template_type }]

          const { error: entriesError } = await supabase.from('transaction_entries').insert(entries.map(entry => ({
            group_id: group.id,
            user_id: user.id,
            account_id: entry.account_id,
            category_id: isTransfer ? null : rule.template_category_id,
            type: entry.type,
            amount: rule.template_amount,
            is_personal_expense: entry.type === 'expense',
          })))

          if (entriesError) {
            // Do not leave an empty group that would make the date look generated
            // on the next retry.
            await supabase.from('transaction_groups').delete().eq('id', group.id)
            break
          }

          await supabase
            .from('recurring_rules')
            .update({ last_generated_date: dateStr })
            .eq('id', rule.id)

          nextDate = getNextDate(nextDate, rule.frequency, interval)
        }
      }

      await fetchRules()
    } finally {
      generating.current = false
    }
  }, [fetchRules, user])

  return { rules, loading, createRule, updateRule, deleteRule, generatePendingTransactions, refetch: fetchRules }
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
