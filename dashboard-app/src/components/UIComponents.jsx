import { useState, useEffect, useRef } from "react";
import { STATUS } from "../data/userData";

// ── Animated SVG Ring ─────────────────────────────────────────
export function Ring({ pct = 0, size = 88, sw = 9, color, trackColor }) {
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const [dash, setDash] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * circ), 120);
    return () => clearTimeout(t);
  }, [pct, circ]);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={trackColor || "rgba(255,255,255,0.07)"} strokeWidth={sw} />
      {/* Glow */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color || "var(--accent)"} strokeWidth={sw + 4} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ filter: "blur(6px)", opacity: 0.35, transition: "stroke-dasharray 1.3s cubic-bezier(0.4,0,0.2,1)" }} />
      {/* Main */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color || "var(--accent)"} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1.3s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

// ── Animated Count-Up Number ──────────────────────────────────
export function CountUp({ to, suffix = "", duration = 1200 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let start; let id;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * to));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Status Badge ──────────────────────────────────────────────
export function Badge({ status }) {
  const st = STATUS[status];
  if (!st) return null;
  return <span className={`badge badge-${status}`}>{st.label}</span>;
}

// ── Body Part Accordion Card ──────────────────────────────────
export function PartCard({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const st = STATUS[data.status];
  return (
    <div className={`part-card ${open ? `open-${data.status}` : ""} card-stagger`}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "13px 16px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0 }}>{data.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{data.name}</div>
          {data.issues && (
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.issues[0]}
            </div>
          )}
        </div>
        <Badge status={data.status} />
        <span style={{ color: "var(--text-4)", fontSize: 12, marginLeft: 4, flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      <div className={`accordion-body ${open ? "open" : ""}`}>
        {open && (
          <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${st?.border || "rgba(255,255,255,0.06)"}` }}>
            {data.inputs && (
              <>
                <div className="label-caps" style={{ marginTop: 12, marginBottom: 7 }}>What you told us</div>
                {data.inputs.map((inp, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4, display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--text-4)", flexShrink: 0 }}>›</span>{inp}
                  </div>
                ))}
              </>
            )}
            <div className="label-caps" style={{ marginTop: 14, marginBottom: 7 }}>Issues identified</div>
            {(data.issues || []).map((issue, i) => (
              <div key={i} style={{ fontSize: 12, color: "#fca5a5", marginBottom: 5, display: "flex", gap: 7 }}>
                <span style={{ color: st?.color || "#ef4444", flexShrink: 0 }}>✗</span>{issue}
              </div>
            ))}
            <div className="label-caps" style={{ marginTop: 14, marginBottom: 7 }}>Action plan</div>
            {(data.fixes || []).map((fix, i) => (
              <div key={i} style={{ fontSize: 12, color: "#86efac", marginBottom: 5, display: "flex", gap: 7 }}>
                <span style={{ color: "#22c55e", flexShrink: 0 }}>→</span>{fix}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────
export function ProgressBar({ pct, color, animated = true }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!animated) { setW(pct); return; }
    const t = setTimeout(() => setW(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="prog-track">
      <div className={`prog-fill ${!color ? "gradient" : ""}`}
        style={{ width: `${Math.min(100, Math.max(0, w))}%`, background: color }} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div className="glass-card" style={{ padding: 16, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: color || "var(--accent)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Recharts custom tooltip ───────────────────────────────────
export function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 14px", fontFamily: "var(--font-body)",
      fontSize: 12, boxShadow: "var(--shadow)",
    }}>
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 16 }}>
        {payload[0].value}"
      </div>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────
export function SectionHead({ title, sub, badge }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 className="section-title">{title}</h1>
        {badge && <span className={`badge badge-${badge}`}>{STATUS[badge]?.label}</span>}
      </div>
      {sub && <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

// ── Alert Banner ─────────────────────────────────────────────
export function Alert({ type = "amber", children }) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}
