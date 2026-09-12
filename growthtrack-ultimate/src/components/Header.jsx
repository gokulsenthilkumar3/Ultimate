import { Z_INDEX } from '../constants';
import React, { useState } from 'react';
import { Bell, Command, Moon, Search, Settings, Sun, Zap } from 'lucide-react';
import HealthScoreRing from './HealthScoreRing';
import { GROUPS, tabMeta } from '../config/navigation';
import useStore from '../store/useStore';

export default function Header({ activeTab, setActiveTab, user, theme, setTheme, onOpenSettings, unreadCount = 0, onOpenNotifications, serverStatus }) {
  const meta = tabMeta(activeTab);
  const group = GROUPS[meta.group];
  const tabOrder = useStore(s => s.navigationTabOrder) || {};
  const setTabOrder = useStore(s => s.setNavigationTabOrder);
  const [draggedTab, setDraggedTab] = useState(null);
  const financeTabs = ['Overview','Analytics','Trends','Budgeting','Subscriptions','Portfolio','SIP','Shopping','Sync'];
  const orderedTabs = meta.group === 'money' && activeTab === 'finance' ? financeTabs : (group ? [...(tabOrder[meta.group] || []), ...group.tabs.filter(id => !(tabOrder[meta.group] || []).includes(id))].filter(id => group.tabs.includes(id)) : []);
  const moveTab = (targetId) => {
    if (!draggedTab || draggedTab === targetId || !group) return;
    const sourceGroup = Object.entries(GROUPS).find(([, g]) => g.tabs.includes(draggedTab))?.[0];
    if (!sourceGroup) return;
    const sourceTabs = [...(tabOrder[sourceGroup] || GROUPS[sourceGroup].tabs)].filter(id => id !== draggedTab);
    const targetTabs = sourceGroup === meta.group ? sourceTabs : [...(tabOrder[meta.group] || GROUPS[meta.group].tabs)].filter(id => id !== draggedTab);
    const index = targetTabs.indexOf(targetId);
    targetTabs.splice(index < 0 ? targetTabs.length : index, 0, draggedTab);
    setTabOrder?.({ ...tabOrder, [sourceGroup]: sourceTabs, [meta.group]: targetTabs });
    setDraggedTab(null);
  };
  const openCommandPalette = () => window.dispatchEvent(new CustomEvent('open-command-palette'));

  return (
    <header className="app-header" style={{ zIndex: Z_INDEX.HEADER, flexWrap: 'wrap' }}>
      <div className="app-header__brand">
        <span className="app-header__mark"><Zap size={18} strokeWidth={2.6} /></span>
        <span className="app-header__brand-copy"><strong>Ultimate</strong><small>Growth operating system</small></span>
      </div>

      <div className="app-header__context" aria-label="Current workspace">
        <span>{group?.label || 'Workspace'}</span>
        <strong>{group?.tabs?.[0] === activeTab ? `${group.label} Command` : meta.label}</strong>
      </div>

      <button className="app-header__search" onClick={openCommandPalette} aria-label="Search everything">
        <Search size={15} /><span>Search everything</span><kbd><Command size={11} />K</kbd>
      </button>

      <div className="app-header__controls">
        <button className="header-control app-header__mobile-search" onClick={openCommandPalette} aria-label="Search everything" title="Search everything"><Search size={18} /></button>
        <button className="header-control header-control--theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}<span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
        <button className="header-control" onClick={onOpenNotifications} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} title="Notifications">
          <Bell size={16} />{unreadCount > 0 && <span className="header-control__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <div className="app-header__health"><HealthScoreRing size={30} /></div>
        {serverStatus && serverStatus !== 'unknown' && <span className={`app-header__status is-${serverStatus}`} role="status" aria-live="polite" title={serverStatus === 'online' ? 'Workspace connected' : 'Workspace connection unavailable'}><i aria-hidden="true" />{serverStatus === 'online' ? 'Connected' : 'Offline'}</span>}
        <button className="app-header__profile" onClick={onOpenSettings} aria-label="Open profile and settings">
          <span><strong>{user?.name || 'Athlete'}</strong><small>Ultimate member</small></span>
          <b>{user?.name?.[0]?.toUpperCase() || 'G'}</b>
        </button>
        <button className="header-control app-header__settings" onClick={onOpenSettings} aria-label="Open settings" title="Settings"><Settings size={16} /></button>
      </div>
    </header>
  );
}
