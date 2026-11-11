import { Eye, EyeOff, KeyRound, Lock, LogOut, PenLine, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { PASSWORD_MAX, PASSWORD_MIN, ROLE_LABEL, areaForPath, canOpen, cleanUsername, nameProblem, passwordProblem, useAuth, usernameProblem } from '../lib/auth'
import type { Area } from '../lib/auth'
import { useTitle } from '../lib/extras'

const field = 'h-12 w-full border border-ink/35 bg-paper px-3.5 text-base text-ink'
const label = 'block text-[15px] font-extrabold'
const hint = 'mt-1 text-[13px] leading-snug text-muted'
const errorText = 'mt-1.5 text-[13.5px] font-bold text-brand'
const primary = 'inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70'
const outline =
  'inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white'

/** After the page swaps between sign-in and admin tools, put keyboard focus at the top of the new content. */
const focusMain = () => window.setTimeout(() => document.getElementById('main')?.focus(), 0)

/** Seconds left of a pause after too many wrong passwords, counting down; 0 when sign-in is open. */
function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

export function ShowToggle({ shown, onChange }: { shown: boolean; onChange: (next: boolean) => void }) {
  const Icon = shown ? EyeOff : Eye
  return (
    <button type="button" aria-pressed={shown} onClick={() => onChange(!shown)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-navy hover:underline">
      <Icon size={16} strokeWidth={2.3} aria-hidden="true" />
      Show {shown ? 'dots instead' : 'what I type'}
    </button>
  )
}

/**
 * Renders its children for a signed-in account that may open this area;
 * otherwise a no-access notice, or the sign-in (or first-time set-up), which is shown on the Admin page only.
 * `write` and `account` are for any account, `tools` for editors and the owner, `team` for the owner.
 */
export function AdminGate({ area = 'tools', children }: { area?: Area; children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()
  const onAdminPage = location.pathname === '/admin'

  if (status !== 'signed-in' || !user) {
    // Sign-in and first-time set-up are on the Admin page only. Every other protected page sends
    // people there, remembering where they were going.
    if (!onAdminPage) return <Navigate to="/admin" replace state={{ next: `${location.pathname}${location.search}${location.hash}` }} />
    return status === 'setup' ? <SetUp /> : <SignIn />
  }

  // Just signed in on the way to another page: carry on to it, if this account may open it.
  const next = onAdminPage ? (location.state as { next?: unknown } | null)?.next : null
  if (typeof next === 'string') {
    const target = areaForPath(next)
    if (target && target !== 'account' && canOpen(user.role, target)) return <Navigate to={next} replace />
  }
  return canOpen(user.role, area) ? <>{children}</> : <NoAccess area={area} />
}

function Frame({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  useTitle(title)
  return (
    <div className="wrap max-w-[620px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="flex items-center gap-3 text-[32px] font-black uppercase leading-none tracking-[-0.02em] md:text-[40px]">
          <Lock size={30} strokeWidth={2.4} className="shrink-0 text-brand" aria-hidden="true" />
          {title}
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-body">{intro}</p>
      </header>
      {children}
    </div>
  )
}

function SetUp() {
  const { createOwner, supported } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; username?: string; password?: string; again?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const next: typeof errors = {}
    if (nameProblem(name)) next.name = 'Enter your name.'
    if (usernameProblem(username)) next.username = usernameProblem(username)
    if (passwordProblem(password)) next.password = passwordProblem(password)
    else if (again !== password) next.again = 'The two passwords do not match.'
    setErrors(next)
    const firstBad = (['name', 'username', 'password', 'again'] as const).find((key) => next[key])
    if (firstBad) return void document.getElementById(`admin-owner-${firstBad}`)?.focus()
    setBusy(true)
    const result = await createOwner(name, username, password)
    setBusy(false)
    if (result.ok) focusMain()
    else setErrors({ form: result.error })
  }

  const clear = (key: keyof typeof errors) => setErrors((prev) => (prev[key] || prev.form ? { ...prev, [key]: undefined, form: undefined } : prev))

  return (
    <Frame
      title="Enable admin sign-in"
      intro="Admin sign-in is not enabled on this device yet. Create the owner account to enable it. The owner then signs in to write articles and use the admin tools, and adds and removes the rest of the team."
    >
      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        <div>
          <label htmlFor="admin-owner-name" className={label}>
            Your name
          </label>
          <input
            id="admin-owner-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clear('name')
            }}
            maxLength={60}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'admin-owner-name-error' : undefined}
            className={`${field} mt-2`}
          />
          {errors.name && (
            <p id="admin-owner-name-error" className={errorText}>
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="admin-owner-username" className={label}>
            Username
          </label>
          <input
            id="admin-owner-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              clear('username')
            }}
            maxLength={30}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.username}
            aria-describedby="admin-owner-username-help"
            className={`${field} mt-2`}
          />
          <p id="admin-owner-username-help" className={errors.username ? errorText : hint}>
            {errors.username ?? 'What you sign in with, for example thandi. Letters and numbers, at least 3.'}
          </p>
        </div>
        <div>
          <label htmlFor="admin-owner-password" className={label}>
            New password
          </label>
          <input
            id="admin-owner-password"
            type={shown ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clear('password')
            }}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.password}
            aria-describedby="admin-owner-password-help"
            className={`${field} mt-2`}
          />
          <p id="admin-owner-password-help" className={errors.password ? errorText : hint}>
            {errors.password ?? `At least ${PASSWORD_MIN} characters.`}
          </p>
        </div>
        <div>
          <label htmlFor="admin-owner-again" className={label}>
            Type the password again
          </label>
          <input
            id="admin-owner-again"
            type={shown ? 'text' : 'password'}
            value={again}
            onChange={(e) => {
              setAgain(e.target.value)
              clear('again')
            }}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.again}
            aria-describedby={errors.again ? 'admin-owner-again-error' : undefined}
            className={`${field} mt-2`}
          />
          {errors.again && (
            <p id="admin-owner-again-error" className={errorText}>
              {errors.again}
            </p>
          )}
        </div>
        <ShowToggle shown={shown} onChange={setShown} />

        <p className="border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[14.5px] leading-relaxed text-[#5c4000]">
          Accounts are stored in this browser, like the articles, adverts and settings, so they work on this device only. Keep the owner password
          somewhere safe: it cannot be recovered. If it is forgotten, the sign-in can only be reset by erasing everything stored on this device.
        </p>

        {(errors.form || !supported) && (
          <p role="alert" className="border-l-4 border-brand bg-brand-tint p-4 text-[15px] font-bold text-brand">
            {errors.form ?? 'This browser cannot set up a sign-in. It needs a secure (https) connection.'}
          </p>
        )}

        <button type="submit" disabled={busy || !supported} className={primary}>
          <KeyRound size={17} strokeWidth={2.4} aria-hidden="true" />
          {busy ? 'Enabling…' : 'Enable sign-in and create owner account'}
        </button>
      </form>
    </Frame>
  )
}

