import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useNews } from '../lib/news/store'
import type { Article } from '../lib/news/parse'
import { useControl } from '../lib/control'
import { useSaved } from '../lib/saved'
import { useTitle } from '../lib/weather'
import { sourceName, SECTION_BY_ID, SOURCES } from '../lib/feeds'
import { formatFull, timeAgo } from '../lib/format'
import { tagHref } from '../lib/control'
import { StoryImage } from '../components/StoryImage'
import { SaveButton } from '../components/SaveButton'
import { SectionHeading } from '../components/SectionHeading'
import { StoryCard, StoryLine } from '../components/StoryCard'
import { AdSlot } from '../components/AdSlot'
import { LinkEmbeds } from '../components/LinkEmbeds'
import { useStoryComments, postComment, type ReaderComment } from '../lib/comments'


function MediaFigure({ media }: { media: NonNullable<Article['media']>[number] }) {
  if (!media.url) return null
  const label = media.caption ?? media.credit
  return (
    <figure>
      {media.kind === 'video' && (
        <div className="overflow-hidden bg-ink">
          <video
            src={`${media.url}#t=0.001`}
            controls
            playsInline
            preload="metadata"
            aria-label={media.caption ?? 'Video'}
            className="max-h-[75vh] w-full bg-ink"
          />
        </div>
      )}
      {media.kind === 'photo' && (
        <div className="bg-wash">
          <img src={media.url} alt={media.caption ?? ''} referrerPolicy="no-referrer" className="max-h-[80vh] w-full object-contain" />
        </div>
      )}
      {media.kind === 'audio' && (
        <div className="bg-wash px-4 py-3">
          <audio src={media.url} controls preload="metadata" aria-label={media.caption ?? 'Audio clip'} className="w-full" />
        </div>
      )}
      {label && (
        <figcaption className="mt-2 text-[13px] text-muted">
          {media.caption}
          {media.caption && media.credit ? ' · ' : ''}
          {media.credit && <span>Supplied by {media.credit}</span>}
        </figcaption>
      )}
    </figure>
  )
}

function MediaGallery({ media, position }: { media: NonNullable<Article['media']>; position: 'before' | 'after' }) {
  const videos = media.filter((m) => m.kind === 'video' && (m.position ?? 'before') === position)
  const others = media.filter((m) => m.kind !== 'video' && (m.position ?? 'before') === position)
  const rows = [...videos, ...others]
  if (!rows.length) return null
  return (
    <div className="mt-6 space-y-6">
      {rows.map((m) => (
        <MediaFigure key={m.id} media={m} />
      ))}
    </div>
  )
}

const COMMENT_FIELD = 'w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'

function CommentItem({ comment }: { comment: ReaderComment }) {
  const { now } = useNews()
  return (
    <li className="py-4 first:pt-0">
      <p className="text-[14px] leading-5">
        <span className="font-extrabold text-ink">{comment.name}</span>
        {comment.at !== null && (
          <span className="text-muted">
            {' \u00b7 '}
            <time dateTime={new Date(comment.at).toISOString()} title={formatFull(comment.at)}>
              {timeAgo(comment.at, now)}
            </time>
          </span>
        )}
      </p>
      <p className="mt-1.5 whitespace-pre-line text-[16px] leading-relaxed text-body">{comment.body}</p>
    </li>
  )
}

