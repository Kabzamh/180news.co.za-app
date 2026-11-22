import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTitle } from '../lib/weather'
import { Toggle } from '../components/Toggle'
import { useControl, REFRESH_CHOICES } from '../lib/control'

const LABEL = 'block text-[15px] font-extrabold'
const FIELD = 'w-full border border-ink/35 bg-paper px-3.5 text-base text-ink'

function Shell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="wrap max-w-[620px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="flex items-center gap-3 text-[32px] font-black uppercase leading-none tracking-[-0.02em] md:text-[40px]">
          <Lock size={30} strokeWidth={2.4} className="shrink-0 text-brand" aria-hidden="true" />
          {title}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-body">{intro}</p>
      </header>
      <div className="mt-8">{children}</div>
    </div>
  )
}

export default function Admin() {
  useTitle('Admin')
  const { status, signIn, setUpOwner, signOut, user } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [setup, setSetup] = useState({ username: '', name: '', password: '', question: 'What is the name of the first school you attended?', answer: '' })

  if (status === 'signed-in') {
    return (
      <Shell title="Admin" intro={`Signed in as ${user?.name ?? user?.username} (${user?.role}). The newsroom tools live in the Control panel.`}>
        <ul className="divide-y divide-line border-y border-line">
          {[['Control panel', '/control'], ['Team & accounts', '/admin/team'], ['Adverts', '/admin/ads'], ['Scheduled', '/admin/scheduled'], ['Tags', '/admin/tags']].map(([label, to]) => (
            <li key={to} className="py-3">
              <Link to={to} className="font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy">
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={signOut}
          className="mt-6 inline-flex h-12 cursor-pointer items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Sign out
        </button>
      </Shell>
    )
  }

  if (status === 'setup') {
    return (
      <Shell title="Set up admin" intro="Create the owner account for this browser. It stays in this browser only — nobody else can sign in from here until you add team members.">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            const result = await setUpOwner(setup)
            setBusy(false)
            if (!result.ok) setError(result.error ?? 'Could not create the account.')
          }}
        >
          <div>
            <label htmlFor="su-name" className={LABEL}>Your name</label>
            <input id="su-name" value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label htmlFor="su-user" className={LABEL}>Username</label>
            <input id="su-user" value={setup.username} onChange={(e) => setSetup({ ...setup, username: e.target.value })} className={FIELD} autoComplete="username" />
          </div>
          <div>
            <label htmlFor="su-pass" className={LABEL}>Password</label>
            <input id="su-pass" type="password" value={setup.password} onChange={(e) => setSetup({ ...setup, password: e.target.value })} className={FIELD} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="su-q" className={LABEL}>Recovery question</label>
            <input id="su-q" value={setup.question} onChange={(e) => setSetup({ ...setup, question: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label htmlFor="su-a" className={LABEL}>Recovery answer</label>
            <input id="su-a" value={setup.answer} onChange={(e) => setSetup({ ...setup, answer: e.target.value })} className={FIELD} />
          </div>
          <button type="submit" disabled={busy} className="inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:opacity-70">
            {busy ? 'Creating…' : 'Create account'}
          </button>
          {error && <p className="text-[14px] font-bold text-brand">{error}</p>}
        </form>
      </Shell>
    )
  }

  return (
    <Shell title="Admin sign-in" intro="Enter the newsroom account details for this browser.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          const result = await signIn(username, password)
          setBusy(false)
          if (!result.ok) setError(result.error ?? 'Sign-in failed.')
        }}
      >
        <div>
          <label htmlFor="ad-user" className={LABEL}>Username</label>
          <input id="ad-user" value={username} onChange={(e) => setUsername(e.target.value)} className={FIELD} autoComplete="username" />
        </div>
        <div>
          <label htmlFor="ad-pass" className={LABEL}>Password</label>
          <input id="ad-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} autoComplete="current-password" />
        </div>
        <button type="submit" disabled={busy} className="inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:opacity-70">
          {busy ? 'Checking…' : 'Sign in'}
        </button>
        {error && <p className="text-[14px] font-bold text-brand">{error}</p>}
      </form>
    </Shell>
  )
}

export function Control() {
  useTitle('Control panel')
  const { settings, update, resetSettings } = useControl()
  return (
    <Shell title="Control panel" intro="Set how the front page behaves on this device: what appears, how fast it refreshes, and how the newsroom is contacted.">
      <div className="space-y-6">
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Sections on the app</h2>
          <div className="mt-2">
            {['elections', 'south-africa', 'politics', 'business', 'sport', 'world', 'africa', 'tech', 'life', 'opinion'].map((id) => (
              <Toggle
                key={id}
                label={id.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())}
                checked={!settings.hiddenSections.includes(id)}
                onChange={(on) => update({ hiddenSections: on ? settings.hiddenSections.filter((s) => s !== id) : [...settings.hiddenSections, id] })}
              />
            ))}
          </div>
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Headline crawl</h2>
          <Toggle label="Show the headline crawl" checked={settings.crawlEnabled} onChange={(on) => update({ crawlEnabled: on })} />
          <label className={`${LABEL} mt-3`}>Crawl speed</label>
          <select value={settings.crawlSpeed} onChange={(e) => update({ crawlSpeed: e.target.value as 'slow' | 'normal' | 'fast' })} className={FIELD}>
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
          <label className={`${LABEL} mt-4`} htmlFor="notice">Notice in the crawl</label>
          <input id="notice" value={settings.crawlMessage} maxLength={140} onChange={(e) => update({ crawlMessage: e.target.value })} className={FIELD} placeholder="e.g. 180news is in beta — tell us what you think" />
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Refresh</h2>
          <label className={`${LABEL} mt-3`} htmlFor="refresh">Re-check feeds every</label>
          <select id="refresh" value={settings.refreshMinutes} onChange={(e) => update({ refreshMinutes: Number(e.target.value) })} className={FIELD}>
            {REFRESH_CHOICES.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Only when I refresh' : `${m} minutes`}
              </option>
            ))}
          </select>
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Contact details</h2>
          {([
            ['email', 'Newsroom email'],
            ['phone', 'Newsroom phone'],
            ['adPhone', 'Advertising phone'],
          ] as const).map(([key, label]) => (
            <div key={key} className="mt-3">
              <label className={LABEL} htmlFor={`set-${key}`}>{label}</label>
              <input id={`set-${key}`} value={settings[key]} onChange={(e) => update({ [key]: e.target.value })} className={FIELD} />
            </div>
          ))}
        </section>
        <section className="border border-line bg-paper p-5">
          <Toggle label="Show adverts on the site" note="Switch off to take every advert off the site at once." checked={settings.adsOn} onChange={(on) => update({ adsOn: on })} />
        </section>
        <button
          type="button"
          onClick={resetSettings}
          className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Reset to defaults
        </button>
      </div>
    </Shell>
  )
}

