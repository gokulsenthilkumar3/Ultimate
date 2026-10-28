const contracts = {
  'strength:1rm': ['1RM estimate worksheet', 'Exercise, recorded load, repetitions, units and a documented estimation method.', 'An illustrative estimate with its formula, supported range and limitations. No result is calculated by this layout.'],
  'nutrition:calculator': ['Nutrition planning worksheet', 'Explicit planning inputs, units and an appropriate documented calculation.', 'A transparent planning output with assumptions and limits; no clinical recommendation is generated.'],
  'assessment:questionnaire': ['Assessment questionnaire', 'A selected assessment, its questions, response scale and consent/context.', 'A complete response record with validation and an explicit completion action.'],
  'assessment:results': ['Assessment response summary', 'An actual completed response record and a reviewed scoring method, if one is used.', 'A response summary with provenance and method limitations; no invented health score.'],
  'training:logger': ['Training session worksheet', 'Exercise, sets, repetitions, load, units and session date.', 'A recorded session with validated sets and a clear save outcome.'],
  'training:prs': ['Personal training records', 'Comparable, recorded exercise performances.', 'Exercise-specific records with dates and units, separate from a generic progress chart.'],
  'training:overload': ['Training progression comparison', 'Comparable sessions, exercise identity, load/repetition units and dates.', 'A transparent comparison of observed session workload; no automated prescription.'],
  'strength:fatigue': ['Fatigue context', 'A documented measure, source and observation period.', 'An explicitly defined trend and limitations; no inferred diagnosis or arbitrary score.'],
};
export function growthArtifact(page, view) {
  return contracts[`${page.id}:${view}`] || (view === 'targets' ? [`${page.title} targets`, 'User-defined targets, units, baseline and time range.', 'A target-versus-recorded view with editable assumptions and a clear save boundary.'] : null);
}
