import { Check, ChevronRight, ExternalLink, Link2, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SaveButton } from '../components/SaveButton'
import { SectionHeading } from '../components/SectionHeading'
import { StoryCard, StoryHeadline } from '../components/StoryCard'
import { StoryImage } from '../components/StoryImage'
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
  const item = byId.get(id) ?? saved.find((s) => s.id === id)

  if (!item) return ready ? <Gone /> : <Loading />
  return <StoryView key={item.id} item={item} />
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

function StoryView({ item }: { item: NewsItem }) {
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
                    {fullDate(item.published)} · {timeAgo(item.published, now)}
                  </time>
                </>
              )}
            </p>
            <SaveButton item={item} withLabel />
          </div>

          {item.image && (
            <figure className="mt-6">
              <StoryImage item={item} priority className="aspect-[16/9]" />
              <figcaption className="mt-2 text-[13px] text-muted">Image supplied by {source}</figcaption>
            </figure>
          )}

          {item.summary && <p className="mt-6 max-w-[64ch] text-[19px] leading-[1.6] text-body sm:text-xl sm:leading-[1.6]">{item.summary}</p>}

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

          {publisher && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
              More from{' '}
              <a href={publisher.home} target="_blank" rel="noopener noreferrer" className="font-bold text-navy underline">
                {publisher.name}
              </a>
            </p>
          )}
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
