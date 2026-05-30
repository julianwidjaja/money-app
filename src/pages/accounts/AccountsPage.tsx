import { useState } from 'react'
import { Link } from 'react-router'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { AmountInput } from '@/components/common/AmountInput'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AccountType } from '@/types'

export function AccountsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accounts, createAccount, updateAccount, deleteAccount, refetch: refetchAccounts } = useAccounts()
  const { balances, loading, refetch } = useAccountBalances()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [initialBalance, setInitialBalance] = useState(0)
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<AccountType>('bank')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const totalBalance = balances.reduce((sum, b) => sum + b.current_balance, 0)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter account name'); return }
    setSaving(true)
    const result = await createAccount({
      name: name.trim(),
      type,
      initial_balance: initialBalance,
      icon: null,
      color: null,
      is_archived: false,
      sort_order: accounts.length,
    })
    setSaving(false)
    if (result?.error) {
      toast.error('Failed to create account')
    } else {
      toast.success('Account created')
      setCreateOpen(false)
      setName('')
      setType('bank')
      setInitialBalance(0)
      refetch()
    }
  }

  function openEdit(accountId: string) {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    setEditId(account.id)
    setEditName(account.name)
    setEditType(account.type)
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) { toast.error('Enter account name'); return }
    setSaving(true)
    const result = await updateAccount(editId, { name: editName.trim(), type: editType })
    setSaving(false)
    if (result?.error) {
      toast.error('Failed to update account')
    } else {
      toast.success('Account updated')
      setEditOpen(false)
      refetch()
    }
  }

  async function handleDelete(accountId: string) {
    const { error } = await deleteAccount(accountId)
    if (error) {
      toast.error('Failed to delete account. It may have transactions.')
    } else {
      toast.success('Account removed')
      setDeleteConfirmId(null)
      refetch()
    }
  }

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Total Net Worth</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Accounts</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input placeholder="e.g. CIBC Chequing" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => v != null && setType(v as AccountType)} items={Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Current Balance</Label>
                <AmountInput value={initialBalance} onChange={setInitialBalance} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Creating...' : 'Create Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      ) : balances.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your bank accounts, credit cards, and cash to start tracking"
        />
      ) : (
        <div className="space-y-2">
          {balances.map(b => (
            <Card key={b.account_id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between py-4 px-4">
                <Link to={`/accounts/${b.account_id}`} className="flex-1 min-w-0 no-underline">
                  <p className="font-medium text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[b.type]}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <CurrencyDisplay cents={b.current_balance} type={b.type === 'credit_card' ? 'expense' : 'neutral'} showSign={b.type === 'credit_card'} />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(b.account_id)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteConfirmId(b.account_id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => v != null && setEditType(v as AccountType)} items={Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this account? This cannot be undone. Accounts with existing transactions cannot be deleted.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
