import { useEffect, useState } from 'react';

export type CrewState = 'idle' | 'greet' | 'listen' | 'snip' | 'celebrate' | 'oops' | 'sleep';
export const CREW_ALIASES: Record<string, string> = { siren: 'blip', snip: 'mochi', sunny: 'ziggy' };
const names = ['blip', 'mochi', 'ziggy', 'nova'];
export const resolveCrew = (kind: string) => CREW_ALIASES[kind] || (names.includes(kind) ? kind : 'nova');
const durations: Partial<Record<CrewState, number>> = { greet: 1200, celebrate: 700, oops: 350, snip: 1000 };
export function useCrewState(request: CrewState) {
  const [state, setState] = useState<CrewState>(request);
  useEffect(() => {
    setState(request);
    const duration = durations[request];
    if (!duration) return;
    const timer = setTimeout(() => setState('idle'), duration);
    return () => clearTimeout(timer);
  }, [request]);
  return state;
}

/** One sprite sheet per application; each sprite stays below 20 paths / 5 groups. */
export function GlowSprites() {
  return <svg className="glow-sprites" aria-hidden="true" focusable="false"><defs>
    {names.map(kind => <symbol key={kind} id={`gt-glow-${kind}`} viewBox="0 0 240 240">
      <g stroke="#10231C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'blip' ? <><path d="M57 157 17 191l15-55-18-23 53-8" fill="#FFD23F" /><path d="m58 101 15-60 39 27 43-20 19 57c29 23 18 82-31 91-58 12-101-23-85-95Z" fill="#FF5A3C" /><path d="m79 64 12 18m48-5 15-10" stroke="#FFF8E7" strokeWidth="8" /></>
          : kind === 'mochi' ? <><path d="M47 139c-13-34 7-77 42-77 16-31 61-30 77 2 34 7 53 40 37 76 17 49-30 64-58 47-32 23-92 6-98-18-10-10-9-21 0-30Z" fill="#2EE6A8" /><path d="M70 88q12-13 25-13" stroke="#FFF8E7" strokeWidth="8" /></>
          : kind === 'ziggy' ? <path d="m140 20-89 102 43 11-20 82 99-111-43-10Z" fill="#FFD23F" />
          : <><path d="m120 22 29 66 69 32-69 31-29 67-31-67-67-31 67-32Z" fill="#A78BFA" /><path d="m169 32 4 11m-9-5h13" strokeWidth="3" /></>}
        <path d="m91 188-7 22H72m74-22 8 22h12" fill="none" />
        <path d="M105 139q15 15 30 0" fill="none" style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'var(--glow-mouth-transform, none)' }} />
        <path d="M81 130h8m62 0h8" stroke="#B3341F" strokeWidth="4" opacity=".6" />
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'var(--glow-wave, none)' }}><path d="m178 138 22-9 3-15m-142 24-20-9" fill="none" /></g>
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'var(--glow-eye-transform, none)', animation: 'var(--glow-blink, none)' }}><path d="M99 111v9m40-9v9" fill="none" strokeWidth="6" /></g>
      </g>
    </symbol>)}
  </defs></svg>;
}

export default function GlowCrew({ kind = 'blip', state = 'idle', eyesClosed = false, className = '', blink = true }: { kind?: string; state?: CrewState; eyesClosed?: boolean; className?: string; blink?: boolean }) {
  const character = resolveCrew(kind);
  return <svg className={`character-art glow-crew glow-crew--${character} ${className}`} data-character-name={character} data-state={state} data-eyes-closed={String(eyesClosed)} data-blink={String(blink)} viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false"><g className="glow-crew__body"><use href={`#gt-glow-${character}`} /></g></svg>;
}
