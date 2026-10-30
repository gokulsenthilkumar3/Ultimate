import React from 'react';
import { useKinetic } from './KineticContext';
import GlowCrew from './GlowCrew';

const ink = '#233d36';

function Face({ x = 120, y = 115, happy = false, eyesClosed = false }) {
  return <g stroke={ink} strokeWidth="4.5" strokeLinecap="round" fill="none">
    <g className={`character-art__eyes${eyesClosed ? ' character-art__eyes--closed' : ''}`}>
      <path d={eyesClosed ? `M${x - 25} ${y}q6 7 12 0 M${x + 13} ${y}q6 7 12 0` : `M${x - 19} ${y - 4}v7 M${x + 19} ${y - 4}v7`} />
    </g>
    <path d={happy ? `M${x - 12} ${y + 17}q12 18 24 0Z` : `M${x - 10} ${y + 17}q10 10 20 0`} fill={happy ? ink : 'none'} />
    <ellipse cx={x - 33} cy={y + 10} rx="8" ry="4" fill="#f09187" stroke="none" />
    <ellipse cx={x + 33} cy={y + 10} rx="8" ry="4" fill="#f09187" stroke="none" />
  </g>;
}

/** Original flat vector artwork. Faces and limbs remain separate animation layers. */
export default function CharacterArt({ kind = 'siren', happy = false, eyesClosed = false, className = '', state = 'idle', blink = true }) {
  const { enabled } = useKinetic();
  if (enabled) return <GlowCrew kind={kind} state={state} eyesClosed={eyesClosed} className={className} blink={blink} />;
  return <svg className={`character-art character-art--${kind} ${className}`} data-eyes-closed={String(eyesClosed)} viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false">
    {kind === 'snip' ? <>
      <g stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M92 189l-5 24H70m77-23 10 23h17" />
        <path d="M60 142q-24-9-27 5m143-7q22-12 26-3" />
        <g className="character-art__blade character-art__blade--left"><path d="M121 111 71 28c-5-9-13-1-12 6l18 84 44 13" fill="#efeee4" /></g>
        <g className="character-art__blade character-art__blade--right"><path d="m119 111 48-83c6-9 14-1 13 6l-18 84-44 13" fill="#efeee4" /></g>
        <circle cx="120" cy="90" r="32" fill="#85d9b8" />
        <path d="M120 108c-29-25-69-13-72 25-4 39 23 64 49 52 18-9 19-31 23-44 4 13 5 35 23 44 26 12 53-13 49-52-3-38-43-50-72-25Z" fill="#85d9b8" />
        <ellipse cx="81" cy="149" rx="15" ry="20" fill="#fffbed" strokeWidth="4" />
        <ellipse cx="159" cy="149" rx="15" ry="20" fill="#fffbed" strokeWidth="4" />
        <circle cx="120" cy="119" r="7" fill="#233d36" stroke="none" />
      </g>
      <Face x={120} y={79} happy={happy} eyesClosed={eyesClosed} />
    </> : kind === 'sunny' ? <>
      <g stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m95 184-7 28H72m73-28 8 28h16M50 119q-20 9-24-2m164 2q21 10 24-2" />
        <path d="m120 24 19 27 30-10 6 33 32 6-10 30 27 19-27 19 10 30-32 6-6 32-30-10-19 27-19-27-30 10-6-32-32-6 10-30-27-19 27-19-10-30 32-6 6-33 30 10Z" fill="#f9ce5b" strokeWidth="3.5" />
      </g>
      <Face y={120} happy={happy} eyesClosed={eyesClosed} />
    </> : <>
      <g stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m92 181-8 31H68m78-31 10 31h16" />
        <path d="M58 127q-26 8-29-6" />
        <g className="character-art__wave"><path d="M182 124q26-2 24-28m0 0-9-4m9 4 5-8" /></g>
        <path d="M61 152V99c0-35 22-62 59-62s59 27 59 62v53" fill="#ff806b" />
        <path d="M65 150h110l19 25c3 5 0 10-6 10H52c-6 0-9-5-6-10Z" fill="#f26050" />
        <path d="M84 75q9-15 24-17" stroke="#ffc9ac" strokeWidth="8" />
        <path d="M110 31v-9m-58 32-8-7m144 7 8-7" />
        <path d="M105 185q15 23 30 0" fill="#f9ce5b" />
      </g>
      <Face y={106} happy={happy} eyesClosed={eyesClosed} />
    </>}
  </svg>;
}
