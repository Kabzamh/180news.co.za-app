import React, { useState, useEffect } from 'react';
import { Search, Rss, Smartphone, Laptop, Menu, X, Calendar, Cloud, TrendingUp, Bell, MapPin } from 'lucide-react';
import { Article } from '../data/mockArticles';

interface HeaderProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobileMode: boolean;
  onToggleMobileMode: () => void;
  breakingArticles: Article[];
  onOpenArticle: (id: string) => void;
  onOpenRSSHub: () => void;
  isRSSActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  isMobileMode,
  onToggleMobileMode,
  breakingArticles,
  onOpenArticle,
  onOpenRSSHub,
  isRSSActive
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBreakingIdx, setCurrentBreakingIdx] = useState(0);
  const [dateTimeStr, setDateTimeStr] = useState('');

  const categories = [
    'Home',
    'South Africa',
    'Opinion',
    'Business',
    'Tech',
    'Sport',
    'Entertainment',
    'World'
  ];

  // Rotate breaking news articles every 6 seconds
  useEffect(() => {
    if (breakingArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBreakingIdx(prev => (prev + 1) % breakingArticles.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [breakingArticles]);

  // Set current date string
  useEffect(() => {
    // Current date is locked to Tuesday, 10 November 2026 per context instructions
    setDateTimeStr('Tuesday, 10 November 2026');
  }, []);

  const activeBreaking = breakingArticles[currentBreakingIdx];

  return (
    <header className="w-full shrink-0 select-none">
      {/* 1. Top Ticker Utility Bar */}
      <div className="bg-slate-950 text-slate-300 text-[11px] py-2 px-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date */}
          <span className="flex items-center gap-1 text-slate-400 font-semibold font-sans">
            <Calendar className="w-3.5 h-3.5" />
            {dateTimeStr}
          </span>

          {/* Quick Weather Ticker */}
          <span className="hidden sm:flex items-center gap-1.5 text-slate-400 border-l border-slate-800 pl-4">
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Johannesburg: <strong className="text-white font-mono">24°C</strong></span>
            <span className="text-slate-600">|</span>
            <span>Cape Town: <strong className="text-white font-mono">21°C</strong></span>
          </span>

          {/* Quick ZAR Ticker */}
          <span className="hidden md:flex items-center gap-1.5 text-slate-400 border-l border-slate-800 pl-4">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>USD/ZAR: <strong className="text-white font-mono">17.15</strong></span>
            <span className="text-slate-600">|</span>
            <span>JSE Index: <strong className="text-white font-mono">84,520</strong></span>
          </span>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          {/* Live RSS Indicator */}
          <button
            onClick={onOpenRSSHub}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all uppercase tracking-wider border cursor-pointer ${
              isRSSActive
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-400 hover:border-amber-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${isRSSActive ? 'animate-ping' : ''}`} />
            Live RSS Hub
          </button>

          {/* Mobile/Desktop toggle */}
          <button
            onClick={onToggleMobileMode}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 text-[10px] font-extrabold transition-all uppercase tracking-wider cursor-pointer"
          >
            {isMobileMode ? (
              <>
                <Laptop className="w-3 h-3" />
                Desktop View
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3" />
                App View
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Logo & Search Bar */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo Reconstructed/Copied */}
        <div
          onClick={() => { onSelectCategory('Home'); }}
          className="flex items-center gap-2 cursor-pointer shrink-0"
        >
          {/* We display the uploaded logo image. It integrates perfectly because the header background is black! */}
          <img
            src="/logo.png"
            alt="180news"
            className="h-10 sm:h-12 md:h-14 object-contain"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Text fallback if image is hidden or fails */}
          <div className="flex flex-col select-none" id="fallback-logo-text">
            <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase leading-none font-sans flex items-center">
              <span className="text-red-600">180</span>
              <span className="text-red-600 text-xs align-top relative -top-2">°</span>
              <span className="text-blue-500 ml-1">NEWS</span>
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              180news.co.za
            </span>
          </div>
        </div>

        {/* Search Input bar */}
        <div className="relative max-w-md flex-1 hidden sm:block">
          <input
            type="text"
            placeholder="Search breaking news, opinions, sport..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-red-600 focus:outline-none focus:bg-slate-950 transition-all"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Mobile menu triggers */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300 cursor-pointer"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 3. Category Navigation Bar (Desktop) */}
      <nav className="bg-white border-b border-gray-200 shadow-2xs hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex space-x-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat);
                  setIsMenuOpen(false);
                }}
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat && !isRSSActive
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-red-700 hover:border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenRSSHub}
            className={`py-3.5 px-4 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              isRSSActive
                ? 'border-amber-500 text-amber-600 bg-amber-500/5'
                : 'border-transparent text-slate-600 hover:text-amber-500'
            }`}
          >
            <Rss className="w-4 h-4 text-amber-500" />
            Live RSS Feed Hub
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer (Dropdown) */}
      {isMenuOpen && (
        <div className="sm:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat);
                  setIsMenuOpen(false);
                }}
                className={`py-2 px-3 text-left font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer ${
                  activeCategory === cat && !isRSSActive
                    ? 'bg-red-700 text-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => {
                onOpenRSSHub();
                setIsMenuOpen(false);
              }}
              className={`py-2 px-3 text-left font-extrabold text-xs uppercase tracking-wider rounded transition-all cursor-pointer col-span-2 flex items-center justify-center gap-1.5 ${
                isRSSActive
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-amber-400 border border-amber-500/20 hover:bg-slate-800'
              }`}
            >
              <Rss className="w-3.5 h-3.5" />
              Live RSS Feed Hub
            </button>
          </div>
        </div>
      )}

      {/* 4. Breaking News Banner */}
      {activeBreaking && (
        <div className="bg-red-700 text-white text-xs py-2.5 px-4 flex items-center justify-between gap-3 shadow-md relative z-10 border-b border-red-800">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="bg-white text-red-700 px-2 py-0.5 rounded font-black uppercase tracking-widest text-[10px] shrink-0 animate-pulse flex items-center gap-1">
              <Bell className="w-3 h-3 text-red-700 fill-current" />
              Breaking
            </span>
            <div
              onClick={() => onOpenArticle(activeBreaking.id)}
              className="font-bold hover:underline cursor-pointer truncate flex-1 text-slate-50 md:text-sm select-text"
            >
              {activeBreaking.title}
            </div>
          </div>
          <button
            onClick={() => onOpenArticle(activeBreaking.id)}
            className="text-[10px] font-black uppercase tracking-widest bg-red-900 hover:bg-red-950 px-2.5 py-1 rounded shrink-0 transition-colors cursor-pointer hidden sm:block"
          >
            Read More
          </button>
        </div>
      )}
    </header>
  );
};
