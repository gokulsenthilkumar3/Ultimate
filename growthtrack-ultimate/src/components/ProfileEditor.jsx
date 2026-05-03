import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Save, User, Dumbbell, Apple, Heart, ClipboardList, 
  Code, FileJson, Table as TableIcon, Plus, Trash2, 
  ChevronDown, ChevronRight, Calendar as CalendarIcon, Palette, Award
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const EDITOR_SECTIONS = [
  { id: 'user', label: 'Core Demographics', icon: <User size={18} />, endpoint: '/user_profile' },
  { id: 'training_plan', label: 'Training Strategy', icon: <Dumbbell size={18} />, endpoint: '/training_plan' },
  { id: 'nutrition_strategy', label: 'Nutrition Strategy', icon: <Apple size={18} />, endpoint: '/nutrition_strategy' },
  { id: 'lifestyle_tips', label: 'Lifestyle Protocol', icon: <Heart size={18} />, endpoint: '/lifestyle_tips' },
  { id: 'medical_data', label: 'Medical Panels', icon: <ClipboardList size={18} />, endpoint: '/medical_data' },
  { id: 'physique_targets', label: 'Physique Targets', icon: <Code size={18} />, endpoint: '/physique_targets' },
  { id: 'assessment_qa', label: 'Assessment Q&A', icon: <Settings size={18} />, endpoint: '/assessment_qa' },
];

const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const isValidDOB = (dobString) => {
  if (!dobString) return true;
  const date = new Date(dobString);
  const today = new Date();
  const hundredYearsAgo = new Date();
  hundredYearsAgo.setFullYear(today.getFullYear() - 100);
  
  if (date > today) return { valid: false, msg: 'Date cannot be in the future' };
  if (date < hundredYearsAgo) return { valid: false, msg: 'Date cannot be more than 100 years ago' };
  return { valid: true };
};

