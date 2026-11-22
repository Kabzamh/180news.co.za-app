import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function SectionHeading({
  id,
  title,
  to,
  moreLabel,
  dark = false,
  children,
}: {
  id: string
  title: string
  to?: string
  moreLabel?: string
  dark?: boolean
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
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
          <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
