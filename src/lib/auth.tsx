import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const TEAM_KEY = '180news:team:v1'
const ACCOUNT_KEY = '180news:admin:v1'
const SESSION_KEY = '180news:admin-session'
const TRIES_KEY = '180news:admin-tries'
const LOCK_MS = 150000
const MAX_TRIES = 5

export interface Member {
  username: string
  name: string
  role: 'owner' | 'editor' | 'reporter'
  hash?: string
  salt?: string
}

export interface OwnerAccount extends Member {
  question: string
  answerHash: string
  answerSalt: string
}

export type AuthStatus = 'setup' | 'signed-in' | 'signed-out'

interface AuthValue {
  status: AuthStatus
  user: Member | null
  account: OwnerAccount | null
  setUpOwner: (input: { username: string; name: string; password: string; question: string; answer: string }) => Promise<{ ok: boolean; error?: string }>
  signIn: (username: string, password: string) => Promise<{ ok: boolean; error?: string; lockedFor?: number }>
  signOut: () => void
  addMember: (input: { username: string; name: string; password: string; role: Member['role'] }) => Promise<{ ok: boolean; error?: string }>
  removeMember: (username: string) => void
  resetMemberPassword: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>
  resetEverything: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const encoder = new TextEncoder()

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = encoder.encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

const makeSalt = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function readSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function tries(): { count: number; at: number } {
  try {
    const raw = sessionStorage.getItem(TRIES_KEY)
    return raw ? (JSON.parse(raw) as { count: number; at: number }) : { count: 0, at: 0 }
  } catch {
    return { count: 0, at: 0 }
  }
}

function saveTries(value: { count: number; at: number }): void {
  try {
    sessionStorage.setItem(TRIES_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account] = useState<OwnerAccount | null>(() => readJson<OwnerAccount>(ACCOUNT_KEY))
  const [team, setTeam] = useState<Member[]>(() => readJson<Member[]>(TEAM_KEY) ?? [])
  const [sessionUser, setSessionUser] = useState<string | null>(() => readSession())

  const status: AuthStatus = sessionUser && (sessionUser === account?.username || team.some((m) => m.username === sessionUser)) ? 'signed-in' : account ? 'signed-out' : 'setup'

  const persistTeam = useCallback((next: Member[]): boolean => {
    try {
      localStorage.setItem(TEAM_KEY, JSON.stringify(next))
    } catch {
      return false
    }
    setTeam(next)
    return true
  }, [])

  const setUpOwner = useCallback<AuthValue['setUpOwner']>(async (input) => {
    if (!crypto?.subtle) return { ok: false, error: 'This browser cannot set up a sign-in. A secure context (HTTPS) is required.' }
    const salt = makeSalt()
    const hash = await hashPassword(input.password, salt)
    const answerSalt = makeSalt()
    const answerHash = await hashPassword(input.answer.trim().toLowerCase(), answerSalt)
    const next: OwnerAccount = {
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      role: 'owner',
      hash,
      salt,
      question: input.question.trim(),
      answerHash,
      answerSalt,
    }
    try {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next))
    } catch {
      return { ok: false, error: 'This browser would not store the account. Private browsing windows often block this, or its storage is full.' }
    }
    persistTeam([{ username: next.username, name: next.name, role: 'owner' }])
    try {
      sessionStorage.setItem(SESSION_KEY, next.username)
    } catch {
      /* ignore */
    }
    setSessionUser(next.username)
    return { ok: true }
  }, [persistTeam])

  const signIn = useCallback<AuthValue['signIn']>(async (username, password) => {
    const state = tries()
    if (state.count >= MAX_TRIES && Date.now() - state.at < LOCK_MS) {
      return { ok: false, error: 'Too many tries. Wait a couple of minutes and try again.', lockedFor: Math.ceil((LOCK_MS - (Date.now() - state.at)) / 1000) }
    }
    const stored = state.count >= MAX_TRIES ? null : readJson<OwnerAccount>(ACCOUNT_KEY)
    const member = team.find((m) => m.username === username.trim().toLowerCase())
    if (stored && stored.username === username.trim().toLowerCase()) {
      const hash = await hashPassword(password, stored.salt ?? '')
      if (hash === stored.hash) {
        saveTries({ count: 0, at: 0 })
        try {
          sessionStorage.setItem(SESSION_KEY, stored.username)
        } catch {
          /* ignore */
        }
        setSessionUser(stored.username)
        return { ok: true }
      }
    } else if (member?.hash && member.salt) {
      const hash = await hashPassword(password, member.salt)
      if (hash === member.hash) {
        saveTries({ count: 0, at: 0 })
        try {
          sessionStorage.setItem(SESSION_KEY, member.username)
        } catch {
          /* ignore */
        }
        setSessionUser(member.username)
        return { ok: true }
      }
    }
    const next = { count: state.count + 1, at: Date.now() }
    saveTries(next)
    return { ok: false, error: next.count >= MAX_TRIES ? 'Too many tries. Wait a couple of minutes and try again.' : 'That username and password do not match.' }
  }, [team])

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setSessionUser(null)
  }, [])

  const addMember = useCallback<AuthValue['addMember']>(async (input) => {
    const username = input.username.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) return { ok: false, error: 'Usernames use 3–30 letters, numbers, dots, dashes or underscores, starting with a letter or number.' }
    if (team.some((m) => m.username === username)) return { ok: false, error: 'That username is already on the team.' }
    const salt = makeSalt()
    const hash = await hashPassword(input.password, salt)
    return persistTeam([...team, { username, name: input.name.trim(), role: input.role, hash, salt }]) ? { ok: true } : { ok: false, error: 'This browser would not store the account.' }
  }, [team, persistTeam])

  const removeMember = useCallback(
    (username: string) => {
      persistTeam(team.filter((m) => m.username !== username || m.role === 'owner'))
    },
    [team, persistTeam],
  )

  const resetMemberPassword = useCallback<AuthValue['resetMemberPassword']>(async (username, password) => {
    const salt = makeSalt()
    const hash = await hashPassword(password, salt)
    const next = team.map((m) => (m.username === username ? { ...m, hash, salt } : m))
    return persistTeam(next) ? { ok: true } : { ok: false, error: 'This browser would not store the account.' }
  }, [team, persistTeam])

  const changePassword = useCallback<AuthValue['changePassword']>(async (current, next) => {
    if (!account) return { ok: false, error: 'No account in this browser.' }
    const hash = await hashPassword(current, account.salt ?? '')
    if (hash !== account.hash) return { ok: false, error: 'The current password is not right.' }
    const salt = makeSalt()
    const updated: OwnerAccount = { ...account, salt, hash: await hashPassword(next, salt) }
    try {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(updated))
    } catch {
      return { ok: false, error: 'This browser would not store the account.' }
    }
    return { ok: true }
  }, [account])

  const resetEverything = useCallback(() => {
    for (const key of [TEAM_KEY, ACCOUNT_KEY, SESSION_KEY, TRIES_KEY]) {
      try {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
    setTeam([])
    setSessionUser(null)
  }, [])

  const user = useMemo<Member | null>(() => {
    if (!sessionUser) return null
    if (account?.username === sessionUser) return { username: account.username, name: account.name, role: 'owner' }
    return team.find((m) => m.username === sessionUser) ?? null
  }, [sessionUser, account, team])

  const value = useMemo<AuthValue>(
    () => ({ status, user, account, setUpOwner, signIn, signOut, addMember, removeMember, resetMemberPassword, changePassword, resetEverything }),
    [status, user, account, setUpOwner, signIn, signOut, addMember, removeMember, resetMemberPassword, changePassword, resetEverything],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
