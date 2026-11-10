import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AD_IMAGE_MAX, adLink, useControl } from '../lib/control'
import type { AdPosition, AdSlotId } from '../lib/control'
import { pictureToDataUrl } from '../lib/media'
import { Toggle } from './Toggle'

const field = 'w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'

/** Everything about one advertising position: on or off, where it sits, and the advert it carries. */
export function AdSlotEditor({ id, name, where, positions }: { id: AdSlotId; name: string; where: string; positions: Array<[AdPosition, string]> }) {
  const { ads, saveAd } = useControl()
  const ad = ads[id]
  const [image, setImage] = useState(ad.image)
  const [advertiser, setAdvertiser] = useState(ad.name)
  const [url, setUrl] = useState(ad.url)
  const [errors, setErrors] = useState<{ image?: string; advertiser?: string; url?: string }>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Pick up an advert that arrived another way (a loaded backup, another tab).
  const current = `${ad.image?.length ?? 0}|${ad.name}|${ad.url}`
  const [seen, setSeen] = useState(current)
  if (seen !== current) {
    setSeen(current)
    setImage(ad.image)
    setAdvertiser(ad.name)
    setUrl(ad.url)
    setErrors({})
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setNote('')
    try {
      const data = await pictureToDataUrl(file, 1200, 0.8)
      if (data.length > AD_IMAGE_MAX) throw new Error('That image is too large to keep. A wide banner, about 1200 by 300, works best.')
      setImage(data)
      setErrors((prev) => ({ ...prev, image: undefined }))
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: err instanceof Error ? err.message : 'That image could not be read.' }))
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    const link = adLink(url)
    if (image && advertiser.trim().length < 2) next.advertiser = 'Name the advertiser. It is read out to people who cannot see the image.'
    if (link === null) next.url = 'Enter a web address, like www.example.co.za.'
    else if (link && !image) next.url = 'Add the advert image first — the link opens when it is tapped.'
    setErrors(next)
    if (next.advertiser || next.url) {
      setNote('')
      document.getElementById(`ad-${id}-${next.advertiser ? 'name' : 'url'}`)?.focus()
      return
    }
    const ok = saveAd(id, { enabled: ad.enabled, position: ad.position, ...(image ? { image } : {}), name: image ? advertiser.trim() : '', url: image && link ? link : '' })
    setNote(ok ? (image ? 'Saved — the advert is showing.' : 'Saved — the slot shows “Advertise with us”.') : '')
    if (!ok) setErrors({ image: 'This browser’s storage is full. Use a smaller image, or delete an older article.' })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="border border-line bg-wash p-4 sm:p-5">
      <h3 className="text-[17px] font-extrabold">{name}</h3>
      <p className="text-[13.5px] text-muted">{where}</p>
      <Toggle label="Show this slot" checked={ad.enabled} onChange={(on) => void saveAd(id, { ...ad, enabled: on })} />
      <label htmlFor={`ad-${id}-position`} className="mt-1 block text-[14.5px] font-extrabold">
        Position
      </label>
      <select
        id={`ad-${id}-position`}
        value={ad.position}
        disabled={!ad.enabled}
        onChange={(e) => void saveAd(id, { ...ad, position: e.target.value as AdPosition })}
        className={`${field} mb-4 mt-1.5 h-12 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {positions.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>

      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} className="hidden" tabIndex={-1} />
      {image ? (
        <img src={image} alt={advertiser || 'Advert image'} className="mt-2 max-h-40 w-auto max-w-full bg-paper" />
      ) : (
        <p className="mt-2 border border-dashed border-ink/30 bg-paper px-3 py-3 text-[14px] leading-snug text-body">
          No advert yet. Readers see the “Advertise with us” notice here.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/35 bg-paper px-4 text-sm font-bold hover:border-navy hover:text-navy disabled:cursor-progress"
        >
          <ImagePlus size={16} strokeWidth={2.3} aria-hidden="true" /> {busy ? 'Preparing…' : image ? 'Replace image' : 'Upload advert image'}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => {
              // Taking the advert away needs no second step: its name and link go with it.
              const ok = saveAd(id, { enabled: ad.enabled, position: ad.position, name: '', url: '' })
              setImage(undefined)
              setAdvertiser('')
              setUrl('')
              setErrors({})
              setNote(ok ? 'Advert removed — the slot shows “Advertise with us”.' : '')
            }}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/35 bg-paper px-4 text-sm font-bold hover:border-brand hover:text-brand"
          >
            <X size={16} strokeWidth={2.5} aria-hidden="true" /> Remove advert
          </button>
        )}
      </div>
      {errors.image && (
        <p role="alert" className="mt-1.5 text-[13.5px] font-bold text-brand">
          {errors.image}
        </p>
      )}

      <label htmlFor={`ad-${id}-name`} className="mt-4 block text-[14.5px] font-extrabold">
        Advertiser
      </label>
      <input
        id={`ad-${id}-name`}
        value={advertiser}
        onChange={(e) => setAdvertiser(e.target.value)}
        maxLength={80}
        aria-invalid={!!errors.advertiser}
        aria-describedby={errors.advertiser ? `ad-${id}-name-error` : undefined}
        autoComplete="off"
        className={`${field} mt-1.5 h-12`}
      />
      {errors.advertiser && (
        <p id={`ad-${id}-name-error`} className="mt-1.5 text-[13.5px] font-bold text-brand">
          {errors.advertiser}
        </p>
      )}

      <label htmlFor={`ad-${id}-url`} className="mt-4 block text-[14.5px] font-extrabold">
        Link <span className="font-semibold text-muted">(optional)</span>
      </label>
      <input
        id={`ad-${id}-url`}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        inputMode="url"
        autoCapitalize="none"
        aria-invalid={!!errors.url}
        aria-describedby={errors.url ? `ad-${id}-url-error` : undefined}
        autoComplete="off"
        className={`${field} mt-1.5 h-12`}
      />
      {errors.url && (
        <p id={`ad-${id}-url-error`} className="mt-1.5 text-[13.5px] font-bold text-brand">
          {errors.url}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex h-11 cursor-pointer items-center bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress">
          Save advert
        </button>
        <p role="status" className="text-[14px] font-bold text-navy">
          {note}
        </p>
      </div>
    </form>
  )
}
