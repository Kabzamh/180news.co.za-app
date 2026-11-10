import { Search as SearchIcon, X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { StoryRow } from '../components/StoryCard'
import { useTitle } from '../lib/extras'
import { SECTIONS, publisherName } from '../lib/feed/sources'
import { useNews } from '../lib/news/store'

const LIMIT = 60

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const query = q.trim()
  useTitle(query ? `Search: ${query}` : 'Search')
  const { all, ready } = useNews()
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    return all.filter((item) => {
      const haystack = `${item.title} ${item.summary} ${publisherName(item.sourceId)} ${item.author ?? ''} ${item.category ?? ''}`.toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
  }, [all, query])

  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true })

  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Search</h1>

      <form role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur() }} className="relative mt-5">
        <label htmlFor="page-search" className="sr-only">
          Search current headlines
        </label>
        <SearchIcon size={20} strokeWidth={2.4} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          id="page-search"
          type="search"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search current headlines"
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={!q}
          className="h-14 w-full border-2 border-ink bg-paper pl-12 pr-14 text-lg font-semibold placeholder:font-normal placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-wash hover:text-ink"
          >
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </form>

      <div aria-live="polite" className="mt-4 min-h-6 text-[15px] text-muted">
        {query && ready && (
          <p>
            {results.length === 0
              ? `No current headlines match “${query}”.`
              : `${results.length} ${results.length === 1 ? 'headline matches' : 'headlines match'} “${query}”${results.length > LIMIT ? ` — showing the newest ${LIMIT}` : ''}`}
          </p>
        )}
        {query && !ready && <p>Loading headlines…</p>}
      </div>

      {results.length > 0 && (
        <ol className="mt-2 divide-y divide-line border-t border-line">
          {results.slice(0, LIMIT).map((item) => (
            <li key={item.id} className="py-4">
              <StoryRow item={item} summary />
            </li>
          ))}
        </ol>
      )}

      {(!query || (ready && results.length === 0)) && (
        <div className="mt-6 border-t border-line pt-6">
          <p className="max-w-xl text-[16px] leading-relaxed text-body">
            {query
              ? 'Search covers the headlines currently in the feeds, so older stories will not appear. Try a shorter phrase, a name or a place — or browse a section.'
              : 'Search the headlines currently on 180news by topic, name, place or newsroom — or browse a section.'}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/section/${s.id}`}
                  className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
