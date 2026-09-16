import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecurringStore } from '../../../src/store/recurringStore';
import { useCategoryStore } from '../../../src/store/categoryStore';
import { RecurringType, Frequency } from '../../../src/constants/enums';
import { REMINDER_LEAD_DAYS_OPTIONS } from '../../../src/constants/defaults';
import { toISO } from '../../../src/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = '@recurring_draft';

const TYPE_OPTIONS = [
  { value: RecurringType.FIXED, label: 'Fixed', desc: 'Same amount every period (EMI, Rent, Sub)' },
  { value: RecurringType.INSTALLMENT, label: 'Installment', desc: 'Fixed tenure with period count (Loan, Chit Fund)' },
  { value: RecurringType.VARIABLE, label: 'Variable', desc: 'Amount varies each period (EB, Wi-Fi, Mobile)' },
];

const FREQ_OPTIONS = [
  { value: Frequency.DAILY, label: 'Daily' },
  { value: Frequency.WEEKLY, label: 'Weekly' },
  { value: Frequency.MONTHLY, label: 'Monthly' },
  { value: Frequency.YEARLY, label: 'Yearly' },
];

export default function AddRecurringScreen() {
  const router = useRouter();
  const { addTemplate } = useRecurringStore();
  const { categories, paymentModes, loadAll } = useCategoryStore();

  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<RecurringType>(RecurringType.FIXED);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [amount, setAmount] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [totalPeriods, setTotalPeriods] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [paymentModeId, setPaymentModeId] = useState<number | null>(null);
  const [nextDueDate, setNextDueDate] = useState(toISO(new Date()));
  const [reminderDays, setReminderDays] = useState(1);
  const [note, setNote] = useState('');

  // Load draft
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(draft => {
      if (draft) {
        try {
          const d = JSON.parse(draft);
          if (d.name) setName(d.name);
          if (d.type) setType(d.type);
          if (d.frequency) setFrequency(d.frequency);
          if (d.amount) setAmount(d.amount);
          if (d.amountMax) setAmountMax(d.amountMax);
          if (d.totalPeriods) setTotalPeriods(d.totalPeriods);
          if (d.categoryId) setCategoryId(d.categoryId);
          if (d.paymentModeId) setPaymentModeId(d.paymentModeId);
          if (d.nextDueDate) setNextDueDate(d.nextDueDate);
          if (d.reminderDays) setReminderDays(d.reminderDays);
          if (d.note) setNote(d.note);
        } catch(e) {}
      }
    });
  }, []);

  // Save draft on change
  useEffect(() => {
    const draft = JSON.stringify({ name, type, frequency, amount, amountMax, totalPeriods, categoryId, paymentModeId, nextDueDate, reminderDays, note });
    AsyncStorage.setItem(DRAFT_KEY, draft);
  }, [name, type, frequency, amount, amountMax, totalPeriods, categoryId, paymentModeId, nextDueDate, reminderDays, note]);

  useEffect(() => { loadAll(); }, []);

  const handleSave = async () => {
    if (!name.trim() || name.length > 50) { Alert.alert('Validation Error', 'Name is required and must be under 50 characters'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || amt > 1000000000) { Alert.alert('Validation Error', 'Amount must be greater than 0 and up to 1,000,000,000'); return; }
    
    if (type === RecurringType.VARIABLE) {
      const max = parseFloat(amountMax);
      if (!isNaN(max) && (max < amt || max > 1000000000)) { Alert.alert('Validation Error', 'Max amount must be ≥ min amount and up to 1,000,000,000'); return; }
    }
    if (type === RecurringType.INSTALLMENT) {
      const periods = parseInt(totalPeriods);
      if (isNaN(periods) || periods < 1 || periods > 360) { Alert.alert('Validation Error', 'Periods must be between 1 and 360'); return; }
    }
    if (!nextDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
      Alert.alert('Validation Error', 'Enter a valid start date (YYYY-MM-DD)'); return;
    }
    if (note && note.length > 255) {
      Alert.alert('Validation Error', 'Note cannot exceed 255 characters'); return;
    }
    if (!categoryId) { Alert.alert('Validation Error', 'Category is required'); return; }
    if (!paymentModeId) { Alert.alert('Validation Error', 'Payment mode is required'); return; }

    setSaving(true);
    try {
      await addTemplate({
        name: name.trim(),
        type,
        frequency,
        amount: type === RecurringType.VARIABLE ? parseFloat(amount) : amt,
        installment_amt: type === RecurringType.INSTALLMENT ? amt : null,
        min_amount: type === RecurringType.VARIABLE ? amt : null,
        max_amount: type === RecurringType.VARIABLE && amountMax ? parseFloat(amountMax) : null,
        total_periods: type === RecurringType.INSTALLMENT ? parseInt(totalPeriods) : null,
        category_id: categoryId,
        payment_mode_id: paymentModeId,
        start_date: nextDueDate,
        end_date: null,
        next_due_date: nextDueDate,
        reminder_days: reminderDays,
        reminder_on_due: 1,
        note: note.trim() || null,
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const OptionRow = ({ label, options, selected, onSelect }: {
    label: string;
    options: { value: string; label: string }[];
    selected: string;
    onSelect: (v: string) => void;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[styles.optionChip, selected === o.value && styles.optionChipActive]}
            onPress={() => onSelect(o.value)}
          >
            <Text style={[styles.optionChipText, selected === o.value && styles.optionChipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Ionicons name="chevron-back" size={24} color="#01696f" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Add Recurring</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.navSaveBtn, saving && { opacity: 0.5 }]}
        >
          <Text style={styles.navSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Type selector */}
          <Text style={styles.sectionTitle}>Payment Type</Text>
          {TYPE_OPTIONS.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeCard, type === t.value && styles.typeCardActive]}
              onPress={() => setType(t.value)}
            >
              <View style={styles.typeCardInner}>
                <View style={[styles.typeRadio, type === t.value && styles.typeRadioActive]}>
                  {type === t.value && <View style={styles.typeRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>{t.label}</Text>
                  <Text style={styles.typeDesc}>{t.desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Home Loan EMI, BSNL Wi-Fi"
              autoFocus
            />
          </View>

          {/* Frequency */}
          <OptionRow
            label="Frequency"
            options={FREQ_OPTIONS}
            selected={frequency}
            onSelect={(v) => setFrequency(v as Frequency)}
          />

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {type === RecurringType.VARIABLE ? 'Minimum Amount (₹) *' : 'Amount (₹) *'}
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>

          {/* Variable max amount */}
          {type === RecurringType.VARIABLE && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Maximum Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={amountMax}
                onChangeText={setAmountMax}
                keyboardType="decimal-pad"
                placeholder="e.g. 1500 (optional)"
              />
            </View>
          )}

          {/* Total periods for installment */}
          {type === RecurringType.INSTALLMENT && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Total Periods *</Text>
              <TextInput
                style={styles.input}
                value={totalPeriods}
                onChangeText={setTotalPeriods}
                keyboardType="number-pad"
                placeholder="e.g. 24 (months for 2-year loan)"
              />
            </View>
          )}

          {/* Start / Next Due Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Start / Next Due Date *</Text>
            <TextInput
              style={styles.input}
              value={nextDueDate}
              onChangeText={setNextDueDate}
              placeholder="YYYY-MM-DD"
              keyboardType="number-pad"
            />
          </View>

          {/* Reminder */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Remind me</Text>
            <View style={styles.optionRow}>
              {REMINDER_LEAD_DAYS_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optionChip, reminderDays === d && styles.optionChipActive]}
                  onPress={() => setReminderDays(d)}
                >
                  <Text style={[styles.optionChipText, reminderDays === d && styles.optionChipTextActive]}>
                    {d}d before
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.optionChip, categoryId === null && styles.optionChipActive]}
                onPress={() => setCategoryId(null)}
              >
                <Text style={[styles.optionChipText, categoryId === null && styles.optionChipTextActive]}>None</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionChip, categoryId === c.id && styles.optionChipActive, { marginRight: 8 }]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.optionChipText, categoryId === c.id && styles.optionChipTextActive]}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Payment Mode */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Payment Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {paymentModes.map(pm => (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.optionChip, paymentModeId === pm.id && styles.optionChipActive, { marginRight: 8 }]}
                  onPress={() => setPaymentModeId(pm.id)}
                >
                  <Text style={[styles.optionChipText, paymentModeId === pm.id && styles.optionChipTextActive]}>{pm.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Note */}
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

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <Text style={styles.saveBtnText}>Save Recurring Payment</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { padding: 8 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  navSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#01696f', borderRadius: 20 },
  navSaveText: { color: 'white', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12, marginTop: 8 },
  typeCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: 'white' },
  typeCardActive: { borderColor: '#01696f', backgroundColor: '#f0faf9' },
  typeCardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  typeRadioActive: { borderColor: '#01696f' },
  typeRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#01696f' },
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 2 },
  typeLabelActive: { color: '#01696f' },
  typeDesc: { fontSize: 12, color: '#94a3b8' },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 16, color: '#0f172a', backgroundColor: 'white' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  optionChipActive: { backgroundColor: '#01696f', borderColor: '#01696f' },
  optionChipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  optionChipTextActive: { color: 'white', fontWeight: '700' },
  saveBtn: { backgroundColor: '#01696f', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
