-- ============================================================
-- Money App — Supabase Database Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enum types
create type account_type as enum ('cash', 'bank', 'credit_card', 'savings', 'investment', 'other');
create type category_type as enum ('income', 'expense');
create type entry_type as enum ('expense', 'income', 'transfer_out', 'transfer_in', 'reimbursement');
create type txn_group_type as enum ('simple', 'split', 'transfer');
create type recurrence_frequency as enum ('daily', 'weekly', 'biweekly', 'monthly', 'yearly');

-- ============================================================
-- Tables
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type account_type not null default 'bank',
  icon text,
  color text,
  initial_balance bigint not null default 0,
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type category_type not null,
  icon text not null,
  color text not null,
  parent_id uuid references categories(id) on delete set null,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  frequency recurrence_frequency not null,
  interval int not null default 1,
  start_date date not null,
  end_date date,
  last_generated_date date,
  template_description text,
  template_account_id uuid not null references accounts(id),
  template_category_id uuid references categories(id),
  template_type entry_type not null,
  template_amount bigint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table transaction_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type txn_group_type not null default 'simple',
  description text,
  date date not null,
  recurring_rule_id uuid references recurring_rules(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transaction_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references transaction_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  type entry_type not null,
  amount bigint not null,
  personal_amount bigint,
  is_personal_expense boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  year_month text not null,
  amount bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, year_month)
);

-- ============================================================
-- Indexes
-- ============================================================

create index idx_accounts_user on accounts(user_id);
create index idx_categories_user on categories(user_id);
create index idx_entries_group on transaction_entries(group_id);
create index idx_entries_user on transaction_entries(user_id);
create index idx_entries_account on transaction_entries(account_id);
create index idx_entries_category on transaction_entries(category_id);
create index idx_groups_user_date on transaction_groups(user_id, date);
create index idx_budgets_lookup on budgets(user_id, year_month);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transaction_groups enable row level security;
alter table transaction_entries enable row level security;
alter table budgets enable row level security;
alter table recurring_rules enable row level security;

-- Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Accounts
create policy "Users can manage own accounts" on accounts for all using (auth.uid() = user_id);

-- Categories
create policy "Users can manage own categories" on categories for all using (auth.uid() = user_id);

-- Transaction Groups
create policy "Users can manage own transaction_groups" on transaction_groups for all using (auth.uid() = user_id);

-- Transaction Entries
create policy "Users can manage own transaction_entries" on transaction_entries for all using (auth.uid() = user_id);

-- Budgets
create policy "Users can manage own budgets" on budgets for all using (auth.uid() = user_id);

-- Recurring Rules
create policy "Users can manage own recurring_rules" on recurring_rules for all using (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- View: Account Balances
-- ============================================================

create or replace view account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.type,
  a.initial_balance,
  coalesce(sum(
    case
      when te.type in ('income', 'transfer_in', 'reimbursement') then te.amount
      when te.type in ('expense', 'transfer_out') then -te.amount
      else 0
    end
  ), 0) as transactions_total,
  a.initial_balance + coalesce(sum(
    case
      when te.type in ('income', 'transfer_in', 'reimbursement') then te.amount
      when te.type in ('expense', 'transfer_out') then -te.amount
      else 0
    end
  ), 0) as current_balance
from accounts a
left join transaction_entries te on te.account_id = a.id
where a.is_archived = false
group by a.id;

-- Enable RLS on the view (needs a security invoker)
alter view account_balances set (security_invoker = on);

-- ============================================================
-- Function: Create Split Transaction (atomic)
-- ============================================================

create or replace function create_split_transaction(
  p_user_id uuid,
  p_description text,
  p_date date,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_group_id uuid;
begin
  -- Verify the caller matches
  if auth.uid() != p_user_id then
    raise exception 'Unauthorized';
  end if;

  insert into transaction_groups (user_id, type, description, date)
  values (p_user_id, 'split', p_description, p_date)
  returning id into v_group_id;

  insert into transaction_entries (group_id, user_id, account_id, category_id, type, amount, personal_amount, is_personal_expense, note)
  select
    v_group_id,
    p_user_id,
    (e->>'account_id')::uuid,
    case when e->>'category_id' = '' or e->>'category_id' is null then null else (e->>'category_id')::uuid end,
    (e->>'type')::entry_type,
    (e->>'amount')::bigint,
    case when e->>'personal_amount' is null then null else (e->>'personal_amount')::bigint end,
    (e->>'is_personal_expense')::boolean,
    e->>'note'
  from jsonb_array_elements(p_entries) as e;

  return v_group_id;
end;
$$;

-- ============================================================
-- Function: Get Budget Status
-- ============================================================

create or replace function get_budget_status(
  p_user_id uuid,
  p_year_month text
)
returns table (
  budget_id uuid,
  category_id uuid,
  category_name text,
  category_icon text,
  category_color text,
  budget_limit bigint,
  spent bigint,
  remaining bigint,
  percentage numeric
)
language sql
stable
security invoker
as $$
  select
    b.id as budget_id,
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    b.amount as budget_limit,
    coalesce(sum(
      case when te.type = 'expense' and te.is_personal_expense = true
      then coalesce(te.personal_amount, te.amount)
      else 0 end
    ), 0)::bigint as spent,
    (b.amount - coalesce(sum(
      case when te.type = 'expense' and te.is_personal_expense = true
      then coalesce(te.personal_amount, te.amount)
      else 0 end
    ), 0))::bigint as remaining,
    case when b.amount > 0
      then round(coalesce(sum(
        case when te.type = 'expense' and te.is_personal_expense = true
        then coalesce(te.personal_amount, te.amount)
        else 0 end
      ), 0)::numeric / b.amount * 100, 1)
      else 0 end as percentage
  from budgets b
  join categories c on c.id = b.category_id
  left join transaction_entries te
    on te.category_id = b.category_id
    and te.user_id = b.user_id
  left join transaction_groups tg
    on tg.id = te.group_id
    and tg.date >= (p_year_month || '-01')::date
    and tg.date < ((p_year_month || '-01')::date + interval '1 month')
  where b.user_id = p_user_id
    and b.year_month = p_year_month
  group by b.id, c.id, c.name, c.icon, c.color
  order by percentage desc;
$$;
