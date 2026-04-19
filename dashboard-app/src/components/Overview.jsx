import React from "react";
import { USER, HEALTH_SCORE, STATUS, BODY_PARTS } from "../data/userData";
import { Ring, CountUp, ProgressBar, SectionHead, Alert } from "./UIComponents";

export default function Overview({ switchTab, radarData, measurements, latest, lengthPct, girthPct, lengthG, girthG }) {
  const sysParts = sys => Object.values(BODY_PARTS).filter(p => p.sys === sys);
  const avgScore = ps => ps.length ? Math.round(ps.map(p => ({ critical:14, poor:36, fair:60, good:84 }[p.status]||50)).reduce((a,b)=>a+b,0)/ps.length) : 0;

  const systems = [
    { label:"Organs",     parts:sysParts("organs"),     icon:"🫀", tid:"organs",     col:"#ef4444" },
    { label:"Appearance", parts:sysParts("appearance"), icon:"✨", tid:"appearance", col:"#f97316" },
    { label:"Muscles",    parts:sysParts("muscles"),    icon:"💪", tid:"muscles",    col:"#f59e0b" },
    { label:"Joints",     parts:sysParts("joints"),     icon:"🦴", tid:"joints",     col:"#8b5cf6" },
  ];

  // Identify critical systems
  const criticalSystems = systems.filter(sys => sys.parts.some(p => p.status === "critical"));
  const regularSystems = systems.filter(sys => !sys.parts.some(p => p.status === "critical"));

  return (
    <div className="flex-col">
      <SectionHead title="Your Health Overview"
        sub={`Comprehensive assessment · Age ${USER.age} · ${USER.height}cm · ${USER.weight}kg · BMI ${USER.bmi}`} />

      {/* Critical Status Glow Card */}
      {criticalSystems.length > 0 && (
        <div className="glass-card priority-glow" style={{ padding: 24, borderColor: "#ef4444", boxShadow: "0 0 30px rgba(239,68,68,0.2)" }}>
           <div className="label-caps" style={{ color: "#ef4444", marginBottom: 16 }}>CRITICAL ALERTS</div>
           
           <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
             {criticalSystems.map(sys => {
                const sc = avgScore(sys.parts);
                const worst = "critical";
                const col = STATUS[worst].color;
                return (
                  <div key={sys.label} style={{ cursor:"pointer", border: `1px solid ${STATUS[worst].border}`, borderRadius: 12, padding: 16, background: "rgba(239, 68, 68, 0.05)" }}
                    onClick={() => switchTab(sys.tid)}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{ fontSize:28 }}>{sys.icon}</span>
                      <span style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, color:col }}>{sc}</span>
                    </div>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color: "var(--text-1)" }}>{sys.label} (High Priority)</div>
                    <ProgressBar pct={sc} color={col} />
                    <div style={{ fontSize:11, color:col, marginTop:8 }}>Critical attention needed</div>
                  </div>
                );
             })}
           </div>
        </div>
      )}

      {/* Score */}
      <div className="grid-2">
        {/* Score Ring */}
        <div className="glass-card" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="label-caps">Overall Health Score</div>
          <div style={{ position: "relative", display: "inline-block" }} className="float-anim">
            <Ring pct={HEALTH_SCORE} size={120} sw={11}
              color={HEALTH_SCORE < 45 ? "#ef4444" : HEALTH_SCORE < 60 ? "#f97316" : "#22c55e"} />
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:30, fontWeight:900, color: HEALTH_SCORE < 45 ? "#ef4444" : "#f97316", lineHeight:1 }}>
                <CountUp to={HEALTH_SCORE} />
              </div>
              <div style={{ fontSize:9, color:"var(--text-3)" }}>/100</div>
            </div>
          </div>
          <div style={{ fontSize:11, color:"var(--text-3)", textAlign:"center", marginTop:2 }}>
            Needs significant work
          </div>
        </div>

        {/* Regular System Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {regularSystems.map(sys => {
            const sc = avgScore(sys.parts);
            const worst = sys.parts.find(p=>p.status==="poor")?"poor":sys.parts.find(p=>p.status==="fair")?"fair":"good";
            const col = STATUS[worst].color;
            return (
              <div key={sys.label} className="glass-card card-stagger flex-col" style={{ padding:16, cursor:"pointer", borderColor: STATUS[worst].border, justifyContent: "space-between" }}
                onClick={() => switchTab(sys.tid)}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:22 }}>{sys.icon}</span>
                  <span style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:col }}>{sc}</span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>{sys.label}</div>
                  <ProgressBar pct={sc} color={col} />
                  <div style={{ fontSize:10, color:col, marginTop:5 }}>{sys.parts.length} areas tracked</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile strip */}
      <div className="glass-card no-hover" style={{ padding:16 }}>
        <div className="label-caps" style={{ marginBottom:12 }}>Your Profile</div>
        <div className="grid-4" style={{ marginBottom:14 }}>
          {[["23","Age"],["182cm","Height"],["63kg","Weight"],["19.0","BMI"]].map(([v,l]) => (
            <div key={l} style={{ textAlign:"center", background:"var(--bg-elevated)", borderRadius:10, padding:"10px 4px", border:"1px solid var(--border)" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, color:"var(--accent)" }}>{v}</div>
              <div className="label-caps" style={{ marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {[
            ["😴 Sleep",    USER.sleepHours,    "#ef4444"],
            ["💧 Water",    USER.waterIntake,   "#ef4444"],
            ["☕ Caffeine", USER.caffeine,      "#f97316"],
            ["🏃 Activity", "Sedentary",        "#f97316"],
            ["🩸 Bloodwork",USER.bloodwork,     "#ef4444"],
            ["💊 BP",       USER.bloodPressure, "#ef4444"],
          ].map(([lb,val,col]) => (
            <div key={lb} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
              <span style={{ color:"var(--text-3)" }}>{lb}</span>
              <span style={{ color:col, fontWeight:600 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PE Goal rings */}
      <div className="glass-card no-hover" style={{ padding:20 }}>
        <div className="label-caps" style={{ marginBottom:16 }}>PE Goal Progress</div>
        <div className="grid-2">
          {[
            { label:"Length Goal", current:latest.length, target:USER.targetLength, pct:lengthPct, gained:lengthG, color:"#06b6d4" },
            { label:"Girth Goal",  current:latest.girth,  target:USER.targetGirth,  pct:girthPct,  gained:girthG,  color:"#8b5cf6" },
          ].map(g => (
            <div key={g.label} style={{ textAlign:"center", background:"var(--bg-elevated)", borderRadius:14, padding:16, border:"1px solid var(--border)" }}>
              <div style={{ position:"relative", display:"inline-block", marginBottom:8 }}>
                <Ring pct={g.pct} size={90} sw={8} color={g.color} />
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700, color:g.color }}>{g.pct}%</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:3 }}>{g.label}</div>
              <div style={{ fontSize:12, color:g.color, fontWeight:600 }}>{g.current}" → {g.target}"</div>
              <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>+{g.gained}" gained</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <Alert type="red">
        🚨 <strong>Top 5 Urgent Actions (This Week):</strong><br/>
        1. Testosterone bloodwork — possible low T at 23 is a medical concern<br/>
        2. Start drinking 3L water/day (you drink 1–2L — dark urine warning)<br/>
        3. Buy a BP monitor — blood pressure never measured<br/>
        4. Sleep 8 hours — 5–6 hrs is causing mood swings, brain fog & acne<br/>
        5. Book dermatologist for moles, acne bumps & receding hairline
      </Alert>

      {/* Now vs Goal */}
      <div className="glass-card no-hover" style={{ padding:16 }}>
        <div className="label-caps" style={{ marginBottom:10 }}>Transformation Journey</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center" }}>
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, padding:14 }}>
            <div style={{ fontSize:10, color:"#ef4444", fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>You Now</div>
            {["Skinny-fat build","Sedentary desk life","5–6 hrs poor sleep","Possible low T","Daily fatigue + fog","5.9\" PE length"].map((v,i) => (
              <div key={i} style={{ fontSize:11, color:"var(--text-2)", marginBottom:4, display:"flex", gap:5 }}>
                <span style={{ color:"#ef4444" }}>•</span>{v}
              </div>
            ))}
          </div>
          <div style={{ fontSize:24, color:"var(--accent)", textAlign:"center" }}>→</div>
          <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:12, padding:14 }}>
            <div style={{ fontSize:10, color:"#22c55e", fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>Your Goal</div>
            {["Greek God physique","Athletic & active","8 hrs quality sleep","Strong testosterone","High energy daily","7.9\" × 5.25\" PE"].map((v,i) => (
              <div key={i} style={{ fontSize:11, color:"var(--text-2)", marginBottom:4, display:"flex", gap:5 }}>
                <span style={{ color:"#22c55e" }}>•</span>{v}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