export default function ProfileEditor() {
  const [activeSection, setActiveSection] = useState(EDITOR_SECTIONS[0]);
  const [formData, setFormData] = useState(null);
  const [viewMode, setViewMode] = useState('form'); 
  const [rawJson, setRawJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedArrays, setExpandedArrays] = useState({});
  const toast = useToast();
  const fetchInitialData = useStore(s => s.fetchInitialData);

  const loadData = async () => {
    setLoading(true);
    try {
      let data = await apiSync(activeSection.endpoint, 'GET');
      
      if (!data) data = {};
      
      setFormData(data);
      setRawJson(JSON.stringify(data, null, 2));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const updateNestedValue = useCallback((path, value) => {
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      // Auto-update age if dob changes
      if (path === 'dob') {
        newData.age = calculateAge(value);
      }
      
      return newData;
    });
  }, []);

  const handleSave = async () => {
    try {
      const dataToSave = viewMode === 'json' ? JSON.parse(rawJson) : formData;
      
      // Basic Validation
      if (dataToSave.dob) {
        const check = isValidDOB(dataToSave.dob);
        if (!check.valid) {
          toast.error(check.msg);
          return;
        }
      }

      await apiSync(activeSection.endpoint, 'POST', dataToSave);
      
      toast.success(`${activeSection.label} saved and audited!`);
      fetchInitialData();
    } catch (err) {
      toast.error('Validation error or invalid JSON.');
    }
  };

  const addItemToArray = (path, template) => {
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      const arrKey = keys[keys.length - 1];
      current[arrKey] = [...(current[arrKey] || []), JSON.parse(JSON.stringify(template))];
      return newData;
    });
  };

  const removeItemFromArray = (path, index) => {
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      const arrKey = keys[keys.length - 1];
      current[arrKey] = current[arrKey].filter((_, i) => i !== index);
      return newData;
    });
  };

  const renderField = (key, value, path = '') => {
    const fullPath = path ? `${path}.${key}` : key;
    if (value === null || value === undefined) return null;

    // ── ARRAY RENDERING ──
    if (Array.isArray(value)) {
      const isExpanded = expandedArrays[fullPath];
      return (
        <tr key={fullPath}>
          <td colSpan="2" style={{ padding: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => setExpandedArrays(prev => ({ ...prev, [fullPath]: !prev[fullPath] }))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="label-caps" style={{ fontSize: '0.8rem', fontWeight: 900 }}>{key.replace(/_/g, ' ')} <span style={{ color: 'var(--accent)', opacity: 0.7 }}>[{value.length}]</span></span>
                </button>
                <button onClick={() => addItemToArray(fullPath, value[0] || {})} className="btn-icon" style={{ color: 'var(--accent)' }}><Plus size={14} /></button>
              </div>
              {isExpanded && (
                <div style={{ paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {value.map((item, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.25rem', position: 'relative' }}>
                      <button onClick={() => removeItemFromArray(fullPath, idx)} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                        {typeof item === 'object' ? Object.entries(item).map(([k, v]) => (
                          <div key={k}>
                            <p className="label-caps" style={{ fontSize: '0.65rem', marginBottom: '6px', color: 'var(--text-3)' }}>{k}</p>
                            {renderInput(k, v, `${fullPath}.${idx}`)}
                          </div>
                        )) : renderInput('', item, `${fullPath}.${idx}`)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      );
    }

    // ── OBJECT RENDERING ──
    if (typeof value === 'object') {
      return (
        <React.Fragment key={fullPath}>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            <td colSpan="2" style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {key.toLowerCase().includes('tone') ? <Palette size={16} color="var(--accent)" /> : <ClipboardList size={16} color="var(--accent)" />}
                <span className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 900 }}>{key.replace(/_/g, ' ')} Section</span>
              </div>
            </td>
          </tr>
          {Object.entries(value).map(([k, v]) => renderField(k, v, fullPath))}
        </React.Fragment>
      );
    }

    // ── PRIMITIVE RENDERING ──
    return (
      <tr key={fullPath} style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '1.25rem', color: 'var(--text-2)', width: '280px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
          </span>
        </td>
        <td style={{ padding: '0.75rem 1.25rem' }}>
          {renderInput(key, value, path)}
        </td>
      </tr>
    );
  };

  const renderInput = (key, value, path) => {
    const fullPath = path ? `${path}.${key}` : key;
    const isColor = (typeof value === 'string' && value.startsWith('#') && (value.length === 4 || value.length === 7)) || key.toLowerCase().includes('tone') || key.toLowerCase().includes('color');
    const isDate = key.toLowerCase() === 'dob' || key.toLowerCase().includes('date') || key.toLowerCase().includes('born');
    const isAge = key.toLowerCase() === 'age';

    if (isColor) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input 
            type="color" 
            value={value} 
            onChange={(e) => updateNestedValue(fullPath, e.target.value)}
            style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
          />
          <input 
            type="text" 
            value={value} 
            onChange={(e) => updateNestedValue(fullPath, e.target.value)}
            className="form-input" 
            style={{ width: '120px', fontFamily: 'monospace', textAlign: 'center' }}
          />
        </div>
      );
    }

    if (isDate) {
      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="date"
            value={value}
            onChange={(e) => updateNestedValue(fullPath, e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingRight: '40px' }}
          />
          <CalendarIcon size={16} style={{ position: 'absolute', right: '12px', color: 'var(--accent)', opacity: 0.6 }} />
        </div>
      );
    }

    return (
      <input
        type={typeof value === 'number' ? 'number' : 'text'}
        value={value}
        readOnly={isAge}
        onChange={(e) => {
          const val = typeof value === 'number' ? Number(e.target.value) : e.target.value;
          updateNestedValue(fullPath, val);
        }}
        className="form-input"
        style={{ 
          width: '100%', 
          background: isAge ? 'rgba(255,255,255,0.03)' : 'transparent', 
          border: 'none', 
          borderBottom: '1px solid transparent', 
          padding: '0.5rem',
          color: isAge ? 'var(--accent)' : 'inherit',
          fontWeight: isAge ? 800 : 500
        }}
        onFocus={(e) => !isAge && (e.target.style.borderBottom = '1px solid var(--accent)')}
        onBlur={(e) => !isAge && (e.target.style.borderBottom = '1px solid transparent')}
      />
    );
  };

  return (
    <div className="fade-in module-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem', letterSpacing: '0.2em' }}>Admin Control Center</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>Ultimate Data Hardening</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <button className={`btn-sm ${viewMode === 'form' ? 'active' : ''}`} onClick={() => setViewMode('form')} style={{ border: 'none', padding: '0.6rem 1.25rem' }}>
              <TableIcon size={16} style={{ marginRight: '8px' }} /> UI Form
            </button>
            <button className={`btn-sm ${viewMode === 'json' ? 'active' : ''}`} onClick={() => setViewMode('json')} style={{ border: 'none', padding: '0.6rem 1.25rem' }}>
              <FileJson size={16} style={{ marginRight: '8px' }} /> Source JSON
            </button>
          </div>
          <button onClick={handleSave} className="btn-primary" style={{ padding: '0.7rem 1.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderRadius: '12px', boxShadow: '0 8px 24px var(--accent-glow)' }}>
            <Save size={18} /> Sync Database
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem', position: 'sticky', top: '2rem', height: 'fit-content' }}>
          {EDITOR_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s)}
              style={{
                width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                background: activeSection.id === s.id ? 'var(--accent-gradient)' : 'transparent',
                color: activeSection.id === s.id ? 'white' : 'var(--text-2)',
                border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', marginBottom: '6px',
                fontWeight: activeSection.id === s.id ? 800 : 600, transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {s.icon} <span style={{ fontSize: '0.9rem' }}>{s.label}</span>
            </button>
          ))}
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(6,182,212,0.05)', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.1)' }}>
             <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Data Security</p>
             <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.5 }}>Every transaction is tracked with Actor ID and IP address in the forensic audit log.</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', minHeight: '75vh', border: '1px solid var(--border)' }}>
          {loading ? (
            <div style={{ height: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spin-ring" style={{ width: '40px', height: '40px', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : viewMode === 'form' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {formData && Object.entries(formData).map(([k, v]) => renderField(k, v))}
                </tbody>
              </table>
            </div>
          ) : (
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', height: '75vh', background: 'var(--bg-dark)', color: '#10b981',
                fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.9rem', padding: '2rem',
                border: 'none', resize: 'none', outline: 'none', lineHeight: 1.7
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
