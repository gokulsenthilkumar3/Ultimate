import React from 'react';

export default function Sidebar({ navItems, activeTab, setActiveTab, isOpen, setIsOpen, user }) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <span className="sidebar-brand__icon">⚡</span>
          <span className="sidebar-brand__text">ULTIMATE</span>
          <button
            className="sidebar-brand__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >×</button>
        </div>

        {/* User mini card */}
        <div className="sidebar-user">
          <div className="sidebar-user__avatar">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="sidebar-user__info">
            <span className="sidebar-user__name">{user?.name ?? 'Athlete'}</span>
            <span className="sidebar-user__sub">{user?.plan ?? 'Ultimate Plan'}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav__item ${activeTab === item.id ? 'sidebar-nav__item--active' : ''}`}
              onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setIsOpen(false); }}
            >
              <span className="sidebar-nav__icon">{item.icon}</span>
              <span className="sidebar-nav__label">{item.label}</span>
              {item.badge && <span className="badge badge--accent">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Ultimate v2.0</span>
        </div>
      </aside>
    </>
  );
}
