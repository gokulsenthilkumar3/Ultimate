import './workspace-art.css';

export type WorkspaceArtKind = 'board' | 'launch' | 'thread' | 'data' | 'identity' | 'inbox' | 'book' | 'journal' | 'reel' | 'places' | 'family' | 'ledger';

/** Decorative vector stationery. Never encodes a connection state, record count or location. */
export default function WorkspaceArt({ kind }: { kind: WorkspaceArtKind }) {
  return <svg className={`workspace-art workspace-art--${kind}`} data-area-motion="signal" viewBox="0 0 180 108" width="140" height="84" fill="none" aria-hidden="true" focusable="false">
    <path d="M10 96h160M16 92v8m148-8v8" stroke="currentColor" strokeOpacity=".16" />
    {kind === 'ledger' && <>
      <g data-signal-part="shape"><rect x="33" y="13" width="85" height="77" rx="10" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5"/><path d="M50 31h44M50 45h23M50 60h35M50 75h18" stroke="currentColor" strokeOpacity=".45" strokeLinecap="round"/><path d="M42 13v77" stroke="currentColor" strokeOpacity=".25"/></g>
      <g data-signal-part="shape"><rect x="99" y="50" width="48" height="37" rx="8" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5"/><path d="M135 62h17v14h-17a7 7 0 0 1 0-14Z" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.5"/><circle cx="140" cy="69" r="2" fill="currentColor"/></g>
      <path data-signal-part="line" d="M127 23h21m-10-10v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>}
    {(kind === 'board' || kind === 'launch') && <>
      <path data-signal-part="line" d="M34 28h50v40h57M84 48h58M58 28v51" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" />
      {[['24','18','var(--gt-character-mint)'],['108','12','var(--gt-character-lilac)'],['60','57','var(--gt-character-yellow)']].map(([x,y,color], index) => <g data-signal-part="shape" key={x}><rect x={x} y={y} width="40" height="31" rx="8" fill={color} stroke="currentColor" strokeWidth="1.5" />{kind === 'launch' ? <path d={`m${+x+13} ${+y+20} 14-12m-10 0h10v10`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /> : <><circle cx={+x+10} cy={+y+11} r="3" fill="currentColor" fillOpacity=".45"/><path d={`M${+x+18} ${+y+11}h12m-20 10h16`} stroke="currentColor" strokeOpacity=".5" strokeLinecap="round" /></>}</g>)}
      <path data-signal-part="line" d="m144 70 5 5 12-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {kind === 'thread' && <>
      <g data-signal-part="shape"><path d="M25 18h86a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H58L42 73V62H25a10 10 0 0 1-10-10V28a10 10 0 0 1 10-10Z" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5" /><path d="M31 34h61M31 46h40" stroke="currentColor" strokeOpacity=".5" strokeLinecap="round" /></g>
      <g data-signal-part="shape"><path d="M91 53h63a9 9 0 0 1 9 9v17a9 9 0 0 1-9 9h-10v9l-13-9H91a9 9 0 0 1-9-9V62a9 9 0 0 1 9-9Z" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5" /><circle cx="104" cy="70" r="3" fill="currentColor"/><circle cx="121" cy="70" r="3" fill="currentColor"/><circle cx="138" cy="70" r="3" fill="currentColor"/></g>
      <path data-signal-part="line" d="M140 15v18m-9-9h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>}
    {kind === 'data' && <>
      <g data-signal-part="shape"><path d="M36 30v46c0 10 22 17 49 17s49-7 49-17V30" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="85" cy="30" rx="49" ry="17" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5"/></g>
      <path data-signal-part="line" d="M36 50c0 10 22 17 49 17s49-7 49-17M36 72c0 10 22 17 49 17s49-7 49-17" stroke="currentColor" strokeWidth="1.5" />
      <g data-signal-part="shape"><rect x="120" y="58" width="39" height="27" rx="6" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.5"/><path d="m131 72 5 4 11-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>
    </>}
    {kind === 'identity' && <>
      <g data-signal-part="shape"><rect x="29" y="19" width="119" height="71" rx="12" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5"/><circle cx="62" cy="43" r="12" fill="var(--gt-surface)" stroke="currentColor" strokeWidth="1.5"/><path d="M43 75c1-22 37-22 38 0" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5"/></g>
      <path data-signal-part="line" d="M96 38h33M96 50h22M96 65h27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <g data-signal-part="shape"><circle cx="144" cy="82" r="14" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.5"/><path d="m138 82 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></g>
    </>}
    {kind === 'inbox' && <>
      <g data-signal-part="shape"><path d="M36 50h108l16 36H20l16-36Z" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5"/><path d="M20 86V67h43l9 11h36l9-11h43v19a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8Z" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5"/></g>
      <g data-signal-part="shape"><rect x="57" y="17" width="66" height="42" rx="7" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.5"/><path d="m58 23 32 20 32-20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></g>
      <path data-signal-part="line" d="M37 24v12m-6-6h12m100-14 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>}
    {(kind === 'book' || kind === 'journal') && <>
      <g data-signal-part="shape"><path d="M24 24c25-7 45-4 66 6 21-10 41-13 66-6v62c-25-6-45-4-66 5-21-9-41-11-66-5V24Z" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.5"/><path d="M90 30v61" stroke="currentColor" strokeWidth="1.5"/></g>
      <path data-signal-part="line" d="m37 40 37 5m-37 9 37 5m-37 9 25 3m42-27 35-6m-35 20 35-6m-35 20 21-4" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round"/>
      <g data-signal-part="shape"><path d={kind === 'journal' ? 'M113 18h18v33l-9-6-9 6V18Z' : 'M132 12h20v34l-10-6-10 6V12Z'} fill="var(--gt-character-coral)" stroke="currentColor" strokeWidth="1.5"/></g>
    </>}
    {kind === 'reel' && <>
      <g data-signal-part="shape"><circle cx="71" cy="49" r="37" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.5"/>{[[71,27],[92,49],[71,71],[50,49]].map(([x,y])=><circle key={x+':'+y} cx={x} cy={y} r="8" fill="var(--gt-surface)" stroke="currentColor" strokeWidth="1.2"/>)}<circle cx="71" cy="49" r="4" fill="currentColor"/></g>
      <path data-signal-part="line" d="M72 86h61c18 0 21-20 5-20h-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <g data-signal-part="shape"><rect x="112" y="24" width="39" height="34" rx="8" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5"/><path d="m126 33 13 8-13 8V33Z" fill="currentColor"/></g>
    </>}
    {kind === 'places' && <>
      <g data-signal-part="shape"><path d="m20 40 44-14 50 12 43-14v60l-43 12-50-12-44 12V40Z" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.5"/><path d="M64 26v58m50-46v58" stroke="currentColor" strokeOpacity=".3"/></g>
      <path data-signal-part="line" d="M39 75c28-34 25 25 58-9s34 3 44-18" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 4" strokeLinecap="round"/>
      <g data-signal-part="shape"><path d="M105 26c0 14-18 32-18 32S69 40 69 26a18 18 0 0 1 36 0Z" fill="var(--gt-character-coral)" stroke="currentColor" strokeWidth="1.5"/><circle cx="87" cy="26" r="6" fill="var(--gt-surface)" stroke="currentColor" strokeWidth="1.5"/></g>
    </>}
    {kind === 'family' && <>
      <path data-signal-part="line" d="M90 34v22H42v19m48-19h48v19M90 56v19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {[[90,24,'var(--gt-character-coral)'],[42,79,'var(--gt-character-mint)'],[90,79,'var(--gt-character-yellow)'],[138,79,'var(--gt-character-lilac)']].map(([x,y,color])=><g data-signal-part="shape" key={x+':'+y}><circle cx={x} cy={y} r="16" fill={String(color)} stroke="currentColor" strokeWidth="1.5"/><path d={`M${+x-6} ${+y+4}q6 7 12 0`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx={+x-5} cy={+y-3} r="1.3" fill="currentColor"/><circle cx={+x+5} cy={+y-3} r="1.3" fill="currentColor"/></g>)}
    </>}
  </svg>;
}
