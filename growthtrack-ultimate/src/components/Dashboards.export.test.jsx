import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ capture: vi.fn(), loads: 0, state: { user: {}, metric_logs: [], sleep_logs: [], habitLogsByHabit: {}, finance: { transactions: {} } } }));
vi.mock('../store/useStore', () => ({ default: selector => selector(mocks.state) }));
vi.mock('html2canvas', () => { mocks.loads++; return { default: mocks.capture }; });
vi.mock('recharts', () => Object.fromEntries(['BarChart', 'Bar', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer', 'LineChart', 'Line', 'AreaChart', 'Area', 'Radar', 'RadarChart', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis'].map(name => [name, ({ children }) => children])));
import Dashboards from './Dashboards';

afterEach(() => { cleanup(); vi.restoreAllMocks(); mocks.capture.mockReset(); });

it('loads the capture library on demand, prevents duplicate exports and lets failed exports retry', async () => {
  expect(mocks.loads).toBe(0);
  let finish;
  mocks.capture.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<Dashboards />);
  expect(mocks.loads).toBe(0);
  const button = screen.getByRole('button', { name: 'EXPORT DASHBOARD' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(mocks.capture).toHaveBeenCalledTimes(1));
  expect(button).toBeDisabled();
  expect(mocks.loads).toBe(1);
  await act(async () => finish({ toDataURL: () => 'data:image/png;base64,fixture' }));
  expect(download).toHaveBeenCalledTimes(1);
  expect(button).toBeEnabled();
  mocks.capture.mockRejectedValueOnce(new Error('Capture failed'));
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard export could not be created');
  expect(button).toBeEnabled();
  mocks.capture.mockResolvedValueOnce({ toDataURL: () => 'data:image/png;base64,fixture' });
  fireEvent.click(button);
  await waitFor(() => expect(download).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('alert')).toBeNull();
});

it('does not download a stale dashboard after navigation removes its element', async () => {
  let finish;
  mocks.capture.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const view = render(<Dashboards />);
  fireEvent.click(screen.getByRole('button', { name: 'EXPORT DASHBOARD' }));
  await waitFor(() => expect(mocks.capture).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => finish({ toDataURL: () => 'data:image/png;base64,fixture' }));
  expect(download).not.toHaveBeenCalled();
});
