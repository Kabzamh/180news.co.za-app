import { useEffect, useState } from 'react'
import type { MediaKind, MediaRef } from './feed/types'

/**
 * Photos, video and audio attached to reader articles.
 *
 * The files are too big for localStorage, so they live in this browser's
 * IndexedDB and articles only carry a small reference to each one. Like the
 * articles themselves, they never leave the device.
 */

export const MEDIA_LIMITS = {
  perArticle: 8,
  captionMax: 140,
  photo: { bytes: 25 * 1024 * 1024 },
  video: { bytes: 60 * 1024 * 1024, seconds: 120 },
  audio: { bytes: 20 * 1024 * 1024, seconds: 600 },
}

export const KIND_LABEL: Record<MediaKind, string> = { photo: 'Photo', video: 'Video', audio: 'Audio' }

const DB_NAME = '180news-media'
const STORE = 'files'
const ID_RE = /^m-[a-z0-9]{8,30}$/

export const isMediaId = (value: unknown): value is string => typeof value === 'string' && ID_RE.test(value)

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(1, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** "2 photos, 1 video" – empty when there is nothing attached. */
export function describeMedia(media: MediaRef[] | undefined): string {
  if (!media?.length) return ''
  const count = (kind: MediaKind) => media.filter((m) => m.kind === kind).length
  const parts: string[] = []
  const photos = count('photo')
  const videos = count('video')
  const audio = count('audio')
  if (photos) parts.push(`${photos} ${photos === 1 ? 'photo' : 'photos'}`)
  if (videos) parts.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`)
  if (audio) parts.push(`${audio} audio ${audio === 1 ? 'clip' : 'clips'}`)
  return parts.join(', ')
}

/* ---------------- storage ---------------- */

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'))
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  }).catch((err: unknown) => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

async function withStore(mode: IDBTransactionMode, work: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Storage failed'))
    tx.onabort = () => reject(tx.error ?? new Error('Storage failed'))
    work(tx.objectStore(STORE))
  })
}

/** Store one file and return the id articles refer to it by. */
export async function putMedia(blob: Blob): Promise<string> {
  const id = `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`
  try {
    await withStore('readwrite', (store) => store.put({ blob, at: Date.now() }, id))
  } catch (err) {
    const full = err instanceof DOMException && err.name === 'QuotaExceededError'
    throw new Error(
      full
        ? 'There is not enough free storage on this device for these files. Remove a video or delete an older article, then try again.'
        : 'This browser could not store the files. Private browsing windows often block this.',
    )
  }
  // Ask the browser not to clear these files when the device runs low on space.
  void navigator.storage?.persist?.().catch(() => false)
  return id
}

export async function getMedia(id: string): Promise<Blob | null> {
  try {
    let found: Blob | null = null
    await withStore('readonly', (store) => {
      const req = store.get(id)
      req.onsuccess = () => {
        const record = req.result as { blob?: unknown } | undefined
        found = record?.blob instanceof Blob ? record.blob : null
      }
    })
    return found
  } catch {
    return null
  }
}

export async function deleteMedia(ids: string[]): Promise<void> {
  if (!ids.length) return
  try {
    await withStore('readwrite', (store) => ids.forEach((id) => store.delete(id)))
  } catch {
    /* nothing more can be done; the sweep below tidies up later */
  }
}

/** Remove files no article refers to any more. Recent ones are left alone in case they are mid-publish. */
export async function sweepMedia(keep: Set<string>): Promise<void> {
  const cutoff = Date.now() - 60 * 60 * 1000
  try {
    await withStore('readwrite', (store) => {
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) return
        const record = cursor.value as { at?: unknown } | undefined
        const at = typeof record?.at === 'number' ? record.at : 0
        if (!keep.has(String(cursor.key)) && at < cutoff) cursor.delete()
        cursor.continue()
      }
    })
  } catch {
    /* tidying is best-effort */
  }
}

export type StoredMedia = { state: 'loading'; url: null } | { state: 'missing'; url: null } | { state: 'ready'; url: string }

/** Object URL for a stored file, released again when it is no longer shown. */
export function useStoredMedia(id: string): StoredMedia {
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    void getMedia(id).then((blob) => {
      if (cancelled) return
      url = blob ? URL.createObjectURL(blob) : null
      setLoaded({ id, url })
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  if (!loaded || loaded.id !== id) return { state: 'loading', url: null }
  return loaded.url ? { state: 'ready', url: loaded.url } : { state: 'missing', url: null }
}

/* ---------------- preparing a chosen file ---------------- */

const EXTENSIONS: Record<MediaKind, RegExp> = {
  photo: /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i,
  video: /\.(mp4|m4v|mov|webm|ogv|3gp)$/i,
  audio: /\.(mp3|m4a|aac|wav|oga|ogg|opus|flac|weba|amr)$/i,
}

export function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  // Some phones hand over files without a type; fall back to the file name.
  return (Object.keys(EXTENSIONS) as MediaKind[]).find((kind) => EXTENSIONS[kind].test(file.name)) ?? null
}

async function resizePhoto(file: File): Promise<Blob> {
  const unreadable = new Error(`${file.name}: that photo could not be read. Try a JPG or PNG.`)
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(unreadable)
      el.src = url
    })
    const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1600
    const scale = Math.min(1, 1600 / longest)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((img.naturalWidth || 1600) * scale))
    canvas.height = Math.max(1, Math.round((img.naturalHeight || 900) * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw unreadable
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob) throw unreadable
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Length in seconds, null when the file does not say, or a rejection when this browser cannot play it. */
function probeDuration(kind: 'video' | 'audio', blob: Blob): Promise<number | null> {
  const url = URL.createObjectURL(blob)
  return new Promise<number | null>((resolve, reject) => {
    const el = document.createElement(kind)
    const finish = (settle: () => void) => {
      window.clearTimeout(timer)
      el.onloadedmetadata = null
      el.onerror = null
      el.removeAttribute('src')
      el.load()
      URL.revokeObjectURL(url)
      settle()
    }
    const timer = window.setTimeout(() => finish(() => reject(new Error('timeout'))), 20_000)
    el.preload = 'metadata'
    el.muted = true
    el.onloadedmetadata = () => {
      const seconds = el.duration
      finish(() => resolve(Number.isFinite(seconds) && seconds > 0 ? seconds : null))
    }
    el.onerror = () => finish(() => reject(new Error('unplayable')))
    el.src = url
  })
}

export interface PreparedMedia {
  kind: MediaKind
  blob: Blob
  name: string
  type: string
  size: number
  duration?: number
}

/** Check a chosen file against the limits and get it ready to store. Throws a message meant for the reader. */
export async function prepareMedia(file: File): Promise<PreparedMedia> {
  const kind = kindOf(file)
  if (!kind) throw new Error(`${file.name}: choose a photo, a video or an audio file.`)

  if (kind === 'photo') {
    if (file.size > MEDIA_LIMITS.photo.bytes) throw new Error(`${file.name}: that photo is larger than ${formatBytes(MEDIA_LIMITS.photo.bytes)}.`)
    const blob = await resizePhoto(file)
    return { kind, blob, name: file.name, type: blob.type, size: blob.size }
  }

  const limit = MEDIA_LIMITS[kind]
  const noun = kind === 'video' ? 'video' : 'audio clip'
  if (file.size > limit.bytes) {
    throw new Error(`${file.name}: that ${noun} is ${formatBytes(file.size)}. The limit is ${formatBytes(limit.bytes)} — trim it or export it at a lower quality.`)
  }
  let duration: number | null
  try {
    duration = await probeDuration(kind, file)
  } catch {
    throw new Error(
      `${file.name}: this browser cannot play that ${noun}. ${kind === 'video' ? 'MP4 or WebM files work best.' : 'MP3, M4A or WAV files work best.'}`,
    )
  }
  if (duration !== null && duration > limit.seconds + 1) {
    throw new Error(`${file.name}: that ${noun} is ${formatDuration(duration)} long. The limit is ${limit.seconds / 60} minutes.`)
  }
  return { kind, blob: file, name: file.name, type: file.type, size: file.size, ...(duration !== null ? { duration } : {}) }
}

/** Shrink a chosen picture to a JPEG data URL small enough to keep in browser storage. */
export async function pictureToDataUrl(file: File, maxWidth = 1000, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a picture file, such as a JPG or PNG.')
  if (file.size > 20 * 1024 * 1024) throw new Error('That picture is larger than 20 MB. Choose a smaller one.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That picture could not be read. Try a JPG or PNG.'))
      el.src = url
    })
    const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((img.naturalWidth || 1000) * scale))
    canvas.height = Math.max(1, Math.round((img.naturalHeight || 562) * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('That picture could not be read. Try a JPG or PNG.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
