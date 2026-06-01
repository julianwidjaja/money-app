import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ACCOUNT_TYPE_ORDER } from '@/lib/constants'
import type { Account, AccountBalance } from '@/types'

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

  return { accounts, loading, createAccount, updateAccount, deleteAccount, refetch: fetchAccounts }
}

export function useAccountBalances() {
  const { user } = useAuth()
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBalances = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('account_balances')
      .select('*')
      .eq('user_id', user.id)
    if (!error && data) {
      const sorted = (data as AccountBalance[]).sort((a, b) => {
        const ai = ACCOUNT_TYPE_ORDER.indexOf(a.type)
        const bi = ACCOUNT_TYPE_ORDER.indexOf(b.type)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      setBalances(sorted)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchBalances() }, [fetchBalances])

  return { balances, loading, refetch: fetchBalances }
}
