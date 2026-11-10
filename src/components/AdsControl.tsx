import { ArrowRight, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AD_SLOTS, useControl } from '../lib/control'
import type { AdPosition } from '../lib/control'
import { Toggle } from './Toggle'

/** One switch for every advert on the site. Each slot keeps its own settings while it is off. */
export function AdsMasterSwitch() {
  const { settings, update } = useControl()
  return (
    <Toggle
      label="Show adverts on the site"
      note="Switch off to take every advert, and the “Advertise with us” notice, off the site at once."
      checked={settings.adsOn}
      onChange={(on) => update({ adsOn: on })}
    />
  )
}

/** Ad controls on the Admin page itself: everything on or off, then each slot's switch, position and what it is showing. */
export function AdsControl() {
  const { ads, settings, saveAd } = useControl()

  return (
    <section aria-labelledby="admin-ads" className="mt-9">
      <h2 id="admin-ads" className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.06em] text-navy">
        <Megaphone size={17} strokeWidth={2.3} aria-hidden="true" />
        Ads control
      </h2>
      <div className="mt-3 border border-line bg-wash p-4 sm:p-5">
        <div className="border border-line bg-paper px-4 py-1.5">
          <AdsMasterSwitch />
        </div>

        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {AD_SLOTS.map((slot) => {
            const ad = ads[slot.id]
            const on = settings.adsOn && ad.enabled
            const showing = !ad.enabled
              ? 'This slot is switched off.'
              : !settings.adsOn
                ? 'Hidden while adverts are switched off.'
                : ad.image
                  ? `Showing the ${ad.name || 'uploaded'} advert.`
                  : 'Showing the “Advertise with us” notice.'
            return (
              <li key={slot.id} className="border border-line bg-paper p-4">
                <div className="flex items-start gap-3">
                  {ad.image && <img src={ad.image} alt="" className="h-12 w-20 shrink-0 bg-wash object-contain" />}
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 text-[17px] font-extrabold leading-tight">
                      {slot.name}
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${on ? 'bg-[#dff5e8] text-[#0b5a2e]' : 'bg-wash text-body'}`}>{on ? 'On' : 'Off'}</span>
                    </h3>
                    <p className="mt-1 text-[13.5px] leading-snug text-muted">{showing}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <Toggle label={`Show on ${slot.name.toLowerCase()}`} checked={ad.enabled} onChange={(next) => void saveAd(slot.id, { ...ad, enabled: next })} />
                </div>
                <label htmlFor={`admin-ad-${slot.id}-position`} className="mt-1 block text-[14.5px] font-extrabold">
                  Position<span className="sr-only"> on {slot.name.toLowerCase()}</span>
                </label>
                <select
                  id={`admin-ad-${slot.id}-position`}
                  value={ad.position}
                  disabled={!ad.enabled}
                  onChange={(e) => void saveAd(slot.id, { ...ad, position: e.target.value as AdPosition })}
                  className="mt-1.5 h-12 w-full cursor-pointer border border-ink/35 bg-paper px-3.5 text-base text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {slot.positions.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </li>
            )
          })}
        </ul>

        <Link to="/admin/ads" className="mt-4 inline-flex h-12 items-center gap-2 bg-brand px-5 text-[15px] font-extrabold text-white hover:bg-brand-strong">
          Upload or change adverts
          <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
