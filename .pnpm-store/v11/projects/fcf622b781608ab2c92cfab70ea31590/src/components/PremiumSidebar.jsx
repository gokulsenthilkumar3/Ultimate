import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GripVertical,
  LogOut,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import useStore from '../store/useStore';
import { GROUPS, GROUP_ORDER, normalizeGroupOrder, tabMeta } from '../config/navigation';
import { animateIndicator } from '../lib/navMotion';

export default function PremiumSidebar({ activeTab, setActiveTab, user, onOpenSettings, onLogout }) {
  const indicatorRef = useRef(null);
  const itemsRef = useRef({});
  const savedOrder = useStore(state => state.navigationOrder) || GROUP_ORDER;
  const databaseNavigation = useStore(state => state.appConfig?.navigation?.groups) || [];
  const runtimeGroups = useMemo(() => Object.fromEntries(Object.entries(GROUPS).map(([id, group]) => {
    const configured = databaseNavigation.find(item => item.id === id);
    return [id, configured ? { ...group, label: configured.label || group.label, tabs: configured.tabs || group.tabs } : group];
  })), [databaseNavigation]);
  const setNavigationOrder = useStore(state => state.setNavigationOrder);
  const navigationTabOrder = useStore(state => state.navigationTabOrder) || {};
  const setNavigationTabOrder = useStore(state => state.setNavigationTabOrder);
  const collapsed = useStore(state => state.sidebarCollapsed);
  const setCollapsed = useStore(state => state.setSidebarCollapsed);
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const navigationOrder = useMemo(() => normalizeGroupOrder(savedOrder), [savedOrder]);
  const ownerName = user?.name || user?.fullName || 'Owner';

  useEffect(() => {
    if (navigationOrder.join('|') !== savedOrder.join('|')) setNavigationOrder(navigationOrder);
  }, [navigationOrder, savedOrder, setNavigationOrder]);

  useEffect(() => {
    animateIndicator(indicatorRef.current, itemsRef.current[activeTab]);
  }, [activeTab, collapsed, navigationOrder, navigationTabOrder]);

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
    const tabs = [...(navigationTabOrder[groupId] || runtimeGroups[groupId].tabs)];
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

      <nav className="premium-sidebar-nav" aria-label="Modules">
        <div className="magic-indicator" ref={indicatorRef} />
        {navigationOrder.map(groupId => {
          const group = runtimeGroups[groupId];
          const savedTabs = navigationTabOrder[groupId] || [];
          const tabs = [...savedTabs.filter(tabId => group.tabs.includes(tabId)), ...group.tabs.filter(tabId => !savedTabs.includes(tabId))];
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
              <div className="sidebar-nav-group__label" aria-hidden={collapsed}>
                <GripVertical size={12} className="drag-grip" />
                <span>{group.label}</span>
              </div>
              <div className="sidebar-nav-group__items">
                {tabs.map(tabId => {
                  const meta = tabMeta(tabId);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={tabId}
                      ref={element => { itemsRef.current[tabId] = element; }}
                      className={`premium-sidebar-item ${activeTab === tabId ? 'active' : ''}`}
                      aria-current={activeTab === tabId ? 'page' : undefined}
                      aria-label={collapsed ? meta.label : undefined}
                      title={collapsed ? meta.label : 'Drag to reorder'}
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
      </nav>

      <div className="premium-sidebar-footer">
        <button className="premium-sidebar-action" onClick={onOpenSettings} title="Settings">
          <Settings size={18} /><span>Settings</span>
        </button>
        <button className="premium-sidebar-action premium-sidebar-action--danger" onClick={onLogout} title="Sign out">
          <LogOut size={18} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
