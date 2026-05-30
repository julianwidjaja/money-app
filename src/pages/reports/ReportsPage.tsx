import { useState, useMemo } from 'react'
import { useCategorySpending } from '@/hooks/useCategorySpending'
import { useBudgets } from '@/hooks/useBudgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, getYearMonth } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/icons'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export function ReportsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd')

  const { spending, loading } = useCategorySpending(startDate, endDate)
  const { budgetStatus } = useBudgets(getYearMonth(currentDate))

  const totalSpending = spending.reduce((sum, s) => sum + s.personal_total, 0)

  const pieData = useMemo(() =>
    spending.map(s => ({
      name: s.name,
      value: s.personal_total / 100,
      color: s.color,
    })),
    [spending]
  )

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

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Total Spending</p>
          <CurrencyDisplay cents={totalSpending} type="expense" showSign={false} className="text-3xl" />
        </CardContent>
      </Card>

      <Tabs defaultValue="pie">
        <TabsList className="w-full">
          <TabsTrigger value="pie" className="flex-1">By Category</TabsTrigger>
          <TabsTrigger value="budget" className="flex-1">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="pie">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : spending.length === 0 ? (
            <EmptyState icon={BarChart3} title="No spending data" description="Add some expenses to see your spending breakdown" />
          ) : (
            <>
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
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
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: s.color + '20' }}
                      >
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

        <TabsContent value="budget">
          {budgetStatus.length === 0 ? (
            <EmptyState icon={BarChart3} title="No budgets set" description="Set budgets in the Budgets tab to track spending limits" />
          ) : (
            <div className="space-y-3 mt-4">
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
    </div>
  )
}
