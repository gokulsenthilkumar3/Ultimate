import fs from 'fs';

const filePath = 'src/store/useStore.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard exports `(s) =>` with `(s: any) =>`
content = content.replace(/\(s\) =>/g, '(s: any) =>');
// Some might have (state) =>
content = content.replace(/\(state\) =>/g, '(state: any) =>');
// Some might have (userOrUpdater) =>
content = content.replace(/\(userOrUpdater\) =>/g, '(userOrUpdater: any) =>');
// Replace function apiSync(endpoint, method = 'POST', data = null)
content = content.replace(/async function apiSync\(endpoint, method = 'POST', data = null\)/, "async function apiSync(endpoint: string, method: string = 'POST', data: any = null): Promise<any>");
// Add types to some set methods
content = content.replace(/addWorkoutFromTrainingDay: async \(day\)/, 'addWorkoutFromTrainingDay: async (day: any)');
content = content.replace(/deleteWorkoutSession: async \(id\)/, 'deleteWorkoutSession: async (id: string)');
content = content.replace(/addShoppingItem: async \(item\)/, 'addShoppingItem: async (item: any)');
content = content.replace(/deleteShoppingItem: \(id\)/, 'deleteShoppingItem: (id: string)');
content = content.replace(/toggleShoppingPurchased: \(id\)/, 'toggleShoppingPurchased: (id: string)');
content = content.replace(/addTimesheetSession: async \(session\)/, 'addTimesheetSession: async (session: any)');
content = content.replace(/deleteTimesheetSession: \(id\)/, 'deleteTimesheetSession: (id: string)');
content = content.replace(/addMediaItem: async \(item\)/, 'addMediaItem: async (item: any)');
content = content.replace(/deleteMediaItem: async \(id\)/, 'deleteMediaItem: async (id: string)');
content = content.replace(/updateMediaProgress: async \(id, field, value\)/, 'updateMediaProgress: async (id: string, field: string, value: any)');
content = content.replace(/addNote: async \(note\)/, 'addNote: async (note: any)');
content = content.replace(/deleteNote: \(id\)/, 'deleteNote: (id: string)');
content = content.replace(/updateNote: \(id, updates\)/, 'updateNote: (id: string, updates: any)');
content = content.replace(/addGoal: async \(goal\)/, 'addGoal: async (goal: any)');
content = content.replace(/deleteGoal: \(id\)/, 'deleteGoal: (id: string)');
content = content.replace(/updateGoal: \(id, updates\)/, 'updateGoal: (id: string, updates: any)');
content = content.replace(/saveSleepLog: async \(log\)/, 'saveSleepLog: async (log: any)');
content = content.replace(/addDocument: async \(doc\)/, 'addDocument: async (doc: any)');
content = content.replace(/deleteDocument: \(id\)/, 'deleteDocument: (id: string)');
content = content.replace(/addHabit: async \(habit\)/, 'addHabit: async (habit: any)');
content = content.replace(/deleteHabit: \(id\)/, 'deleteHabit: (id: string)');
content = content.replace(/updateHabit: \(id, updates\)/, 'updateHabit: (id: string, updates: any)');
content = content.replace(/fetchHabitLogsForHabit: async \(habitId\)/, 'fetchHabitLogsForHabit: async (habitId: string)');
content = content.replace(/toggleHabitForDate: async \(habitId, date\)/, 'toggleHabitForDate: async (habitId: string, date: string)');
content = content.replace(/addSubscription: async \(sub\)/, 'addSubscription: async (sub: any)');
content = content.replace(/deleteSubscription: \(id\)/, 'deleteSubscription: (id: string)');
content = content.replace(/addMoodLog: async \(log\)/, 'addMoodLog: async (log: any)');
content = content.replace(/addVitalLog: async \(log\)/, 'addVitalLog: async (log: any)');
content = content.replace(/addMedication: async \(medication\)/, 'addMedication: async (medication: any)');
content = content.replace(/deleteMedication: async \(id\)/, 'deleteMedication: async (id: string)');

content = content.replace(/updateTrainingPlan: async \(data\)/, 'updateTrainingPlan: async (data: any)');
content = content.replace(/updateNutritionStrategy: async \(data\)/, 'updateNutritionStrategy: async (data: any)');
content = content.replace(/updateLifestyleTips: async \(data\)/, 'updateLifestyleTips: async (data: any)');
content = content.replace(/updateMedicalData: async \(data\)/, 'updateMedicalData: async (data: any)');
content = content.replace(/updatePhysiqueTargets: async \(data\)/, 'updatePhysiqueTargets: async (data: any)');
content = content.replace(/updateAssessmentQA: async \(data\)/, 'updateAssessmentQA: async (data: any)');
content = content.replace(/updateSkills: async \(data\)/, 'updateSkills: async (data: any)');
content = content.replace(/updateCalendarEvents: async \(data\)/, 'updateCalendarEvents: async (data: any)');
content = content.replace(/updateWellnessData: async \(data\)/, 'updateWellnessData: async (data: any)');

content = content.replace(/fetchWorkoutExercisesForSession: async \(sessionId\)/, 'fetchWorkoutExercisesForSession: async (sessionId: string)');

content = content.replace(/setLastCheckIn: \(date\)/, 'setLastCheckIn: (date: string)');
content = content.replace(/setCheckInAlertDismissedDate: \(date\)/, 'setCheckInAlertDismissedDate: (date: string)');
content = content.replace(/setActiveTab: \(tab\)/, 'setActiveTab: (tab: string)');
content = content.replace(/setOnboardingComplete: \(status\)/, 'setOnboardingComplete: (status: boolean)');
content = content.replace(/updateUserSlice: \(key, data\)/, 'updateUserSlice: (key: string, data: any)');

content = content.replace(/const useStore = create\(/, 'const useStore = create<any>()(');
content = content.replace(/togglePinnedTab: \(tabId\)/, 'togglePinnedTab: (tabId: string)');

fs.writeFileSync(filePath, content, 'utf8');
