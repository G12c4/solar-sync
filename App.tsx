import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Settings from './pages/Settings';

// Simple navigation state since we are effectively building a tab-based mobile app
enum Tab {
  Dashboard = 'dashboard',
  Insights = 'insights',
  Settings = 'settings',
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.Dashboard);

  const renderContent = () => {
    switch (currentTab) {
      case Tab.Dashboard:
        return <Dashboard />;
      case Tab.Insights:
        return <Insights />;
      case Tab.Settings:
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-background-dark shadow-2xl relative">
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24 relative">
        {renderContent()}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 pointer-events-none max-w-md mx-auto right-0">
         {/* Gradient fade above the nav */}
        <div className="h-8 bg-gradient-to-t from-background-dark to-transparent w-full"></div>
        <div className="flex items-end justify-between border-t border-[#493f22] bg-[#221e10]/95 backdrop-blur-lg px-6 pb-6 pt-3 pointer-events-auto">
          <NavButton 
            active={currentTab === Tab.Dashboard} 
            onClick={() => setCurrentTab(Tab.Dashboard)}
            icon="sunny"
            label="Dashboard"
          />
          <NavButton 
            active={currentTab === Tab.Insights} 
            onClick={() => setCurrentTab(Tab.Insights)}
            icon="bar_chart"
            label="Insights"
          />
          <NavButton 
            active={currentTab === Tab.Settings} 
            onClick={() => setCurrentTab(Tab.Settings)}
            icon="settings"
            label="Settings"
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors duration-300 ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <div className={`flex h-8 items-center justify-center transition-transform duration-300 ${active ? '-translate-y-1' : 'group-hover:-translate-y-1'}`}>
        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{icon}</span>
      </div>
      <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
    </button>
  );
};

export default App;