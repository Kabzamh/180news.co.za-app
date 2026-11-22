import { useEffect, useState } from 'react'

export interface City {
  id: string
  name: string
  lat: number
  lon: number
}

export const CITIES: City[] = [
  { id: 'jhb', name: 'Johannesburg', lat: -26.2041, lon: 28.0473 },
  { id: 'cpt', name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  { id: 'dbn', name: 'Durban', lat: -29.8587, lon: 31.0218 },
  { id: 'pta', name: 'Pretoria', lat: -25.7479, lon: 28.2293 },
  { id: 'gqe', name: 'Gqeberha', lat: -33.9608, lon: 25.6022 },
  { id: 'bfn', name: 'Bloemfontein', lat: -29.0852, lon: 26.1596 },
  { id: 'els', name: 'East London', lat: -33.0153, lon: 27.9116 },
  { id: 'plk', name: 'Polokwane', lat: -23.9045, lon: 29.4689 },
  { id: 'mbo', name: 'Mbombela', lat: -25.4753, lon: 30.9694 },
  { id: 'kim', name: 'Kimberley', lat: -28.7282, lon: 24.7499 },
  { id: 'mhk', name: 'Mahikeng', lat: -25.856, lon: 25.6403 },
]

export interface WeatherKind {
  label: string
  kind: 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'
}

export function weatherKind(code: number): WeatherKind {
  if (code === 0) return { label: 'Clear', kind: 'clear' }
  if (code === 1) return { label: 'Mostly clear', kind: 'partly' }
  if (code === 2) return { label: 'Partly cloudy', kind: 'partly' }
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' }
  if (code === 45 || code === 48) return { label: 'Fog', kind: 'fog' }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', kind: 'drizzle' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', kind: 'rain' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', kind: 'snow' }
  if (code >= 95) return { label: 'Thunderstorms', kind: 'storm' }
  return { label: 'Cloudy', kind: 'cloudy' }
}

export interface Weather {
  temp: number
  code: number
  isDay: boolean
  high: number | null
  low: number | null
}

const CITY_KEY = '180news:city'
const weatherCache = new Map<string, { at: number; data: Weather }>()

async function fetchWeather(city: City): Promise<Weather> {
  const cached = weatherCache.get(city.id)
  if (cached && Date.now() - cached.at < 15 * 60000) return cached.data
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=Africa%2FJohannesburg&forecast_days=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; is_day?: number }
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] }
  }
  const temp = data.current?.temperature_2m
  const code = data.current?.weather_code
  if (typeof temp !== 'number' || typeof code !== 'number') throw new Error('Unexpected weather response')
  const weather: Weather = {
    temp,
    code,
    isDay: data.current?.is_day !== 0,
    high: typeof data.daily?.temperature_2m_max?.[0] === 'number' ? data.daily.temperature_2m_max[0] : null,
    low: typeof data.daily?.temperature_2m_min?.[0] === 'number' ? data.daily.temperature_2m_min[0] : null,
  }
  weatherCache.set(city.id, { at: Date.now(), data: weather })
  return weather
}

export function useWeather() {
  const [cityId, setCityId] = useState(() => {
    try {
      const stored = localStorage.getItem(CITY_KEY)
      return CITIES.some((c) => c.id === stored) ? (stored as string) : CITIES[0].id
    } catch {
      return CITIES[0].id
    }
  })
  const [reading, setReading] = useState<{ cityId: string; weather: Weather } | null>(null)
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0]

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetchWeather(city)
        .then((weather) => {
          if (!cancelled) setReading({ cityId: city.id, weather })
        })
        .catch(() => {})
    }
    load()
    const timer = window.setInterval(load, 15 * 60000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [city])

  const chooseCity = (id: string) => {
    setCityId(id)
    try {
      localStorage.setItem(CITY_KEY, id)
    } catch {
      /* ignore */
    }
  }

  return { city, weather: reading && reading.cityId === city.id ? reading.weather : null, chooseCity }
}

export interface Rates {
  usd: number
  eur: number
  gbp: number
  updatedAt: number
}

let ratesPromise: Promise<Rates | null> | null = null

function loadRates(): Promise<Rates | null> {
  ratesPromise ??= fetch('https://open.er-api.com/v6/latest/USD')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data: { result?: string; rates?: Record<string, number>; time_last_update_unix?: number }) => {
      const zar = data.rates?.ZAR
      const eur = data.rates?.EUR
      const gbp = data.rates?.GBP
      return data.result !== 'success' || !zar || !eur || !gbp
        ? null
        : { usd: zar, eur: zar / eur, gbp: zar / gbp, updatedAt: (data.time_last_update_unix ?? 0) * 1000 }
    })
    .catch(() => {
      ratesPromise = null
      return null
    })
  return ratesPromise
}

export function useRates(): Rates | null {
  const [rates, setRates] = useState<Rates | null>(null)
  useEffect(() => {
    let cancelled = false
    loadRates().then((data) => {
      if (!cancelled) setRates(data)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return rates
}

export function useTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | 180news` : '180news — Live South African news headlines'
  }, [title])
}
