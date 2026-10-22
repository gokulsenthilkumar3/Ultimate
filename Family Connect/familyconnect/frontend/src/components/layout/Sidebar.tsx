import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Network, Users, CalendarDays, Settings, ChevronLeft, ChevronRight, BookOpen, Image as ImageIcon } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';
import { Avatar } from '../common/Avatar';
import { NotificationBell } from '../common/NotificationBell';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tree', label: 'Family Tree', icon: Network },
  { path: '/timeline', label: 'Timeline', icon: BookOpen },
  { path: '/media', label: 'Media', icon: ImageIcon },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/events', label: 'Calendar', icon: CalendarDays },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { currentUser } = useAuthStore();
  const { currentUserRole } = useFamilyStore();

  return (
    <div 
      className={`bg-gradient-to-b from-[var(--color-navy)] to-[#050814] text-white h-screen flex flex-col transition-all duration-300 relative border-r border-white/5 shadow-2xl ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center overflow-hidden">
          <span className="text-2xl min-w-[24px]">🌳</span>
          <span 
            className={`font-bold ml-2 whitespace-nowrap transition-opacity duration-300 ${
              sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            FamilyConnect
          </span>
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-gradient-to-r from-[var(--color-saffron)] to-orange-500 text-white p-1.5 rounded-full shadow-lg shadow-orange-500/20 z-10 hover:scale-110 transition-transform border border-white/20"
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-[var(--color-saffron)] to-orange-500 text-white shadow-lg shadow-orange-500/25 font-medium translate-x-1' 
                    : 'text-gray-400 hover:bg-white/10 hover:text-white hover:translate-x-1'
                }`
              }
              title={item.label}
            >
              <Icon size={20} className="min-w-[20px]" />
              <span 
                className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
                  sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Nav & Profile */}
      <div className="p-3 border-t border-white/10 bg-white/5">
        <NavLink 
          to="/settings"
          className={({ isActive }) => 
            `w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group mb-2 ${
              isActive 
                ? 'bg-gradient-to-r from-[var(--color-saffron)] to-orange-500 text-white shadow-lg shadow-orange-500/25 font-medium' 
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`
          }
          title="Settings"
        >
          <Settings size={20} className="min-w-[20px]" />
          <span 
            className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
              sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'
            }`}
          >
            Settings
          </span>
        </NavLink>

        {currentUser && (
          <div className={`flex items-center mt-2 pt-3 border-t border-white/10 transition-all ${sidebarOpen ? 'justify-between px-2' : 'justify-center'}`}>
            <div className={`flex items-center overflow-hidden ${sidebarOpen ? '' : 'hidden'}`}>
              <Avatar name={currentUser.name} size="sm" />
              <div className="ml-2 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 capitalize truncate">{currentUserRole ? currentUserRole.replace('_', ' ') : ''}</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        )}
      </div>
    </div>
  );
};
