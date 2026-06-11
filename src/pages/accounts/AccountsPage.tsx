import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { useCategorySpending } from '@/hooks/useCategorySpending'
import { useBudgets } from '@/hooks/useBudgets'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { AmountInput } from '@/components/common/AmountInput'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, getYearMonth } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { getCategoryIcon } from '@/lib/icons'
import { Wallet, Plus, Pencil, Trash2, BarChart3, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { toast } from 'sonner'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import type { Account, AccountType, AccountBalance } from '@/types'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableAccountItem({
  balance, onEdit, onDelete,
}: {
  balance: AccountBalance
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: balance.account_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'shadow-lg' : 'hover:bg-accent/50 transition-colors'}>
        <CardContent className="flex items-center gap-2 py-4 px-4">
          <button
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <Link to={`/accounts/${balance.account_id}`} className="flex-1 min-w-0 no-underline">
            <p className="font-medium text-foreground">{balance.name}</p>
            <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[balance.type]}</p>
          </Link>
          <div className="flex items-center gap-2">
            <CurrencyDisplay cents={balance.current_balance} type={balance.current_balance < 0 ? 'expense' : 'neutral'} showSign={balance.current_balance < 0} />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(balance.account_id)}>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDelete(balance.account_id)}>
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AccountsPage() {
  const { accounts, createAccount, updateAccount, deleteAccount, reorderAccounts } = useAccounts()
  const { balances, loading, refetch } = useAccountBalances(accounts.map(a => a.id))

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType | ''>('')
  const [initialBalance, setInitialBalance] = useState(0)
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<AccountType | ''>('')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [reportDate, setReportDate] = useState(new Date())
  const reportStart = format(startOfMonth(reportDate), 'yyyy-MM-dd')
  const reportEnd = format(endOfMonth(reportDate), 'yyyy-MM-dd')
  const { spending, loading: spendingLoading } = useCategorySpending(reportStart, reportEnd)
  const { budgetStatus } = useBudgets(getYearMonth(reportDate))
  const totalSpending = spending.reduce((sum, s) => sum + s.personal_total, 0)
  const pieData = useMemo(() =>
    spending.map(s => ({ name: s.name, value: s.personal_total / 100, color: s.color })),
    [spending]
  )

  const totalBalance = balances.reduce((sum, b) => sum + b.current_balance, 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter account name'); return }
    if (!type) { toast.error('Select account type'); return }
    setSaving(true)
    const result = await createAccount({
      name: name.trim(), type: type as AccountType, initial_balance: initialBalance,
      icon: null, color: null, is_archived: false, sort_order: accounts.length,
    })
    setSaving(false)
    if (result?.error) { toast.error('Failed to create account') }
    else {
      toast.success('Account created')
      setCreateOpen(false); setName(''); setType(''); setInitialBalance(0); refetch()
    }
  }

  function openEdit(accountId: string) {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    setEditId(account.id); setEditName(account.name); setEditType(account.type); setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) { toast.error('Enter account name'); return }
    if (!editType) { toast.error('Select account type'); return }
    setSaving(true)
    const result = await updateAccount(editId, { name: editName.trim(), type: editType as AccountType })
    setSaving(false)
    if (result?.error) { toast.error('Failed to update account') }
    else { toast.success('Account updated'); setEditOpen(false); refetch() }
  }

  async function handleDelete(accountId: string) {
    const { error } = await deleteAccount(accountId)
    if (error) { toast.error('Failed to delete account. It may have transactions.') }
    else { toast.success('Account removed'); setDeleteConfirmId(null); refetch() }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = accounts.findIndex(a => a.id === active.id)
    const newIndex = accounts.findIndex(a => a.id === over.id)
    const reordered = arrayMove(accounts, oldIndex, newIndex).map((a, i) => ({ ...a, sort_order: i }))
    reorderAccounts(reordered)
  }

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Total Net Worth</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="accounts">
        <TabsList className="w-full">
          <TabsTrigger value="accounts" className="flex-1">Accounts</TabsTrigger>
          <TabsTrigger value="spending" className="flex-1">Spending</TabsTrigger>
          <TabsTrigger value="budgets" className="flex-1">Budgets</TabsTrigger>
        </TabsList>

        {/* === Accounts Tab === */}
        <TabsContent value="accounts">
          <div className="flex items-center justify-between mt-4 mb-2">
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
                    <Select value={type || undefined} onValueChange={(v) => v != null && setType(v as AccountType)} items={Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Current Balance</Label>
                    <AmountInput value={initialBalance} onChange={setInitialBalance} allowNegative />
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
            <EmptyState icon={Wallet} title="No accounts yet" description="Add your bank accounts, credit cards, and cash to start tracking" />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={balances.map(b => b.account_id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {balances.map(b => (
                    <SortableAccountItem
                      key={b.account_id}
                      balance={b}
                      onEdit={openEdit}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        {/* === Spending Tab === */}
        <TabsContent value="spending">
          <div className="flex items-center justify-between mt-4 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setReportDate(d => subMonths(d, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-medium text-sm">{format(reportDate, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setReportDate(d => addMonths(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Card className="mb-4">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Total Spending</p>
              <CurrencyDisplay cents={totalSpending} type="expense" showSign={false} className="text-2xl" />
            </CardContent>
          </Card>

          {spendingLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : spending.length === 0 ? (
            <EmptyState icon={BarChart3} title="No spending data" description="Add some expenses to see your spending breakdown" />
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value) * 100)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {spending.map(s => {
                  const Icon = getCategoryIcon(s.icon)
                  const pct = totalSpending > 0 ? Math.round((s.personal_total / totalSpending) * 100) : 0
                  return (
                    <div key={s.category_id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + '20' }}>
                        <Icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{s.name}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5 mt-1" />
                      </div>
                      <CurrencyDisplay cents={s.personal_total} type="expense" showSign={false} className="text-sm w-20 text-right" />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* === Budgets Tab === */}
        <TabsContent value="budgets">
          <div className="flex items-center justify-between mt-4 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setReportDate(d => subMonths(d, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-medium text-sm">{format(reportDate, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setReportDate(d => addMonths(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {budgetStatus.length === 0 ? (
            <EmptyState icon={BarChart3} title="No budgets set" description="Set budgets in Settings to track spending limits" />
          ) : (
            <div className="space-y-3">
              {budgetStatus.map(b => {
                const Icon = getCategoryIcon(b.category_icon)
                const isOver = b.percentage > 100
                return (
                  <Card key={b.budget_id} className={isOver ? 'border-destructive/50' : ''}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: b.category_color + '20' }}>
                          <Icon className="w-4 h-4" style={{ color: b.category_color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{b.category_name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(b.spent)} / {formatCurrency(b.budget_limit)}</p>
                        </div>
                        <span className="text-sm font-medium">{Math.round(b.percentage)}%</span>
                      </div>
                      <Progress value={Math.min(b.percentage, 100)} className={`h-2 ${isOver ? '[&>div]:bg-destructive' : ''}`} />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
