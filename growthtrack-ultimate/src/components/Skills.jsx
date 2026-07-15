import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Zap, Plus, Trash2, ChevronUp, Lock, Star, TrendingUp, Award } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

// ── XP Curve (non-linear, feels like RPG) ─────────────────────────────────
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}
function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}
function levelFromXP(xp) {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level++;
  return level;
}
function xpProgressInLevel(xp) {
  const level     = levelFromXP(xp);
  const startXP   = totalXpForLevel(level);
  const endXP     = totalXpForLevel(level + 1);
  const progress  = xp - startXP;
  const required  = endXP - startXP;
  return { level, progress, required, pct: Math.min(100, Math.round((progress / required) * 100)) };
}

// ── Rank system ────────────────────────────────────────────────────────────
const RANKS = [
  { min: 1,  max: 4,  title: 'Beginner',   emoji: '🌱', color: '#6b7280' },
  { min: 5,  max: 9,  title: 'Apprentice', emoji: '⚡', color: '#3b82f6' },
  { min: 10, max: 14, title: 'Skilled',    emoji: '🔥', color: '#10b981' },
  { min: 15, max: 19, title: 'Expert',     emoji: '💎', color: '#8b5cf6' },
  { min: 20, max: 24, title: 'Master',     emoji: '🏆', color: '#f59e0b' },
  { min: 25, max: 999,title: 'Legendary',  emoji: '👑', color: '#f43f5e' },
];
function getrank(level) {
  return RANKS.find(r => level >= r.min && level <= r.max) || RANKS[0];
}

const SKILL_CATEGORIES = [
  { key: 'technical',  label: 'Technical',   emoji: '⚙️',  color: '#3b82f6' },
  { key: 'creative',   label: 'Creative',    emoji: '🎨',  color: '#ec4899' },
  { key: 'fitness',    label: 'Fitness',     emoji: '💪',  color: '#10b981' },
  { key: 'soft',       label: 'Soft Skills', emoji: '🗣️',  color: '#f59e0b' },
  { key: 'knowledge',  label: 'Knowledge',   emoji: '📚',  color: '#8b5cf6' },
  { key: 'financial',  label: 'Financial',   emoji: '💰',  color: '#22c55e' },
  { key: 'language',   label: 'Language',    emoji: '🌐',  color: '#0ea5e9' },
  { key: 'other',      label: 'Other',       emoji: '⭐',  color: '#6b7280' },
];
const CAT_MAP = Object.fromEntries(SKILL_CATEGORIES.map(c => [c.key, c]));

// ── Particle level-up effect ───────────────────────────────────────────────
function LevelUpBurst({ color, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas  = canvasRef.current;
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    const W = canvas.width = 200;
    const H = canvas.height = 200;
    const cx = W / 2, cy = H / 2;
    const particles = Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, size: 3 + Math.random() * 5 };
    });

    let raf;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 0.025;
        if (p.life > 0) {
          alive++;
          ctx.globalAlpha = p.life;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if (alive > 0) raf = requestAnimationFrame(animate);
      else onDone?.();
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10 }} />
  );
}

