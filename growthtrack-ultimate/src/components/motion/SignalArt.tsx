type Kind = 'focus' | 'stack' | 'day' | 'plot' | 'tiles' | 'trail' | 'projection' | 'exchange';

/** A small vector signature for a page, not a chart, score, provider state or prediction. */
export default function SignalArt({ kind, progress = .5 }: { kind: Kind; progress?: number }) {
  const phase = Math.max(0, Math.min(1, progress));
  const angle = Math.PI * (1 - phase), sun = { x: 72 + Math.cos(angle) * 47, y: 66 - Math.sin(angle) * 47 };
  return <svg className={`insight-signal insight-signal--${kind}`} data-insight="signal" width="120" height="74" viewBox="0 0 144 88" fill="none" aria-hidden="true" focusable="false">
    <path d="M10 76h124" stroke="currentColor" strokeOpacity=".16" />
    {kind === 'focus' && <>
      <circle data-signal-part="shape" cx="72" cy="42" r="29" fill="var(--gt-character-yellow)" fillOpacity=".3" />
      <path data-signal-part="line" d="M48 42a24 24 0 1 1 48 0 24 24 0 1 1-48 0M36 42h15m42 0h15M72 6v15m0 42v15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path data-signal-part="line" d="m63 42 7 7 15-17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle data-signal-part="shape" cx="112" cy="21" r="6" fill="var(--gt-character-coral)" />
    </>}
    {kind === 'stack' && <>
      {[0, 1, 2].map((index) => <g data-signal-part="shape" key={index}><g transform={`translate(${index * 10}, ${index * -9})`}><rect x="35" y="35" width="66" height="35" rx="8" fill={['var(--gt-character-lilac)', 'var(--gt-character-mint)', 'var(--gt-surface)'][index]} stroke="currentColor" strokeWidth="1.5" /><path d="M47 48h17m-17 9h34" stroke="currentColor" strokeOpacity=".45" strokeLinecap="round" /></g></g>)}
      <path data-signal-part="line" d="m109 21 4 4 10-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>}
    {kind === 'day' && <>
      <path data-signal-part="line" d="M25 66a47 47 0 0 1 94 0" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" />
      <path data-signal-part="line" d="M16 68h112M72 7v7m-45 9 5 5m85-5-5 5" stroke="currentColor" strokeOpacity=".4" strokeLinecap="round" />
      <g data-signal-part="shape"><circle cx={sun.x} cy={sun.y} r="10" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.5" /><circle cx={sun.x} cy={sun.y} r="16" stroke="currentColor" strokeOpacity=".15" /></g>
    </>}
    {kind === 'plot' && <>
      <path d="M24 15v55h100M24 46h100M55 15v55m34-55v55" stroke="currentColor" strokeOpacity=".15" />
      <path data-signal-part="line" d="M26 60c20 0 17-28 37-25s23 20 35-1 14-14 25-20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {[[43, 51], [68, 33], [105, 26]].map(([x, y], index) => <circle data-signal-part="shape" key={index} cx={x} cy={y} r="5" fill={['var(--gt-character-mint)', 'var(--gt-character-lilac)', 'var(--gt-character-coral)'][index]} stroke="currentColor" strokeWidth="1.3" />)}
    </>}
    {kind === 'tiles' && <>
      <g data-signal-part="shape"><rect x="23" y="15" width="43" height="54" rx="8" fill="var(--gt-character-mint)" fillOpacity=".55" stroke="currentColor" strokeWidth="1.4" /><path d="M33 55v-9m9 9V34m9 21V27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></g>
      <g data-signal-part="shape"><rect x="74" y="15" width="48" height="24" rx="7" fill="var(--gt-character-yellow)" fillOpacity=".55" stroke="currentColor" strokeWidth="1.4" /><path d="m84 29 6-5 8 5 13-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></g>
      <g data-signal-part="shape"><rect x="74" y="46" width="48" height="23" rx="7" fill="var(--gt-character-lilac)" fillOpacity=".45" stroke="currentColor" strokeWidth="1.4" /><circle cx="89" cy="57" r="4" fill="currentColor" /><path d="M101 57h12" stroke="currentColor" strokeLinecap="round" /></g>
    </>}
    {kind === 'trail' && <>
      <path data-signal-part="line" d="M22 65h21V47h24V31h25V16h30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {[[22, 65], [55, 47], [80, 31], [115, 16]].map(([x, y], index) => <circle data-signal-part="shape" key={index} cx={x} cy={y} r="5" fill={index === 3 ? 'var(--gt-character-coral)' : 'var(--gt-character-mint)'} stroke="currentColor" strokeWidth="1.4" />)}
    </>}
    {kind === 'projection' && <>
      <path d="M20 69h106M81 16v53" stroke="currentColor" strokeOpacity=".2" />
      <path data-signal-part="line" d="m23 58 17-6 13 3 14-18 14 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path data-signal-part="line" d="m81 40 39-22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
      <circle data-signal-part="shape" cx="81" cy="40" r="6" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5" /><circle data-signal-part="shape" cx="120" cy="18" r="6" stroke="currentColor" strokeWidth="1.5" />
    </>}
    {kind === 'exchange' && <>
      <path data-signal-part="line" d="M26 31h88l-9-9m9 9-9 9M118 59H30l9 9m-9-9 9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <g data-signal-part="shape"><circle cx="37" cy="31" r="12" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5" /><path d="M33 31h8m-4-4v8" stroke="currentColor" strokeLinecap="round" /></g>
      <g data-signal-part="shape"><circle cx="107" cy="59" r="12" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5" /><path d="m103 56 8 6m-8 0 8-6" stroke="currentColor" strokeLinecap="round" /></g>
    </>}
  </svg>;
}
