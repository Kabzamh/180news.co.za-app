import { Phone } from 'lucide-react'
import { telHref, useControl } from '../lib/control'
import type { AdPosition, AdSlotId } from '../lib/control'

/**
 * One advertising position. It carries the advert set in the Control panel,
 * or the "Advertise with us" notice while the position is unsold, and is
 * always labelled so readers can tell it apart from the news. Each page marks
 * every place the slot may sit with `at`; only the chosen one is filled.
 */
export function AdSlot({ id, at, className = '' }: { id: AdSlotId; at: AdPosition; className?: string }) {
  const { ads, settings } = useControl()
  const ad = ads[id]
  if (!settings.adsOn || !ad.enabled || ad.position !== at) return null

  const picture = ad.image && <img src={ad.image} alt={ad.name || 'Advertisement'} className="mx-auto block max-h-[280px] w-auto max-w-full" />

  return (
    <aside aria-label="Advertisement" className={className}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Advertisement</p>
      {picture ? (
        <div className="bg-wash">
          {ad.url ? (
            <a href={ad.url} target="_blank" rel="sponsored noopener noreferrer" className="block">
              {picture}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            picture
          )}
        </div>
      ) : (
        <div className="on-dark dot-band flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-5 text-white sm:px-7 sm:py-6">
          {/* The two halves sit side by side where the slot is wide enough, and stack where it is not. */}
          <div className="min-w-[min(18rem,100%)] flex-1">
            <p className="text-[22px] font-black uppercase leading-none tracking-[-0.01em] sm:text-[26px]">Advertise with us</p>
            <p className="mt-2 text-[15px] leading-snug text-white/85">Put your business in front of 180news readers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href={telHref(settings.adPhone)}
              className="inline-flex h-12 items-center gap-2.5 bg-white px-5 text-[15px] font-extrabold tabular-nums text-navy-deep hover:bg-navy-tint"
            >
              <Phone size={17} strokeWidth={2.5} aria-hidden="true" />
              Call {settings.adPhone}
            </a>
            <a href={`mailto:${settings.email}?subject=${encodeURIComponent('Advertising on 180news')}`} className="inline-flex min-h-11 items-center break-all text-[15px] font-bold underline underline-offset-[3px]">
              {settings.email}
            </a>
          </div>
        </div>
      )}
    </aside>
  )
}

/**
 * The advert in the site header. It sits in the same row as the logo on every
 * screen size, between the logo and the search, and is kept to about the
 * height of the logo so the header stays compact. It is labelled like every
 * other advert.
 */
export function HeaderAd({ className = '' }: { className?: string }) {
  const { ads, settings } = useControl()
  const ad = ads.header
  if (!settings.adsOn || !ad.enabled) return null

  const picture = ad.image && <img src={ad.image} alt={ad.name || 'Advertisement'} className="block max-h-[44px] w-auto max-w-full md:max-h-[60px]" />

  return (
    <aside aria-label="Advertisement" className={`flex min-w-0 justify-center ${className}`}>
      <div className="w-fit min-w-0 max-w-full">
        <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-muted md:text-[11px]">Advertisement</p>
        {picture ? (
          ad.url ? (
            <a href={ad.url} target="_blank" rel="sponsored noopener noreferrer" className="block">
              {picture}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            picture
          )
        ) : (
          // On a phone: two short lines, and the whole block dials the number. From tablet up: the line and a call button side by side.
          <div className="on-dark dot-band relative flex min-h-11 flex-col justify-center px-2 py-1.5 text-white md:min-h-[60px] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-1 md:px-3.5 md:py-2">
            <p className="text-[10.5px] font-black uppercase leading-tight tracking-[0.02em] md:text-[15px] md:leading-[1.1] md:tracking-[-0.005em]">
              <span className="md:block lg:inline">Advertise</span> <span className="whitespace-nowrap">with us</span>
            </p>
            <a
              href={telHref(settings.adPhone)}
              className="text-[13.5px] font-extrabold leading-tight tabular-nums text-white underline decoration-white/60 underline-offset-2 max-md:after:absolute max-md:after:inset-0 max-md:after:content-[''] md:inline-flex md:h-11 md:shrink-0 md:items-center md:gap-2 md:whitespace-nowrap md:bg-white md:px-3 md:text-[14.5px] md:text-navy-deep md:no-underline md:hover:bg-navy-tint"
            >
              <Phone size={16} strokeWidth={2.5} className="hidden md:block" aria-hidden="true" />
              <span className="sr-only">Call </span>
              {settings.adPhone}
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}

/**
 * The top banner: a full-width band directly above the navigation bar (or, if
 * chosen in Ads control, at the very top of the page). It carries adverts
 * only: until an advert is uploaded it is not shown at all. The header marks
 * both places it may sit with `at`; only the chosen one is filled.
 */
export function TopBanner({ at }: { at: AdPosition }) {
  const { ads, settings } = useControl()
  const ad = ads.banner
  if (!settings.adsOn || !ad.enabled || !ad.image || ad.position !== at) return null

  // Up to 90 pixels tall and never wider than the page or larger than the image itself. With the image's
  // size known, its place is held from the first paint, so the page below does not jump when it loads.
  const box = ad.w && ad.h ? { width: `min(100%, ${Math.round(Math.min(ad.w, (90 * ad.w) / ad.h))}px)`, aspectRatio: `${ad.w} / ${ad.h}` } : undefined
  const picture = <img src={ad.image} alt={ad.name || 'Advertisement'} className={box ? 'block h-full w-full' : 'mx-auto block max-h-[90px] w-auto max-w-full'} />

  return (
    <aside aria-label="Advertisement" className={`border-b border-line bg-wash ${at === 'abovemenu' ? 'mb-3 border-t' : ''}`}>
      <div className="wrap py-1.5 md:py-2">
        {/* The one thing here besides the advert: the label that tells readers it is one. */}
        <p className="mb-1 text-center text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-muted md:text-[11px]">Advertisement</p>
        {ad.url ? (
          <a href={ad.url} target="_blank" rel="sponsored noopener noreferrer" className={`mx-auto block ${box ? '' : 'w-fit max-w-full'}`} style={box}>
            {picture}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : box ? (
          <div className="mx-auto" style={box}>
            {picture}
          </div>
        ) : (
          picture
        )}
      </div>
    </aside>
  )
}
