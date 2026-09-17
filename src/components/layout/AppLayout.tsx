import { Outlet } from 'react-router'
import { useEffect, useState } from 'react'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { useRecurring } from '@/hooks/useRecurring'

export function AppLayout() {
  const { generatePendingTransactions } = useRecurring()
  const [recurringReady, setRecurringReady] = useState(false)

  useEffect(() => {
    let active = true
    void generatePendingTransactions().finally(() => {
      if (active) setRecurringReady(true)
    })

    return () => { active = false }
  }, [generatePendingTransactions])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopBar />
      <main className="flex-1 pb-20 px-4 max-w-2xl mx-auto w-full overflow-hidden">
        {recurringReady ? <Outlet /> : (
          <div className="flex items-center justify-center min-h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
