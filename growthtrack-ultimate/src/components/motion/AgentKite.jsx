import ProceduralStage from './ProceduralStage';

export default function AgentKite({ state = 'idle', className = '', compact = false, enabled = true }) {
  return <span className={`agent-kite ${className}`} data-pose={state} aria-hidden="true"><ProceduralStage kind="kite" state={state} compact={compact} enabled={enabled}>
    <svg viewBox="0 0 200 200" fill="none" focusable="false"><ellipse cx="100" cy="171" rx="36" ry="6" fill="#244d4715" /><path d="m93 83-72-13 42 64 32-24m12-27 72-13-42 64-32-24" fill="#83cdbb" stroke="#244d47" strokeWidth="2" /><path d="m107 83 72-13-51 31" fill="#fff1cf" stroke="#244d47" strokeWidth="2" /><path d="M98 63 95 44m0 0 8-7" stroke="#244d47" strokeWidth="3" /><circle cx="104" cy="36" r="6" fill="#ffc95e" /><path d="M80 80q20-18 40 0l6 30q-26 37-52 0Z" fill="#f4f0dc" stroke="#244d47" strokeWidth="2" /><rect x="79" y="82" width="43" height="22" rx="11" fill="#183f44" /><path d="M91 90v7m20-7v7" stroke="#ffc95e" strokeWidth="4" strokeLinecap="round" /><path d="m100 113 7 8-7 8-7-8Z" fill="#ffc95e" /><path d="M100 138c-20 26 26 31 19 10" stroke="#83cdbb" strokeWidth="4" strokeLinecap="round" /></svg>
  </ProceduralStage></span>;
}
