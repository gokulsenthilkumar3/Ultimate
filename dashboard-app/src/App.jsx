import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  USER, STATUS, BODY_PARTS, PE_EXERCISES, LIFESTYLE_TIPS,
  NUTRITION, TRAINING_PLAN, HEALTH_SCORE, DAYS, ACTIVE_DAYS,
  WEEK_LABELS, HEALTH_QA, GOLDEN_RATIO, MEDICAL_DATA, MENTAL_DATA,
} from "./data/userData";
import { Ring, CountUp, Badge, PartCard, ProgressBar, StatCard, ChartTip, SectionHead, Alert } from "./components/UIComponents";
import Body3D from "./components/Body3D";
import Overview from "./components/Overview";
import Medical from "./components/Medical";
import Physique from "./components/Physique";
import Lifestyle from "./components/Lifestyle";
import { useUserStore } from "./context/UserStore";
import { COLOR_ACCENTS, DARK_THEME, LIGHT_THEME, applyTheme } from "./themes";
import "./index.css";

// ─── helpers ──────────────────────────────────────────────────────
const sysParts = sys => Object.values(BODY_PARTS).filter(p => p.sys === sys);
const avgScore = ps  => ps.length ? Math.round(ps.map(p => ({ critical:14, poor:36, fair:60, good:84 }[p.status]||50)).reduce((a,b)=>a+b,0)/ps.length) : 0;

// ─── TABS CONFIG ──────────────────────────────────────────────────
const TABS = [
  { id:"overview",   emoji:"🏠", label:"Overview"   },
  { id:"assessment", emoji:"📋", label:"Assessment"  },
  { id:"medical",    emoji:"🩸", label:"Medical"     },
  { id:"body3d",     emoji:"🧍", label:"3D Body"     },
  { id:"today",      emoji:"💪", label:"Today"       },
  { id:"muscles",    emoji:"🏋️", label:"Muscles"     },
  { id:"organs",     emoji:"🫀", label:"Organs"      },
  { id:"joints",     emoji:"🦴", label:"Joints"      },
  { id:"appearance", emoji:"✨", label:"Appearance"  },
  { id:"physique",   emoji:"🏛️", label:"Physique"    },
  { id:"nutrition",  emoji:"🍽️", label:"Nutrition"   },
  { id:"training",   emoji:"🏋️", label:"Training"    },
  { id:"exercises",  emoji:"📏", label:"PE Library"  },
  { id:"log",        emoji:"🗒️", label:"Log"         },
  { id:"progress",   emoji:"📈", label:"Progress"    },
  { id:"lifestyle",  emoji:"🌱", label:"Lifestyle"   },
  { id:"mental",     emoji:"🧠", label:"Mental"      },
];

// ─── LOCAL STORAGE HOOK REMOVED ───────────────────────────────────

