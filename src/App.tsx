import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { TransactionsPage } from '@/pages/transactions/TransactionsPage'
import { AddTransactionPage } from '@/pages/transactions/AddTransactionPage'
import { TransactionDetailPage } from '@/pages/transactions/TransactionDetailPage'
import { EditTransactionPage } from '@/pages/transactions/EditTransactionPage'
import { AccountsPage } from '@/pages/accounts/AccountsPage'
import { AccountDetailPage } from '@/pages/accounts/AccountDetailPage'
import { BudgetsPage } from '@/pages/budgets/BudgetsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { CategoriesSettingsPage } from '@/pages/settings/CategoriesSettingsPage'
import { RecurringSettingsPage } from '@/pages/settings/RecurringSettingsPage'
import { ExportPage } from '@/pages/settings/ExportPage'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
            <Route path="/signup" element={<RedirectIfAuth><SignupPage /></RedirectIfAuth>} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="transactions/add" element={<AddTransactionPage />} />
              <Route path="transactions/:id" element={<TransactionDetailPage />} />
              <Route path="transactions/:id/edit" element={<EditTransactionPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="accounts/:id" element={<AccountDetailPage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/categories" element={<CategoriesSettingsPage />} />
              <Route path="settings/recurring" element={<RecurringSettingsPage />} />
              <Route path="settings/export" element={<ExportPage />} />
            </Route>
          </Routes>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
