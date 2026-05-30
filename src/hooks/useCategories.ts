import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants'
import type { Category, CategoryType } from '@/types'

function deduplicateByName(categories: Category[]): Category[] {
  const seen = new Map<string, Category>()
  for (const c of categories) {
    const key = `${c.name}:${c.type}`
    if (!seen.has(key)) seen.set(key, c)
  }
  return Array.from(seen.values())
}

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)

  const fetchCategories = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('sort_order')

    if (error) { setLoading(false); return }

    if (data.length === 0 && !seeded.current) {
      seeded.current = true
      const { count } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (!count || count === 0) {
        const expenseRows = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
          user_id: user.id,
          name: c.name,
          type: 'expense' as const,
          icon: c.icon,
          color: c.color,
          sort_order: i,
        }))
        const incomeRows = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
          user_id: user.id,
          name: c.name,
          type: 'income' as const,
          icon: c.icon,
          color: c.color,
          sort_order: i,
        }))
        const { data: seededData } = await supabase
          .from('categories')
          .insert([...expenseRows, ...incomeRows])
          .select()
        if (seededData) {
          setCategories(seededData as Category[])
          setLoading(false)
          return
        }
      }
    }

    setCategories(deduplicateByName(data as Category[]))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')

  async function createCategory(category: { name: string; type: CategoryType; icon: string; color: string }) {
    if (!user) return
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, user_id: user.id, sort_order: categories.length })
      .select()
      .single()
    if (!error && data) {
      setCategories(prev => [...prev, data as Category])
    }
    return { data, error }
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setCategories(prev => prev.map(c => c.id === id ? data as Category : c))
    }
    return { data, error }
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase
      .from('categories')
      .update({ is_archived: true })
      .eq('id', id)
    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id))
    }
    return { error }
  }

  return {
    categories,
    expenseCategories,
    incomeCategories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  }
}
