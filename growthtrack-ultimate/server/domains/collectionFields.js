// Stable form/reporting fields belong to columns. Residual data is reserved for
// nested, extensible metadata; aliases preserve existing client payloads.
export const COLLECTION_COLUMNS = Object.freeze({
  tasks: { description:'text',category:'text',reminderAt:'text',recurrence:'text',parent_task_id:'text' },
  nutrition_logs: { name:'text',meal:'text',calories:'nonnegative',protein_g:'nonnegative',carbs_g:'nonnegative',fat_g:'nonnegative' },
  shopping: { category:'text',priority:'text',quantity:'positiveInteger',estimatedCost:'money',targetPrice:'money',actualCost:'money',notes:'text',url:'text',stage:'text',deliverySpeed:'text',neededBy:'date',source:'text',orderedAt:'date',expectedDelivery:'date',importKey:'text',expenseId:'text',expenseDate:'date' },
  timesheet: { project:'text',task:'text',seconds:'nonnegativeInteger',billable:'boolean',earnings:'money',notes:'text',startTime:'text',endTime:'text' },
  entertainment: { type:'text',status:'text',season:'positiveInteger',episode:'nonnegativeInteger',total_episodes:'positiveInteger',rating:'rating' },
  notes: { color:'text',tags:'labels',source:'text',date:'date',time:'text',text:'text',prompt:'text',journalVersion:'nonnegativeInteger',wordCount:'nonnegativeInteger',legacyImportId:'text',pinned:'boolean',starred:'boolean' },
  goals: { description:'text',category:'text',status:'text',priority:'text',target_value:'number',current_value:'number',unit:'text',is_focus:'boolean' },
  sleep_logs: { bed_time:'time',wake_time:'time',notes:'text' },
  habits: { emoji:'text',icon:'text',category:'text',target_days:'positiveInteger',order_index:'nonnegativeInteger' },
  subscriptions: { category:'text',next_date:'date',icon:'text',auto_renew:'flag',cycle:'text',cancelled_date:'date' },
  mood_logs: { energy:'energy',note:'text',tags:'labels' },
  vitals_logs: { unit:'text' },
  medications: { frequency:'text',start_date:'date',end_date:'date' },
});

export const COLLECTION_TABLES = Object.freeze({tasks:'Task',nutrition_logs:'NutritionLog',shopping:'ShoppingItem',timesheet:'TimesheetSession',entertainment:'EntertainmentMedia',notes:'Note',goals:'Goal',sleep_logs:'SleepLog',habits:'Habit',subscriptions:'SubscriptionItem',mood_logs:'MoodLog',vitals_logs:'VitalsLog',medications:'Medication'});

export const COLLECTION_ALIASES = Object.freeze({
  tasks:{dueDate:'due_date',completed_at:'completedAt'},
  goals:{deadline:'targetDate'}, sleep_logs:{duration:'hours'},
  subscriptions:{nextDate:'next_date'}, vitals_logs:{type:'vital'},
  medications:{dose:'dosage',startDate:'start_date',endDate:'end_date'},
});
