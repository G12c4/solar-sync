import React, { useState, useEffect } from 'react';

interface SavedLocation {
  name: string;
  lat: number;
  lon: number;
  countryCode?: string;
}

const SKIN_TYPES = [
  { id: 'Type I', label: 'Type I', desc: 'Pale white; burns always, never tans.' },
  { id: 'Type II', label: 'Type II', desc: 'White; burns easily, tans poorly.' },
  { id: 'Type III', label: 'Type III', desc: 'Cream white; burns sometimes, tans uniformly.' },
  { id: 'Type IV', label: 'Type IV', desc: 'Light brown; burns minimally, tans easily.' },
  { id: 'Type V', label: 'Type V', desc: 'Moderate brown; rarely burns, tans very easily.' },
  { id: 'Type VI', label: 'Type VI', desc: 'Dark brown/black; never burns, tans always.' },
];

const CHRONOTYPES = [
  { id: 'Lion', label: 'Lion (Early)', desc: 'Wakes up early, most productive in the morning.' },
  { id: 'Bear', label: 'Bear (Medium)', desc: 'Follows solar cycle, energy peaks mid-day.' },
  { id: 'Wolf', label: 'Wolf (Late)', desc: 'Wakes up late, most productive in the evening.' },
  { id: 'Dolphin', label: 'Dolphin (Irregular)', desc: 'Light sleeper, irregular energy patterns.' },
];

