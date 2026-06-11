import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Settings = Record<string, boolean>

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: { settings: Settings } | null }) => {
        if (!cancelled && data?.settings) setSettings(data.settings)
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  async function updateSettings(updates: Record<string, boolean>) {
    const merged = { ...settings, ...updates }
    setSettings(merged)
    if (!user) return
    await supabase
      .from('profiles')
      .update({ settings: merged })
      .eq('id', user.id)
  }

  function isFeatureEnabled(key: string): boolean {
    return settings[key] !== false
  }

  return { settings, loading, updateSettings, isFeatureEnabled }
}
