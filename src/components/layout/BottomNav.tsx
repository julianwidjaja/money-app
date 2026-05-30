import { Link, useLocation } from 'react-router'
import { ListOrdered, Plus, BarChart3, Menu, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/transactions', icon: ListOrdered, label: 'Transactions' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/transactions/add', icon: Plus, label: 'Add', isCenter: true },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Menu, label: 'More' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="grid grid-cols-5 items-center h-16 sm:h-18 max-w-2xl mx-auto px-1 sm:px-4">
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-center mx-auto -mt-5 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
              >
                <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </Link>
            )
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 text-[10px] sm:text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
