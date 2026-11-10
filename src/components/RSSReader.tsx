import React, { useState, useEffect } from 'react';
import { Rss, Search, RefreshCw, ExternalLink, Calendar, User, ArrowUpRight, Wifi, WifiOff, FileText, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRSSFeed, fetchAllRSSFeeds, RSS_SOURCES, RSSItem } from '../lib/rssService';

interface RSSReaderProps {
  onBackToHome: () => void;
  onSelectRSSItem: (item: RSSItem) => void;
}

export const RSSReader: React.FC<RSSReaderProps> = ({ onBackToHome, onSelectRSSItem }) => {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveSources, setLiveSources] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch feeds
  const loadFeeds = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (selectedSource === 'all') {
        const data = await fetchAllRSSFeeds();
        setItems(data.items);
        setLiveSources(data.liveSources);
      } else {
        const data = await fetchRSSFeed(selectedSource);
        setItems(data.items);
        if (data.isLive) {
          setLiveSources(prev => Array.from(new Set([...prev, selectedSource])));
        } else {
          setLiveSources(prev => prev.filter(id => id !== selectedSource));
        }
      }
    } catch (err) {
      console.error('Error loading feeds:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, [selectedSource]);

  // Filter items by search query
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  // Format date nicely
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* RSS Header */}
      <div className="bg-gradient-to-r from-red-700 to-blue-900 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/10 rounded-lg">
                <Rss className="w-5 h-5 text-amber-400 animate-pulse" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight font-sans">
                Live South African RSS Hub
              </h2>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed max-w-xl">
              Agregating real-time news feeds directly from South Africa’s premier publications. Click any article to read full summaries, analyze sources, or read original publications.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => loadFeeds(true)}
              disabled={refreshing || loading}
              className="py-1.5 px-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Feeds'}
            </button>
            <button
              onClick={onBackToHome}
              className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit Hub
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="p-4 bg-slate-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Source Selector */}
        <div className="md:col-span-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Select Feed Source</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs font-semibold focus:border-red-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Sources Combined</option>
            {RSS_SOURCES.map(src => (
              <option key={src.id} value={src.id}>
                {src.name} ({src.category})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="md:col-span-5 relative">
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search Feed Articles</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by keyword, author, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded pl-8 pr-3 py-1.5 text-xs focus:border-red-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="md:col-span-3 flex flex-wrap gap-2 items-center justify-start md:justify-end pt-4 md:pt-0">
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2.5 py-1 text-[10px] font-bold">
            <Wifi className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>Feed Server Online</span>
          </div>
          {selectedSource !== 'all' && (
            <div className={`flex items-center gap-1.5 border rounded px-2.5 py-1 text-[10px] font-bold ${
              liveSources.includes(selectedSource)
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {liveSources.includes(selectedSource) ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live Stream</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>Cached Feed</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feed Content */}
      <div className="p-4 sm:p-6 bg-white min-h-[400px]">
        {loading ? (
          /* Skeleton Loading State */
          <div className="space-y-4">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row gap-4 animate-pulse">
                <div className="w-full sm:w-40 h-28 bg-gray-200 rounded shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-3.5 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No articles match your criteria</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              We couldn’t find any RSS items matching "{searchQuery}". Try clearing your search query or choosing a different source.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedSource('all'); }}
              className="py-1.5 px-4 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* RSS Items List */
          <div className="space-y-4">
            {filteredItems.map((item, index) => {
              const sourceInfo = RSS_SOURCES.find(s => s.name === item.source);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.4) }}
                  key={item.id}
                  className="group border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-red-300 hover:shadow-xs transition-all flex flex-col sm:flex-row"
                >
                  {/* Thumbnail Image */}
                  <div className="w-full sm:w-40 h-32 sm:h-auto shrink-0 relative overflow-hidden bg-slate-100">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`text-[9px] font-extrabold text-white px-2 py-0.5 rounded uppercase tracking-wider ${
                        sourceInfo?.color || 'bg-slate-700'
                      }`}>
                        {item.source}
                      </span>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400">
                        <span className="text-red-700 uppercase tracking-wider">{item.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.pubDate)}
                        </span>
                        {item.author && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <User className="w-3 h-3" />
                              {item.author}
                            </span>
                          </>
                        )}
                      </div>

                      <h3
                        onClick={() => onSelectRSSItem(item)}
                        className="font-extrabold text-sm sm:text-base text-gray-900 leading-snug tracking-tight group-hover:text-red-700 transition-colors cursor-pointer line-clamp-2"
                      >
                        {item.title}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                      <button
                        onClick={() => onSelectRSSItem(item)}
                        className="text-[11px] font-extrabold text-red-700 hover:text-red-800 flex items-center gap-1 transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Read Summary
                      </button>

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-extrabold text-blue-900 hover:text-blue-950 flex items-center gap-1 transition-colors uppercase tracking-wider"
                      >
                        Read Original
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
