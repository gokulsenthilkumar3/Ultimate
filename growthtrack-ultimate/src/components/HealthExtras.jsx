import React, { useState } from 'react';
import useStore from '../store/useStore';
import {
  Activity, Brain, Zap, Moon, Heart, Eye, Dumbbell,
  Apple, Wind, Thermometer, SmilePlus, Save, ChevronDown, ChevronUp
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'sensory', label: 'Sensory & Nervous', icon: Brain, color: 'text-purple-400',
    fields: [
      { key: 'vision_score', label: 'Vision Score', type: 'number', placeholder: '8 / 10', unit: '/10' },
      { key: 'hearing_score', label: 'Hearing Score', type: 'number', placeholder: '9 / 10', unit: '/10' },
      { key: 'reaction_ms', label: 'Reaction Time', type: 'number', placeholder: '220', unit: 'ms' },
      { key: 'balance_score', label: 'Balance Score', type: 'number', placeholder: '7 / 10', unit: '/10' },
      { key: 'coordination_score', label: 'Coordination', type: 'number', placeholder: '8 / 10', unit: '/10' },
    ],
  },
  {
    id: 'posture', label: 'Posture & Flexibility', icon: Activity, color: 'text-blue-400',
    fields: [
      { key: 'posture_rating', label: 'Posture Rating', type: 'number', placeholder: '6 / 10', unit: '/10' },
      { key: 'flexibility_score', label: 'Flexibility', type: 'number', placeholder: '7 / 10', unit: '/10' },
      { key: 'sit_reach_cm', label: 'Sit & Reach', type: 'number', placeholder: '30', unit: 'cm' },
      { key: 'shoulder_mobility', label: 'Shoulder Mobility', type: 'number', placeholder: '8 / 10', unit: '/10' },
      { key: 'hip_mobility', label: 'Hip Mobility', type: 'number', placeholder: '7 / 10', unit: '/10' },
    ],
  },
  {
    id: 'respiratory', label: 'Respiratory', icon: Wind, color: 'text-cyan-400',
    fields: [
      { key: 'resting_breath_rate', label: 'Resting Breath Rate', type: 'number', placeholder: '15', unit: '/min' },
      { key: 'breath_hold_sec', label: 'Breath Hold', type: 'number', placeholder: '60', unit: 'sec' },
      { key: 'vo2_max', label: 'VO₂ Max (est)', type: 'number', placeholder: '45', unit: 'ml/kg/min' },
      { key: 'lung_capacity_pct', label: 'Lung Capacity', type: 'number', placeholder: '90', unit: '%' },
    ],
  },
  {
    id: 'recovery', label: 'Recovery & Sleep Quality', icon: Moon, color: 'text-indigo-400',
    fields: [
      { key: 'hrv_ms', label: 'HRV', type: 'number', placeholder: '55', unit: 'ms' },
      { key: 'recovery_score', label: 'Recovery Score', type: 'number', placeholder: '7 / 10', unit: '/10' },
      { key: 'soreness_level', label: 'Soreness Level', type: 'number', placeholder: '3 / 10', unit: '/10' },
      { key: 'stress_level', label: 'Stress Level', type: 'number', placeholder: '4 / 10', unit: '/10' },
      { key: 'energy_level', label: 'Energy Level', type: 'number', placeholder: '7 / 10', unit: '/10' },
    ],
  },
  {
    id: 'diet', label: 'Diet & Hydration', icon: Apple, color: 'text-green-400',
    fields: [
      { key: 'diet_type', label: 'Diet Type', type: 'text', placeholder: 'e.g. Balanced / Keto' },
      { key: 'meal_freq', label: 'Meals per Day', type: 'number', placeholder: '3', unit: '/day' },
      { key: 'water_target_l', label: 'Water Target', type: 'number', placeholder: '3', unit: 'L' },
      { key: 'cheat_meals_per_week', label: 'Cheat Meals/week', type: 'number', placeholder: '1' },
      { key: 'supplement_notes', label: 'Supplements', type: 'text', placeholder: 'Creatine, Whey, D3...' },
    ],
  },
  {
    id: 'hobbies', label: 'Hobbies & Lifestyle', icon: SmilePlus, color: 'text-amber-400',
    fields: [
      { key: 'hobbies', label: 'Active Hobbies', type: 'text', placeholder: 'Anime, F1, Gaming...' },
      { key: 'screen_time_hr', label: 'Avg Screen Time', type: 'number', placeholder: '5', unit: 'hr/day' },
      { key: 'outdoor_time_hr', label: 'Outdoor Time', type: 'number', placeholder: '1', unit: 'hr/day' },
      { key: 'social_score', label: 'Social Engagement', type: 'number', placeholder: '6 / 10', unit: '/10' },
      { key: 'mood_baseline', label: 'Mood Baseline', type: 'number', placeholder: '7 / 10', unit: '/10' },
    ],
  },
];

export default function HealthExtras() {
  const health_extras = useStore(s => s.health_extras) || {};
  const updateHealthExtras = useStore(s => s.updateHealthExtras);

  const [local, setLocal] = useState({ ...health_extras });
  const [openSections, setOpenSections] = useState({ sensory: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (id) => setOpenSections(s => ({ ...s, [id]: !s[id] }));

  const handleChange = (key, val) => setLocal(l => ({ ...l, [key]: val }));

  const handleSave = async (sectionFields) => {
    setSaving(true);
    const partial = {};
    sectionFields.forEach(f => { if (local[f.key] !== undefined) partial[f.key] = local[f.key]; });
    await updateHealthExtras(partial);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await updateHealthExtras(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Health+</h2>
          <p className="text-xs text-gray-400 mt-0.5">Detailed bio-metrics · auto-synced to Supabase</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
        >
          <Save size={13} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save All'}
        </button>
      </div>

      {SECTIONS.map(section => {
        const Icon = section.icon;
        const isOpen = openSections[section.id];

        return (
          <div key={section.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Section header */}
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className={section.color} />
                <span className="text-sm font-semibold text-white">{section.label}</span>
                <span className="text-xs text-gray-500">
                  {section.fields.filter(f => local[f.key] !== undefined && local[f.key] !== '').length}/{section.fields.length} filled
                </span>
              </div>
              {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>

            {/* Section fields */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {section.fields.map(field => (
                    <div key={field.key}>
                      <label className="text-xs text-gray-400 block mb-1">
                        {field.label} {field.unit && <span className="text-gray-600">({field.unit})</span>}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={local[field.key] ?? ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSave(section.fields)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition"
                  >
                    <Save size={12} /> Save section
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
