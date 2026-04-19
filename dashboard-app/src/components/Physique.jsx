import React from "react";
import { USER, GOLDEN_RATIO } from "../data/userData";
import { SectionHead, Alert, ProgressBar } from "./UIComponents";

export default function Physique() {
  return (
    <div className="flex-col">
      <SectionHead title="🏛️ Greek God Physique Plan" sub="Golden Ratio analysis from DeepSeek — exact current vs target measurements" />
      <Alert type="amber">📐 Source: DeepSeek body composition analysis · Height 182cm · Weight 63kg · BMI 19.0</Alert>
      {/* Table */}
      <div className="glass-card no-hover" style={{ overflow:"hidden", padding:0 }}>
        <div style={{ padding:"12px 16px 10px", borderBottom:"1px solid var(--border)" }}>
          <div className="label-caps">Golden Ratio Measurement Table</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 0.8fr 0.8fr 0.9fr 1fr", padding:"8px 16px", background:"var(--bg-elevated)", fontSize:9, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"1px" }}>
          <span>Body Part</span><span>Now (cm)</span><span>Now (in)</span><span>Target</span><span>Priority</span>
        </div>
        {GOLDEN_RATIO.table.map((row,i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 0.8fr 0.8fr 0.9fr 1fr", padding:"11px 16px", borderTop:"1px solid var(--border)", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:600, color:row.color }}>{row.part}</span>
            <span style={{ fontSize:12, color:"var(--text-2)" }}>{row.current_cm}</span>
            <span style={{ fontSize:12, color:"var(--text-2)" }}>{row.current_in}</span>
            <span style={{ fontSize:12, color:"#22c55e", fontWeight:500 }}>{row.target_in}</span>
            <span style={{ fontSize:10, color:row.color, fontWeight:700 }}>{row.priority}</span>
          </div>
        ))}
      </div>
      {/* Gaps */}
      <div className="glass-card no-hover" style={{ padding:16 }}>
        <div className="label-caps" style={{ marginBottom:14 }}>Measurement Gaps to Fill</div>
        {GOLDEN_RATIO.table.map((row,i) => (
          <div key={i} style={{ marginBottom:i<GOLDEN_RATIO.table.length-1?14:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
              <span style={{ color:"var(--text-2)" }}>{row.part}</span>
              <span style={{ color:row.color, fontWeight:500 }}>{row.current_in} → {row.target_in} <span style={{ color:"var(--text-3)" }}>({row.gap})</span></span>
            </div>
            <ProgressBar pct={30} color={row.color} />
          </div>
        ))}
      </div>
      {/* Phase plan */}
      <div className="grid-2">
        <div style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"var(--radius-md)", padding:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:6 }}>Phase 1: Lean Bulk</div>
          <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:8 }}>8–12 months</div>
          {[`Gain ${USER.phase1.weeklyGain}`,`Target: ${USER.phase1.weightTarget}`,"Protein: 125–140g/day","Progressive overload"].map((v,i) => (
            <div key={i} style={{ fontSize:11, color:"var(--text-2)", marginBottom:4 }}>• {v}</div>
          ))}
        </div>
        <div style={{ background:"rgba(6,182,212,0.07)", border:"1px solid rgba(6,182,212,0.2)", borderRadius:"var(--radius-md)", padding:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#06b6d4", marginBottom:6 }}>Phase 2: Cut</div>
          <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:8 }}>After muscle is built</div>
          {[USER.phase2.goal, USER.phase2.focus].map((v,i) => (
            <div key={i} style={{ fontSize:11, color:"var(--text-2)", marginBottom:4 }}>• {v}</div>
          ))}
        </div>
      </div>
      {/* Insights */}
      <div className="glass-card no-hover" style={{ padding:16 }}>
        <div className="label-caps" style={{ marginBottom:12 }}>Key Insights from DeepSeek</div>
        {[
          ["Your 182cm height is ideal for an aesthetic physique","#22c55e"],
          ["BMI 19.0 — room to add 7–10kg of muscle before looking bulky","#22c55e"],
          ["Shoulders need most work (+6\") — your #1 visual priority","var(--accent)"],
          ["Chest gap is largest (+8–10\") — bench press = your main compound","var(--accent)"],
          ["Waist at 32.3\" is decent — just grow everything above it","var(--accent)"],
          ["NEVER do heavy side bends — thickens waist, ruins V-taper","#ef4444"],
          ["Triceps = 2/3 of arm size — train them as much as biceps","#f97316"],
          ["300–500 cal surplus ideal — don't over-eat or you'll add fat","var(--text-2)"],
        ].map(([text,col],i) => (
          <div key={i} style={{ fontSize:12, color:col, marginBottom:7, display:"flex", gap:8, lineHeight:1.5 }}>
            <span style={{ flexShrink:0 }}>›</span>{text}
          </div>
        ))}
      </div>
    </div>
  );
}
