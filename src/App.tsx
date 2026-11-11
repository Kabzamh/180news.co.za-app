import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { AdminGate } from './components/AdminGate'
import { BottomTabs, Footer, NewStoriesPill } from './components/Chrome'
import { Header } from './components/Header'
import { AuthProvider } from './lib/auth'
import { ControlProvider } from './lib/control'
import { NewsProvider } from './lib/news/store'
import { SavedProvider } from './lib/saved'
import About from './pages/About'
import Admin from './pages/Admin'
import { AdminAds, AdminScheduled, AdminTags, AdminTeam } from './pages/AdminTools'
import Control from './pages/Control'
import Home from './pages/Home'
import Latest from './pages/Latest'
import NotFound from './pages/NotFound'
import PartyResults from './pages/PartyResults'
import Results from './pages/Results'
import Saved from './pages/Saved'
import Search from './pages/Search'
import SeatCalculator from './pages/SeatCalculator'
import Section from './pages/Section'
import Story from './pages/Story'
import Submit from './pages/Submit'
import Tag from './pages/Tag'

/** New pages start at the top (or at the part linked to); Back/Forward keep the browser's restored position. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    if (type === 'POP') return
    // A link to a part of a page (such as /control#ctl-articles) goes to that part.
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash, type])
  return null
}

function Shell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[60] bg-navy px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Header />
      <NewStoriesPill />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {/* Writing an article needs an account; the admin tools need an editor or the owner; the team page needs the owner. Everything else is open. */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/latest" element={<Latest />} />
          <Route path="/section/:slug" element={<Section />} />
          <Route path="/story/:id" element={<Story />} />
          <Route path="/search" element={<Search />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/about" element={<About />} />
          <Route path="/submit" element={<AdminGate area="write"><Submit /></AdminGate>} />
          <Route path="/control" element={<AdminGate><Control /></AdminGate>} />
          <Route path="/admin" element={<AdminGate area="account"><Admin /></AdminGate>} />
          <Route path="/admin/team" element={<AdminGate area="team"><AdminTeam /></AdminGate>} />
          <Route path="/admin/ads" element={<AdminGate><AdminAds /></AdminGate>} />
          <Route path="/admin/scheduled" element={<AdminGate><AdminScheduled /></AdminGate>} />
          <Route path="/admin/tags" element={<AdminGate><AdminTags /></AdminGate>} />
          <Route path="/tag/:tag" element={<Tag />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/seats" element={<SeatCalculator />} />
          <Route path="/results/party" element={<PartyResults />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BottomTabs />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ControlProvider>
        <NewsProvider>
          <SavedProvider>
            <AuthProvider>
              <ScrollManager />
              <Shell />
            </AuthProvider>
          </SavedProvider>
        </NewsProvider>
      </ControlProvider>
    </BrowserRouter>
  )
}
