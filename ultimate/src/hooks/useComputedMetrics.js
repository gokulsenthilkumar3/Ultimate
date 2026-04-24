// hooks/useComputedMetrics.js
import { useUserStore } from '../store/userStore';

export function useComputedMetrics() {
  const { user, getBMI, getHealthScore, getTDEE } = useUserStore();

  const tdee = getTDEE();
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = (user.hydration?.log || []).filter((e) => e.date === today);
  const todayMl = todayLog.reduce((s, e) => s + (e.ml || 0), 0);
  const goalMl = user.hydration?.dailyGoalMl || 3000;

  return {
    bmi: getBMI(),
    healthScore: getHealthScore(),
    tdee,
    calorieDeficit: tdee ? tdee - (user.nutrition?.dailyCalories || 0) : null,
    hydrationMl: todayMl,
    hydrationPct: Math.min(100, Math.round((todayMl / goalMl) * 100)),
    hydrationGoalMl: goalMl,
    workoutStreak: user.training?.streak || 0,
    habitCount: (user.lifestyle?.habits || []).length,
  };
}
