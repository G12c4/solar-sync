import React, { useState, useRef, useEffect, useMemo } from 'react';

type WeatherType = 'Sunny' | 'Cloudy' | 'Rain' | 'Snow' | 'Night';

interface SavedLocation {
  name: string;
  lat: number;
  lon: number;
  countryCode?: string;
}

const WEATHER_CONFIG: Record<WeatherType, { icon: string; desc: string; color: string }> = {
  Sunny: { icon: 'wb_sunny', desc: 'Clear', color: 'text-yellow-400' },
  Cloudy: { icon: 'cloud', desc: 'Cloudy', color: 'text-white' },
  Rain: { icon: 'rainy', desc: 'Rain', color: 'text-blue-400' },
  Snow: { icon: 'ac_unit', desc: 'Snow', color: 'text-white' },
  Night: { icon: 'bedtime', desc: 'Clear Night', color: 'text-blue-200' },
};

const Dashboard: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);

  // Location State
  const [locationName, setLocationName] = useState('London, UK');
  const [isLoading, setIsLoading] = useState(true);

  // Real Data State
  const [dailyData, setDailyData] = useState<{
    time: string[];
    sunrise: string[];
    sunset: string[];
  } | null>(null);

  const [hourlyData, setHourlyData] = useState<{
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    uv_index: number[];
  } | null>(null);

  // 1. Load saved location or get user location on Mount
  useEffect(() => {
    const saved = localStorage.getItem('solar-sync-location');
    const usePrecise = localStorage.getItem('solar-sync-use-precise');
    
    if (usePrecise !== 'false' && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchLocationName(latitude, longitude);
          fetchWeatherData(latitude, longitude);
        },
        (error) => {
          console.warn("Geolocation denied or error:", error);
          if (saved) {
            const loc: SavedLocation = JSON.parse(saved);
            setLocationName(loc.name);
            fetchWeatherData(loc.lat, loc.lon);
          } else {
            fetchWeatherData(51.5074, -0.1278);
            setIsLoading(false);
          }
        }
      );
    } else if (saved) {
      const loc: SavedLocation = JSON.parse(saved);
      setLocationName(loc.name);
      fetchWeatherData(loc.lat, loc.lon);
    } else {
      fetchWeatherData(51.5074, -0.1278);
      setIsLoading(false);
    }
  }, []);

  // 2. Fetch City Name from coords
  const fetchLocationName = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const data = await res.json();
      if (data.city || data.locality) {
        setLocationName(`${data.city || data.locality}, ${data.countryCode}`);
      }
    } catch (e) {
      console.error("Could not fetch city name", e);
      setLocationName("Current Location");
    }
  };

  // 7. Fetch Comprehensive Weather Data (Daily + Hourly)
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setIsLoading(true);
      // Fetch 7 days of forecast. 
      // hourly: temp, weathercode, uv_index
      // daily: sunrise, sunset
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode,uv_index&daily=sunrise,sunset&timezone=auto&forecast_days=7`);
      const data = await res.json();
      
      if (data.daily) {
        setDailyData(data.daily);
      }
      if (data.hourly) {
        setHourlyData(data.hourly);
      }

    } catch (error) {
      console.error("Failed to fetch weather data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Convert WMO code to our internal type
  const getWeatherType = (code: number, isNight: boolean): WeatherType => {
    if (isNight && (code === 0 || code === 1)) return 'Night';
    if (code === 0 || code === 1) return 'Sunny';
    if (code <= 48) return 'Cloudy';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 85 && code <= 86) return 'Snow';
    return 'Rain';
  };

  // --- Solar Time Calculations ---
  
  // Helper to parse ISO time (2023-10-27T06:42) to minutes from midnight
  const getMinutesFromIso = (isoString: string) => {
    const date = new Date(isoString);
    return date.getHours() * 60 + date.getMinutes();
  };

  const { sunriseMins, sunsetMins, dateLabel, dateIsoString } = useMemo(() => {
    // Format selected date to YYYY-MM-DD
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const selectedDateStr = `${year}-${month}-${day}`;

    let sRise = 6 * 60 + 30; 
    let sSet = 18 * 60 + 30;

    if (dailyData) {
      const index = dailyData.time.indexOf(selectedDateStr);
      if (index !== -1) {
        sRise = getMinutesFromIso(dailyData.sunrise[index]);
        sSet = getMinutesFromIso(dailyData.sunset[index]);
      }
    }

    const label = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return { 
        sunriseMins: sRise, 
        sunsetMins: sSet, 
        dateLabel: label,
        dateIsoString: selectedDateStr
    };
  }, [selectedDate, dailyData]);

  const TOTAL_DAY_MINS = sunsetMins - sunriseMins;
  
  // Current real time in minutes
  const now = new Date();
  const CURRENT_TIME_MINS = now.getHours() * 60 + now.getMinutes();

  // "Simulated" or "Real" Progress
  // 0 = Sunrise, 1 = Sunset. <0 Pre-dawn, >1 Post-sunset.
  const defaultProgress = (CURRENT_TIME_MINS - sunriseMins) / TOTAL_DAY_MINS;
  const progress = isDragging && dragProgress !== null ? dragProgress : defaultProgress;

  // --- Derived Real-Time Data (The Core Logic) ---
  const { timeString, period, info, tip, stats, currentWeather, currentTemp } = useMemo(() => {
    // 1. Calculate the specific minute of the day we are visualizing
    let currentTotalMins = Math.round(sunriseMins + (progress * TOTAL_DAY_MINS));
    
    // Normalize logic
    while (currentTotalMins < 0) currentTotalMins += 1440;
    while (currentTotalMins >= 1440) currentTotalMins -= 1440;

    const hours = Math.floor(currentTotalMins / 60);
    const mins = currentTotalMins % 60;
    
    // Time Strings
    const p = hours >= 12 ? 'PM' : 'AM';
    const h = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const m = mins.toString().padStart(2, '0');

    // 2. Find closest Hourly Data point
    // We construct an ISO timestamp string for the selected date + current hour to find the index
    let activeTemp = 0;
    let activeUV = 0;
    let activeCode = 0;
    
    if (hourlyData) {
        // Find the index in the hourly array that matches the selected date and current hour
        // Format: "YYYY-MM-DDTHH:00"
        const hourStr = hours.toString().padStart(2, '0');
        const searchIso = `${dateIsoString}T${hourStr}:00`;
        
        // Find closest match (Open-Meteo returns clean hourly intervals)
        const dataIndex = hourlyData.time.findIndex(t => t.startsWith(searchIso));
        
        if (dataIndex !== -1) {
            activeTemp = Math.round(hourlyData.temperature_2m[dataIndex]);
            activeUV = hourlyData.uv_index[dataIndex];
            activeCode = hourlyData.weathercode[dataIndex];
        } else {
            // Fallback: try to find data for *today* at this hour if date match fails
            // (Simulates persistent weather if navigating way future)
            activeTemp = 20;
            activeUV = 0;
            activeCode = 1;
        }
    }

    // Determine if it is effectively "Night" for the icon (before sunrise or after sunset)
    const isNightTime = currentTotalMins < sunriseMins || currentTotalMins > sunsetMins;
    const weatherType = getWeatherType(activeCode, isNightTime);
    const weatherConfig = WEATHER_CONFIG[weatherType];

    // 3. Construct Stats & Info
    
    // UV Level text
    let uvLevel = "Low";
    if (activeUV >= 3) uvLevel = "Moderate";
    if (activeUV >= 6) uvLevel = "High";
    if (activeUV >= 8) uvLevel = "Very High";
    if (activeUV >= 11) uvLevel = "Extreme";
    if (activeUV === 0) uvLevel = "None";

    // Vitamin D Logic (Real Data)
    // General consensus: You need UVB. UVB is typically present when UV Index >= 3.
    let vitDStatus = { val: "Inactive", sub: "UV Index too low", active: false };
    if (activeUV >= 3) {
        vitDStatus = { val: "Synthesizing", sub: "Optimal production", active: true };
    } else if (activeUV >= 1 && activeUV < 3) {
        vitDStatus = { val: "Low", sub: "Inefficient production", active: false };
    }

    // Dynamic Phase Info
    const clampedProgress = Math.max(0, Math.min(1, progress));
    let currentInfo = { title: "Solar Day", sub: "Tracking solar position." };
    let currentTip = "Monitor light exposure for better sleep.";

    if (progress < 0) {
        currentInfo = { title: "Pre-Dawn", sub: "Melatonin is peaking." };
        currentTip = "Keep environments dark to preserve sleep quality until wake time.";
    } else if (progress > 1) {
        currentInfo = { title: "Post-Sunset", sub: "Melatonin production begins." };
        currentTip = "Avoid blue light now. Use warm lighting to prepare for bed.";
    } else {
        // Daylight phases
        if (clampedProgress < 0.2) {
            currentInfo = { title: "Sunrise Phase", sub: "Critical for circadian reset." };
            currentTip = "Get 10-30 mins of light now to anchor your wake/sleep cycle.";
        } else if (clampedProgress < 0.4) {
            currentInfo = { title: "Morning Rise", sub: "Cortisol is elevating naturally." };
            currentTip = "Great time for caffeine or exercise. Alertness is rising.";
        } else if (clampedProgress < 0.6) {
             currentInfo = { title: "Solar Noon", sub: "Sun is at highest elevation." };
             currentTip = activeUV > 5 ? "UV is high. Limit direct exposure or use protection." : "Take a walk. Brightest light of the day.";
        } else if (clampedProgress < 0.8) {
             currentInfo = { title: "Afternoon", sub: "Natural energy dip." };
             currentTip = "Naps should be <20 mins. A walk is better than caffeine now.";
        } else {
             currentInfo = { title: "Sunset Phase", sub: "Signal to body day is ending." };
             currentTip = "View the sunset. The color spectrum signals safety to your brain.";
        }
    }

    // Weather override on tip
    if (weatherType === 'Rain') {
        currentTip = "Rainy day? Indoor lighting is often too dim. Sit by a window.";
    }

    // Next Event Logic
    let nextEvent = { name: "Sunset", time: "--:--", sub: "remaining", icon: "bedtime" };
    
    // We calculate time difference relative to the current simulated time
    if (currentTotalMins < sunriseMins) {
        const diff = sunriseMins - currentTotalMins;
        const hDiff = Math.floor(diff / 60);
        const mDiff = diff % 60;
        nextEvent = { name: "Sunrise", time: `${hDiff}h ${mDiff}m`, sub: "until dawn", icon: "wb_twilight" };
    } else if (currentTotalMins < sunsetMins) {
        const diff = sunsetMins - currentTotalMins;
        const hDiff = Math.floor(diff / 60);
        const mDiff = diff % 60;
        nextEvent = { name: "Sunset", time: `${hDiff}h ${mDiff}m`, sub: "remaining", icon: "bedtime" };
    } else {
        // Time until next sunrise (approx 24h cycle)
        const diff = (1440 - currentTotalMins) + sunriseMins;
        const hDiff = Math.floor(diff / 60);
        const mDiff = diff % 60;
        nextEvent = { name: "Sunrise", time: `${hDiff}h ${mDiff}m`, sub: "until tomorrow", icon: "wb_twilight" };
    }

    return {
      timeString: `${h}:${m}`,
      period: p,
      info: currentInfo,
      tip: currentTip,
      stats: {
        uv: { val: activeUV.toFixed(1), level: uvLevel },
        vitD: vitDStatus,
        nextEvent
      },
      currentWeather: weatherConfig,
      currentTemp: activeTemp
    };
  }, [progress, sunriseMins, sunsetMins, selectedDate, hourlyData, dateIsoString]);


  // Interaction Logic
  const handleMove = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 360 / rect.width;
    const scaleY = 180 / rect.height; 
    
    const dx = (clientX - rect.left) * scaleX - 180;
    const dy = (clientY - rect.top) * scaleY - 160;

    let angle = Math.atan2(dy, dx);
    if (angle > 0) angle = dx < 0 ? -Math.PI : 0;
    
    let newProgress = (angle + Math.PI) / Math.PI;
    newProgress = Math.max(0, Math.min(1, newProgress));
    
    setDragProgress(newProgress);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      handleMove(clientX, clientY);
    };

    const onEnd = () => {
      setIsDragging(false);
      setDragProgress(null); 
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const isAfterSunset = progress > 1;
  const isBeforeSunrise = progress < 0;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  const sunAngle = -Math.PI + (clampedProgress * Math.PI);
  const sunRx = 180 + 140 * Math.cos(sunAngle);
  const sunRy = 160 + 140 * Math.sin(sunAngle);
  
  const visualProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = 440 * (1 - visualProgress);

  const sunColor = "#f4c025";
  const moonColor = "#a0aec0";

  return (
    <div className="min-h-full bg-gradient-to-b from-[#231e10] to-[#15120a] text-white pb-6 select-none relative">
      {/* Header */}
      <header className="flex items-start justify-between px-6 pt-12 pb-4 z-20 relative">
        <div className="flex flex-col cursor-pointer" onClick={() => setIsForecastModalOpen(true)}>
          <div className="flex items-center gap-1 group">
            <span className="material-symbols-outlined text-white/40 group-hover:text-white/90 text-[14px] transition-colors">location_on</span>
            <h1 className="text-white text-xl font-bold tracking-tight max-w-[200px] truncate">{locationName}</h1>
          </div>
          <h2 className="text-white/60 group-hover:text-white/90 text-xs font-medium tracking-wider uppercase transition-colors">{dateLabel}</h2>
        </div>

        {/* Real-time Weather Widget (Updates on Drag!) */}
        <div className={`flex flex-col items-end transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-2">
                <span className="text-2xl font-light tracking-tight">{currentTemp}°</span>
                <span className={`material-symbols-outlined text-2xl ${currentWeather.color}`}>{currentWeather.icon}</span>
            </div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wide">
                {currentWeather.desc}
            </span>
        </div>
      </header>

      {/* Calendar Modal */}
      {isCalendarOpen && (
        <CalendarModal 
          selectedDate={selectedDate} 
          onSelect={(date) => { setSelectedDate(date); setIsCalendarOpen(false); }} 
          onClose={() => setIsCalendarOpen(false)} 
        />
      )}

      {/* 7-Day Forecast Modal */}
      {isForecastModalOpen && (
        <ForecastModal
          dailyData={dailyData}
          selectedDate={selectedDate}
          onSelect={(date) => { setSelectedDate(date); setIsForecastModalOpen(false); }}
          onClose={() => setIsForecastModalOpen(false)}
        />
      )}

      {/* Solar Arc Visualization */}
      <div className="relative flex flex-col items-center justify-center pt-8 pb-4">
        {/* Static Background Glow */}
        <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 ${currentWeather.desc !== 'Clear' ? 'opacity-30' : 'opacity-100'}`}></div>
        
        <div className="relative w-[340px] h-[180px] flex items-end justify-center">
          <svg 
            ref={svgRef}
            className="overflow-visible touch-none" 
            height="180" 
            viewBox="0 0 360 180" 
            width="340"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
             {/* Background Arc */}
            <path d="M 40 160 A 140 140 0 0 1 320 160" fill="none" stroke="rgba(255,255,255,0.1)" strokeLinecap="round" strokeWidth="2"></path>
            
            {/* Ticks */}
            <g className="opacity-30 text-white" style={{ transformOrigin: '180px 160px' }}>
              <rect fill="currentColor" height="6" width="1" x="179.5" y="20"></rect>
              <rect fill="currentColor" height="6" transform="rotate(-45 180 160)" width="1" x="179.5" y="20"></rect>
              <rect fill="currentColor" height="6" transform="rotate(45 180 160)" width="1" x="179.5" y="20"></rect>
              <rect fill="currentColor" height="6" transform="rotate(-90 180 160)" width="1" x="179.5" y="20"></rect>
              <rect fill="currentColor" height="6" transform="rotate(90 180 160)" width="1" x="179.5" y="20"></rect>
            </g>

            {/* Active Sun Path */}
            <path 
              d="M 40 160 A 140 140 0 0 1 320 160" 
              fill="none" 
              stroke="#f4c025" 
              strokeLinecap="round" 
              strokeWidth="4" 
              style={{ strokeDasharray: 440, strokeDashoffset: strokeDashoffset, transition: isDragging ? 'none' : 'stroke-dashoffset 0.5s ease-out' }}
            ></path>
            
            {/* Sun/Moon Orb - Interactive Group */}
            <g 
              style={{ transform: `translate(${sunRx}px, ${sunRy}px)`, transition: isDragging ? 'none' : 'transform 0.5s ease-out' }}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              className="cursor-grab active:cursor-grabbing"
            >
              <circle cx="0" cy="0" r="40" fill="transparent"></circle>
              {isAfterSunset ? (
                <>
                  <circle cx="0" cy="0" fill={moonColor} r="12" className="filter drop-shadow-[0_0_10px_rgba(160,174,192,0.6)]"></circle>
                  <circle cx="0" cy="0" fill={moonColor} fillOpacity="0.3" r="20"></circle>
                </>
              ) : (
                <>
                  <circle cx="0" cy="0" fill={sunColor} r="14" className={`filter drop-shadow-[0_0_15px_rgba(244,192,37,0.8)] transition-all ${isDragging ? 'r-[16px] drop-shadow-[0_0_25px_rgba(244,192,37,1)]' : ''}`}></circle>
                  <circle cx="0" cy="0" fill={sunColor} fillOpacity="0.3" r="22" className={`transition-all ${isDragging ? 'r-[26px]' : ''}`}></circle>
                </>
              )}
            </g>
            
            {/* Horizon Line */}
            <line stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" strokeWidth="1" x1="20" x2="340" y1="160" y2="160"></line>
            
            {/* Times */}
            <text fill="white" fontFamily="Inter" fontSize="14" fontWeight="700" x="25" y="178">
              {Math.floor(sunriseMins/60).toString().padStart(2,'0')}:{Math.floor(sunriseMins%60).toString().padStart(2,'0')}
            </text>
            <text fill="white" fontFamily="Inter" fontSize="14" fontWeight="700" textAnchor="end" x="335" y="178">
              {Math.floor(sunsetMins/60).toString().padStart(2,'0')}:{Math.floor(sunsetMins%60).toString().padStart(2,'0')}
            </text>
          </svg>

          {/* Time Display */}
          <div className="absolute bottom-[-15px] flex flex-col items-center z-10 pointer-events-none">
            <div className={`px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider mb-2 backdrop-blur-sm transition-all ${isDragging ? 'bg-primary text-black border-primary scale-110' : ''}`}>
               {isDragging ? 'Simulating' : 'Current Time'}
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-xl flex items-baseline">
              {timeString}<span className="text-xl font-medium text-white/50 ml-1">{period}</span>
            </h2>
          </div>
        </div>

        <div className="mt-10 text-center px-6 h-14 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-white mb-1 transition-all">{info.title}</h3>
          <p className="text-white/60 text-sm transition-all">{info.sub}</p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-4 mt-6">
        {/* UV Index */}
        <div className="bg-[#2d2616]/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden h-full group transition-colors hover:bg-[#2d2616]/60">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="material-symbols-outlined text-lg">wb_twilight</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">UV Index</span>
          </div>
          <div>
            <span className="text-3xl font-bold text-white block">{stats.uv.val}</span>
            <span className={`text-sm font-medium ${stats.uv.level === 'High' || stats.uv.level === 'Very High' || stats.uv.level === 'Extreme' ? 'text-primary' : 'text-white/50'}`}>{stats.uv.level}</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, (Number(stats.uv.val) / 11) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Vitamin D */}
        <div className="bg-[#2d2616]/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden h-full transition-colors hover:bg-[#2d2616]/60">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="material-symbols-outlined text-lg">vital_signs</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Vitamin D</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white leading-tight block">{stats.vitD.val}</span>
            <span className="text-white/40 text-[10px] block mt-1">{stats.vitD.sub}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-auto">
            <span className={`block w-2 h-2 rounded-full ${stats.vitD.active ? 'bg-primary animate-pulse' : 'bg-white/20'}`}></span>
            <span className={`${stats.vitD.active ? 'text-primary' : 'text-white/30'} text-xs font-medium`}>
              {stats.vitD.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Next Event */}
        <div className="col-span-2 bg-[#2d2616]/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden transition-colors hover:bg-[#2d2616]/60">
          <div className="flex flex-col gap-1 z-10">
            <div className="flex items-center gap-2 text-white/70 mb-1">
              <span className="material-symbols-outlined text-lg">{stats.nextEvent.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Next: {stats.nextEvent.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tabular-nums tracking-tight">{stats.nextEvent.time}</span>
              <span className="text-white/40 text-sm">{stats.nextEvent.sub}</span>
            </div>
          </div>
          {/* Graphic */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#ff6b6b] to-[#2d2616] flex items-center justify-center shadow-lg border border-white/5 overflow-hidden">
             <div className="absolute bottom-0 w-full h-1/2 bg-[#2d2616] z-10"></div>
             <div className="w-8 h-8 rounded-full bg-[#f4c025] translate-y-1 shadow-[0_0_15px_#f4c025]"></div>
          </div>
        </div>
      </div>

      {/* Tip Box */}
      <div className="px-4">
        <div className="bg-[#342d18] border border-[#493f22] rounded-xl p-4 flex gap-4 items-start shadow-sm transition-all duration-300">
          <div className="p-2 bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined">lightbulb</span>
          </div>
          <div>
            <h4 className="text-white text-sm font-bold mb-1">Circadian Tip</h4>
            <p className="text-white/70 text-xs leading-relaxed transition-opacity duration-300">{tip}</p>
          </div>
        </div>
      </div>
      
      {/* Space for bottom nav */}
      <div className="h-6"></div>
    </div>
  );
};

// --- Calendar Sub-component ---
interface CalendarModalProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ selectedDate, onSelect, onClose }) => {
  const today = new Date();
  // Ensure we are working with clean dates (no time)
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Max date is 7 days from today
  const maxDate = new Date(todayZero);
  maxDate.setDate(todayZero.getDate() + 7);

  // Generate calendar days
  // We'll show a 2-week simplified view or just the current month logic
  // Let's do a standard month view but disable invalid dates
  
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Previous month filler
  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push({ day: null, date: null });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentYear, currentMonth, i);
    days.push({ day: i, date: d });
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const isSelectable = (d: Date) => {
    // Only allow Today -> Today + 7
    return d >= todayZero && d <= maxDate;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="bg-[#2d2616] border border-[#493f22] rounded-2xl w-full max-w-sm p-4 shadow-2xl z-10 animate-[scaleIn_0.2s_ease-out]">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-white font-bold text-lg">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-white/70">close</span>
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-white/30 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((item, idx) => {
            if (!item.date) return <div key={idx} className="aspect-square"></div>;
            
            const isSelected = isSameDay(item.date, selectedDate);
            const isToday = isSameDay(item.date, today);
            const selectable = isSelectable(item.date);
            
            return (
              <button
                key={idx}
                disabled={!selectable}
                onClick={() => item.date && onSelect(item.date)}
                className={`
                  aspect-square rounded-full flex flex-col items-center justify-center relative text-sm font-medium transition-all
                  ${isSelected ? 'bg-primary text-black font-bold scale-105 shadow-lg shadow-primary/20' : ''}
                  ${!isSelected && selectable ? 'text-white hover:bg-white/10' : ''}
                  ${!selectable ? 'text-white/10 cursor-not-allowed' : ''}
                  ${!isSelected && isToday ? 'border border-primary text-primary' : ''}
                `}
              >
                {item.day}
                {/* Dot for today if not selected */}
                {!isSelected && isToday && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary"></div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/40">Data available for the next 7 days</p>
        </div>
      </div>
    </div>
  );
};

// --- Forecast Modal Sub-component ---
interface ForecastModalProps {
  dailyData: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  } | null;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const ForecastModal: React.FC<ForecastModalProps> = ({ dailyData, selectedDate, onSelect, onClose }) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDayLabel = (dateStr: string, index: number) => {
    if (dateStr === todayStr) return 'Today';
    const date = new Date(dateStr);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDayLength = (sunrise: string, sunset: string) => {
    const rise = new Date(sunrise);
    const set = new Date(sunset);
    const diffMs = set.getTime() - rise.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-[#2d2616] border border-[#493f22] rounded-2xl w-full max-w-sm shadow-2xl z-10 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-white font-bold text-lg">7-Day Sun Forecast</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-white/70">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {dailyData ? (
            dailyData.time.map((dateStr, idx) => {
              const sunrise = dailyData.sunrise[idx];
              const sunset = dailyData.sunset[idx];
              const date = new Date(dateStr);
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={idx}
                  onClick={() => onSelect(date)}
                  className={`w-full p-3 rounded-xl mb-2 transition-all text-left ${
                    isSelected 
                      ? 'bg-primary/20 border border-primary' 
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>
                      {formatDayLabel(dateStr, idx)}
                    </span>
                    <span className="text-xs text-white/40">
                      {getDayLength(sunrise, sunset)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">wb_twilight</span>
                      <span className="text-white/70">{formatTime(sunrise)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">{formatTime(sunset)}</span>
                      <span className="material-symbols-outlined text-blue-300 text-[18px]">bedtime</span>
                    </div>
                  </div>
                  {isToday && !isSelected && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <span className="text-[10px] text-primary font-medium">CURRENT DAY</span>
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-white/40">
              Loading forecast...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;