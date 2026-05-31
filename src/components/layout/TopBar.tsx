import { useLocation, Link } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StrawHatLogo } from '@/components/common/StrawHatLogo'
import { LogOut, Moon, Sun, User } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/transactions/add': 'Add Transaction',
  '/accounts': 'Reports',
  '/budgets': 'Budgets',
  '/reports': 'Reports',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
  '/settings/categories': 'Categories',
  '/settings/recurring': 'Recurring',
  '/settings/export': 'Export',
}

export function TopBar() {
  const { user, signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const location = useLocation()

  let title = pageTitles[location.pathname] || 'Straw Hat Money'
  if (location.pathname.match(/^\/transactions\/[^/]+\/edit$/)) title = 'Edit Transaction'
  else if (location.pathname.match(/^\/transactions\/[^/]+$/)) title = 'Transaction'
  else if (location.pathname.match(/^\/accounts\/[^/]+$/)) title = 'Account'

  const isHome = location.pathname === '/'

  const initials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b border-border">
      <div className="relative flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
        {/* Left: page title (non-home) or empty space */}
        <div className="flex-1">
          {!isHome && (
            <span className="text-sm font-medium text-foreground">{title}</span>
          )}
        </div>

        {/* Center: logo (always visible, links home) */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 hover:opacity-80 transition-opacity no-underline"
        >
          <StrawHatLogo className="w-9 h-6 text-foreground" />
          {isHome && (
            <span className="text-base font-semibold text-foreground hidden sm:inline">Straw Hat Money</span>
          )}
        </Link>

        {/* Right: profile menu */}
        <div className="flex-1 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                <User className="w-4 h-4 mr-2" />
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                {resolvedTheme === 'dark' ? (
                  <><Sun className="w-4 h-4 mr-2" /> Light mode</>
                ) : (
                  <><Moon className="w-4 h-4 mr-2" /> Dark mode</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
