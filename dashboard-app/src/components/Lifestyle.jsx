import React from "react";
import { LIFESTYLE_TIPS } from "../data/userData";
import { SectionHead, Alert } from "./UIComponents";

export default function Lifestyle() {
  return (
    <div className="flex-col">
      <SectionHead title="Lifestyle Optimizer" sub="Personalised for your high stress, 5–6 hrs sleep, and sedentary routine" />
      <Alert type="red">🚨 <strong>5–6 hrs sleep + high stress</strong> = suppressed T, weak immune, slow PE progress, mood instability. Fixing these 2 upgrades your score by 15+ points.</Alert>
      {LIFESTYLE_TIPS.map((tip,i) => (
        <div key={i} className="glass-card card-stagger" style={{ padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:22 }}>{tip.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{tip.title}</div>
            </div>
            <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px",
              borderRadius:999, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px",
              background:`${tip.color}15`, color:tip.color, border:`1px solid ${tip.color}33` }}>
              {tip.urgency}
            </span>
          </div>
          {tip.points.map((pt, pi) => (
            <div key={pi} style={{ fontSize:12, color:"var(--text-2)", marginBottom:6, display:"flex", gap:8 }}>
              <span style={{ color:tip.color }}>•</span>{pt}
            </div>
          ))}
        </div>
      ))}
      <div className="glass-card no-hover" style={{ padding:18 }}>
        <div className="label-caps" style={{ marginBottom:12 }}>Daily Habit Checklist</div>
        {[
          ["💧","Drink 3L water (not 1–2L like now)"],
          ["🚶","Walk 20+ minutes"],
          ["🥩","Eat 125–140g protein"],
          ["😴","Sleep 7–9 hrs (currently 5–6)"],
          ["☕","Max 2 coffees before noon only"],
          ["🧘","5-min box breathing exercise"],
          ["🍽️","Last meal 3+ hrs before bed"],
          ["🦴","10-min posture routine"],
          ["💊","Antihistamine if allergens are high"],
          ["📵","No screens 1 hr before sleep"],
        ].map(([icon,label],i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<9?"1px solid var(--border)":"none" }}>
            <span style={{ fontSize:16 }}>{icon}</span>
            <span style={{ fontSize:13, color:"var(--text-2)", flex:1 }}>{label}</span>
            <div style={{ width:18, height:18, borderRadius:5, border:"1px solid var(--border-strong)", flexShrink:0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
