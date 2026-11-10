import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { eraseDeviceData } from './control'

/**
 * Sign-in and team accounts for the admin tools.
 *
 * 180news has no server-side database: articles, adverts and settings are all
 * kept in the browser, so the accounts that guard them are kept there too.
 * The owner creates accounts for the team on this device; each has its own
 * username and password, stored only as a salted PBKDF2 hash. The accounts
 * work in this browser only. They keep other people who use this browser out
 * of the admin tools; they are not a shared, cross-device login, and a
 * password cannot be recovered, only reset.
 */

export type Role = 'owner' | 'editor' | 'writer'
export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', editor: 'Editor', writer: 'Writer' }
export const ROLE_CAN: Record<Role, string> = {
  owner: 'Everything, including the team',
  editor: 'Writes articles and uses the admin tools',
  writer: 'Writes articles',
}

/** What a part of the app requires: any account (writing, or the account page), the admin tools (editor or owner), or the owner. */
export type Area = 'write' | 'account' | 'tools' | 'team'
export const canOpen = (role: Role, area: Area) => (area === 'tools' ? role !== 'writer' : area === 'team' ? role === 'owner' : true)

/** The area a protected page belongs to, or null for a page anyone can open. */
export function areaForPath(path: string): Area | null {
  const p = path.split(/[?#]/)[0]
  if (p === '/admin') return 'account'
  if (p === '/submit') return 'write'
  if (p === '/admin/team') return 'team'
  if (p === '/control' || p.startsWith('/admin/')) return 'tools'
  return null
}

export interface TeamMember {
  id: string
  name: string
  username: string
  role: Role
  createdAt: number
  /** Carried over from the single admin password this device had before accounts. */
  legacy?: boolean
}

interface StoredUser extends TeamMember {
  salt: string
  hash: string
  iterations: number
}

interface Tries {
  count: number
  /** Epoch milliseconds until which sign-in is paused. */
  until: number
}

export type AuthResult = { ok: true } | { ok: false; error: string; field?: 'name' | 'username' | 'password'; until?: number }

const TEAM_KEY = '180news:team:v1'
const LEGACY_KEY = '180news:admin:v1'
const SESSION_KEY = '180news:admin-session'
const TRIES_KEY = '180news:admin-tries'
const ITERATIONS = 150_000
const FREE_TRIES = 5

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
export const TEAM_MAX = 25

const BASE64 = /^[A-Za-z0-9+/=]{16,88}$/
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/
const STORAGE_BLOCKED = 'This browser would not store the account. Private browsing windows often block this, or its storage is full.'
const UNSUPPORTED = 'This browser cannot set up a sign-in. It needs a secure (https) connection.'
const WRONG = 'That username and password do not match an account on this device.'

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256)
  return toBase64(new Uint8Array(bits))
}

async function hashNew(password: string): Promise<{ salt: string; hash: string; iterations: number }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: toBase64(salt), hash: await derive(password, salt, ITERATIONS), iterations: ITERATIONS }
}

export const cleanUsername = (value: string) => value.trim().toLowerCase()

/** Problems with a new password, name or username, or '' when it can be used. */
export function passwordProblem(password: string): string {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (password.length > PASSWORD_MAX) return `Use no more than ${PASSWORD_MAX} characters.`
  if (!password.trim()) return 'Use more than spaces.'
  return ''
}
export function nameProblem(name: string): string {
  const n = name.trim()
  if (n.length < 2) return 'Enter the person’s name.'
  if (n.length > 60) return 'Keep the name to 60 characters.'
  return ''
}
export function usernameProblem(username: string): string {
  const u = cleanUsername(username)
  if (u.length < 3) return 'Use at least 3 characters.'
  if (!USERNAME.test(u)) return 'Use 3 to 30 letters and numbers. Dots, dashes and underscores are allowed after the first character.'
  return ''
}

function isStoredUser(value: unknown): value is StoredUser {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.username === 'string' &&
    USERNAME.test(r.username) &&
    (r.role === 'owner' || r.role === 'editor' || r.role === 'writer') &&
    typeof r.createdAt === 'number' &&
    typeof r.salt === 'string' &&
    BASE64.test(r.salt) &&
    typeof r.hash === 'string' &&
    BASE64.test(r.hash) &&
    typeof r.iterations === 'number' &&
    r.iterations >= 10_000 &&
    r.iterations <= 5_000_000
  )
}

