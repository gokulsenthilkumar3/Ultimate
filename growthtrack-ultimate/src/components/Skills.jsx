import React, { useState, useMemo, useEffect } from 'react';
import useStore, { selectSkills, selectUpdateSkills } from '../store/useStore';
import { BookOpen, Award, Target, Plus, Search, TrendingUp, Save, Trash2, X, Zap, Star, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';

// ── 10 predefined category presets
const CATEGORY_PRESETS = [
  { key: 'Technical',   emoji: '💻', color: '#3b82f6' },
  { key: 'Language',    emoji: '🌐', color: '#10b981' },
  { key: 'Fitness',     emoji: '💪', color: '#f43f5e' },
  { key: 'Creative',    emoji: '🎨', color: '#ec4899' },
  { key: 'Leadership',  emoji: '🧭', color: '#f59e0b' },
  { key: 'Analytical',  emoji: '📊', color: '#8b5cf6' },
  { key: 'Social',      emoji: '🤝', color: '#0ea5e9' },
  { key: 'Mindfulness', emoji: '🧘', color: '#6366f1' },
  { key: 'Business',    emoji: '💼', color: '#f97316' },
  { key: 'General',     emoji: '🎯', color: '#94a3b8' },
];
const PRESET_MAP = Object.fromEntries(CATEGORY_PRESETS.map(c => [c.key, c]));

const STALE_DAYS = 14; // warn if last_practiced older than this

function staleDays(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── XP levels
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
  const progress = next
    ? Math.round(((proficiency - lvl.min) / (next.min - lvl.min)) * 100)
    : 100;
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
          <polygon key={frac} points={polyStr(points.map((_, i) => { const angle = (Math.PI * 2 * i) / n - Math.PI / 2; return { x: cx + r * frac * Math.cos(angle), y: cy + r * frac * Math.sin(angle) }; }))} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
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
  const toast = useToast();

  useEffect(() => { setLocalSkills(skills); }, [skills]);

  // All categories = presets + any custom ones already in skills
  const categories = useMemo(() => {
    const presetKeys = CATEGORY_PRESETS.map(c => c.key);
    const customCats = [...new Set(localSkills.map(s => s.category))].filter(c => !presetKeys.includes(c));
    return ['All', ...presetKeys, ...customCats];
  }, [localSkills]);

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

  const handleSkillUpdate = (id, field, newValue) => {
    const prev = localSkills.find(s => s.id === id);
    if (field === 'proficiency') {
      const prevLvl = getLevel(prev.proficiency).level;
      const newLvl  = getLevel(newValue).level;
      if (newLvl > prevLvl) setLevelUpId(id);
    }
    // Auto-stamp last_practiced when proficiency changes
    const extra = field === 'proficiency' ? { last_practiced: new Date().toISOString().slice(0, 10) } : {};
    setLocalSkills(ps => ps.map(s => s.id === id ? { ...s, [field]: newValue, ...extra } : s));
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

  const addNewSkill = () => {
    const defaultCat = activeCategory === 'All' ? 'General' : activeCategory;
    const preset = PRESET_MAP[defaultCat];
    const newSkill = {
      id: Date.now().toString(),
      label: 'New Skill',
      description: '',
      proficiency: 10,
      icon: preset?.emoji || '🎯',
      category: defaultCat,
      last_practiced: null,
    };
    setLocalSkills(ps => [newSkill, ...ps]);
  };

  const doDelete = () => {
    setLocalSkills(ps => ps.filter(s => s.id !== confirmDelete));
    setConfirmDelete(null);
    toast.info('Skill removed. Save to persist.');
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newSkill = {
      id: Date.now().toString(),
      label: 'Initial Skill',
      description: '',
      proficiency: 0,
      icon: '🆕',
      category: newCatName.trim(),
      last_practiced: null,
    };
    setLocalSkills(ps => [newSkill, ...ps]);
    setActiveCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCategory(false);
  };

  const totalSkills = localSkills.length;
  const avgOverall  = totalSkills ? Math.round(localSkills.reduce((s, k) => s + (k.proficiency || 0), 0) / totalSkills) : 0;
  const mastered    = localSkills.filter(s => s.proficiency >= 100).length;
  const advanced    = localSkills.filter(s => s.proficiency >= 80 && s.proficiency < 100).length;
  const staleCount  = localSkills.filter(s => { const d = staleDays(s.last_practiced); return d !== null && d >= STALE_DAYS; }).length;

  // Visible categories = only those that have skills (when All) or the selected one
  const visibleCats = categories.filter(c => c !== 'All' && (activeCategory === 'All' || c === activeCategory));

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

      {/* Level-up toast */}
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
          <button onClick={addNewSkill} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition">
            <Plus size={14} /> Add Skill
          </button>
          <button onClick={saveToDatabase} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold transition">
            <Save size={14} /> {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { val: totalSkills, label: 'Total Skills',  color: 'text-white' },
          { val: `${avgOverall}%`, label: 'Overall Avg', color: 'text-amber-400' },
          { val: mastered,   label: 'Grandmaster',   color: 'text-yellow-400' },
          { val: advanced,   label: 'Advanced+',     color: 'text-purple-400' },
          { val: staleCount, label: 'Stale Skills',  color: staleCount > 0 ? 'text-orange-400' : 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stale warning banner */}
      {staleCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/8">
          <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />
          <p className="text-xs text-orange-300">
            <strong>{staleCount}</strong> skill{staleCount !== 1 ? 's' : ''} haven't been practiced in over {STALE_DAYS} days. Scroll down to find them highlighted.
          </p>
        </div>
      )}

      {/* Radar chart */}
      <CategoryRadar catAverages={catAverages} />

      {/* Search + Category filters */}
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
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${ activeCategory === 'All' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300' }`}
          >All</button>
          {CATEGORY_PRESETS.map(c => {
            const count = localSkills.filter(s => s.category === c.key).length;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  activeCategory === c.key
                    ? 'border-transparent text-white'
                    : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                }`}
                style={activeCategory === c.key ? { background: `${c.color}33`, borderColor: c.color, color: c.color } : {}}
              >{c.emoji} {c.key}{count > 0 ? ` (${count})` : ''}</button>
            );
          })}
          {showAddCategory ? (
            <div className="flex gap-1">
              <input autoFocus placeholder="Category" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none w-24" />
              <button onClick={handleAddCategory} className="px-2 py-1 bg-amber-500 rounded-lg text-xs font-bold text-black"><Plus size={12}/></button>
              <button onClick={() => setShowAddCategory(false)} className="px-2 py-1 border border-white/10 rounded-lg text-xs text-gray-400"><X size={12}/></button>
            </div>
          ) : (
            <button onClick={() => setShowAddCategory(true)} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-amber-500/40 text-amber-500/60 hover:text-amber-400 transition">+ Category</button>
          )}
        </div>
      </div>

      {/* Skill grid per category */}
      {visibleCats.map(cat => {
        const catSkills = filteredSkills.filter(s => s.category === cat);
        if (catSkills.length === 0) return null;
        const avg    = catAverages[cat] || 0;
        const catLvl = getLevel(avg);
        const preset = PRESET_MAP[cat];

        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3 pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {preset && <span style={{ fontSize: '1rem' }}>{preset.emoji}</span>}
              <h3 className="text-base font-bold" style={{ color: preset?.color || catLvl.color }}>{cat}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${catLvl.color}22`, color: catLvl.color }}>Lv.{catLvl.level} · {avg}% avg</span>
              <span className="text-xs text-gray-600 ml-auto">{catSkills.length} skill{catSkills.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catSkills.map(skill => {
                const lvl          = getLevel(skill.proficiency);
                const isLevelingUp = levelUpId === skill.id;
                const daysStale    = staleDays(skill.last_practiced);
                const isStale      = daysStale !== null && daysStale >= STALE_DAYS;

                return (
                  <div
                    key={skill.id}
                    className={`relative rounded-xl border p-4 flex flex-col gap-3 transition ${
                      isLevelingUp ? 'border-amber-400/60 bg-amber-500/8 shadow-lg shadow-amber-500/10'
                      : isStale    ? 'border-orange-500/40 bg-orange-500/5'
                      : 'border-white/10 bg-white/4 hover:bg-white/6'
                    }`}
                  >
                    {isLevelingUp && (
                      <div className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs font-black px-2 py-0.5 rounded-full shadow animate-pulse">⚡ LVL UP!</div>
                    )}

                    {/* Delete */}
                    <button onClick={() => setConfirmDelete(skill.id)} className="absolute top-3 right-3 p-1 rounded-lg border border-white/10 text-gray-600 hover:text-red-400 hover:border-red-500/30 transition">
                      <Trash2 size={12} />
                    </button>

                    {/* Icon + Name */}
                    <div className="flex items-start gap-3 pr-8">
                      <input type="text" value={skill.icon} onChange={e => handleSkillUpdate(skill.id, 'icon', e.target.value)} className="w-10 h-10 text-xl text-center bg-white/8 border border-white/10 rounded-xl flex-shrink-0" title="Emoji" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <input type="text" value={skill.label} onChange={e => handleSkillUpdate(skill.id, 'label', e.target.value)} className="w-full bg-transparent border-b border-white/15 text-white font-bold text-sm pb-0.5 focus:outline-none focus:border-amber-400" placeholder="Skill name" />
                        <input type="text" value={skill.category} onChange={e => handleSkillUpdate(skill.id, 'category', e.target.value)} className="w-full bg-transparent text-gray-500 text-xs focus:outline-none focus:text-gray-300" placeholder="Category" />
                      </div>
                    </div>

                    {/* Stale warning */}
                    {isStale && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/25">
                        <AlertTriangle size={11} className="text-orange-400" />
                        <span className="text-xs text-orange-300 font-semibold">Stale — {daysStale}d since last practice</span>
                        <button
                          onClick={() => handleSkillUpdate(skill.id, 'last_practiced', new Date().toISOString().slice(0, 10))}
                          className="ml-auto text-xs text-orange-400 hover:text-white underline"
                        >Mark practiced</button>
                      </div>
                    )}

                    {/* Last practiced */}
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-gray-600" />
                      <label className="text-xs text-gray-600">Last practiced:</label>
                      <input
                        type="date"
                        value={skill.last_practiced || ''}
                        onChange={e => handleSkillUpdate(skill.id, 'last_practiced', e.target.value)}
                        className="bg-transparent border-none text-xs text-gray-400 focus:outline-none focus:text-white ml-1"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>

                    {/* Description */}
                    <textarea value={skill.description || ''} onChange={e => handleSkillUpdate(skill.id, 'description', e.target.value)} placeholder="Notes or description…" rows={2} className="w-full bg-black/20 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:border-white/20 resize-none" />

                    {/* XP bar + slider */}
                    <div className="space-y-2">
                      <XPBar proficiency={skill.proficiency} />
                      <input type="range" min="0" max="100" step="1" value={skill.proficiency} onChange={e => handleSkillUpdate(skill.id, 'proficiency', parseInt(e.target.value) || 0)} className="w-full accent-amber-400" style={{ cursor: 'pointer' }} />
                    </div>

                    {/* Mastery badge */}
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
          <button onClick={addNewSkill} className="mt-3 px-4 py-2 bg-amber-500 text-black text-sm font-bold rounded-xl">Create First Skill</button>
        </div>
      )}
    </div>
  );
}
