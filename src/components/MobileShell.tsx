import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, Battery, Signal, Home, Rss, Bookmark, TrendingUp, Bell, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Article } from '../data/mockArticles';

interface MobileShellProps {
  children: React.ReactNode;
  onExitMobile: () => void;
  breakingArticle?: Article;
  onOpenArticle: (id: string) => void;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children, onExitMobile, breakingArticle, onOpenArticle }) => {
  const [timeString, setTimeString] = useState<string>('09:41');
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(88);

  // Update clock every minute
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  // Show a simulated breaking news push notification 4 seconds after launching the mobile view
  useEffect(() => {
    const timer = setTimeout(() => {
      if (breakingArticle) {
        setShowNotification(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [breakingArticle]);

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-4 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* Exit Banner / Instructions */}
      <div className="mb-4 text-center z-10 max-w-md">
        <h2 className="text-white text-lg font-black tracking-tight flex items-center justify-center gap-1.5">
          <Smartphone className="w-5 h-5 text-red-500" />
          180news App Simulator
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          You are previewing the 180news mobile application. Experience live push alerts, responsive bottom navigation, and fast loading.
        </p>
        <button
          onClick={onExitMobile}
          className="mt-2.5 px-3.5 py-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-full border border-white/10 transition-colors cursor-pointer"
        >
          Switch to Desktop Website View
        </button>
      </div>

      {/* Simulated Phone Device Container */}
      <div className="relative w-full max-w-[400px] h-[820px] bg-slate-950 rounded-[50px] p-3 border-4 border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-10">
        
        {/* Speaker Bezel & Camera Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-36 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center">
          {/* Speaker grill */}
          <div className="w-12 h-1 bg-slate-800 rounded-full mb-2" />
          {/* Camera lens */}
          <div className="w-2.5 h-2.5 bg-slate-900 border border-slate-800 rounded-full absolute right-6 top-1.5" />
        </div>

        {/* Side Buttons (Visual Only) */}
        <div className="absolute left-[-4px] top-32 w-1 h-12 bg-slate-800 rounded-r-sm" />
        <div className="absolute left-[-4px] top-48 w-1 h-12 bg-slate-800 rounded-r-sm" />
        <div className="absolute right-[-4px] top-40 w-1 h-16 bg-slate-800 rounded-l-sm" />

        {/* Phone Status Bar */}
        <div className="h-10 bg-white dark:bg-slate-950 text-gray-900 dark:text-white px-6 pt-3 flex justify-between items-center text-[11px] font-bold z-40 shrink-0 select-none">
          {/* Time */}
          <span>{timeString}</span>
          
          {/* Network / Battery Icons */}
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5" />
            <span className="text-[9px]">5G</span>
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <Battery className="w-4 h-4" />
              <span className="text-[9px]">{batteryLevel}%</span>
            </div>
          </div>
        </div>

        {/* Phone Content Screen */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto rounded-[38px] flex flex-col relative">
          
          {/* Children app content */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>

          {/* Simulated Push Notification Alert */}
          <AnimatePresence>
            {showNotification && breakingArticle && (
              <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -100 }}
                transition={{ type: 'spring', damping: 15 }}
                className="absolute top-2 left-3 right-3 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-2xl z-50 flex items-start gap-3 cursor-pointer"
                onClick={() => {
                  onOpenArticle(breakingArticle.id);
                  setShowNotification(false);
                }}
              >
                <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bell className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest">BREAKING NEWS</span>
                    <span className="text-[9px] text-slate-400">Just Now</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug mt-0.5 line-clamp-2">
                    {breakingArticle.title}
                  </h4>
                  <span className="text-[9px] text-slate-400 block mt-1">Tap to read full coverage on 180news app</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotification(false);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home Indicator Bar */}
        <div className="h-6 bg-white dark:bg-slate-950 flex items-center justify-center shrink-0 z-40 select-none">
          <div className="w-32 h-1 bg-gray-300 dark:bg-slate-700 rounded-full mb-1" />
        </div>
      </div>
    </div>
  );
};
