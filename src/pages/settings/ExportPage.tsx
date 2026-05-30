import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import * as XLSX from 'xlsx'

export function ExportPage() {
  const { user } = useAuth()
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  async function handleExport(fileFormat: 'csv' | 'xlsx') {
    if (!user) return
    setLoading(true)

    const { data: entries, error } = await supabase
      .from('transaction_entries')
      .select(`
        *,
        account:accounts(name, type),
        category:categories(name, type),
        group:transaction_groups!inner(date, type, description)
      `)
      .eq('user_id', user.id)
      .gte('transaction_groups.date', startDate)
      .lte('transaction_groups.date', endDate)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error || !entries) {
      toast.error('Failed to fetch data')
      return
    }

    const rows = entries.map((e: any) => ({
      Date: e.group?.date || '',
      Type: e.type,
      'Group Type': e.group?.type || '',
      Description: e.group?.description || '',
      Account: e.account?.name || '',
      Category: e.category?.name || '',
      Amount: (e.amount / 100).toFixed(2),
      'Personal Amount': e.personal_amount != null ? (e.personal_amount / 100).toFixed(2) : (e.amount / 100).toFixed(2),
      Note: e.note || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

    const fileName = `money-app-export-${startDate}-to-${endDate}`
    if (fileFormat === 'csv') {
      XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' })
    } else {
      XLSX.writeFile(wb, `${fileName}.xlsx`)
    }

    toast.success(`Exported ${rows.length} transactions`)
  }

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={loading}>
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button onClick={() => handleExport('xlsx')} disabled={loading}>
              <Download className="w-4 h-4 mr-2" /> Excel
            </Button>
          </div>

          {loading && <p className="text-sm text-center text-muted-foreground">Preparing export...</p>}
        </CardContent>
      </Card>
    </div>
  )
}
