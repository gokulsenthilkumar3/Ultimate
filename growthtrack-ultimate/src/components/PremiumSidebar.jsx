import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronDown, GripVertical, Settings, Bell } from 'lucide-react';
import useStore from '../store/useStore';
import { GLOBAL_MODULES } from '../constants/modules';

const GROUPS = {
  today: { label: 'Today', tabs: ['overview', 'current'] }, physique: { label: 'Physique', tabs: ['physique'] },
  insights: { label: 'Insights', tabs: ['insights', 'progress', 'goals'] }, workspace: { label: 'Workspace', tabs: ['workspace'] },
  fitness: { label: 'Fitness', tabs: ['training', 'strength', 'nutrition', 'hydration'] },
  wellness: { label: 'Wellness', tabs: ['sleep', 'lifestyle', 'mind', 'medical', 'health', 'habits'] },
  money: { label: 'Money', tabs: ['finance', 'shopping', 'sip', 'portfolio'] }, social: { label: 'Social', tabs: ['social'] },
  entertainment: { label: 'Entertainment', tabs: ['entertainment'] }, tools: { label: 'Tools', tabs: ['tasks', 'projects', 'timesheet', 'skills', 'databases', 'ai', 'maps'] },
  profile: { label: 'Profile', tabs: ['profile', 'help', 'logs'] },
};

export default function PremiumSidebar({ activeTab, setActiveTab, user, onOpenSettings }) {
  const indicatorRef = useRef(null); const itemsRef = useRef({});
  const navigationOrder = useStore(s => s.navigationOrder) || Object.keys(GROUPS);
  const setNavigationOrder = useStore(s => s.setNavigationOrder);
  const navigationTabOrder = useStore(s => s.navigationTabOrder) || {};
  const setNavigationTabOrder = useStore(s => s.setNavigationTabOrder);
  const [open, setOpen] = useState({ today: true, physique: true, insights: true });
  const [dragged, setDragged] = useState(null);
  const orderedGroups = useMemo(() => navigationOrder.map(id => [id, GROUPS[id]]).filter(([, group]) => group), [navigationOrder]);

  useEffect(() => { const item = itemsRef.current[activeTab]; if (item && indicatorRef.current) gsap.to(indicatorRef.current, { y: item.offsetTop, height: item.offsetHeight, duration: .35, ease: 'power3.out' }); }, [activeTab, open]);
  const moveGroup = (targetId) => { if (!dragged || dragged.includes(':') || dragged === targetId) return; const next = [...navigationOrder]; const from = next.indexOf(dragged); const to = next.indexOf(targetId); if (from < 0 || to < 0) return; next.splice(from, 1); next.splice(to, 0, dragged); setNavigationOrder(next); setDragged(null); };
  const moveTab = (groupId, targetTab) => { if (!dragged?.includes(':')) return; const [fromGroup, fromTab] = dragged.split(':'); if (fromGroup !== groupId || fromTab === targetTab) return; const tabs = [...(navigationTabOrder[groupId] || GROUPS[groupId].tabs)]; const from = tabs.indexOf(fromTab); const to = tabs.indexOf(targetTab); if (from < 0 || to < 0) return; tabs.splice(from, 1); tabs.splice(to, 0, fromTab); setNavigationTabOrder({ ...navigationTabOrder, [groupId]: tabs }); setDragged(null); };

  return <aside className="premium-sidebar">
    <div className="premium-sidebar-header"><div className="premium-sidebar-user"><div className="premium-sidebar-avatar">{(user?.name || user?.fullName || 'U')[0].toUpperCase()}</div><div className="premium-sidebar-user-info"><span className="premium-sidebar-name">{user?.name || user?.fullName || 'Athlete'}</span><span className="premium-sidebar-plan">{user?.plan || 'Ultimate Plan'}</span></div></div></div>
    <nav className="premium-sidebar-nav" aria-label="Main navigation"><div className="magic-indicator" ref={indicatorRef} />{orderedGroups.map(([id, group]) => { const tabs = navigationTabOrder[id] || group.tabs; return <div key={id} className="sidebar-dropdown" draggable onDragStart={() => setDragged(id)} onDragOver={e => e.preventDefault()} onDrop={() => moveGroup(id)}><button className="sidebar-dropdown__header" onClick={() => setOpen(v => ({ ...v, [id]: !v[id] }))} aria-expanded={!!open[id]}><GripVertical size={13} className="drag-grip" /><span>{group.label}</span><ChevronDown size={14} className={open[id] ? 'is-rotated' : ''} /></button>{open[id] && <div className="sidebar-dropdown__items">{tabs.map(tabId => <button key={tabId} ref={el => { itemsRef.current[tabId] = el; }} draggable onDragStart={() => setDragged(`${id}:${tabId}`)} onDragOver={e => e.preventDefault()} onDrop={() => moveTab(id, tabId)} className={`premium-sidebar-item ${activeTab === tabId ? 'active' : ''}`} onClick={() => setActiveTab(tabId)}><GripVertical size={11} className="drag-grip" /><span className="premium-sidebar-label">{GLOBAL_MODULES[tabId] || tabId}</span></button>)}</div>}</div>; })}</nav>
    <div className="premium-sidebar-footer"><button className="premium-sidebar-action" onClick={() => setActiveTab('notifications')}><Bell size={18} /><span>Updates</span></button><button className="premium-sidebar-action" onClick={onOpenSettings}><Settings size={18} /><span>Settings</span></button></div>
  </aside>;
}
