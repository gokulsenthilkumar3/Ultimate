import React from 'react';
import { 
  Heart, Target, LayoutDashboard, Brain, Activity, Droplets,
  Moon, Dumbbell, Stethoscope, ShoppingCart, CheckSquare,
  Briefcase, Folder, Calendar, Clock, DollarSign, Film, 
  Share2, Bot, Map, FileText, Rss, Database, AlignLeft, Settings, Info, Grid, Pin, PinOff
} from 'lucide-react';
import useStore, { selectPinnedTabs, selectTogglePinnedTab } from '../store/useStore';

const APP_MODULES = [
  { id: 'assessment',     label: 'Assessment', icon: Stethoscope, color: '#f59e0b' },
  { id: 'training',       label: 'Training', icon: Dumbbell, color: '#ef4444' },
  { id: 'nutrition',      label: 'Nutrition', icon: Heart, color: '#10b981' },
  { id: 'sleep',          label: 'Sleep', icon: Moon, color: '#8b5cf6' },
  { id: 'lifestyle',      label: 'Lifestyle', icon: Activity, color: '#3b82f6' },
  { id: 'progress',       label: 'Progress', icon: Target, color: '#f59e0b' },
  { id: 'goals',          label: 'Goals', icon: Target, color: '#f59e0b' },
  { id: 'skills',         label: 'Skills', icon: Brain, color: '#8b5cf6' },
  { id: 'shopping',       label: 'Shopping', icon: ShoppingCart, color: '#ef4444' },
  { id: 'projects',       label: 'Projects', icon: Briefcase, color: '#3b82f6' },
  { id: 'portfolio',      label: 'Portfolio', icon: Folder, color: '#10b981' },
  { id: 'calendar',       label: 'Calendar', icon: Calendar, color: '#f59e0b' },
  { id: 'timesheet',      label: 'Timesheet', icon: Clock, color: '#3b82f6' },
  { id: 'entertainment',  label: 'Entertainment', icon: Film, color: '#ef4444' },
  { id: 'social',         label: 'Social Media', icon: Share2, color: '#8b5cf6' },
  { id: 'ai',             label: 'AI Agent', icon: Bot, color: '#3b82f6' },
  { id: 'maps',           label: 'Maps', icon: Map, color: '#10b981' },
  { id: 'documents',      label: 'Documents', icon: FileText, color: '#8b5cf6' },
  { id: 'current',        label: 'Pulse/News', icon: Rss, color: '#f59e0b' },
  { id: 'notes',          label: 'Notes', icon: AlignLeft, color: '#3b82f6' },
  { id: 'databases',      label: 'Databases', icon: Database, color: '#ef4444' },
  { id: 'logs',           label: 'Logs', icon: AlignLeft, color: '#f59e0b' },
  { id: 'settings',       label: 'Settings', icon: Settings, color: '#8b5cf6' },
  { id: 'about',          label: 'About', icon: Info, color: '#10b981' },
  { id: 'dashboards',     label: 'Dashboards', icon: LayoutDashboard, color: '#ef4444' }
];

export default function AppLauncher({ setActiveTab }) {
  const pinnedTabs = useStore(selectPinnedTabs);
  const togglePinnedTab = useStore(selectTogglePinnedTab);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Application Matrix</p>
        <h2 className="text-display" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Grid size={32} /> App Hub
        </h2>
        <p className="text-secondary">Launch secondary modules and configuration interfaces.</p>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.25rem' }}>
        {APP_MODULES.map((app) => {
          const Icon = app.icon;
          const isPinned = pinnedTabs.includes(app.id);
          return (
            <div 
              key={app.id} 
              className="glass-card" 
              style={{ 
                padding: '2rem 1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '1rem', 
                cursor: 'pointer', 
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = app.color;
                e.currentTarget.style.boxShadow = `0 8px 24px ${app.color}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              }}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); togglePinnedTab(app.id); }}
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: isPinned ? 'var(--text-1)' : 'var(--text-3)', opacity: isPinned ? 1 : 0.4 }}
                title={isPinned ? "Unpin from Navigation" : "Pin to Navigation"}
              >
                {isPinned ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
              </button>

              <div 
                onClick={() => setActiveTab(app.id)}
                style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${app.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon size={24} color={app.color} />
              </div>
              <span onClick={() => setActiveTab(app.id)} style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-1)' }}>{app.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  );
}
