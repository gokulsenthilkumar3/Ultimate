import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { GROUPS, GROUP_ORDER, tabMeta } from '../config/navigation';

const SECTION_COPY = {
  today: { description: 'Make room for what matters today.', action: 'Plan your day', destination: 'workspace' },
  body: { description: 'Train, fuel, and understand your body.', action: 'Open training', destination: 'training' },
  wellness: { description: 'Build a routine that helps you feel your best.', action: 'View habits', destination: 'habits' },
  insights: { description: 'Turn your progress into a clear next step.', action: 'Review goals', destination: 'goals' },
  work: { description: 'A little structure. More space to focus.', action: 'View tasks', destination: 'tasks' },
  money: { description: 'See where your money goes and plan ahead.', action: 'Open finance', destination: 'finance' },
  life: { description: 'Keep your interests, places, and connections together.', action: 'Explore places', destination: 'maps' },
  system: { description: 'Your tools, preferences, and support in one place.', action: 'Browse all apps', destination: 'apps' },
};

export default function SectionNavigation({ activeTab, onNavigate }) {
  const meta = tabMeta(activeTab);
  const group = GROUPS[meta.group];
  if (!group) return null;
  const copy = SECTION_COPY[meta.group];
  const Icon = group.icon;
  return (
    <section className="section-navigation" aria-label={`${group.label} section`}>
      <div className="section-navigation__intro">
        <span className="section-navigation__icon"><Icon size={21} /></span>
        <div><span className="section-navigation__label">{group.label}</span><p>{copy.description}</p></div>
        <Link className="section-navigation__action" to={tabMeta(copy.destination).canonicalPath}>{copy.action}<ArrowUpRight size={16} /></Link>
      </div>
      <nav className="section-navigation__sections" aria-label="Life areas">
        {GROUP_ORDER.map(id => <Link key={id} to={tabMeta(GROUPS[id].tabs[0]).canonicalPath} aria-current={id === meta.group ? 'location' : undefined}>{GROUPS[id].label}</Link>)}
      </nav>
      <nav className="section-navigation__tools" aria-label={`${group.label} tools`}>
        {group.tabs.map(id => {
          const item = tabMeta(id);
          const ItemIcon = item.icon;
          return <Link key={id} to={item.canonicalPath} aria-current={item === meta ? 'page' : undefined}><ItemIcon size={15} /><span>{item.label}</span></Link>;
        })}
      </nav>
    </section>
  );
}
