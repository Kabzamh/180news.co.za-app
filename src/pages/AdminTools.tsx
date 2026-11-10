import { ArrowLeft, Eye, PenLine, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdSlotEditor } from '../components/AdSlotEditor'
import { SignOutButton } from '../components/AdminGate'
import { AdsMasterSwitch } from '../components/AdsControl'
import { ArticleList } from '../components/ArticleList'
import { Toggle } from '../components/Toggle'
import { AD_SLOTS, TAG_MAX, parseTags, tagPath, tagsInUse, useControl } from '../lib/control'
import type { Article, TagUse } from '../lib/control'
import { useTitle } from '../lib/extras'

const action =
  'inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3.5 text-[13.5px] font-bold text-ink transition-colors hover:border-navy hover:text-navy'
const primary = 'inline-flex h-12 items-center gap-2 bg-brand px-5 text-[15px] font-extrabold text-white hover:bg-brand-strong'
const inlineLink = 'font-bold text-navy underline underline-offset-[3px]'

/** Shared frame for the pages under Admin: a way back, a title and what the page is for. */
function AdminPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  useTitle(`${title} · Admin`)
  return (
    <div className="wrap max-w-[1040px] pt-5 md:pt-8">
      <div className="flex items-center justify-between gap-4">
        <nav aria-label="Breadcrumb">
          <Link to="/admin" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-navy hover:underline">
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> Admin
          </Link>
        </nav>
        <SignOutButton />
      </div>
      <header className="relative mt-2 border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-[66ch] text-[16px] leading-relaxed text-body">{intro}</p>
      </header>
      <div className="mt-8">{children}</div>
    </div>
  )
}

/* ---------------- Ad slots ---------------- */

export function AdminAds() {
  const { settings } = useControl()
  return (
    <AdminPage
      title="Ads control"
      intro="Two advertising positions, each marked “Advertisement”. Switch each one on or off, choose where it sits on its page, and upload the advert it carries. Adverts are stored in this browser, so they show on this device only, and they are left off previews of unpublished articles."
    >
      <div className="mb-6 border border-line bg-wash px-4 py-1.5 sm:px-5">
        <AdsMasterSwitch />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {AD_SLOTS.map((slot) => (
          <AdSlotEditor key={slot.id} id={slot.id} name={slot.name} where={slot.where} positions={slot.positions} />
        ))}
      </div>
      <p className="mt-6 max-w-[66ch] text-[15px] leading-relaxed text-body">
        A slot with no advert of its own shows the “Advertise with us” notice with <span className="font-bold text-ink">{settings.adPhone}</span> and{' '}
        <span className="break-all font-bold text-ink">{settings.email}</span>. Change these under{' '}
        <Link to="/control#ctl-contact" className={inlineLink}>
          Contact details in the Control panel
        </Link>
        .
      </p>
    </AdminPage>
  )
}

/* ---------------- Scheduled posts ---------------- */

export function AdminScheduled() {
  const { settings, update } = useControl()
  return (
    <AdminPage
      title="Scheduled posts"
      intro="Articles waiting for their publication time, soonest first. Publish one early, edit it to change its time, or delete it. Scheduled articles are stored in this browser, so they go live on this device only."
    >
      <div className="border border-line bg-wash px-4 py-1.5 sm:px-5">
        <Toggle
          label="List scheduled articles on the front page"
          note="A panel above the headlines shows what is coming up and when. Only this device sees it."
          checked={settings.showScheduled}
          onChange={(next) => update({ showScheduled: next })}
        />
      </div>
      <div className="mt-6">
        <ArticleList scheduledOnly />
      </div>
      <Link to="/submit" className={`${primary} mt-6`}>
        <PenLine size={17} strokeWidth={2.4} aria-hidden="true" /> Write and schedule an article
      </Link>
    </AdminPage>
  )
}

/* ---------------- Categories and tags ---------------- */

const STORAGE_FULL = 'This browser’s storage is full, so the change was not saved.'
const onArticles = (n: number) => `${n} ${n === 1 ? 'article' : 'articles'}`

