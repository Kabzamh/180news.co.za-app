import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'

const SECTIONS: { id: string; title: string; body: { type: 'p' | 'list'; text?: string; items?: string[] }[] }[] = [
  {
    id: 'scope',
    title: 'What this policy covers',
    body: [
      {
        type: 'p',
        text: 'This policy explains what information the 180news app collects, what it stores, and what it never does. It applies to the 180news website and installed app. It does not apply to the newsroom websites we link to — each publisher handles your data on its own site under its own policy.',
      },
    ],
  },
  {
    id: 'collect',
    title: 'What we collect',
    body: [
      { type: 'p', text: '180news runs almost entirely without knowing anything about you. There are no accounts for readers, no sign-in, and no advertising trackers.' },
      {
        type: 'list',
        items: [
          'Saved stories — the headlines you bookmark are kept in your browser’s local storage on your device. They are never sent to us.',
          'Weather city — the city you pick for the weather widget is kept in your browser’s local storage.',
          'Newsroom tools — if you use the Control panel or admin pages, the articles, adverts and team accounts you create are kept in that browser’s storage, with passwords stored only as salted hashes.',
          'Weather and currency — your browser asks Open-Meteo for the temperature in the city you choose, and asks ExchangeRate-API for daily rand reference rates. Those requests carry your IP address to those providers, as any web request does.',
        ],
      },
    ],
  },
  {
    id: 'third-party',
    title: 'Third-party services',
    body: [
      {
        type: 'p',
        text: 'To put one front page together, 180news reads public RSS feeds from each newsroom, either directly or through a relay service. When a feed is read through a relay, the request happens on our server, not in your browser. We do not send your name, email address or any identifier to newsrooms, and we do not run advertising or analytics cookies.',
      },
      {
        type: 'list',
        items: [
          'Open-Meteo — weather readings for the city you choose.',
          'ExchangeRate-API — daily reference rates for the rand.',
          'The Electoral Commission of South Africa — election results shown on the results pages.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and storage',
    body: [
      {
        type: 'p',
        text: '180news does not set advertising or tracking cookies. The app uses your browser’s own local storage and session storage for the things listed above. Clearing your browser data removes all of it, with nothing kept on our side.',
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights under POPIA',
    body: [
      {
        type: 'p',
        text: 'The Protection of Personal Information Act (POPIA) governs how personal information is handled in South Africa. Because 180news does not build profiles of readers and does not knowingly hold personal information about readers, there is normally nothing for us to disclose, correct or delete. If you believe we hold personal information about you — for example through the newsroom tools — write to us and we will confirm what is held, correct it or remove it without charge.',
      },
    ],
  },
  {
    id: 'children',
    title: 'Children',
    body: [{ type: 'p', text: '180news is a general news service and is not directed at children. We do not knowingly collect any personal information from children.' }],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: [
      {
        type: 'p',
        text: 'If the app starts collecting anything new, this page will say so before it happens. The policy was last updated in November 2026.',
      },
    ],
  },
]

export default function Policy() {
  useTitle('Privacy Policy')
  const { settings } = useControl()
  return <LegalPage kind="policy" title="Privacy Policy" intro="180news is a news front page, not a data business. This page sets out exactly what the app stores on your device and what it asks of third parties." sections={SECTIONS} email={settings.email} phone={settings.phone} />
}

export function LegalPage({
  kind,
  title,
  intro,
  sections,
  email,
  phone,
}: {
  kind: 'policy' | 'terms'
  title: string
  intro: string
  sections: { id: string; title: string; body: { type: 'p' | 'list'; text?: string; items?: string[] }[] }[]
  email: string
  phone: string
}) {
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">180news · {kind === 'policy' ? 'Privacy' : 'Legal'}</p>
        <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-[68ch] text-[17px] leading-relaxed text-body">{intro}</p>
      </header>

      <nav aria-label="On this page" className="mt-8 border border-line bg-wash p-5">
        <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">On this page</h2>
        <ol className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.id} className="text-[15px]">
              <a href={`#${section.id}`} className="text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section key={section.id} aria-labelledby={`legal-${section.id}`} className="mt-10">
          <h2 id={`legal-${section.id}`} className="text-2xl font-extrabold tracking-tight">
            {index + 1}. {section.title}
          </h2>
          <div className="mt-3 max-w-[68ch] space-y-3 text-[16.5px] leading-relaxed text-body">
            {section.body.map((block, blockIndex) =>
              block.type === 'p' ? (
                <p key={blockIndex}>{block.text}</p>
              ) : (
                <ul key={blockIndex} className="list-disc space-y-2 pl-5">
                  {block.items?.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}

      <section aria-labelledby="legal-contact" className="mt-10 border border-line bg-wash p-5">
        <h2 id="legal-contact" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">
          Questions about this page
        </h2>
        <p className="mt-2 max-w-[68ch] text-[16px] leading-relaxed text-body">
          Write to{' '}
          <a href={`mailto:${email}`} className="font-semibold text-navy underline break-all">
            {email}
          </a>{' '}
          or call {phone}. 180news is operated from South Africa.
        </p>
      </section>
    </div>
  )
}
