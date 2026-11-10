import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { isNewsItem } from './feed/parse'
import type { NewsItem } from './feed/types'

const KEY = '180news:saved:v1'
const MAX = 200

interface SavedContextValue {
  saved: NewsItem[]
  isSaved: (id: string) => boolean
  toggle: (item: NewsItem) => void
  remove: (id: string) => void
}

const SavedContext = createContext<SavedContextValue | null>(null)

function read(): NewsItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    const data: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data.filter(isNewsItem) : []
  } catch {
    return []
  }
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<NewsItem[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      /* storage unavailable – saved stories last for this visit only */
    }
  }, [saved])

  // Stay in step with other open tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSaved(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const ids = useMemo(() => new Set(saved.map((s) => s.id)), [saved])
  const isSaved = useCallback((id: string) => ids.has(id), [ids])
  const toggle = useCallback((item: NewsItem) => {
    setSaved((prev) => (prev.some((s) => s.id === item.id) ? prev.filter((s) => s.id !== item.id) : [item, ...prev].slice(0, MAX)))
  }, [])
  const remove = useCallback((id: string) => setSaved((prev) => prev.filter((s) => s.id !== id)), [])

  const value = useMemo(() => ({ saved, isSaved, toggle, remove }), [saved, isSaved, toggle, remove])
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext)
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>')
  return ctx
}