/** The accounts on this device. A single admin password from before accounts becomes the owner, "admin". */
function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(TEAM_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { users?: unknown }
      const seen = new Set<string>()
      const users = (Array.isArray(data.users) ? data.users : []).filter(isStoredUser).filter((u) => (seen.has(u.username) ? false : (seen.add(u.username), true)))
      // Exactly one owner, always: without one nobody could manage the team.
      const owner = users.find((u) => u.role === 'owner')
      return owner ? [owner, ...users.filter((u) => u !== owner).map((u) => (u.role === 'owner' ? { ...u, role: 'editor' as const } : u))] : []
    }
    const old = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null') as Record<string, unknown> | null
    const carried = { id: 'u-owner', name: 'Admin', username: 'admin', role: 'owner', createdAt: Date.now(), legacy: true, ...old }
    if (old && isStoredUser(carried)) {
      localStorage.setItem(TEAM_KEY, JSON.stringify({ users: [carried] }))
      localStorage.removeItem(LEGACY_KEY)
      return [carried]
    }
  } catch {
    /* unreadable storage is treated as no accounts */
  }
  return []
}

function writeUsers(users: StoredUser[]): boolean {
  try {
    localStorage.setItem(TEAM_KEY, JSON.stringify({ users }))
    return true
  } catch {
    return false
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

interface Session {
  id: string
  token: string
}

function readSession(): Session | null {
  try {
    const r = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null
    return r && typeof r.id === 'string' && typeof r.token === 'string' ? { id: r.id, token: r.token } : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* the sign-in then lasts until the page is reloaded */
  }
}

const publicView = ({ id, name, username, role, createdAt, legacy }: StoredUser): TeamMember => ({ id, name, username, role, createdAt, ...(legacy ? { legacy } : {}) })
const newId = () => `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export interface NewMember {
  name: string
  username: string
  role: Exclude<Role, 'owner'>
  password: string
}

interface AuthValue {
  /** 'setup' until an owner account has been created on this device. */
  status: 'setup' | 'signed-out' | 'signed-in'
  /** False where the browser cannot hash a password (no secure connection). */
  supported: boolean
  /** The signed-in account. */
  user: TeamMember | null
  /** Every account on this device, owner first. */
  team: TeamMember[]
  createOwner: (name: string, username: string, password: string) => Promise<AuthResult>
  signIn: (username: string, password: string) => Promise<AuthResult>
  /** Change the signed-in account's own password. */
  changePassword: (current: string, next: string) => Promise<AuthResult>
  /** Owner only. */
  addMember: (member: NewMember) => Promise<AuthResult>
  removeMember: (id: string) => AuthResult
  resetMemberPassword: (id: string, password: string) => Promise<AuthResult>
  signOut: () => void
  /** Forget every account and erase what the admin tools have stored on this device, then reload. */
  resetEverything: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(readUsers)
  const [session, setSession] = useState<Session | null>(readSession)
  const supported = typeof crypto !== 'undefined' && !!crypto.subtle

  // Accounts added, removed or changed in another tab apply here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TEAM_KEY || e.key === LEGACY_KEY || e.key === null) setUsers(readUsers())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const current = useMemo(() => users.find((u) => u.id === session?.id && u.hash === session.token) ?? null, [users, session])

  const save = useCallback((next: StoredUser[]): boolean => {
    if (!writeUsers(next)) return false
    setUsers(next)
    return true
  }, [])

  /** Check a username and password against this device's accounts, pausing sign-in after repeated wrong guesses. */
  const verify = useCallback(async (username: string, password: string): Promise<AuthResult & { account?: StoredUser }> => {
    const tries = readTries()
    if (tries.until > Date.now()) return { ok: false, error: 'Too many wrong passwords.', until: tries.until }

    const account = readUsers().find((u) => u.username === cleanUsername(username))
    // An unknown username takes as long to refuse as a wrong password, and reads the same.
    const hash = await derive(password, account ? fromBase64(account.salt) : new Uint8Array(16), account?.iterations ?? ITERATIONS)
    if (account && hash === account.hash) {
      try {
        localStorage.removeItem(TRIES_KEY)
      } catch {
        /* nothing to clear */
      }
      return { ok: true, account }
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
    return { ok: false, error: `${WRONG} ${left} more ${left === 1 ? 'try' : 'tries'} before a short wait.` }
  }, [])

  const createOwner = useCallback(
    async (name: string, username: string, password: string): Promise<AuthResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      // The set-up form never replaces accounts that already exist.
      if (readUsers().length > 0) {
        setUsers(readUsers())
        return { ok: false, error: 'An owner account has already been set up on this device. Sign in with it.' }
      }
      const owner: StoredUser = { id: newId(), name: name.trim(), username: cleanUsername(username), role: 'owner', createdAt: Date.now(), ...(await hashNew(password)) }
      if (!save([owner])) return { ok: false, error: STORAGE_BLOCKED }
      const next = { id: owner.id, token: owner.hash }
      writeSession(next)
      setSession(next)
      return { ok: true }
    },
    [supported, save],
  )

  const signIn = useCallback(
    async (username: string, password: string): Promise<AuthResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      const result = await verify(username, password)
      if (!result.ok || !result.account) return result
      const next = { id: result.account.id, token: result.account.hash }
      writeSession(next)
      setUsers(readUsers())
      setSession(next)
      return { ok: true }
    },
    [supported, verify],
  )

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string): Promise<AuthResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      if (!current) return { ok: false, error: 'Sign in first.' }
      const result = await verify(current.username, currentPassword)
      if (!result.ok || !result.account) return result.ok ? { ok: false, error: WRONG } : { ...result, error: result.until ? result.error : result.error.replace(WRONG, 'That password is not right.') }
      const fresh = await hashNew(nextPassword)
      const id = result.account.id
      // A password of the person's own choosing: the account is no longer the carried-over one.
      const next = readUsers().map((u) => (u.id === id ? { ...u, ...fresh, legacy: undefined } : u))
      if (!save(next)) return { ok: false, error: STORAGE_BLOCKED }
      const nextSession = { id, token: fresh.hash }
      writeSession(nextSession)
      setSession(nextSession)
      return { ok: true }
    },
    [supported, current, verify, save],
  )

  const addMember = useCallback(
    async (member: NewMember): Promise<AuthResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      if (current?.role !== 'owner') return { ok: false, error: 'Only the owner can add team members.' }
      const list = readUsers()
      const username = cleanUsername(member.username)
      if (list.length >= TEAM_MAX) return { ok: false, error: `This device can hold up to ${TEAM_MAX} accounts. Remove one first.` }
      if (list.some((u) => u.username === username)) return { ok: false, field: 'username', error: 'That username is already taken. Choose another.' }
      const account: StoredUser = { id: newId(), name: member.name.trim(), username, role: member.role === 'editor' ? 'editor' : 'writer', createdAt: Date.now(), ...(await hashNew(member.password)) }
      return save([...list, account]) ? { ok: true } : { ok: false, error: STORAGE_BLOCKED }
    },
    [supported, current, save],
  )

  const removeMember = useCallback(
    (id: string): AuthResult => {
      if (current?.role !== 'owner') return { ok: false, error: 'Only the owner can remove team members.' }
      const list = readUsers()
      const target = list.find((u) => u.id === id)
      if (!target) return { ok: true }
      if (target.role === 'owner') return { ok: false, error: 'The owner account cannot be removed.' }
      return save(list.filter((u) => u.id !== id)) ? { ok: true } : { ok: false, error: STORAGE_BLOCKED }
    },
    [current, save],
  )

  const resetMemberPassword = useCallback(
    async (id: string, password: string): Promise<AuthResult> => {
      if (!supported) return { ok: false, error: UNSUPPORTED }
      if (current?.role !== 'owner') return { ok: false, error: 'Only the owner can reset a password.' }
      if (id === current.id) return { ok: false, error: 'Change your own password under Sign-in on the Admin page.' }
      const fresh = await hashNew(password)
      const list = readUsers()
      if (!list.some((u) => u.id === id)) return { ok: false, error: 'That account no longer exists.' }
      // The new hash also ends any session the member has open.
      return save(list.map((u) => (u.id === id ? { ...u, ...fresh } : u))) ? { ok: true } : { ok: false, error: STORAGE_BLOCKED }
    },
    [supported, current, save],
  )

  const signOut = useCallback(() => {
    writeSession(null)
    setSession(null)
  }, [])

  const resetEverything = useCallback(async () => {
    await eraseDeviceData()
    try {
      for (const key of [TEAM_KEY, LEGACY_KEY, TRIES_KEY]) localStorage.removeItem(key)
    } catch {
      /* nothing more can be removed */
    }
    writeSession(null)
    // Start again from a clean page so nothing erased is still held in memory.
    window.location.assign('/admin')
  }, [])

  const status: AuthValue['status'] = users.length === 0 ? 'setup' : current ? 'signed-in' : 'signed-out'
  const user = useMemo(() => (current ? publicView(current) : null), [current])
  const team = useMemo(() => users.map(publicView), [users])

  const value = useMemo<AuthValue>(
    () => ({ status, supported, user, team, createOwner, signIn, changePassword, addMember, removeMember, resetMemberPassword, signOut, resetEverything }),
    [status, supported, user, team, createOwner, signIn, changePassword, addMember, removeMember, resetMemberPassword, signOut, resetEverything],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
