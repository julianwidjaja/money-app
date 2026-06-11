import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tags, Repeat, Download, Moon, Sun, LogOut, Wallet, ChevronRight, MessageSquare, Trash2, ToggleRight, Bell } from 'lucide-react'
import { toast } from 'sonner'

const menuItems = [
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/settings/categories', icon: Tags, label: 'Categories' },
  { to: '/settings/recurring', icon: Repeat, label: 'Recurring Transactions' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/settings/export', icon: Download, label: 'Export Data' },
  { to: '/settings/reminders', icon: Bell, label: 'Reminders' },
  { to: '/settings/features', icon: ToggleRight, label: 'Features' },
  { to: '/settings/feedback', icon: MessageSquare, label: 'Report Bug / Feedback' },
]

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_user_account')
    if (error) {
      toast.error('Failed to delete account: ' + error.message)
      setDeleting(false)
    } else {
      await signOut()
    }
  }

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

      <Button variant="destructive" className="w-full" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account and all your data (transactions, accounts, categories, budgets). This cannot be undone.
            </p>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Type <span className="font-mono text-destructive">DELETE</span> to confirm</p>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteOpen(false); setConfirmText('') }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={confirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
