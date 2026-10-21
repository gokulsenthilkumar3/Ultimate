import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Alert, ActivityIndicator,
  ScrollView, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRecurringStore } from '../../../src/store/recurringStore';
import { formatINR } from '../../../src/utils/currency';
import { RecurringType, RecurringStatus, Frequency } from '../../../src/constants/enums';

const TABS = ['Pending', 'Active', 'Completed'] as const;
type Tab = typeof TABS[number];

const TYPE_LABEL: Record<string, string> = {
  fixed: 'Fixed',
  installment: 'Installment',
  variable: 'Variable',
};

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function getDueStatus(dueDate: string): 'overdue' | 'today' | 'soon' | 'upcoming' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'upcoming';
}

const DUE_COLORS = {
  overdue: '#ef4444',
  today: '#f97316',
  soon: '#eab308',
  upcoming: '#22c55e',
};

export default function RecurringScreen() {
  const router = useRouter();
  const { templates, pendingEntries, loading, loadAll, loadPending, markPaid, skipEntry, deleteTemplate } = useRecurringStore();
  const [activeTab, setActiveTab] = useState<Tab>('Pending');
  const [refreshing, setRefreshing] = useState(false);

  // Mark-as-paid modal
  const [payModal, setPayModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [defaultAmount, setDefaultAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useFocusEffect(useCallback(() => {
    loadAll();
    loadPending();
  }, []));


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    await loadPending();
    setRefreshing(false);
  }, []);

  const openPayModal = (entryId: number, templateId: number, amount: number) => {
    setSelectedEntryId(entryId);
    setSelectedTemplateId(templateId);
    setDefaultAmount(amount.toString());
    setActualAmount(amount.toString());
    setPayModal(true);
  };

  const handleMarkPaid = async () => {
    if (!selectedEntryId || !selectedTemplateId) return;
    const amt = parseFloat(actualAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    setPaying(true);
    await markPaid(selectedEntryId, amt, selectedTemplateId);
    setPaying(false);
    setPayModal(false);
  };

  const handleSkip = (entryId: number, templateId: number) => {
    Alert.alert('Skip Payment', 'Mark this payment as skipped for this period?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => skipEntry(entryId, templateId) },
    ]);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Delete Recurring', `Delete "${name}" and all its history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(id) },
    ]);
  };

  const pendingTemplateIds = new Set(pendingEntries.map(e => e.template_id));

  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'Pending') return t.status === RecurringStatus.ACTIVE && pendingTemplateIds.has(t.id);
    if (activeTab === 'Active') return t.status === RecurringStatus.ACTIVE;
    return t.status === RecurringStatus.COMPLETED || t.status === RecurringStatus.PAUSED;
  });

  const totalMonthlyLiability = templates
    .filter(t => t.status === RecurringStatus.ACTIVE && t.amount != null)
    .reduce((sum, t) => {
      let monthlyAmt = 0;
      if (t.frequency === 'daily') monthlyAmt = t.amount! * 30;
      else if (t.frequency === 'weekly') monthlyAmt = t.amount! * 4.33;
      else if (t.frequency === 'monthly') monthlyAmt = t.amount!;
      else if (t.frequency === 'yearly') monthlyAmt = t.amount! / 12;
      return sum + monthlyAmt;
    }, 0);

  const renderItem = ({ item }: { item: typeof templates[0] }) => {
    const pendingEntry = pendingEntries.find(e => e.template_id === item.id);
    const dueStatus = pendingEntry ? getDueStatus(item.next_due_date) : null;
    const dueColor = dueStatus ? DUE_COLORS[dueStatus] : '#94a3b8';
    const daysLeft = pendingEntry ? Math.floor((new Date(item.next_due_date).getTime() - Date.now()) / 86400000) : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {TYPE_LABEL[item.type] ?? item.type} · {FREQ_LABEL[item.frequency] ?? item.frequency}
              {item.category_name ? ` · ${item.category_name}` : ''}
            </Text>
            {item.type === RecurringType.INSTALLMENT && item.total_periods && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.cardMeta}>
                  {item.paid_periods} / {item.total_periods} periods paid
                </Text>
                <View style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 4, width: '100%', overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (item.paid_periods / item.total_periods) * 100)}%`, height: '100%', backgroundColor: '#01696f', borderRadius: 3 }} />
                </View>
              </View>
            )}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardAmount}>{item.amount != null ? formatINR(item.amount) : 'Variable'}</Text>
            {item.type === RecurringType.VARIABLE && item.max_amount && (
              <Text style={styles.cardAmountRange}>up to {formatINR(item.max_amount)}</Text>
            )}
          </View>
        </View>

        {pendingEntry && (
          <View style={[styles.dueRow, { borderColor: dueColor }]}>
            <Text style={[styles.dueText, { color: dueColor }]}>
              {dueStatus === 'overdue' ? `Overdue by ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) !== 1 ? 's' : ''}` :
               dueStatus === 'today' ? 'Due Today' :
               dueStatus === 'soon' ? `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` :
               `Due ${new Date(item.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#dcfce7' }]}
                onPress={() => openPayModal(pendingEntry.id, item.id, item.amount ?? 0)}
              >
                <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Mark Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]}
                onPress={() => handleSkip(pendingEntry.id, item.id)}
              >
                <Text style={[styles.actionBtnText, { color: '#d97706' }]}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>Since {new Date(item.start_date ?? item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={{ padding: 4 }}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recurring</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/expenses/add-recurring')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Liability Summary */}
      <View style={{ backgroundColor: '#f0fdf4', padding: 16, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 12, borderWidth: 1, borderColor: '#dcfce7' }}>
        <Text style={{ fontSize: 13, color: '#166534', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estimated Monthly Fixed Outflow</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#15803d' }}>{formatINR(totalMonthlyLiability)} <Text style={{fontSize: 14, fontWeight: '600'}}>/ mo</Text></Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            {tab === 'Pending' && pendingEntries.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingEntries.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#01696f" />
      ) : (
        <FlatList
          data={filteredTemplates}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#01696f" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} items</Text>
              <Text style={styles.emptySubtitle}>Tap "+ Add" to create a recurring payment</Text>
            </View>
          }
        />
      )}

      {/* Mark Paid Modal */}
      <Modal visible={payModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPayModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Mark as Paid</Text>
          <Text style={styles.modalLabel}>Actual Amount Paid (₹)</Text>
          <TextInput
            style={styles.modalInput}
            keyboardType="decimal-pad"
            value={actualAmount}
            onChangeText={setActualAmount}
            selectTextOnFocus
            autoFocus
          />
          {defaultAmount !== actualAmount && (
            <Text style={styles.modalHint}>Default: ₹{defaultAmount}</Text>
          )}
          <TouchableOpacity
            style={[styles.modalBtn, paying && { opacity: 0.6 }]}
            onPress={handleMarkPaid}
            disabled={paying}
          >
            {paying ? <ActivityIndicator color="white" /> : <Text style={styles.modalBtnText}>Confirm Payment</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPayModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  addBtn: { backgroundColor: '#01696f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#01696f' },
  tabText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  activeTabText: { color: '#01696f', fontWeight: '700' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#01696f' },
  cardAmountRange: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  dueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8 },
  dueText: { fontSize: 13, fontWeight: '600', flex: 1 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  cardFooterText: { fontSize: 11, color: '#94a3b8' },
  deleteText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 22, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  modalHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 12 },
  modalBtn: { backgroundColor: '#01696f', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  modalBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  modalCancelText: { color: '#64748b', fontSize: 15, fontWeight: '500' },
});