function StoryComments({ cmsId }: { cmsId: number }) {
  const { state, loading, failed, reload } = useStoryComments(cmsId)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  if (loading && !state) {
    return (
      <section aria-labelledby="story-comments" className="mt-10 border-t border-line pt-8">
        <h2 id="story-comments" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">
          Comments
        </h2>
        <p className="mt-4 text-[14px] text-muted">Loading comments\u2026</p>
      </section>
    )
  }

  if (failed || !state) return null

  if (!state.open) {
    return (
      <section aria-labelledby="story-comments" className="mt-10 border-t border-line pt-8">
        <h2 id="story-comments" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">
          Comments
        </h2>
        <p className="mt-4 text-[15px] text-muted">Comments are closed on this story.</p>
      </section>
    )
  }

  const count = state.comments.length
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanText = text.trim()
    if (cleanName.length < 2) {
      setNote({ tone: 'error', text: 'Enter your name.' })
      return
    }
    if (cleanText.length < 2) {
      setNote({ tone: 'error', text: 'Write your comment.' })
      return
    }
    setSending(true)
    setNote(null)
    const result = await postComment(cmsId, cleanName.slice(0, 60), cleanText.slice(0, 800))
    setSending(false)
    if (result.ok) {
      setText('')
      setNote({
        tone: 'ok',
        text: 'Thank you \u2014 your comment was sent to the newsroom and appears once it has been approved.',
      })
      reload()
    } else {
      setNote({ tone: 'error', text: result.error ?? 'The comment could not be sent just now.' })
    }
  }

  return (
    <section aria-labelledby="story-comments" className="mt-10 border-t border-line pt-8">
      <h2 id="story-comments" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">
        Comments{count > 0 ? ` \u00b7 ${count}` : ''}
      </h2>

      {count > 0 ? (
        <ul className="mt-3 divide-y divide-line">
          {state.comments.map((comment, index) => (
            <CommentItem key={`${comment.name}-${comment.at ?? index}-${index}`} comment={comment} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[15px] text-muted">
          No comments yet. Be the first to have your say \u2014 comments are checked by the newsroom before they appear.
        </p>
      )}

      <form
        className="mt-6 space-y-3 border border-line bg-wash p-5"
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        <p className="text-[14px] font-extrabold text-navy">Have your say</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <div>
            <label htmlFor="comment-name" className="sr-only">
              Your name
            </label>
            <input
              id="comment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              autoComplete="name"
              className={`${COMMENT_FIELD} h-12`}
            />
          </div>
          <div>
            <label htmlFor="comment-body" className="sr-only">
              Your comment
            </label>
            <textarea
              id="comment-body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your comment"
              maxLength={800}
              rows={3}
              className={`${COMMENT_FIELD} resize-y`}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70"
          >
            {sending ? 'Sending\u2026' : 'Post comment'}
          </button>
          <p className="text-[12.5px] text-muted">Comments are moderated by the newsroom before they appear.</p>
        </div>
        {note && (
          <p role={note.tone === 'error' ? 'alert' : 'status'} className={`text-[14px] font-bold ${note.tone === 'error' ? 'text-brand' : 'text-[#0b5a2e]'}`}>
            {note.text}
          </p>
        )}
      </form>
    </section>
  )
}

export default function Story() {
  const { id = '' } = useParams()
  const { byId, bySection, all, now } = useNews()
  const { articles, liveAt } = useControl()
  const { saved } = useSaved()

  const item = byId.get(id) ?? saved.find((a) => a.id === id)
  const ownRecord = articles.find((a) => a.id === id)
  const scheduled = !!ownRecord && (ownRecord.publishAt ?? 0) > liveAt
  const hidden = !!ownRecord?.hidden
  const exists = !!item || !!ownRecord

  const related = item ? (bySection[item.section] ?? []).filter((x) => x.id !== item.id).slice(0, 6) : []
  // the three further-reading modules share one placement set, so every other
  // story is linked exactly once on the page: first the in-body “Read more”
  // list, then the section sidebar, then the latest-with-pictures grid
  const further = useMemo(() => {
    const taken = new Set([item?.id ?? id])
    const read: Article[] = []
    for (const candidate of [...related, ...all]) {
      if (taken.has(candidate.id)) continue
      taken.add(candidate.id)
      read.push(candidate)
      if (read.length >= 3) break
    }
    const sidebar = related.filter((candidate) => !taken.has(candidate.id) && (taken.add(candidate.id), true))
    const bottom = all.filter((candidate) => !taken.has(candidate.id) && !!candidate.image && (taken.add(candidate.id), true)).slice(0, 4)
    return { read, sidebar, bottom }
  }, [related, all, item?.id])

  useTitle(exists && item ? item.title : exists ? ownRecord?.title : undefined)

  if (!exists) {
    return (
      <div className="wrap py-20 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">This story has moved on</h1>
        <p className="mx-auto mt-3 max-w-lg text-[17px] leading-relaxed text-body">
          180news shows what is in each publisher’s live feed, and this headline has dropped out of it. Stories you save stay available here even after that happens.
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

  if (!item) {
    return (
      <div className="wrap max-w-3xl py-12" role="status" aria-label="Loading story">
        <div className="h-4 w-40 animate-pulse bg-line/70 motion-reduce:animate-none" />
        <div className="mt-5 h-10 w-11/12 animate-pulse bg-line/70 motion-reduce:animate-none" />
        <div className="mt-3 h-10 w-2/3 animate-pulse bg-line/70 motion-reduce:animate-none" />
        <div className="mt-8 aspect-[16/9] animate-pulse bg-line/70 motion-reduce:animate-none" />
      </div>
    )
  }

  const source = item.sourceId === '180news' ? null : SOURCES[item.sourceId]
  const sourceLabel = sourceName(item.sourceId)
  const section = SECTION_BY_ID[item.section]
  const isOwn = !!item.body
  const isCms = item.id.startsWith('cms-')

  return (
    <div className="pt-6 md:pt-9">
      <div className={`wrap ${isCms ? "" : "grid gap-x-12 gap-y-12 lg:grid-cols-12"}`}>
        <article className={isCms ? "" : "lg:col-span-8"}>
          {scheduled && (
            <p role="status" className="mb-5 border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-snug text-[#6b4a00]">
              This article is scheduled. It goes live on the front page {ownRecord?.publishAt ? formatFull(ownRecord.publishAt) : ''}. Only this device can see it.
            </p>
          )}
          {hidden && (
            <p role="status" className="mb-5 border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-snug text-[#6b4a00]">
              This article is taken down. It is not on the app.
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
              <span className="font-bold text-ink">{sourceLabel}</span>
              {item.published !== null && (
                <>
                  <br />
                  <time dateTime={new Date(item.published).toISOString()} className="text-[13.5px] text-muted">
                    {formatFull(item.published)}
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
              <figcaption className="mt-2 text-[13px] text-muted">
                {item.body ? 'Picture supplied by the author' : `Image supplied by ${sourceLabel}`}
              </figcaption>
            </figure>
          )}

          {item.summary && !isOwn && !isCms && (
            <p className="mt-6 max-w-[64ch] text-[19px] leading-[1.6] text-body sm:text-xl sm:leading-[1.6]">{item.summary}</p>
          )}

          {item.media && <MediaGallery media={item.media} position="before" />}

          {isOwn ? (
            <>
              <div className="mt-6 max-w-[64ch] space-y-5 text-[18px] leading-[1.7] text-body">
                {(item.body ?? '').split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              {item.links && item.links.length > 0 && <LinkEmbeds links={item.links} />}
              {ownRecord && (
                <div className="mt-6 max-w-[64ch] rounded-sm bg-wash px-4 py-3 text-[14px] text-body">
                  Written for 180news by {ownRecord.author}. Stored only in this browser — it shows on this device only.
                </div>
              )}
              {item.media && <MediaGallery media={item.media} position="after" />}
              {isCms && <ShareRow link={item.link} title={item.title} />}
            </>
          ) : isCms ? (
            <>
              {item.summary && <p className="mt-6 max-w-[64ch] text-[18px] leading-[1.7] text-body">{item.summary}</p>}
              <ShareRow link={item.link} title={item.title} />
            </>
          ) : (
            <>
              <div className="mt-8 border-l-4 border-brand bg-brand-tint p-5 sm:p-6">
                <p className="max-w-[58ch] text-[15.5px] leading-relaxed text-body">
                  This is {sourceLabel}’s headline and summary, as published in their news feed. The full report is on their website.
                </p>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-12 items-center gap-2.5 bg-brand px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-brand-strong"
                >
                  Read the full story on {sourceLabel}
                  <ExternalLink size={18} strokeWidth={2.5} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
              <ShareRow link={item.link} title={item.title} />
            </>
          )}

          {!isCms && further.read.length > 0 && (
            <section aria-labelledby="story-read-more" className="mt-8">
              <h2 id="story-read-more" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">
                Read more
              </h2>
              <ul className="mt-2.5 divide-y divide-line">
                {further.read.map((x) => (
                  <li key={x.id}>
                    <Link
                      to={`/story/${x.id}`}
                      className="group flex min-h-11 items-center gap-2 py-2 text-[16px] font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy"
                    >
                      <span className="min-w-0 flex-1">{x.title}</span>
                      <ChevronRight size={16} strokeWidth={2.6} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <h2 className="mr-1 text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Tags</h2>
              <ul className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <li key={tag}>
                    <Link to={tagHref(tag)} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold text-ink hover:border-navy hover:text-navy">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isCms && /^cms-\d+$/.test(item.id) && <StoryComments cmsId={Number(item.id.slice(4))} />}

          {source && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
              More from{' '}
              <a href={source.home} target="_blank" rel="noopener noreferrer" className="font-bold text-navy underline">
                {source.name}
              </a>
            </p>
          )}
          {!scheduled && <AdSlot id="article" at="inline" className="mt-9" />}
        </article>

        {!isCms && further.sidebar.length > 0 && section && (
          <aside aria-labelledby="story-related" className="lg:col-span-4">
            <SectionHeading id="story-related" title={`More ${section.label}`} to={`/section/${section.id}`} />
            <ul className="divide-y divide-line">
              {further.sidebar.map((x) => (
                <li key={x.id} className="py-3.5 first:pt-0">
                  <StoryLine item={x} />
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {!scheduled && <AdSlot id="article" at="below" className="wrap mt-12" />}

      {!isCms && further.bottom.length > 0 && (
        <section aria-labelledby="story-more" className="wrap mt-14">
          <SectionHeading id="story-more" title="Latest headlines" to="/latest" moreLabel="See all" />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4">
            {further.bottom.map((x) => (
              <li key={x.id}>
                <StoryCard item={x} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ShareRow({ link, title }: { link: string; title: string }) {
  const enc = encodeURIComponent(link)
  const encTitle = encodeURIComponent(title)
  const button = 'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-navy hover:text-navy'
  return (
    <div className="mt-8">
      <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Share this story</h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        <li>
          <a href={`https://wa.me/?text=${encTitle}%20${enc}`} target="_blank" rel="noopener noreferrer" className={button}>
            WhatsApp
          </a>
        </li>
        <li>
          <a href={`https://twitter.com/intent/tweet?text=${encTitle}&url=${enc}`} target="_blank" rel="noopener noreferrer" className={button}>
            X
          </a>
        </li>
        <li>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noopener noreferrer" className={button}>
            Facebook
          </a>
        </li>
      </ul>
    </div>
  )
}
