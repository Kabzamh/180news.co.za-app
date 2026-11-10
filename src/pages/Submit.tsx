import { FileUp, ImagePlus, Mail, Paperclip, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArticleList } from '../components/ArticleList'
import { MediaFrame, StoredFrame } from '../components/Media'
import { LIMITS, TAG_LIMIT, TAG_MAX, parseTags, useControl } from '../lib/control'
import type { Article } from '../lib/control'
import { useTitle } from '../lib/extras'
import type { MediaKind, MediaRef, SectionId } from '../lib/feed/types'
import { fullDate } from '../lib/format'
import { LINK_LIMIT, parseLink } from '../lib/links'
import { KIND_LABEL, MEDIA_LIMITS, deleteMedia, formatBytes, formatDuration, pictureToDataUrl, prepareMedia, putMedia } from '../lib/media'

const DRAFT_KEY = '180news:draft:v1'
const field = 'w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'
const label = 'block text-[15px] font-extrabold'
const hint = 'mt-1 text-[13px] leading-snug text-muted'
const errorText = 'mt-1.5 text-[13.5px] font-bold text-brand'

/** A file on the form: either already stored with the article, or chosen and waiting to be published. */
interface Attachment {
  key: string
  kind: MediaKind
  name: string
  type: string
  size: number
  duration?: number
  caption: string
  stored?: MediaRef
  blob?: Blob
  url?: string
}

interface Fields {
  title: string
  summary: string
  body: string
  author: string
  section: SectionId | ''
  /** YouTube and Facebook links as typed, one per line. */
  links: string
  /** Tags as typed, separated by commas. */
  tags: string
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Epoch milliseconds -> the value a date-and-time field expects, in the device's own time. */
function toLocalInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const YEAR_MS = 366 * 24 * 60 * 60 * 1000

function readDraft(): Partial<Fields> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const data: unknown = raw ? JSON.parse(raw) : null
    if (!data || typeof data !== 'object') return {}
    const out: Record<string, string> = {}
    for (const key of ['title', 'summary', 'body', 'author', 'section', 'links', 'tags'] as const) {
      const value = (data as Record<string, unknown>)[key]
      if (typeof value === 'string') out[key] = value
    }
    return out as Partial<Fields>
  } catch {
    return {}
  }
}

export default function Submit() {
  const [params] = useSearchParams()
  const { articles } = useControl()
  const editId = params.get('edit')
  const editing = editId ? articles.find((a) => a.id === editId) : undefined
  // Keyed so the form starts clean when switching between a new article and an edit.
  return <SubmitView key={editing?.id ?? 'new'} editing={editing} />
}

