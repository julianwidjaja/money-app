export type AccountType = 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
export type CategoryType = 'income' | 'expense'
export type EntryType = 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
export type GroupType = 'simple' | 'split' | 'transfer'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  icon: string | null
  color: string | null
  initial_balance: number
  is_archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  parent_id: string | null
  sort_order: number
  is_archived: boolean
  created_at: string
}

export interface TransactionGroup {
  id: string
  user_id: string
  type: GroupType
  description: string | null
  date: string
  recurring_rule_id: string | null
  created_at: string
  updated_at: string
}

export interface TransactionEntry {
  id: string
  group_id: string
  user_id: string
  account_id: string
  category_id: string | null
  type: EntryType
  amount: number
  personal_amount: number | null
  is_personal_expense: boolean
  funding_account_id: string | null
  note: string | null
  created_at: string
}

export interface TransactionWithEntries extends TransactionGroup {
  entries: (TransactionEntry & {
    account?: Account
    category?: Category
  })[]
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  year_month: string
  amount: number
  created_at: string
  updated_at: string
}

export interface RecurringRule {
  id: string
  user_id: string
  frequency: RecurrenceFrequency
  interval: number
  start_date: string
  end_date: string | null
  last_generated_date: string | null
  template_description: string | null
  template_account_id: string
  template_category_id: string | null
  template_type: EntryType
  template_amount: number
  is_active: boolean
  created_at: string
}

export interface AccountBalance {
  account_id: string
  user_id: string
  name: string
  type: AccountType
  initial_balance: number
  transactions_total: number
  current_balance: number
}

export interface CategorySpending {
  category_id: string
  name: string
  icon: string
  color: string
  personal_total: number
  transaction_count: number
}

export interface BudgetStatus {
  budget_id: string
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  budget_limit: number
  spent: number
  remaining: number
  percentage: number
}
