import { useSettings } from '@/hooks/useSettings'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Repeat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FeatureToggle {
  key: string
  icon: LucideIcon
  name: string
  description: string
}

const features: FeatureToggle[] = [
  {
    key: 'feature_split',
    icon: Users,
    name: 'Split with friends',
    description: 'Split expenses with friends and track reimbursements to different accounts',
  },
  {
    key: 'feature_recurring',
    icon: Repeat,
    name: 'Recurring transactions',
    description: 'Set transactions to repeat automatically on a schedule',
  },
]

export function FeaturesPage() {
  const { isFeatureEnabled, updateSettings, loading } = useSettings()

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Toggle optional features on or off. Disabled features are hidden from the transaction form.
      </p>

      <div className="space-y-3">
        {features.map(f => {
          const enabled = isFeatureEnabled(f.key)
          const Icon = f.icon
          return (
            <Card key={f.key}>
              <CardContent className="py-4 px-4">
                <button
                  onClick={() => updateSettings({ [f.key]: !enabled })}
                  className="flex items-start gap-3 w-full text-left"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${enabled ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
