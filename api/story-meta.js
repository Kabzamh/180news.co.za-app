/**
 * Per-article social previews: serves the app shell with Open Graph / Twitter
 * tags filled for /story/<id>, so links shared to social platforms show a
 * customised, professional card (headline, summary, picture — or the 180 News
 * logo card when no picture is available).
 */
const CMS = 'https://cms.180news.co.za'
const SITE_NAME = '180news'
const DEFAULT_TITLE = '180news — Live South African news headlines'
const DEFAULT_DESCRIPTION = 'Live headlines from South African and international newsrooms, on one front page.'
const FALLBACK_IMAGE = '/og-story.png'

const TTL = 5 * 60 * 1000
const memory = new Map()

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function cachedJson(url) {
  const hit = memory.get(url)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  memory.set(url, { at: Date.now(), data })
  if (memory.size > 60) memory.delete(memory.keys().next().value)
  return data
}

const firstParagraph = (body) =>
  String(body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .find((p) => p.length > 0) ?? ''

function cardFromCmsArticle(raw) {
  const image = raw.image && typeof raw.image === 'object' && typeof raw.image.url === 'string' ? raw.image.url : null
  return {
    title: raw.headline,
    description: raw.summary || firstParagraph(raw.body) || DEFAULT_DESCRIPTION,
    image,
    author: typeof raw.author === 'string' ? raw.author : null,
    publishedTime: typeof raw.publishedAt === 'string' ? new Date(raw.publishedAt).toISOString() : null,
  }
}

async function resolveCard(id, origin) {
  // CMS stories are shared both as /story/cms-<id> and /story/<slug>
  const cmsId = /^cms-(\d+)$/.exec(id)
  if (cmsId) {
    try {
      const raw = await cachedJson(`${CMS}/api/public?resource=article&id=${cmsId[1]}`)
      if (raw && raw.headline) return cardFromCmsArticle(raw)
    } catch {
      /* fall through to the other resolvers */
    }
  }
  try {
    const list = await cachedJson(`${CMS}/api/public?resource=articles`)
    if (Array.isArray(list)) {
      const match = list.find((a) => a.slug === id || `cms-${a.id}` === id)
      if (match) return cardFromCmsArticle(match)
    }
  } catch {
    /* fall through */
  }
  try {
    const snapshot = await cachedJson(`${origin}/snapshot.json`)
    if (snapshot && typeof snapshot.feeds === 'object') {
      for (const items of Object.values(snapshot.feeds)) {
        const item = Array.isArray(items) ? items.find((i) => i && i.id === id) : null
        if (item) {
          return {
            title: item.title,
            description: item.summary || DEFAULT_DESCRIPTION,
            image: typeof item.image === 'string' && /^https:\/\//.test(item.image) ? item.image : null,
            author: typeof item.author === 'string' ? item.author : null,
            publishedTime: typeof item.published === 'number' && item.published > 0 ? new Date(item.published).toISOString() : null,
          }
        }
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const published = await cachedJson(`${origin}/published.json`)
    const articles = published && Array.isArray(published.articles) ? published.articles : []
    const match = articles.find((a) => a && a.id === id)
    if (match) {
      return {
        title: match.title,
        description: match.summary || firstParagraph(match.body) || DEFAULT_DESCRIPTION,
        image: typeof match.image === 'string' && match.image.startsWith('https://') ? match.image : null,
        author: typeof match.author === 'string' ? match.author : null,
        publishedTime: null,
      }
    }
  } catch {
    /* fall through */
  }
  return null
}

async function getShell(origin) {
  const key = `shell:${origin}`
  const hit = memory.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.html
  const res = await fetch(`${origin}/index.html`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  memory.set(key, { at: Date.now(), html })
  if (memory.size > 60) memory.delete(memory.keys().next().value)
  return html
}

function injectMeta(html, tags) {
  let out = html.replace(/<meta property="og:[^>]*>/gi, '')
  out = out.replace(/<meta name="twitter:[^>]*>/gi, '')
  out = out.replace(/<link rel="canonical"[^>]*>/gi, '')
  const block = tags.join('\n    ')
  if (out.includes('</title>')) {
    out = out.replace('</title>', `</title>\n    ${block}`)
  } else {
    out = out.replace('</head>', `    ${block}\n  </head>`)
  }
  return out
}

export default async function handler(req, res) {
  try {
    const proto = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const origin = `${proto}://${host}`
    const id = decodeURIComponent(String(req.query.id ?? '')).replace(/\/+$/, '')
    if (!id || /[<>"']/.test(id)) throw new Error('Bad id')

    const card = (await resolveCard(id, origin)) ?? {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      image: null,
      author: null,
      publishedTime: null,
    }
    const image = card.image ?? `${origin}${FALLBACK_IMAGE}`
    const url = `${origin}/story/${encodeURIComponent(id)}`

    const tags = [
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:title" content="${escapeHtml(card.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(card.description)}" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:url" content="${escapeHtml(url)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtml(card.title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(card.description)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
      `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ]
    if (card.publishedTime) tags.push(`<meta property="article:published_time" content="${escapeHtml(card.publishedTime)}" />`)
    if (card.author) tags.push(`<meta property="article:author" content="${escapeHtml(card.author)}" />`)

    let shell = await getShell(origin)
    if (card.title && card.title !== DEFAULT_TITLE) {
      shell = shell.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(card.title)} | ${SITE_NAME}</title>`)
    }
    const html = injectMeta(shell, tags)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=600')
    res.status(200).send(html)
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.status(200).send('<!doctype html><html lang="en-ZA"><head><meta http-equiv="refresh" content="0"></head><body></body></html>')
  }
}
