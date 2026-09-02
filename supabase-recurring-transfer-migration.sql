-- Run this once in the Supabase SQL editor to enable recurring transfers.
alter table recurring_rules
  add column if not exists template_destination_account_id uuid references accounts(id) on delete restrict;
