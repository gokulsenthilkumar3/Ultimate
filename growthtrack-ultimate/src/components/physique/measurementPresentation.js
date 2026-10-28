import { BODY_METRICS, BODY_METRIC_GROUPS } from '../../lib/physiqueProfile';

export const ESSENTIAL_MEASUREMENTS = ['height', 'weight', 'waist', 'bodyFat'];
export const MEASUREMENT_GROUP_HELP = {
  essentials: 'Start with height, weight and waist. Add body fat only if you have a measured value. Every field is optional.',
  composition: 'Overall size and body composition. Enter values from your own measurements or a device; the avatar does not measure these for you.',
  upper: 'Chest, shoulders, arms and neck. Useful for tracking size changes and refining the upper-body preview.',
  lower: 'Hips, glutes, thighs and calves. Useful for tracking size changes and refining the lower-body preview.',
  proportions: 'Optional body lengths and face dimensions for a closer visual fit. These are not needed for routine check-ins.',
  asymmetry: 'Optional left and right measurements for separate records. Some paired values currently share an averaged preview shape.',
  posture: 'Optional alignment and angle records. Only supported pose controls affect the preview.',
  'facial-shape': 'Optional relative face-shape adjustments for appearance, rather than routine body tracking.',
  all: 'The complete measurement list, grouped by purpose. For a quick check-in, choose Essentials.',
};

export function selectMeasurements(group, search = '') {
  const query = search.trim().toLowerCase();
  const source = query || group === 'all' ? BODY_METRICS
    : group === 'essentials' ? ESSENTIAL_MEASUREMENTS.map(key => BODY_METRICS.find(metric => metric.key === key))
    : BODY_METRIC_GROUPS.find(item => item.id === group)?.metrics || [];
  return source.filter(metric => metric && `${metric.label} ${metric.key}`.toLowerCase().includes(query));
}

export function measurementEntryVisibility(context, mode) {
  return { current: mode === 'compare' || context !== 'goal', goal: mode === 'compare' || context === 'goal' };
}
