import React from 'react';
import { 
  Heart, Target, LayoutDashboard, Brain, Activity, Droplets,
  Moon, Dumbbell, Stethoscope, ShoppingCart, CheckSquare,
  Briefcase, Folder, Calendar, Clock, DollarSign, Film, 
  Share2, Bot, Map, FileText, Rss, Database, AlignLeft, Settings, Info, Grid, Pin, PinOff,
  Shield, Zap, Wallet, Menu, TrendingUp
} from 'lucide-react';
import useStore, { selectPinnedTabs, selectTogglePinnedTab } from '../store/useStore';

const GROUPS = [
  {
    title: 'Command',
    icon: LayoutDashboard,
    color: '#3b82f6',
    modules: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#3b82f6' },
      { id: 'dashboards', label: 'Hubs', icon: Menu, color: '#ef4444' },
      { id: 'logs', label: 'Logs', icon: AlignLeft, color: '#f59e0b' },
      { id: 'about', label: 'About', icon: Info, color: '#8b5cf6' },
    ]
  },
  {
    title: 'Physiology',
    icon: Shield,
    color: '#10b981',
    modules: [
      { id: 'humanoid', label: '3D Model', icon: Zap, color: '#10b981' },
      { id: 'physique', label: 'Blueprint', icon: Shield, color: '#3b82f6' },
      { id: 'training', label: 'Training', icon: Dumbbell, color: '#ef4444' },
      { id: 'nutrition', label: 'Nutrition', icon: Heart, color: '#10b981' },
      { id: 'assessment', label: 'Assessment', icon: Stethoscope, color: '#f59e0b' },
      { id: 'medical', label: 'Medical', icon: Stethoscope, color: '#8b5cf6' },
      { id: 'strength', label: 'Strength', icon: Dumbbell, color: '#f59e0b' },
      { id: 'hydration', label: 'Hydration', icon: Droplets, color: '#3b82f6' },
    ]
  },
  {
    title: 'Lifestyle',
    icon: Heart,
    color: '#8b5cf6',
    modules: [
      { id: 'sleep', label: 'Sleep', icon: Moon, color: '#8b5cf6' },
      { id: 'lifestyle', label: 'Lifestyle', icon: Activity, color: '#3b82f6' },
      { id: 'mind', label: 'Mind & Wellness', icon: Brain, color: '#8b5cf6' },
      { id: 'goals', label: 'Goals', icon: Target, color: '#f59e0b' },
      { id: 'progress', label: 'Progress', icon: Target, color: '#f59e0b' },
      { id: 'health', label: 'Health+', icon: Zap, color: '#ef4444' },
      { id: 'skills', label: 'Skills', icon: Brain, color: '#8b5cf6' },
      { id: 'analytics', label: 'Analytics', icon: Activity, color: '#10b981' },
      { id: 'forecast', label: 'Forecast', icon: TrendingUp, color: '#f59e0b' },
    ]
  },
  {
    title: 'Operations',
    icon: Wallet,
    color: '#f59e0b',
    modules: [
      { id: 'tasks', label: 'Tasks', icon: Zap, color: '#ef4444' },
      { id: 'finance', label: 'Finance', icon: Wallet, color: '#10b981' },
      { id: 'projects', label: 'Projects', icon: Briefcase, color: '#3b82f6' },
      { id: 'timesheet', label: 'Timesheet', icon: Clock, color: '#3b82f6' },
      { id: 'calendar', label: 'Calendar', icon: Calendar, color: '#f59e0b' },
      { id: 'shopping', label: 'Shopping', icon: ShoppingCart, color: '#ef4444' },
      { id: 'current', label: 'Current', icon: Rss, color: '#8b5cf6' },
      { id: 'sip', label: 'SIP Calc', icon: DollarSign, color: '#10b981' },
    ]
  },
  {
    title: 'Library',
    icon: FileText,
    color: '#64748b',
    modules: [
      { id: 'entertainment', label: 'Media', icon: Film, color: '#ef4444' },
      { id: 'notes', label: 'Notes', icon: AlignLeft, color: '#3b82f6' },
      { id: 'documents', label: 'Docs', icon: FileText, color: '#8b5cf6' },
      { id: 'databases', label: 'Data', icon: Database, color: '#ef4444' },
      { id: 'portfolio', label: 'Portfolio', icon: Folder, color: '#10b981' },
      { id: 'social', label: 'Social', icon: Share2, color: '#8b5cf6' },
      { id: 'ai', label: 'AI Agent', icon: Bot, color: '#3b82f6' },
      { id: 'maps', label: 'Maps', icon: Map, color: '#10b981' },
      { id: 'settings', label: 'Settings', icon: Settings, color: '#64748b' },
    ]
  }
];

export default function AppLauncher({ setActiveTab }) {
  const pinnedTabs = useStore(selectPinnedTabs);
  const togglePinnedTab = useStore(selectTogglePinnedTab);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '3rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Application Matrix</p>
        <h2 className="text-display" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Grid size={32} /> App Hub
        </h2>
        <p className="text-secondary">Launch secondary modules and configuration interfaces.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <group.icon size={20} color={group.color} />
              <h3 className="label-caps" style={{ fontSize: '0.9rem', color: 'var(--text-1)', letterSpacing: '0.1em' }}>{group.title}</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{group.modules.length} Modules</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {group.modules.map((app) => {
                const Icon = app.icon;
                const isPinned = pinnedTabs.includes(app.id);
                return (
                  <div 
                    key={app.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '1.5rem 1rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.75rem', 
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
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePinnedTab(app.id); }}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: isPinned ? 'var(--text-1)' : 'var(--text-3)', opacity: isPinned ? 1 : 0.4 }}
                      title={isPinned ? "Unpin from Navigation" : "Pin to Navigation"}
                    >
                      {isPinned ? <Pin size={14} fill="currentColor" /> : <Pin size={14} />}
                    </button>

                    <div 
                      onClick={() => setActiveTab(app.id)}
                      style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${app.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon size={20} color={app.color} />
                    </div>
                    <span onClick={() => setActiveTab(app.id)} style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-1)', textAlign: 'center' }}>{app.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