const Settings: React.FC = () => {
  const [usePreciseLocation, setUsePreciseLocation] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  const [skinType, setSkinType] = useState(SKIN_TYPES[2]);
  const [chronotype, setChronotype] = useState(CHRONOTYPES[1]);

  const [activeModal, setActiveModal] = useState<'skin' | 'chronotype' | 'location' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SavedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    const savedLocation = localStorage.getItem('solar-sync-location');
    const savedSkinType = localStorage.getItem('solar-sync-skin-type');
    const savedChronotype = localStorage.getItem('solar-sync-chronotype');
    const usePrecise = localStorage.getItem('solar-sync-use-precise');

    if (savedLocation) {
      setSelectedLocation(JSON.parse(savedLocation));
    }
    if (savedSkinType) {
      const found = SKIN_TYPES.find(s => s.id === savedSkinType);
      if (found) setSkinType(found);
    }
    if (savedChronotype) {
      const found = CHRONOTYPES.find(c => c.id === savedChronotype);
      if (found) setChronotype(found);
    }
    if (usePrecise !== null) {
      setUsePreciseLocation(usePrecise === 'true');
    }
  }, []);

  const searchCities = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results.map((r: any) => ({
          name: `${r.name}, ${r.country_code}`,
          lat: r.latitude,
          lon: r.longitude,
          countryCode: r.country_code
        })));
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (loc: SavedLocation) => {
    setSelectedLocation(loc);
    setActiveModal(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSave = () => {
    if (usePreciseLocation) {
      localStorage.removeItem('solar-sync-location');
    } else if (selectedLocation) {
      localStorage.setItem('solar-sync-location', JSON.stringify(selectedLocation));
    }
    localStorage.setItem('solar-sync-use-precise', String(usePreciseLocation));
    localStorage.setItem('solar-sync-skin-type', skinType.id);
    localStorage.setItem('solar-sync-chronotype', chronotype.id);

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <div className="min-h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col relative">
      <header className="flex items-center justify-between px-4 py-3 bg-surface-dark/50 backdrop-blur-md sticky top-0 z-20 border-b border-[#493f22]">
        <div className="w-12"></div>
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <button 
          onClick={handleSave}
          className="w-12 text-primary font-semibold text-sm hover:opacity-80 transition-opacity"
        >
          Save
        </button>
      </header>

      {showSavedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg z-50 animate-[fadeIn_0.2s_ease-out]">
          Settings saved
        </div>
      )}

      <div className="px-4 py-6">
        
        <div className="mb-6">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 ml-1">Personalization</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-[#493f22]">
            
            <ButtonItem 
              icon="face" 
              iconColor="text-pink-400" 
              iconBg="bg-pink-500/20" 
              title="Skin Type" 
              value={skinType.id}
              valueColor="text-primary"
              onClick={() => setActiveModal('skin')}
              border
            />

            <ButtonItem 
              icon="schedule" 
              iconColor="text-purple-400" 
              iconBg="bg-purple-500/20" 
              title="Chronotype" 
              value={chronotype.label.split(' (')[0]}
              valueColor="text-text-muted"
              onClick={() => setActiveModal('chronotype')}
            />
            
          </div>
          <p className="text-[11px] text-text-muted mt-2 px-2 leading-relaxed opacity-80">
             Your skin type helps us calculate safe sun exposure durations. Your chronotype optimizes wake-up and wind-down suggestions.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 ml-1">Location & Privacy</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-[#493f22]">
            <ToggleItem 
              icon="my_location" 
              iconColor="text-blue-400" 
              iconBg="bg-blue-500/20" 
              title="Precise Location" 
              subtitle={usePreciseLocation ? "Using GPS" : "Manual Selection"} 
              checked={usePreciseLocation}
              onChange={() => setUsePreciseLocation(!usePreciseLocation)}
              border={!usePreciseLocation}
            />

            {!usePreciseLocation && (
              <ButtonItem 
                icon="edit_location" 
                iconColor="text-orange-400" 
                iconBg="bg-orange-500/20" 
                title="Set Location" 
                value={selectedLocation?.name || 'Tap to search'}
                valueColor={selectedLocation ? "text-white" : "text-white/40"}
                onClick={() => setActiveModal('location')}
                border
              />
            )}
            
            <button className="w-full flex items-center justify-between p-4 active:bg-[#493f22]/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <span className="text-sm font-medium text-white">Privacy Policy</span>
              </div>
              <span className="material-symbols-outlined text-text-muted text-[20px] group-hover:text-white transition-colors">open_in_new</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pb-8 opacity-50">
          <span className="material-symbols-outlined text-3xl text-primary mb-2">wb_sunny</span>
          <p className="text-xs text-text-muted font-medium">Solar Sync v2.4.2</p>
        </div>
      </div>

      {activeModal === 'skin' && (
        <SelectionModal 
          title="Select Skin Type" 
          options={SKIN_TYPES} 
          selectedId={skinType.id} 
          onSelect={(opt) => { setSkinType(opt); setActiveModal(null); }} 
          onClose={() => setActiveModal(null)} 
        />
      )}

      {activeModal === 'chronotype' && (
        <SelectionModal 
          title="Select Chronotype" 
          options={CHRONOTYPES} 
          selectedId={chronotype.id} 
          onSelect={(opt) => { setChronotype(opt); setActiveModal(null); }} 
          onClose={() => setActiveModal(null)} 
        />
      )}

      {activeModal === 'location' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => { setActiveModal(null); setSearchQuery(''); setSearchResults([]); }}>
          <div className="bg-[#2d2616] border border-[#493f22] rounded-2xl w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-white font-bold text-lg">Select Location</h3>
              <button onClick={() => { setActiveModal(null); setSearchQuery(''); setSearchResults([]); }} className="p-1 rounded-full hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-white/70">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); searchCities(e.target.value); }}
                  placeholder="Search city..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-primary rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {searchQuery.length >= 2 && searchResults.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider px-2 py-1">Search Results</p>
                  {searchResults.map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectLocation(loc)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-white/40">location_on</span>
                      <span className="text-white text-sm">{loc.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-white/40 text-sm">
                  No cities found
                </div>
              )}

              {searchQuery.length < 2 && (
                <div className="text-center py-8 text-white/30 text-sm">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface ToggleItemProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: () => void;
  border?: boolean;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ icon, iconColor, iconBg, title, subtitle, checked, onChange, border }) => (
  <div className={`flex items-center justify-between p-4 ${border ? 'border-b border-[#493f22]' : ''}`}>
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="text-xs text-text-muted">{subtitle}</span>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-[#493f22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
  </div>
);

interface ButtonItemProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  value: string;
  valueColor: string;
  border?: boolean;
  onClick?: () => void;
}

const ButtonItem: React.FC<ButtonItemProps> = ({ icon, iconColor, iconBg, title, value, valueColor, border, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 active:bg-[#493f22]/50 transition-colors group ${border ? 'border-b border-[#493f22]' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <span className="text-sm font-medium text-white">{title}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
      <span className="material-symbols-outlined text-text-muted text-[20px] group-hover:text-white transition-colors">chevron_right</span>
    </div>
  </button>
);

interface SelectionModalProps {
  title: string;
  options: any[];
  selectedId: string;
  onSelect: (item: any) => void;
  onClose: () => void;
}

const SelectionModal: React.FC<SelectionModalProps> = ({ title, options, selectedId, onSelect, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-[#2d2616] border-t sm:border border-[#493f22] rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/5 transition-colors"><span className="material-symbols-outlined">close</span></button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pb-4">
        {options.map((opt) => (
          <button 
            key={opt.id} 
            onClick={() => onSelect(opt)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${opt.id === selectedId ? 'bg-primary/10 border-primary' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-center mb-1">
                <span className={`font-bold ${opt.id === selectedId ? 'text-primary' : 'text-white'}`}>{opt.label}</span>
                {opt.id === selectedId && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
            </div>
            <p className="text-xs text-white/50">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default Settings;
