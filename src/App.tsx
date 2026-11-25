import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider, ControlProvider, NewsProvider, SavedProvider } from "./lib/providers";
import { BackToTop, MobileNav, PendingPill, SiteFooter, SiteHeader } from "./components";
import { HomePage } from "./pages-home";
import { LatestPage, SavedPage, SearchPage, SectionPage, StoryPage, TagPage } from "./pages-news";
import { AboutPage, NotFoundPage, PrivacyPage, TermsPage } from "./pages-info";
import { AdminAdsPage, AdminPage, AdminScheduledPage, AdminTagsPage, AdminTeamPage, ControlPage, SubmitPage } from "./pages-admin";
import { PartyResultsPage, ResultsPage, SeatsPage } from "./pages-results";

function ScrollRestore() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== "POP") {
      const el = hash ? document.getElementById(hash.slice(1)) : null;
      if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
    }
  }, [pathname, hash, navType]);
  return null;
}
function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[60] bg-navy px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <SiteHeader />
      <PendingPill />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/latest" element={<LatestPage />} />
          <Route path="/section/:slug" element={<SectionPage />} />
          <Route path="/story/:id" element={<StoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/policy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/control" element={<ControlPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/team" element={<AdminTeamPage />} />
          <Route path="/admin/ads" element={<AdminAdsPage />} />
          <Route path="/admin/scheduled" element={<AdminScheduledPage />} />
          <Route path="/admin/tags" element={<AdminTagsPage />} />
          <Route path="/tag/:tag" element={<TagPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/seats" element={<SeatsPage />} />
          <Route path="/results/party" element={<PartyResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SiteFooter />
      <MobileNav />
      <BackToTop />
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ControlProvider>
          <NewsProvider>
            <SavedProvider>
              <ScrollRestore />
              <Layout />
            </SavedProvider>
          </NewsProvider>
        </ControlProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
