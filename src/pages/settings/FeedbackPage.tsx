import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Bug, Lightbulb, MessageSquare, Send, Check, Circle } from 'lucide-react'

interface FeedbackItem {
  id: string
  type: string
  message: string
  resolved: boolean
  created_at: string
}

const typeItems = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
]

const typeIcons: Record<string, typeof Bug> = {
  bug: Bug,
  feature: Lightbulb,
  other: MessageSquare,
}

const typeColors: Record<string, string> = {
  bug: 'destructive',
  feature: 'default',
  other: 'secondary',
}

export function FeedbackPage() {
  const { user } = useAuth()
  const [type, setType] = useState<string>('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: FeedbackItem[] | null }) => {
        if (!cancelled && data) setFeedbackList(data as FeedbackItem[])
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('Select a type'); return }
    if (!message.trim()) { toast.error('Enter a message'); return }
    if (!user) return

    setSaving(true)
    const { data, error } = await supabase
      .from('feedback')
      .insert({ user_id: user.id, type, message: message.trim() })
      .select()
      .single()
    setSaving(false)

    if (error) {
      toast.error('Failed to submit feedback')
    } else {
      toast.success('Feedback submitted! Thank you.')
      setMessage('')
      setType('')
      if (data) setFeedbackList(prev => [data as FeedbackItem, ...prev])
    }
  }

  const unresolvedItems = feedbackList.filter(f => !f.resolved)
  const resolvedItems = feedbackList.filter(f => f.resolved)

  return (
    <div className="space-y-4 py-4">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Submit Feedback</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v != null && setType(v)} items={typeItems}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Message</Label>
              <textarea
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none min-h-[100px] resize-y dark:bg-input/30"
                placeholder="Describe the bug or feature you'd like..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              <Send className="w-4 h-4 mr-2" />
              {saving ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!loading && feedbackList.length > 0 && (
        <>
          {unresolvedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Open ({unresolvedItems.length})
              </h3>
              <div className="space-y-2">
                {unresolvedItems.map(f => {
                  const Icon = typeIcons[f.type] || MessageSquare
                  return (
                    <Card key={f.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <Circle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={typeColors[f.type] as 'default' | 'destructive' | 'secondary'}>
                                <Icon className="w-3 h-3 mr-1" />
                                {f.type === 'bug' ? 'Bug' : f.type === 'feature' ? 'Feature' : 'Other'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(f.created_at, 'long')}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {resolvedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Resolved ({resolvedItems.length})
              </h3>
              <div className="space-y-2">
                {resolvedItems.map(f => {
                  const Icon = typeIcons[f.type] || MessageSquare
                  return (
                    <Card key={f.id} className="opacity-60">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <Check className="w-4 h-4 mt-0.5 shrink-0 text-success" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="secondary">
                                <Icon className="w-3 h-3 mr-1" />
                                {f.type === 'bug' ? 'Bug' : f.type === 'feature' ? 'Feature' : 'Other'}
                              </Badge>
                              <Badge variant="secondary" className="text-success border-success/30">
                                Resolved
                              </Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(f.created_at, 'long')}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap line-through">{f.message}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
