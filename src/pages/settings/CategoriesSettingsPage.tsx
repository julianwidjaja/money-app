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
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { Category, CategoryType } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#f43f5e',
  '#0ea5e9', '#a855f7', '#06b6d4', '#d946ef', '#6b7280',
]

function SortableCategoryItem({ category, onDelete }: { category: Category; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })
  const Icon = getCategoryIcon(category.icon)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'shadow-lg' : ''}>
        <CardContent className="flex items-center gap-2 py-3 px-4">
          <button
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: category.color + '20' }}>
            <Icon className="w-4 h-4" style={{ color: category.color }} />
          </div>
          <span className="flex-1 text-sm">{category.name}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDelete(category.id)}>
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function CategoriesSettingsPage() {
  const { expenseCategories, incomeCategories, createCategory, deleteCategory, reorderCategories } = useCategories()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [icon, setIcon] = useState('MoreHorizontal')
  const [color, setColor] = useState('#6b7280')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  function handleDragEnd(categories: Category[], event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({ ...c, sort_order: i }))
    reorderCategories(reordered)
  }

  function renderCategoryList(categories: Category[]) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(categories, e)}>
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 mt-4">
            {categories.map(c => (
              <SortableCategoryItem key={c.id} category={c} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
