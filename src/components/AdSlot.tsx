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
