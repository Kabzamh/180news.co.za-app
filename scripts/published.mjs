import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Runs before every build. 180news has no shared database, so the articles
 * that readers on every device see ship with the site, in public/published.json.
 *
 * An owner or editor downloads an "articles for all readers" file on the Admin
 * page and uploads it with a request to update the site. This picks the newest
 * such file out of the uploads folders and makes it the published set. With no
 * newer upload, what is already published is left as it is.
 */
const TARGET = 'public/published.json'
const EMPTY = { app: '180news', kind: 'articles-for-readers', version: 1, exportedAt: null, articles: [] }
const NOT_JSON = /\.(png|jpe?g|gif|webp|svg|avif|mp4|mov|webm|mp3|wav|m4a|pdf|zip|csv|xlsx?)$/i
const when = (file) => (file && typeof file.exportedAt === 'string' ? Date.parse(file.exportedAt) : NaN)

let newest = null
for (const dir of ['uploads', 'public/uploads']) {
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    try {
      if (NOT_JSON.test(name) || !statSync(path).isFile() || statSync(path).size > 40 * 1024 * 1024) continue
      const file = JSON.parse(readFileSync(path, 'utf8'))
      // Only a file made by the Admin page's "Download file for all readers" counts; the app checks every article again when it loads them.
      if (file?.app !== '180news' || file?.kind !== 'articles-for-readers' || !Array.isArray(file.articles) || Number.isNaN(when(file))) continue
      if (!newest || when(file) > when(newest.file)) newest = { path, file }
    } catch {
      /* not an articles file */
    }
  }
}

let current = null
try {
  current = JSON.parse(readFileSync(TARGET, 'utf8'))
} catch {
  /* nothing published yet */
}

if (newest && !(when(newest.file) <= when(current))) {
  const { exportedAt, articles } = newest.file
  writeFileSync(TARGET, JSON.stringify({ ...EMPTY, exportedAt, articles }))
  console.log(`published.json: ${articles.length} article(s) for all readers, from ${newest.path} (sent ${exportedAt})`)
} else if (!current) {
  writeFileSync(TARGET, JSON.stringify(EMPTY))
  console.log('published.json: no articles for all readers yet')
} else {
  console.log(`published.json: unchanged, ${Array.isArray(current.articles) ? current.articles.length : 0} article(s) for all readers`)
}
