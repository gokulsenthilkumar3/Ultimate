import { describe, expect, it } from 'vitest';
import { FEATURES, featurePath, resolveFeatureRoute, safeReturnDestination } from './featureRegistry';

describe('whole-app routes', () => {
  it('has unique paths and a routable definition for every module', () => {
    expect(new Set(FEATURES.map(item => item.canonicalPath)).size).toBe(FEATURES.length);
    for (const item of FEATURES) expect(resolveFeatureRoute(item.canonicalPath).feature).toBe(item);
  });
  it.each([
    ['/finance#shopping', '/finance/shopping'], ['/finance#portfolio', '/finance/portfolio'],
    ['/finance#planning', '/finance/sip'], ['/workspace#documents', '/workspace/files'],
    ['/calendar', '/workspace/calendar'], ['/documents', '/workspace/files'], ['/notes', '/workspace/notes'],
    ['/analytics', '/insights/analytics'], ['/forecast', '/insights/forecast'], ['/settings', '/hub/settings'],
    ['/life#social', '/life/social'], ['/hub#logs', '/hub/logs'], ['/humanoid', '/wellness/physique?view=3d'],
    ['/physique#history', '/wellness/physique?view=history'], ['/wellness', '/wellness/overview'],
  ])('redirects %s explicitly', (input, expected) => {
    const [path, fragment] = input.split('#');
    expect(resolveFeatureRoute(path, '', fragment ? `#${fragment}` : '').redirect).toBe(expected);
  });
  it('preserves filters while validating view state', () => {
    expect(resolveFeatureRoute('/physique', '?view=history&unit=cm').redirect).toBe('/wellness/physique?view=history&unit=cm');
    expect(resolveFeatureRoute('/wellness/physique', '?view=invalid&unit=cm').redirect).toBe('/wellness/physique?unit=cm');
    expect(resolveFeatureRoute('/not-a-module').feature).toBeNull();
    expect(resolveFeatureRoute('/finance/overview', '', '#main-content').redirect).toBeNull();
    expect(featurePath('humanoid', '3d')).toBe('/wellness/physique?view=3d');
  });
  it('restores the complete safe login destination', () => {
    expect(safeReturnDestination({ pathname: '/finance/transactions', search: '?category=Food', hash: '#record' })).toBe('/finance/transactions?category=Food#record');
    expect(safeReturnDestination({ pathname: '//host.test' })).toBe('/finance/overview');
    expect(safeReturnDestination({ pathname: '/login' })).toBe('/finance/overview');
  });
});
