import React from "react";
import { MEDICAL_DATA } from "../data/userData";
import { SectionHead, Alert } from "./UIComponents";

export default function Medical() {
  return (
    <div className="flex-col">
      <SectionHead title="🩸 Medical & Bloodwork" 
        sub="High-priority testing & clinical consultations identified from evaluation" />
      
      <Alert type="red">
        🚨 At 23 with unmeasured BP and symptoms of low testosterone/fatigue, getting clinical baseline data is critical before starting any supplement protocol.
      </Alert>

      <div className="grid-2">
        <div className="glass-card no-hover" style={{ padding: 16 }}>
          <div className="label-caps" style={{ marginBottom: 12, color: "var(--accent)" }}>Required Blood Panels</div>
          {MEDICAL_DATA.testsRequired.map((test, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom: i<MEDICAL_DATA.testsRequired.length-1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:"bold", 
                background: test.priority === "URGENT" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                color: test.priority === "URGENT" ? "#ef4444" : "#f59e0b"
              }}>{test.priority}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:600 }}>{test.name}</div>
                <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>{test.reason}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-col" style={{ gap: 16 }}>
          <div className="glass-card no-hover" style={{ padding: 16 }}>
            <div className="label-caps" style={{ marginBottom: 12, color: "#10b981" }}>Consultations</div>
            {MEDICAL_DATA.consultations.map((c, i) => (
              <div key={i} style={{ marginBottom: i===0?12:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.type}</div>
                  <div style={{ fontSize:9, color:"var(--text-3)", padding:"2px 6px", border:"1px solid var(--border)", borderRadius:4 }}>{c.status}</div>
                </div>
                <div style={{ fontSize:11, color:"var(--text-2)", marginTop:4 }}>{c.issue}</div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <div className="label-caps" style={{ marginBottom: 12, color: "#8b5cf6" }}>Blood Pressure Logger</div>
            <div style={{ textAlign:"center", padding:"16px 0", background:"var(--bg-elevated)", borderRadius:8, border:"1px solid var(--border)", marginBottom:10 }}>
              <div style={{ fontSize:11, color:"var(--text-3)" }}>Current Status</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#ef4444", marginTop:2 }}>{MEDICAL_DATA.bloodPressure.status}</div>
            </div>
            <Alert type="amber">⚠️ Purchase a home BP cuff immediately. High risk indicated by poor cardio and chronic stress.</Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
