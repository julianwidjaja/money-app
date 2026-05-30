import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getYearMonth } from '@/lib/utils'
import type { Budget, BudgetStatus } from '@/types'

export function useBudgets(yearMonth?: string) {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = yearMonth || getYearMonth()

  const fetchBudgets = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('year_month', currentMonth)

    if (!error && data) setBudgets(data as Budget[])
    setLoading(false)
  }, [user, currentMonth])

  const fetchBudgetStatus = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase.rpc('get_budget_status', {
      p_user_id: user.id,
      p_year_month: currentMonth,
    })

    if (!error && data) setBudgetStatus(data as BudgetStatus[])
  }, [user, currentMonth])

  useEffect(() => {
    fetchBudgets()
    fetchBudgetStatus()
  }, [fetchBudgets, fetchBudgetStatus])

  async function createBudget(categoryId: string, amount: number) {
    if (!user) return
    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        year_month: currentMonth,
        amount,
      }, { onConflict: 'user_id,category_id,year_month' })
      .select()
      .single()

    if (!error) {
      await fetchBudgets()
      await fetchBudgetStatus()
    }
    return { data, error }
  }

  async function deleteBudget(id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) {
      setBudgets(prev => prev.filter(b => b.id !== id))
      await fetchBudgetStatus()
    }
    return { error }
  }

  return {
    budgets,
    budgetStatus,
    loading,
    createBudget,
    deleteBudget,
    refetch: () => { fetchBudgets(); fetchBudgetStatus() },
  }
}
