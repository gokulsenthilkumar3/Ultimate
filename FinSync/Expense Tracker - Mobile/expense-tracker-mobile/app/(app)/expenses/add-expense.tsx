import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useExpenseStore } from '../../../src/store/expenseStore';
import { useCategoryStore } from '../../../src/store/categoryStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toISO } from '../../../src/utils/date';

const DRAFT_KEY = '@expense_draft';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useExpenseStore();
  const { categories, paymentModes, loadAll } = useCategoryStore();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toISO(new Date()));
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [paymentModeId, setPaymentModeId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Reload categories/payment modes whenever screen is focused
  useFocusEffect(useCallback(() => { loadAll(); }, []));

  // Load draft
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(draft => {
      if (draft) {
        try {
          const d = JSON.parse(draft);
          if (d.amount) setAmount(d.amount);
          if (d.note) setNote(d.note);
          if (d.date) setDate(d.date);
          if (d.categoryId) setCategoryId(d.categoryId);
          if (d.paymentModeId) setPaymentModeId(d.paymentModeId);
        } catch(e) {}
      }
    });
  }, []);

  // Save draft on change
  useEffect(() => {
    const draft = JSON.stringify({ amount, note, date, categoryId, paymentModeId });
    AsyncStorage.setItem(DRAFT_KEY, draft);
  }, [amount, note, date, categoryId, paymentModeId]);

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0 || amt > 1000000000) {
      Alert.alert('Validation Error', 'Amount must be greater than 0 and up to 1,000,000,000');
      return;
    }
    if (note && note.length > 255) {
      Alert.alert('Validation Error', 'Note cannot exceed 255 characters');
      return;
    }
    if (!categoryId) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (!paymentModeId) {
      Alert.alert('Validation Error', 'Please select a payment mode');
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Validation Error', 'Enter a valid date in YYYY-MM-DD format');
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        amount: amt,
        date: date || new Date().toISOString().split('T')[0],
        category_id: categoryId,
        subcategory_id: null,
        payment_mode_id: paymentModeId,
        note: note.trim() || null,
        tags: null,
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = categories.find(c => c.id === categoryId);
  const selectedPM = paymentModes.find(pm => pm.id === paymentModeId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Ionicons name="chevron-back" size={24} color="#01696f" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Add Expense</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.navSaveBtn, saving && { opacity: 0.5 }]}
        >
          <Text style={styles.navSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#a5b4c8"
              style={styles.amountInput}
              autoFocus
            />
          </View>
          {selectedCat && (
            <View style={styles.amountMeta}>
              <View style={[styles.catDot, { backgroundColor: selectedCat.color ?? '#01696f' }]} />
              <Text style={styles.amountMetaText}>{selectedCat.icon ? `${selectedCat.icon} ` : ''}{selectedCat.name}</Text>
              {selectedPM && <Text style={styles.amountMetaText}> · {selectedPM.name}</Text>}
            </View>
          )}
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATE</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              style={styles.rowInput}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="create-outline" size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What was this for?"
              placeholderTextColor="#9ca3af"
              style={styles.rowInput}
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          {categories.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/settings')} style={styles.emptyHint}>
              <Ionicons name="add-circle-outline" size={16} color="#01696f" />
              <Text style={styles.emptyHintText}>Add categories in Settings</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chipGrid}>
              {categories.filter(c => !c.parent_id).map(cat => {
                const isActive = categoryId === cat.id;
                const color = cat.color ?? '#01696f';
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryId(isActive ? null : cat.id)}
                    style={[
                      styles.chip,
                      isActive && { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    {cat.icon ? <Text style={styles.chipIcon}>{cat.icon}</Text> : (
                      <View style={[styles.chipDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : color }]} />
                    )}
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Payment Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT MODE</Text>
          {paymentModes.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/settings')} style={styles.emptyHint}>
              <Ionicons name="add-circle-outline" size={16} color="#01696f" />
              <Text style={styles.emptyHintText}>Add payment modes in Settings</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chipGrid}>
              {paymentModes.map(mode => {
                const isActive = paymentModeId === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    onPress={() => setPaymentModeId(isActive ? null : mode.id)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{mode.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Nav
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { padding: 8 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  navSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#01696f', borderRadius: 20 },
  navSaveText: { color: 'white', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 16, paddingBottom: 40 },

  // Amount card
  amountCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  amountLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 28, fontWeight: '700', color: '#01696f', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: '#0f172a', paddingVertical: 4 },
  amountMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  amountMetaText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  // Sections
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  rowInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: '#0f172a' },

  // Chip grid
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: 'white', borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#01696f', borderColor: '#01696f' },
  chipIcon: { fontSize: 14 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: 'white' },

  emptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0',
  },
  emptyHintText: { fontSize: 13, color: '#01696f', fontWeight: '500' },
});
