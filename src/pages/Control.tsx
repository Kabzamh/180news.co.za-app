import { Download, ImagePlus, PenLine, RotateCcw, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArticleList } from '../components/ArticleList'
import { AD_IMAGE_MAX, AD_SLOTS, LIMITS, REFRESH_CHOICES, adLink, isEmail, isPhone, useControl } from '../lib/control'
import type { AdPosition, AdSlotId, CrawlSpeed } from '../lib/control'
import { useTitle } from '../lib/extras'
import { pictureToDataUrl } from '../lib/media'
import { PUBLISHERS, SECTIONS } from '../lib/feed/sources'

const field = 'w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'
const outline =
  'inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white'

function Card({ id, title, intro, children, wide = false }: { id: string; title: string; intro?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section aria-labelledby={id} className={`border border-line bg-paper p-5 sm:p-6 ${wide ? 'lg:col-span-2' : ''}`}>
      <h2 id={id} className="text-xl font-extrabold tracking-tight">
        {title}
      </h2>
      {intro && <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Toggle({ label, checked, onChange, disabled = false, note }: { label: string; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; note?: string }) {
  return (
    <label className={`flex min-h-12 items-center justify-between gap-4 py-1.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="text-[15.5px] font-bold">
        {label}
        {note && <span className="block text-[13px] font-normal text-muted">{note}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-[#8a919e] transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-navy peer-checked:after:translate-x-5 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy peer-disabled:opacity-50 motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </label>
  )
}

function ContactForm() {
  const { settings, update } = useControl()
  const [email, setEmail] = useState(settings.email)
  const [phone, setPhone] = useState(settings.phone)
  const [adPhone, setAdPhone] = useState(settings.adPhone)
  const [errors, setErrors] = useState<{ email?: string; phone?: string; adPhone?: string }>({})
  const [saved, setSaved] = useState(false)

  // Pick up changes made elsewhere (a loaded backup, a reset) without losing the "saved" note after our own save.
  const current = `${settings.email}|${settings.phone}|${settings.adPhone}`
  const [seen, setSeen] = useState(current)
  if (seen !== current) {
    setSeen(current)
    setEmail(settings.email)
    setPhone(settings.phone)
    setAdPhone(settings.adPhone)
    setErrors({})
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!isEmail(email.trim())) next.email = 'Enter an email address, like newsroom@180news.co.za.'
    if (!isPhone(phone.trim())) next.phone = 'Enter a phone number using digits, spaces and an optional +.'
    if (!isPhone(adPhone.trim())) next.adPhone = 'Enter a phone number using digits, spaces and an optional +.'
    setErrors(next)
    const firstBad = (['email', 'phone', 'adPhone'] as const).find((key) => next[key])
    if (firstBad) {
      setSaved(false)
      document.getElementById(`contact-${firstBad}`)?.focus()
      return
    }
    update({ email: email.trim(), phone: phone.trim(), adPhone: adPhone.trim() })
    setSaved(true)
  }

  const rows = [
    { key: 'email' as const, label: 'Newsroom email', value: email, set: setEmail, type: 'email', mode: 'email' as const },
    { key: 'phone' as const, label: 'Contact number', value: phone, set: setPhone, type: 'tel', mode: 'tel' as const },
    { key: 'adPhone' as const, label: 'Advertising number', value: adPhone, set: setAdPhone, type: 'tel', mode: 'tel' as const },
  ]

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {rows.map((row) => (
        <div key={row.key}>
          <label htmlFor={`contact-${row.key}`} className="block text-[15px] font-extrabold">
            {row.label}
          </label>
          <input
            id={`contact-${row.key}`}
            type={row.type}
            inputMode={row.mode}
            value={row.value}
            onChange={(e) => {
              row.set(e.target.value)
              setSaved(false)
            }}
            aria-invalid={!!errors[row.key]}
            aria-describedby={errors[row.key] ? `contact-${row.key}-error` : undefined}
            autoComplete="off"
            className={`${field} mt-1.5 h-12`}
          />
          {errors[row.key] && (
            <p id={`contact-${row.key}-error`} className="mt-1.5 text-[13.5px] font-bold text-brand">
              {errors[row.key]}
            </p>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="inline-flex h-11 cursor-pointer items-center bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-strong">
          Save contact details
        </button>
        <p role="status" className="text-[14px] font-bold text-navy">
          {saved ? 'Saved — the footer is updated.' : ''}
        </p>
      </div>
    </form>
  )
}

function AdSlotEditor({ id, name, where, positions }: { id: AdSlotId; name: string; where: string; positions: Array<[AdPosition, string]> }) {
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

function Backup() {
  const { exportData, importData, resetSettings } = useControl()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `180news-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMessage({ tone: 'ok', text: 'Backup file downloaded.' })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 40 * 1024 * 1024) {
      setMessage({ tone: 'bad', text: 'That file is too large to be a 180news backup.' })
      return
    }
    const result = importData(await file.text())
    setMessage(
      result.ok
        ? { tone: 'ok', text: `Backup loaded: settings and ${result.articles} ${result.articles === 1 ? 'article' : 'articles'}.` }
        : { tone: 'bad', text: result.error },
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={download} className={outline}>
          <Download size={16} strokeWidth={2.5} aria-hidden="true" /> Download backup
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={outline}>
          <Upload size={16} strokeWidth={2.5} aria-hidden="true" /> Load backup
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={onFile} className="hidden" tabIndex={-1} />
        {confirmReset ? (
          <>
            <button
              type="button"
              onClick={() => {
                resetSettings()
                setConfirmReset(false)
                setMessage({ tone: 'ok', text: 'Settings are back to their defaults. Articles and adverts were kept.' })
              }}
              className="inline-flex h-11 cursor-pointer items-center bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-strong"
            >
              Reset all settings
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className={outline}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className={outline}>
            <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" /> Reset settings…
          </button>
        )}
      </div>
      <p role="status" className={`mt-3 min-h-5 text-[14px] font-bold ${message?.tone === 'bad' ? 'text-brand' : 'text-navy'}`}>
        {message?.text ?? ''}
      </p>
    </>
  )
}

const SPEEDS: Array<[CrawlSpeed, string]> = [
  ['slow', 'Slow'],
  ['normal', 'Normal'],
  ['fast', 'Fast'],
]

export default function Control() {
  useTitle('Control panel')
  const { settings, update } = useControl()
  const shownSections = SECTIONS.length - settings.hiddenSections.length

  const toggleIn = (list: string[], id: string, on: boolean) => (on ? list.filter((x) => x !== id) : [...list, id])

  return (
    <div className="wrap max-w-[1040px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Control panel</h1>
        <p className="mt-3 max-w-[66ch] text-[16px] leading-relaxed text-body">
          Choose what 180news shows and how it behaves. Changes apply straight away and are stored in this browser, so they shape the app on
          this device only. Use the backup file to carry them to another device.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card id="ctl-sections" title="Sections" intro="Switched-off sections leave the menu, the front page, Latest and search.">
          <div className="divide-y divide-line">
            {SECTIONS.map((s) => {
              const on = !settings.hiddenSections.includes(s.id)
              const last = on && shownSections === 1
              return (
                <Toggle
                  key={s.id}
                  label={s.label}
                  checked={on}
                  disabled={last}
                  note={last ? 'At least one section stays on.' : undefined}
                  onChange={(next) => update({ hiddenSections: toggleIn(settings.hiddenSections, s.id, next) as typeof settings.hiddenSections })}
                />
              )
            })}
          </div>
        </Card>

        <Card id="ctl-sources" title="Newsrooms" intro="Switch a newsroom off to remove its headlines everywhere.">
          <div className="divide-y divide-line">
            {Object.values(PUBLISHERS).map((p) => (
              <Toggle
                key={p.id}
                label={p.name}
                checked={!settings.hiddenSources.includes(p.id)}
                onChange={(next) => update({ hiddenSources: toggleIn(settings.hiddenSources, p.id, next) })}
              />
            ))}
          </div>
        </Card>

        <Card id="ctl-crawl" title="Headline crawl" intro="The moving headlines on the floating bar.">
          <Toggle label="Show the crawl" checked={settings.crawlEnabled} onChange={(next) => update({ crawlEnabled: next })} />
          <fieldset className="mt-3" disabled={!settings.crawlEnabled}>
            <legend className="text-[15px] font-extrabold">Speed</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPEEDS.map(([value, name]) => (
                <label
                  key={value}
                  className={`inline-flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-bold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy ${
                    settings.crawlSpeed === value ? 'border-navy bg-navy text-white' : 'border-line text-ink hover:border-navy'
                  } ${settings.crawlEnabled ? '' : 'cursor-not-allowed opacity-50'}`}
                >
                  <input type="radio" name="crawl-speed" value={value} checked={settings.crawlSpeed === value} onChange={() => update({ crawlSpeed: value })} className="sr-only" />
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5">
            <label htmlFor="crawl-message" className="block text-[15px] font-extrabold">
              Notice <span className="font-semibold text-muted">(optional)</span>
            </label>
            <input
              id="crawl-message"
              value={settings.crawlMessage}
              onChange={(e) => update({ crawlMessage: e.target.value })}
              maxLength={LIMITS.messageMax}
              disabled={!settings.crawlEnabled}
              aria-describedby="crawl-message-help"
              autoComplete="off"
              className={`${field} mt-1.5 h-12 disabled:opacity-50`}
            />
            <p id="crawl-message-help" className="mt-1 text-[13px] text-muted">
              Your own line, shown first in the crawl. {settings.crawlMessage.length}/{LIMITS.messageMax}
            </p>
          </div>
        </Card>

        <Card id="ctl-refresh" title="Live updates" intro="How often the feeds are checked while 180news is open.">
          <label htmlFor="refresh-minutes" className="block text-[15px] font-extrabold">
            Check for new headlines
          </label>
          <select
            id="refresh-minutes"
            value={settings.refreshMinutes}
            onChange={(e) => update({ refreshMinutes: Number(e.target.value) })}
            className={`${field} mt-1.5 h-12 cursor-pointer`}
          >
            {REFRESH_CHOICES.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Only when I press refresh' : `Every ${m} minutes`}
              </option>
            ))}
          </select>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
            Each feed’s current state is on the{' '}
            <Link to="/about" className="font-bold text-navy underline">
              feed status page
            </Link>
            .
          </p>
        </Card>

        <Card id="ctl-contact" title="Contact details" intro="Shown in the footer and used for the email and call links.">
          <ContactForm />
        </Card>

        <Card id="ctl-backup" title="Backup and reset" intro="The backup file holds these settings, the adverts and each article’s text and main picture. Extra photos, video and audio stay on this device.">
          <Backup />
        </Card>

        <Card id="ctl-ads" title="Ad slots" intro="Two advertising positions, each marked “Advertisement”. Choose where each one sits on its page. A slot without an advert of its own carries the “Advertise with us” notice and your advertising number. Adverts are left off previews of unpublished articles." wide>
          <div className="grid gap-6 md:grid-cols-2">
            {AD_SLOTS.map((slot) => (
              <AdSlotEditor key={slot.id} id={slot.id} name={slot.name} where={slot.where} positions={slot.positions} />
            ))}
          </div>
        </Card>

        <Card id="ctl-articles" title="Articles" intro="Articles written in this browser. The six newest appear in the headline news on the front page. Make one the main headline, take it out of the headlines, publish a scheduled one early, hide it, edit it or delete it." wide>
          <Toggle
            label="List scheduled articles on the front page"
            note="A panel above the headlines shows what is coming up and when. Only this device sees it."
            checked={settings.showScheduled}
            onChange={(next) => update({ showScheduled: next })}
          />
          <div className="mt-3">
            <ArticleList admin />
          </div>
          <Link to="/submit" className="mt-5 inline-flex h-12 items-center gap-2 bg-brand px-5 text-[15px] font-extrabold text-white hover:bg-brand-strong">
            <PenLine size={17} strokeWidth={2.4} aria-hidden="true" /> Write an article
          </Link>
        </Card>
      </div>
    </div>
  )
}
