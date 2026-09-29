import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import { featurePath } from '../config/featureRegistry';
import PageState from './ui/PageState';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';

export default function Pricing() {
  const capabilities = useQuery({ queryKey: ['deployment-capabilities'], queryFn: () => apiRequest('/api/capabilities') });
  return <section className="module-page">
    <header className="page-header"><div><p className="eyebrow">Hub</p><h1>Plans & capabilities</h1><p className="page-subtitle">Availability is determined by this deployment, not simulated subscriptions.</p></div></header>
    {capabilities.isPending ? <LoadingSkeleton /> : capabilities.isError ? <PageState state="error" title="Capabilities could not be verified" description="No billing or provider availability is assumed. Try again to read the server configuration." onRetry={capabilities.refetch} /> : <>
      <Card><h2>Current deployment</h2><p>Version: {capabilities.data.version}</p><p>Recorded entitlement: {capabilities.data.billing?.tier || 'Private owner deployment'}</p><p>{capabilities.data.billing?.checkoutAvailable ? 'Billing is configured. Contact the operator for the actual offer and terms.' : 'Billing is not configured. There is no checkout or invented upgrade offer.'}</p></Card>
      <Card><h2>Connected services</h2><ul>{(capabilities.data.connections || []).map(connection => <li key={connection.provider}><strong>{connection.provider}</strong> · {connection.status}<p>{connection.reason}</p></li>)}</ul><Link to={featurePath('profile', 'integrations')}>Connection settings</Link></Card>
    </>}
  </section>;
}
