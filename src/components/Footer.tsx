import React, { useState } from 'react';
import { Mail, Check, ShieldAlert, Award, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSuccess(true);
    setEmail('');
    setError('');
    setTimeout(() => setSuccess(false), 4000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs mt-12 border-t border-slate-900 shrink-0 select-none">
      {/* 1. Newsletter Signup Strip */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 border-b border-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-white text-base font-extrabold tracking-tight">Stay Informed with 180° Newsletters</h4>
            <p className="text-slate-300 text-xs">Get the biggest South African news headlines delivered to your inbox every morning.</p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full max-w-md space-y-2">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-600 focus:outline-none flex-1"
              />
              <button
                type="submit"
                className="py-2 px-4 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                Subscribe
              </button>
            </div>
            {error && <p className="text-red-500 text-[10px] font-semibold">{error}</p>}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-500/10 text-emerald-400 text-[10px] font-medium p-2 rounded border border-emerald-500/20 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  Subscription successful! Welcome to the 180news morning briefing.
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      {/* 2. Main Footer Links Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 border-b border-slate-900">
        {/* Logo and About column */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="180news" className="h-8 object-contain" />
            <div className="flex flex-col">
              <span className="text-white text-base font-black tracking-tighter leading-none">
                180<span className="text-red-600">°</span>NEWS
              </span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                180news.co.za
              </span>
            </div>
          </div>
          <p className="text-slate-500 leading-relaxed pr-6 text-xs">
            180° News is South Africa’s premier independent digital news network, delivering balanced, verified, and round-the-clock coverage of local politics, economic markets, technology, and sport.
          </p>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold bg-slate-900/40 p-2.5 rounded border border-slate-900/80 max-w-xs">
            <Award className="w-4 h-4 text-red-600 shrink-0" />
            <span>Awarded Best Independent SA Digital News Publisher 2026</span>
          </div>
        </div>

        {/* Column 2: News Sections */}
        <div className="space-y-3">
          <h5 className="text-white font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-900 pb-1">News Sections</h5>
          <ul className="space-y-2 text-slate-500 font-semibold">
            <li><a href="#" className="hover:text-red-500 transition-colors">South Africa</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">World News</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Business & Markets</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">TechCentral</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Sci-Tech</a></li>
          </ul>
        </div>

        {/* Column 3: Lifestyle & Sport */}
        <div className="space-y-3">
          <h5 className="text-white font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-900 pb-1">Lifestyle & Sport</h5>
          <ul className="space-y-2 text-slate-500 font-semibold">
            <li><a href="#" className="hover:text-red-500 transition-colors">Opinion & Columns</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Springbok Rugby</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">PSL Soccer</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Showbiz & Celebs</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Travel & Motoring</a></li>
          </ul>
        </div>

        {/* Column 4: Corporate */}
        <div className="space-y-3">
          <h5 className="text-white font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-900 pb-1">Corporate</h5>
          <ul className="space-y-2 text-slate-500 font-semibold">
            <li><a href="#" className="hover:text-red-500 transition-colors">About 180news</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Careers at 180</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Advertise with Us</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-red-500 transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>

      {/* 3. Bottom Legal & Press Council Badges */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] text-slate-600 font-semibold">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-1.5 border border-slate-900 p-1.5 rounded bg-slate-950">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-slate-500">Press Council of South Africa Member</span>
          </div>
          <p className="max-w-md">
            180° News subscribes to the Code of Ethics and Conduct for South African Print and Online Media. If we don’t live up to the Code, please contact the Public Advocate.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span>© 2026 180news (Pty) Ltd. All rights reserved. Website: <a href="https://180news.co.za" className="text-slate-400 hover:text-white">180news.co.za</a></span>
          <button
            onClick={scrollToTop}
            className="p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
          >
            Top <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
