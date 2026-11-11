import { ArrowUp, Bookmark, Clock, House, Mail, Megaphone, Phone, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { telHref, useControl } from '../lib/control'
import { PUBLISHERS } from '../lib/feed/sources'
import { useNews } from '../lib/news/store'
import { useSaved } from '../lib/saved'
import { Logo } from './Header'

/** App-style tab bar for phones. */
export function BottomTabs() {
  const { saved } = useSaved()
  const tabs: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number }> = [
    { to: '/', label: 'Home', icon: House, end: true },
    { to: '/latest', label: 'Latest', icon: Clock },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/saved', label: 'Saved', icon: Bookmark, badge: saved.length },
  ]
  return (
    <nav
      aria-label="App"
      className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 overflow-hidden rounded-[22px] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex h-[58px] flex-col items-center justify-center gap-1 text-[11.5px] font-bold before:absolute before:inset-x-4 before:top-0 before:h-[3px] before:rounded-b-full before:content-[''] ${
                  isActive ? 'text-brand before:bg-brand' : 'text-body'
                }`
              }
            >
              <span className="relative">
                <Icon size={21} strokeWidth={2.2} aria-hidden="true" />
                {!!badge && (
                  <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-extrabold leading-none text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Appears when a background refresh finds new stories, instead of reshuffling the page. */
export function NewStoriesPill() {
  const { pendingCount, applyPending } = useNews()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[116px] z-50 flex justify-center px-4">
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={applyPending}
          className="rise pointer-events-auto inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgb(2_3_79_/_0.28)] hover:bg-brand-strong"
        >
          <ArrowUp size={16} strokeWidth={3} aria-hidden="true" />
          {pendingCount} new {pendingCount === 1 ? 'story' : 'stories'}
        </button>
      )}
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  const { settings, sections } = useControl()
  const link = 'inline-flex min-h-9 items-center text-[15px] text-white/85 hover:text-white hover:underline'
  return (
    <footer className="on-dark mt-16 bg-navy-deep pb-[calc(82px+env(safe-area-inset-bottom))] text-white md:pb-0">
      <div className="wrap grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link to="/" aria-label="180news — home" className="inline-block bg-white px-4 py-3">
            <Logo className="h-16 w-auto" />
          </Link>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/85">
            180news brings the latest headlines from South African and international newsrooms onto one front page. Every story links to the
            publisher that reported it.
          </p>
          <p className="mt-4 text-[15px] font-bold">180news.co.za</p>
          <address className="mt-3 not-italic">
            <h2 className="sr-only">Contact the newsroom</h2>
            <ul>
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-white hover:underline">
                  <Mail size={17} strokeWidth={2.2} className="shrink-0 text-white/75" aria-hidden="true" />
                  <span className="sr-only">Email: </span>
                  <span className="break-all">{settings.email}</span>
                </a>
              </li>
              <li>
                <a href={telHref(settings.phone)} className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold tabular-nums text-white hover:underline">
                  <Phone size={17} strokeWidth={2.2} className="shrink-0 text-white/75" aria-hidden="true" />
                  <span className="sr-only">Phone: </span>
                  {settings.phone}
                </a>
              </li>
            </ul>
          </address>
          <div className="mt-4 max-w-sm border border-white/25 bg-white/10 px-4 py-3">
            <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-[0.06em]">
              <Megaphone size={17} strokeWidth={2.2} className="shrink-0 text-white/75" aria-hidden="true" />
              Advertise with us
            </h2>
            <p className="text-[15px] text-white/85">
              Call:{' '}
              <a href={telHref(settings.adPhone)} className="inline-flex min-h-11 items-center font-bold tabular-nums text-white hover:underline">
                {settings.adPhone}
              </a>
            </p>
          </div>
        </div>

        <nav aria-label="Footer sections" className="md:col-span-3">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">Sections</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6">
            <li>
              <Link to="/" className={link}>
                Top stories
              </Link>
            </li>
            <li>
              <Link to="/latest" className={link}>
                Latest
              </Link>
            </li>
            {sections.map((s) => (
              <li key={s.id}>
                <Link to={`/section/${s.id}`} className={link}>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="News sources" className="md:col-span-3">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">Sources</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6">
            {Object.values(PUBLISHERS).map((p) => (
              <li key={p.id}>
                <a href={p.home} target="_blank" rel="noopener noreferrer" className={link}>
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Admin" className="md:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">180news</h2>
          <ul className="mt-3">
            <li>
              <Link to="/admin" className={link}>
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/20">
        <div className="wrap flex flex-col gap-2 py-5 text-[13px] leading-relaxed text-white/75 md:flex-row md:items-center md:justify-between">
          <p>© {year} 180news. Headlines, summaries and images belong to their respective publishers.</p>
          <p>
            Weather by{' '}
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
              Open-Meteo
            </a>
            {' · '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
              Rates by ExchangeRate-API
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ---------- Loading and empty states ---------- */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-line/70 motion-reduce:animate-none ${className}`} />
}

export function CardSkeleton() {
  return (
    <div>
      <Bar className="aspect-[16/9]" />
      <Bar className="mt-3 h-4 w-11/12" />
      <Bar className="mt-2 h-4 w-3/4" />
      <Bar className="mt-3 h-3 w-1/3" />
    </div>
  )
}

export function FrontSkeleton() {
  return (
    <div className="wrap pt-6" role="status" aria-label="Loading headlines">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Bar className="aspect-[16/9]" />
          <Bar className="mt-4 h-8 w-11/12" />
          <Bar className="mt-2 h-8 w-2/3" />
          <Bar className="mt-4 h-4 w-full" />
          <Bar className="mt-2 h-4 w-5/6" />
        </div>
        <div className="grid grid-cols-2 gap-5 lg:col-span-3 lg:grid-cols-1">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-5 lg:col-span-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <Bar className="h-3 w-16" />
              <Bar className="mt-2 h-4 w-full" />
              <Bar className="mt-1.5 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading headlines">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Shown when neither the live feeds nor any saved copy could be loaded. */
export function FeedsDown() {
  const { refresh, refreshing } = useNews()
  return (
    <div className="wrap py-20 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">We can’t reach the news feeds right now</h1>
      <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-body">
        Your connection may be offline, or the publishers’ feeds are not responding. Nothing has been lost — try again in a moment.
      </p>
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="mt-6 inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70"
      >
        {refreshing ? 'Checking feeds…' : 'Try again'}
      </button>
    </div>
  )
}
