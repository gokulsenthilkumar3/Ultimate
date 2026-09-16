import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  SafeAreaView, Alert, Switch, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '../../../src/store/categoryStore';
import { useAuthStore } from '../../../src/store/authStore';
import { authService } from '../../../src/services/auth';
import { exportBackup, pickAndImportBackup } from '../../../src/services/backup';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#01696f', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#64748b', '#374151', '#a16207', '#9f1239',
];

export default function SettingsScreen() {
  const router = useRouter();
  const { categories, paymentModes, addCategory, editCategory, deleteCategory, addPaymentMode, deletePaymentMode } = useCategoryStore();
  const { biometricEnabled, logout } = useAuthStore();

  // Category modal
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catColor, setCatColor] = useState('#01696f');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  // Payment mode modal
  const [pmModal, setPmModal] = useState(false);
  const [pmName, setPmName] = useState('');
  const [pmSaving, setPmSaving] = useState(false);

  // PIN change
  const [pinModal, setPinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  // Biometric
  const [bioEnabled, setBioEnabled] = useState(biometricEnabled);

  // Backup
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const openAddCat = () => { setEditingCatId(null); setCatName(''); setCatIcon(''); setCatColor('#01696f'); setCatModal(true); };
  const openEditCat = (c: typeof categories[0]) => { setEditingCatId(c.id); setCatName(c.name); setCatIcon(c.icon ?? ''); setCatColor(c.color ?? '#01696f'); setCatModal(true); };

  const saveCat = async () => {
    if (!catName.trim() || catName.length > 30) { Alert.alert('Validation Error', 'Category name is required and must be under 30 characters'); return; }
    if (catColor && !/^#[0-9A-Fa-f]{6}$/.test(catColor.trim())) {
      Alert.alert('Validation Error', 'Color must be a valid hex code (e.g. #01696f)'); return;
    }
    setCatSaving(true);
    if (editingCatId) {
      await editCategory(editingCatId, catName.trim(), catIcon.trim() || null, catColor.trim() || null);
    } else {
      await addCategory(catName.trim(), catIcon.trim() || null, catColor.trim() || null, null);
    }
    setCatSaving(false);
    setCatModal(false);
  };

  const deleteCat = (id: number, name: string) => {
    Alert.alert('Delete Category', `Delete "${name}"? Expenses using it will become uncategorized.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(id) },
    ]);
  };

  const savePM = async () => {
    if (!pmName.trim() || pmName.length > 30) { Alert.alert('Validation Error', 'Payment mode name is required and must be under 30 characters'); return; }
    setPmSaving(true);
    await addPaymentMode(pmName.trim());
    setPmSaving(false);
    setPmModal(false);
    setPmName('');
  };

  const deletePM = (id: number, name: string) => {
    Alert.alert('Delete Payment Mode', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePaymentMode(id) },
    ]);
  };

  const changePin = async () => {
    if (!oldPin || !newPin || !confirmPin) { Alert.alert('Error', 'All fields are required'); return; }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { Alert.alert('Error', 'New PIN must be 4 digits'); return; }
    if (newPin !== confirmPin) { Alert.alert('Error', 'PINs do not match'); return; }
    setPinSaving(true);
    const valid = await authService.verifyPin(oldPin);
    if (!valid) { Alert.alert('Error', 'Current PIN is incorrect'); setPinSaving(false); return; }
    await authService.setPin(newPin);
    setPinSaving(false);
    setPinModal(false);
    setOldPin(''); setNewPin(''); setConfirmPin('');
    Alert.alert('Success', 'PIN changed successfully');
  };

  const toggleBiometric = async (val: boolean) => {
    setBioEnabled(val);
    await authService.setBiometricEnabled(val);
  };

  const handleBackup = async () => {
    setBacking(true);
    try {
      await exportBackup();
    } catch (e: any) {
      Alert.alert('Backup Failed', e.message);
    } finally {
      setBacking(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert('Restore Backup', 'This will overwrite all current data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore', style: 'destructive', onPress: async () => {
          setRestoring(true);
          try {
            const result = await pickAndImportBackup();
            if (result.success) {
              Alert.alert('Success', 'Backup restored. Restart the app to reload data.');
            } else {
              Alert.alert('Restore Failed', result.message);
            }
          } catch (e: any) {
            Alert.alert('Restore Failed', e.message);
          } finally {
            setRestoring(false);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Lock App', 'Lock the app and go to login screen?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity style={styles.addChip} onPress={openAddCat}>
              <Text style={styles.addChipText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {categories.map(c => (
            <View key={c.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                {c.color && <View style={[styles.catDot, { backgroundColor: c.color }]} />}
                <Text style={styles.listItemText}>{c.icon ? `${c.icon} ` : ''}{c.name}</Text>
              </View>
              <View style={styles.listItemActions}>
                <TouchableOpacity onPress={() => openEditCat(c)} style={styles.iconBtn}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteCat(c.id, c.name)} style={styles.iconBtn}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {categories.length === 0 && <Text style={styles.emptyText}>No categories yet</Text>}
        </View>

        {/* Payment Modes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Modes</Text>
            <TouchableOpacity style={styles.addChip} onPress={() => { setPmName(''); setPmModal(true); }}>
              <Text style={styles.addChipText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {paymentModes.map(pm => (
            <View key={pm.id} style={styles.listItem}>
              <Text style={styles.listItemText}>{pm.name}</Text>
              {!pm.is_system ? (
                <TouchableOpacity onPress={() => deletePM(pm.id, pm.name)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              ) : <Text style={styles.defaultBadge}>System</Text>}
            </View>
          ))}
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity style={styles.rowItem} onPress={() => setPinModal(true)}>
            <Text style={styles.rowItemText}>🔑 Change PIN</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.rowItem}>
            <Text style={styles.rowItemText}>👆 Biometric Unlock</Text>
            <Switch
              value={bioEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#d1d5db', true: '#01696f' }}
            />
          </View>
        </View>

        {/* Backup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.rowItem} onPress={handleBackup} disabled={backing}>
            <Text style={styles.rowItemText}>💾 Backup Data</Text>
            {backing ? <ActivityIndicator size="small" color="#01696f" /> : <Text style={styles.rowChevron}>›</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowItem} onPress={handleRestore} disabled={restoring}>
            <Text style={styles.rowItemText}>📥 Restore Backup</Text>
            {restoring ? <ActivityIndicator size="small" color="#01696f" /> : <Text style={styles.rowChevron}>›</Text>}
          </TouchableOpacity>
        </View>

        {/* Lock */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🔒 Lock App</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Category Modal */}
      <Modal visible={catModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCatModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{editingCatId ? 'Edit Category' : 'New Category'}</Text>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.fieldInput} value={catName} onChangeText={setCatName} placeholder="e.g. Groceries" autoFocus />
          <Text style={styles.fieldLabel}>Icon (emoji)</Text>
          <TextInput style={styles.fieldInput} value={catIcon} onChangeText={setCatIcon} placeholder="e.g. 🛒" />
          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorSwatches}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, catColor === c && styles.colorSwatchActive]}
                onPress={() => setCatColor(c)}
              >
                {catColor === c && <Ionicons name="checkmark" size={14} color="white" />}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Custom Color (hex)</Text>
          <TextInput style={styles.fieldInput} value={catColor} onChangeText={setCatColor} placeholder="#01696f" autoCapitalize="none" />
          <TouchableOpacity style={[styles.modalBtn, catSaving && { opacity: 0.6 }]} onPress={saveCat} disabled={catSaving}>
            {catSaving ? <ActivityIndicator color="white" /> : <Text style={styles.modalBtnText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCatModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Payment Mode Modal */}
      <Modal visible={pmModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPmModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>New Payment Mode</Text>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.fieldInput} value={pmName} onChangeText={setPmName} placeholder="e.g. GPay" autoFocus />
          <TouchableOpacity style={[styles.modalBtn, pmSaving && { opacity: 0.6 }]} onPress={savePM} disabled={pmSaving}>
            {pmSaving ? <ActivityIndicator color="white" /> : <Text style={styles.modalBtnText}>Add</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPmModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* PIN Change Modal */}
      <Modal visible={pinModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPinModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Change PIN</Text>
          <Text style={styles.fieldLabel}>Current PIN</Text>
          <TextInput style={[styles.fieldInput, { letterSpacing: 12, textAlign: 'center' }]} value={oldPin} onChangeText={setOldPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
          <Text style={styles.fieldLabel}>New PIN</Text>
          <TextInput style={[styles.fieldInput, { letterSpacing: 12, textAlign: 'center' }]} value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
          <Text style={styles.fieldLabel}>Confirm New PIN</Text>
          <TextInput style={[styles.fieldInput, { letterSpacing: 12, textAlign: 'center' }]} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
          <TouchableOpacity style={[styles.modalBtn, pinSaving && { opacity: 0.6 }]} onPress={changePin} disabled={pinSaving}>
            {pinSaving ? <ActivityIndicator color="white" /> : <Text style={styles.modalBtnText}>Update PIN</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPinModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 60 },
  section: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  addChip: { backgroundColor: '#e0f2f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  addChipText: { color: '#01696f', fontWeight: '600', fontSize: 13 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  listItemText: { fontSize: 14, color: '#334155' },
  listItemActions: { flexDirection: 'row', gap: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  iconBtn: { padding: 4 },
  editText: { fontSize: 13, color: '#0369a1', fontWeight: '500' },
  deleteText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  defaultBadge: { fontSize: 11, color: '#94a3b8', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  rowItemText: { fontSize: 15, color: '#334155' },
  rowChevron: { fontSize: 20, color: '#94a3b8' },
  logoutBtn: { backgroundColor: '#fff1f2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  logoutBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  fieldInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, color: '#0f172a' },
  modalBtn: { backgroundColor: '#01696f', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  modalBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontSize: 15 },
  colorSwatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: { borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
});
