import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Account, AccountBalance, EntryType } from '@/types'
import { format, subMonths, startOfMonth } from 'date-fns'

export function useAccounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('sort_order')
    if (!error && data) setAccounts(data as Account[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function createAccount(account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (!user) return
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setAccounts(prev => [...prev, data as Account])
    }
    return { data, error }
  }

  async function updateAccount(id: string, updates: Partial<Account>) {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setAccounts(prev => prev.map(a => a.id === id ? data as Account : a))
    }
    return { data, error }
  }

  async function deleteAccount(id: string) {
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      const { error: archiveError } = await supabase
        .from('accounts')
        .update({ is_archived: true })
        .eq('id', id)
      if (archiveError) return { error: archiveError }
    }

    setAccounts(prev => prev.filter(a => a.id !== id))
    return { error: null }
  }

  async function reorderAccounts(reordered: Account[]) {
    setAccounts(reordered)
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('accounts')
        .update({ sort_order: i })
        .eq('id', reordered[i].id)
    }
  }

  return { accounts, loading, createAccount, updateAccount, deleteAccount, reorderAccounts, refetch: fetchAccounts }
}

export function useAccountBalances(accountOrder?: string[]) {
  const { user } = useAuth()
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBalances = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('account_balances')
      .select('*')
      .eq('user_id', user.id)
    if (!error && data) setBalances(data as AccountBalance[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchBalances() }, [fetchBalances])

  const sortedBalances = useMemo(() => {
    if (!accountOrder || accountOrder.length === 0) return balances
    const orderMap = new Map<string, number>()
    accountOrder.forEach((id, i) => orderMap.set(id, i))
    return [...balances].sort((a, b) => {
      const ai = orderMap.get(a.account_id) ?? 999
      const bi = orderMap.get(b.account_id) ?? 999
      return ai - bi
    })
  }, [balances, accountOrder])

  return { balances: sortedBalances, loading, refetch: fetchBalances }
}

export async function generateInterest(userId: string) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .not('interest_rate', 'is', null)

  if (!accounts || accounts.length === 0) return

  const lastMonth = subMonths(new Date(), 1)
  const lastMonthStr = format(startOfMonth(lastMonth), 'yyyy-MM')

  // find or create "Interest" income category
  let { data: interestCat } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Interest')
    .eq('type', 'income')
    .single()

  if (!interestCat) {
    const { data: created } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: 'Interest', type: 'income', icon: 'Percent', color: '#22c55e', sort_order: 99 })
      .select('id')
      .single()
    interestCat = created
  }
  if (!interestCat) return

  for (const account of accounts as Account[]) {
    const rate = account.interest_rate
    if (!rate || rate <= 0) continue

    const lastApplied = account.interest_last_applied
      ? format(new Date(account.interest_last_applied + 'T00:00:00'), 'yyyy-MM')
      : null

    // skip if already applied for last month or later
    if (lastApplied && lastApplied >= lastMonthStr) continue

    // get current balance from the view
    const { data: balanceData } = await supabase
      .from('account_balances')
      .select('current_balance')
      .eq('account_id', account.id)
      .single()

    if (!balanceData || balanceData.current_balance <= 0) continue

    const monthlyInterest = Math.round(balanceData.current_balance * (rate / 100 / 12))
    if (monthlyInterest <= 0) continue

    const interestDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd')

    const { data: group } = await supabase
      .from('transaction_groups')
      .insert({
        user_id: userId,
        type: 'simple',
        description: 'Interest',
        date: interestDate,
      })
      .select()
      .single()

    if (!group) continue

    await supabase.from('transaction_entries').insert({
      group_id: group.id,
      user_id: userId,
      account_id: account.id,
      category_id: interestCat.id,
      type: 'income' as EntryType,
      amount: monthlyInterest,
      is_personal_expense: false,
    })

    await supabase
      .from('accounts')
      .update({ interest_last_applied: interestDate })
      .eq('id', account.id)
  }
}
