import { useState } from 'react'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { AmountInput } from '@/components/common/AmountInput'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, getYearMonth } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/icons'
import { toast } from 'sonner'
import { PiggyBank, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'

export function BudgetsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const yearMonth = getYearMonth(currentDate)
  const { budgetStatus, loading, createBudget, deleteBudget, refetch } = useBudgets(yearMonth)
  const { expenseCategories } = useCategories()

  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [budgetAmount, setBudgetAmount] = useState(0)
  const [saving, setSaving] = useState(false)

  const budgetedCategoryIds = new Set(budgetStatus.map(b => b.category_id))
  const unbugdetedCategories = expenseCategories.filter(c => !budgetedCategoryIds.has(c.id))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCategory) { toast.error('Select a category'); return }
    if (budgetAmount <= 0) { toast.error('Enter a budget amount'); return }
    setSaving(true)
    const result = await createBudget(selectedCategory, budgetAmount)
    setSaving(false)
    if (result?.error) {
      toast.error('Failed to create budget')
    } else {
      toast.success('Budget set')
      setOpen(false)
      setSelectedCategory('')
      setBudgetAmount(0)
    }
  }

  async function handleDelete(budgetId: string) {
    const { error } = await deleteBudget(budgetId)
    if (error) toast.error('Failed to delete budget')
    else toast.success('Budget removed')
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-medium">{format(currentDate, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" /> Set Budget
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Set Monthly Budget</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={(v) => v != null && setSelectedCategory(v)} items={unbugdetedCategories.map(c => ({ value: c.id, label: c.name }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {unbugdetedCategories.map(c => {
                      const Icon = getCategoryIcon(c.icon)
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Limit</Label>
                <AmountInput value={budgetAmount} onChange={setBudgetAmount} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving...' : 'Set Budget'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      ) : budgetStatus.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set"
          description="Set budgets for your expense categories to track spending limits"
        />
      ) : (
        <div className="space-y-3">
          {budgetStatus.map(b => {
            const Icon = getCategoryIcon(b.category_icon)
            const isOver = b.percentage > 100

            return (
              <Card key={b.budget_id} className={isOver ? 'border-destructive/50' : ''}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: b.category_color + '20' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: b.category_color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.category_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(b.spent)} of {formatCurrency(b.budget_limit)}
                        {isOver && ' — over budget!'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(b.budget_id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Progress
                    value={Math.min(b.percentage, 100)}
                    className={`h-2 ${isOver ? '[&>div]:bg-destructive' : ''}`}
                  />
                  <p className="text-xs text-right text-muted-foreground mt-1">{b.remaining > 0 ? `${formatCurrency(b.remaining)} left` : 'Over by ' + formatCurrency(Math.abs(b.remaining))}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
