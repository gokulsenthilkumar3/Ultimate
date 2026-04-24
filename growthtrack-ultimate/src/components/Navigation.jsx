import React, { useState } from 'react';
import { 
  LayoutDashboard, FileText, Shield, Dumbbell, 
  Utensils, Moon, Target, CalendarDays, Scan,
  Heart, Wallet, Menu, X, ChevronRight, Zap
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Core',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'humanoid', label: '3D Humanoid', icon: Scan },
    ]
  },
  {
    title: 'Tracking',
    items: [
      { id: 'assessment', label: 'Assessment', icon: FileText },
      { id: 'physique', label: 'Physique', icon: Shield },
      { id: 'training', label: 'Training', icon: Dumbbell },
      { id: 'nutrition', label: 'Nutrition', icon: Utensils },
    ]
  },
  {
    title: 'Lifestyle',
    items: [
      { id: 'sleep', label: 'Sleep', icon: Moon },
      { id: 'lifestyle', label: 'Lifestyle', icon: Heart },
      { id: 'progress', label: 'Progress', icon: CalendarDays },
      { id: 'goals', label: 'Goals', icon: Target },
    ]
  },
  {
    title: 'Wealth',
    items: [
      { id: 'finance', label: 'Finance', icon: Wallet },
    ]
  }
];

export default function Navigation({ activeTab, onTabChange }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ item, isMobile = false }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    
    return (
      <button
        onClick={() => {
          onTabChange(item.id);
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`
          flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 group
          ${isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'}
        `}
      >
        <Icon size={20} className={`${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
        <span className=\"ml-3 font-medium\">{item.label}</span>
        {isActive && !isMobile && (
          <ChevronRight size={16} className=\"ml-auto text-blue-200\" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className=\"hidden lg:flex flex-col w-72 h-screen bg-white border-r border-gray-100 p-6 sticky top-0 overflow-y-auto\">
        <div className=\"flex items-center mb-10 px-2\">
          <div className=\"bg-blue-600 p-2 rounded-xl mr-3\">
            <Zap className=\"text-white\" size={24} fill=\"currentColor\" />
          </div>
          <h1 className=\"text-xl font-black tracking-tight text-gray-900\">
            GROWTH<span className=\"text-blue-600\">TRACK</span>
          </h1>
        </div>

        <nav className=\"flex-1 space-y-8\">
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <h2 className=\"px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4\">
                {group.title}
              </h2>
              <div className=\"space-y-1\">
                {group.items.map(item => (
                  <NavItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className=\"mt-auto pt-6 border-t border-gray-100\">
          <div className=\"bg-blue-50 rounded-2xl p-4\">
            <p className=\"text-sm font-bold text-blue-900 mb-1\">Go Premium</p>
            <p className=\"text-xs text-blue-700 mb-3\">Unlock advanced 3D insights and metabolic tracking.</p>
            <button className=\"w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors\">
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className=\"lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-50\">
        <div className=\"flex items-center\">
          <Zap className=\"text-blue-600 mr-2\" size={20} fill=\"currentColor\" />
          <span className=\"font-black text-lg\">GT</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className=\"p-2 text-gray-500 hover:bg-gray-100 rounded-lg\"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className=\"fixed inset-0 z-[60] lg:hidden\">
          <div 
            className=\"absolute inset-0 bg-gray-900/50 backdrop-blur-sm\"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className=\"absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto\">
            <div className=\"flex items-center justify-between p-6 border-b border-gray-100\">
              <span className=\"font-bold text-lg text-gray-900\">Navigation</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className=\"p-2 text-gray-500 hover:bg-gray-100 rounded-lg\"
              >
                <X size={24} />
              </button>
            </div>
            <div className=\"p-6 space-y-8\">
              {NAV_GROUPS.map(group => (
                <div key={group.title}>
                  <h2 className=\"text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4\">
                    {group.title}
                  </h2>
                  <div className=\"space-y-1\">
                    {group.items.map(item => (
                      <NavItem key={item.id} item={item} isMobile={true} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
