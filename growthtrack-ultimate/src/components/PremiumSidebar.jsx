import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GripVertical,
  LogOut,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import useStore from '../store/useStore';
import { GROUP_ORDER, normalizeGroupOrder, normalizeTabOrder, navigationGroups, ROUTE_ALIASES, tabMeta } from '../config/navigation';
import { animateIndicator } from '../lib/navMotion';
const EMPTY_LIST = Object.freeze([]);
const EMPTY_ORDER = Object.freeze({});

export default function PremiumSidebar({ activeTab, setActiveTab, user, onOpenSettings, onLogout }) {
  const indicatorRef = useRef(null);
  const itemsRef = useRef({});
  const savedOrder = useStore(state => state.navigationOrder) || GROUP_ORDER;
  const databaseNavigation = useStore(state => state.appConfig?.navigation?.groups) || EMPTY_LIST;
  const runtimeGroups = useMemo(() => navigationGroups(databaseNavigation), [databaseNavigation]);
  const highlightedTab = ROUTE_ALIASES[activeTab] || activeTab;
  const setNavigationOrder = useStore(state => state.setNavigationOrder);
  const navigationTabOrder = useStore(state => state.navigationTabOrder) || EMPTY_ORDER;
  const setNavigationTabOrder = useStore(state => state.setNavigationTabOrder);
  const collapsed = useStore(state => state.sidebarCollapsed);
  const setCollapsed = useStore(state => state.setSidebarCollapsed);
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const activeGroup = tabMeta(highlightedTab).group;
  const navigationOrder = useMemo(() => normalizeGroupOrder(savedOrder), [savedOrder]);
  const ownerName = String(user?.name || user?.fullName || 'Owner');

  useEffect(() => {
    if (!Array.isArray(savedOrder) || navigationOrder.join('|') !== savedOrder.join('|')) setNavigationOrder(navigationOrder);
  }, [navigationOrder, savedOrder, setNavigationOrder]);

  useEffect(() => {
    animateIndicator(indicatorRef.current, itemsRef.current[highlightedTab]);
  }, [highlightedTab, collapsed, navigationOrder, navigationTabOrder, expandedGroups, query]);

  const finishDrag = () => {
    setDragged(null);
    setDropTarget(null);
  };

  const moveGroup = targetId => {
    if (!dragged || dragged.includes(':') || dragged === targetId) return finishDrag();
    const next = [...navigationOrder];
    const from = next.indexOf(dragged);
    const to = next.indexOf(targetId);
    if (from >= 0 && to >= 0) {
      next.splice(from, 1);
      next.splice(to, 0, dragged);
      setNavigationOrder(next);
    }
    finishDrag();
  };

  const moveTab = (groupId, targetTab) => {
    if (!dragged?.includes(':')) return finishDrag();
    const [fromGroup, fromTab] = dragged.split(':');
    if (fromGroup !== groupId || fromTab === targetTab) return finishDrag();
    const tabs = normalizeTabOrder(navigationTabOrder[groupId], runtimeGroups[groupId].tabs);
    const from = tabs.indexOf(fromTab);
    const to = tabs.indexOf(targetTab);
    if (from >= 0 && to >= 0) {
      tabs.splice(from, 1);
      tabs.splice(to, 0, fromTab);
      setNavigationTabOrder({ ...navigationTabOrder, [groupId]: tabs });
    }
    finishDrag();
  };

  return (
    <aside className="premium-sidebar" data-collapsed={collapsed} aria-label="Application navigation">
      <div className="premium-sidebar-header">
        <div className="premium-sidebar-brand">
          <span><Orbit size={19} /></span>
          <div><strong>GrowthTrack</strong><small>Ultimate OS</small></div>
          <button
            className="sidebar-collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <button className="premium-sidebar-user" onClick={onOpenSettings} title="Open owner profile">
          <span className="premium-sidebar-avatar">{ownerName[0].toUpperCase()}</span>
          <span className="premium-sidebar-user-info">
            <span className="premium-sidebar-name">{ownerName}</span>
            <span className="premium-sidebar-plan">Private owner workspace</span>
          </span>
        </button>
      </div>

      {!collapsed && <label className="sidebar-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a tool…" aria-label="Search navigation" />{query && <button onClick={() => setQuery('')} aria-label="Clear navigation search"><X size={14} /></button>}</label>}
      <nav className="premium-sidebar-nav" aria-label="Modules">
        <div className="magic-indicator" ref={indicatorRef} />
        {navigationOrder.map(groupId => {
          const group = runtimeGroups[groupId];
          const tabs = normalizeTabOrder(navigationTabOrder[groupId], group.tabs).filter(id => {
            const meta = tabMeta(id);
            return `${group.label} ${meta.label} ${meta.keywords.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
          });
          if (!tabs.length) return null;
          const expanded = collapsed || Boolean(query.trim()) || (expandedGroups[groupId] ?? groupId === activeGroup);
          const GroupIcon = group.icon;
          return (
            <section
              key={groupId}
              className="sidebar-nav-group"
              data-dragging={dragged === groupId}
              data-drop-target={dropTarget === groupId}
              draggable={!collapsed}
              onDragStart={() => setDragged(groupId)}
              onDragEnd={finishDrag}
              onDragEnter={() => setDropTarget(groupId)}
              onDragOver={event => event.preventDefault()}
              onDrop={() => moveGroup(groupId)}
            >
              <button className="sidebar-nav-group__label sidebar-group-toggle" aria-hidden={collapsed} tabIndex={collapsed ? -1 : 0} aria-expanded={expanded} aria-controls={`sidebar-group-${groupId}`} onClick={() => setExpandedGroups(current => ({ ...current, [groupId]: !expanded }))}>
                <GroupIcon size={15} />
                <span>{group.label}</span>
                <ChevronDown size={14} className="sidebar-group-chevron" />
              </button>
              <div id={`sidebar-group-${groupId}`} className="sidebar-nav-group__items" hidden={!expanded}>
                {tabs.map(tabId => {
                  const meta = tabMeta(tabId);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={tabId}
                      ref={element => { itemsRef.current[tabId] = element; }}
                      className={`premium-sidebar-item ${highlightedTab === tabId ? 'active' : ''}`}
                      aria-current={highlightedTab === tabId ? 'page' : undefined}
                      aria-label={collapsed ? meta.label : undefined}
                      title={meta.label}
                      draggable={!collapsed}
                      onDragStart={event => { event.stopPropagation(); setDragged(`${groupId}:${tabId}`); }}
                      onDragEnd={finishDrag}
                      onDragEnter={() => setDropTarget(`${groupId}:${tabId}`)}
                      onDragOver={event => event.preventDefault()}
                      onDrop={event => { event.stopPropagation(); moveTab(groupId, tabId); }}
                      data-dragging={dragged === `${groupId}:${tabId}`}
                      data-drop-target={dropTarget === `${groupId}:${tabId}`}
                      onClick={() => setActiveTab(tabId)}
                    >
                      <GripVertical size={11} className="drag-grip" />
                      <Icon size={17} className="premium-sidebar-icon" />
                      <span className="premium-sidebar-label">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {query.trim() && !Object.values(runtimeGroups).some(group => group.tabs.some(id => { const meta = tabMeta(id); return `${group.label} ${meta.label} ${meta.keywords.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()); })) && <p className="sidebar-search-empty" role="status">No tools found. Try “tasks”, “sleep”, or “budget”.</p>}
      </nav>

      <div className="premium-sidebar-footer">
        <button className="premium-sidebar-action" onClick={onOpenSettings} title="Settings" aria-label="Settings">
          <Settings size={18} /><span>Settings</span>
        </button>
        <button className="premium-sidebar-action premium-sidebar-action--danger" onClick={onLogout} title="Sign out" aria-label="Sign out">
          <LogOut size={18} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
