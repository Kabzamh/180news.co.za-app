import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { BottomTabs, Footer, NewStoriesPill } from './components/Chrome'
import { Header } from './components/Header'
import { NewsProvider } from './lib/news/store'
import { SavedProvider } from './lib/saved'
import About from './pages/About'
import Home from './pages/Home'
import Latest from './pages/Latest'
import NotFound from './pages/NotFound'
import Saved from './pages/Saved'
import Search from './pages/Search'
import Section from './pages/Section'
import Story from './pages/Story'

/** New pages start at the top; Back/Forward keep the browser's restored position. */
function ScrollManager() {
  const { pathname } = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0)
  }, [pathname, type])
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/latest" element={<Latest />} />
          <Route path="/section/:slug" element={<Section />} />
          <Route path="/story/:id" element={<Story />} />
          <Route path="/search" element={<Search />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/about" element={<About />} />
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
      <NewsProvider>
        <SavedProvider>
          <ScrollManager />
          <Shell />
        </SavedProvider>
      </NewsProvider>
    </BrowserRouter>
  )
}
