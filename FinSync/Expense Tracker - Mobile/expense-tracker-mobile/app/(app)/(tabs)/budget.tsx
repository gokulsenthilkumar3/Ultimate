import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBudgetStore } from '../../../src/store/budgetStore';
import { useCategoryStore } from '../../../src/store/categoryStore';
import { formatINR } from '../../../src/utils/currency';
import { currentMonth } from '../../../src/utils/date';

function getStatusColor(pct: number): string {
  if (pct >= 100) return '#ef4444';
  if (pct >= 80)  return '#f59e0b';
  return '#22c55e';
}

function getStatusLabel(pct: number): string {
  if (pct >= 100) return 'Exceeded';
  if (pct >= 80)  return 'Warning';
  return 'On track';
}

export default function BudgetScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [refreshing, setRefreshing] = useState(false);

  const { budgets, loadBudgets, upsertBudget, deleteBudget } = useBudgetStore();
  const { categories, loadAll } = useCategoryStore();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null | 'overall'>(null);
  const [amountInput, setAmountInput] = useState('');
  const [alertPctInput, setAlertPctInput] = useState('80');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (m: string) => {
    await Promise.all([loadBudgets(m), loadAll()]);
  }, []);

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

  const openModal = (categoryId: number | null | 'overall') => {
    const isOverall = categoryId === 'overall' || categoryId === null;
    const existing = budgets.find(b =>
      isOverall ? b.category_id == null : b.category_id === categoryId
    );
    setEditingCategoryId(categoryId);
    setAmountInput(existing ? String(existing.amount) : '');
    setAlertPctInput(existing ? String(existing.alert_pct) : '80');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid budget amount greater than 0.');
      return;
    }
    const alertPct = parseInt(alertPctInput);
    if (isNaN(alertPct) || alertPct < 1 || alertPct > 100) {
      Alert.alert('Validation Error', 'Alert threshold must be between 1 and 100.');
      return;
    }
    setSaving(true);
    try {
      const catId = editingCategoryId === 'overall' ? null : editingCategoryId as number | null;
      await upsertBudget(month, catId, amt, alertPct);
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (budgetId: number, label: string) => {
    Alert.alert(
      'Delete Budget',
      `Remove the budget for "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBudget(budgetId) },
      ]
    );
  };

  const overallBudget = budgets.find(b => b.category_id == null);
  const catBudgets    = budgets.filter(b => b.category_id != null);

  const totalSpent = overallBudget?.spent ?? 0;
  const overallPct = overallBudget && overallBudget.amount > 0
    ? Math.round((overallBudget.spent / overallBudget.amount) * 100)
    : 0;

  // Categories that don't yet have a budget
  const budgetedCatIds = new Set(catBudgets.map(b => b.category_id));
  const unbudgetedCats = categories.filter(c => !budgetedCatIds.has(c.id));

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget</Text>
        <TouchableOpacity
          style={styles.addOverallBtn}
          onPress={() => openModal('overall')}
        >
          <Ionicons name="add" size={16} color="#01696f" />
          <Text style={styles.addOverallBtnText}>Overall</Text>
        </TouchableOpacity>
      </View>

      {/* Month Nav */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#01696f" />}
      >
        {/* Overall Budget Card */}
        {overallBudget ? (
          <View style={[styles.overallCard, overallPct >= 100 && styles.overallCardExceeded, overallPct >= 80 && overallPct < 100 && styles.overallCardWarning]}>
            <View style={styles.overallTop}>
              <View>
                <Text style={styles.overallLabel}>Monthly Budget</Text>
                <Text style={styles.overallAmount}>{formatINR(overallBudget.amount)}</Text>
              </View>
              <View style={styles.overallActions}>
                <TouchableOpacity onPress={() => openModal('overall')} style={styles.iconActionBtn}>
                  <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(overallBudget.id, 'Monthly Budget')} style={styles.iconActionBtn}>
                  <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.overallBar}>
              <View style={[
                styles.overallBarFill,
                { width: `${Math.min(100, overallPct)}%` as any, backgroundColor: getStatusColor(overallPct) }
              ]} />
            </View>

            <View style={styles.overallStats}>
              <View style={styles.overallStat}>
                <Text style={styles.overallStatLabel}>Spent</Text>
                <Text style={styles.overallStatValue}>{formatINR(totalSpent)}</Text>
              </View>
              <View style={styles.overallStat}>
                <Text style={styles.overallStatLabel}>Remaining</Text>
                <Text style={[styles.overallStatValue, overallPct >= 100 && { color: '#fca5a5' }]}>
                  {overallBudget.amount > totalSpent
                    ? formatINR(overallBudget.amount - totalSpent)
                    : `-${formatINR(totalSpent - overallBudget.amount)}`
                  }
                </Text>
              </View>
              <View style={styles.overallStat}>
                <Text style={styles.overallStatLabel}>Used</Text>
                <Text style={styles.overallStatValue}>{overallPct}%</Text>
              </View>
            </View>

            {overallPct >= 80 && (
              <View style={styles.alertBanner}>
                <Ionicons name={overallPct >= 100 ? 'warning' : 'alert-circle'} size={14} color="white" />
                <Text style={styles.alertBannerText}>
                  {overallPct >= 100
                    ? `Budget exceeded by ${formatINR(totalSpent - overallBudget.amount)}`
                    : `${overallPct}% used — approaching limit`}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.setupPrompt} onPress={() => openModal('overall')}>
            <Ionicons name="cash-outline" size={32} color="#01696f" />
            <Text style={styles.setupPromptTitle}>Set Monthly Budget</Text>
            <Text style={styles.setupPromptSub}>Track your spending against a monthly limit</Text>
            <View style={styles.setupPromptBtn}>
              <Text style={styles.setupPromptBtnText}>+ Set Budget</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Category Budgets */}
        {catBudgets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Budgets</Text>
            {catBudgets.map(b => {
              const cat = categories.find(c => c.id === b.category_id);
              const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
              const barColor = cat?.color ?? '#01696f';
              const statusColor = getStatusColor(pct);
              return (
                <View key={b.id} style={styles.catBudgetRow}>
                  <View style={styles.catBudgetHeader}>
                    <View style={styles.catBudgetLeft}>
                      <View style={[styles.catDot, { backgroundColor: barColor }]} />
                      <View>
                        <Text style={styles.catBudgetName}>
                          {cat?.icon ? `${cat.icon} ` : ''}{b.category_name ?? 'Category'}
                        </Text>
                        <Text style={styles.catBudgetMeta}>
                          {formatINR(b.spent)} of {formatINR(b.amount)}
                          {'  '}
                          <Text style={{ color: statusColor, fontWeight: '700' }}>
                            {getStatusLabel(pct)} ({pct}%)
                          </Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.catBudgetActions}>
                      <TouchableOpacity onPress={() => openModal(b.category_id)} style={styles.smallIconBtn}>
                        <Ionicons name="pencil" size={14} color="#6b7280" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(b.id, b.category_name ?? 'Category')} style={styles.smallIconBtn}>
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.catProgressTrack}>
                    <View style={[
                      styles.catProgressFill,
                      { width: `${Math.min(100, pct)}%` as any, backgroundColor: statusColor }
                    ]} />
                  </View>
                  {pct >= 100 && (
                    <Text style={styles.catOverText}>
                      Over by {formatINR(b.spent - b.amount)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Add category budget */}
        {unbudgetedCats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Category Budget</Text>
            <View style={styles.catGrid}>
              {unbudgetedCats.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catGridItem}
                  onPress={() => openModal(cat.id)}
                >
                  <View style={[styles.catGridDot, { backgroundColor: cat.color ?? '#01696f' }]}>
                    {cat.icon
                      ? <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                      : <Ionicons name="add" size={14} color="white" />
                    }
                  </View>
                  <Text style={styles.catGridName} numberOfLines={1}>{cat.name}</Text>
                  <Ionicons name="add-circle-outline" size={14} color="#9ca3af" style={{ marginTop: 2 }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {budgets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No budgets set</Text>
            <Text style={styles.emptySub}>Tap "Overall" above to set your monthly limit</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Budget Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {editingCategoryId === 'overall' || editingCategoryId === null
              ? 'Monthly Budget'
              : (() => {
                const cat = categories.find(c => c.id === editingCategoryId);
                return cat ? `${cat.icon ?? ''} ${cat.name}`.trim() : 'Category Budget';
              })()}
          </Text>

          <Text style={styles.modalLabel}>Budget Amount (₹)</Text>
          <TextInput
            style={styles.modalInput}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder="e.g. 10000"
            selectTextOnFocus
            autoFocus
          />

          <Text style={styles.modalLabel}>Alert at (% of budget)</Text>
          <View style={styles.alertPctRow}>
            {[50, 70, 80, 90].map(pct => (
              <TouchableOpacity
                key={pct}
                style={[styles.alertPctChip, alertPctInput === String(pct) && styles.alertPctChipActive]}
                onPress={() => setAlertPctInput(String(pct))}
              >
                <Text style={[styles.alertPctChipText, alertPctInput === String(pct) && styles.alertPctChipTextActive]}>
                  {pct}%
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.alertPctInput, { borderColor: [50,70,80,90].includes(parseInt(alertPctInput)) ? '#e2e8f0' : '#01696f' }]}
              value={alertPctInput}
              onChangeText={setAlertPctInput}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <Text style={styles.modalSaveBtnText}>Save Budget</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  addOverallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e0f2f1', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
  },
  addOverallBtnText: { color: '#01696f', fontWeight: '600', fontSize: 13 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  monthBtn: { padding: 10 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#374151', minWidth: 170, textAlign: 'center' },

  scroll: { padding: 16, paddingBottom: 60 },

  // Overall card
  overallCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    backgroundColor: '#01696f',
  },
  overallCardWarning: { backgroundColor: '#92400e' },
  overallCardExceeded: { backgroundColor: '#991b1b' },
  overallTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  overallLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  overallAmount: { fontSize: 32, fontWeight: '800', color: 'white' },
  overallActions: { flexDirection: 'row', gap: 8 },
  iconActionBtn: { padding: 6 },
  overallBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  overallBarFill: { height: '100%', borderRadius: 4 },
  overallStats: { flexDirection: 'row', justifyContent: 'space-between' },
  overallStat: { alignItems: 'center' },
  overallStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 2 },
  overallStatValue: { fontSize: 14, fontWeight: '700', color: 'white' },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  alertBannerText: { color: 'white', fontWeight: '600', fontSize: 13, flex: 1 },

  // Setup prompt
  setupPrompt: {
    backgroundColor: 'white', borderRadius: 20, padding: 32,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: '#d1fae5', borderStyle: 'dashed',
  },
  setupPromptTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  setupPromptSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  setupPromptBtn: { backgroundColor: '#01696f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  setupPromptBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Sections
  section: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 14 },

  // Category budget rows
  catBudgetRow: { marginBottom: 14 },
  catBudgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  catBudgetLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  catBudgetName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  catBudgetMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  catBudgetActions: { flexDirection: 'row', gap: 6 },
  smallIconBtn: { padding: 4 },
  catProgressTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  catProgressFill: { height: '100%', borderRadius: 3, opacity: 0.85 },
  catOverText: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginTop: 4 },

  // Category grid for unbudgeted
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catGridItem: { alignItems: 'center', width: 72, gap: 4 },
  catGridDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  catGridName: { fontSize: 11, color: '#64748b', fontWeight: '500', textAlign: 'center' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#334155' },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16,
    fontSize: 24, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 16,
  },
  alertPctRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  alertPctChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  alertPctChipActive: { backgroundColor: '#01696f', borderColor: '#01696f' },
  alertPctChipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  alertPctChipTextActive: { color: 'white' },
  alertPctInput: {
    flex: 1, borderWidth: 1, borderRadius: 10, padding: 8,
    fontSize: 14, color: '#0f172a', textAlign: 'center', backgroundColor: '#f8fafc',
  },
  modalSaveBtn: { backgroundColor: '#01696f', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalSaveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { padding: 14, alignItems: 'center', marginTop: 6 },
  modalCancelText: { color: '#64748b', fontSize: 15, fontWeight: '500' },
});
