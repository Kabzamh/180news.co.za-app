import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  id?: string
  title: string
  to?: string
  moreLabel?: string
  dark?: boolean
  children?: ReactNode
}

/** Rule with a thick brand tab, section name and an optional "more" link. */
export function SectionHeading({ id, title, to, moreLabel, dark = false, children }: Props) {
  return (
    <div
      className={`relative mb-5 flex items-center justify-between gap-4 border-t pt-3 before:absolute before:-top-px before:left-0 before:h-1 before:w-16 before:content-[''] ${
        dark ? 'border-white/25 before:bg-white' : 'border-line before:bg-brand'
      }`}
    >
      <h2 id={id} className={`text-[21px] font-black uppercase leading-none tracking-[-0.01em] sm:text-2xl ${dark ? 'text-white' : 'text-ink'}`}>
        {to ? (
          <Link to={to} className={dark ? 'hover:underline' : 'hover:text-brand'}>
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      {children}
      {to && moreLabel && (
        <Link
          to={to}
          className={`-my-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-bold hover:underline ${dark ? 'text-white' : 'text-navy'}`}
        >
          {moreLabel}
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
