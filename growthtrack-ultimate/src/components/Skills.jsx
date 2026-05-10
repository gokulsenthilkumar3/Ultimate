import React, { useState, useMemo, useEffect } from 'react';
import useStore, { selectSkills, selectUpdateSkills } from '../store/useStore';
import { BookOpen, Award, Target, Plus, Search, TrendingUp, Save, Trash2, X, Zap, Star, ChevronUp, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';

// ── 10 predefined category types
const CATEGORY_PRESETS = [
  { key: 'Technical',   emoji: '💻', color: '#3b82f6' },
  { key: 'Language',    emoji: '🗣️', color: '#10b981' },
  { key: 'Fitness',     emoji: '💪', color: '#f43f5e' },
  { key: 'Creative',    emoji: '🎨', color: '#ec4899' },
  { key: 'Leadership',  emoji: '🧭', color: '#f59e0b' },
  { key: 'Analytical',  emoji: '🔢', color: '#8b5cf6' },
  { key: 'Medical',     emoji: '🏥', color: '#06b6d4' },
  { key: 'Soft Skills', emoji: '🤝', color: '#a3e635' },
  { key: 'Arts',        emoji: '🎭', color: '#fb923c' },
  { key: 'General',     emoji: '⭐', color: '#94a3b8' },
];
const PRESET_MAP = Object.fromEntries(CATEGORY_PRESETS.map(c => [c.key, c]));

const STALE_DAYS = 14; // highlight if not practiced in 14+ days

function staleDays(last_practiced) {
  if (!last_practiced) return null;
  return Math.floor((Date.now() - new Date(last_practiced).getTime()) / 86400000);
}

// XP thresholds per level
const LEVELS = [
  { level: 1, label: 'Novice',      min: 0,   max: 19,  color: '#94a3b8', xpColor: 'from-slate-500 to-slate-400' },
  { level: 2, label: 'Beginner',    min: 20,  max: 39,  color: '#60a5fa', xpColor: 'from-blue-600 to-blue-400' },
  { level: 3, label: 'Learner',     min: 40,  max: 54,  color: '#34d399', xpColor: 'from-emerald-600 to-emerald-400' },
  { level: 4, label: 'Competent',   min: 55,  max: 69,  color: '#fbbf24', xpColor: 'from-amber-600 to-amber-400' },
  { level: 5, label: 'Proficient',  min: 70,  max: 79,  color: '#f97316', xpColor: 'from-orange-600 to-orange-400' },
  { level: 6, label: 'Advanced',    min: 80,  max: 89,  color: '#a855f7', xpColor: 'from-purple-600 to-purple-400' },
  { level: 7, label: 'Expert',      min: 90,  max: 94,  color: '#ec4899', xpColor: 'from-pink-600 to-pink-400' },
  { level: 8, label: 'Master',      min: 95,  max: 99,  color: '#f43f5e', xpColor: 'from-rose-600 to-rose-400' },
  { level: 9, label: 'Grandmaster', min: 100, max: 100, color: '#ffd700', xpColor: 'from-yellow-400 to-amber-300' },
];

function getLevel(proficiency) {
  return LEVELS.find(l => proficiency >= l.min && proficiency <= l.max) || LEVELS[0];
}

function XPBar({ proficiency, compact = false }) {
  const lvl = getLevel(proficiency);
  const next = LEVELS.find(l => l.level === lvl.level + 1);
  const progress = next ? Math.round(((proficiency - lvl.min) / (next.min - lvl.min)) * 100) : 100;
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold" style={{ color: lvl.color }}>Lv.{lvl.level}</span>
          <span className="text-xs font-semibold" style={{ color: lvl.color }}>{lvl.label}</span>
        </div>
        <span className="text-xs font-bold text-white">{proficiency}%</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: compact ? '5px' : '8px', background: 'rgba(255,255,255,0.08)' }}>
        <div className={`h-full rounded-full bg-gradient-to-r ${lvl.xpColor} transition-all duration-500`} style={{ width: `${proficiency}%` }} />
      </div>
      {!compact && next && <p className="text-xs text-gray-500">{progress}% to Lv.{next.level} {next.label}</p>}
      {!compact && !next && <p className="text-xs" style={{ color: '#ffd700' }}>✨ MAX LEVEL</p>}
    </div>
  );
}

