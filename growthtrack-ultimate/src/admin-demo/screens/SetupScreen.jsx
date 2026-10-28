import React from 'react';
import { Badge, Icon, Panel } from '../components';

export function SetupScreen({ title, text, items }) { return <Panel title={title} subtitle={text}><div className="setup-list">{items.map((name, i) => <div key={name}><span className="module-icon sage"><Icon name={i ? 'logs' : 'apps'} /></span><span><strong>{name}</strong><small>No external service connected in this design preview.</small></span><Badge>Setup required</Badge></div>)}</div></Panel>; }

export default SetupScreen;
