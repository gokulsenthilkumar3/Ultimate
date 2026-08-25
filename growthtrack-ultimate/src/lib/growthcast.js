export const GROWTHCAST_MODELS = {
  trajectory: { id: 'trajectory-v1', label: 'Trajectory ML', description: 'Local weighted trend model across goals, habits, sleep, and metrics.' },
  ollama: { id: 'ollama-local', label: 'Ollama Local LLM', description: 'Optional local-language reasoning through Ollama on localhost.' },
};
export function buildGrowthcastSignal(state) {
  const goals = state.goals || [], habits = state.habits || [], metrics = state.metric_logs || [];
  const tasks = state.user?.tasks?.pending || state.tasks || [];
  const completedGoals = goals.filter(goal => goal.status === 'completed').length;
  const habitStreak = habits.reduce((total, habit) => total + Number(habit.streak || 0), 0);
  const taskLoad = Math.min(100, tasks.length * 8);
  const dataConfidence = Math.min(100, metrics.length * 6 + goals.length * 8 + habits.length * 4);
  const momentum = Math.max(0, Math.min(100, Math.round(50 + completedGoals * 8 + habitStreak * 1.5 - taskLoad / 3)));
  return { momentum, dataConfidence, completedGoals, habitStreak, taskLoad, model: GROWTHCAST_MODELS.trajectory };
}
export async function askLocalGrowthcast(prompt, model = 'gemma3') {
  const response = await fetch('http://localhost:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false }), signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Ollama is not available');
  const data = await response.json();
  return data.response || 'No local response returned.';
}
