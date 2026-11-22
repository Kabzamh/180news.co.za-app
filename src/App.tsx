import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ControlProvider } from './lib/control'
import { NewsProvider } from './lib/news/store'
import { SavedProvider } from './lib/saved'
import { SiteHeader } from './components/Header'
import { BottomNav, SiteFooter } from './components/Chrome'
import { NewStoriesButton } from './components/Ticker'
import Home from './pages/Home'
import Latest from './pages/Latest'
import Section from './pages/Section'
import Story from './pages/Story'
import Search from './pages/Search'
import Saved from './pages/Saved'
import About from './pages/About'
import Submit from './pages/Submit'
import Admin, { AdminAds, AdminScheduled, AdminTags, AdminTeam, Control } from './pages/Admin'
import Tag from './pages/Tag'
import Results from './pages/Results'
import PartyResults from './pages/PartyResults'
import SeatCalculator from './pages/SeatCalculator'
import NotFound from './pages/NotFound'
import Policy from './pages/Policy'
import Terms from './pages/Terms'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  const action = useNavigationType()
  useEffect(() => {
    if (action !== 'POP') {
      const target = hash ? document.getElementById(hash.slice(1)) : null
      if (target) target.scrollIntoView()
      else window.scrollTo(0, 0)
    }
  }, [pathname, hash, action])
  return null
}

function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[60] bg-navy px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <SiteHeader />
      <NewStoriesButton />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/latest" element={<Latest />} />
          <Route path="/section/:slug" element={<Section />} />
          <Route path="/story/:id" element={<Story />} />
          <Route path="/search" element={<Search />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/about" element={<About />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/control" element={<Control />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/team" element={<AdminTeam />} />
          <Route path="/admin/ads" element={<AdminAds />} />
          <Route path="/admin/scheduled" element={<AdminScheduled />} />
          <Route path="/admin/tags" element={<AdminTags />} />
          <Route path="/tag/:tag" element={<Tag />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/seats" element={<SeatCalculator />} />
          <Route path="/results/party" element={<PartyResults />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ControlProvider>
          <NewsProvider>
            <SavedProvider>
              <ScrollManager />
              <AppShell />
            </SavedProvider>
          </NewsProvider>
        </ControlProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
