import { useEffect, useState } from 'react'
import { CMS_BASE } from './cms'

export interface ReaderComment {
  name: string
  body: string
  at: number | null
}

export interface CommentsState {
  open: boolean
  comments: ReaderComment[]
}

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const asTime = (value: unknown): number | null => {
  if (typeof value === 'number' && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toReaderComments(raw: unknown): ReaderComment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const comment = entry as Record<string, unknown>
      const body = asText(comment.body ?? comment.text ?? comment.comment)
      return {
        name: asText(comment.name ?? comment.author) || 'Reader',
        body,
        at: asTime(comment.createdAt ?? comment.created_at ?? comment.when ?? comment.publishedAt ?? comment.at ?? comment.date),
      }
    })
    .filter((comment) => comment.body.length > 0)
}

export async function fetchComments(cmsId: number): Promise<CommentsState> {
  const res = await fetch(`${CMS_BASE}/api/public?resource=comments&id=${cmsId}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as Record<string, unknown>
  return {
    open: data.open !== false,
    comments: toReaderComments(data.comments),
  }
}

export async function postComment(
  cmsId: number,
  name: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${CMS_BASE}/api/public?resource=comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ id: cmsId, name, body }),
  })
  if (!res.ok) return { ok: false, error: 'The comment could not be sent just now. Please try again.' }
  const data = (await res.json().catch(() => null)) as { ok?: unknown; error?: unknown; fields?: unknown } | null
  if (data && data.ok === true) return { ok: true }
  const fields = data?.fields
  if (fields && typeof fields === 'object') {
    const messages = Object.values(fields as Record<string, unknown>)
    if (messages.length) return { ok: false, error: String(messages[0]) }
  }
  return { ok: false, error: 'The comment could not be sent just now. Please try again.' }
}

/** Loads and posts comments for one story. */
export function useStoryComments(cmsId: number | null) {
  const [state, setState] = useState<CommentsState | null>(null)
  const [loading, setLoading] = useState(cmsId !== null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (cmsId === null) {
      setState(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchComments(cmsId)
      .then((data) => {
        if (!cancelled) setState(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cmsId])

  const reload = () => {
    if (cmsId === null) return
    fetchComments(cmsId)
      .then((data) => setState(data))
      .catch(() => {})
  }

  return { state, loading, failed, reload }
}
