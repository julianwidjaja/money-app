import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-react'
import type { Reminder } from '@/hooks/useReminders'

interface ReminderBannerProps {
  reminders: Reminder[]
  accountNames: Map<string, string>
  onDismiss: (id: string) => void
}

export function ReminderBanner({ reminders, accountNames, onDismiss }: ReminderBannerProps) {
  if (reminders.length === 0) return null

  return (
    <div className="space-y-2">
      {reminders.map(r => (
        <Card key={r.id} className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <Bell className="w-5 h-5 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{r.title}</p>
              {r.account_id && accountNames.get(r.account_id) && (
                <p className="text-xs text-muted-foreground">{accountNames.get(r.account_id)}</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => onDismiss(r.id)}>
              <Check className="w-4 h-4 mr-1" /> Done
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
