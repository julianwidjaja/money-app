import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CategorySpending } from '@/types'

export function useCategorySpending(startDate: string, endDate: string) {
  const { user } = useAuth()
  const [spending, setSpending] = useState<CategorySpending[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSpending = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('transaction_entries')
      .select(`
        amount,
        personal_amount,
        type,
        is_personal_expense,
        category:categories(id, name, icon, color),
        group:transaction_groups!inner(date)
      `)
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_personal_expense', true)
      .gte('transaction_groups.date', startDate)
      .lte('transaction_groups.date', endDate)

    if (error || !data) { setLoading(false); return }

    const categoryMap = new Map<string, CategorySpending>()

    for (const entry of data) {
      const cat = entry.category as { id: string; name: string; icon: string; color: string } | null
      if (!cat) continue

      const existing = categoryMap.get(cat.id)
      const amount = entry.personal_amount ?? entry.amount

      if (existing) {
        existing.personal_total += amount
        existing.transaction_count += 1
      } else {
        categoryMap.set(cat.id, {
          category_id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          personal_total: amount,
          transaction_count: 1,
        })
      }
    }

    setSpending(
      Array.from(categoryMap.values()).sort((a, b) => b.personal_total - a.personal_total)
    )
    setLoading(false)
  }, [user, startDate, endDate])

  useEffect(() => { fetchSpending() }, [fetchSpending])

  return { spending, loading, refetch: fetchSpending }
}
