-- Run this in Supabase SQL Editor to enable account deletion

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete all user data (cascades handle most of it via profiles FK)
  DELETE FROM public.feedback WHERE user_id = auth.uid();
  DELETE FROM public.recurring_rules WHERE user_id = auth.uid();
  DELETE FROM public.budgets WHERE user_id = auth.uid();
  DELETE FROM public.transaction_entries WHERE user_id = auth.uid();
  DELETE FROM public.transaction_groups WHERE user_id = auth.uid();
  DELETE FROM public.categories WHERE user_id = auth.uid();
  DELETE FROM public.accounts WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  -- Delete the auth user
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
