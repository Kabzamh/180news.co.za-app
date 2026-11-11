import { Check, ChevronRight, Copy, ExternalLink, Eye, EyeOff, Link2, Pencil, Share2, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdSlot } from '../components/AdSlot'
import { ArticleLinks } from '../components/LinkEmbeds'
import { ArticleMedia } from '../components/Media'
import { SaveButton } from '../components/SaveButton'
import { SectionHeading } from '../components/SectionHeading'
import { StoryCard, StoryHeadline } from '../components/StoryCard'
import { StoryImage } from '../components/StoryImage'
import { useAuth } from '../lib/auth'
import { articleToItem, tagPath, useControl } from '../lib/control'
import { useTitle } from '../lib/extras'
import { PUBLISHERS, SECTION_BY_ID, publisherName } from '../lib/feed/sources'
import type { NewsItem } from '../lib/feed/types'
import { fullDate, timeAgo } from '../lib/format'
import { useNews } from '../lib/news/store'
import { useSaved } from '../lib/saved'

export default function Story() {
  const { id = '' } = useParams()
  const { byId, ready } = useNews()
  const { saved } = useSaved()
  const { articles, liveAt } = useControl()
  const live = byId.get(id)
  // An author can open their own article before it is on the site: scheduled, hidden, or in a switched-off section.
  const own = live ? undefined : articles.find((a) => a.id === id)
  const item = live ?? (own ? articleToItem(own) : saved.find((s) => s.id === id))
  const notice = !own
    ? undefined
    : own.publishAt && own.publishAt > liveAt
      ? `Preview. This article is scheduled for ${fullDate(own.publishAt)} and is not on the site yet.`
      : 'Preview. This article is not shown on the site at the moment.'

  if (!item) return ready ? <Gone /> : <Loading />
  return <StoryView key={item.id} item={item} notice={notice} />
}

function Loading() {
  useTitle('Loading story')
  return (
    <div className="wrap max-w-3xl py-12" role="status" aria-label="Loading story">
      <div className="h-4 w-40 animate-pulse bg-line/70 motion-reduce:animate-none" />
      <div className="mt-5 h-10 w-11/12 animate-pulse bg-line/70 motion-reduce:animate-none" />
      <div className="mt-3 h-10 w-2/3 animate-pulse bg-line/70 motion-reduce:animate-none" />
      <div className="mt-8 aspect-[16/9] animate-pulse bg-line/70 motion-reduce:animate-none" />
    </div>
  )
}

function Gone() {
  useTitle('Story no longer in the feed')
  return (
    <div className="wrap py-20 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">This story has moved on</h1>
      <p className="mx-auto mt-3 max-w-lg text-[17px] leading-relaxed text-body">
        180news shows what is in each publisher’s live feed, and this headline has dropped out of it. Stories you save stay available here even
        after that happens.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">
          Go to top stories
        </Link>
        <Link to="/latest" className="inline-flex h-12 items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white">
          See the latest
        </Link>
      </div>
    </div>
  )
}

function ShareRow({ item }: { item: NewsItem }) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.link)
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopyFailed(true)
    }
  }

  const nativeShare = () => {
    navigator.share({ title: item.title, url: item.link }).catch(() => {
      /* share sheet dismissed */
    })
  }

  const url = encodeURIComponent(item.link)
  const text = encodeURIComponent(item.title)
  const pill = 'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-navy hover:text-navy'

  return (
    <div>
      <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Share this story</h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {canShare && (
          <li>
            <button type="button" onClick={nativeShare} className={pill}>
              <Share2 size={16} strokeWidth={2.3} aria-hidden="true" /> Share
            </button>
          </li>
        )}
        <li>
          <a href={`https://wa.me/?text=${text}%20${url}`} target="_blank" rel="noopener noreferrer" className={pill}>
            WhatsApp
          </a>
        </li>
        <li>
          <a href={`https://twitter.com/intent/tweet?text=${text}&url=${url}`} target="_blank" rel="noopener noreferrer" className={pill}>
            X
          </a>
        </li>
        <li>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer" className={pill}>
            Facebook
          </a>
        </li>
        <li>
          <button type="button" onClick={copy} className={pill}>
            {copied ? <Check size={16} strokeWidth={2.6} className="text-brand" aria-hidden="true" /> : <Link2 size={16} strokeWidth={2.3} aria-hidden="true" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </li>
      </ul>
      <p className="mt-2 min-h-5 text-sm text-body" role="status">
        {copyFailed ? (
          <>
            Your browser blocked copying. The link is{' '}
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-navy underline">
              {item.link}
            </a>
          </>
        ) : (
          ''
        )}
      </p>
    </div>
  )
}

