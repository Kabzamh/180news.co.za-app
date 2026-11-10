import { Calculator, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'

const link = 'inline-flex h-12 items-center gap-2 border-2 border-navy bg-paper px-5 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white'

/** Ways into the IEC results and the seat calculator, shown with the elections news. */
export function ElectionTools({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Election results" className={className}>
      <ul className="flex flex-wrap gap-2.5">
        <li>
          <Link to="/results" className={link}>
            <Landmark size={17} strokeWidth={2.4} aria-hidden="true" /> IEC results
          </Link>
        </li>
        <li>
          <Link to="/results/seats" className={link}>
            <Calculator size={17} strokeWidth={2.4} aria-hidden="true" /> Seat calculator
          </Link>
        </li>
      </ul>
    </nav>
  )
}
