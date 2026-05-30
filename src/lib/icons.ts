import {
  UtensilsCrossed, ShoppingCart, Car, Home, Zap, Gamepad2, ShoppingBag,
  Heart, GraduationCap, Sparkles, Shield, Repeat, Plane, Gift, MoreHorizontal,
  Briefcase, Laptop, TrendingUp, Plus, Banknote, Building2, CreditCard,
  PiggyBank, Wallet, ArrowLeftRight, CircleDollarSign, type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Home,
  Zap,
  Gamepad2,
  ShoppingBag,
  Heart,
  GraduationCap,
  Sparkles,
  Shield,
  Repeat,
  Plane,
  Gift,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Plus,
  Banknote,
  Building2,
  CreditCard,
  PiggyBank,
  Wallet,
  ArrowLeftRight,
  CircleDollarSign,
}

export function getCategoryIcon(name?: string | null): LucideIcon {
  if (!name) return CircleDollarSign
  return iconMap[name] || CircleDollarSign
}

export const AVAILABLE_ICONS = Object.keys(iconMap)
export { iconMap }
