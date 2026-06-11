import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { Bell, Check, ChevronRight, ArrowRight } from 'lucide-react'
import type { Reminder, FundingBreakdown } from '@/hooks/useReminders'

interface ReminderBannerProps {
  reminders: Reminder[]
  accountNames: Map<string, string>
  onDismiss: (id: string, details?: { funded: FundingBreakdown[]; unfundedTotal: number }) => void
  onGetDetails: (reminder: Reminder) => Promise<{ funded: FundingBreakdown[]; unfundedTotal: number }>
}

export function ReminderBanner({ reminders, accountNames, onDismiss, onGetDetails }: ReminderBannerProps) {
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [details, setDetails] = useState<{ funded: FundingBreakdown[]; unfundedTotal: number } | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  if (reminders.length === 0) return null

  async function openDetails(reminder: Reminder) {
    setSelectedReminder(reminder)
    setLoadingDetails(true)
    const result = await onGetDetails(reminder)
    setDetails(result)
    setLoadingDetails(false)
  }

  function handleDismiss() {
    if (!selectedReminder) return
    onDismiss(selectedReminder.id, details || undefined)
    setSelectedReminder(null)
    setDetails(null)
  }

  const grandTotal = details ? details.funded.reduce((s, f) => s + f.total, 0) + details.unfundedTotal : 0

  return (
    <>
      <div className="space-y-2">
        {reminders.map(r => (
          <Card key={r.id} className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Bell className="w-5 h-5 text-warning shrink-0" />
              <button onClick={() => openDetails(r)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium">{r.title}</p>
                {r.account_id && accountNames.get(r.account_id) && (
                  <p className="text-xs text-muted-foreground">{accountNames.get(r.account_id)}</p>
                )}
              </button>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => openDetails(r)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDismiss(r.id)}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={selectedReminder !== null} onOpenChange={(open) => { if (!open) { setSelectedReminder(null); setDetails(null) } }}>
        <DialogContent>
          {selectedReminder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-warning" />
                  {selectedReminder.title}
                </DialogTitle>
              </DialogHeader>

              {selectedReminder.account_id && accountNames.get(selectedReminder.account_id) && (
                <p className="text-sm text-muted-foreground">
                  Account: {accountNames.get(selectedReminder.account_id)}
                </p>
              )}

              <div className="space-y-4">
                {loadingDetails ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : details && (details.funded.length > 0 || details.unfundedTotal > 0) ? (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Payment Breakdown</h3>

                    <div className="space-y-3">
                      {details.funded.map(f => (
                        <div key={f.funding_account_id} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">From</span>
                          <span className="font-medium">{f.account_name}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <CurrencyDisplay cents={f.total} type="expense" showSign={false} />
                        </div>
                      ))}

                      {details.unfundedTotal > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Other spending</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <CurrencyDisplay cents={details.unfundedTotal} type="expense" showSign={false} />
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Total</span>
                      <CurrencyDisplay cents={grandTotal} type="expense" showSign={false} className="text-base" />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transactions since last payment
                  </p>
                )}

                <Button className="w-full" onClick={handleDismiss}>
                  <Check className="w-4 h-4 mr-2" /> Mark as Paid
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
