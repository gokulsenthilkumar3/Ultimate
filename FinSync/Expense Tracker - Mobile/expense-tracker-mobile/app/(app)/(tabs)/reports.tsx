import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Platform, TextInput,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useExpenseStore } from '../../../src/store/expenseStore';
import { useRecurringStore } from '../../../src/store/recurringStore';
import { useCategoryStore } from '../../../src/store/categoryStore';
import { formatINR } from '../../../src/utils/currency';
import { getMonthBounds, toISO } from '../../../src/utils/date';
import { generateCSV, ExportRow } from '../../../src/services/export/csv';
import { generateXLSX } from '../../../src/services/export/excel';
import { generatePDFHTML } from '../../../src/services/export/pdf';
import { REPORT_PRESETS } from '../../../src/constants/defaults';

function getPresetRange(value: string): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => toISO(d);

  switch (value) {
    case 'this_month': {
      const { start, end } = getMonthBounds(`${y}-${pad(m + 1)}`);
      return { start, end, label: 'This Month' };
    }
    case 'last_month': {
      const d = new Date(y, m - 1, 1);
      const { start, end } = getMonthBounds(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
      return { start, end, label: 'Last Month' };
    }
    case 'last_3': {
      const start = iso(new Date(y, m - 2, 1));
      const end = iso(new Date(y, m + 1, 0));
      return { start, end, label: 'Last 3 Months' };
    }
    case 'last_6': {
      const start = iso(new Date(y, m - 5, 1));
      const end = iso(new Date(y, m + 1, 0));
      return { start, end, label: 'Last 6 Months' };
    }
    case 'this_year': {
      return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Year ${y}` };
    }
    default:
      return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)), label: 'This Month' };
  }
}

export default function ReportsScreen() {
  const { loadByRange } = useExpenseStore();
  const { templates } = useRecurringStore();
  const { categories, loadAll } = useCategoryStore();

  // Reload categories when tab gains focus (in case user added some in Settings)
  useFocusEffect(useCallback(() => { loadAll(); }, []));


  const [preset, setPreset] = useState('this_month');
  const [range, setRange] = useState(() => getPresetRange('this_month'));
  const [catFilter, setCatFilter] = useState<number | null>(null);
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const buildRows = useCallback(async (start: string, end: string, catId: number | null): Promise<ExportRow[]> => {
    const expenses = await loadByRange(start, end);
    let filtered = catId ? expenses.filter(e => e.category_id === catId) : expenses;
    return filtered.map(e => ({
      date: e.date,
      name: e.note || e.category_name || 'Expense',
      category: e.category_name ?? 'Uncategorized',
      amount: e.amount,
      type: 'One-time',
      paymentMode: e.payment_mode_name ?? 'Cash',
      status: 'paid',
      note: e.note ?? '',
    }));
  }, [loadByRange]);

  const handleLoad = async () => {
    if (preset === 'custom') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(range.start) || !/^\d{4}-\d{2}-\d{2}$/.test(range.end)) {
        Alert.alert('Validation Error', 'Use YYYY-MM-DD format for dates');
        return;
      }
      if (new Date(range.start) > new Date(range.end)) {
        Alert.alert('Validation Error', 'Start date cannot be after end date');
        return;
      }
    }
    setLoading(true);
    const r = await buildRows(range.start, range.end, catFilter);
    setRows(r);
    setLoaded(true);
    setLoading(false);
  };

  const handlePreset = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      setRange(getPresetRange(value));
    } else {
      const now = new Date();
      setRange({ start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end: toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)), label: 'Custom' });
    }
    setLoaded(false);
  };

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const catBreakdown: Record<string, number> = {};
  rows.forEach(r => { catBreakdown[r.category] = (catBreakdown[r.category] ?? 0) + r.amount; });

  const exportCSV = async () => {
    setExporting(true);
    try {
      const csv = generateCSV(rows, `Expense Report — ${range.label}`);
      const path = `${FileSystem.documentDirectory}expense-report-${range.start}-${range.end}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  const exportXLSX = async () => {
    setExporting(true);
    try {
      const base64 = generateXLSX(rows, `Expense Report — ${range.label}`);
      const path = `${FileSystem.documentDirectory}expense-report-${range.start}-${range.end}.xlsx`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Export Excel' });
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const html = generatePDFHTML(rows, `Expense Report`, `${range.start} to ${range.end}`);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export PDF' });
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Period Presets */}
        <Text style={styles.sectionLabel}>Select Period</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
          {REPORT_PRESETS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.presetChip, preset === p.value && styles.presetChipActive]}
              onPress={() => handlePreset(p.value)}
            >
              <Text style={[styles.presetChipText, preset === p.value && styles.presetChipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {preset === 'custom' ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { marginTop: 0 }]}>Start Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.dateInput} value={range.start} onChangeText={(t) => setRange(prev => ({...prev, start: t, label: 'Custom'}))} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { marginTop: 0 }]}>End Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.dateInput} value={range.end} onChangeText={(t) => setRange(prev => ({...prev, end: t, label: 'Custom'}))} />
            </View>
          </View>
        ) : (
          <Text style={styles.rangeDisplay}>{range.start} → {range.end}</Text>
        )}

        {/* Category Filter */}
        <Text style={styles.sectionLabel}>Filter by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
          <TouchableOpacity
            style={[styles.presetChip, catFilter === null && styles.presetChipActive]}
            onPress={() => { setCatFilter(null); setLoaded(false); }}
          >
            <Text style={[styles.presetChipText, catFilter === null && styles.presetChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.presetChip, catFilter === c.id && styles.presetChipActive]}
              onPress={() => { setCatFilter(c.id); setLoaded(false); }}
            >
              <Text style={[styles.presetChipText, catFilter === c.id && styles.presetChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Generate */}
        <TouchableOpacity style={styles.generateBtn} onPress={handleLoad} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.generateBtnText}>Generate Report</Text>}
        </TouchableOpacity>

        {loaded && (
          <>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={styles.summaryValue}>{formatINR(totalAmount)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Transactions</Text>
                <Text style={styles.summaryValue}>{rows.length}</Text>
              </View>
            </View>

            {/* Category breakdown */}
            {Object.keys(catBreakdown).length > 0 && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Category Breakdown</Text>
                {Object.entries(catBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => {
                    const catObj = categories.find(c => c.name === cat);
                    const barColor = catObj?.color ?? '#01696f';
                    return (
                      <View key={cat} style={styles.breakdownRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: barColor }} />
                            <Text style={styles.breakdownCat}>{cat}</Text>
                          </View>
                          <View style={styles.breakdownRight}>
                            <Text style={styles.breakdownAmt}>{formatINR(amt)}</Text>
                            <Text style={styles.breakdownPct}>
                              {totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0}%
                            </Text>
                          </View>
                        </View>
                        <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: '100%', backgroundColor: barColor, opacity: 0.75, width: `${totalAmount > 0 ? (amt / totalAmount) * 100 : 0}%` }} />
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* Recent entries preview */}
            <View style={styles.previewCard}>
              <Text style={styles.breakdownTitle}>Recent Entries</Text>
              {rows.slice(0, 5).map((r, i) => (
                <View key={i} style={styles.previewRow}>
                  <View>
                    <Text style={styles.previewName}>{r.name}</Text>
                    <Text style={styles.previewMeta}>{r.date} · {r.category}</Text>
                  </View>
                  <Text style={styles.previewAmt}>{formatINR(r.amount)}</Text>
                </View>
              ))}
              {rows.length > 5 && (
                <Text style={styles.moreText}>+{rows.length - 5} more entries in export</Text>
              )}
            </View>

            {/* Export Buttons */}
            <Text style={styles.sectionLabel}>Export Report</Text>
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: '#e0f2f1' }]}
                onPress={exportCSV}
                disabled={exporting}
              >
                <Text style={styles.exportBtnIcon}>📄</Text>
                <Text style={[styles.exportBtnText, { color: '#00695c' }]}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: '#e8f5e9' }]}
                onPress={exportXLSX}
                disabled={exporting}
              >
                <Text style={styles.exportBtnIcon}>📊</Text>
                <Text style={[styles.exportBtnText, { color: '#2e7d32' }]}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: '#fce4ec' }]}
                onPress={exportPDF}
                disabled={exporting}
              >
                <Text style={styles.exportBtnIcon}>📕</Text>
                <Text style={[styles.exportBtnText, { color: '#c62828' }]}>PDF</Text>
              </TouchableOpacity>
            </View>
            {exporting && <ActivityIndicator style={{ marginTop: 12 }} color="#01696f" />}
          </>
        )}

        {loaded && rows.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No expenses found</Text>
            <Text style={styles.emptySubtitle}>Try changing the period or category filter</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 60 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 20 },
  presetsRow: { flexDirection: 'row', marginBottom: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  presetChipActive: { backgroundColor: '#01696f', borderColor: '#01696f' },
  presetChipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  presetChipTextActive: { color: 'white', fontWeight: '700' },
  rangeDisplay: { fontSize: 12, color: '#94a3b8', marginBottom: 4, marginTop: 4 },
  generateBtn: { backgroundColor: '#01696f', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  generateBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#64748b', fontWeight: '500', marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#01696f' },
  breakdownCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 16 },
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  breakdownRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  breakdownCat: { fontSize: 14, color: '#374151', flex: 1 },
  breakdownRight: { alignItems: 'flex-end' },
  breakdownAmt: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  breakdownPct: { fontSize: 11, color: '#94a3b8' },
  previewCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  previewName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  previewMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  previewAmt: { fontSize: 14, fontWeight: '700', color: '#01696f' },
  moreText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingTop: 8 },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  exportBtn: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, gap: 6 },
  exportBtnIcon: { fontSize: 24 },
  exportBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#334155' },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  dateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: 'white' },
});
