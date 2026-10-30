import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Command, Moon, Search, Sun, UserRound, WifiOff } from 'lucide-react';
import { GROUPS, tabMeta } from '../config/navigation';
import AnimatedLogo from './motion/AnimatedLogo';
import { MotionToggle } from './motion/CharacterScene';

export default function Header({ activeTab, user, theme, setTheme, onOpenSettings, unreadCount = 0, onOpenNotifications, serverStatus }) {
  const meta = tabMeta(activeTab);
  const group = GROUPS[meta.group];
  const openCommandPalette = () => window.dispatchEvent(new CustomEvent('open-command-palette'));

  return (
    <header className="app-header">
      <Link className="app-header__brand" to={tabMeta('overview').canonicalPath} aria-label="GrowthTrack Home">
        <AnimatedLogo className="app-header__mark" />
        <span className="app-header__brand-copy"><strong>GrowthTrack</strong><small>Private workspace</small></span>
      </Link>
      <span className="app-header__context" data-area={meta.group} aria-label="Current area"><span aria-hidden="true">✳</span>{group?.label || 'Workspace'}</span>
      <button type="button" className="app-header__search" onClick={openCommandPalette} aria-label="Search all modules and records">
        <Search size={18} aria-hidden="true" /><span>Search GrowthTrack</span><kbd aria-hidden="true">{/Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '') ? <Command size={12} /> : 'Ctrl'} K</kbd>
      </button>
      <div className="app-header__controls">
        <MotionToggle compact />
        {serverStatus === 'offline' && <span className="app-header__status is-offline" role="status"><WifiOff size={15} aria-hidden="true" />Offline</span>}
        <button type="button" className="header-control header-control--theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </button>
        <button type="button" className="header-control" onClick={onOpenNotifications} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
          <Bell size={19} aria-hidden="true" />{unreadCount > 0 && <span className="header-control__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <button type="button" className="app-header__profile" onClick={onOpenSettings} aria-label="Open account and settings">
          <UserRound size={18} aria-hidden="true" /><span>{user?.name || 'Account'}</span>
        </button>
      </div>
    </header>
  );
}
