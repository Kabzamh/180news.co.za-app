import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, TrendingUp, TrendingDown, Vote, Check, Sparkles, Smartphone, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Weather types and mock data
interface WeatherData {
  city: string;
  temp: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
  high: number;
  low: number;
  humidity: string;
  wind: string;
}

const WEATHER_DATA: Record<string, WeatherData> = {
  Johannesburg: { city: 'Johannesburg', temp: 24, condition: 'Sunny', high: 26, low: 14, humidity: '45%', wind: '12 km/h' },
  'Cape Town': { city: 'Cape Town', temp: 21, condition: 'Cloudy', high: 23, low: 12, humidity: '65%', wind: '28 km/h' },
  Durban: { city: 'Durban', temp: 27, condition: 'Rainy', high: 28, low: 19, humidity: '80%', wind: '18 km/h' },
  Pretoria: { city: 'Pretoria', temp: 26, condition: 'Sunny', high: 29, low: 15, humidity: '40%', wind: '10 km/h' },
  'Gqeberha (PE)': { city: 'Gqeberha (PE)', temp: 20, condition: 'Stormy', high: 22, low: 13, humidity: '72%', wind: '35 km/h' }
};

// Market types and mock data
interface MarketItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  sparkline: number[];
}

const INITIAL_MARKET_DATA: MarketItem[] = [
  { symbol: 'USD/ZAR', name: 'US Dollar / Rand', price: '17.1524', change: '-2.48%', isPositive: true, sparkline: [17.58, 17.52, 17.41, 17.30, 17.22, 17.15] }, // positive for ZAR means Rand gets stronger (price goes down, but we mark green as Rand rally!)
  { symbol: 'GBP/ZAR', name: 'UK Pound / Rand', price: '21.1450', change: '-1.95%', isPositive: true, sparkline: [21.55, 21.48, 21.35, 21.28, 21.20, 21.14] },
  { symbol: 'EUR/ZAR', name: 'Euro / Rand', price: '18.3210', change: '-2.12%', isPositive: true, sparkline: [18.70, 18.65, 18.52, 18.44, 18.38, 18.32] },
  { symbol: 'JSE ALSI', name: 'Johannesburg Stock Index', price: '84,520', change: '+1.85%', isPositive: true, sparkline: [82900, 83100, 83500, 83900, 84200, 84520] },
  { symbol: 'Gold', name: 'Gold Spot ($/oz)', price: '2,685.40', change: '+0.45%', isPositive: true, sparkline: [2670, 2672, 2678, 2680, 2682, 2685.4] },
  { symbol: 'Brent Crude', name: 'Brent Crude Oil ($/bbl)', price: '74.25', change: '-1.12%', isPositive: false, sparkline: [75.2, 74.9, 75.1, 74.6, 74.4, 74.25] }
];

