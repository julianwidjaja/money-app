import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants'
import type { Category, CategoryType } from '@/types'

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('sort_order')
    if (!error && data) {
      if (data.length === 0) {
        await seedDefaultCategories()
        return
      }
      setCategories(data as Category[])
    }
    setLoading(false)
  }, [user])

  async function seedDefaultCategories() {
    if (!user) return
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
    const { data, error } = await supabase
      .from('categories')
      .insert([...expenseRows, ...incomeRows])
      .select()
    if (!error && data) {
      setCategories(data as Category[])
    }
    setLoading(false)
  }

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
