import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { useSaved } from '../lib/saved'
import { useTitle } from '../lib/weather'
import { sourceName } from '../lib/feeds'
import { formatFull } from '../lib/format'
import { StoryImage } from '../components/StoryImage'

export default function Saved() {
  useTitle('Saved')
  const { saved, remove } = useSaved()
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Saved</h1>
        <p className="mt-2 text-[15px] text-muted" aria-live="polite">
          {saved.length === 0 ? 'Your reading list, kept on this device.' : `${saved.length} ${saved.length === 1 ? 'story' : 'stories'} kept on this device.`}
        </p>
      </header>
      {saved.length === 0 ? (
        <div className="mt-10 border border-dashed border-line bg-wash px-6 py-14 text-center">
          <Bookmark size={30} strokeWidth={2} className="mx-auto text-navy" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[16px] leading-relaxed text-body">
            Tap the bookmark on any story to keep it here. Saved stories stay available even after they leave the live feeds.
          </p>
          <Link to="/" className="mt-6 inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">
            Browse top stories
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line border-b border-line">
          {saved.map((item) => (
            <li key={item.id} className="flex items-start gap-4 py-5">
              <div className="group relative flex min-w-0 flex-1 items-start gap-4">
                <StoryImage item={item} className="aspect-[4/3] w-[96px] shrink-0 sm:w-[150px]" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[17px] font-extrabold leading-[1.25] tracking-[-0.005em] sm:text-xl">
                    <Link to={`/story/${item.id}`} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">
                      {item.title}
                    </Link>
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-5">
                    <span className="font-extrabold uppercase tracking-[0.04em] text-brand">{sourceName(item.sourceId)}</span>
                    {item.published !== null && <span className="text-muted"> · {formatFull(item.published)}</span>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove from saved: ${item.title}`}
                title="Remove from saved"
                className="-mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-brand-tint hover:text-brand"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" fill="none" aria-hidden="true">
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
