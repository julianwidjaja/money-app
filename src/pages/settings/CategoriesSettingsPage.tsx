import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getCategoryIcon, AVAILABLE_ICONS, iconMap } from '@/lib/icons'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import type { CategoryType } from '@/types'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#f43f5e',
  '#0ea5e9', '#a855f7', '#06b6d4', '#d946ef', '#6b7280',
]

export function CategoriesSettingsPage() {
  const { expenseCategories, incomeCategories, createCategory, deleteCategory } = useCategories()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [icon, setIcon] = useState('MoreHorizontal')
  const [color, setColor] = useState('#6b7280')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter a name'); return }
    setSaving(true)
    const result = await createCategory({ name: name.trim(), type, icon, color })
    setSaving(false)
    if (result?.error) toast.error('Failed to create category')
    else {
      toast.success('Category created')
      setOpen(false)
      setName('')
    }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteCategory(id)
    if (error) toast.error('Failed to delete category')
    else toast.success('Category removed')
  }

  function renderCategoryList(categories: typeof expenseCategories) {
    return (
      <div className="space-y-1.5 mt-4">
        {categories.map(c => {
          const Icon = getCategoryIcon(c.icon)
          return (
            <Card key={c.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                  <Icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <span className="flex-1 text-sm">{c.name}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Categories</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Category name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => v != null && setType(v as CategoryType)} items={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVAILABLE_ICONS.map(name => {
                    const I = iconMap[name]
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => setIcon(name)}
                        className={`p-2 rounded-md transition-colors ${icon === name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        <I className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-ring ring-offset-2 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Creating...' : 'Create Category'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="expense">
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">Expense ({expenseCategories.length})</TabsTrigger>
          <TabsTrigger value="income" className="flex-1">Income ({incomeCategories.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expense">{renderCategoryList(expenseCategories)}</TabsContent>
        <TabsContent value="income">{renderCategoryList(incomeCategories)}</TabsContent>
      </Tabs>
    </div>
  )
}
