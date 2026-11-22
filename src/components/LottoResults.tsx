import { useLotto } from '../lib/lotto'

/** Per-game accent colours (Ithuba-style: red Lotto, blue PowerBall, green Daily Lotto). */
const ACCENTS: Record<string, { ball: string; special: string; chip: string }> = {
  lotto: { ball: 'bg-brand text-white', special: 'bg-warn text-navy-deep', chip: 'bg-brand text-white' },
  'lotto-plus-1': { ball: 'bg-brand-strong text-white', special: 'bg-warn text-navy-deep', chip: 'bg-brand-strong text-white' },
  'daily-lotto': { ball: 'bg-live text-navy-deep', special: '', chip: 'bg-live text-navy-deep' },
  powerball: { ball: 'bg-navy text-white', special: 'bg-brand text-white', chip: 'bg-navy text-white' },
  'powerball-plus': { ball: 'bg-navy-deep text-white', special: 'bg-brand text-white', chip: 'bg-navy-deep text-white' },
}

const BALL = 'lotto-ball'

export function LottoResults() {
  const results = useLotto()
  if (!results) return null
  return (
    <aside aria-labelledby="lotto-results" className="border border-line bg-paper">
      <div className="on-dark dot-band lotto-head">
        <h3 id="lotto-results" className="text-sm font-black uppercase tracking-[0.04em]">
          Lotto results
        </h3>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="lotto-dot bg-brand" />
          <span className="lotto-dot bg-warn" />
          <span className="lotto-dot bg-live" />
        </span>
      </div>
      <dl className="lotto-body">
        {results.games.map((game) => {
          const accent = ACCENTS[game.key] ?? { ball: 'bg-navy text-white', special: 'bg-warn text-navy-deep', chip: 'bg-navy text-white' }
          return (
            <div key={game.key} className="lotto-row">
              <dt className="flex items-baseline justify-between gap-3">
                <span className={`lotto-chip ${accent.chip}`}>{game.label}</span>
                {game.drawDate && <span className="lotto-date text-muted">{game.drawDate}</span>}
              </dt>
              <dd
                className="lotto-balls"
                aria-label={`Winning numbers: ${game.numbers.join(', ')}${game.special ? `, ${game.special}` : ''}`}
              >
                {game.numbers.map((n) => (
                  <span key={n} className={`${BALL} ${accent.ball}`}>
                    {n}
                  </span>
                ))}
                {game.special !== undefined && (
                  <span className={`${BALL} ${accent.special}`} title={game.key.startsWith('powerball') ? 'PowerBall' : 'Bonus ball'}>
                    {game.special}
                  </span>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="lotto-foot text-muted">
        Winning numbers from the South African national lottery{results.fetchedAt ? `, updated ${new Date(results.fetchedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : ''}.{' '}
        <a href="https://www.nationallottery.co.za" target="_blank" rel="noopener noreferrer" className="lotto-link">
          Verify on the official site
        </a>
        . 18+ only — play responsibly.
      </p>
    </aside>
  )
}

export default LottoResults
