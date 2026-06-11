import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TransactionGroup, TransactionEntry, TransactionWithEntries, EntryType } from '@/types'

interface CreateSimpleTransactionInput {
  type: 'income' | 'expense'
  amount: number
  accountId: string
  categoryId: string
  date: string
  name?: string
  description?: string
}

interface CreateTransferInput {
  amount: number
  fromAccountId: string
  toAccountId: string
  date: string
  name?: string
  description?: string
}

interface SplitReimbursement {
  friendName: string
  amount: number
  accountId: string
}

interface CreateSplitTransactionInput {
  totalAmount: number
  accountId: string
  categoryId: string
  date: string
  description: string
  reimbursements: SplitReimbursement[]
}

interface FetchOptions {
  startDate?: string
  endDate?: string
  accountId?: string
  categoryId?: string
  limit?: number
}

export function useTransactions(options?: FetchOptions) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<TransactionWithEntries[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    if (!user) return

    let groupQuery = supabase
      .from('transaction_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (options?.startDate) groupQuery = groupQuery.gte('date', options.startDate)
    if (options?.endDate) groupQuery = groupQuery.lte('date', options.endDate)
    if (options?.limit) groupQuery = groupQuery.limit(options.limit)

    const { data: groups, error: groupsError } = await groupQuery
    if (groupsError || !groups) { setLoading(false); return }

    if (groups.length === 0) { setTransactions([]); setLoading(false); return }

    const groupIds = groups.map((g: any) => g.id)
    let entriesQuery = supabase
      .from('transaction_entries')
      .select('*, account:accounts!transaction_entries_account_id_fkey(*), category:categories(*)')
      .in('group_id', groupIds)

    if (options?.accountId) entriesQuery = entriesQuery.eq('account_id', options.accountId)
    if (options?.categoryId) entriesQuery = entriesQuery.eq('category_id', options.categoryId)

    const { data: entries, error: entriesError } = await entriesQuery
    if (entriesError) { setLoading(false); return }

    const entriesByGroup = new Map<string, typeof entries>()
    for (const entry of entries || []) {
      const list = entriesByGroup.get(entry.group_id) || []
      list.push(entry)
      entriesByGroup.set(entry.group_id, list)
    }

    const result: TransactionWithEntries[] = groups
      .filter((g: any) => entriesByGroup.has(g.id))
      .map((g: any) => ({
        ...(g as TransactionGroup),
        entries: (entriesByGroup.get(g.id) || []) as TransactionWithEntries['entries'],
      }))

    setTransactions(result)
    setLoading(false)
  }, [user, options?.startDate, options?.endDate, options?.accountId, options?.categoryId, options?.limit])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  async function createSimpleTransaction(input: CreateSimpleTransactionInput) {
    if (!user) return

    const { data: group, error: groupError } = await supabase
      .from('transaction_groups')
      .insert({
        user_id: user.id,
        type: 'simple',
        description: input.name || null,
        date: input.date,
      })
      .select()
      .single()

    if (groupError || !group) return { error: groupError }

    const { error: entryError } = await supabase
      .from('transaction_entries')
      .insert({
        group_id: group.id,
        user_id: user.id,
        account_id: input.accountId,
        category_id: input.categoryId,
        type: input.type as EntryType,
        amount: input.amount,
        is_personal_expense: true,
        note: input.description || null,
      })

    if (!entryError) await fetchTransactions()
    return { error: entryError }
  }

  async function createTransfer(input: CreateTransferInput) {
    if (!user) return

    const { data: group, error: groupError } = await supabase
      .from('transaction_groups')
      .insert({
        user_id: user.id,
        type: 'transfer',
        description: input.name || null,
        date: input.date,
      })
      .select()
      .single()

    if (groupError || !group) return { error: groupError }

    const { error: entryError } = await supabase
      .from('transaction_entries')
      .insert([
        {
          group_id: group.id,
          user_id: user.id,
          account_id: input.fromAccountId,
          type: 'transfer_out' as EntryType,
          amount: input.amount,
          is_personal_expense: false,
          note: input.description || null,
        },
        {
          group_id: group.id,
          user_id: user.id,
          account_id: input.toAccountId,
          type: 'transfer_in' as EntryType,
          amount: input.amount,
          is_personal_expense: false,
          note: input.description || null,
        },
      ])

    if (!entryError) await fetchTransactions()
    return { error: entryError }
  }

  async function createSplitTransaction(input: CreateSplitTransactionInput) {
    if (!user) return

    const totalReimbursed = input.reimbursements.reduce((s, r) => s + r.amount, 0)
    const personalAmount = input.totalAmount - totalReimbursed

    const entries = [
      {
        account_id: input.accountId,
        category_id: input.categoryId,
        type: 'expense' as const,
        amount: input.totalAmount,
        personal_amount: personalAmount,
        is_personal_expense: true,
        note: 'Original payment',
      },
      ...input.reimbursements.map(r => ({
        account_id: r.accountId,
        category_id: null as string | null,
        type: 'reimbursement' as const,
        amount: r.amount,
        personal_amount: null as number | null,
        is_personal_expense: false,
        note: `Reimbursement from ${r.friendName}`,
      })),
    ]

    const { error } = await supabase.rpc('create_split_transaction', {
      p_user_id: user.id,
      p_description: input.description,
      p_date: input.date,
      p_entries: entries,
    })

    if (!error) await fetchTransactions()
    return { error }
  }

  async function updateSimpleTransaction(groupId: string, input: CreateSimpleTransactionInput) {
    if (!user) return

    const { error: groupError } = await supabase
      .from('transaction_groups')
      .update({ description: input.name || null, date: input.date, updated_at: new Date().toISOString() })
      .eq('id', groupId)

    if (groupError) return { error: groupError }

    const { error: entryError } = await supabase
      .from('transaction_entries')
      .update({
        account_id: input.accountId,
        category_id: input.categoryId,
        type: input.type as EntryType,
        amount: input.amount,
        note: input.description || null,
      })
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    if (!entryError) await fetchTransactions()
    return { error: entryError }
  }

  async function updateTransfer(groupId: string, input: CreateTransferInput) {
    if (!user) return

    const { error: groupError } = await supabase
      .from('transaction_groups')
      .update({ description: input.name || null, date: input.date, updated_at: new Date().toISOString() })
      .eq('id', groupId)

    if (groupError) return { error: groupError }

    const { error: outError } = await supabase
      .from('transaction_entries')
      .update({ account_id: input.fromAccountId, amount: input.amount, note: input.description || null })
      .eq('group_id', groupId)
      .eq('type', 'transfer_out')

    if (outError) return { error: outError }

    const { error: inError } = await supabase
      .from('transaction_entries')
      .update({ account_id: input.toAccountId, amount: input.amount, note: input.description || null })
      .eq('group_id', groupId)
      .eq('type', 'transfer_in')

    if (!inError) await fetchTransactions()
    return { error: inError }
  }

  async function updateSplitTransaction(groupId: string, input: CreateSplitTransactionInput) {
    if (!user) return

    const { error: groupError } = await supabase
      .from('transaction_groups')
      .update({ description: input.description, date: input.date, updated_at: new Date().toISOString() })
      .eq('id', groupId)

    if (groupError) return { error: groupError }

    const { error: deleteError } = await supabase
      .from('transaction_entries')
      .delete()
      .eq('group_id', groupId)

    if (deleteError) return { error: deleteError }

    const totalReimbursed = input.reimbursements.reduce((s, r) => s + r.amount, 0)
    const personalAmount = input.totalAmount - totalReimbursed

    const entries = [
      {
        group_id: groupId,
        user_id: user.id,
        account_id: input.accountId,
        category_id: input.categoryId,
        type: 'expense' as EntryType,
        amount: input.totalAmount,
        personal_amount: personalAmount,
        is_personal_expense: true,
        note: 'Original payment',
      },
      ...input.reimbursements.map(r => ({
        group_id: groupId,
        user_id: user.id,
        account_id: r.accountId,
        category_id: null as string | null,
        type: 'reimbursement' as EntryType,
        amount: r.amount,
        personal_amount: null as number | null,
        is_personal_expense: false,
        note: `Reimbursement from ${r.friendName}`,
      })),
    ]

    const { error: insertError } = await supabase
      .from('transaction_entries')
      .insert(entries)

    if (!insertError) await fetchTransactions()
    return { error: insertError }
  }

  async function deleteTransaction(groupId: string) {
    const { error } = await supabase
      .from('transaction_groups')
      .delete()
      .eq('id', groupId)
    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== groupId))
    }
    return { error }
  }

  return {
    transactions,
    loading,
    createSimpleTransaction,
    createTransfer,
    createSplitTransaction,
    updateSimpleTransaction,
    updateTransfer,
    updateSplitTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  }
}
