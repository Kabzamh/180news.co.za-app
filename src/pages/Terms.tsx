import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'
import { LegalPage } from './Policy'

const SECTIONS: { id: string; title: string; body: { type: 'p' | 'list'; text?: string; items?: string[] }[] }[] = [
  {
    id: 'acceptance',
    title: 'Using 180news',
    body: [
      {
        type: 'p',
        text: 'By opening 180news you accept these terms. If you do not accept them, please do not use the app. We may update these terms from time to time; the version on this page applies to each visit.',
      },
    ],
  },
  {
    id: 'content',
    title: 'What 180news is — and is not',
    body: [
      {
        type: 'p',
        text: '180news is a news front page. It displays headlines, short summaries and pictures exactly as publishers supply them in their public RSS feeds, and every story links to the full report on the publisher’s own website. 180news does not write, edit or verify the reporting it links to.',
      },
      {
        type: 'list',
        items: [
          'Headlines, summaries, pictures and video remain the property of the publisher that reported them.',
          'A story staying on the front page depends on what a publisher chooses to publish in its feed. A headline that drops out of a feed is removed here too.',
          'Nothing on 180news is legal, financial or medical advice.',
        ],
      },
    ],
  },
  {
    id: 'accuracy',
    title: 'Accuracy and corrections',
    body: [
      {
        type: 'p',
        text: 'We present feeds as they arrive and label copies that are not live. If a headline or summary is wrong, the correction belongs with the publisher that reported it — follow the link to their article and contact them. If you believe a headline is being shown out of context or a publisher is misattributed, tell us and we will fix the feed or remove it.',
      },
    ],
  },
  {
    id: 'elections',
    title: 'Election results and tools',
    body: [
      {
        type: 'p',
        text: 'Figures on the results pages and in the seat calculator come from the Electoral Commission of South Africa. The seat calculator shows possible coalitions for councils that have not been won outright; it is arithmetic, not a prediction, and it does not take municipal specific circumstances, coalitions agreements or by-elections into account. Always confirm final results with the Commission.',
      },
    ],
  },
  {
    id: 'reader-tools',
    title: 'Newsroom tools and your browser',
    body: [
      {
        type: 'p',
        text: 'The write-for-180news tools, the Control panel and the admin pages store everything in the browser being used — articles, pictures, adverts and team accounts included. That means:',
      },
      {
        type: 'list',
        items: [
          'What you publish shows on that device, in that browser, until it is exported as a backup and loaded elsewhere.',
          'Clearing your browser data deletes your articles and adverts permanently. Nothing is kept on our servers.',
          'Anyone with access to that device and browser can see and change that work — keep the device safe, and sign out on shared computers.',
        ],
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: [
      { type: 'p', text: 'You may link to any 180news page freely. You may not:' },
      {
        type: 'list',
        items: [
          'republish feeds, headlines or pictures from 180news as your own product, or strip the publisher attribution from them;',
          'scrape or republish the app’s pages at volume, or resell access to them;',
          'use the newsroom tools to publish unlawful content, hate speech, harassment, or anything that impersonates a real newsroom;',
          'attempt to break the app’s security, or use it to attack other sites.',
        ],
      },
    ],
  },
  {
    id: 'advertising',
    title: 'Advertising enquiries',
    body: [
      {
        type: 'p',
        text: 'The “Advertise with us” panels are an invitation to enquire, not a binding offer. Rates, formats and bookings are agreed directly with the newsroom before any advert appears.',
      },
    ],
  },
  {
    id: 'liability',
    title: 'Availability and liability',
    body: [
      {
        type: 'p',
        text: '180news is provided “as is”. Feeds, the IEC, weather and currency services can be slow, wrong or unreachable, and the app will say when it is showing saved copies rather than live data. To the extent the law allows, 180news is not liable for decisions you take on the strength of what appears here, for content on publishers’ own websites, or for any loss of the articles, adverts or settings you keep in your own browser.',
      },
    ],
  },
  {
    id: 'law',
    title: 'Governing law',
    body: [
      {
        type: 'p',
        text: 'These terms are governed by the law of the Republic of South Africa. Any dispute will be heard by a court in South Africa.',
      },
    ],
  },
]

export default function Terms() {
  useTitle('Terms & Conditions')
  const { settings } = useControl()
  return (
    <LegalPage
      kind="terms"
      title="Terms & Conditions"
      intro="The ground rules for using 180news: what the app shows, what belongs to publishers, and what you may do with it."
      sections={SECTIONS}
      email={settings.email}
      phone={settings.phone}
    />
  )
}
