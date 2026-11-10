import { Link } from 'react-router-dom'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/extras'

export default function NotFound() {
  useTitle('Page not found')
  const { sections } = useControl()
  return (
    <div className="wrap py-20 text-center">
      <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">Error 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">We can’t find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-body">The address may be mistyped, or the page may have moved. The news is this way:</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">
          Top stories
        </Link>
        <Link to="/latest" className="inline-flex h-12 items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white">
          Latest
        </Link>
      </div>
      <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
        {sections.map((s) => (
          <li key={s.id}>
            <Link to={`/section/${s.id}`} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy">
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
