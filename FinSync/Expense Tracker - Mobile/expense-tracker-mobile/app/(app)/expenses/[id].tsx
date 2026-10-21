import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useExpenseStore } from '../../../src/store/expenseStore';
import { useCategoryStore } from '../../../src/store/categoryStore';
import { formatINR } from '../../../src/utils/currency';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { expenses, updateExpense, deleteExpense } = useExpenseStore();
  const { categories, paymentModes, loadAll } = useCategoryStore();

  // Ensure categories/payment modes are loaded
  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const expense = expenses.find(e => e.id === Number(id));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [paymentModeId, setPaymentModeId] = useState<number | null>(null);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDate(expense.date);
      setNote(expense.note ?? '');
      setCategoryId(expense.category_id ?? null);
      setPaymentModeId(expense.payment_mode_id ?? null);
    }
  }, [expense]);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Validation', 'Enter a valid amount'); return; }
    setSaving(true);
    await updateExpense(Number(id), {
      amount: amt,
      date,
      note: note.trim() || null,
      category_id: categoryId,
      payment_mode_id: paymentModeId,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Expense', 'Delete this expense? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteExpense(Number(id));
          router.back();
        },
      },
    ]);
  };

  if (!expense) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={styles.notFoundTitle}>Expense not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!editing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.viewHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.viewHeaderActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.viewContent}>
          <Text style={styles.viewAmount}>{formatINR(expense.amount)}</Text>
          <Text style={styles.viewCategory}>{expense.category_name ?? 'Uncategorized'}</Text>

          <View style={styles.detailCard}>
            <DetailRow label="Date" value={new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <DetailRow label="Category" value={expense.category_name ?? 'Uncategorized'} />
            {expense.subcategory_name && <DetailRow label="Subcategory" value={expense.subcategory_name} />}
            <DetailRow label="Payment Mode" value={expense.payment_mode_name ?? 'Not specified'} />
            {expense.note && <DetailRow label="Note" value={expense.note} />}
            <DetailRow label="Added" value={new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.editNavBar}>
          <TouchableOpacity onPress={() => setEditing(false)}>
            <Text style={styles.cancelEditText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editNavTitle}>Edit Expense</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#01696f" /> : <Text style={styles.saveEditText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount (₹) *</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="number-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.chip, categoryId === null && styles.chipActive]}
                onPress={() => setCategoryId(null)}
              >
                <Text style={[styles.chipText, categoryId === null && styles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, categoryId === c.id && styles.chipActive, { marginRight: 8 }]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Payment Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {paymentModes.map(pm => (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.chip, paymentModeId === pm.id && styles.chipActive, { marginRight: 8 }]}
                  onPress={() => setPaymentModeId(pm.id)}
                >
                  <Text style={[styles.chipText, paymentModeId === pm.id && styles.chipTextActive]}>{pm.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={note}
              onChangeText={setNote}
              placeholder="Optional note..."
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundIcon: { fontSize: 48, marginBottom: 16 },
  notFoundTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 12 },
  backLink: { fontSize: 15, color: '#01696f', fontWeight: '600' },
  viewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 17, color: '#01696f', fontWeight: '500' },
  viewHeaderActions: { flexDirection: 'row', gap: 12 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#e0f2f1', borderRadius: 20 },
  editBtnText: { color: '#01696f', fontWeight: '600', fontSize: 14 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff1f2', borderRadius: 20 },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  viewContent: { padding: 24, alignItems: 'center' },
  viewAmount: { fontSize: 40, fontWeight: '800', color: '#01696f', marginBottom: 8 },
  viewCategory: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 24 },
  detailCard: { width: '100%', backgroundColor: 'white', borderRadius: 14, padding: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500', flex: 1 },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: '600', flex: 2, textAlign: 'right' },
  editNavBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cancelEditText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  editNavTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  saveEditText: { fontSize: 16, color: '#01696f', fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 16, color: '#0f172a', backgroundColor: 'white' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipActive: { backgroundColor: '#01696f', borderColor: '#01696f' },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive: { color: 'white', fontWeight: '700' },
});
