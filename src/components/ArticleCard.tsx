import React from 'react';
import { Clock, MessageSquare, Flame } from 'lucide-react';
import { Article } from '../data/mockArticles';

interface ArticleCardProps {
  article: Article;
  onClick: (id: string) => void;
  layout?: 'featured' | 'horizontal' | 'grid' | 'minimal';
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick, layout = 'grid' }) => {
  const { id, title, subtitle, summary, category, author, date, time, image, readTime, commentsCount, isBreaking } = article;

  // Formatting category color tags to match South African News24 style
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'South Africa': return 'text-red-700 hover:text-red-800';
      case 'Opinion': return 'text-amber-700 hover:text-amber-800';
      case 'Business': return 'text-blue-700 hover:text-blue-800';
      case 'Tech': return 'text-purple-700 hover:text-purple-800';
      case 'Sport': return 'text-emerald-700 hover:text-emerald-800';
      case 'Entertainment': return 'text-pink-700 hover:text-pink-800';
      case 'World': return 'text-indigo-700 hover:text-indigo-800';
      default: return 'text-gray-700 hover:text-gray-800';
    }
  };

  const getCategoryBg = (cat: string) => {
    switch (cat) {
      case 'South Africa': return 'bg-red-50 text-red-700 border-red-100';
      case 'Opinion': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Business': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Tech': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Sport': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Entertainment': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'World': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  if (layout === 'featured') {
    return (
      <div
        onClick={() => onClick(id)}
        className="group cursor-pointer bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:grid md:grid-cols-12 md:gap-0"
      >
        <div className="md:col-span-7 relative overflow-hidden h-[250px] sm:h-[350px] md:h-full min-h-[300px]">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          />
          {isBreaking && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded shadow-md flex items-center gap-1 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-white" />
              Breaking
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 md:hidden">
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/90 shadow-sm ${getCategoryColor(category)}`}>
              {category}
            </span>
          </div>
        </div>

        <div className="md:col-span-5 p-6 flex flex-col justify-between bg-white">
          <div className="space-y-3">
            <div className="hidden md:flex items-center justify-between">
              <span className={`text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryBg(category)}`}>
                {category}
              </span>
              <span className="text-xs text-gray-400 font-medium">{time} • {date}</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight group-hover:text-red-700 transition-colors font-sans">
              {title}
            </h2>

            <p className="text-sm text-gray-500 font-bold leading-relaxed">
              {subtitle}
            </p>

            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 hidden sm:block">
              {summary}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2.5">
              <img src={author.avatar} alt={author.name} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
              <div>
                <span className="text-xs font-bold text-gray-800 block">{author.name}</span>
                <span className="text-[10px] text-gray-400 block">{author.role}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-400 text-xs font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {readTime}
              </span>
              {commentsCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {commentsCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div
        onClick={() => onClick(id)}
        className="group cursor-pointer flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-gray-100 last:border-0"
      >
        <div className="w-24 h-20 sm:w-32 sm:h-24 shrink-0 rounded overflow-hidden relative">
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300" />
          {isBreaking && (
            <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded">
              Live
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${getCategoryColor(category)}`}>
                {category}
              </span>
              <span className="text-[10px] text-gray-400">• {time}</span>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-snug tracking-tight group-hover:text-red-700 transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
            <span>{author.name}</span>
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {commentsCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'minimal') {
    return (
      <div
        onClick={() => onClick(id)}
        className="group cursor-pointer py-2.5 border-b border-gray-100 last:border-0 hover:bg-red-50/20 px-2 rounded transition-colors"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-extrabold uppercase tracking-wider ${getCategoryColor(category)}`}>
            {category}
          </span>
          <span className="text-[9px] text-gray-400">• {time}</span>
        </div>
        <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-snug tracking-tight group-hover:text-red-700 transition-colors line-clamp-2">
          {title}
        </h4>
      </div>
    );
  }

  // Standard Grid layout
  return (
    <div
      onClick={() => onClick(id)}
      className="group cursor-pointer bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative overflow-hidden h-48">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm border ${getCategoryBg(category)}`}>
            {category}
          </span>
        </div>
        {isBreaking && (
          <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
            Breaking
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="text-[10px] text-gray-400 font-semibold">{time} • {date}</div>
          <h3 className="font-extrabold text-base text-gray-900 leading-snug tracking-tight group-hover:text-red-700 transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {summary}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-4">
          <span className="text-[10px] font-bold text-gray-600">{author.name}</span>
          <div className="flex items-center gap-2.5 text-gray-400 text-[10px] font-medium">
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {readTime}
            </span>
            {commentsCount > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {commentsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
