import React, { createContext, useContext } from 'react';
const DemoScope = createContext({ mode: 'demo', label: 'DEMO', provenance: 'Sample', description: 'Fictional local data', detail: 'Sample data' });
export const ScopeProvider = DemoScope.Provider;
export function useScope() { return useContext(DemoScope); }
export function ScopeBadge({ scope }) {
  const inherited = useScope(), value = scope || inherited;
  return <span className={`scope-badge scope-${value.mode}`} title={value.description} aria-label={`${value.label}: ${value.description}`}><span>{value.label}</span><small>{value.detail}</small></span>;
}
export function ProvenanceChip({ children }) {
  const scope = useScope();
  return <span className="provenance-chip">{children || scope.provenance}</span>;
}
