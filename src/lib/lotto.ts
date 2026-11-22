import { useEffect, useState } from 'react'

export interface LottoGame {
  key: string
  label: string
  drawDate: string | null
  numbers: number[]
  special?: number
}

export interface LottoResults {
  fetchedAt: number
  source: string
  games: LottoGame[]
}

let cached: Promise<LottoResults | null> | null = null

function load(): Promise<LottoResults | null> {
  cached ??= fetch('/api/lotto', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data: LottoResults) =>
      data && Array.isArray(data.games) && data.games.length ? data : null,
    )
    .catch(() => {
      cached = null
      return null
    })
  return cached
}

export function useLotto(): LottoResults | null {
  const [results, setResults] = useState<LottoResults | null>(null)
  useEffect(() => {
    let cancelled = false
    load().then((data) => {
      if (!cancelled) setResults(data)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return results
}
