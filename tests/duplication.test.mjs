/**
 * Duplication tests for 180news — focus: past and newly published CMS articles
 * must each appear exactly once across the front page, Latest, and sections.
 *
 * Run: node tests/duplication.test.mjs [baseUrl]
 * The CMS API is intercepted so scenarios are deterministic.
 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const BASE = process.argv[2] ?? 'https://nbjz4r.vercel.app'
const CMS_ARTICLES = '**/api/public?resource=articles'
const CMS_DETAIL = '**/api/public?resource=article&id=*'

const PAST = [
  { id: 2, slug: 'former-deputy-president-phumzile-mlambo-ngcuka-dies', headline: 'Former Deputy President Phumzile Mlambo-Ngcuka dies at 71', summary: 'The family announces her passing.', section: 'south-africa', sectionLabel: 'South Africa', tags: [], image: null, mediaTypes: [], author: 'Newsroom', placement: 'headline', publishedAt: '2026-11-21T02:22:08.245+00:00' },
  { id: 5, slug: 'ramaphosa-outlines-south-africa-s-ai-ambitions', headline: 'Ramaphosa outlines South Africa’s AI ambitions following Silicon Valley visit', summary: 'The President reflected on the lessons of the working visit.', section: 'south-africa', sectionLabel: 'South Africa', tags: [], image: { url: 'https://hfbbmtgsjbqfustttdgb.supabase.co/storage/v1/object/public/newsroom-media/2026/11/sample.jpg', caption: 'President at the media engagement', credit: 'GovZAupdates' }, mediaTypes: [], author: 'Newsroom', placement: 'headline', publishedAt: '2026-11-21T15:30:00.000+00:00' },
]

const NEW = { id: 999, slug: 'newly-published-story-from-the-cms', headline: 'Newly published story from the CMS lands on the front page', summary: 'A fresh story published while readers are on the app.', section: 'south-africa', sectionLabel: 'South Africa', tags: ['180news'], image: null, mediaTypes: [], author: 'Newsroom', placement: 'headline', publishedAt: '2026-11-22T19:13:43.000+00:00' }

/** A re-publication of a past story: new CMS id, same slug, fresher timestamp. */
const REPUBLISHED = { ...PAST[1], id: 105, publishedAt: '2026-11-22T18:00:00.000+00:00' }

let passed = 0
let failed = 0
const test = (name, fn) =>
  fn()
    .then(() => {
      passed += 1
      console.log(`  ok  ${name}`)
    })
    .catch((error) => {
      failed += 1
      console.log(`FAIL  ${name}\n      ${error.message.split('\n')[0]}`)
    })

async function withPage(scenario, fn) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } })
  const pg = await context.newPage()
  await pg.route(CMS_ARTICLES, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(scenario.list) }),
  )
  await pg.route(CMS_DETAIL, (route) => {
    const id = new URL(route.request().url()).searchParams.get('id')
    const raw = scenario.list.find((a) => String(a.id) === String(id))
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(raw ? { ...raw, body: raw.body ?? `Full text of ${raw.headline}.\n\nSecond paragraph.` } : {}),
    })
  })
  try {
    await fn(pg)
  } finally {
    await browser.close()
  }
}

const storyHrefs = (page) =>
  page.evaluate(() => [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/story/')))

const countOf = (hrefs, needle) => hrefs.filter((h) => h.includes(needle)).length

async function eachStoryAppearsOnce(page, needles, label) {
  const hrefs = await storyHrefs(page)
  for (const needle of needles) {
    const n = countOf(hrefs, needle)
    assert.equal(n, 1, `${label}: expected ${needle} exactly once, found ${n}`)
  }
  const counts = {}
  for (const h of hrefs) counts[h] = (counts[h] ?? 0) + 1
  const dups = Object.entries(counts).filter(([, c]) => c > 1)
  assert.deepEqual(dups, [], `${label}: duplicate story links on the page: ${JSON.stringify(dups)}`)
}

const run = Promise.all([
  test('past + newly published CMS articles each appear exactly once on the front page', async () => {
    await withPage({ list: [...PAST, NEW] }, async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(4000)
      await eachStoryAppearsOnce(page, ['cms-2', 'cms-5', 'cms-999'], 'home')
    })
  }),
  test('a newly published article appears exactly once on Latest and its section', async () => {
    await withPage({ list: [...PAST, NEW] }, async (page) => {
      await page.goto(`${BASE}/latest`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(4000)
      await eachStoryAppearsOnce(page, ['cms-999', 'cms-2'], 'latest')
      await page.goto(`${BASE}/section/south-africa`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(4000)
      await eachStoryAppearsOnce(page, ['cms-999', 'cms-5'], 'section')
    })
  }),
  test('a republished story (same slug, new CMS id) appears only once — as the newest version', async () => {
    await withPage({ list: [...PAST, REPUBLISHED] }, async (page) => {
      await page.goto(`${BASE}/latest`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(4000)
      const hrefs = await storyHrefs(page)
      const oldCount = countOf(hrefs, 'cms-5')
      const newCount = countOf(hrefs, 'cms-105')
      assert.equal(newCount + oldCount, 1, `re-published story should appear once (old: ${oldCount}, new: ${newCount})`)
      assert.equal(newCount, 1, 'the newest version should be the one shown')
    })
  }),
  test('a story published mid-visit appears once after the CMS poll refreshes', async () => {
    await withPage({ list: [...PAST] }, async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(3000)
      assert.equal(countOf(await storyHrefs(page), 'cms-999'), 0, 'story must not exist before publication')
      // the CMS publishes the story; the app re-checks every minute
      await page.route(CMS_ARTICLES, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...PAST, NEW]) }),
      )
      await page.waitForTimeout(68000)
      await eachStoryAppearsOnce(page, ['cms-999'], 'home after poll')
    })
  }),
  test('all CMS stories from the live newsroom appear exactly once on the live front page', async () => {
    const browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } })
    const page = await context.newPage()
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(12000)
      const live = await (await fetch('https://cms.180news.co.za/api/public?resource=articles')).json()
      await eachStoryAppearsOnce(page, live.map((a) => `cms-${a.id}`), 'live home')
    } finally {
      await browser.close()
    }
  }),
])

run.then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
})
