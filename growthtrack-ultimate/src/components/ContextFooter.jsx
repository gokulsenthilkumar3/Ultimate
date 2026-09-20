import React from 'react';
import { Circle, Command, Wifi, WifiOff } from 'lucide-react';
import { GROUPS, tabMeta } from '../config/navigation';

export default function ContextFooter({ activeTab, serverStatus }) {
  const meta = tabMeta(activeTab);
  const group = GROUPS[meta.group];
  const online = serverStatus !== 'offline';
  return (
    <footer className="v3-context-footer" aria-label="Workspace status">
      <div><Circle size={7} fill="currentColor" aria-hidden="true" /><span>{group?.label || 'GrowthTrack'} / {meta.label}</span></div>
      <div className={online ? 'is-online' : 'is-offline'}>{online ? <Wifi size={13} /> : <WifiOff size={13} />}<span>{online ? 'Local workspace ready' : 'Offline mode'}</span></div>
      <div className="v3-context-footer__shortcut"><kbd><Command size={10} />K</kbd><span>Search</span></div>
      <div><span>GrowthTrack V3 preview</span></div>
    </footer>
  );
}