function SubmitView({ editing }: { editing?: Article }) {
  useTitle(editing ? 'Edit article' : 'Write an article')
  const navigate = useNavigate()
  const { sections, settings, articles, saveArticle } = useControl()

  const [fields, setFields] = useState<Fields>(() => {
    if (editing) return { title: editing.title, summary: editing.summary, body: editing.body, author: editing.author, section: editing.section, links: (editing.links ?? []).join('\n'), tags: (editing.tags ?? []).join(', ') }
    const draft = readDraft()
    return { title: draft.title ?? '', summary: draft.summary ?? '', body: draft.body ?? '', author: draft.author ?? '', section: draft.section ?? '', links: draft.links ?? '', tags: draft.tags ?? '' }
  })
  const [image, setImage] = useState<string | undefined>(editing?.image)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | 'image' | 'form' | 'publishAt', string>>>({})
  // Publishing: straight away, or at a chosen date and time.
  const [wasPending] = useState(() => !!editing?.publishAt && editing.publishAt > Date.now())
  const [when, setWhen] = useState<'now' | 'later'>(wasPending ? 'later' : 'now')
  const [at, setAt] = useState(() => (wasPending && editing?.publishAt ? toLocalInput(editing.publishAt) : ''))
  const [minAt] = useState(() => toLocalInput(Date.now()))
  const atMs = at ? new Date(at).getTime() : NaN
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState<{ id: string; title: string; at?: number } | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>(() =>
    (editing?.media ?? []).map((m) => ({ key: m.id, kind: m.kind, name: m.name, type: m.type, size: m.size, duration: m.duration, caption: m.caption ?? '', stored: m })),
  )
  const [mediaErrors, setMediaErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const pictureInput = useRef<HTMLInputElement>(null)
  const mediaInput = useRef<HTMLInputElement>(null)
  const previewUrls = useRef(new Set<string>())

  // Release the previews of chosen files when leaving the form.
  useEffect(() => {
    const urls = previewUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const onMediaFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    const problems: string[] = []
    const added: Attachment[] = []
    let room = MEDIA_LIMITS.perArticle - attachments.length
    for (const file of files) {
      if (room <= 0) {
        problems.push(`An article can carry up to ${MEDIA_LIMITS.perArticle} files. The rest were left out.`)
        break
      }
      try {
        const ready = await prepareMedia(file)
        const url = URL.createObjectURL(ready.blob)
        previewUrls.current.add(url)
        added.push({ key: `new-${Date.now().toString(36)}-${added.length}`, ...ready, caption: '', url })
        room -= 1
      } catch (err) {
        problems.push(err instanceof Error ? err.message : `${file.name}: that file could not be read.`)
      }
    }
    setAttachments((prev) => [...prev, ...added].slice(0, MEDIA_LIMITS.perArticle))
    setMediaErrors(problems)
    setBusy(false)
  }

  const removeAttachment = (key: string) => {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.key === key)
      if (gone?.url) {
        URL.revokeObjectURL(gone.url)
        previewUrls.current.delete(gone.url)
      }
      return prev.filter((a) => a.key !== key)
    })
    setMediaErrors([])
  }

  const setCaption = (key: string, caption: string) => setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, caption } : a)))
  const textInput = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  // Keep unfinished writing safe from an accidental reload or navigation.
  useEffect(() => {
    if (editing) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(fields))
    } catch {
      /* a draft is a convenience only */
    }
  }, [fields, editing])

  useEffect(() => {
    if (published) doneRef.current?.focus()
  }, [published])

  const set = (key: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const onPicture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setImage(await pictureToDataUrl(file))
      setErrors((prev) => ({ ...prev, image: undefined }))
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: err instanceof Error ? err.message : 'That picture could not be read.' }))
    } finally {
      setBusy(false)
    }
  }

  const onTextFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 300 * 1024 || !(file.type.startsWith('text/') || /\.(txt|md|markdown)$/i.test(file.name))) {
      setErrors((prev) => ({ ...prev, body: 'Choose a plain text file (.txt or .md) smaller than 300 KB.' }))
      return
    }
    const content = (await file.text()).replace(/\r\n?/g, '\n').trim()
    if (!content) {
      setErrors((prev) => ({ ...prev, body: 'That file is empty.' }))
      return
    }
    setFields((prev) => {
      // With no headline yet, a short first line of the file becomes the headline.
      const [first, ...rest] = content.split('\n')
      const useFirst = !prev.title.trim() && first.trim().length <= LIMITS.titleMax && rest.join('').trim().length > 0
      return {
        ...prev,
        title: useFirst ? first.replace(/^#+\s*/, '').trim() : prev.title,
        body: (useFirst ? rest.join('\n').trim() : content).slice(0, LIMITS.bodyMax),
      }
    })
    setErrors((prev) => ({ ...prev, body: undefined, title: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const title = fields.title.trim()
    const body = fields.body.trim()
    const author = fields.author.trim()
    const next: typeof errors = {}
    if (title.length < LIMITS.titleMin) next.title = `Write a headline of at least ${LIMITS.titleMin} characters.`
    if (!fields.section) next.section = 'Choose the section this belongs in.'
    if (author.length < LIMITS.authorMin) next.author = 'Add your name as it should appear on the article.'
    if (body.length < LIMITS.bodyMin) next.body = `Write at least ${LIMITS.bodyMin} characters — you have ${body.length}.`
    setErrors(next)
    // Links may be separated by new lines or spaces; each must be a YouTube or Facebook link.
    const typed = fields.links.split(/\s+/).filter(Boolean)
    const links = [...new Set(typed.map((entry) => parseLink(entry)?.url).filter((url): url is string => !!url))]
    const badLink = typed.find((entry) => !parseLink(entry))
    if (badLink) next.links = `“${badLink.length > 50 ? `${badLink.slice(0, 50)}…` : badLink}” is not a YouTube or Facebook link. Correct it or take it out.`
    else if (links.length > LINK_LIMIT) next.links = `An article can carry up to ${LINK_LIMIT} links — you have ${links.length}.`
    const tags = parseTags(fields.tags)
    const longTag = tags.find((t) => t.length > TAG_MAX)
    if (longTag) next.tags = `“${longTag.slice(0, 30)}…” is too long for a tag. Keep each tag to ${TAG_MAX} characters.`
    else if (tags.length > TAG_LIMIT) next.tags = `Use up to ${TAG_LIMIT} tags — you have ${tags.length}.`
    let publishAt: number | undefined
    if (when === 'later') {
      const now = Date.now()
      if (Number.isNaN(atMs)) next.publishAt = 'Choose the date and time to publish.'
      else if (atMs < now + 60_000) next.publishAt = 'Choose a time at least a minute from now.'
      else if (atMs > now + YEAR_MS) next.publishAt = 'Choose a time within the next year.'
      else publishAt = atMs
    }
    const firstBad = (['title', 'section', 'author', 'body', 'tags', 'links', 'publishAt'] as const).find((key) => next[key])
    if (firstBad) {
      document.getElementById(`article-${firstBad}`)?.focus()
      return
    }

    // Store the newly chosen files first, so the article never points at something that is not there.
    setSaving(true)
    const justStored: string[] = []
    const media: MediaRef[] = []
    try {
      for (const a of attachments) {
        const caption = a.caption.trim()
        const id = a.stored?.id ?? (a.blob ? await putMedia(a.blob) : null)
        if (!id) continue
        if (!a.stored) justStored.push(id)
        media.push({ id, kind: a.kind, name: a.name, type: a.type, size: a.size, ...(a.duration ? { duration: a.duration } : {}), ...(caption ? { caption } : {}) })
      }
    } catch (err) {
      await deleteMedia(justStored)
      setErrors({ form: err instanceof Error ? err.message : 'The files could not be stored.' })
      setSaving(false)
      return
    }

    const result = saveArticle({ title, summary: fields.summary.trim(), body, author, section: fields.section as SectionId, image, media, links, tags, publishAt }, editing?.id)
    if (!result.ok) {
      await deleteMedia(justStored)
      setErrors({ form: result.error })
      setSaving(false)
      return
    }
    setSaving(false)
    if (editing) {
      // Files taken off the article while editing are no longer needed.
      const kept = new Set(media.map((m) => m.id))
      void deleteMedia((editing.media ?? []).map((m) => m.id).filter((id) => !kept.has(id)))
      navigate(`/story/${result.id}`)
      return
    }
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* nothing to clear */
    }
    setPublished({ id: result.id, title, at: publishAt })
    setFields({ title: '', summary: '', body: '', author, section: '', links: '', tags: '' })
    setWhen('now')
    setAt('')
    setImage(undefined)
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current.clear()
    setAttachments([])
    setMediaErrors([])
  }

  const mailto = `mailto:${settings.email}?subject=${encodeURIComponent(published ? `Article submission: ${published.title}` : 'Article submission')}`

  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{editing ? 'Edit article' : 'Write an article'}</h1>
        <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-body">
          Your article appears on 180news in this browser as soon as you publish it. It is stored on this device only, so other readers cannot
          see it — to share it, email it to the newsroom at{' '}
          <a href={`mailto:${settings.email}`} className="font-bold text-navy underline">
            {settings.email}
          </a>
          .
        </p>
      </header>

      {published && (
        <div ref={doneRef} tabIndex={-1} role="status" className="mt-6 border-l-4 border-navy bg-navy-tint p-5 outline-none">
          <h2 className="text-xl font-extrabold tracking-tight">
            {published.at ? 'Scheduled' : 'Published'}: {published.title}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-body">
            {published.at
              ? `It goes into the headline news, its section, Latest and search on this device on ${fullDate(published.at)}. Until then only you can see it, as a preview.`
              : 'It is now in the headline news on the front page, and in its section, Latest and search on this device.'}{' '}
            To {published.at ? 'publish it sooner or ' : ''}make it the main headline, use the{' '}
            <Link to="/control" className="font-bold text-navy underline">
              Control panel
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link to={`/story/${published.id}`} className="inline-flex h-12 items-center bg-brand px-5 text-[15px] font-extrabold text-white hover:bg-brand-strong">
              {published.at ? 'Preview article' : 'View article'}
            </Link>
            <a href={mailto} className="inline-flex h-12 items-center gap-2 border-2 border-navy px-5 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white">
              <Mail size={17} strokeWidth={2.4} aria-hidden="true" /> Email the newsroom
            </a>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
        <div>
          <label htmlFor="article-title" className={label}>
            Headline
          </label>
          <input
            id="article-title"
            value={fields.title}
            onChange={set('title')}
            maxLength={LIMITS.titleMax}
            aria-invalid={!!errors.title}
            aria-describedby="article-title-help"
            autoComplete="off"
            className={`${field} mt-2 h-12 font-bold`}
          />
          <p id="article-title-help" className={errors.title ? errorText : hint}>
            {errors.title ?? `${fields.title.length}/${LIMITS.titleMax} characters`}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="article-section" className={label}>
              Section
            </label>
            <select
              id="article-section"
              value={fields.section}
              onChange={set('section')}
              aria-invalid={!!errors.section}
              aria-describedby={errors.section ? 'article-section-help' : undefined}
              className={`${field} mt-2 h-12 cursor-pointer`}
            >
              <option value="">Choose a section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.section && (
              <p id="article-section-help" className={errorText}>
                {errors.section}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="article-author" className={label}>
              Your name
            </label>
            <input
              id="article-author"
              value={fields.author}
              onChange={set('author')}
              maxLength={LIMITS.authorMax}
              aria-invalid={!!errors.author}
              aria-describedby={errors.author ? 'article-author-help' : undefined}
              autoComplete="name"
              className={`${field} mt-2 h-12`}
            />
            {errors.author && (
              <p id="article-author-help" className={errorText}>
                {errors.author}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="article-summary" className={label}>
            Summary <span className="font-semibold text-muted">(optional)</span>
          </label>
          <textarea
            id="article-summary"
            value={fields.summary}
            onChange={set('summary')}
            maxLength={LIMITS.summaryMax}
            rows={2}
            aria-describedby="article-summary-help"
            className={`${field} mt-2 py-3 leading-relaxed`}
          />
          <p id="article-summary-help" className={hint}>
            One or two sentences shown under the headline. Left empty, the opening of your article is used. {fields.summary.length}/{LIMITS.summaryMax}
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="article-body" className={label}>
              Article
            </label>
            <button
              type="button"
              onClick={() => textInput.current?.click()}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy"
            >
              <FileUp size={16} strokeWidth={2.3} aria-hidden="true" /> Upload a text file
            </button>
            <input ref={textInput} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={onTextFile} className="hidden" tabIndex={-1} />
          </div>
          <textarea
            id="article-body"
            value={fields.body}
            onChange={set('body')}
            maxLength={LIMITS.bodyMax}
            rows={14}
            aria-invalid={!!errors.body}
            aria-describedby="article-body-help"
            className={`${field} mt-2 py-3 leading-relaxed`}
          />
          <p id="article-body-help" className={errors.body ? errorText : hint}>
            {errors.body ?? `Leave an empty line between paragraphs. ${fields.body.trim().length.toLocaleString('en-ZA')} characters`}
          </p>
        </div>

        <div>
          <label htmlFor="article-tags" className={label}>
            Tags <span className="font-semibold text-muted">(optional)</span>
          </label>
          <input
            id="article-tags"
            value={fields.tags}
            onChange={set('tags')}
            maxLength={200}
            aria-invalid={!!errors.tags}
            aria-describedby="article-tags-help"
            autoComplete="off"
            autoCapitalize="none"
            className={`${field} mt-2 h-12`}
          />
          <p id="article-tags-help" className={errors.tags ? errorText : hint}>
            {errors.tags ?? `Topics that help readers find this, separated by commas — up to ${TAG_LIMIT}. For example: Ward 12, water, service delivery`}
          </p>
        </div>

        <div>
          <p className={label} id="article-image-label">
            Main picture <span className="font-semibold text-muted">(optional)</span>
          </p>
          <input ref={pictureInput} type="file" accept="image/*" onChange={onPicture} className="hidden" tabIndex={-1} />
          {image ? (
            <div className="mt-2 flex flex-wrap items-start gap-4">
              <img src={image} alt="Chosen picture" className="aspect-[16/9] w-full max-w-sm bg-wash object-cover" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pictureInput.current?.click()}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy"
                >
                  <ImagePlus size={16} strokeWidth={2.3} aria-hidden="true" /> Replace
                </button>
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-bold hover:border-brand hover:text-brand"
                >
                  <X size={16} strokeWidth={2.5} aria-hidden="true" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => pictureInput.current?.click()}
              aria-describedby="article-image-label"
              disabled={busy}
              className="mt-2 flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-ink/30 bg-wash px-4 py-6 text-[15px] font-bold text-navy hover:border-navy disabled:cursor-progress"
            >
              <ImagePlus size={24} strokeWidth={2} aria-hidden="true" />
              {busy ? 'Preparing picture…' : 'Upload a picture'}
              <span className="text-[13px] font-normal text-muted">JPG, PNG or WebP. It is resized to fit.</span>
            </button>
          )}
          {errors.image && (
            <p className={errorText} role="alert">
              {errors.image}
            </p>
          )}
        </div>

        <div>
          <p className={label} id="article-media-label">
            Photos, video and audio <span className="font-semibold text-muted">(optional)</span>
          </p>
          <p className={hint} id="article-media-help">
            Up to {MEDIA_LIMITS.perArticle} files, shown after your text. Video up to {MEDIA_LIMITS.video.seconds / 60} minutes (
            {formatBytes(MEDIA_LIMITS.video.bytes)}), audio up to {MEDIA_LIMITS.audio.seconds / 60} minutes ({formatBytes(MEDIA_LIMITS.audio.bytes)}). Photos
            are resized to fit.
          </p>
          <input ref={mediaInput} type="file" multiple accept="image/*,video/*,audio/*" onChange={onMediaFiles} className="hidden" tabIndex={-1} />

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-3">
              {attachments.map((a) => (
                <li key={a.key} className="flex flex-wrap items-start gap-x-4 gap-y-3 border border-line bg-wash p-3 sm:p-4">
                  <div className={a.kind === 'photo' ? 'w-28 shrink-0 sm:w-36' : 'w-full sm:w-72 sm:shrink-0'}>
                    {a.stored ? (
                      <StoredFrame media={a.stored} compact />
                    ) : (
                      a.url && <MediaFrame kind={a.kind} url={a.url} label={`${KIND_LABEL[a.kind]}: ${a.name}`} compact />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 basis-52">
                    <p className="truncate text-[14.5px] font-extrabold">
                      {KIND_LABEL[a.kind]} <span className="font-semibold text-body">· {a.name}</span>
                    </p>
                    <p className="text-[13px] text-muted">
                      {formatBytes(a.size)}
                      {a.duration ? ` · ${formatDuration(a.duration)}` : ''}
                    </p>
                    <label htmlFor={`media-caption-${a.key}`} className="mt-2 block text-[13.5px] font-extrabold">
                      Caption <span className="font-semibold text-muted">(optional)</span>
                    </label>
                    <input
                      id={`media-caption-${a.key}`}
                      value={a.caption}
                      onChange={(e) => setCaption(a.key, e.target.value)}
                      maxLength={MEDIA_LIMITS.captionMax}
                      autoComplete="off"
                      className={`${field} mt-1 h-11`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.key)}
                      aria-label={`Remove ${a.name}`}
                      className="mt-2.5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-bold hover:border-brand hover:text-brand"
                    >
                      <X size={16} strokeWidth={2.5} aria-hidden="true" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {attachments.length < MEDIA_LIMITS.perArticle && (
            <button
              type="button"
              onClick={() => mediaInput.current?.click()}
              aria-describedby="article-media-help"
              disabled={busy || saving}
              className="mt-3 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2.5 border-2 border-dashed border-ink/30 bg-wash px-4 py-3 text-[15px] font-bold text-navy hover:border-navy disabled:cursor-progress"
            >
              <Paperclip size={19} strokeWidth={2.2} aria-hidden="true" />
              {busy ? 'Preparing files…' : attachments.length ? 'Add more photos, video or audio' : 'Add photos, video or audio'}
            </button>
          )}

          {mediaErrors.length > 0 && (
            <ul role="alert" className="mt-2 space-y-1">
              {mediaErrors.map((message) => (
                <li key={message} className="text-[13.5px] font-bold text-brand">
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="article-links" className={label}>
            YouTube and Facebook links <span className="font-semibold text-muted">(optional)</span>
          </label>
          <textarea
            id="article-links"
            value={fields.links}
            onChange={set('links')}
            rows={3}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!errors.links}
            aria-describedby="article-links-help"
            className={`${field} mt-2 py-3 leading-relaxed`}
          />
          <p id="article-links-help" className={errors.links ? errorText : hint}>
            {errors.links ??
              `One link per line, up to ${LINK_LIMIT}. YouTube videos play inside your article. Facebook videos can be played there too; other Facebook links open on Facebook.`}
          </p>
        </div>

        <fieldset>
          <legend className={label}>When to publish</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['now', editing && !wasPending ? 'Keep it published' : 'Publish now'],
                ['later', 'Schedule for later'],
              ] as const
            ).map(([value, name]) => (
              <label
                key={value}
                className={`inline-flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-bold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy ${
                  when === value ? 'border-navy bg-navy text-white' : 'border-ink/35 text-ink hover:border-navy'
                }`}
              >
                <input
                  type="radio"
                  name="publish-when"
                  value={value}
                  checked={when === value}
                  onChange={() => {
                    setWhen(value)
                    setErrors((prev) => (prev.publishAt ? { ...prev, publishAt: undefined } : prev))
                  }}
                  className="sr-only"
                />
                {name}
              </label>
            ))}
          </div>
          {when === 'later' && (
            <div className="mt-4 max-w-sm">
              <label htmlFor="article-publishAt" className="block text-[14px] font-extrabold">
                Date and time
              </label>
              <input
                id="article-publishAt"
                type="datetime-local"
                value={at}
                min={minAt}
                onChange={(e) => {
                  setAt(e.target.value)
                  setErrors((prev) => (prev.publishAt ? { ...prev, publishAt: undefined } : prev))
                }}
                aria-invalid={!!errors.publishAt}
                aria-describedby="article-publishAt-help"
                className={`${field} mt-1.5 h-12`}
              />
              <p id="article-publishAt-help" className={errors.publishAt ? errorText : hint}>
                {errors.publishAt ??
                  (Number.isNaN(atMs)
                    ? 'The article stays off the site until then. Only you can see it, as a preview.'
                    : `Goes live on ${fullDate(atMs)}.${editing && !wasPending ? ' It comes off the site until then.' : ''}`)}
              </p>
            </div>
          )}
        </fieldset>

        {errors.form && (
          <p role="alert" className="border-l-4 border-brand bg-brand-tint p-4 text-[15px] font-bold text-brand">
            {errors.form}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <button
            type="submit"
            disabled={busy || saving}
            className="inline-flex h-12 cursor-pointer items-center bg-brand px-7 text-base font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : when === 'later' ? 'Schedule article' : 'Publish article'}
          </button>
          {editing && (
            <Link to="/submit" className="inline-flex h-12 items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white">
              Cancel
            </Link>
          )}
        </div>
      </form>

      {!editing && articles.length > 0 && (
        <section aria-labelledby="your-articles" className="mt-14">
          <h2 id="your-articles" className="mb-4 text-2xl font-extrabold tracking-tight">
            Your articles
          </h2>
          <ArticleList />
        </section>
      )}
    </div>
  )
}
