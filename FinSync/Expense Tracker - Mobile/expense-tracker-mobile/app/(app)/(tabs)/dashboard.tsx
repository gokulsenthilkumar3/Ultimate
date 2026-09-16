import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, SafeAreaView, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardStats, DashboardStats } from '../../../src/db/queries';
import { useRecurringStore } from '../../../src/store/recurringStore';
import { useBudgetStore } from '../../../src/store/budgetStore';
import { formatINR } from '../../../src/utils/currency';
import { currentMonth, getMonthBounds } from '../../../src/utils/date';

function getDaysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getDaysElapsed(month: string) {
  const today = new Date();
  const [y, m] = month.split('-').map(Number);
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
  if (isCurrentMonth) return today.getDate();
  // If past month, return total days; if future, return 0
  const lastDay = new Date(y, m, 0);
  return today > lastDay ? getDaysInMonth(month) : 0;
}

export default function Dashboard() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { pendingEntries, templates, loadPending } = useRecurringStore();
  const { budgets, loadBudgets } = useBudgetStore();

  const load = useCallback(async (m: string) => {
    const s = await getDashboardStats(m);
    setStats(s);
    await Promise.all([loadPending(), loadBudgets(m)]);
  }, []);

  // Reload whenever this tab gains focus
  useFocusEffect(useCallback(() => { load(month); }, [month]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load(month);
    setRefreshing(false);
  };

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const overdue = pendingEntries.filter(
    (e) => e.due_date < new Date().toISOString().split('T')[0]
  );

  const daysElapsed = getDaysElapsed(month);
  const daysInMonth = getDaysInMonth(month);
  const dailyAvg = daysElapsed > 0 && stats ? stats.totalSpent / daysElapsed : 0;

  // Overall budget (category_id = null)
  const overallBudget = budgets.find(b => b.category_id == null);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#01696f" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>ExpenseTracker</Text>
            <Text style={styles.appSubtitle}>Personal Finance</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/expenses/add-expense')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Month Picker */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* KPI Cards */}
        {!stats ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#01696f" />
          </View>
        ) : (
          <>
            {/* Main spending card */}
            <View style={styles.mainCard}>
              <Text style={styles.mainCardLabel}>Total Spent</Text>
              <Text style={styles.mainCardValue}>{formatINR(stats.totalSpent)}</Text>
              <View style={styles.mainCardMeta}>
                <Text style={styles.mainCardMetaText}>{stats.expenseCount} transactions</Text>
                {dailyAvg > 0 && (
                  <Text style={styles.mainCardMetaText}>~{formatINR(Math.round(dailyAvg))}/day</Text>
                )}
              </View>

              {/* Budget progress */}
              {overallBudget && overallBudget.amount > 0 && (
                <View style={styles.budgetSection}>
                  <View style={styles.budgetLabelRow}>
                    <Text style={styles.budgetLabel}>Budget</Text>
                    <Text style={styles.budgetLabel}>
                      {formatINR(stats.totalSpent)} / {formatINR(overallBudget.amount)}
                    </Text>
                  </View>
                  <View style={styles.budgetTrack}>
                    <View style={[
                      styles.budgetFill,
                      {
                        width: `${Math.min(100, (stats.totalSpent / overallBudget.amount) * 100)}%` as any,
                        backgroundColor: stats.totalSpent > overallBudget.amount ? '#ef4444'
                          : stats.totalSpent > overallBudget.amount * 0.8 ? '#f59e0b' : '#22c55e'
                      }
                    ]} />
                  </View>
                  <Text style={styles.budgetRemaining}>
                    {stats.totalSpent > overallBudget.amount
                      ? `Over budget by ${formatINR(stats.totalSpent - overallBudget.amount)}`
                      : `${formatINR(overallBudget.amount - stats.totalSpent)} remaining`}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar-outline" size={18} color="#1d4ed8" />
                <Text style={styles.kpiLabel}>Pending Dues</Text>
                <Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>
                  {stats.pendingDues}
                </Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="warning-outline" size={18} color="#dc2626" />
                <Text style={styles.kpiLabel}>Overdue</Text>
                <Text style={[styles.kpiValue, { color: '#dc2626' }]}>
                  {overdue.length}
                </Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="trending-up-outline" size={18} color="#16a34a" />
                <Text style={styles.kpiLabel}>Daily Avg</Text>
                <Text style={[styles.kpiValue, { color: '#16a34a', fontSize: 15 }]}>
                  {dailyAvg > 0 ? formatINR(Math.round(dailyAvg)) : '—'}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Overdue Alert */}
        {overdue.length > 0 && (
          <TouchableOpacity
            style={styles.overdueAlert}
            onPress={() => router.push('/(app)/(tabs)/recurring')}
          >
            <Ionicons name="warning" size={18} color="#b45309" />
            <Text style={styles.overdueAlertText}>
              {overdue.length} payment{overdue.length > 1 ? 's' : ''} overdue — tap to view
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#b45309" />
          </TouchableOpacity>
        )}

        {/* Top Categories */}
        {stats && stats.expenseCount > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            {stats.topCategories.map((cat, i) => {
              const pct = stats.totalSpent > 0 ? (cat.total / stats.totalSpent) * 100 : 0;
              return (
                <View key={i} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: cat.color ?? '#01696f' }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catAmount}>{formatINR(cat.total)}</Text>
                    </View>
                    <View style={styles.catTrack}>
                      <View style={[styles.catFill, { width: `${pct}%` as any, backgroundColor: cat.color ?? '#01696f' }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : stats ? (
          <View style={[styles.section, { alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
            <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 15 }}>No expenses recorded this month</Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => router.push('/(app)/expenses/add-expense')}
            >
              <Text style={styles.addFirstBtnText}>+ Add your first expense</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Upcoming Dues */}
        {stats && pendingEntries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Dues</Text>
            {pendingEntries.slice(0, 5).map((entry) => {
              const template = templates.find((t) => t.id === entry.template_id);
              const templateName = template ? template.name : `Entry #${entry.template_id}`;
              const isOverdue = entry.due_date < new Date().toISOString().split('T')[0];
              return (
                <TouchableOpacity key={entry.id} style={styles.dueRow} onPress={() => router.push('/(app)/(tabs)/recurring')}>
                  <View style={[styles.dueDot, { backgroundColor: isOverdue ? '#ef4444' : '#3b82f6' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dueName}>{templateName}</Text>
                    <Text style={styles.dueDate}>Due: {entry.due_date}</Text>
                  </View>
                  <View style={[
                    styles.dueBadge,
                    isOverdue ? styles.badgeOverdue : styles.badgePending
                  ]}>
                    <Text style={[styles.dueBadgeText, { color: isOverdue ? '#dc2626' : '#1d4ed8' }]}>
                      {isOverdue ? 'Overdue' : 'Pending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {pendingEntries.length > 5 && (
              <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/recurring')}>
                <Text style={styles.seeAll}>See all {pendingEntries.length} dues →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : stats ? (
          <View style={[styles.section, { alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 15 }}>No upcoming dues</Text>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#01696f' },
  appSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#01696f', alignItems: 'center', justifyContent: 'center',
  },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  monthBtn: { padding: 10 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#111827', marginHorizontal: 12, minWidth: 160, textAlign: 'center' },

  // Main spending card
  mainCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#01696f', borderRadius: 20, padding: 20,
  },
  mainCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  mainCardValue: { fontSize: 36, fontWeight: '800', color: 'white', marginTop: 4 },
  mainCardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  mainCardMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  budgetSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  budgetTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  budgetRemaining: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: '500' },

  // KPI row
  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  kpiLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  kpiValue: { fontSize: 18, fontWeight: '800' },

  overdueAlert: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fef3c7',
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#fde68a',
  },
  overdueAlertText: { color: '#92400e', fontWeight: '600', fontSize: 14, flex: 1 },

  section: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },

  // Category rows with progress bars
  catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  catName: { fontSize: 13, color: '#374151', fontWeight: '500' },
  catAmount: { fontSize: 13, fontWeight: '700', color: '#111827' },
  catTrack: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 2, opacity: 0.75 },

  addFirstBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#01696f', borderRadius: 20 },
  addFirstBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  dueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  dueDot: { width: 8, height: 8, borderRadius: 4 },
  dueName: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dueDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  dueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePending: { backgroundColor: '#dbeafe' },
  badgeOverdue: { backgroundColor: '#fee2e2' },
  dueBadgeText: { fontSize: 11, fontWeight: '700' },
  seeAll: { textAlign: 'center', color: '#01696f', fontWeight: '600', marginTop: 10, fontSize: 14 },
});