export function AdminTeam() {
  useTitle('Admin — team')
  const { status, team: _team, addMember, removeMember } = useAuth() as never as { status: string; team?: unknown } & ReturnType<typeof useAuth>
  const [draft, setDraft] = useState({ username: '', name: '', password: '', role: 'reporter' as 'reporter' | 'editor' })
  const [error, setError] = useState('')
  if (status !== 'signed-in') return <Admin />
  return (
    <Shell title="Team & accounts" intro="Add editors or reporters. Accounts work only in the browser where they were created.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          const result = await addMember(draft)
          if (!result.ok) setError(result.error ?? 'Could not add the member.')
          else setDraft({ username: '', name: '', password: '', role: 'reporter' })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="tm-name">Name</label>
            <input id="tm-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="tm-user">Username</label>
            <input id="tm-user" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="tm-pass">Password</label>
            <input id="tm-pass" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="tm-role">Role</label>
            <select id="tm-role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as 'reporter' | 'editor' })} className={FIELD}>
              <option value="reporter">Reporter — can write</option>
              <option value="editor">Editor — can write and use tools</option>
            </select>
          </div>
        </div>
        <button type="submit" className="inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">
          Add member
        </button>
        {error && <p className="text-[14px] font-bold text-brand">{error}</p>}
      </form>
      <p className="mt-6 text-[14.5px] text-muted">Members are managed through the owner account in this browser. Removing the owner is not possible here.</p>
      <button
        type="button"
        onClick={() => removeMember(draft.username)}
        className="mt-4 inline-flex h-11 cursor-pointer items-center border-2 border-navy px-4 text-sm font-extrabold text-navy hover:bg-navy hover:text-white"
      >
        Remove the username above
      </button>
    </Shell>
  )
}