function CategoryRadar({ catAverages }) {
  const entries = Object.entries(catAverages);
  if (entries.length < 3) return null;
  const cx = 110, cy = 110, r = 80;
  const n = entries.length;
  const points = entries.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  const valuePoints = entries.map(([, avg], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const frac = avg / 100;
    return { x: cx + r * frac * Math.cos(angle), y: cy + r * frac * Math.sin(angle) };
  });
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const polyStr = (pts) => pts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5"><Star size={12} className="text-amber-400" /> Category Radar</p>
      <svg width="220" height="220" viewBox="0 0 220 220" className="mx-auto block">
        {gridLevels.map(frac => (
          <polygon key={frac}
            points={polyStr(points.map((_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              return { x: cx + r * frac * Math.cos(angle), y: cy + r * frac * Math.sin(angle) };
            }))}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {points.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />)}
        <polygon points={polyStr(valuePoints)} fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.7)" strokeWidth="1.5" />
        {entries.map(([cat, avg], i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const lx = cx + (r + 18) * Math.cos(angle);
          const ly = cy + (r + 18) * Math.sin(angle);
          const lvl = getLevel(avg);
          return <text key={cat} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill={lvl.color}>{cat.slice(0, 10)}</text>;
        })}
        {valuePoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgb(99,102,241)" />)}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {entries.map(([cat, avg]) => {
          const lvl = getLevel(avg);
          return (
            <span key={cat} className="text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: lvl.color }} />
              <span className="text-gray-400">{cat}</span>
              <span className="font-bold" style={{ color: lvl.color }}>{avg}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Skills() {
  const skills = useStore(selectSkills) || [];
  const updateSkillsAction = useStore(selectUpdateSkills);

  const [searchTerm, setSearchTerm]           = useState('');
  const [activeCategory, setActiveCategory]   = useState('All');
  const [localSkills, setLocalSkills]         = useState(skills);
  const [isSaving, setIsSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName]           = useState('');
  const [levelUpId, setLevelUpId]             = useState(null);
  const [showPresets, setShowPresets]         = useState(false);
  const toast = useToast();

  useEffect(() => { setLocalSkills(skills); }, [skills]);

  const categories = useMemo(() => ['All', ...new Set(localSkills.map(s => s.category))], [localSkills]);

  const filteredSkills = useMemo(() => localSkills.filter(s => {
    const matchSearch = s.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat    = activeCategory === 'All' || s.category === activeCategory;
    return matchSearch && matchCat;
  }), [localSkills, searchTerm, activeCategory]);

  const catAverages = useMemo(() => {
    const map = {};
    const cats = [...new Set(localSkills.map(s => s.category))];
    cats.forEach(cat => {
      const cs = localSkills.filter(s => s.category === cat);
      map[cat] = Math.round(cs.reduce((a, b) => a + (b.proficiency || 0), 0) / cs.length) || 0;
    });
    return map;
  }, [localSkills]);

  const staleCount = useMemo(() =>
    localSkills.filter(s => { const d = staleDays(s.last_practiced); return d !== null && d >= STALE_DAYS; }).length,
  [localSkills]);

  const handleSkillUpdate = (id, field, newValue) => {
    const prev = localSkills.find(s => s.id === id);
    if (field === 'proficiency') {
      const prevLvl = getLevel(prev.proficiency).level;
      const newLvl  = getLevel(newValue).level;
      if (newLvl > prevLvl) setLevelUpId(id);
    }
    setLocalSkills(ps => ps.map(s => s.id === id ? { ...s, [field]: newValue } : s));
  };

  const markPracticed = (id) => {
    const today = new Date().toISOString().slice(0, 10);
    handleSkillUpdate(id, 'last_practiced', today);
    toast.success('Marked as practiced today!');
  };

  useEffect(() => {
    if (levelUpId) {
      const t = setTimeout(() => setLevelUpId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [levelUpId]);

  const saveToDatabase = async () => {
    setIsSaving(true);
    try {
      await updateSkillsAction(localSkills);
      toast.success('Skill Matrix saved!');
    } catch {
      toast.error('Failed to save skills');
    }
    setIsSaving(false);
  };

  const addNewSkill = (presetCategory = null) => {
    const cat = presetCategory || (activeCategory === 'All' ? 'General' : activeCategory);
    const preset = PRESET_MAP[cat];
    setLocalSkills(ps => [{
      id: Date.now().toString(),
      label: 'New Skill',
      description: '',
      proficiency: 10,
      icon: preset?.emoji || '🎯',
      category: cat,
      last_practiced: null,
    }, ...ps]);
    if (presetCategory) setActiveCategory(presetCategory);
    setShowPresets(false);
  };

  const doDelete = () => {
    setLocalSkills(ps => ps.filter(s => s.id !== confirmDelete));
    setConfirmDelete(null);
    toast.info('Skill removed. Save to persist.');
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    setLocalSkills(ps => [{
      id: Date.now().toString(), label: 'Initial Skill', description: '',
      proficiency: 0, icon: '🆕', category: newCatName.trim(), last_practiced: null,
    }, ...ps]);
    setActiveCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCategory(false);
  };

  const totalSkills = localSkills.length;
  const avgOverall  = totalSkills ? Math.round(localSkills.reduce((s, k) => s + (k.proficiency || 0), 0) / totalSkills) : 0;
  const mastered    = localSkills.filter(s => s.proficiency >= 100).length;
  const advanced    = localSkills.filter(s => s.proficiency >= 80 && s.proficiency < 100).length;

  return (
    <div className="fade-in space-y-6 p-4">
      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove skill?"
        description="Changes must be saved to persist."
        confirmLabel="Remove"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Level-up banner */}
      {levelUpId && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-amber-400/40 bg-black/80 backdrop-blur-md shadow-2xl animate-bounce">
            <Zap size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-300">Level Up! ⚡</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-amber-400 mb-1">SKILL MATRIX</p>
          <h2 className="text-2xl font-bold text-white">Interactive Proficiency</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track your capabilities · level up · visualize mastery</p>
        </div>
        <div className="flex gap-2">
          {staleCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle size={13} className="text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">{staleCount} stale</span>
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPresets(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition"
            >
              <Plus size={14} /> Add Skill
            </button>
            {showPresets && (
              <div className="absolute right-0 top-10 z-30 bg-gray-900 border border-white/15 rounded-xl shadow-2xl p-2 w-52">
                <p className="text-xs text-gray-500 px-2 pb-1 font-bold">PICK CATEGORY</p>
                {CATEGORY_PRESETS.map(p => (
                  <button key={p.key} onClick={() => addNewSkill(p.key)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2 transition">
                    <span>{p.emoji}</span>
                    <span style={{ color: p.color, fontWeight: 700 }}>{p.key}</span>
                  </button>
                ))}
                <div className="border-t border-white/10 mt-1 pt-1">
                  <button onClick={() => { addNewSkill(); setShowPresets(false); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/10 transition">+ Custom category</button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={saveToDatabase}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold transition"
          >
            <Save size={14} /> {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{totalSkills}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Skills</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{avgOverall}%</p>
          <p className="text-xs text-gray-500 mt-0.5">Overall Avg</p>
          <div className="w-full mt-1.5 rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${avgOverall}%` }} />
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: '#ffd700' }}>{mastered}</p>
          <p className="text-xs text-gray-500 mt-0.5">Grandmaster</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{staleCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Stale ({STALE_DAYS}d+)</p>
        </div>
      </div>

      {/* Category presets quick-add row */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center font-bold">CATEGORIES:</span>
        {CATEGORY_PRESETS.map(p => {
          const count = localSkills.filter(s => s.category === p.key).length;
          return (
            <button key={p.key}
              onClick={() => setActiveCategory(p.key)}
              style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                background: activeCategory === p.key ? p.color : 'rgba(255,255,255,0.05)',
                color: activeCategory === p.key ? '#fff' : 'var(--text-3)',
                border: activeCategory === p.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
            >{p.emoji} {p.key} {count > 0 ? `(${count})` : ''}</button>
          );
        })}
        <button
          onClick={() => setActiveCategory('All')}
          style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
            background: activeCategory === 'All' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            color: activeCategory === 'All' ? '#000' : 'var(--text-3)',
            border: activeCategory === 'All' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
        >All ({totalSkills})</button>
      </div>

      {/* Radar */}
      <CategoryRadar catAverages={catAverages} />

      {/* Search */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[220px]">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search skills…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-white text-sm placeholder-gray-600 flex-1"
          />
        </div>
        {showAddCategory ? (
          <div className="flex gap-1">
            <input autoFocus placeholder="Category" value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none w-24" />
            <button onClick={handleAddCategory} className="px-2 py-1 bg-amber-500 rounded-lg text-xs font-bold text-black"><Plus size={12}/></button>
            <button onClick={() => setShowAddCategory(false)} className="px-2 py-1 border border-white/10 rounded-lg text-xs text-gray-400"><X size={12}/></button>
          </div>
        ) : (
          <button onClick={() => setShowAddCategory(true)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-amber-500/40 text-amber-500/60 hover:text-amber-400 transition"
          >+ Custom Cat</button>
        )}
      </div>

      {/* Skill grid per category */}
      {[...new Set(filteredSkills.map(s => s.category))]
        .filter(cat => activeCategory === 'All' || cat === activeCategory)
        .map(cat => {
          const catSkills = filteredSkills.filter(s => s.category === cat);
          if (catSkills.length === 0) return null;
          const avg    = catAverages[cat] || 0;
          const catLvl = getLevel(avg);
          const preset = PRESET_MAP[cat];

          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-3 pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {preset && <span style={{ fontSize: '1rem' }}>{preset.emoji}</span>}
                <h3 className="text-base font-bold" style={{ color: preset?.color || catLvl.color }}>{cat}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${catLvl.color}22`, color: catLvl.color }}>
                  Lv.{catLvl.level} · {avg}% avg
                </span>
                <span className="text-xs text-gray-600 ml-auto">{catSkills.length} skill{catSkills.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catSkills.map(skill => {
                  const lvl          = getLevel(skill.proficiency);
                  const isLevelingUp = levelUpId === skill.id;
                  const sd           = staleDays(skill.last_practiced);
                  const isStale      = sd !== null && sd >= STALE_DAYS;
                  const neverPracticed = !skill.last_practiced;

                  return (
                    <div key={skill.id}
                      className={`relative rounded-xl border p-4 flex flex-col gap-3 transition ${
                        isLevelingUp ? 'border-amber-400/60 bg-amber-500/8 shadow-lg shadow-amber-500/10'
                          : isStale   ? 'border-yellow-500/40 bg-yellow-500/5'
                          : 'border-white/10 bg-white/4 hover:bg-white/6'
                      }`}
                    >
                      {isLevelingUp && (
                        <div className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs font-black px-2 py-0.5 rounded-full shadow animate-pulse">⚡ LVL UP!</div>
                      )}

                      {/* Stale warning badge */}
                      {isStale && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25">
                          <AlertTriangle size={11} className="text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">Not practiced in {sd} days</span>
                          <button onClick={() => markPracticed(skill.id)}
                            className="ml-auto text-xs px-2 py-0.5 rounded-md bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 font-semibold transition">
                            Mark Practiced
                          </button>
                        </div>
                      )}

                      {/* Delete */}
                      <button onClick={() => setConfirmDelete(skill.id)}
                        className="absolute top-3 right-3 p-1 rounded-lg border border-white/10 text-gray-600 hover:text-red-400 hover:border-red-500/30 transition">
                        <Trash2 size={12} />
                      </button>

                      {/* Icon + Name */}
                      <div className="flex items-start gap-3 pr-8">
                        <input type="text" value={skill.icon}
                          onChange={e => handleSkillUpdate(skill.id, 'icon', e.target.value)}
                          className="w-10 h-10 text-xl text-center bg-white/8 border border-white/10 rounded-xl flex-shrink-0" title="Emoji" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <input type="text" value={skill.label}
                            onChange={e => handleSkillUpdate(skill.id, 'label', e.target.value)}
                            className="w-full bg-transparent border-b border-white/15 text-white font-bold text-sm pb-0.5 focus:outline-none focus:border-amber-400"
                            placeholder="Skill name" />
                          <input type="text" value={skill.category}
                            onChange={e => handleSkillUpdate(skill.id, 'category', e.target.value)}
                            className="w-full bg-transparent text-gray-500 text-xs focus:outline-none focus:text-gray-300"
                            placeholder="Category" />
                        </div>
                      </div>

                      {/* last_practiced row */}
                      <div className="flex items-center gap-2">
                        <Clock size={11} className="text-gray-500 flex-shrink-0" />
                        <label className="text-xs text-gray-500">Last practiced:</label>
                        <input type="date" value={skill.last_practiced || ''}
                          onChange={e => handleSkillUpdate(skill.id, 'last_practiced', e.target.value)}
                          className="bg-transparent border-b border-white/10 text-xs text-gray-300 focus:outline-none focus:border-amber-400 flex-1" />
                        {(neverPracticed || isStale) && (
                          <button onClick={() => markPracticed(skill.id)}
                            style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', cursor: 'pointer', fontWeight: 700 }}
                          >Today</button>
                        )}
                      </div>

                      {/* Description */}
                      <textarea value={skill.description || ''}
                        onChange={e => handleSkillUpdate(skill.id, 'description', e.target.value)}
                        placeholder="Notes or description…" rows={2}
                        className="w-full bg-black/20 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:border-white/20 resize-none" />

                      {/* XP bar + slider */}
                      <div className="space-y-2">
                        <XPBar proficiency={skill.proficiency} />
                        <input type="range" min="0" max="100" step="1"
                          value={skill.proficiency}
                          onChange={e => handleSkillUpdate(skill.id, 'proficiency', parseInt(e.target.value) || 0)}
                          className="w-full accent-amber-400" style={{ cursor: 'pointer' }} />
                      </div>

                      {skill.proficiency >= 100 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)' }}>
                          <Star size={12} style={{ color: '#ffd700' }} />
                          <span className="text-xs font-bold" style={{ color: '#ffd700' }}>GRANDMASTER</span>
                        </div>
                      )}
                      {skill.proficiency >= 80 && skill.proficiency < 100 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <TrendingUp size={12} className="text-purple-400" />
                          <span className="text-xs font-bold text-purple-400">Advanced Mastery</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {filteredSkills.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p>No skills found.</p>
          <button onClick={() => addNewSkill()}
            className="mt-3 px-4 py-2 bg-amber-500 text-black text-sm font-bold rounded-xl">Create First Skill</button>
        </div>
      )}
    </div>
  );
}