function SignIn() {
  const { signIn, resetEverything, team } = useAuth()
  // A device that had the single admin password keeps it: it now belongs to the username "admin".
  const carried = team.length === 1 && team[0].legacy ? team[0] : null
  const [username, setUsername] = useState(carried?.username ?? '')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [until, setUntil] = useState(0)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState<'closed' | 'open' | 'confirm' | 'erasing'>('closed')
  const wait = useCountdown(until)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || wait > 0) return
    const next: typeof errors = {}
    if (!cleanUsername(username)) next.username = 'Enter your username.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (next.username || next.password) return void document.getElementById(next.username ? 'admin-username' : 'admin-password')?.focus()
    setBusy(true)
    const result = await signIn(username, password)
    setBusy(false)
    if (result.ok) return void focusMain()
    setErrors({ password: result.error })
    setUntil(result.until ?? 0)
    setPassword('')
    document.getElementById('admin-password')?.focus()
  }

  const message = wait > 0 ? `Too many wrong passwords. Try again in ${wait} ${wait === 1 ? 'second' : 'seconds'}.` : until ? '' : errors.password

  return (
    <Frame title="Admin sign-in" intro="Sign in with your 180news account to write articles and use the admin tools.">
      <form onSubmit={onSubmit} noValidate className="mt-7">
        {carried && (
          <p className="mb-5 border-l-4 border-navy bg-navy-tint px-4 py-3 text-[14.5px] leading-relaxed text-body">
            The admin password already set on this device still works. It now belongs to the username <span className="font-bold text-ink">admin</span>.
          </p>
        )}
        <label htmlFor="admin-username" className={label}>
          Username
        </label>
        <input
          id="admin-username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setErrors((prev) => ({ ...prev, username: undefined }))
          }}
          maxLength={30}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'admin-username-error' : undefined}
          className={`${field} mt-2`}
        />
        {errors.username && (
          <p id="admin-username-error" className={errorText}>
            {errors.username}
          </p>
        )}

        <label htmlFor="admin-password" className={`${label} mt-5`}>
          Password
        </label>
        <input
          id="admin-password"
          type={shown ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (!until) setErrors((prev) => ({ ...prev, password: undefined }))
          }}
          maxLength={PASSWORD_MAX}
          autoComplete="current-password"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!message}
          aria-describedby="admin-password-status"
          className={`${field} mt-2`}
        />
        <p id="admin-password-status" role="status" className={`${errorText} min-h-5`}>
          {message}
        </p>
        <ShowToggle shown={shown} onChange={setShown} />
        <div className="mt-4">
          <button type="submit" disabled={busy || wait > 0} className={`${primary} disabled:cursor-not-allowed`}>
            <KeyRound size={17} strokeWidth={2.4} aria-hidden="true" />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>

      <div className="mt-10 border-t border-line pt-5">
        {forgot === 'closed' ? (
          <button type="button" onClick={() => setForgot('open')} className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-navy underline underline-offset-[3px]">
            Forgotten your password?
          </button>
        ) : (
          <section aria-labelledby="admin-forgot">
            <h2 id="admin-forgot" className="text-lg font-extrabold">
              Forgotten your password?
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-body">
              <span className="font-bold text-ink">Team members:</span> ask the owner to set a new password for you on the Team page.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-body">
              <span className="font-bold text-ink">The owner:</span> your password cannot be recovered, because accounts are kept only on this device. You can
              reset the sign-in, but that permanently erases every account, and the articles (with their photos, video and audio), adverts and settings
              stored on this device. Saved stories are kept.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {forgot === 'open' ? (
                <button type="button" onClick={() => setForgot('confirm')} className={outline}>
                  Erase and reset the sign-in…
                </button>
              ) : (
                <button
                  type="button"
                  disabled={forgot === 'erasing'}
                  onClick={() => {
                    setForgot('erasing')
                    void resetEverything()
                  }}
                  className="inline-flex h-11 cursor-pointer items-center bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70"
                >
                  {forgot === 'erasing' ? 'Erasing…' : 'Yes, erase everything and reset'}
                </button>
              )}
              <button type="button" onClick={() => setForgot('closed')} disabled={forgot === 'erasing'} className={outline}>
                Cancel
              </button>
            </div>
          </section>
        )}
      </div>
    </Frame>
  )
}