/** Full text of an article written in the app, with the ways to pass it on. */
function OwnArticle({ item }: { item: NewsItem }) {
  const { settings, articles, liveAt, patchArticle, readerState } = useControl()
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle')
  const paragraphs = (item.body ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const linkText = `${item.tags?.length ? `\n\nTags: ${item.tags.join(', ')}` : ''}${item.links?.length ? `\n\nLinks:\n${item.links.join('\n')}` : ''}`
  const articleText = `${item.title}\nBy ${item.author ?? 'a 180news reader'}\n\n${item.summary}\n\n${item.body ?? ''}`
  const fullText = articleText + linkText
  // The publishing controls are for the signed-in team; readers see the article and nothing else.
  const { status, user } = useAuth()
  const own = status === 'signed-in' ? articles.find((a) => a.id === item.id) : undefined
  const canManage = user?.role === 'owner' || user?.role === 'editor'
  const scheduled = !!own && (own.publishAt ?? 0) > liveAt
  const reach = own ? readerState(own.id) : 'waiting'
  const state = !own
    ? ''
    : own.hidden
      ? 'Taken down. It is not on the app.'
      : scheduled
        ? `Scheduled. It goes live on the app on ${fullDate(own.publishAt ?? 0)}.`
        : settings.hiddenSections.includes(own.section)
          ? `Not on the app: the ${SECTION_BY_ID[own.section].label} section is switched off.`
          : own.pinned
            ? 'Live on the app, as the main headline.'
            : 'Live on the app.'
  const pill = 'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-navy/40 bg-paper px-4 text-sm font-bold text-navy transition-colors hover:border-navy'

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopy('done')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <>
      <div className="mt-6 max-w-[64ch] space-y-5 text-[18px] leading-[1.7] text-body">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>

      {item.media && item.media.length > 0 && <ArticleMedia media={item.media} />}
      {item.links && item.links.length > 0 && <ArticleLinks links={item.links} />}

      {item.tags && item.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <h2 className="mr-1 text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Tags</h2>
          <ul className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <li key={tag}>
                <Link to={tagPath(tag)} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold text-ink hover:border-navy hover:text-navy">
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {own && (
        <section aria-labelledby="article-publishing" className="mt-8 border-l-4 border-navy bg-navy-tint p-5 sm:p-6">
          <h2 id="article-publishing" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-navy">
            Publishing
          </h2>
          <p role="status" className="mt-1.5 max-w-[60ch] text-[16px] font-bold leading-snug text-ink">
            {state}
          </p>
          {!own.hidden && !scheduled && (
            <p className="mt-1 max-w-[60ch] text-[14.5px] leading-relaxed text-body">
              {reach === 'live'
                ? 'Readers on every device can see it.'
                : reach === 'changed'
                  ? 'Readers on other devices still see the earlier version, until the next site update.'
                  : 'So far it shows on this device. It reaches readers on other devices with the next site update.'}{' '}
              {reach !== 'live' &&
                (canManage ? (
                  <Link to="/admin#admin-readers" className="font-bold text-navy underline underline-offset-[3px]">
                    Publish to all readers
                  </Link>
                ) : (
                  'An owner or editor sends it from the Admin page.'
                ))}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/submit?edit=${item.id}`} className={pill}>
              <Pencil size={15} strokeWidth={2.3} aria-hidden="true" /> Edit
            </Link>
            {canManage && !own.hidden && !scheduled && (
              <button type="button" aria-pressed={own.pinned} onClick={() => patchArticle(own.id, { pinned: !own.pinned })} className={pill}>
                <Star size={15} strokeWidth={2.3} fill={own.pinned ? 'currentColor' : 'none'} aria-hidden="true" />
                {own.pinned ? 'Remove as main headline' : 'Make main headline'}
              </button>
            )}
            {canManage && !scheduled && (
              <button type="button" onClick={() => patchArticle(own.id, { hidden: !own.hidden })} className={pill}>
                {own.hidden ? <Eye size={15} strokeWidth={2.3} aria-hidden="true" /> : <EyeOff size={15} strokeWidth={2.3} aria-hidden="true" />}
                {own.hidden ? 'Put back on the app' : 'Take down'}
              </button>
            )}
            <button type="button" onClick={copyText} className={pill}>
              {copy === 'done' ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : <Copy size={16} strokeWidth={2.3} aria-hidden="true" />}
              {copy === 'done' ? 'Text copied' : 'Copy article text'}
            </button>
          </div>
          <p role="status" className="mt-2 min-h-5 text-sm text-body">
            {copy === 'failed' ? 'Your browser blocked copying. Select the article text above and copy it by hand.' : ''}
          </p>
        </section>
      )}
    </>
  )
}

function StoryView({ item, notice }: { item: NewsItem; notice?: string }) {
  useTitle(item.title)
  const { bySection, all, now } = useNews()
  const publisher = PUBLISHERS[item.sourceId]
  const source = publisherName(item.sourceId)
  const section = SECTION_BY_ID[item.section]

  const related = useMemo(() => (bySection[item.section] ?? []).filter((i) => i.id !== item.id).slice(0, 6), [bySection, item])
  const more = useMemo(() => {
    const skip = new Set([item.id, ...related.map((r) => r.id)])
    return all.filter((i) => !skip.has(i.id) && i.image).slice(0, 4)
  }, [all, related, item.id])

  return (
    <div className="pt-6 md:pt-9">
      <div className="wrap grid gap-x-12 gap-y-12 lg:grid-cols-12">
        <article className="lg:col-span-8">
          {notice && (
            <p role="status" className="mb-5 border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-snug text-[#6b4a00]">
              {notice}
            </p>
          )}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
              <li>
                <Link to="/" className="text-muted hover:text-brand hover:underline">
                  Home
                </Link>
              </li>
              {section && (
                <li className="flex items-center gap-1.5">
                  <ChevronRight size={14} className="text-muted" aria-hidden="true" />
                  <Link to={`/section/${section.id}`} className="uppercase tracking-[0.04em] text-brand hover:underline">
                    {section.label}
                  </Link>
                </li>
              )}
            </ol>
          </nav>

          <h1 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance sm:text-[40px] lg:text-[46px] lg:leading-[1.05]">
            {item.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-line py-3">
            <p className="text-[15px] leading-snug text-body">
              {item.author && (
                <>
                  By <span className="font-bold text-ink">{item.author}</span>,{' '}
                </>
              )}
              <span className="font-bold text-ink">{source}</span>
              {item.published !== null && (
                <>
                  <br />
                  <time dateTime={new Date(item.published).toISOString()} className="text-[13.5px] text-muted">
                    {fullDate(item.published)}
                    {item.published <= now ? ` · ${timeAgo(item.published, now)}` : ''}
                  </time>
                </>
              )}
            </p>
            <SaveButton item={item} withLabel />
          </div>

          {item.image && (
            <figure className="mt-6">
              <StoryImage item={item} priority className="aspect-[16/9]" />
              <figcaption className="mt-2 text-[13px] text-muted">{item.body ? 'Picture supplied by the author' : `Image supplied by ${source}`}</figcaption>
            </figure>
          )}

          {/* With no summary of its own, an article's summary is just its opening lines, which follow anyway. */}
          {item.summary && !(item.body && item.body.replace(/\s+/g, ' ').startsWith(item.summary.replace(/…$/, ''))) && (
            <p className="mt-6 max-w-[64ch] text-[19px] leading-[1.6] text-body sm:text-xl sm:leading-[1.6]">{item.summary}</p>
          )}

          {item.body ? (
            <OwnArticle item={item} />
          ) : (
            <>
              <div className="mt-8 border-l-4 border-brand bg-brand-tint p-5 sm:p-6">
                <p className="max-w-[58ch] text-[15.5px] leading-relaxed text-body">
                  This is {source}’s headline and summary, as published in their news feed. The full report is on their website.
                </p>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-12 items-center gap-2.5 bg-brand px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-brand-strong"
                >
                  Read the full story on {source}
                  <ExternalLink size={18} strokeWidth={2.5} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>

              <div className="mt-8">
                <ShareRow item={item} />
              </div>
            </>
          )}

          {publisher && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
              More from{' '}
              <a href={publisher.home} target="_blank" rel="noopener noreferrer" className="font-bold text-navy underline">
                {publisher.name}
              </a>
            </p>
          )}

          {!notice && <AdSlot id="article" at="inline" className="mt-9" />}
        </article>

        {related.length > 0 && section && (
          <aside aria-labelledby="story-related" className="lg:col-span-4">
            <SectionHeading id="story-related" title={`More ${section.label}`} to={`/section/${section.id}`} />
            <ul className="divide-y divide-line">
              {related.map((r) => (
                <li key={r.id} className="py-3.5 first:pt-0">
                  <StoryHeadline item={r} />
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {!notice && <AdSlot id="article" at="below" className="wrap mt-12" />}

      {more.length > 0 && (
        <section aria-labelledby="story-more" className="wrap mt-14">
          <SectionHeading id="story-more" title="Latest headlines" to="/latest" moreLabel="See all" />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4">
            {more.map((m) => (
              <li key={m.id}>
                <StoryCard item={m} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
