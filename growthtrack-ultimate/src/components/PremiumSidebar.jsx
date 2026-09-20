import React, { useMemo } from 'react';
import { Bot, Command, LogOut, Orbit, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import useStore from '../store/useStore';
import { GROUP_ORDER, normalizeGroupOrder, normalizeTabOrder, navigationGroups, ROUTE_ALIASES, tabMeta } from '../config/navigation';

const EMPTY_LIST = Object.freeze([]);
const EMPTY_ORDER = Object.freeze({});
const GROUP_HOME = Object.freeze({ money: 'finance', insights: 'insights', wellness: 'wellness', work: 'workspace', life: 'life', system: 'hub' });

export default function PremiumSidebar({ activeTab, setActiveTab, user, onOpenSettings, onLogout }) {
  const savedOrder = useStore(state => state.navigationOrder) || GROUP_ORDER;
  const databaseNavigation = useStore(state => state.appConfig?.navigation?.groups) || EMPTY_LIST;
  const runtimeGroups = useMemo(() => navigationGroups(databaseNavigation), [databaseNavigation]);
  const navigationTabOrder = useStore(state => state.navigationTabOrder) || EMPTY_ORDER;
  const collapsed = useStore(state => state.sidebarCollapsed);
  const setCollapsed = useStore(state => state.setSidebarCollapsed);
  const highlightedTab = ROUTE_ALIASES[activeTab] || activeTab;
  const activeGroup = tabMeta(highlightedTab).group || 'system';
  const navigationOrder = useMemo(() => normalizeGroupOrder(savedOrder), [savedOrder]);
  const group = runtimeGroups[activeGroup];
  const tabs = normalizeTabOrder(navigationTabOrder[activeGroup], group?.tabs || []);
  const ownerName = String(user?.name || user?.fullName || 'Owner');

  return <aside className="v2-navigation" data-collapsed={collapsed} aria-label="Application navigation">
    <div className="v2-primary-rail">
      <button className="v2-brand" onClick={() => setActiveTab('overview')} aria-label="GrowthTrack overview"><Orbit size={20} /></button>
      <nav className="v2-area-list" aria-label="Product areas">
        {navigationOrder.map(groupId => { const item = runtimeGroups[groupId]; if (!item) return null; const Icon = item.icon; return <button key={groupId} className={activeGroup === groupId ? 'is-active' : ''} aria-label={item.label} data-tooltip={`Open ${item.label}`} aria-current={activeGroup === groupId ? 'page' : undefined} onClick={() => setActiveTab(GROUP_HOME[groupId] || item.tabs[0])}><Icon size={19} /><span>{item.label}</span></button>; })}
      </nav>
      <div className="v2-rail-utilities">
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} aria-label="Open command search" data-tooltip="Search"><Command size={18} /><span>Search</span></button>
        <button onClick={() => setActiveTab('ai')} aria-label="Open Agents" data-tooltip="Agents"><Bot size={18} /><span>Agents</span></button>
        <button className="v2-owner-avatar" onClick={onOpenSettings} aria-label="Open profile" data-tooltip="Profile">{ownerName[0].toUpperCase()}</button>
      </div>
    </div>
    <div className="v2-secondary-panel">
      <header><div><small>Workspace</small><strong>{group?.label || 'GrowthTrack'}</strong></div><button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Open module navigation' : 'Close module navigation'}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></header>
      <nav aria-label={`${group?.label || 'Workspace'} modules`}>
        {tabs.map(tabId => { const meta = tabMeta(tabId); const Icon = meta.icon; return <button key={tabId} className={highlightedTab === tabId ? 'is-active' : ''} aria-current={highlightedTab === tabId ? 'page' : undefined} onClick={() => setActiveTab(tabId)}><Icon size={17} /><span><strong>{meta.label}</strong><small>{meta.description}</small></span></button>; })}
      </nav>
      <footer><button onClick={onOpenSettings}><Settings size={17} /><span>Settings</span></button><button className="is-danger" onClick={onLogout}><LogOut size={17} /><span>Sign out</span></button></footer>
    </div>
  </aside>;
}
