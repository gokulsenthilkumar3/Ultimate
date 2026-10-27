import { z } from 'zod';

const title = z.string().trim().min(1).max(240);
const text = z.string().max(4000);
const recordId = z.string().min(1).max(160);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a valid calendar date.');
const priority = z.enum(['p1', 'p2', 'p3', 'p4']);
const taskFields = { title: title.optional(), description: text.optional(), dueDate: date.optional(), priority: priority.optional() };

export const agentActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('task.create'), title, description: text.optional(), dueDate: date.optional(), priority: priority.optional() }).strict(),
  z.object({ kind: z.literal('task.update'), recordId, ...taskFields }).strict().refine(action => Object.keys(taskFields).some(key => key in action), 'Choose a task field to change.'),
  z.object({ kind: z.literal('task.complete'), recordId }).strict(),
  z.object({ kind: z.literal('goal.create'), title, description: text.optional(), deadline: date.optional(), targetValue: z.number().positive().max(1e12).nullable().optional(), unit: z.string().max(40).optional() }).strict(),
  z.object({ kind: z.literal('goal.progress'), recordId, value: z.number().min(0).max(1e12) }).strict(),
  z.object({ kind: z.literal('habit.create'), name: title, category: z.enum(['routine', 'health', 'learning', 'productivity', 'mindfulness']).optional(), targetDays: z.number().int().min(1).max(7).optional() }).strict(),
  z.object({ kind: z.literal('habit.update'), recordId, name: title.optional(), targetDays: z.number().int().min(1).max(7).optional() }).strict().refine(action => action.name !== undefined || action.targetDays !== undefined, 'Choose a habit field to change.'),
  z.object({ kind: z.literal('note.create'), title, content: text }).strict(),
]);

export const agentPlanSchema = z.object({ summary: z.string().trim().min(1).max(1600), actions: z.array(agentActionSchema).max(8) }).strict();
export const AGENT_ACTION_TYPES = agentActionSchema.options.map(schema => schema.shape.kind.value);
export const agentPlanJsonSchema = z.toJSONSchema(agentPlanSchema);
export const AGENT_PRESETS = [
  { id: 'planner', label: 'Daily planner', description: 'Turn priorities into a short task plan.', prompt: 'Help me plan today. Use my selected tasks and goals, and propose a few practical task changes or new tasks for me to review.' },
  { id: 'goals', label: 'Goal coach', description: 'Choose a next step and track progress.', prompt: 'Help me move a selected goal forward. Suggest a concrete next step as a task. Only change recorded progress when I explicitly give you a new value.' },
  { id: 'routines', label: 'Routine builder', description: 'Build habits you can follow each week.', prompt: 'Help me build a simple routine. Ask what is missing, then propose a small number of habits or changes to the habits I selected.' },
  { id: 'notes', label: 'Writing assistant', description: 'Draft a note from your instructions.', prompt: 'Help me write a useful note. Ask what it should cover, then prepare a note for my review.' },
];

export function actionCollection(action) {
  return { task: 'tasks', goal: 'goals', habit: 'habits' }[action.kind.split('.')[0]] || null;
}

/** A plan may only reference records the user explicitly supplied. */
export function validatePlanReferences(plan, context) {
  const used = new Set();
  for (const action of plan.actions) {
    if (!action.recordId) continue;
    const key = `${actionCollection(action)}:${action.recordId}`;
    if (!context.some(record => `${record.type}:${record.id}` === key)) throw new Error('An action refers to a record that was not selected. Choose that record in Context and generate a new plan.');
    if (used.has(key)) throw new Error('The plan changes the same record more than once. Ask for a simpler plan.');
    used.add(key);
  }
  return plan;
}

export function agentContextScope(context, consent) {
  return JSON.stringify({ context: [...context].sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`)), consent });
}

export function describeAgentAction(action, context = []) {
  const record = context.find(item => item.type === actionCollection(action) && item.id === action.recordId);
  const label = record?.label || 'Selected record';
  const names = {
    'task.create': `Create task: ${action.title}`, 'task.update': `Update task: ${label}`,
    'task.complete': `Complete task: ${label}`, 'goal.create': `Create goal: ${action.title}`,
    'goal.progress': `Update goal progress: ${label}`, 'habit.create': `Create habit: ${action.name}`,
    'habit.update': `Update habit: ${label}`, 'note.create': `Create note: ${action.title}`,
  };
  const labels = { title: 'Title', name: 'Name', description: 'Description', dueDate: 'Due date', priority: 'Priority', deadline: 'Deadline', targetValue: 'Target', unit: 'Unit', value: 'Progress', category: 'Category', targetDays: 'Days each week', content: 'Note' };
  return { title: names[action.kind], destination: { tasks: '/workspace/tasks', goals: '/workspace/goals', habits: '/wellness/habits' }[actionCollection(action)] || '/workspace/notes', fields: Object.entries(action).filter(([key]) => key in labels).map(([key, value]) => ({ label: labels[key], value: value === null ? 'Not set' : String(value) })) };
}