/** Signed in, but this account's role does not cover the page. */
function NoAccess({ area }: { area: Area }) {
  const { user } = useAuth()
  return (
    <Frame
      title="No access to this page"
      intro={area === 'team' ? 'Only the owner can add and remove team members.' : 'This part of Admin is for editors and the owner.'}
    >
      <p className="mt-5 text-[16px] leading-relaxed text-body">
        You are signed in as <span className="font-bold text-ink">{user?.name}</span> ({user ? ROLE_LABEL[user.role] : ''}).{' '}
        {user?.role === 'writer' ? 'Your account can write articles.' : 'Ask the owner if you need this changed.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link to="/submit" className={primary}>
          <PenLine size={17} strokeWidth={2.4} aria-hidden="true" /> Write an article
        </Link>
        <Link to="/admin" className={outline}>
          Your account
        </Link>
      </div>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </Frame>
  )
}

/** Who is signed in, with a sign-out control, for the top of admin pages. */
export function SignOutButton() {
  const { signOut, user } = useAuth()
  return (
    <div className="flex min-w-0 items-center gap-3">
      {user && (
        <p className="hidden min-w-0 truncate text-sm min-[440px]:block">
          <span className="font-bold">{user.name}</span> <span className="text-muted">· {ROLE_LABEL[user.role]}</span>
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          signOut()
          focusMain()
        }}
        className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 border border-ink/35 px-4 text-sm font-bold text-ink transition-colors hover:border-brand hover:text-brand"
      >
        <LogOut size={16} strokeWidth={2.3} aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}

/** The account section of the Admin page: who is signed in, changing the password and, for the owner, the team. */
export function AdminAccount() {
  const { changePassword, user, team } = useAuth()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<{ current?: string; next?: string; again?: string }>({})
  const [until, setUntil] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const wait = useCountdown(until)
  if (!user) return null
  const owner = user.role === 'owner'
  const members = team.filter((m) => m.role !== 'owner')

  const close = (note: string) => {
    setOpen(false)
    setCurrent('')
    setNext('')
    setAgain('')
    setErrors({})
    setUntil(0)
    setDone(note)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || wait > 0) return
    const found: typeof errors = {}
    if (!current) found.current = 'Enter your current password.'
    const problem = passwordProblem(next)
    if (problem) found.next = problem
    else if (next === current) found.next = 'Choose a password different from the current one.'
    else if (again !== next) found.again = 'The two new passwords do not match.'
    setErrors(found)
    const firstBad = (['current', 'next', 'again'] as const).find((key) => found[key])
    if (firstBad) return void document.getElementById(`admin-change-${firstBad}`)?.focus()

    setBusy(true)
    const result = await changePassword(current, next)
    setBusy(false)
    if (result.ok) return close('Password changed.')
    setErrors({ current: result.error })
    setUntil(result.until ?? 0)
    setCurrent('')
    document.getElementById('admin-change-current')?.focus()
  }

  const currentError = wait > 0 ? `Too many wrong passwords. Try again in ${wait} ${wait === 1 ? 'second' : 'seconds'}.` : until ? '' : errors.current
  const rows = [
    { key: 'current' as const, text: 'Current password', value: current, set: setCurrent, auto: 'current-password', error: currentError },
    { key: 'next' as const, text: `New password (at least ${PASSWORD_MIN} characters)`, value: next, set: setNext, auto: 'new-password', error: errors.next },
    { key: 'again' as const, text: 'Type the new password again', value: again, set: setAgain, auto: 'new-password', error: errors.again },
  ]

  return (
    <section aria-labelledby="admin-account" className="mt-9">
      <h2 id="admin-account" className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.06em] text-navy">
        <Lock size={16} strokeWidth={2.4} aria-hidden="true" />
        {owner ? 'Team and sign-in' : 'Sign-in'}
      </h2>
      <div className={`mt-3 grid gap-5 ${owner ? 'lg:grid-cols-2' : ''}`}>
        <div className="border border-line bg-wash p-4 sm:p-5">
          <h3 className="text-[17px] font-extrabold">Your account</h3>
          <p className="mt-1 max-w-[70ch] text-[15px] leading-relaxed text-body">
            Signed in as <span className="font-bold text-ink">{user.name}</span> (username {user.username}, {ROLE_LABEL[user.role].toLowerCase()}). You stay
            signed in until you sign out or close this tab.
          </p>

          {open ? (
            <form onSubmit={onSubmit} noValidate className="mt-4 max-w-md space-y-4">
              <input type="text" name="username" autoComplete="username" value={user.username} readOnly hidden />
              {rows.map((row) => (
                <div key={row.key}>
                  <label htmlFor={`admin-change-${row.key}`} className="block text-[14.5px] font-extrabold">
                    {row.text}
                  </label>
                  <input
                    id={`admin-change-${row.key}`}
                    type={shown ? 'text' : 'password'}
                    value={row.value}
                    onChange={(e) => {
                      row.set(e.target.value)
                      if (!until) setErrors((prev) => ({ ...prev, [row.key]: undefined }))
                    }}
                    maxLength={PASSWORD_MAX}
                    autoComplete={row.auto}
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={!!row.error}
                    aria-describedby={row.error ? `admin-change-${row.key}-error` : undefined}
                    className={`${field} mt-1.5`}
                  />
                  {row.error && (
                    <p id={`admin-change-${row.key}-error`} role={row.key === 'current' ? 'status' : undefined} className={errorText}>
                      {row.error}
                    </p>
                  )}
                </div>
              ))}
              <ShowToggle shown={shown} onChange={setShown} />
              <div className="flex flex-wrap gap-2.5">
                <button type="submit" disabled={busy || wait > 0} className="inline-flex h-11 cursor-pointer items-center bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-70">
                  {busy ? 'Saving…' : 'Save new password'}
                </button>
                <button type="button" onClick={() => close('')} className={outline}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(true)
                  setDone('')
                }}
                className={outline}
              >
                <KeyRound size={16} strokeWidth={2.4} aria-hidden="true" /> Change password
              </button>
              <p role="status" className="text-[14px] font-bold text-navy">
                {done}
              </p>
            </div>
          )}
        </div>

        {owner && (
          <div className="border border-line bg-wash p-4 sm:p-5">
            <h3 className="text-[17px] font-extrabold">Team</h3>
            <p className="mt-1 max-w-[70ch] text-[15px] leading-relaxed text-body">
              {members.length === 0
                ? 'Nobody else has an account yet. Add writers and editors, each with their own username and password.'
                : `${members.length} team ${members.length === 1 ? 'member has an account' : 'members have accounts'}: ${members
                    .slice(0, 6)
                    .map((m) => `${m.name} (${ROLE_LABEL[m.role].toLowerCase()})`)
                    .join(', ')}${members.length > 6 ? ` and ${members.length - 6} more` : ''}.`}
            </p>
            <Link to="/admin/team" className={`${outline} mt-4`}>
              <Users size={16} strokeWidth={2.4} aria-hidden="true" /> {members.length === 0 ? 'Add team members' : 'Manage team'}
            </Link>
          </div>
        )}
      </div>
      <p className="mt-3 max-w-[90ch] text-[13.5px] leading-relaxed text-muted">
        Accounts are stored in this browser, like the articles, adverts and settings, so they work on this device only. They are a lock for everyday use
        rather than strong security, and a forgotten password cannot be recovered, only reset.
      </p>
    </section>
  )
}
