export const ACCOUNT_TYPE_ORDER = ['cash', 'chequing', 'credit_card', 'savings', 'investment', 'other'];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  chequing: 'Chequing Account',
  savings: 'Savings Account',
  credit_card: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  other: 'Other',
};

export const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  cash: 'Banknote',
  chequing: 'Building2',
  credit_card: 'CreditCard',
  savings: 'PiggyBank',
  investment: 'TrendingUp',
  other: 'Wallet',
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#ef4444' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#f97316' },
  { name: 'Transportation', icon: 'Car', color: '#eab308' },
  { name: 'Housing & Rent', icon: 'Home', color: '#22c55e' },
  { name: 'Utilities', icon: 'Zap', color: '#14b8a6' },
  { name: 'Entertainment', icon: 'Gamepad2', color: '#3b82f6' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#8b5cf6' },
  { name: 'Health & Medical', icon: 'Heart', color: '#ec4899' },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Personal Care', icon: 'Sparkles', color: '#f43f5e' },
  { name: 'Insurance', icon: 'Shield', color: '#0ea5e9' },
  { name: 'Subscriptions', icon: 'Repeat', color: '#a855f7' },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4' },
  { name: 'Gifts', icon: 'Gift', color: '#d946ef' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#22c55e' },
  { name: 'Freelance', icon: 'Laptop', color: '#3b82f6' },
  { name: 'Investment Returns', icon: 'TrendingUp', color: '#8b5cf6' },
  { name: 'Gifts Received', icon: 'Gift', color: '#ec4899' },
  { name: 'Other Income', icon: 'Plus', color: '#6b7280' },
];

export const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
