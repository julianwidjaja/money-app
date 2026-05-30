export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
          icon: string | null
          color: string | null
          initial_balance: number
          is_archived: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
          icon?: string | null
          color?: string | null
          initial_balance?: number
          is_archived?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
          icon?: string | null
          color?: string | null
          initial_balance?: number
          is_archived?: boolean
          sort_order?: number
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          icon: string
          color: string
          parent_id: string | null
          sort_order: number
          is_archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          icon: string
          color: string
          parent_id?: string | null
          sort_order?: number
          is_archived?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          type?: 'income' | 'expense'
          icon?: string
          color?: string
          parent_id?: string | null
          sort_order?: number
          is_archived?: boolean
        }
      }
      transaction_groups: {
        Row: {
          id: string
          user_id: string
          type: 'simple' | 'split' | 'transfer'
          description: string | null
          date: string
          recurring_rule_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'simple' | 'split' | 'transfer'
          description?: string | null
          date: string
          recurring_rule_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: 'simple' | 'split' | 'transfer'
          description?: string | null
          date?: string
          recurring_rule_id?: string | null
          updated_at?: string
        }
      }
      transaction_entries: {
        Row: {
          id: string
          group_id: string
          user_id: string
          account_id: string
          category_id: string | null
          type: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
          amount: number
          personal_amount: number | null
          is_personal_expense: boolean
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          account_id: string
          category_id?: string | null
          type: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
          amount: number
          personal_amount?: number | null
          is_personal_expense?: boolean
          note?: string | null
          created_at?: string
        }
        Update: {
          account_id?: string
          category_id?: string | null
          type?: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
          amount?: number
          personal_amount?: number | null
          is_personal_expense?: boolean
          note?: string | null
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          year_month: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          year_month: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          year_month?: string
          amount?: number
          updated_at?: string
        }
      }
      recurring_rules: {
        Row: {
          id: string
          user_id: string
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          interval: number
          start_date: string
          end_date: string | null
          last_generated_date: string | null
          template_description: string | null
          template_account_id: string
          template_category_id: string | null
          template_type: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
          template_amount: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          interval?: number
          start_date: string
          end_date?: string | null
          last_generated_date?: string | null
          template_description?: string | null
          template_account_id: string
          template_category_id?: string | null
          template_type: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
          template_amount: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          interval?: number
          start_date?: string
          end_date?: string | null
          last_generated_date?: string | null
          template_description?: string | null
          template_account_id?: string
          template_category_id?: string | null
          template_type?: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
          template_amount?: number
          is_active?: boolean
        }
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
          initial_balance: number
          transactions_total: number
          current_balance: number
        }
      }
    }
    Functions: {
      create_split_transaction: {
        Args: {
          p_user_id: string
          p_description: string
          p_date: string
          p_entries: Json
        }
        Returns: string
      }
      get_budget_status: {
        Args: {
          p_user_id: string
          p_year_month: string
        }
        Returns: {
          budget_id: string
          category_id: string
          category_name: string
          category_icon: string
          category_color: string
          budget_limit: number
          spent: number
          remaining: number
          percentage: number
        }[]
      }
    }
    Enums: {
      account_type: 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
      category_type: 'income' | 'expense'
      entry_type: 'expense' | 'income' | 'transfer_out' | 'transfer_in' | 'reimbursement'
      txn_group_type: 'simple' | 'split' | 'transfer'
      recurrence_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
    }
  }
}
