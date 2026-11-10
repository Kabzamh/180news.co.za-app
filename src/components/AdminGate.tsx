import { Eye, EyeOff, KeyRound, Lock, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { PASSWORD_MAX, PASSWORD_MIN, passwordProblem, useAuth } from '../lib/auth'
import type { SignInResult } from '../lib/auth'
import { useTitle } from '../lib/extras'

const field = 'h-12 w-full border border-ink/35 bg-paper px-3.5 text-base text-ink'
const label = 'block text-[15px] font-extrabold'
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

/** A username for password managers to file the password under; the app itself has no usernames. */
function ManagerHint() {
  return <input type="text" name="username" autoComplete="username" value="180news admin" readOnly hidden />
}

function ShowToggle({ shown, onChange }: { shown: boolean; onChange: (next: boolean) => void }) {
  const Icon = shown ? EyeOff : Eye
  return (
    <button type="button" aria-pressed={shown} onClick={() => onChange(!shown)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-navy hover:underline">
      <Icon size={16} strokeWidth={2.3} aria-hidden="true" />
      Show {shown ? 'dots instead' : 'what I type'}
    </button>
  )
}

/** Renders the admin tools when signed in, otherwise the sign-in (or first-time set-up) in their place. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'signed-in') return <>{children}</>
  return status === 'setup' ? <SetUp /> : <SignIn />
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
  const { createPassword, supported } = useAuth()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; again?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const next: typeof errors = {}
    const problem = passwordProblem(password)
    if (problem) next.password = problem
    else if (again !== password) next.again = 'The two passwords do not match.'
    setErrors(next)
    if (next.password || next.again) {
      document.getElementById(next.password ? 'admin-new-password' : 'admin-new-password-again')?.focus()
      return
    }
    setBusy(true)
    const result = await createPassword(password)
    setBusy(false)
    if (result.ok) focusMain()
    else setErrors({ form: result.error })
  }

  return (
    <Frame
      title="Set up admin sign-in"
      intro="Create a password for the admin tools on this device: the Admin page, Ads control, Scheduled posts, Categories and tags, and the Control panel."
    >
      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        <ManagerHint />
        <div>
          <label htmlFor="admin-new-password" className={label}>
            New password
          </label>
          <input
            id="admin-new-password"
            type={shown ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors({})
            }}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.password}
            aria-describedby="admin-new-password-help"
            className={`${field} mt-2`}
          />
          <p id="admin-new-password-help" className={errors.password ? errorText : 'mt-1 text-[13px] text-muted'}>
            {errors.password ?? `At least ${PASSWORD_MIN} characters.`}
          </p>
        </div>
        <div>
          <label htmlFor="admin-new-password-again" className={label}>
            Type it again
          </label>
          <input
            id="admin-new-password-again"
            type={shown ? 'text' : 'password'}
            value={again}
            onChange={(e) => {
              setAgain(e.target.value)
              setErrors({})
            }}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.again}
            aria-describedby={errors.again ? 'admin-new-password-again-error' : undefined}
            className={`${field} mt-2`}
          />
          {errors.again && (
            <p id="admin-new-password-again-error" className={errorText}>
              {errors.again}
            </p>
          )}
        </div>
        <ShowToggle shown={shown} onChange={setShown} />

        <p className="border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[14.5px] leading-relaxed text-[#5c4000]">
          Keep this password somewhere safe. It is stored on this device only and cannot be recovered. If it is forgotten, the sign-in can only be
          reset by erasing the articles, adverts and settings on this device.
        </p>

        {(errors.form || !supported) && (
          <p role="alert" className="border-l-4 border-brand bg-brand-tint p-4 text-[15px] font-bold text-brand">
            {errors.form ?? 'This browser cannot set up a sign-in. It needs a secure (https) connection.'}
          </p>
        )}

        <button type="submit" disabled={busy || !supported} className={primary}>
          <KeyRound size={17} strokeWidth={2.4} aria-hidden="true" />
          {busy ? 'Setting up…' : 'Create password and sign in'}
        </button>
      </form>
    </Frame>
  )
}

function SignIn() {
  const { signIn, resetEverything } = useAuth()
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [error, setError] = useState('')
  const [until, setUntil] = useState(0)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState<'closed' | 'open' | 'confirm' | 'erasing'>('closed')
  const wait = useCountdown(until)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || wait > 0) return
    if (!password) {
      setError('Enter the password.')
      document.getElementById('admin-password')?.focus()
      return
    }
    setBusy(true)
    const result: SignInResult = await signIn(password)
    setBusy(false)
    if (result.ok) return void focusMain()
    setError(result.error)
    setUntil(result.until ?? 0)
    setPassword('')
    document.getElementById('admin-password')?.focus()
  }

  const message = wait > 0 ? `Too many wrong passwords. Try again in ${wait} ${wait === 1 ? 'second' : 'seconds'}.` : until ? '' : error

  return (
    <Frame title="Admin sign-in" intro="Enter the admin password for this device to open the admin tools.">
      <form onSubmit={onSubmit} noValidate className="mt-7">
        <ManagerHint />
        <label htmlFor="admin-password" className={label}>
          Password
        </label>
        <input
          id="admin-password"
          type={shown ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (!until) setError('')
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
            Forgotten the password?
          </button>
        ) : (
          <section aria-labelledby="admin-forgot">
            <h2 id="admin-forgot" className="text-lg font-extrabold">
              Forgotten the password?
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-body">
              It cannot be recovered, because it is kept only on this device. You can reset the sign-in, but that permanently erases the articles
              (with their photos, video and audio), the adverts and the settings stored on this device. Saved stories are kept.
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

/** Small sign-out control for the top of admin pages. */
export function SignOutButton() {
  const { signOut } = useAuth()
  return (
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
  )
}

/** The sign-in section of the Admin page: what the lock covers, and changing the password. */
export function AdminAccount() {
  const { changePassword } = useAuth()
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
    if (!current) found.current = 'Enter the current password.'
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
        Sign-in
      </h2>
      <div className="mt-3 border border-line bg-wash p-4 sm:p-5">
        <p className="max-w-[70ch] text-[15px] leading-relaxed text-body">
          You are signed in until you sign out or close this tab. The password locks the admin tools on this device only. It is a lock for
          everyday use rather than strong security, and it cannot be recovered if forgotten.
        </p>

        {open ? (
          <form onSubmit={onSubmit} noValidate className="mt-4 max-w-md space-y-4">
            <ManagerHint />
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
    </section>
  )
}
