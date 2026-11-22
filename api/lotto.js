const SOURCE = 'https://www.lotteryextreme.com/south-africa/'

const DAY = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)'

// Each game: the last number of the run is the bonus/powerball (Daily Lotto has none).
const GAMES = [
  {
    key: 'lotto',
    label: 'Lotto',
    bonus: 'bonus',
    count: 7,
    regex: new RegExp(`Lotto Results (${DAY} \\d{1,2} \\w+ \\d{4}) Lotto ((?:\\d+\\s+){6}\\d+)`),
  },
  {
    key: 'lotto-plus-1',
    label: 'Lotto Plus 1',
    bonus: 'bonus',
    count: 7,
    regex: /Lotto Plus ((?:\d+\s+){6}\d+)/,
    inherits: 'lotto',
  },
  {
    key: 'daily-lotto',
    label: 'Daily Lotto',
    bonus: null,
    count: 5,
    regex: new RegExp(`Daily Lotto Results (${DAY} \\d{1,2} \\w+ \\d{4}) Daily Lotto ((?:\\d+\\s+){4}\\d+)`),
  },
  {
    key: 'powerball',
    label: 'PowerBall',
    bonus: 'powerball',
    count: 6,
    regex: new RegExp(`Powerball Results (${DAY} \\d{1,2} \\w+ \\d{4}) Powerball ((?:\\d+\\s+){5}\\d+)`),
  },
  {
    key: 'powerball-plus',
    label: 'PowerBall Plus',
    bonus: 'powerball',
    count: 6,
    regex: /Powerball Plus ((?:\d+\s+){5}\d+)/,
    inherits: 'powerball',
  },
]

let cache = null
const TTL = 5 * 60 * 1000

function parse(html) {
  const body = html.slice(html.indexOf('</head>'))
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
  const drawn = {}
  const games = []
  for (const game of GAMES) {
    const match = game.regex.exec(text)
    if (!match) continue
    // dated games capture (date, numbers); games that inherit use one group for numbers
    const hasDate = match.length > 2
    const numbersText = hasDate ? match[2] : match[1]
    const drawDate = hasDate ? match[1] : null
    const numbers = numbersText.trim().split(/\s+/).map(Number).filter((n) => n >= 1 && n <= 52)
    if (numbers.length < game.count) continue
    if (hasDate && drawDate) drawn[game.key] = drawDate
    let inherited = drawDate
    if (!inherited && game.inherits) inherited = drawn[game.inherits] ?? null
    const balls = numbers.slice(0, game.count)
    games.push({
      key: game.key,
      label: game.label,
      drawDate: inherited,
      numbers: game.bonus ? balls.slice(0, -1) : balls,
      ...(game.bonus ? { special: balls[balls.length - 1] } : {}),
    })
  }
  return games
}

export default async function handler(_req, res) {
  if (cache && Date.now() - cache.at < TTL) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=120')
    return res.status(200).json(cache.data)
  }
  try {
    const response = await fetch(SOURCE, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 180news-bot)' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const games = parse(await response.text())
    if (!games.length) throw new Error('No results found')
    cache = { at: Date.now(), data: { fetchedAt: Date.now(), source: 'lotteryextreme.com', games } }
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=120')
    res.status(200).json(cache.data)
  } catch (error) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(502).json({ error: error instanceof Error ? error.message : 'Lotto results unavailable' })
  }
}