// ── Circular XP ring ──────────────────────────────────────────────────────
function XPRing({ pct, level, color, size = 56 }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
              style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
            fill={color} fontSize={size > 50 ? 14 : 11} fontWeight="900" transform={`rotate(90 ${size/2} ${size/2})`}>
        {level}
      </text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Skills() {
  const toast = useToast();
  const skills      = useStore(s => s.skills)      || [];
  const addSkill    = useStore(s => s.addSkill);
  const updateSkill = useStore(s => s.updateSkill);
  const deleteSkill = useStore(s => s.deleteSkill);

  const [activeTab, setActiveTab]   = useState('tree');
  const [catFilter, setCatFilter]   = useState('all');
  const [showAdd,   setShowAdd]     = useState(false);
  const [levelUp,   setLevelUp]     = useState(null); // { id, color }
  const [form, setForm] = useState({ name: '', category: 'technical', xp: 0, description: '' });
  const [xpInputs, setXpInputs] = useState({});

  const enriched = useMemo(() => skills.map(s => {
    const { level, pct, progress, required } = xpProgressInLevel(Number(s.xp) || 0);
    const cat = CAT_MAP[s.category] || CAT_MAP.other;
    const rank = getrank(level);
    return { ...s, level, pct, progress, required, cat, rank };
  }), [skills]);

  const filtered = useMemo(() => {
    let list = catFilter === 'all' ? enriched : enriched.filter(s => s.category === catFilter);
    return list.sort((a, b) => b.xp - a.xp);
  }, [enriched, catFilter]);

  const totalXP    = useMemo(() => enriched.reduce((s, sk) => s + (Number(sk.xp) || 0), 0), [enriched]);
  const avgLevel   = useMemo(() => enriched.length ? Math.round(enriched.reduce((s, sk) => s + sk.level, 0) / enriched.length) : 0, [enriched]);
  const maxLevel   = useMemo(() => enriched.reduce((m, sk) => Math.max(m, sk.level), 0), [enriched]);
  const globalRank = getrank(avgLevel || 1);

  const doAdd = () => {
    if (!form.name.trim()) { toast.error('Skill name required'); return; }
    const skill = { ...form, id: Date.now(), xp: Number(form.xp) || 0, createdAt: new Date().toISOString() };
    if (typeof addSkill === 'function') addSkill(skill);
    setForm({ name: '', category: 'technical', xp: 0, description: '' });
    setShowAdd(false);
    toast.success(`Skill "${skill.name}" added!`);
  };

  const addXP = (id, amount) => {
    const skill    = skills.find(s => s.id === id);
    if (!skill) return;
    const prevLevel = levelFromXP(Number(skill.xp) || 0);
    const newXP     = (Number(skill.xp) || 0) + amount;
    const newLevel  = levelFromXP(newXP);
    const cat       = CAT_MAP[skill.category] || CAT_MAP.other;
    if (typeof updateSkill === 'function') updateSkill(id, { xp: newXP });
    setXpInputs(x => { const n = { ...x }; delete n[id]; return n; });
    if (newLevel > prevLevel) {
      toast.success(`🎉 Level up! ${skill.name} reached level ${newLevel}!`);
      setLevelUp({ id, color: cat.color });
      setTimeout(() => setLevelUp(null), 2500);
    } else {
      toast.success(`+${amount} XP → ${skill.name}`);
    }
  };

  const doDelete = (id) => {
    const s = skills.find(x => x.id === id);
    if (typeof deleteSkill === 'function') deleteSkill(id);
    toast.info(`${s?.name} removed`, 5000, { action: { label: 'Undo', onClick: () => { if (s && typeof addSkill === 'function') addSkill(s); } } });
  };

  // Build skill tree: group by category with prerequisite logic
  const skillsByCategory = useMemo(() => {
    const g = {};
    filtered.forEach(s => {
      if (!g[s.category]) g[s.category] = [];
      g[s.category].push(s);
    });
    return g;
  }, [filtered]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Growth</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Skill Tree</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{skills.length} skills · {totalXP.toLocaleString()} total XP</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="btn-primary"><Plus size={14} /> Add Skill</button>
      </div>

      {/* Global stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: `3px solid ${globalRank.color}` }}>
          <p style={{ fontSize: '1.75rem' }}>{globalRank.emoji}</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 900, color: globalRank.color }}>{globalRank.title}</p>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '3px' }}>Global Rank</p>
        </div>
        {[
          { label: 'Total XP',   val: totalXP.toLocaleString(), color: 'var(--accent)' },
          { label: 'Avg Level',  val: avgLevel,                  color: '#0ea5e9'      },
          { label: 'Max Level',  val: maxLevel,                  color: '#f59e0b'      },
          { label: 'Skills',     val: skills.length,             color: '#10b981'      },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {['tree', 'list', 'radar'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: activeTab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: activeTab === t ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card mb-lg">
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>New Skill</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <input placeholder="Skill name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
              {SKILL_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
            <input type="number" placeholder="Starting XP (0)" value={form.xp} onChange={e => setForm(f => ({ ...f, xp: e.target.value }))} className="form-input" />
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-input" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-3)' }}>Cancel</button>
            <button onClick={doAdd} className="btn-primary">Add Skill</button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setCatFilter('all')} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: catFilter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: catFilter === 'all' ? '#000' : 'var(--text-3)', border: catFilter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>All</button>
        {SKILL_CATEGORIES.map(c => {
          const count = skills.filter(s => s.category === c.key).length;
          if (count === 0) return null;
          return (
            <button key={c.key} onClick={() => setCatFilter(c.key)} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: catFilter === c.key ? c.color : 'rgba(255,255,255,0.05)', color: catFilter === c.key ? '#fff' : 'var(--text-3)', border: catFilter === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
              {c.emoji} {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {skills.length === 0 && (
        <EmptyState icon={Zap} title="No Skills Yet" description="Start tracking your skills and level up over time." ctaLabel="Add First Skill" onAction={() => setShowAdd(true)} />
      )}

      {/* Tree view */}
      {activeTab === 'tree' && skills.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {SKILL_CATEGORIES.filter(c => skillsByCategory[c.key]?.length > 0).map(cat => (
            <div key={cat.key}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{cat.emoji}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat.label}</span>
                <div style={{ flex: 1, height: '1px', background: `${cat.color}33` }} />
              </div>

              {/* Skill nodes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                {skillsByCategory[cat.key].map((skill, idx) => {
                  const isLU = levelUp?.id === skill.id;
                  const xpIn = xpInputs[skill.id] || '';
                  return (
                    <div key={skill.id} style={{
                      borderRadius: '14px', background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${skill.cat.color}44`,
                      overflow: 'hidden', position: 'relative',
                      boxShadow: isLU ? `0 0 20px ${skill.cat.color}55` : 'none',
                      transition: 'box-shadow 0.3s',
                    }}>
                      {isLU && <LevelUpBurst color={skill.cat.color} onDone={() => setLevelUp(null)} />}

                      <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        {/* XP Ring */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <XPRing pct={skill.pct} level={skill.level} color={skill.cat.color} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)' }}>{skill.name}</p>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button onClick={() => doDelete(skill.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.4)', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
                            </div>
                          </div>

                          {/* Rank badge */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: skill.rank.color, background: `${skill.rank.color}18`, padding: '1px 7px', borderRadius: '99px', border: `1px solid ${skill.rank.color}44` }}>
                              {skill.rank.emoji} {skill.rank.title} Lv.{skill.level}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{Number(skill.xp).toLocaleString()} XP</span>
                          </div>

                          {skill.description && <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '6px' }}>{skill.description}</p>}

                          {/* XP progress bar */}
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{skill.progress} / {skill.required} XP to next level</span>
                              <span style={{ fontSize: '0.58rem', color: skill.cat.color, fontWeight: 700 }}>{skill.pct}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${skill.pct}%`, background: `linear-gradient(90deg, ${skill.cat.color}, ${skill.cat.color}cc)`, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                            </div>
                          </div>

                          {/* XP input */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="number" placeholder="+XP" value={xpIn}
                              onChange={e => setXpInputs(x => ({ ...x, [skill.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') addXP(skill.id, Number(xpIn) || 10); }}
                              style={{ width: '70px', padding: '3px 7px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-1)', outline: 'none' }} />
                            {[10, 25, 50, 100].map(xp => (
                              <button key={xp} onClick={() => addXP(skill.id, xp)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 700, background: `${skill.cat.color}18`, border: `1px solid ${skill.cat.color}44`, color: skill.cat.color, cursor: 'pointer' }}>+{xp}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Level preview strip */}
                      <div style={{ height: '3px', background: `linear-gradient(90deg, ${skill.cat.color}80, ${skill.cat.color})`, width: `${skill.pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {activeTab === 'list' && skills.length > 0 && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Skill', 'Category', 'Level', 'Rank', 'XP', 'Progress', ''].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: h === 'Skill' || h === 'Category' ? 'left' : 'center', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.6rem', fontWeight: 700 }}>{s.name}</td>
                  <td style={{ padding: '0.6rem 0.6rem', color: s.cat.color, fontWeight: 700 }}>{s.cat.emoji} {s.cat.label}</td>
                  <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontWeight: 900, color: s.cat.color, fontSize: '1rem' }}>{s.level}</td>
                  <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: s.rank.color, background: `${s.rank.color}18`, padding: '2px 8px', borderRadius: '99px' }}>{s.rank.emoji} {s.rank.title}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-2)' }}>{Number(s.xp).toLocaleString()}</td>
                  <td style={{ padding: '0.6rem 0.6rem', minWidth: '120px' }}>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                      <div style={{ height: '100%', width: `${s.pct}%`, background: s.cat.color, borderRadius: '99px' }} />
                    </div>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{s.pct}%</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button onClick={() => addXP(s.id, 10)} style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: 700, background: `${s.cat.color}18`, border: `1px solid ${s.cat.color}44`, color: s.cat.color, cursor: 'pointer' }}>+10 XP</button>
                      <button onClick={() => doDelete(s.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Radar / spider chart view */}
      {activeTab === 'radar' && skills.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card">
            <span className="card-title">Category Strength Radar</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Average level per category, max-normalised.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {SKILL_CATEGORIES.filter(c => skills.some(s => s.category === c.key)).map(cat => {
                const catSkills = enriched.filter(s => s.category === cat.key);
                const avgLvl    = catSkills.length ? catSkills.reduce((s, x) => s + x.level, 0) / catSkills.length : 0;
                const pct       = Math.min(100, (avgLvl / 30) * 100);
                return (
                  <div key={cat.key} style={{ flex: '1 1 160px', padding: '0.85rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: `1px solid ${cat.color}33` }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 800, color: cat.color, marginBottom: '0.5rem' }}>{cat.emoji} {cat.label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: cat.color }}>{avgLvl.toFixed(1)}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>avg level</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '99px', transition: 'width 0.5s' }} />
                    </div>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px' }}>{catSkills.length} skill{catSkills.length !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Top skills leaderboard */}
          <div className="glass-card">
            <span className="card-title">Top 10 Skills</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              {[...enriched].sort((a, b) => b.xp - a.xp).slice(0, 10).map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: i === 0 ? `${s.cat.color}12` : 'rgba(255,255,255,0.02)' }}>
                  <span style={{ width: '20px', textAlign: 'center', fontWeight: 900, fontSize: '0.8rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#fb923c' : 'var(--text-3)' }}>{i + 1}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: '0.65rem', color: s.cat.color, fontWeight: 700 }}>Lv.{s.level}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>{Number(s.xp).toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
