-- Add an account used to carry forward money reserved for the next
-- credit-card statement payment.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
