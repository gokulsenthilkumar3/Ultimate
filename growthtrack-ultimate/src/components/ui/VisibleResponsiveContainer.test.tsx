import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import VisibleResponsiveContainer from './VisibleResponsiveContainer';
vi.mock('recharts', () => ({ ResponsiveContainer: ({ children }) => <div>{children}</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('reserves geometry and defers the chart renderer until it enters the viewport', () => {
  let intersect: (entries: unknown[]) => void = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class { constructor(callback) { intersect = callback; } observe() {} disconnect = disconnect; });
  const mounted = vi.fn();
  function Chart() { mounted(); return <h2>Measured series</h2>; }
  const view = render(<VisibleResponsiveContainer width="100%" height={280}><Chart /></VisibleResponsiveContainer>);
  expect(view.container.firstChild).toHaveStyle({ height: '280px' }); expect(mounted).not.toHaveBeenCalled();
  act(() => intersect([{ isIntersecting: false }])); expect(mounted).not.toHaveBeenCalled();
  act(() => intersect([{ isIntersecting: true }])); expect(screen.getByRole('heading', { name: 'Measured series' })).toBeVisible();
  expect(disconnect).toHaveBeenCalled(); view.unmount();
});
