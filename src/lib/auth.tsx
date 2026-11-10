import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { eraseDeviceData } from './control'

/**
 * Sign-in for the admin tools.
 *
 * 180news has no server-side accounts: everything the admin tools change is
 * stored in the browser, so the lock lives there too. A password is created
 * on the device, kept only as a salted PBKDF2 hash, and checked on the device.
 * It keeps other people who use this browser out of the admin tools. It is not
 * a shared account, and it cannot be recovered – only reset, by erasing what
 * the admin tools have stored here.
 */

const CRED_KEY = '180news:admin:v1'
const SESSION_KEY = '180news:admin-session'
const TRIES_KEY = '180news:admin-tries'
const ITERATIONS = 150_000
const FREE_TRIES = 5

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

interface Credential {
  salt: string
  hash: string
  iterations: number
}

interface Tries {
  count: number
  /** Epoch milliseconds until which sign-in is paused. */
  until: number
}

export type SignInResult = { ok: true } | { ok: false; error: string; until?: number }

const BASE64 = /^[A-Za-z0-9+/=]{16,88}$/
const STORAGE_BLOCKED = 'This browser would not store the password. Private browsing windows often block this.'
const UNSUPPORTED = 'This browser cannot set up a sign-in. It needs a secure (https) connection.'

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256)
  return toBase64(new Uint8Array(bits))
}

function readCredential(): Credential | null {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    const r = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
    if (!r || typeof r.salt !== 'string' || typeof r.hash !== 'string' || typeof r.iterations !== 'number') return null
    if (!BASE64.test(r.salt) || !BASE64.test(r.hash) || r.iterations < 10_000 || r.iterations > 5_000_000) return null
    return { salt: r.salt, hash: r.hash, iterations: r.iterations }
  } catch {
    return null
  }
}

function readTries(): Tries {
  try {
    const r = JSON.parse(localStorage.getItem(TRIES_KEY) ?? 'null') as Partial<Tries> | null
    if (r && typeof r.count === 'number' && typeof r.until === 'number') return { count: r.count, until: r.until }
  } catch {
    /* treated as no failed attempts */
  }
  return { count: 0, until: 0 }
}

function readSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* the sign-in then lasts until the page is reloaded */
  }
}

interface AuthValue {
  /** 'setup' until a password has been created on this device. */
  status: 'setup' | 'signed-out' | 'signed-in'
  /** False where the browser cannot hash a password (no secure connection). */
  supported: boolean
  createPassword: (password: string) => Promise<SignInResult>
  signIn: (password: string) => Promise<SignInResult>
  changePassword: (current: string, next: string) => Promise<SignInResult>
  signOut: () => void
  /** Forget the password and erase what the admin tools have stored on this device, then reload. */
  resetEverything: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credential, setCredential] = useState<Credential | null>(readCredential)
  const [session, setSession] = useState<string | null>(readSession)
  const supported = typeof crypto !== 'undefined' && !!crypto.subtle

  // A password changed or reset in another tab applies here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CRED_KEY || e.key === null) setCredential(readCredential())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const store = useCallback(async (password: string): Promise<SignInResult> => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const next: Credential = { salt: toBase64(salt), hash: await derive(password, salt, ITERATIONS), iterations: ITERATIONS }
    try {
      localStorage.setItem(CRED_KEY, JSON.stringify(next))
      localStorage.removeItem(TRIES_KEY)
    } catch {
      return { ok: false, error: STORAGE_BLOCKED }
    }
    writeSession(next.hash)
    setCredential(next)
    setSession(next.hash)
    return { ok: true }
  }, [])

  /** Check a password against the stored one, pausing sign-in after repeated wrong guesses. */
  const verify = useCallback(async (password: string): Promise<SignInResult & { hash?: string }> => {
    const current = readCredential()
    if (!current) return { ok: false, error: 'No password has been set up on this device.' }
    const tries = readTries()
    if (tries.until > Date.now()) return { ok: false, error: 'Too many wrong passwords.', until: tries.until }

    const hash = await derive(password, fromBase64(current.salt), current.iterations)
    if (hash === current.hash) {
      try {
        localStorage.removeItem(TRIES_KEY)
      } catch {
        /* nothing to clear */
      }
      return { ok: true, hash }
    }

    const count = tries.count + 1
    const until = count >= FREE_TRIES ? Date.now() + Math.min(300, 30 * 2 ** (count - FREE_TRIES)) * 1000 : 0
    try {
      localStorage.setItem(TRIES_KEY, JSON.stringify({ count, until }))
    } catch {
      /* the pause simply does not survive a reload */
    }
    if (until) return { ok: false, error: 'Too many wrong passwords.', until }
    const left = FREE_TRIES - count
    return { ok: false, error: `That password is not right. ${left} more ${left === 1 ? 'try' : 'tries'} before a short wait.` }
  }, [])

  const createPassword = useCallback(
    async (password: string): Promise<SignInResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      // Never replace an existing password from the set-up form.
      if (readCredential()) {
        setCredential(readCredential())
        return { ok: false, error: 'A password has already been set up on this device. Sign in with it.' }
      }
      return store(password)
    },
    [supported, store],
  )

  const signIn = useCallback(
    async (password: string): Promise<SignInResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      const result = await verify(password)
      if (!result.ok || !result.hash) return result
      writeSession(result.hash)
      setCredential(readCredential())
      setSession(result.hash)
      return { ok: true }
    },
    [supported, verify],
  )

  const changePassword = useCallback(
    async (current: string, next: string): Promise<SignInResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      const result = await verify(current)
      if (!result.ok) return result
      return store(next)
    },
    [supported, verify, store],
  )

  const signOut = useCallback(() => {
    writeSession(null)
    setSession(null)
  }, [])

  const resetEverything = useCallback(async () => {
    await eraseDeviceData()
    try {
      localStorage.removeItem(CRED_KEY)
      localStorage.removeItem(TRIES_KEY)
    } catch {
      /* nothing more can be removed */
    }
    writeSession(null)
    // Start again from a clean page so nothing erased is still held in memory.
    window.location.assign('/admin')
  }, [])

  const status: AuthValue['status'] = !credential ? 'setup' : session === credential.hash ? 'signed-in' : 'signed-out'

  const value = useMemo<AuthValue>(
    () => ({ status, supported, createPassword, signIn, changePassword, signOut, resetEverything }),
    [status, supported, createPassword, signIn, changePassword, signOut, resetEverything],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Problems with a new password, or '' when it can be used. */
export function passwordProblem(password: string): string {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (password.length > PASSWORD_MAX) return `Use no more than ${PASSWORD_MAX} characters.`
  if (!password.trim()) return 'Use more than spaces.'
  return ''
}
