import React, { useState, useEffect, useRef } from 'react';
import { Search, Command as CmdIcon, ArrowRight, Home } from 'lucide-react';
import useStore, { selectSetActiveTab } from '../store/useStore';
import { GLOBAL_MODULES } from '../App';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const setActiveTab = useStore(selectSetActiveTab);

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const modulesArray = Object.entries(GLOBAL_MODULES).map(([id, label]) => ({ id, label }));
  const filtered = modulesArray.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase()) || m.id.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (id) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '10vh'
    }} onClick={() => setIsOpen(false)}>
      <div 
        className="glass-card fade-in"
        style={{
          width: '90%', maxWidth: '500px', padding: 0,
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <Search size={20} color="var(--text-3)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a module..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-1)', fontSize: '1.1rem', fontFamily: 'var(--font-body)'
            }}
          />
          <div style={{ display: 'flex', gap: '4px', color: 'var(--text-3)', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>ESC</span>
            <span>to close</span>
          </div>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>
              No modules found for "{query}"
            </div>
          ) : (
            filtered.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '8px', border: 'none',
                  background: 'transparent', color: 'var(--text-1)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelect(m.id);
                  if (e.key === 'ArrowDown') e.currentTarget.nextSibling?.focus();
                  if (e.key === 'ArrowUp') e.currentTarget.previousSibling?.focus();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CmdIcon size={16} color="var(--accent)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.label}</span>
                </div>
                <ArrowRight size={14} color="var(--text-3)" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
