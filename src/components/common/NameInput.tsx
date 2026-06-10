import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'

interface NameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function NameInput({ value, onChange, placeholder = 'e.g. Lunch, Rent, Netflix...' }: NameInputProps) {
  const { user } = useAuth()
  const [pastNames, setPastNames] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('transaction_groups')
      .select('description')
      .eq('user_id', user.id)
      .not('description', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }: { data: { description: string }[] | null }) => {
        if (cancelled || !data) return
        const unique = [...new Set(
          data.map(d => d.description).filter((d): d is string => !!d && d.trim() !== '')
        )]
        setPastNames(unique)
      })

    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(val: string) {
    onChange(val)
    setSelectedIndex(-1)
    if (val.trim().length > 0) {
      const lower = val.toLowerCase()
      const matches = pastNames
        .filter(n => n.toLowerCase().includes(lower) && n.toLowerCase() !== lower)
        .slice(0, 3)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  function selectSuggestion(s: string) {
    onChange(s)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length > 0 && suggestions.length > 0) setShowSuggestions(true)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => selectSuggestion(s)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-popover-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