export function AdminAds() {
  useTitle('Admin — adverts')
  const { ads, saveAd, settings } = useControl()
  const placements: { id: 'home' | 'article' | 'header' | 'banner'; label: string; note: string }[] = [
    { id: 'home', label: 'Front page advert', note: 'One advert on the front page.' },
    { id: 'article', label: 'Story pages', note: 'One advert on every story.' },
    { id: 'header', label: 'Site header', note: 'Beside the logo on every page.' },
    { id: 'banner', label: 'Top banner', note: 'Above the navigation bar.' },
  ]
  return (
    <Shell title="Adverts" intro="Upload a picture for each slot, give it a link, and switch it on. Adverts are stored in this browser only.">
      <div className="space-y-6">
        {placements.map((placement) => {
          const ad = ads[placement.id]
          return (
            <section key={placement.id} className="border border-line bg-paper p-5">
              <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">{placement.label}</h2>
              <p className="mt-1 text-[14px] text-muted">{placement.note}</p>
              <Toggle label="Show this advert" checked={ad.enabled} onChange={(on) => saveAd(placement.id, { enabled: on })} />
              <label className={`${LABEL} mt-3`} htmlFor={`ad-${placement.id}`}>
                Picture
              </label>
              <input
                id={`ad-${placement.id}`}
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-[15px]"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const data = String(reader.result ?? '')
                    const img = new Image()
                    img.onload = () => saveAd(placement.id, { image: data, w: img.naturalWidth, h: img.naturalHeight })
                    img.src = data
                  }
                  reader.readAsDataURL(file)
                }}
              />
              {ad.image && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={ad.image} alt="" className="h-16 w-auto border border-line" />
                  <button type="button" onClick={() => saveAd(placement.id, { image: undefined, w: undefined, h: undefined })} className="text-sm font-bold text-brand hover:underline">
                    Remove picture
                  </button>
                </div>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor={`ad-name-${placement.id}`}>Advertiser name</label>
                  <input id={`ad-name-${placement.id}`} value={ad.name} onChange={(e) => saveAd(placement.id, { name: e.target.value })} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`ad-url-${placement.id}`}>Link (optional)</label>
                  <input id={`ad-url-${placement.id}`} value={ad.url} onChange={(e) => saveAd(placement.id, { url: e.target.value })} className={FIELD} placeholder="https://…" />
                </div>
              </div>
            </section>
          )
        })}
        <p className="text-[14.5px] text-muted">When a slot has no picture, readers see the “Your advert here” notice with the advertising number ({settings.adPhone}).</p>
      </div>
    </Shell>
  )
}

export function AdminScheduled() {
  useTitle('Admin — scheduled')
  const { articles, publishNow, removeArticle } = useControl()
  const scheduled = articles.filter((a) => (a.publishAt ?? 0) > Date.now()).sort((a, b) => (a.publishAt ?? 0) - (b.publishAt ?? 0))
  return (
    <Shell title="Scheduled" intro="Articles waiting for their moment. They appear on the front page when the clock catches up.">
      {scheduled.length === 0 ? (
        <p className="border border-dashed border-line bg-wash px-6 py-10 text-center text-[16px] text-body">
          Nothing is scheduled. To schedule an article, choose “Schedule for later” at the end of the article form.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {scheduled.map((article) => (
            <li key={article.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[17px] font-extrabold leading-[1.25]">{article.title}</p>
                <p className="mt-1 text-[13px] text-muted">Goes live {new Date(article.publishAt ?? 0).toLocaleString('en-ZA')}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button type="button" onClick={() => publishNow(article.id)} className="inline-flex h-11 cursor-pointer items-center rounded-full border-2 border-navy px-4 text-sm font-extrabold text-navy hover:bg-navy hover:text-white">
                  Publish now
                </button>
                <button type="button" onClick={() => removeArticle(article.id)} className="inline-flex h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-bold text-brand hover:border-brand">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

export function AdminTags() {
  useTitle('Admin — tags')
  const { articles, renameTag, deleteTag } = useControl()
  const tags = new Map<string, { name: string; count: number; mixed: boolean }>()
  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      const key = tag.toLowerCase()
      const entry = tags.get(key)
      if (entry) {
        entry.count += 1
        if (entry.name !== tag) entry.mixed = true
      } else {
        tags.set(key, { name: tag, count: 1, mixed: false })
      }
    }
  }
  const [renames, setRenames] = useState<Record<string, string>>({})
  return (
    <Shell title="Tags" intro="Tags link stories together. Fix a spelling once and every story carries the correction.">
      {tags.size === 0 ? (
        <p className="border border-dashed border-line bg-wash px-6 py-10 text-center text-[16px] text-body">
          No tags yet. Add tags to an article in the writing desk.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {[...tags.entries()].map(([key, tag]) => (
            <li key={key} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[16px] font-extrabold">
                  {tag.name} <span className="text-[13.5px] font-bold text-muted">· {tag.count} {tag.count === 1 ? 'story' : 'stories'}</span>
                  {tag.mixed && <span className="ml-2 rounded-full bg-[#fdf1d4] px-2.5 py-0.5 text-[12px] font-bold text-[#6b4a00]">Mixed capitalisation</span>}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    value={renames[key] ?? ''}
                    onChange={(e) => setRenames((r) => ({ ...r, [key]: e.target.value }))}
                    placeholder="New spelling"
                    className="h-11 w-40 border border-ink/35 bg-paper px-3 text-[15px]"
                    aria-label={`Rename ${tag.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      renameTag(key, (renames[key] ?? '').trim())
                      setRenames((r) => ({ ...r, [key]: '' }))
                    }}
                    className="inline-flex h-11 cursor-pointer items-center rounded-full border-2 border-navy px-4 text-sm font-extrabold text-navy hover:bg-navy hover:text-white"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTag(key)}
                    className="inline-flex h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-bold text-brand hover:border-brand"
                  >
                    Delete tag
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
