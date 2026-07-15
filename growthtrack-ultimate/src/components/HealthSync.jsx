/**
 * HealthSync — Manual weight entry + Apple Health CSV import
 * Apple HealthKit doesn't work on web; CSV export is the bridge until native app.
 * CSV format expected: Date,Weight (kg)
 */
import { useState, useRef } from 'react';

const STORAGE_KEY = 'ultimate_health_data';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function parseCSV(text) {
  const lines = text.trim().split('\n').slice(1); // skip header
  return lines.map(line => {
    const [date, weight] = line.split(',');
    return { date: date?.trim(), weight: parseFloat(weight?.trim()) };
  }).filter(r => r.date && !isNaN(r.weight));
}

export default function HealthSync({ onDataUpdate }) {
  const [entries, setEntries] = useState(loadData);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [unit, setUnit] = useState('kg');
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const toKg = (val) => unit === 'lbs' ? val * 0.453592 : val;

  const addEntry = (e) => {
    e.preventDefault();
    const kg = toKg(parseFloat(weight));
    if (isNaN(kg) || kg < 20 || kg > 400) { setMsg('❌ Enter a valid weight (20–400 kg / 44–880 lbs)'); return; }
    const newEntry = { date, weight: Math.round(kg * 10) / 10, addedAt: Date.now() };
    const updated = [newEntry, ...entries.filter(e => e.date !== date)];
    updated.sort((a, b) => b.date.localeCompare(a.date));
    saveData(updated);
    setEntries(updated);
    onDataUpdate?.(updated);
    setWeight('');
    setMsg(`✅ Logged ${Math.round(kg * 10) / 10} kg for ${date}`);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setMsg('❌ No valid rows found. Format: Date,Weight (kg)'); return; }
      const merged = [...parsed, ...entries];
      const deduped = Object.values(merged.reduce((acc, e) => { acc[e.date] = e; return acc; }, {}));
      deduped.sort((a, b) => b.date.localeCompare(a.date));
      saveData(deduped);
      setEntries(deduped);
      onDataUpdate?.(deduped);
      setMsg(`✅ Imported ${parsed.length} entries from CSV`);
      setTimeout(() => setMsg(''), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const s = {
    card: { background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 16, padding: 24, maxWidth: 480, fontFamily: "'Inter', sans-serif" },
    title: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 },
    form: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
    input: { flex: 1, minWidth: 80, padding: '10px 12px', background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' },
    select: { padding: '10px 12px', background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' },
    btn: { padding: '10px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { padding: '10px 18px', background: '#1a1a24', color: '#a78bfa', border: '1px solid #4c1d95', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    msg: { fontSize: 13, color: '#86efac', marginBottom: 12, minHeight: 20 },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
    th: { fontSize: 12, color: '#6b7280', textAlign: 'left', padding: '6px 0', borderBottom: '1px solid #2a2a3a' },
    td: { fontSize: 14, color: '#d1d5db', padding: '8px 0', borderBottom: '1px solid #1a1a24' },
    hint: { fontSize: 12, color: '#6b7280', marginTop: 8 },
  };

  return (
    <div style={s.card}>
      <div style={s.title}>📊 Health Sync</div>

      <form style={s.form} onSubmit={addEntry}>
        <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input style={s.input} type="number" placeholder="Weight" value={weight} onChange={e => setWeight(e.target.value)} step="0.1" />
        <select style={s.select} value={unit} onChange={e => setUnit(e.target.value)}>
          <option value="kg">kg</option>
          <option value="lbs">lbs</option>
        </select>
        <button style={s.btn} type="submit">Log</button>
      </form>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button style={s.btnSecondary} onClick={() => fileRef.current?.click()}>📁 Import CSV</button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
      </div>

      <div style={s.msg}>{msg}</div>
      <div style={s.hint}>💡 Apple Health → Export → Share CSV → Import above</div>

      {entries.length > 0 && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 10).map((e, i) => (
              <tr key={i}>
                <td style={s.td}>{e.date}</td>
                <td style={s.td}>{e.weight} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
