// Provider boundary for future Google, Apple, Microsoft, or managed-cloud identity.
export const identityProviders = Object.freeze({
  local: { id: 'local', label: 'Ultimate Local', enabled: true },
  google: { id: 'google', label: 'Google', enabled: false },
  apple: { id: 'apple', label: 'Apple', enabled: false },
  microsoft: { id: 'microsoft', label: 'Microsoft', enabled: false },
});

export function enabledIdentityProviders() {
  return Object.values(identityProviders).filter(provider => provider.enabled);
}
