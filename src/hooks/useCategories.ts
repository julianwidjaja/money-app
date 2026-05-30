import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '@/lib/constants';
import type { Category, CategoryType } from '@/types';

function deduplicateByName(categories: Category[]): Category[] {
  const seen = new Map<string, Category>();
  for (const c of categories) {
    const key = `${c.name}:${c.type}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}

async function ensureProfile(userId: string, email?: string, meta?: Record<string, unknown>) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
  if (!data) {
    await supabase.from('profiles').upsert({
      id: userId,
      display_name: (meta?.full_name as string) || email || 'User',
      avatar_url: (meta?.avatar_url as string) || null,
    });
  }
}

async function loadCategories(
  userId: string,
  email?: string,
  meta?: Record<string, unknown>,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('sort_order');

  if (error) return [];

  if (data.length > 0) {
    return deduplicateByName(data as Category[]);
  }

  await ensureProfile(userId, email, meta);

  const expenseRows = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
    user_id: userId,
    name: c.name,
    type: 'expense' as const,
    icon: c.icon,
    color: c.color,
    sort_order: i,
  }));
  const incomeRows = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
    user_id: userId,
    name: c.name,
    type: 'income' as const,
    icon: c.icon,
    color: c.color,
    sort_order: i,
  }));

  const { data: seededData, error: seedError } = await supabase
    .from('categories')
    .insert([...expenseRows, ...incomeRows])
    .select();

  if (seedError) {
    console.error('Failed to seed categories:', seedError);
    return [];
  }

  return (seededData as Category[]) || [];
}

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    loadCategories(user.id, user.email ?? undefined, user.user_metadata).then(
      (result) => {
        if (!cancelled) {
          setCategories(result);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [user]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  async function refetch() {
    if (!user) return;
    const result = await loadCategories(user.id);
    setCategories(result);
  }

  async function createCategory(category: {
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
  }) {
    if (!user) return;
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, user_id: user.id, sort_order: categories.length })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, data as Category]);
    }
    return { data, error };
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? (data as Category) : c)),
      );
    }
    return { data, error };
  }

  async function deleteCategory(id: string) {
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      const { error: archiveError } = await supabase
        .from('categories')
        .update({ is_archived: true })
        .eq('id', id);
      if (archiveError) return { error: archiveError };
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { error: null };
  }

  return {
    categories,
    expenseCategories,
    incomeCategories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch,
  };
}