export function AdminTags() {
  const { articles, liveAt, settings, sections, renameTag, removeTag } = useControl()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const statusRef = useRef<HTMLParagraphElement>(null)

  const tags = useMemo(() => tagsInUse(articles), [articles])
  const onSite = (a: Article) => !a.hidden && (a.publishAt ?? 0) <= liveAt && !settings.hiddenSections.includes(a.section)
  const liveCount = (tag: TagUse) => articles.filter((a) => tag.articleIds.includes(a.id) && onSite(a)).length

  /** Close whatever was open and report the outcome where screen readers and keyboards will find it. */
  const finish = (text: string) => {
    setRenaming(null)
    setConfirming(null)
    setError('')
    setMessage(text)
    statusRef.current?.focus()
  }

  const submitRename = (e: FormEvent, tag: TagUse) => {
    e.preventDefault()
    const typed = parseTags(draft)
    if (typed.length === 0) return setError('Enter a name for the tag.')
    if (typed.length > 1) return setError('Use one name, without commas.')
    if (typed[0].length > TAG_MAX) return setError(`Keep the tag to ${TAG_MAX} characters.`)
    if (typed[0] === tag.name && !tag.mixed) return finish('')
    // Renaming onto another tag folds the two together under the name already in use.
    const other = tags.find((t) => t.key === typed[0].toLowerCase() && t.key !== tag.key)
    const target = other ? other.name : typed[0]
    if (!renameTag(tag.name, target)) return finish(STORAGE_FULL)
    finish(
      other
        ? `“${tag.name}” is now part of “${target}”.`
        : target === tag.name
          ? `“${target}” is now written the same way on ${onArticles(tag.articleIds.length)}.`
          : `Renamed “${tag.name}” to “${target}” on ${onArticles(tag.articleIds.length)}.`,
    )
  }

  return (
    <AdminPage
      title="Categories and tags"
      intro="Tags are added in the Tags field when an article is written. Here you can tidy them: rename a tag everywhere it is used, or take it off every article."
    >
      <p className="max-w-[66ch] border-l-4 border-navy bg-navy-tint px-4 py-3 text-[15px] leading-relaxed text-body">
        Categories are the site’s sections — {sections.length} are switched on. Each article is filed under one, chosen in the article form.{' '}
        <Link to="/control#ctl-sections" className={inlineLink}>
          Switch sections on or off in the Control panel
        </Link>
        .
      </p>

      <p ref={statusRef} tabIndex={-1} role="status" className="mt-5 min-h-6 text-[15px] font-bold text-navy outline-none">
        {message}
      </p>

      {tags.length === 0 ? (
        <div className="border border-dashed border-line bg-wash px-6 py-10 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight">No tags yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[16px] leading-relaxed text-body">Add up to five tags to an article and they will be listed here.</p>
          <Link to="/submit" className={`${primary} mt-6`}>
            <PenLine size={17} strokeWidth={2.4} aria-hidden="true" /> Write an article
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {tags.map((tag) => {
            const total = tag.articleIds.length
            const live = liveCount(tag)
            return (
              <li key={tag.key} className="py-4">
                {renaming === tag.key ? (
                  <form onSubmit={(e) => submitRename(e, tag)} noValidate className="max-w-md">
                    <label htmlFor="tag-rename" className="block text-[15px] font-extrabold">
                      New name for “{tag.name}”
                    </label>
                    <input
                      id="tag-rename"
                      autoFocus
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value)
                        setError('')
                      }}
                      maxLength={60}
                      aria-invalid={!!error}
                      aria-describedby={error ? 'tag-rename-error' : undefined}
                      autoComplete="off"
                      autoCapitalize="none"
                      className="mt-1.5 h-12 w-full border border-ink/35 bg-paper px-3.5 text-base text-ink"
                    />
                    {error && (
                      <p id="tag-rename-error" className="mt-1.5 text-[13.5px] font-bold text-brand">
                        {error}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="submit" className="inline-flex h-11 cursor-pointer items-center bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-strong">
                        Save name
                      </button>
                      <button type="button" onClick={() => finish('')} className={action}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-[18px] font-extrabold leading-tight">{tag.name}</h2>
                      <p className="mt-0.5 text-[13.5px] text-muted">
                        On {onArticles(total)}
                        {live < total ? ` · ${live} on the site now` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {confirming === tag.key ? (
                        <>
                          <button
                            type="button"
                            onClick={() => finish(removeTag(tag.name) ? `Removed “${tag.name}” from ${onArticles(total)}.` : STORAGE_FULL)}
                            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-brand px-4 text-[13.5px] font-extrabold text-white hover:bg-brand-strong"
                          >
                            Remove from {onArticles(total)}
                          </button>
                          <button type="button" onClick={() => setConfirming(null)} className={action}>
                            Keep it
                          </button>
                        </>
                      ) : (
                        <>
                          {live > 0 && (
                            <Link to={tagPath(tag.name)} className={action} aria-label={`View stories tagged ${tag.name}`}>
                              <Eye size={15} strokeWidth={2.3} aria-hidden="true" /> View
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRenaming(tag.key)
                              setConfirming(null)
                              setDraft(tag.name)
                              setError('')
                              setMessage('')
                            }}
                            aria-label={`Rename tag ${tag.name}`}
                            className={action}
                          >
                            <Pencil size={15} strokeWidth={2.3} aria-hidden="true" /> Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirming(tag.key)
                              setRenaming(null)
                              setMessage('')
                            }}
                            aria-label={`Remove tag ${tag.name}`}
                            className={`${action} hover:border-brand hover:text-brand`}
                          >
                            <Trash2 size={15} strokeWidth={2.3} aria-hidden="true" /> Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </AdminPage>
  )
}
