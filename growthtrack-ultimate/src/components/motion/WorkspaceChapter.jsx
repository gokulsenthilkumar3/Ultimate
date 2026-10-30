import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { GROUPS, tabMeta } from '../../config/navigation';
import CharacterScene from './CharacterScene';
import { useKinetic } from './KineticContext';
import { resolveCrew } from './GlowCrew';

const stories = {
  insights: { kind: 'sunny', name: 'Sunny', copy: 'A little clarity. A brighter day.' },
  money: { kind: 'snip', name: 'Snip', copy: 'Less noise. More perspective.' },
  wellness: { kind: 'siren', name: 'Siren', copy: 'Make a little time for you.' },
  work: { kind: 'snip', name: 'Snip', copy: 'One thing at a time. You’ve got this.' },
  life: { kind: 'sunny', name: 'Sunny', copy: 'More room for the good stuff.' },
  customers: { kind: 'siren', name: 'Siren', copy: 'A little care goes a long way.' },
  system: { kind: 'sunny', name: 'Sunny', copy: 'Your space. Your kind of progress.' },
};

export default function WorkspaceChapter({ activeTab }) {
  const { enabled } = useKinetic();
  const meta = tabMeta(activeTab);
  const story = stories[meta.group] || stories.system;
  return <div className="workspace-chapter" data-character={story.kind}>
    <nav className="workspace-chapter__path" aria-label="Page location">
      <Link to={tabMeta('overview').canonicalPath}>Your space</Link><ChevronRight size={13} aria-hidden="true" />
      <span>{GROUPS[meta.group]?.label || 'Workspace'}</span><ChevronRight size={13} aria-hidden="true" />
      <span aria-current="page">{meta.label}</span>
    </nav>
    <div className="workspace-chapter__moment">
      <span className="workspace-chapter__copy"><small>{enabled ? `${resolveCrew(story.kind).toUpperCase()} / YOUR NEXT MOVE` : `A LITTLE ${story.name.toUpperCase()} ENERGY`}</small><span>{story.copy}</span></span>
      <CharacterScene kind={story.kind} /><ArrowUpRight className="workspace-chapter__spark" size={16} aria-hidden="true" />
    </div>
  </div>;
}
