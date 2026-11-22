import { Link, NavLink } from 'react-router-dom'
import { Clock, Home, Search, Bookmark } from 'lucide-react'
import { useControl } from '../lib/control'
import { useSaved } from '../lib/saved'
import { SOURCES } from '../lib/feeds'
import { telHref } from '../lib/control'
import { Logo } from './Header'
import { useNews } from '../lib/news/store'
import { NewStoriesButton } from './Ticker'

// -- skeletons ---------------------------------------------------------------
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-line/70 motion-reduce:animate-none ${className}`} />
}

export function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[16/9]" />
      <Skeleton className="mt-3 h-4 w-11/12" />
      <Skeleton className="mt-3 h-3 w-1/3" />
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="wrap pt-6" role="status" aria-label="Loading headlines">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Skeleton className="aspect-[16/9]" />
          <Skeleton className="mt-4 h-8 w-11/12" />
          <Skeleton className="mt-2 h-8 w-2/3" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
        <div className="grid grid-cols-2 gap-5 lg:col-span-3 lg:grid-cols-1">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-5 lg:col-span-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-2/3" />
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

export function EmptyFeeds() {
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

// -- bottom app bar (mobile) -------------------------------------------------
export function BottomNav() {
  const { saved } = useSaved()
  const items = [
    { to: '/', label: 'Home', icon: Home, end: true, badge: 0 },
    { to: '/latest', label: 'Latest', icon: Clock, end: false, badge: 0 },
    { to: '/search', label: 'Search', icon: Search, end: false, badge: 0 },
    { to: '/saved', label: 'Saved', icon: Bookmark, end: false, badge: saved.length },
  ]
  return (
    <nav
      aria-label="App"
      className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 overflow-hidden rounded-[22px] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }: { isActive: boolean }) =>
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

// -- footer ------------------------------------------------------------------
/** The newsroom's official accounts (fill-based brand glyphs keep the row consistent). */
const SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61577988715628',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/180DegreesNews',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/180degressnews/',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
  {
    label: 'WhatsApp channel',
    href: 'https://whatsapp.com/channel/0029VbBLaNJLY6d9zl6t6Z43',
    path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.666.134-.181.298-.46.446-.689.149-.229.223-.347.335-.521.111-.174.074-.348-.037-.521-.111-.174-.978-2.349-1.341-3.208-.363-.858-.752-.735-.996-.75-.242-.013-.512-.016-.782-.016-.27 0-.705.101-1.074.475-.369.374-1.408 1.376-1.408 3.357s1.441 3.886 1.642 4.157c.2.271 2.83 4.318 6.855 5.051.956.169 1.703.231 2.283.284.963.092 1.836-.164 2.435-.655.6-.492.963-1.352.963-2.285 0-.284-.149-1.126-.423-1.458-.274-.333-1.006-.669-1.202-.817zM12.05 2C6.495 2 2 6.495 2 12.05c0 1.765.462 3.493 1.34 5.01L2 22l5.07-1.32a10.02 10.02 0 0 0 4.98 1.32c5.555 0 10.05-4.495 10.05-10.05S17.605 2 12.05 2zm0 18.1c-1.51 0-2.99-.405-4.28-1.17l-.31-.185-3.09.81.825-3.01-.2-.315a8.06 8.06 0 0 1-1.235-4.29c0-4.455 3.63-8.085 8.09-8.085 2.16 0 4.19.845 5.72 2.37a8.03 8.03 0 0 1 2.365 5.715c0 4.455-3.63 8.085-8.085 8.085z',
  },
]


export function SiteFooter() {
  const year = new Date().getFullYear()
  const { settings, sections } = useControl()
  const linkClass = 'inline-flex min-h-9 items-center text-[15px] text-white/85 hover:text-white hover:underline'
  return (
    <footer className="on-dark mt-16 bg-navy-deep pb-[calc(82px+env(safe-area-inset-bottom))] text-white md:pb-0">
      <div className="wrap grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link to="/" aria-label="180news — home" className="inline-block bg-white px-4 py-3">
            <Logo className="h-16 w-auto" />
          </Link>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/85">
            180news brings the latest headlines from South African and international newsrooms onto one front page. Every story links to the publisher that reported it.
          </p>
          <div className="mt-5">
            <h2 className="text-sm font-black uppercase tracking-[0.06em]">Follow 180news</h2>
            <ul className="mt-3 flex gap-2">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`180news on ${social.label}`}
                    title={social.label}
                    className="grid size-11 place-items-center border border-white/25 bg-white/10 text-white transition-colors hover:bg-white hover:text-navy-deep"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-[15px] font-bold">180news.co.za</p>
          <address className="mt-3 not-italic">
            <h2 className="sr-only">Contact the newsroom</h2>
            <ul>
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-white hover:underline"
                >
                  <span className="sr-only">Email: </span>
                  <span className="break-all">{settings.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={telHref(settings.phone)}
                  className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold tabular-nums text-white hover:underline"
                >
                  <span className="sr-only">Phone: </span>
                  {settings.phone}
                </a>
              </li>
            </ul>
          </address>
          <div className="mt-4 max-w-sm border border-white/25 bg-white/10 px-4 py-3">
            <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-[0.06em]">Advertise with us</h2>
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
              <Link to="/" className={linkClass}>
                Top stories
              </Link>
            </li>
            <li>
              <Link to="/latest" className={linkClass}>
                Latest
              </Link>
            </li>
            {sections.map((section) => (
              <li key={section.id}>
                <Link to={`/section/${section.id}`} className={linkClass}>
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="News sources" className="md:col-span-3">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">Sources</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6">
            {Object.values(SOURCES).map((source) => (
              <li key={source.id}>
                <a href={source.home} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {source.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="About and policies" className="md:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">About 180news</h2>
          <ul className="mt-3">
            <li>
              <Link to="/about" className={linkClass}>
                About &amp; feed status
              </Link>
            </li>
            <li>
              <Link to="/policy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                Terms &amp; Conditions
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
            </a>{' '}
            ·{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
              Rates by ExchangeRate-API
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
