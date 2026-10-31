import { Link } from 'react-router-dom';
import { GROUPS, tabMeta } from '../config/navigation';
import useNavigationFoundation from './ui/useNavigationFoundation';
import OverflowRail from './ui/OverflowRail';

/** Real module links, kept distinct from each module's tab panels. */
export default function WorkspaceSubnav({ activeTab }) {
  const { areas, activeGroup, highlightedTab } = useNavigationFoundation(activeTab);
  const area = areas.find(item => item.id === activeGroup);
  if (!area) return null;
  return <div className="workspace-subnav" data-area={activeGroup}>
    <span className="workspace-subnav__label"><span aria-hidden="true">✳</span>{GROUPS[activeGroup]?.label || area.label}</span>
    <OverflowRail as="nav" label={`${area.label} page shortcuts`} className="workspace-subnav__links" frameClassName="workspace-subnav__scroll" aria-label={`${area.label} page shortcuts`}>
      {area.tabs.map((id, index) => {
        const meta = tabMeta(id), Icon = meta.icon;
        return <Link key={id} to={meta.canonicalPath} aria-current={highlightedTab === id ? 'page' : undefined} data-tone={['mint', 'lilac', 'coral', 'yellow'][index % 4]}><span className="workspace-subnav__icon"><Icon size={16} aria-hidden="true" /></span><span>{meta.label}</span><span className="workspace-subnav__active" aria-hidden="true" /></Link>;
      })}
    </OverflowRail>
  </div>;
}