export const SidebarWidgets: React.FC<{ onToggleMobileView?: () => void }> = ({ onToggleMobileView }) => {
  // Weather State
  const [selectedCity, setSelectedCity] = useState<string>('Johannesburg');
  const weather = WEATHER_DATA[selectedCity];

  // Market State (simulating small live price fluctuations)
  const [markets, setMarkets] = useState<MarketItem[]>(INITIAL_MARKET_DATA);
  useEffect(() => {
    const interval = setInterval(() => {
      setMarkets(prev =>
        prev.map(item => {
          const changePercent = (Math.random() - 0.5) * 0.1; // small random change
          const currentPrice = parseFloat(item.price.replace(/,/g, ''));
          const newPrice = currentPrice * (1 + changePercent);
          const formattedPrice = item.symbol === 'JSE ALSI'
            ? Math.round(newPrice).toLocaleString()
            : newPrice.toFixed(item.symbol.includes('ZAR') ? 4 : 2);

          const newSparkline = [...item.sparkline.slice(1), parseFloat(newPrice.toFixed(2))];

          return {
            ...item,
            price: formattedPrice,
            sparkline: newSparkline
          };
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll State
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [votes, setVotes] = useState({ yes: 485, no: 1240, unsure: 182 });
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleVote = (option: string) => {
    if (hasVoted) return;
    setSelectedOption(option);
    setVotes(prev => {
      const updated = { ...prev };
      if (option === 'yes') updated.yes += 1;
      if (option === 'no') updated.no += 1;
      if (option === 'unsure') updated.unsure += 1;
      return updated;
    });
    setHasVoted(true);
  };

  const totalVotes = votes.yes + votes.no + votes.unsure;
  const pctYes = Math.round((votes.yes / totalVotes) * 100);
  const pctNo = Math.round((votes.no / totalVotes) * 100);
  const pctUnsure = Math.round((votes.unsure / totalVotes) * 100);

  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'Sunny': return <Sun className="w-8 h-8 text-amber-500 animate-spin-slow" />;
      case 'Cloudy': return <Cloud className="w-8 h-8 text-gray-400" />;
      case 'Rainy': return <CloudRain className="w-8 h-8 text-blue-400" />;
      case 'Stormy': return <CloudLightning className="w-8 h-8 text-purple-500" />;
      default: return <Sun className="w-8 h-8 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Weather Widget */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-red-700 to-red-800 text-white px-4 py-2.5 flex justify-between items-center">
          <span className="font-bold text-sm tracking-wider uppercase font-sans">SA Weather</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-red-900/40 text-white border border-red-500/30 text-xs rounded px-2 py-1 focus:outline-none cursor-pointer"
          >
            {Object.keys(WEATHER_DATA).map(city => (
              <option key={city} value={city} className="bg-red-900 text-white">{city}</option>
            ))}
          </select>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{weather.temp}°C</div>
              <div className="text-sm font-semibold text-gray-500">{weather.condition}</div>
            </div>
            {getWeatherIcon(weather.condition)}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
            <div>
              <span className="text-gray-400 block">High / Low</span>
              <span className="font-bold text-gray-800">{weather.high}°C / {weather.low}°C</span>
            </div>
            <div>
              <span className="text-gray-400 block">Wind Speed</span>
              <span className="font-bold text-gray-800">{weather.wind}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Humidity</span>
              <span className="font-bold text-gray-800">{weather.humidity}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Precipitation</span>
              <span className="font-bold text-gray-800">
                {weather.condition === 'Rainy' ? '60%' : weather.condition === 'Stormy' ? '90%' : '10%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ZAR Exchange Rates & Markets */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-blue-950 text-white px-4 py-2.5 flex justify-between items-center">
          <span className="font-bold text-sm tracking-wider uppercase font-sans flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live ZAR Markets
          </span>
          <span className="text-[10px] text-blue-300 font-mono">Real-time ZAR updates</span>
        </div>
        <div className="p-1 divide-y divide-gray-100">
          {markets.map((item) => (
            <div key={item.symbol} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-gray-900 font-mono">{item.symbol}</span>
                  <span className={`text-[10px] font-bold px-1 rounded flex items-center gap-0.5 ${
                    item.isPositive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {item.isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {item.change}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 truncate block">{item.name}</span>
              </div>

              {/* Sparkline Chart */}
              <div className="w-16 h-8 mr-4">
                <svg className="w-full h-full" viewBox="0 0 100 30">
                  <path
                    d={`M ${item.sparkline.map((val, idx) => `${(idx / (item.sparkline.length - 1)) * 100} ${30 - ((val - Math.min(...item.sparkline)) / (Math.max(...item.sparkline) - Math.min(...item.sparkline) || 1)) * 25 - 2.5}`).join(' L ')}`}
                    fill="none"
                    stroke={item.isPositive ? '#10B981' : '#EF4444'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="text-right">
                <div className="font-bold text-xs text-gray-900 font-mono">{item.price}</div>
                <span className="text-[9px] text-gray-400 block">ZAR</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interactive Poll */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <Vote className="w-5 h-5 text-red-600" />
          <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wide">180° Opinion Poll</h4>
        </div>
        <p className="text-xs font-bold text-gray-800 mb-4 leading-relaxed">
          Do you believe Eskom’s declaration of "Stage 0" load shedding indefinitely is sustainable for South Africa’s economic growth?
        </p>

        <AnimatePresence mode="wait">
          {!hasVoted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <button
                onClick={() => handleVote('yes')}
                className="w-full py-2 px-3 text-left text-xs bg-gray-50 hover:bg-red-50 hover:text-red-700 font-semibold border border-gray-200 hover:border-red-200 rounded transition-all duration-200 cursor-pointer"
              >
                Yes, absolutely. The structural reforms are working.
              </button>
              <button
                onClick={() => handleVote('no')}
                className="w-full py-2 px-3 text-left text-xs bg-gray-50 hover:bg-red-50 hover:text-red-700 font-semibold border border-gray-200 hover:border-red-200 rounded transition-all duration-200 cursor-pointer"
              >
                No. The grid is still highly volatile and winter will test it.
              </button>
              <button
                onClick={() => handleVote('unsure')}
                className="w-full py-2 px-3 text-left text-xs bg-gray-50 hover:bg-red-50 hover:text-red-700 font-semibold border border-gray-200 hover:border-red-200 rounded transition-all duration-200 cursor-pointer"
              >
                Too early to tell. Let’s see the performance in 2027.
              </button>
              <span className="text-[10px] text-gray-400 block text-center mt-2">Total votes: {totalVotes.toLocaleString()}</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Option Yes */}
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    Yes {selectedOption === 'yes' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </span>
                  <span>{pctYes}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctYes}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${selectedOption === 'yes' ? 'bg-red-600' : 'bg-gray-400'}`}
                  />
                </div>
              </div>

              {/* Option No */}
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    No {selectedOption === 'no' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </span>
                  <span>{pctNo}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctNo}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${selectedOption === 'no' ? 'bg-red-600' : 'bg-gray-400'}`}
                  />
                </div>
              </div>

              {/* Option Unsure */}
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    Too early to tell {selectedOption === 'unsure' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </span>
                  <span>{pctUnsure}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctUnsure}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${selectedOption === 'unsure' ? 'bg-red-600' : 'bg-gray-400'}`}
                  />
                </div>
              </div>

              <div className="bg-emerald-50 text-emerald-800 text-[10px] font-medium p-2.5 rounded border border-emerald-100 mt-3 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Thank you for voting! Your voice counts. Results are shared with our editorial desk.</span>
              </div>
              <span className="text-[10px] text-gray-400 block text-center">Total votes: {(totalVotes).toLocaleString()}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. App Download Promo */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-blue-950 text-white rounded-lg shadow-sm p-4 border border-slate-800 relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-red-600/10 rounded-full blur-xl" />
        <div className="absolute -left-12 -top-12 w-32 h-32 bg-blue-600/10 rounded-full blur-xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Top Rated SA News App</span>
          </div>
          <h4 className="font-extrabold text-base tracking-tight mb-1 flex items-center gap-1.5">
            180° News Mobile App
          </h4>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            Experience fast loading speed, breaking push alerts, and offline reading on your phone.
          </p>

          <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-7 h-7 text-red-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Interactive Demo</span>
                <span className="text-xs font-bold text-white block">Simulate mobile app shell</span>
              </div>
            </div>
          </div>

          {onToggleMobileView && (
            <button
              onClick={onToggleMobileView}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Launch App Simulator
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
