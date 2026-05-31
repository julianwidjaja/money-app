import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(dollars)
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'month' = 'short'): string {
  const d = typeof date === 'string'
    ? (date.includes('T') ? new Date(date) : new Date(date + 'T00:00:00'))
    : date
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    case 'long':
      return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    case 'month':
      return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long' })
  }
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function getYearMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
