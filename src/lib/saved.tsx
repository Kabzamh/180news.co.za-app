import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isArticle, type Article } from './news/parse'

const KEY = '180news:saved:v1'
const LIMIT = 200

function read(): Article[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isArticle) : []
  } catch {
    return []
  }
}

interface SavedValue {
  saved: Article[]
  isSaved: (id: string) => boolean
  toggle: (article: Article) => void
  remove: (id: string) => void
}

const SavedContext = createContext<SavedValue | null>(null)

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Article[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      /* ignore */
    }
  }, [saved])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setSaved(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const ids = useMemo(() => new Set(saved.map((a) => a.id)), [saved])
  const isSaved = useCallback((id: string) => ids.has(id), [ids])
  const toggle = useCallback((article: Article) => {
    // data-URL images would bloat storage — saved copies keep the headline and summary only
    const item = article.image?.startsWith('data:') ? { ...article, image: undefined } : article
    setSaved((current) => (current.some((a) => a.id === article.id) ? current.filter((a) => a.id !== article.id) : [item, ...current].slice(0, LIMIT)))
  }, [])
  const remove = useCallback((id: string) => setSaved((current) => current.filter((a) => a.id !== id)), [])

  const value = useMemo<SavedValue>(() => ({ saved, isSaved, toggle, remove }), [saved, isSaved, toggle, remove])
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
}

export function useSaved(): SavedValue {
  const ctx = useContext(SavedContext)
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>')
  return ctx
}
