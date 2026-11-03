// Fixed fields and child records behind the existing singleton API payloads.
// Renderer configuration and provider-specific extensions are intentionally open.
export const PLAN_DOCUMENTS = Object.freeze({
  trainingPlan: {
    name: 'TrainingPlan', model: 'trainingPlan', table: 'training_plans',
    fields: { streak: 'Int', longestStreak: 'Int', lastCompletedDate: 'String' },
    maps: { PRs: { numeric: true, unit: 'kg' } },
    reading: { name: 'TrainingPersonalRecord', table: 'training_personal_records' },
    children: {
      schedule: { name: 'TrainingDay', table: 'training_days', fields: { day: 'String', muscleGroup: 'String' }, children: {
        exercises: { name: 'PlannedExercise', table: 'planned_exercises', fields: { name: 'String', sets: 'Int', reps: 'Int', weight: 'Float' } },
      } },
      prHistory: { name: 'TrainingPRHistory', table: 'training_pr_history', fields: { date: 'String', lift: 'String', weight: 'Float' } },
    },
  },
  nutritionStrategy: {
    name: 'NutritionStrategy', model: 'nutritionStrategy', table: 'nutrition_strategies',
    fields: { calories: 'Float', protein_g: 'Float', carbs_g: 'Float', fat_g: 'Float' },
    children: { meals: { name: 'PlannedMeal', table: 'planned_meals', fields: { name: 'String', time: 'String', icon: 'String', items: 'Labels' } } },
  },
  medicalData: {
    name: 'MedicalPlan', model: 'medicalPlan', table: 'medical_plans', fields: {},
    children: { testsRequired: { name: 'RequiredMedicalTest', table: 'required_medical_tests', fields: { name: 'String', priority: 'String', frequency: 'String', status: 'String', notes: 'String' } } },
  },
  physiqueTargets: {
    name: 'PhysiquePlan', model: 'physiquePlan', table: 'physique_plans', fields: {},
    maps: { goalMetrics: {}, appearanceMetrics: {}, privateMetrics: {} },
    reading: { name: 'PhysiquePlanMeasurement', table: 'physique_plan_measurements' },
    children: {
      targets: { name: 'PhysiqueTarget', table: 'physique_targets', fields: { label: 'String', metric: 'String', key: 'String', current: 'Scalar', target: 'Scalar' } },
      milestones: { name: 'PhysiqueMilestone', table: 'physique_milestones', fields: { label: 'String', targetDate: 'String', month: 'String', achieved: 'Boolean' } },
      zones: { name: 'PhysiqueZone', table: 'physique_zones', fields: { name: 'String', status: 'String', icon: 'String' } },
    },
  },
});

export const PLAN_ID_FIELDS = Object.freeze({ id: 'clientId', createdAt: 'clientCreatedAt', updatedAt: 'clientUpdatedAt' });
export const PLAN_MIGRATION = '20261103130000_typed_plan_records';
