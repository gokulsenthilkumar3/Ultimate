import { describe, expect, it } from 'vitest';
import { BODY_METRICS } from '../../lib/physiqueProfile';
import { selectMeasurements, measurementEntryVisibility, MEASUREMENT_GROUP_HELP } from './measurementPresentation';

describe('measurement task presentation', () => {
  it('starts with a short check-in while retaining the entire catalog', () => {
    expect(selectMeasurements('essentials').map(item => item.key)).toEqual(['height', 'weight', 'waist', 'bodyFat']);
    expect(selectMeasurements('all')).toEqual(BODY_METRICS);
  });
  it('searches outside the selected group and restores it when cleared', () => {
    expect(selectMeasurements('essentials', ' wrist ').some(item => item.key === 'wrist')).toBe(true);
    expect(selectMeasurements('upper').every(item => !['thighs', 'calves'].includes(item.key))).toBe(true);
    expect(selectMeasurements('essentials', 'unknown-metric')).toEqual([]);
  });
  it('explains every available group', async () => {
    const { BODY_METRIC_GROUPS } = await import('../../lib/physiqueProfile');
    for (const group of BODY_METRIC_GROUPS) expect(MEASUREMENT_GROUP_HELP[group.id]).toBeTruthy();
  });
  it('shows one entry context and both only for comparison', () => {
    expect(measurementEntryVisibility('current', 'current')).toEqual({current: true, goal: false});
    expect(measurementEntryVisibility('goal', 'goal')).toEqual({current: false, goal: true});
    expect(measurementEntryVisibility('current', 'compare')).toEqual({current: true, goal: true});
  });
});
