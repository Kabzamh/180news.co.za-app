import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, RefreshCw, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CITIES, describeWeather, useRates, useWeather } from '../lib/extras'
import type { WeatherKind } from '../lib/extras'
import { shortDate, stamp } from '../lib/format'
import { useNews } from '../lib/news/store'

const WEATHER_ICON: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

/** Current conditions for a chosen city, in the top strip. */
export function WeatherChip() {
  const { city, weather, chooseCity } = useWeather()
  const info = weather ? describeWeather(weather.code) : null
  const Icon = info ? (info.kind === 'clear' && !weather?.isDay ? Moon : WEATHER_ICON[info.kind]) : Cloud

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon size={16} strokeWidth={2.2} className="shrink-0 text-white/80" aria-hidden="true" />
      <span className="shrink-0 font-bold tabular-nums" aria-live="polite">
        {weather && info ? (
          <>
            {Math.round(weather.temp)}°<span className="sr-only">C, {info.label}</span>
          </>
        ) : (
          <span className="text-white/60">–°</span>
        )}
      </span>
      <label className="sr-only" htmlFor="weather-city">
        Weather city
      </label>
      <select
        id="weather-city"
        value={city.id}
        onChange={(e) => chooseCity(e.target.value)}
        className="h-9 min-w-0 max-w-[7rem] sm:max-w-[9.5rem] cursor-pointer truncate rounded bg-transparent pr-1 font-semibold text-white hover:underline"
      >
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}

const money = (n: number) => `R${n.toFixed(2)}`

/** One-line rand rates for the top strip. */
export function RatesInline({ className = '' }: { className?: string }) {
  const rates = useRates()
  if (!rates) return null
  const pairs: Array<[string, number]> = [
    ['US dollar', rates.usd],
    ['Euro', rates.eur],
    ['British pound', rates.gbp],
  ]
  const symbols = ['$', '€', '£']
  return (
    <dl className={`items-center gap-4 ${className}`} title={`Daily reference rates, ${shortDate(rates.updatedAt)}`}>
      {pairs.map(([name, value], i) => (
        <div key={name} className="flex items-baseline gap-1.5">
          <dt className="text-white/70">
            <span aria-hidden="true">R/{symbols[i]}</span>
            <span className="sr-only">Rand per {name}</span>
          </dt>
          <dd className="font-bold tabular-nums">{value.toFixed(2)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Card version for the Business pages. */
export function RandWatch() {
  const rates = useRates()
  if (!rates) return null
  const rows: Array<[string, string, number]> = [
    ['US dollar', 'USD', rates.usd],
    ['Euro', 'EUR', rates.eur],
    ['British pound', 'GBP', rates.gbp],
  ]
  return (
    <aside aria-labelledby="rand-watch" className="border border-line bg-wash p-5">
      <h3 id="rand-watch" className="text-sm font-black uppercase tracking-[0.04em] text-navy">
        Rand watch
      </h3>
      <dl className="mt-3 divide-y divide-line">
        {rows.map(([name, code, value]) => (
          <div key={code} className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-[15px] font-semibold text-body">
              {name} <span className="text-muted">{code}</span>
            </dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink">{money(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-snug text-muted">
        What one unit costs in rand. Daily reference rates, updated {shortDate(rates.updatedAt)} — not live trading prices.{' '}
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy">
          Rates by ExchangeRate-API
        </a>
      </p>
    </aside>
  )
}

/** Shows whether headlines are live and doubles as the refresh control. */
export function LiveStatus() {
  const { status, refreshing, refresh, now } = useNews()

  let prefix = ''
  let text: string
  let dot: string
  if (status.kind === 'live' && status.at) {
    prefix = 'Live · '
    text = stamp(status.at, now)
    dot = 'bg-live live-dot'
  } else if (status.kind === 'loading') {
    text = 'Updating…'
    dot = 'bg-white/60'
  } else if (status.kind === 'saved' && status.at) {
    prefix = 'Last updated '
    text = stamp(status.at, now)
    dot = 'bg-warn'
  } else {
    text = 'Feeds unreachable'
    dot = 'bg-warn'
  }
  const compactPrefix = status.kind === 'saved'

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      aria-label={`${prefix}${text}. Refresh headlines`}
      title="Refresh headlines"
      className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded px-1 font-bold hover:underline disabled:cursor-progress"
    >
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      <span>
        {prefix && <span className={compactPrefix ? 'hidden sm:inline' : ''}>{prefix}</span>}
        {text}
      </span>
      <RefreshCw size={14} strokeWidth={2.5} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
    </button>
  )
}
