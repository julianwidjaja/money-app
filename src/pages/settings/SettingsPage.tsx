import { Link } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tags, Repeat, Download, Moon, Sun, LogOut, Wallet, ChevronRight } from 'lucide-react'

const menuItems = [
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/settings/categories', icon: Tags, label: 'Categories' },
  { to: '/settings/recurring', icon: Repeat, label: 'Recurring Transactions' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/settings/export', icon: Download, label: 'Export Data' },
]

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardContent className="py-4">
          <div className="text-center">
            <p className="font-medium">{user?.user_metadata?.full_name || 'User'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-2">
          {menuItems.map((item, i) => (
            <div key={item.to}>
              <Link to={item.to} className="flex items-center gap-3 py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 text-sm">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              {i < menuItems.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-3 py-3 w-full hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
            <span className="flex-1 text-sm text-left">{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  )
}
