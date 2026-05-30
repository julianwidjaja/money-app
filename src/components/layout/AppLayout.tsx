import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopBar />
      <main className="flex-1 pb-20 px-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
