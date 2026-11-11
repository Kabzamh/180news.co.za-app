import { Bookmark, Search } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { areaForPath } from '../lib/auth'
import { useControl } from '../lib/control'
import { todayLabel } from '../lib/format'
import { useNews } from '../lib/news/store'
import { useSaved } from '../lib/saved'
import { HeaderAd, TopBanner } from './AdSlot'
import { Ticker } from './Ticker'
import { LiveStatus, RatesInline, WeatherChip } from './Widgets'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img src="/logo.png" alt="180° News" width={480} height={274} className={className} />
    </picture>
  )
}

function TopStrip() {
  const { now } = useNews()
  return (
    <div className="on-dark bg-navy-deep text-[12.5px] text-white">
      <div className="wrap flex h-10 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-5">
          <p className="hidden shrink-0 font-semibold md:block">{todayLabel(now)}</p>
          <WeatherChip />
        </div>
        <div className="flex items-center gap-6">
          <RatesInline className="hidden lg:flex" />
          <LiveStatus />
        </div>
      </div>
    </div>
  )
}

/** `compact` keeps the full search box for wide screens only, leaving the search icon to make room beside the logo. */
function SearchForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const current = location.pathname === '/search' ? (params.get('q') ?? '') : ''

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <form role="search" onSubmit={onSubmit} className={`hidden w-full max-w-sm items-stretch ${compact ? 'lg:flex' : 'md:flex'}`}>
      <label htmlFor="site-search" className="sr-only">
        Search headlines
      </label>
      <input
        id="site-search"
        key={current}
        name="q"
        type="search"
        defaultValue={current}
        placeholder="Search headlines"
        autoComplete="off"
        className="h-11 min-w-0 flex-1 border border-r-0 border-line bg-wash px-3.5 text-[15px] placeholder:text-muted focus:bg-paper"
      />
      <button type="submit" aria-label="Search" className="grid h-11 w-12 cursor-pointer place-items-center bg-navy text-white transition-colors hover:bg-navy-deep">
        <Search size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  )
}

function SectionNav() {
  const listRef = useRef<HTMLUListElement>(null)
  const { sections } = useControl()
  const { pathname } = useLocation()

  // Keep the active section in view inside the horizontal scroller.
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !active) return
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  const item = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-12 items-center whitespace-nowrap px-3 text-[15px] font-bold transition-colors after:absolute after:inset-x-3 after:bottom-1.5 after:h-[3px] after:rounded-full after:content-[''] ${
      isActive ? 'text-brand after:bg-brand' : 'text-ink hover:text-brand'
    }`

  return (
    <div className="sticky top-2 z-40">
      <div className="wrap">
        <div className="glass-bar">
          <nav aria-label="Sections" className="glass px-1 sm:px-2">
            <ul
              ref={listRef}
              className="no-scrollbar relative flex overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] lg:pr-0 lg:[mask-image:none]"
            >
              <li>
                <NavLink to="/" end className={item}>
                  Top stories
                </NavLink>
              </li>
              <li>
                <NavLink to="/latest" className={item}>
                  Latest
                </NavLink>
              </li>
              {sections.map((s) => (
                <Fragment key={s.id}>
                  <li>
                    <NavLink to={`/section/${s.id}`} className={item}>
                      {s.label}
                    </NavLink>
                  </li>
                  {s.id === 'elections' && (
                    <li>
                      <NavLink to="/results" className={item}>
                        IEC results
                      </NavLink>
                    </li>
                  )}
                </Fragment>
              ))}
            </ul>
          </nav>
          <Ticker />
        </div>
      </div>
    </div>
  )
}

export function Header() {
  const { saved } = useSaved()
  const { ads, settings } = useControl()
  const { pathname } = useLocation()
  // Adverts are for readers: they are left off the sign-in, article form and admin pages.
  const publicPage = areaForPath(pathname) === null
  const showAd = settings.adsOn && ads.header.enabled && publicPage
  return (
    <>
      {/* The top banner sits directly above the navigation bar (below), unless Ads control puts it at the very top of the page. */}
      {publicPage && <TopBanner at="verytop" />}
      <header>
        <TopStrip />
        <div className={`wrap flex items-center py-2 md:gap-8 md:py-3 ${showAd ? 'gap-3' : 'gap-4'}`}>
          <Link to="/" aria-label="180news — home" className="shrink-0">
            <Logo className="h-[52px] w-auto md:h-[76px]" />
          </Link>
          {/* In the logo row on every screen: it takes the space between the logo and the search. */}
          {showAd && <HeaderAd className="flex-1" />}
          <div className={`ml-auto flex items-center justify-end gap-3 ${showAd ? 'flex-none lg:w-[26rem]' : 'flex-1'}`}>
            <SearchForm compact={showAd} />
            <Link
              to="/saved"
              className="hidden h-11 shrink-0 items-center gap-2 border border-line px-4 text-[15px] font-bold transition-colors hover:border-brand hover:text-brand md:inline-flex"
            >
              <Bookmark size={17} strokeWidth={2.3} aria-hidden="true" />
              Saved
              {saved.length > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-extrabold text-white">
                  {saved.length}
                  <span className="sr-only"> stories</span>
                </span>
              )}
            </Link>
            <Link to="/search" aria-label="Search headlines" className={`grid size-11 place-items-center rounded-full text-ink hover:bg-wash ${showAd ? 'lg:hidden' : 'md:hidden'}`}>
              <Search size={22} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
      {publicPage && <TopBanner at="abovemenu" />}
      <SectionNav />
    </>
  )
}
