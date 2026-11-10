import { useState, useEffect } from 'react';
import { mockArticles, Article } from './data/mockArticles';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SidebarWidgets } from './components/SidebarWidgets';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetail } from './components/ArticleDetail';
import { RSSReader } from './components/RSSReader';
import { MobileShell } from './components/MobileShell';
import { RSSItem } from './lib/rssService';
import { Search, Flame, Bookmark, Clock, MessageSquare, Newspaper, Rss, ArrowRight, X, Home, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  // Navigation & View States
  const [activeCategory, setActiveCategory] = useState<string>('Home');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedRSSItem, setSelectedRSSItem] = useState<RSSItem | null>(null);
  const [isRSSHubActive, setIsRSSHubActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // App Modality State (Desktop vs Simulated Mobile Phone Shell)
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);

  // Bookmarking State
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // Filtered Articles
  const [filteredArticles, setFilteredArticles] = useState<Article[]>(mockArticles);

  // Sync and update filtered articles when search or category changes
  useEffect(() => {
    let result = mockArticles;

    // Filter by Category
    if (activeCategory !== 'Home' && !isRSSHubActive) {
      result = result.filter(art => art.category === activeCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(art =>
        art.title.toLowerCase().includes(query) ||
        art.subtitle.toLowerCase().includes(query) ||
        art.summary.toLowerCase().includes(query) ||
        art.category.toLowerCase().includes(query)
      );
    }

    setFilteredArticles(result);
  }, [activeCategory, searchQuery, isRSSHubActive]);

  // Handle article selection
  const handleOpenArticle = (id: string) => {
    setSelectedArticleId(id);
    setSelectedRSSItem(null);
    setIsRSSHubActive(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle RSS item selection (reads full summary/content inside our detail view)
  const handleSelectRSSItem = (item: RSSItem) => {
    setSelectedRSSItem(item);
    setSelectedArticleId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle bookmarking toggle
  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev =>
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  // Extract breaking news articles
  const breakingArticles = mockArticles.filter(art => art.isBreaking);
  const leadArticle = mockArticles.find(art => art.id === 'sa-lead-1') || mockArticles[0];
  const otherArticles = mockArticles.filter(art => art.id !== leadArticle.id);

  // Handle category selecting (resets article detail view)
  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    setSelectedArticleId(null);
    setSelectedRSSItem(null);
    setIsRSSHubActive(false);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRSSHub = () => {
    setIsRSSHubActive(true);
    setSelectedArticleId(null);
    setSelectedRSSItem(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render App Content inside either Desktop or Mobile view
  const renderCoreAppContent = () => {
    // 1. If an RSS Item is selected, show its full detail reader
    if (selectedRSSItem) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden max-w-4xl mx-auto">
          <div className="border-b border-gray-100 p-4 flex items-center justify-between bg-slate-50">
            <button
              onClick={() => setSelectedRSSItem(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-red-700 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Back to RSS Hub
            </button>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2.5 py-0.5 rounded uppercase font-sans">
              RSS Feed: {selectedRSSItem.source}
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded font-bold uppercase">
                {selectedRSSItem.category}
              </span>
              <span>•</span>
              <span>Published {new Date(selectedRSSItem.pubDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
              {selectedRSSItem.title}
            </h1>

            {selectedRSSItem.thumbnail && (
              <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm max-h-[350px]">
                <img src={selectedRSSItem.thumbnail} alt={selectedRSSItem.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-slate max-w-none text-gray-800 leading-relaxed font-serif text-base sm:text-lg">
              <p className="first-letter:text-4xl first-letter:font-extrabold first-letter:text-red-700 first-letter:mr-2 first-letter:float-left">
                {selectedRSSItem.description || selectedRSSItem.content.replace(/<[^>]*>/g, '').substring(0, 300)}
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-100 text-xs text-gray-500 italic space-y-2">
                <p>
                  This article is a live syndication from our partner publication, <strong>{selectedRSSItem.source}</strong>. 
                  180news provides brief summaries and metadata of live feeds to keep South Africans informed on-the-go.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-gray-400 font-semibold">Author: {selectedRSSItem.author || selectedRSSItem.source}</span>
              <a
                href={selectedRSSItem.link}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-4 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded transition-all flex items-center justify-center gap-1"
              >
                Read Original Full Publication on {selectedRSSItem.source}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      );
    }

    // 2. If a core 180news article is selected, show its full detail reader
    if (selectedArticleId) {
      const activeArticle = mockArticles.find(art => art.id === selectedArticleId);
      if (activeArticle) {
        const related = mockArticles
          .filter(art => art.id !== activeArticle.id && art.category === activeArticle.category)
          .slice(0, 3);
        return (
          <ArticleDetail
            article={activeArticle}
            onBack={() => setSelectedArticleId(null)}
            onArticleClick={handleOpenArticle}
            relatedArticles={related}
          />
        );
      }
    }

    // 3. If the live RSS Hub aggregator is active, render it
    if (isRSSHubActive) {
      return (
        <RSSReader
          onBackToHome={() => setIsRSSHubActive(false)}
          onSelectRSSItem={handleSelectRSSItem}
        />
      );
    }

    // 4. Default Feed Layout (Home or Specific Category Grid)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main News Content Column */}
        <div className="lg:col-span-8 space-y-8">
          {searchQuery.trim() ? (
            /* Search Results Header */
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-4 h-4 text-red-600" />
                Search Results for "{searchQuery}"
              </span>
              <span className="text-xs font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                {filteredArticles.length} matches
              </span>
            </div>
          ) : activeCategory !== 'Home' ? (
            /* Category Header */
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-700" />
                Category: {activeCategory}
              </span>
              <span className="text-xs font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                {filteredArticles.length} articles
              </span>
            </div>
          ) : null}

          {/* Grid of Articles */}
          {filteredArticles.length === 0 ? (
            /* Empty State */
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Newspaper className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No articles available</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                We couldn’t find any articles in this section matching your selection. Try checking back later or searching for other keywords.
              </p>
              <button
                onClick={() => handleSelectCategory('Home')}
                className="py-1.5 px-4 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded transition-colors cursor-pointer"
              >
                Return to Homepage
              </button>
            </div>
          ) : activeCategory === 'Home' && !searchQuery.trim() ? (
            /* Standard Homepage Layout with Hero Lead and Sub-grids */
            <div className="space-y-6">
              {/* Lead Hero Article */}
              <ArticleCard
                article={leadArticle}
                onClick={handleOpenArticle}
                layout="featured"
              />

              {/* Latest bulletins ticker list below lead */}
              <div className="bg-gradient-to-r from-red-950 to-slate-900 text-white rounded-lg p-4 border border-red-900/30 shadow-xs flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-red-500">Live Wire</span>
                </div>
                <div className="h-px w-full md:w-px md:h-6 bg-slate-800 shrink-0" />
                <div className="flex-1 text-xs font-bold text-slate-200 line-clamp-1">
                  Rand reaches strongest level in 2 years, JSE financial stocks surge on foreign buying spree.
                </div>
                <button
                  onClick={handleOpenRSSHub}
                  className="text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Enter Live RSS Hub <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Grid of secondary articles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {otherArticles.map(art => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    onClick={handleOpenArticle}
                    layout="grid"
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Category or Search Result Grid Layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredArticles.map(art => (
                <ArticleCard
                  key={art.id}
                  article={art}
                  onClick={handleOpenArticle}
                  layout="grid"
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Column (Hidden on mobile inside Mobile Shell context or adapted) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Latest Headlines Quick List Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Latest Bulletins
              </h4>
              <span className="text-[9px] text-gray-400 font-bold uppercase">10 Nov 2026</span>
            </div>

            <div className="divide-y divide-gray-100">
              {mockArticles.slice(0, 5).map((art, idx) => (
                <div
                  key={art.id}
                  onClick={() => handleOpenArticle(art.id)}
                  className="py-2.5 hover:bg-red-50/10 cursor-pointer rounded transition-colors group flex items-start gap-2.5"
                >
                  <span className="font-mono text-xs font-black text-red-600 pt-0.5">0{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{art.category}</span>
                    <h5 className="font-bold text-xs text-gray-800 leading-snug group-hover:text-red-700 transition-colors line-clamp-2">
                      {art.title}
                    </h5>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Widgets */}
          <SidebarWidgets onToggleMobileView={() => setIsMobileMode(true)} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AnimatePresence mode="wait">
        {isMobileMode ? (
          /* Mobile Phone Shell Mode */
          <motion.div
            key="mobile-shell"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <MobileShell
              onExitMobile={() => setIsMobileMode(false)}
              breakingArticle={breakingArticles[0]}
              onOpenArticle={handleOpenArticle}
            >
              {/* Inside Phone Shell Header */}
              <div className="bg-black text-white px-4 py-2 flex items-center justify-between shrink-0 border-b border-slate-900">
                <div
                  onClick={() => handleSelectCategory('Home')}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <img src="/logo.png" alt="180news" className="h-7 object-contain" />
                  <span className="text-xs font-black uppercase tracking-tighter">180° NEWS</span>
                </div>
                <button
                  onClick={handleOpenRSSHub}
                  className={`p-1 bg-slate-900 rounded text-amber-400 border border-amber-500/20 cursor-pointer flex items-center gap-1 text-[9px] font-bold ${
                    isRSSHubActive ? 'bg-amber-500 text-slate-950 font-black' : ''
                  }`}
                >
                  <Rss className="w-3 h-3" />
                  RSS Hub
                </button>
              </div>

              {/* Inside Phone Shell Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50">
                {renderCoreAppContent()}
              </div>

              {/* Inside Phone Bottom Navigation Bar */}
              <div className="h-14 bg-slate-950 border-t border-slate-800 flex items-center justify-around text-slate-400 shrink-0 select-none">
                <button
                  onClick={() => handleSelectCategory('Home')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold cursor-pointer ${
                    activeCategory === 'Home' && !isRSSHubActive && !selectedArticleId && !selectedRSSItem
                      ? 'text-red-500'
                      : 'hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>

                <button
                  onClick={handleOpenRSSHub}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold cursor-pointer ${
                    isRSSHubActive ? 'text-amber-400' : 'hover:text-white'
                  }`}
                >
                  <Rss className="w-4 h-4" />
                  <span>RSS Hub</span>
                </button>

                <button
                  onClick={() => {
                    // Quick bookmark simulator
                    alert('Bookmarking feature is active. Bookmark news by reading full articles!');
                  }}
                  className="flex flex-col items-center gap-0.5 text-[9px] font-bold cursor-pointer hover:text-white"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Bookmarks</span>
                </button>

                <button
                  onClick={() => setIsMobileMode(false)}
                  className="flex flex-col items-center gap-0.5 text-[9px] font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  <Laptop className="w-4 h-4 text-red-500" />
                  <span>Exit App</span>
                </button>
              </div>
            </MobileShell>
          </motion.div>
        ) : (
          /* Standard Full Desktop Website Mode */
          <motion.div
            key="desktop-site"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between"
          >
            <Header
              activeCategory={activeCategory}
              onSelectCategory={handleSelectCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isMobileMode={isMobileMode}
              onToggleMobileMode={() => setIsMobileMode(true)}
              breakingArticles={breakingArticles}
              onOpenArticle={handleOpenArticle}
              onOpenRSSHub={handleOpenRSSHub}
              isRSSActive={isRSSHubActive}
            />

            <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1">
              {renderCoreAppContent()}
            </main>

            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
