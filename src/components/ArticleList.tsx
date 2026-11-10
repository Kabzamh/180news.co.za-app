import { CalendarClock, Eye, EyeOff, Newspaper, Pencil, Send, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HEADLINE_SLOTS, useControl } from '../lib/control'
import { SECTION_BY_ID } from '../lib/feed/sources'
import { fullDate } from '../lib/format'
import { describeMedia } from '../lib/media'

const action =
  'inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3.5 text-[13.5px] font-bold text-ink transition-colors hover:border-navy hover:text-navy'

/** Articles written in this browser. `admin` adds the front-page and visibility controls. */
export function ArticleList({ admin = false }: { admin?: boolean }) {
  const { articles, settings, liveAt, patchArticle, publishNow, removeArticle } = useControl()
  const scheduled = (a: { publishAt?: number }) => (a.publishAt ?? 0) > liveAt
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // The articles that currently hold a headline slot on the front page.
  const inHeadlines = new Set(
    articles
      .filter((a) => a.headline && !a.pinned && !a.hidden && !scheduled(a) && !settings.hiddenSections.includes(a.section))
      .sort((a, b) => (b.publishAt ?? b.createdAt) - (a.publishAt ?? a.createdAt))
      .slice(0, HEADLINE_SLOTS)
      .map((a) => a.id),
  )

  if (articles.length === 0) {
    return <p className="text-[15px] leading-relaxed text-muted">No articles have been written in this browser yet.</p>
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {articles.map((article) => {
        const sectionOff = settings.hiddenSections.includes(article.section)
        const pending = scheduled(article)
        const visible = !article.hidden && !sectionOff && !pending
        return (
          <li key={article.id} className="py-4">
            <div className="flex items-start gap-4">
              {article.image && <img src={article.image} alt="" className="aspect-[4/3] w-[84px] shrink-0 object-cover sm:w-[112px]" />}
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] font-extrabold leading-[1.25]">
                  <Link to={`/story/${article.id}`} className="decoration-brand decoration-2 underline-offset-[3px] hover:underline">
                    {article.title}
                    {!visible && <span className="sr-only"> (preview)</span>}
                  </Link>
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-muted">
                  {article.author} · {SECTION_BY_ID[article.section].label} · {pending ? 'not published yet' : fullDate(article.publishAt ?? article.createdAt)}
                  {article.media?.length ? ` · ${describeMedia(article.media)}` : ''}
                  {article.links?.length ? ` · ${article.links.length} ${article.links.length === 1 ? 'link' : 'links'}` : ''}
                </p>
                {article.tags && article.tags.length > 0 && <p className="mt-0.5 text-[13px] leading-5 text-muted">Tags: {article.tags.join(', ')}</p>}
                {(pending || article.pinned || article.hidden || sectionOff || inHeadlines.has(article.id)) && (
                  <p className="mt-1.5 flex flex-wrap gap-1.5 text-[12px] font-bold">
                    {pending && article.publishAt && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf1d4] px-2.5 py-0.5 text-[#6b4a00]">
                        <CalendarClock size={13} strokeWidth={2.4} aria-hidden="true" />
                        Scheduled for {fullDate(article.publishAt)}
                      </span>
                    )}
                    {article.pinned && visible && <span className="rounded-full bg-brand px-2.5 py-0.5 text-white">Main headline</span>}
                    {inHeadlines.has(article.id) && <span className="rounded-full bg-navy-tint px-2.5 py-0.5 text-navy">In the headline news</span>}
                    {article.hidden && <span className="rounded-full bg-wash px-2.5 py-0.5 text-body">Hidden</span>}
                    {sectionOff && <span className="rounded-full bg-wash px-2.5 py-0.5 text-body">Its section is switched off</span>}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/submit?edit=${article.id}`} className={action}>
                <Pencil size={15} strokeWidth={2.3} aria-hidden="true" /> Edit
              </Link>
              {pending && (
                <button type="button" onClick={() => publishNow(article.id)} className={action}>
                  <Send size={15} strokeWidth={2.3} aria-hidden="true" /> Publish now
                </button>
              )}
              {admin && (
                <>
                  <button type="button" aria-pressed={article.pinned} onClick={() => patchArticle(article.id, { pinned: !article.pinned })} className={action}>
                    <Star size={15} strokeWidth={2.3} fill={article.pinned ? 'currentColor' : 'none'} aria-hidden="true" />
                    {article.pinned ? 'Remove as main headline' : 'Make main headline'}
                  </button>
                  <button type="button" aria-pressed={article.headline} onClick={() => patchArticle(article.id, { headline: !article.headline })} className={action}>
                    <Newspaper size={15} strokeWidth={2.3} aria-hidden="true" />
                    {article.headline ? 'Remove from headlines' : 'Add to headlines'}
                  </button>
                  <button type="button" onClick={() => patchArticle(article.id, { hidden: !article.hidden })} className={action}>
                    {article.hidden ? <Eye size={15} strokeWidth={2.3} aria-hidden="true" /> : <EyeOff size={15} strokeWidth={2.3} aria-hidden="true" />}
                    {article.hidden ? 'Show' : 'Hide'}
                  </button>
                </>
              )}
              {confirmId === article.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      removeArticle(article.id)
                      setConfirmId(null)
                    }}
                    className="inline-flex h-11 cursor-pointer items-center rounded-full bg-brand px-4 text-[13.5px] font-extrabold text-white hover:bg-brand-strong"
                  >
                    Delete for good
                  </button>
                  <button type="button" onClick={() => setConfirmId(null)} className={action}>
                    Keep it
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmId(article.id)} aria-label={`Delete: ${article.title}`} className={`${action} hover:border-brand hover:text-brand`}>
                  <Trash2 size={15} strokeWidth={2.3} aria-hidden="true" /> Delete
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
