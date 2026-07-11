import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database operations
export const db = {
  // User operations
  async getUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Metrics operations
  async getMetrics(userId) {
    const { data, error } = await supabase
      .from('metric_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addMetric(userId, metric) {
    const { data, error } = await supabase
      .from('metric_logs')
      .insert({ ...metric, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Nutrition operations
  async getNutrition(userId, date) {
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);
    if (error) throw error;
    return data;
  },

  async addNutritionLog(userId, log) {
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert({ ...log, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Sleep operations
  async getSleepLogs(userId) {
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },

  async addSleepLog(userId, log) {
    const { data, error } = await supabase
      .from('sleep_logs')
      .insert({ ...log, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Finance operations
  async getTransactions(userId) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addTransaction(userId, transaction) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert({ ...transaction, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Goals operations
  async getGoals(userId) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateGoal(goalId, updates) {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Audit logs
  async getAuditLogs(userId, limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
};