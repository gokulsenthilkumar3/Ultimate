import React from 'react';
import { Link } from 'react-router-dom';
import { LIFESTYLE_CONNECTIONS } from '../../config/lifestyleConnections';
import { featurePath } from '../../config/featureRegistry';

export default function IntegrationGuide({ area }) {
  return <section className="integration-guide" aria-label="Integration support guide">
    <header><h2>Ways to connect</h2><p>These describe supported paths and planned adapters. They do not indicate that an account is connected.</p></header>
    <div className="integration-guide__grid">{LIFESTYLE_CONNECTIONS.filter(item => item.area === area).map(item => <article key={item.id} className="integration-guide__card"><p className="label-caps">{item.method}</p><h3>{item.name}</h3><p>{item.detail}</p><div>{item.destination && <Link to={featurePath(item.destination)}>Open {item.destination} →</Link>}{item.docs && <a href={item.docs} target="_blank" rel="noopener noreferrer">Provider instructions ↗</a>}</div></article>)}</div>
  </section>;
}