export default function App() {
  const { mode, setMode, accent, setAccent, done, setDone, toggleDone, measurements, addMeasurement } = useUserStore();
  const [tab,          setTab]          = useState("overview");
  const [settings,     setSettings]     = useState(false);
  const [mobileNav,    setMobileNav]    = useState(false);
  const [expanded,     setExpanded]     = useState(null);
  const [qaExpanded,   setQaExpanded]   = useState(null);
  const [form, setForm] = useState({ week: "Week 2", length: "", girth: "" });
  const [timerActive, setTimerActive] = useState(false);
  const [timerSec,    setTimerSec]    = useState(0);
  const timerRef = useRef(null);

  // Apply theme on change
  useEffect(() => { applyTheme(mode, accent); }, [mode, accent]);

  // Timer
  useEffect(() => {
    if (timerActive) timerRef.current = setInterval(() => setTimerSec(s => s+1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const today    = new Date().getDay();
  const dayIdx   = today === 0 ? 6 : today - 1;
  const isRest   = !ACTIVE_DAYS[dayIdx];
  const doneCount   = Object.values(done).filter(Boolean).length;
  const sessionPct  = Math.round((doneCount / PE_EXERCISES.length) * 100);

  const latest      = measurements[measurements.length - 1];
  const lengthG     = (latest.length - USER.currentLength).toFixed(2);
  const girthG      = (latest.girth  - USER.currentGirth).toFixed(2);
  const lengthPct   = Math.min(100, Math.round(((latest.length - USER.currentLength) / USER.gainLength) * 100));
  const girthPct    = Math.min(100, Math.round(((latest.girth  - USER.currentGirth)  / USER.gainGirth)  * 100));

  function addMeasure() {
    if (!form.length || !form.girth) return;
    addMeasurement(form.week, form.length, form.girth);
    setForm({ week: `Week ${measurements.length + 2}`, length: "", girth: "" });
  }

  function switchTab(id) {
    setTab(id);
    setSettings(false);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const radarData = [
    { subject:"Muscles",    score: avgScore(sysParts("muscles"))    },
    { subject:"Organs",     score: avgScore(sysParts("organs"))     },
    { subject:"Joints",     score: avgScore(sysParts("joints"))     },
    { subject:"Appearance", score: avgScore(sysParts("appearance")) },
    { subject:"Sexual",     score: avgScore(sysParts("sexual"))     },
  ];

  const accentColor = COLOR_ACCENTS[accent]?.primary || "#f59e0b";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-1)" }}>

      {/* ═══════════════ HEADER ═══════════════════════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 500,
        background: "var(--bg-glass)", backdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid var(--border)",
        padding: "0 20px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${accentColor}, ${COLOR_ACCENTS[accent]?.dark || "#d97706"})`,
            fontSize: 16, boxShadow: `0 4px 12px var(--accent-glow)`,
          }}>⚡</div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
              GrowthTrack
            </div>
            <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Ultimate • Age {USER.age} • {USER.height}cm • {USER.weight}kg
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Health Score */}
          <div style={{
            padding: "4px 12px", borderRadius: 999,
            background: HEALTH_SCORE < 50 ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.12)",
            border: `1px solid ${HEALTH_SCORE < 50 ? "rgba(249,115,22,0.3)" : "rgba(34,197,94,0.3)"}`,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div className="pulse-dot" style={{ background: HEALTH_SCORE < 50 ? "#f97316" : "#22c55e" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: HEALTH_SCORE < 50 ? "#f97316" : "#22c55e" }}>{HEALTH_SCORE}</span>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>/100</span>
          </div>

          {/* Light/Dark toggle */}
          <button
            onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)",
              background: "var(--bg-card)", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {mode === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettings(s => !s)}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)",
              background: settings ? "var(--accent)" : "var(--bg-card)",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", color: settings ? "#000" : "var(--text-2)",
            }}
            title="Settings & Themes"
          >⚙️</button>

          {/* Hamburger (Mobile) */}
          <button className="hamburger-btn mobile-show" onClick={() => setMobileNav(true)}>
            ☰
          </button>
        </div>
      </header>

      {/* ═══════════════ TABS ══════════════════════════════════ */}
      <nav className="tab-scroll mobile-hide" style={{
        position: "sticky", top: 56, zIndex: 400,
        background: "var(--bg-glass)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 2px", maxWidth: 900, margin: "8px auto", padding: "0 12px" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => switchTab(t.id)}
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══════════════ MOBILE NAV DRAWER ════════════════════════ */}
      {mobileNav && (
        <>
          <div className="mobile-drawer-overlay mobile-show" onClick={() => setMobileNav(false)} />
          <aside className="mobile-drawer mobile-show">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>Menu</div>
              <button onClick={() => setMobileNav(false)} style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 8,
                color: "var(--text-2)", cursor: "pointer", padding: "4px 10px", fontSize: 13,
              }}>✕ Close</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${tab === t.id ? "active" : ""}`}
                  onClick={() => switchTab(t.id)}
                  style={{ justifyContent: "flex-start", padding: "12px 14px", fontSize: 14 }}
                >
                  <span style={{ fontSize: 18 }}>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </aside>
        </>
      )}

      {/* ═══════════════ SETTINGS PANEL ════════════════════════ */}
      {settings && (
        <>
          <div className="settings-overlay" onClick={() => setSettings(false)} />
          <aside className="settings-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>Settings</div>
              <button onClick={() => setSettings(false)} style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 8,
                color: "var(--text-2)", cursor: "pointer", padding: "4px 10px", fontSize: 13,
              }}>✕ Close</button>
            </div>

            {/* Mode */}
            <div style={{ marginBottom: 24 }}>
              <div className="label-caps" style={{ marginBottom: 12 }}>Display Mode</div>
              <div style={{ display: "flex", gap: 10 }}>
                {["dark", "light"].map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    border: `2px solid ${mode === m ? "var(--accent)" : "var(--border)"}`,
                    background: mode === m ? "var(--accent-glow)" : "var(--bg-card)",
                    color: mode === m ? "var(--accent)" : "var(--text-2)",
                    cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.2s",
                  }}>
                    {m === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Accent */}
            <div style={{ marginBottom: 24 }}>
              <div className="label-caps" style={{ marginBottom: 12 }}>Color Accent</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(COLOR_ACCENTS).map(([id, ac]) => (
                  <div key={id} style={{ textAlign: "center" }}>
                    <button
                      onClick={() => setAccent(id)}
                      className={`swatch ${accent === id ? "selected" : ""}`}
                      style={{ background: ac.primary, display: "block" }}
                      title={ac.name}
                    />
                    <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 4 }}>{ac.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Nav */}
            <div>
              <div className="label-caps" style={{ marginBottom: 12 }}>Quick Navigate</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => { switchTab(t.id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      background: tab === t.id ? "var(--accent-glow)" : "transparent",
                      border: `1px solid ${tab === t.id ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-body)",
                      fontSize: 12, color: tab === t.id ? "var(--accent)" : "var(--text-2)",
                      textAlign: "left", transition: "all 0.2s",
                    }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ═══════════════ MAIN CONTENT ══════════════════════════ */}
      <main
        style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}
        className="page-enter"
        key={tab}
      >

        {/* ══════════ OVERVIEW ══════════════════════════════════ */}
        {tab === "overview" && (
          <Overview 
            switchTab={switchTab} 
            radarData={radarData} 
            measurements={measurements} 
            latest={latest} 
            lengthPct={lengthPct} 
            girthPct={girthPct} 
            lengthG={lengthG} 
            girthG={girthG} 
          />
        )}

        {/* ══════════ MEDICAL ═══════════════════════════════════ */}
        {tab === "medical" && (
          <Medical />
        )}

        {/* ══════════ ASSESSMENT ════════════════════════════════ */}
        {tab === "assessment" && (
          <div className="flex-col">
            <SectionHead title="📋 Health Assessment"
              sub="All 11 rounds of Q&A — complete intake data from your assessment sessions" />
            <Alert type="cyan">
              ℹ️ This is the raw data from your full health intake. Every action plan in the dashboard traces back to these answers.
            </Alert>
            {HEALTH_QA.map((round, ri) => (
              <div key={ri} className="glass-card card-stagger" style={{ padding:0, overflow:"hidden",
                borderColor: qaExpanded === ri ? round.color + "55" : "var(--border)",
              }}>
                <button onClick={() => setQaExpanded(qaExpanded===ri ? null : ri)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 16px",
                    background:"none", border:"none", cursor:"pointer", textAlign:"left",
                    color: qaExpanded===ri ? round.color : "var(--text-1)",
                  }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:round.color, flexShrink:0,
                    animation: qaExpanded===ri ? "pulseDot 1.5s infinite" : "none" }} />
                  <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{round.round}</div>
                  <span style={{ fontSize:10, color:"var(--text-3)" }}>{round.items.length} questions</span>
                  <span style={{ color:"var(--text-4)", fontSize:12 }}>{qaExpanded===ri ? "▲" : "▼"}</span>
                </button>
                <div className={`accordion-body ${qaExpanded===ri?"open":""}`}>
                  <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${round.color}22` }}>
                    {round.items.map((item, ii) => (
                      <div key={ii} style={{
                        display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
                        padding:"9px 0", borderBottom: ii<round.items.length-1 ? "1px solid var(--border)" : "none",
                      }}>
                        <div style={{ fontSize:12, color:"var(--text-3)" }}>
                          <span style={{ color:"var(--text-2)", fontWeight:600 }}>Q:</span> {item.q}
                        </div>
                        <div style={{ fontSize:12, color:"var(--text-1)" }}>
                          <span style={{ color:round.color, fontWeight:700 }}>A:</span> {item.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ 3D BODY ═══════════════════════════════════ */}
        {tab === "body3d" && (
          <div className="flex-col">
            <SectionHead title="🧍 3D Body Model"
              sub="Built to your exact measurements · Skinny-fat build · 182cm · 63kg" />
            <Body3D />
          </div>
        )}

        {/* ══════════ TODAY ══════════════════════════════════════ */}
        {tab === "today" && (
          <div className="flex-col">
            <SectionHead
              title={isRest ? "Rest Day 😴" : `${DAYS[dayIdx]}'s Session`}
              sub={isRest ? "Recovery — tissue adapts during rest. Kegels are safe today." : `${USER.sessionDuration} · Manual only · ${USER.sessionTime}`}
            />

            {/* Timer */}
            {!isRest && (
              <div className="glass-card no-hover" style={{ padding:24, textAlign:"center" }}>
                <div className="label-caps" style={{ marginBottom:10 }}>Session Timer</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:56, fontWeight:900, color:"var(--accent)",
                  letterSpacing:"-2px", lineHeight:1, textShadow:`0 0 30px var(--accent-glow)` }}>
                  {fmt(timerSec)}
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16 }}>
                  <button onClick={() => setTimerActive(a=>!a)} className="btn-accent">
                    {timerActive ? "⏸ Pause" : "▶ Start Session"}
                  </button>
                  <button onClick={() => { setTimerSec(0); setTimerActive(false); }} className="btn-ghost">
                    ↺ Reset
                  </button>
                </div>
              </div>
            )}

            {/* Week grid */}
            <div className="glass-card no-hover" style={{ padding:14 }}>
              <div className="label-caps" style={{ marginBottom:10 }}>This Week</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
                {DAYS.map((d,i) => {
                  const isToday = i===dayIdx;
                  const active  = ACTIVE_DAYS[i];
                  return (
                    <div key={d} style={{
                      textAlign:"center", padding:"8px 2px", borderRadius:10,
                      background: isToday ? "var(--accent-glow)" : "var(--bg-card)",
                      border:`1px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
                      boxShadow: isToday ? `0 0 12px var(--accent-glow)` : "none",
                      transition:"all 0.2s",
                    }}>
                      <div style={{ fontSize:9, color:isToday?"var(--accent)":"var(--text-3)", fontWeight:isToday?700:400 }}>{d}</div>
                      <div style={{ fontSize:17, marginTop:4 }}>{active?(isToday&&sessionPct===100?"✅":"💪"):"😴"}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!isRest && (
              <>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--text-3)", marginBottom:6 }}>
                    <span>Session Progress</span>
                    <span style={{ color:"var(--accent)", fontWeight:600 }}>{sessionPct}% · {doneCount}/{PE_EXERCISES.length} done</span>
                  </div>
                  <ProgressBar pct={sessionPct} />
                </div>

                <div className="flex-col" style={{ gap:8 }}>
                  {PE_EXERCISES.map(ex => (
                    <div key={ex.id} onClick={() => setDone(d=>({...d,[ex.id]:!d[ex.id]}))} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"13px 16px",
                      background: done[ex.id] ? "rgba(16,185,129,0.07)" : "var(--bg-card)",
                      border:`1px solid ${done[ex.id] ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                      borderRadius:"var(--radius-md)", cursor:"pointer", transition:"all 0.25s",
                    }}>
                      <span style={{ fontSize:26 }}>{ex.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:done[ex.id]?"var(--text-3)":"var(--text-1)", textDecoration:done[ex.id]?"line-through":"none" }}>{ex.name}</div>
                        <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>
                          <span style={{ color:ex.color }}>{ex.duration}</span> · {ex.target}
                          {ex.reps && <span style={{ color:"var(--text-4)" }}> · {ex.reps}</span>}
                        </div>
                      </div>
                      <div style={{
                        width:26, height:26, borderRadius:"50%",
                        border:`2px solid ${done[ex.id]?"#10b981":"var(--border)"}`,
                        background:done[ex.id]?"#10b981":"transparent",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#fff", fontSize:13, transition:"all 0.2s",
                      }}>{done[ex.id]?"✓":""}</div>
                    </div>
                  ))}
                </div>

                {sessionPct===100 && (
                  <div style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:"var(--radius-md)", padding:22, textAlign:"center", animation:"pageIn 0.4s ease" }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#10b981", marginBottom:4 }}>Session Complete!</div>
                    <div style={{ fontSize:12, color:"var(--text-3)" }}>Log your measurements once per week in the Log tab.</div>
                  </div>
                )}
              </>
            )}

            {isRest && (
              <div className="glass-card no-hover" style={{ padding:32, textAlign:"center" }}>
                <div style={{ fontSize:50, marginBottom:10 }} className="float-anim">😴</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:20, marginBottom:6 }}>Rest & Recover</div>
                <div style={{ fontSize:13, color:"var(--text-3)", lineHeight:1.8, maxWidth:320, margin:"0 auto" }}>
                  Microadaptations happen during rest. Stay hydrated (3L), eat protein, and sleep 8 hours.
                </div>
                <div style={{ marginTop:16 }} className="alert alert-purple">
                  💡 Kegels are safe every single day — do 3 sets of 10 reps right now at your desk.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ MUSCLES ═══════════════════════════════════ */}
        {tab === "muscles" && (
          <div className="flex-col">
            <SectionHead title="Muscle Groups" sub="Assessment ratings from body composition rounds 2–5" />
            <Alert type="amber">⚠️ No gym needed to start. All initial plans use bodyweight, resistance bands, and mobility work.</Alert>
            {sysParts("muscles").map(p => <PartCard key={p.name} data={p} />)}
          </div>
        )}

        {/* ══════════ ORGANS ════════════════════════════════════ */}
        {tab === "organs" && (
          <div className="flex-col">
            <SectionHead title="Internal Organs" sub="5 of 7 systems rated Poor — from rounds 6–10 of your assessment" />
            <Alert type="red">🚨 <strong>Bloodwork never done. BP never measured. Heart rate unknown.</strong> Silent risks at age 23.</Alert>
            {sysParts("organs").map(p => <PartCard key={p.name} data={p} />)}
          </div>
        )}

        {/* ══════════ JOINTS ════════════════════════════════════ */}
        {tab === "joints" && (
          <div className="flex-col">
            <SectionHead title="Joints, Posture & Spine" sub="Multiple joint issues from round 9 — all from your sedentary desk lifestyle" />
            <Alert type="purple">🦴 Knee + back + neck + wrist/elbow pain at 23 is entirely posture-driven. Fixing posture resolves 70% within 3 months.</Alert>
            {sysParts("joints").map(p => <PartCard key={p.name} data={p} />)}
            <div className="glass-card no-hover" style={{ padding:16 }}>
              <div className="label-caps" style={{ color:"var(--accent)", marginBottom:12 }}>⏱️ 10-Min Daily Posture Routine</div>
              {[
                ["2 min","Cat-Cow Stretch","Mobilises entire spine — do every morning"],
                ["1 min","Chin Tucks (3×10)","Fixes forward head posture — do at desk hourly"],
                ["1 min","Wall Angels (3×10)","Fixes rounded shoulders"],
                ["1 min","Dead Hang (3×20sec)","Decompresses discs — spine relief"],
                ["2 min","Hip Flexor Stretch","Fixes anterior pelvic tilt from sitting"],
                ["2 min","Thoracic Extension (foam roller)","Opens chest, reverses kyphosis"],
                ["1 min","Bird Dog Core (3×8)","Stabilises lumbar — back pain relief"],
              ].map(([dur,name,desc],i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"9px 0", borderBottom:i<6?"1px solid var(--border)":"none" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--accent)", minWidth:38, flexShrink:0, marginTop:2 }}>{dur}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{name}</div>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ APPEARANCE ════════════════════════════════ */}
        {tab === "appearance" && (
          <div className="flex-col">
            <SectionHead title="Skin, Hair & Face" sub="Rounds 8–9 assessment — most appearance issues are hormone + sleep linked" />
            <Alert type="amber">✨ Fixing testosterone + sleep will visibly improve acne, hair, and skin within 4–8 weeks.</Alert>
            {sysParts("appearance").map(p => <PartCard key={p.name} data={p} />)}
            <div className="glass-card no-hover" style={{ padding:16 }}>
              <div className="label-caps" style={{ color:"#f97316", marginBottom:12 }}>Daily Skincare (AM + PM)</div>
              <div className="grid-2">
                {[
                  { time:"🌅 Morning", steps:["Water rinse (gentle)","Salicylic acid face wash","Niacinamide serum (5 min)","Light moisturiser","SPF 30+ sunscreen"] },
                  { time:"🌙 Night",   steps:["Salicylic acid cleanser","Niacinamide serum","Retinol (2×/week after Week 3)","Heavier moisturiser","Tongue scraper + floss"] },
                ].map(r => (
                  <div key={r.time} style={{ background:"var(--bg-elevated)", borderRadius:12, padding:12, border:"1px solid var(--border)" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#f97316", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>{r.time}</div>
                    {r.steps.map((s,i) => (
                      <div key={i} style={{ fontSize:11, color:"var(--text-2)", marginBottom:5, display:"flex", gap:6 }}>
                        <span style={{ color:"#f97316", flexShrink:0 }}>{i+1}.</span>{s}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ PHYSIQUE ══════════════════════════════════ */}
        {tab === "physique" && (
          <Physique />
        )}

        {/* ══════════ NUTRITION ═════════════════════════════════ */}
        {tab === "nutrition" && (
          <div className="flex-col">
            <SectionHead title="🍽️ Budget Diet Plan" sub="From DeepSeek analysis — exact targets for lean bulk at 63kg/182cm" />
            <div className="grid-3">
              {[
                { label:"Daily Calories", value:"2500–2700", unit:"cal/day", color:"var(--accent)" },
                { label:"Daily Protein",  value:"125–140g",   unit:"/day",    color:"#10b981"       },
                { label:"Weekly Gain",    value:"0.25–0.5",   unit:"kg/week", color:"#06b6d4"       },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding:"16px 10px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:9, color:"var(--text-3)", marginTop:2 }}>{s.unit}</div>
                  <div className="label-caps" style={{ marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="glass-card no-hover" style={{ padding:16 }}>
              <div className="label-caps" style={{ marginBottom:12 }}>Sample Daily Meal Plan</div>
              {NUTRITION.meals.map((meal,i) => (
                <div key={i} style={{ background:"var(--bg-elevated)", borderRadius:12, padding:13, marginBottom:i<NUTRITION.meals.length-1?10:0, border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:20 }}>{meal.icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{meal.name}</div>
                      <div style={{ fontSize:10, color:"#10b981" }}>{meal.time}</div>
                    </div>
                  </div>
                  {meal.items.map((item,j) => (
                    <div key={j} style={{ fontSize:11, color:"var(--text-2)", marginBottom:4, display:"flex", gap:6 }}>
                      <span style={{ color:"#10b981", flexShrink:0 }}>•</span>{item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="glass-card no-hover" style={{ padding:16 }}>
              <div className="label-caps" style={{ marginBottom:12 }}>Budget Staple Foods</div>
              <div className="grid-3">
                {[
                  { title:"🥩 Protein", items:NUTRITION.staples.protein, color:"#ef4444" },
                  { title:"🍚 Carbs",   items:NUTRITION.staples.carbs,   color:"var(--accent)" },
                  { title:"🥑 Fats",    items:NUTRITION.staples.fats,    color:"#10b981" },
                ].map(cat => (
                  <div key={cat.title} style={{ background:"var(--bg-elevated)", borderRadius:10, padding:10, border:"1px solid var(--border)" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:cat.color, letterSpacing:"1px", marginBottom:8 }}>{cat.title}</div>
                    {cat.items.map((item,i) => <div key={i} style={{ fontSize:11, color:"var(--text-2)", marginBottom:4 }}>• {item}</div>)}
                  </div>
                ))}
              </div>
            </div>
            <Alert type="red">🚫 Avoid for waist goals: {NUTRITION.avoidForWaist.join(" · ")}</Alert>
          </div>
        )}

        {/* ══════════ TRAINING ══════════════════════════════════ */}
        {tab === "training" && (
          <div className="flex-col">
            <SectionHead title="🏋️ Training Plan" sub={`${TRAINING_PLAN.split} — ${TRAINING_PLAN.schedule}`} />
            <div className="grid-3">
              {[
                { day:"Push Day", body:TRAINING_PLAN.days.push, color:"var(--accent)" },
                { day:"Pull Day", body:TRAINING_PLAN.days.pull, color:"#06b6d4" },
                { day:"Legs Day", body:TRAINING_PLAN.days.legs, color:"#8b5cf6" },
              ].map(d => (
                <div key={d.day} style={{ background:`${d.color}0d`, border:`1px solid ${d.color}28`, borderRadius:"var(--radius-md)", padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:d.color, marginBottom:5 }}>{d.day}</div>
                  <div style={{ fontSize:10, color:"var(--text-2)" }}>{d.body}</div>
                </div>
              ))}
            </div>
            {TRAINING_PLAN.priority_exercises.map((group,gi) => (
              <div key={gi} className="glass-card card-stagger" style={{ padding:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--accent)", marginBottom:3 }}>{group.area}</div>
                {group.note && <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:12, fontStyle:"italic" }}>{group.note}</div>}
                {group.exercises.map((ex,ei) => (
                  <div key={ei} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, padding:"10px 0", borderTop:ei>0?"1px solid var(--border)":"none", alignItems:"start" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{ex.name}</div>
                      <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>{ex.type}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#06b6d4", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{ex.sets}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ══════════ PE LIBRARY ════════════════════════════════ */}
        {tab === "exercises" && (
          <div className="flex-col">
            <SectionHead title="PE Exercise Library" sub="Beginner · Manual only · No devices · No surgery · No medication" />
            <Alert type="amber">⚠️ Always warm up. Stop if you feel pain. Results come from months of consistency.</Alert>
            {PE_EXERCISES.map(ex => (
              <div key={ex.id} style={{
                border:`1px solid ${expanded===ex.id ? ex.color+"44" : "var(--border)"}`,
                borderRadius:"var(--radius-md)", overflow:"hidden", background:"var(--bg-card)",
                boxShadow: expanded===ex.id ? `0 0 20px ${ex.color}22` : "none", transition:"all 0.25s",
              }}>
                <button onClick={() => setExpanded(expanded===ex.id?null:ex.id)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                  <span style={{ fontSize:26, flexShrink:0 }}>{ex.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"var(--text-1)" }}>{ex.name}</div>
                    <div style={{ fontSize:11, color:"var(--text-3)" }}>
                      <span style={{ color:ex.color }}>{ex.duration}</span> · {ex.target}
                      {ex.reps && <span style={{ color:"var(--text-4)" }}> · {ex.reps}</span>}
                    </div>
                  </div>
                  <span style={{ color:"var(--text-4)", fontSize:12 }}>{expanded===ex.id?"▲":"▼"}</span>
                </button>
                <div className={`accordion-body ${expanded===ex.id?"open":""}`}>
                  <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${ex.color}22` }}>
                    <div style={{ marginTop:14, marginBottom:12 }}>
                      <div className="label-caps" style={{ marginBottom:8 }}>Steps</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {ex.steps.map((step, si) => (
                          <div key={si} style={{ fontSize:12, color:"var(--text-2)", display:"flex", gap:8 }}>
                            <span style={{ color:ex.color, fontWeight:600 }}>{si + 1}.</span> {step}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:"10px 14px", background:`${ex.color}0f`, borderRadius:10, marginBottom:12, fontSize:12, color:"var(--text-2)", lineHeight:1.6, border:`1px solid ${ex.color}22` }}>
                      <span style={{ color:ex.color, fontWeight:600 }}>Benefit: </span>{ex.benefit}
                    </div>
                    <div className="label-caps" style={{ marginBottom:8 }}>Tips</div>
                    {ex.tips.map((t,i) => (
                      <div key={i} style={{ display:"flex", gap:8, marginBottom:5, fontSize:12, color:"var(--text-2)" }}>
                        <span style={{ color:ex.color, flexShrink:0 }}>›</span>{t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ LOG ═══════════════════════════════════════ */}
        {tab === "log" && (
          <div className="flex-col">
            <SectionHead title="Measurement Log" sub="Log once per week — same conditions, same erection level, same time" />
            <Alert type="cyan">
              📏 <strong>Length</strong> = bone-pressed erect pubic bone to tip&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Girth</strong> = soft tape at mid-shaft
            </Alert>
            <div className="glass-card no-hover" style={{ padding:20 }}>
              <div className="label-caps" style={{ marginBottom:14 }}>Add Weekly Entry</div>
              <div className="grid-3" style={{ marginBottom:14 }}>
                <div>
                  <div className="label-caps" style={{ marginBottom:6 }}>Week</div>
                  <select value={form.week} onChange={e => setForm(f=>({...f, week:e.target.value}))}>
                    {WEEK_LABELS.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <div className="label-caps" style={{ marginBottom:6 }}>Length (inches)</div>
                  <input type="number" step="0.05" placeholder="e.g. 6.0" value={form.length} onChange={e=>setForm(f=>({...f,length:e.target.value}))} />
                </div>
                <div>
                  <div className="label-caps" style={{ marginBottom:6 }}>Girth (inches)</div>
                  <input type="number" step="0.05" placeholder="e.g. 4.0" value={form.girth} onChange={e=>setForm(f=>({...f,girth:e.target.value}))} />
                </div>
              </div>
              <button onClick={addMeasure} className="btn-accent" style={{ width:"100%" }}>+ Add Entry</button>
            </div>
            <div className="glass-card no-hover" style={{ overflow:"hidden", padding:0 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 0.8fr 0.8fr", padding:"10px 16px", background:"var(--bg-elevated)", fontSize:9, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"1px" }}>
                <span>Week</span><span>Length</span><span>Girth</span><span>ΔLen</span><span>ΔGir</span>
              </div>
              {measurements.map((m,i) => {
                const prev = measurements[i-1];
                const dl = prev ? (m.length-prev.length).toFixed(2) : null;
                const dg = prev ? (m.girth-prev.girth).toFixed(2) : null;
                return (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 0.8fr 0.8fr", padding:"12px 16px", borderTop:"1px solid var(--border)", fontSize:12, alignItems:"center" }}>
                    <span style={{ color:"var(--text-2)" }}>{m.week}</span>
                    <span style={{ color:"#06b6d4", fontWeight:600 }}>{m.length}"</span>
                    <span style={{ color:"#8b5cf6", fontWeight:600 }}>{m.girth}"</span>
                    <span style={{ color:dl&&parseFloat(dl)>0?"#10b981":"var(--text-3)" }}>{dl?(parseFloat(dl)>=0?"+":"")+dl:"—"}</span>
                    <span style={{ color:dg&&parseFloat(dg)>0?"#10b981":"var(--text-3)" }}>{dg?(parseFloat(dg)>=0?"+":"")+dg:"—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ PROGRESS ══════════════════════════════════ */}
        {tab === "progress" && (
          <div className="flex-col">
            <SectionHead title="Progress Charts" sub="Log weekly to see your growth trend" />
            <div className="grid-2">
              {[
                { label:"Length Gained", value:`+${lengthG}"`, sub:`→ ${USER.targetLength}" target`, pct:lengthPct, color:"#06b6d4" },
                { label:"Girth Gained",  value:`+${girthG}"`,  sub:`→ ${USER.targetGirth}" target`,  pct:girthPct,  color:"#8b5cf6" },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding:18 }}>
                  <div className="label-caps" style={{ marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:30, color:s.color, fontWeight:900, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:"var(--text-3)", margin:"6px 0 10px" }}>{s.sub}</div>
                  <ProgressBar pct={s.pct} color={s.color} />
                  <div style={{ fontSize:10, color:s.color, marginTop:5 }}>{s.pct}% to goal</div>
                </div>
              ))}
            </div>

            {measurements.length < 2 ? (
              <div className="glass-card no-hover" style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:48, marginBottom:12 }} className="float-anim">📏</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, marginBottom:8 }}>No chart data yet</div>
                <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:18 }}>Add 2+ measurements in the Log tab to unlock charts.</div>
                <button onClick={() => switchTab("log")} className="btn-accent">Go to Log →</button>
              </div>
            ) : (
              <>
                {[
                  { key:"length", label:"Erect Length (inches)", color:"#06b6d4", target:USER.targetLength },
                  { key:"girth",  label:"Erect Girth (inches)",  color:"#8b5cf6", target:USER.targetGirth },
                ].map(chart => (
                  <div key={chart.key} className="glass-card no-hover" style={{ padding:"16px 8px 12px" }}>
                    <div className="label-caps" style={{ paddingLeft:10, marginBottom:10 }}>{chart.label}</div>
                    <ResponsiveContainer width="100%" height={170}>
                      <LineChart data={measurements} margin={{ top:5, right:20, left:-20, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="week" tick={{ fill:"var(--text-3)", fontSize:9, fontFamily:"var(--font-body)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:"var(--text-3)", fontSize:9, fontFamily:"var(--font-body)" }} axisLine={false} tickLine={false} domain={["auto","auto"]} />
                        <Tooltip content={<ChartTip />} />
                        <ReferenceLine y={chart.target} stroke={chart.color} strokeDasharray="4 4" strokeOpacity={0.4}
                          label={{ value:`Goal ${chart.target}"`, fill:chart.color, fontSize:9, position:"insideTopRight" }} />
                        <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2.5}
                          dot={{ fill:chart.color, r:4, strokeWidth:0 }} activeDot={{ r:6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </>
            )}

            {/* Health Correlation Engine */}
            <div className="glass-card hover-lift" style={{ padding:"16px 8px 12px" }}>
              <div className="label-caps" style={{ paddingLeft:10, marginBottom:10, color: "var(--accent)" }}>
                Health Correlation Engine: Sleep vs Weight
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { day: "Mon", sleep: 5.5, weight: 63.1 },
                  { day: "Tue", sleep: 6.0, weight: 63.2 },
                  { day: "Wed", sleep: 7.5, weight: 63.4 },
                  { day: "Thu", sleep: 5.0, weight: 63.0 },
                  { day: "Fri", sleep: 8.0, weight: 63.6 },
                  { day: "Sat", sleep: 8.5, weight: 63.8 },
                  { day: "Sun", sleep: 6.5, weight: 63.5 },
                ]} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill:"var(--text-3)", fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill:"var(--text-3)", fontSize:9 }} axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill:"var(--text-3)", fontSize:9 }} axisLine={false} tickLine={false} domain={[4, 10]} />
                  <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="sleep" name="Sleep (Hrs)" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 8, padding: "0 10px" }}>
                💡 Insight: Days following 7+ hours of sleep correlate with better weight retention and muscle growth signals.
              </div>
            </div>

            <div className="glass-card no-hover" style={{ padding:16 }}>
              <div className="label-caps" style={{ marginBottom:12 }}>Realistic Month-by-Month Timeline</div>
              {[
                { phase:"Month 1",    body:"Build habits: hydration, sleep, skincare, posture",    pe:"Conditioning — tissue adapting, minimal gains",   color:"var(--text-3)" },
                { phase:"Month 2–3",  body:"Energy improves, bloating reduces, skin clearing",     pe:"First gains: +0.1–0.2\" length",                   color:"var(--text-2)" },
                { phase:"Month 4–6",  body:"Visible muscle, hormones stabilising",                 pe:"+0.3–0.5\" length, first girth changes",            color:"var(--accent)"  },
                { phase:"Month 7–12", body:"Athletic physique emerging, clear skin, high energy",  pe:"+0.75–1.5\"+ length, +0.5–1\"+ girth possible",    color:"#22c55e"       },
              ].map((r,i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"9px 0", borderBottom:i<3?"1px solid var(--border)":"none" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:r.color, minWidth:72, flexShrink:0, marginTop:2 }}>{r.phase}</div>
                  <div>
                    <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:3 }}>🏋️ {r.body}</div>
                    <div style={{ fontSize:11, color:"var(--text-3)" }}>⚡ {r.pe}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ LIFESTYLE ═════════════════════════════════ */}
        {tab === "lifestyle" && (
          <Lifestyle />
        )}

        {/* ══════════ MENTAL HEALTH ══════════════════════════════════ */}
        {tab === "mental" && (
          <div className="flex-col">
            <SectionHead title="🧠 Mental Health & Flow" sub="Manage brain fog, stress loops, and mental clarity" />
            <Alert type="purple">💡 Your brain fog and mood swings are primarily driven by 5-6 hours of sleep. Fix the sleep, fix the mind.</Alert>

            <div className="grid-2">
              <div className="glass-card no-hover" style={{ padding:16 }}>
                <div className="label-caps" style={{ marginBottom:12, color:"#f43f5e" }}>Root Cause: Brain Fog</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#ef4444", marginBottom:10 }}>{MENTAL_DATA.brainFog.status} / Daily Occurrence</div>
                <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:8 }}>Driven by:</div>
                {MENTAL_DATA.brainFog.rootCauses.map((cause, i) => (
                  <div key={i} style={{ fontSize:12, color:"var(--text-2)", marginBottom:6, display:"flex", gap:8 }}>
                    <span style={{ color:"#ef4444" }}>•</span>{cause}
                  </div>
                ))}
                <div style={{ height:1, background:"var(--border)", margin:"12px 0" }} />
                <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:8 }}>Immediate Fixes:</div>
                {MENTAL_DATA.brainFog.fixes.map((fix, i) => (
                  <div key={i} style={{ fontSize:12, color:"var(--text-1)", marginBottom:6, display:"flex", gap:8 }}>
                    <span style={{ color:"#22c55e" }}>✓</span>{fix}
                  </div>
                ))}
              </div>

              <div className="flex-col" style={{ gap:12 }}>
                <div className="glass-card no-hover" style={{ padding:16 }}>
                  <div className="label-caps" style={{ marginBottom:12, color:"#a855f7" }}>Skill Progression Goals</div>
                  {MENTAL_DATA.skillsGoals.map((skill, i) => (
                    <div key={i} style={{ marginBottom:i===0?12:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, marginBottom:4 }}>
                        <span>{skill.skill}</span>
                        <span style={{ fontSize:10, color:"#a855f7" }}>{skill.timeline}</span>
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-2)" }}>Target: {skill.target}</div>
                    </div>
                  ))}
                </div>

                <div className="glass-card no-hover" style={{ padding:16, flex:1 }}>
                  <div className="label-caps" style={{ marginBottom:12, color:"#0ea5e9" }}>Daily Mind Habits</div>
                  {MENTAL_DATA.dailyHabits.map((habit, i) => (
                    <div key={i} style={{ marginBottom:i<3?10:0, paddingBottom:i<3?10:0, borderBottom:i<3?"1px solid var(--border)":"none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:10, padding:"2px 6px", background:"rgba(14, 165, 233, 0.1)", color:"#0ea5e9", borderRadius:4, fontWeight:600 }}>{habit.time}</span>
                        <span style={{ fontSize:13, fontWeight:500 }}>{habit.habit}</span>
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-3)" }}>{habit.benefit}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
