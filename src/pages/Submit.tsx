import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Save, Send } from 'lucide-react'
import { useControl, ARTICLE_LIMITS, parseTags, type OwnArticle } from '../lib/control'
import { useAuth } from '../lib/auth'
import { useTitle } from '../lib/weather'

const FIELD = 'w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'
const LABEL = 'block text-[15px] font-extrabold'
const HINT = 'mt-1 text-[13px] leading-snug text-muted'
const ERROR = 'mt-1.5 text-[13.5px] font-bold text-brand'
const BUTTON = 'inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70'

function toLocalInput(value: number): string {
  const date = new Date(value)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function shrinkImage(file: File, max = 1000): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('That picture could not be read. Try a JPG or PNG.'))
      img.src = url
    })
    const scale = Math.min(1, max / (image.naturalWidth || max))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((image.naturalWidth || 1000) * scale))
    canvas.height = Math.max(1, Math.round((image.naturalHeight || 562) * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('That picture could not be read. Try a JPG or PNG.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
    if (dataUrl.length > ARTICLE_LIMITS.imageBytes) throw new Error('That picture is still too large after resizing. Choose a smaller one.')
    return dataUrl
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function Submit() {
  useTitle('Write for 180news')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { articles, addArticle, sections } = useControl()
  const { status, user } = useAuth()
  const editingId = params.get('edit') ?? undefined
  const editing = editingId ? articles.find((a) => a.id === editingId) : undefined
  const [form, setForm] = useState(() => ({
    title: editing?.title ?? '',
    summary: editing?.summary ?? '',
    body: editing?.body ?? '',
    author: editing?.author ?? '',
    section: editing?.section ?? sections[0]?.id ?? 'south-africa',
    tags: editing?.tags?.join(', ') ?? '',
    links: editing?.links?.join('\n') ?? '',
    image: editing?.image ?? '',
    publishAt: editing?.publishAt ? toLocalInput(editing.publishAt) : '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status_, setStatus_] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    document.title = (editing ? `Edit: ${editing.title}` : 'Write for 180news') + ' | 180news'
  }, [editing])

  const set = <K extends keyof typeof form>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onImage = async (file: File | undefined) => {
    setImageError('')
    if (!file) return
    try {
      set('image', await shrinkImage(file))
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'That picture could not be read.')
    }
  }

  const submit = async (schedule: boolean) => {
    setErrors({})
    setStatus_('saving')
    setMessage('')
    const next: Record<string, string> = {}
    if (form.title.trim().length < ARTICLE_LIMITS.titleMin) next.title = `The headline needs at least ${ARTICLE_LIMITS.titleMin} characters.`
    if (form.title.trim().length > ARTICLE_LIMITS.titleMax) next.title = `Keep the headline under ${ARTICLE_LIMITS.titleMax} characters.`
    if (form.author.trim().length < ARTICLE_LIMITS.authorMin) next.author = 'Add the name readers will see.'
    if (form.body.trim().length < ARTICLE_LIMITS.bodyMin) next.body = `The story needs at least ${ARTICLE_LIMITS.bodyMin} characters.`
    setErrors(next)
    if (Object.keys(next).length) {
      setStatus_('error')
      return
    }
    const publishAt = schedule && form.publishAt ? new Date(form.publishAt).getTime() : undefined
    const result = addArticle(
      {
        title: form.title.trim(),
        summary: form.summary.trim().slice(0, ARTICLE_LIMITS.summaryMax),
        body: form.body.trim(),
        author: form.author.trim(),
        section: form.section,
        tags: parseTags(form.tags),
        links: form.links.split(/\n+/).map((l) => l.trim()).filter((l) => /^https:\/\//.test(l)).slice(0, 6),
        ...(form.image ? { image: form.image } : { image: undefined }),
        ...(publishAt ? { publishAt } : { publishAt: undefined }),
      } as Partial<OwnArticle>,
      editing?.id,
    )
    if (result.ok) {
      setStatus_('done')
      setMessage(schedule && publishAt ? 'Saved and scheduled. It goes live at the time you set.' : 'Saved. It is live on this device now.')
      window.setTimeout(() => navigate(`/story/${result.id}`), 900)
    } else {
      setStatus_('error')
      setMessage(result.error ?? 'The article could not be saved.')
    }
  }

  if (status !== 'signed-in' || !user) {
    return (
      <div className="wrap max-w-[620px] pt-7 md:pt-10">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em]">Write for 180news</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-body">
          The writing desk is for the 180news team. <Link to="/admin" className="font-bold text-navy underline">Sign in</Link> to continue, or{' '}
          <Link to="/" className="font-bold text-navy underline">go back to the news</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="wrap max-w-[720px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{editing ? 'Edit article' : 'Write for 180news'}</h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-muted">
          Everything is stored in this browser only. Sign in as the owner on another device and use the backup in the Control panel to move work between them.
        </p>
      </header>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit(false)
        }}
      >
        <div>
          <label htmlFor="title" className={LABEL}>
            Headline
          </label>
          <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={ARTICLE_LIMITS.titleMax} className={FIELD} />
          {errors.title && <p className={ERROR}>{errors.title}</p>}
        </div>
        <div>
          <label htmlFor="summary" className={LABEL}>
            Standfirst (optional)
          </label>
          <textarea id="summary" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} maxLength={ARTICLE_LIMITS.summaryMax} className={FIELD} />
          <p className={HINT}>One or two sentences shown under the headline, up to {ARTICLE_LIMITS.summaryMax} characters.</p>
        </div>
        <div>
          <label htmlFor="body" className={LABEL}>
            Story
          </label>
          <textarea id="body" rows={12} value={form.body} onChange={(e) => set('body', e.target.value)} maxLength={ARTICLE_LIMITS.bodyMax} className={FIELD} />
          {errors.body && <p className={ERROR}>{errors.body}</p>}
          <p className={HINT}>Leave a blank line between paragraphs.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="author" className={LABEL}>
              Your name
            </label>
            <input id="author" value={form.author} onChange={(e) => set('author', e.target.value)} maxLength={ARTICLE_LIMITS.authorMax} className={FIELD} />
            {errors.author && <p className={ERROR}>{errors.author}</p>}
          </div>
          <div>
            <label htmlFor="section" className={LABEL}>
              Section
            </label>
            <select id="section" value={form.section} onChange={(e) => set('section', e.target.value)} className={FIELD}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="tags" className={LABEL}>
            Tags (optional)
          </label>
          <input id="tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} className={FIELD} placeholder="water, Rand Water, Johannesburg"
          />
          <p className={HINT}>Up to five, separated by commas. Readers reach them at /tag/… addresses.</p>
        </div>
        <div>
          <label htmlFor="links" className={LABEL}>
            Links in the story (optional)
          </label>
          <textarea id="links" rows={2} value={form.links} onChange={(e) => set('links', e.target.value)} className={FIELD} placeholder="https://…\nhttps://…" />
          <p className={HINT}>One web address per line, up to six.</p>
        </div>
        <div>
          <label htmlFor="picture" className={LABEL}>
            Picture (optional)
          </label>
          <input id="picture" type="file" accept="image/*" onChange={(e) => void onImage(e.target.files?.[0])} className="mt-1 block w-full text-[15px]" />
          {imageError && <p className={ERROR}>{imageError}</p>}
          {form.image && (
            <div className="mt-2 flex items-center gap-3">
              <img src={form.image} alt="" className="h-20 w-auto border border-line" />
              <button type="button" onClick={() => set('image', '')} className="text-sm font-bold text-brand hover:underline">
                Remove picture
              </button>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="publishAt" className={LABEL}>
            Schedule for later (optional)
          </label>
          <input id="publishAt" type="datetime-local" value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} className={FIELD} />
          <p className={HINT}>Set a time and use “Schedule” below. The article appears on the front page when the time arrives.</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className={BUTTON} disabled={status_ === 'saving'}>
            {editing ? <Save size={17} strokeWidth={2.5} aria-hidden="true" /> : <Send size={17} strokeWidth={2.5} aria-hidden="true" />}
            {editing ? 'Save changes' : 'Publish now'}
          </button>
          <button
            type="button"
            onClick={() => void submit(true)}
            disabled={status_ === 'saving' || !form.publishAt}
            className="inline-flex h-12 cursor-pointer items-center gap-2 border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Schedule
          </button>
          {editing && (
            <Link to={`/story/${editing.id}`} className="inline-flex h-12 items-center px-3 text-[15px] font-bold text-navy hover:underline">
              View the article
            </Link>
          )}
        </div>
        {status_ === 'done' && (
          <p role="status" className="flex items-center gap-2 text-[15px] font-bold text-[#0b5a2e]">
            <Check size={17} strokeWidth={2.8} aria-hidden="true" /> {message}
          </p>
        )}
        {status_ === 'error' && (
          <p role="alert" className={ERROR}>
            {message}
          </p>
        )}
      </form>
    </div>
  )
}
