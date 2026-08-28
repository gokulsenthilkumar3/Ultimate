import { Z_INDEX } from '../constants';
import React from 'react';
import { Bell, Command, Moon, Search, Settings, Sun, Zap } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';
import { GROUPS, tabMeta } from '../config/navigation';

export default function Header({ activeTab, user, theme, setTheme, onOpenSettings, unreadCount = 0, onOpenNotifications, serverStatus }) {
  const meta = tabMeta(activeTab);
  const group = GROUPS[meta.group];
  const openCommandPalette = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));

  return (
    <header className="app-header" style={{ zIndex: Z_INDEX.HEADER }}>
      <div className="app-header__brand">
        <span className="app-header__mark"><Zap size={18} strokeWidth={2.6} /></span>
        <span className="app-header__brand-copy"><strong>Ultimate</strong><small>Growth operating system</small></span>
      </div>

      <div className="app-header__context" aria-label="Current workspace">
        <span>{group?.label || 'Workspace'}</span>
        <strong>{meta.label}</strong>
      </div>

      <button className="app-header__search" onClick={openCommandPalette} aria-label="Search everything">
        <Search size={15} /><span>Search everything</span><kbd><Command size={11} />K</kbd>
      </button>

      <div className="app-header__controls">
        <button className="header-control header-control--theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}<span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
        <button className="header-control" onClick={onOpenNotifications} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} title="Notifications">
          <Bell size={16} />{unreadCount > 0 && <span className="header-control__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <div className="app-header__health"><HealthScoreRing size={30} /></div>
        {serverStatus && serverStatus !== 'unknown' && <span className={`app-header__status is-${serverStatus}`}><i />{serverStatus === 'online' ? 'Synced' : 'Local'}</span>}
        <button className="app-header__profile" onClick={onOpenSettings} aria-label="Open profile and settings">
          <span><strong>{user?.name || 'Athlete'}</strong><small>Ultimate member</small></span>
          <b>{user?.name?.[0]?.toUpperCase() || 'G'}</b>
        </button>
        <button className="header-control app-header__settings" onClick={onOpenSettings} aria-label="Open settings" title="Settings"><Settings size={16} /></button>
      </div>
    </header>
  );
}
