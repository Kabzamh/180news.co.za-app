import { Download, Globe } from 'lucide-react'
import { useState } from 'react'
import { useControl } from '../lib/control'
import { fullDate } from '../lib/format'

const outline =
  'inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white'
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Getting articles to readers on every device. Publishing puts an article on
 * the app on this device at once; without a shared database it reaches other
 * devices through a site update, which this section prepares.
 */
export function ReadersPublishing() {
  const { readers, exportForReaders, adoptSiteArticles } = useControl()
  const [note, setNote] = useState('')
  const waiting = readers.added + readers.changed + readers.removed
  const parts = [
    readers.added ? `${readers.added} new` : '',
    readers.changed ? `${readers.changed} edited` : '',
    readers.removed ? `${readers.removed} taken down` : '',
  ].filter(Boolean)

  const download = () => {
    const name = `180news-articles-${new Date().toISOString().slice(0, 10)}.json`
    const url = URL.createObjectURL(new Blob([exportForReaders()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setNote(`Downloaded ${name}. Upload it with your next request to update the site.`)
  }

  return (
    <section aria-labelledby="admin-readers" className="mt-9">
      <h2 id="admin-readers" className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.06em] text-navy">
        <Globe size={17} strokeWidth={2.3} aria-hidden="true" />
        Publish to all readers
      </h2>
      <div className="mt-3 border border-line bg-wash p-4 sm:p-5">
        <p className="max-w-[78ch] text-[16px] font-bold leading-snug text-ink" aria-live="polite">
          {readers.state === 'loading'
            ? 'Checking what readers on other devices can see…'
            : readers.state === 'error'
              ? 'What readers on other devices see could not be checked just now.'
              : readers.live === 0
                ? 'Readers on other devices do not see any 180news articles yet.'
                : `Readers on every device see ${count(readers.live, '180news article', '180news articles')}${readers.sentAt ? `, as sent on ${fullDate(readers.sentAt)}` : ''}.`}{' '}
          {readers.state !== 'loading' && (waiting > 0 ? `Waiting on this device: ${parts.join(', ')}.` : readers.live > 0 ? 'Nothing on this device is waiting to go to them.' : '')}
        </p>
        <p className="mt-2 max-w-[78ch] text-[14.5px] leading-relaxed text-body">
          An article you publish is on the app on this device at once. 180news has no shared database yet, so it reaches other devices through a
          site update: download the file below and upload it with your next request to update the site. The articles go live for everyone when
          the site is rebuilt. The file carries each article’s text, main picture, tags and links; extra photos, video and audio stay on this device.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={download}
            disabled={readers.state === 'loading' || waiting === 0}
            className="inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-5 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-[#8a919e]"
          >
            <Download size={17} strokeWidth={2.5} aria-hidden="true" /> Download file for all readers
          </button>
          {readers.state !== 'loading' && waiting === 0 && <p className="text-[14px] text-muted">Publish, edit or take down an article and the file will be ready.</p>}
        </div>
        <p role="status" className="mt-2 min-h-5 text-[14px] font-bold text-navy">
          {note}
        </p>

        {readers.notHere > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
            <p className="max-w-[60ch] text-[14.5px] leading-relaxed text-body">
              {count(readers.notHere, 'article that readers see is', 'articles that readers see are')} not stored on this device. Copy{' '}
              {readers.notHere === 1 ? 'it' : 'them'} here to edit or take {readers.notHere === 1 ? 'it' : 'them'} down.
            </p>
            <button
              type="button"
              onClick={() => setNote(adoptSiteArticles() ? 'Copied to this device. They are now listed under Articles in the Control panel.' : 'This browser’s storage is full, so they could not be copied.')}
              className={outline}
            >
              Copy to this device
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
