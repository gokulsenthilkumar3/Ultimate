import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Compass, Moon, RotateCcw, Sparkles, Sun, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProceduralStage from '../components/motion/ProceduralStage';
import { useKinetic } from '../components/motion/KineticContext';
import { featurePath } from '../config/featureRegistry';
import { createWorldController, DRIVE_KEYS, stopTarget, WORLD_STOPS } from './welcomeWorldModel';
import WelcomeWorldPoster from './WelcomeWorldPoster';
import './welcome-companion.css';

const DIRECTIONS = [{ key: 'arrowup', label: 'Move forward', Icon: ArrowUp }, { key: 'arrowleft', label: 'Move left', Icon: ArrowLeft }, { key: 'arrowdown', label: 'Move back', Icon: ArrowDown }, { key: 'arrowright', label: 'Move right', Icon: ArrowRight }];
const COMPACT_QUERY = '(max-width: 800px), (pointer: coarse)';
export default function WelcomeCompanion() {
  const controller = useRef(createWorldController()), surface = useRef(null), active = useRef(false), pendingTarget = useRef(null);
  const [selected, setSelected] = useState(null), [visited, setVisited] = useState([]), [renderer, setRenderer] = useState('poster');
  const [driving, setDriving] = useState(false), [dusk, setDusk] = useState(false), [notice, setNotice] = useState('Three places to discover. Take the scenic route.');
  const [compactWorld, setCompactWorld] = useState(() => window.matchMedia?.(COMPACT_QUERY).matches || false), [entered, setEntered] = useState(false);
  const journey = useRef(null), journeyStart = useRef(0);
  const [touring, setTouring] = useState(false), [following, setFollowing] = useState(true);
  const cancelJourney = useCallback(() => { journey.current = null; setTouring(false); }, []);
  const { canAnimate, tier } = useKinetic();
  const enabled = !compactWorld || entered;
  const canDrive = enabled && renderer === 'ready' && canAnimate && tier > 0;
  const stop = WORLD_STOPS.find(item => item.id === selected);
  useEffect(() => { if (renderer !== 'ready') cancelJourney(); }, [renderer, cancelJourney]);
  useEffect(() => { const media = window.matchMedia?.(COMPACT_QUERY); const change = event => setCompactWorld(event.matches); media?.addEventListener('change', change); return () => media?.removeEventListener('change', change); }, []);
  useEffect(() => { if (!canAnimate) { cancelJourney(); pendingTarget.current = null; controller.current.target = null; controller.current.keys.clear(); } }, [canAnimate, cancelJourney]);
  const onActiveChange = useCallback(value => { active.current = value; if (value && pendingTarget.current) controller.current.target = pendingTarget.current; else if (value && journey.current !== null) controller.current.target = stopTarget(WORLD_STOPS[(journeyStart.current + journey.current) % WORLD_STOPS.length]); }, []);
  const onSceneEvent = useCallback(event => {
    if (event.type === 'arrive' || event.type === 'manual') pendingTarget.current = null;
    if (event.type === 'discover') {
      const found = WORLD_STOPS.find(item => item.id === event.id); if (!found) return;
      setSelected(found.id); setVisited(previous => previous.includes(found.id) ? previous : [...previous, found.id]); setNotice(found.title + ' discovered.');
    } else if (event.type === 'arrive' && journey.current !== null && WORLD_STOPS[(journeyStart.current + journey.current) % WORLD_STOPS.length]?.id === event.id) {
      const next = journey.current + 1;
      if (next < WORLD_STOPS.length) { journey.current = next; const destination = WORLD_STOPS[(journeyStart.current + next) % WORLD_STOPS.length]; pendingTarget.current = stopTarget(destination); controller.current.target = pendingTarget.current; setSelected(destination.id); setNotice('Next light: ' + destination.title + '.'); }
      else { cancelJourney(); controller.current.pulse++; setNotice('Three little lights. Your world is awake.'); }
    } else if (event.type === 'manual') { if (journey.current !== null) cancelJourney(); }
    else if (event.type === 'travel') { cancelJourney(); pendingTarget.current = controller.current.target; setNotice('Your route, your pace. Click a path to explore.'); }
  }, [cancelJourney]);
  const choose = item => {
    cancelJourney();
    setSelected(item.id); controller.current.keys.clear();
    if (canDrive) { const target = stopTarget(item); pendingTarget.current = target; if (active.current) controller.current.target = target; surface.current?.scrollIntoView({ block: 'center', behavior: 'auto' }); }
    else { controller.current.target = null; pendingTarget.current = null; }
    setNotice(canDrive ? 'Travelling to ' + item.title + '.' : 'Previewing ' + item.title + '.');
  };
  const release = () => { controller.current.keys.clear(); setDriving(false); };
  const drive = () => { cancelJourney(); pendingTarget.current = null; controller.current.target = null; setDriving(true); surface.current?.focus({ preventScroll: true }); setNotice('WASD or arrow keys to glide. Shift catches a little breeze. Escape leaves controls.'); };
  const startJourney = () => { release(); journeyStart.current = Math.max(0, WORLD_STOPS.findIndex(item => item.id === selected)); const first = WORLD_STOPS[journeyStart.current]; journey.current = 0; setTouring(true); setSelected(first.id); const target = stopTarget(first); pendingTarget.current = target; if (active.current) controller.current.target = target; surface.current?.scrollIntoView({ block: 'center', behavior: 'auto' }); setNotice('Follow Pebble, starting at ' + first.title + '. Three places, three little lights.'); };
  const keyDown = event => {
    if (event.key === 'Escape') { cancelJourney(); pendingTarget.current = null; controller.current.target = null; release(); surface.current?.blur(); return; }
    if (!canDrive || !driving || event.ctrlKey || event.metaKey || event.altKey || !DRIVE_KEYS.has(event.key.toLowerCase())) return;
    cancelJourney();
    pendingTarget.current = null;
    event.preventDefault(); controller.current.target = null; controller.current.keys.add(event.key.toLowerCase());
  };
  const keyUp = event => { if (DRIVE_KEYS.has(event.key.toLowerCase())) controller.current.keys.delete(event.key.toLowerCase()); };
  return <figure id="welcome-world" className="welcome-companion welcome-world" data-state={selected || 'explore'} aria-labelledby="welcome-companion-caption">
    <div className="world-layout" data-dusk={String(dusk)}>
      <div className="world-playfield" data-deferred={String(!enabled)}>
        <div ref={surface} className="world-surface" data-world-controls data-driving={String(driving)} tabIndex={0} role="group" aria-label="3D island exploration area" aria-describedby="world-driving-instructions" onKeyDown={keyDown} onKeyUp={keyUp} onBlur={release} onPointerDown={() => { if (canDrive) { setDriving(true); surface.current?.focus({ preventScroll: true }); } }}>
          <ProceduralStage kind="atlas" state={selected || 'explore'} enabled={enabled} controller={controller} onSceneEvent={onSceneEvent} onStatusChange={setRenderer} onActiveChange={onActiveChange}><WelcomeWorldPoster /></ProceduralStage>
        </div>
        <div className="world-heading"><span className="world-eyebrow"><i /> THE GROWTH ISLES</span><span className="world-wordmark">Make space.<br /><em>Watch it grow.</em></span></div>
        <div className="world-top-controls"><span className="world-discoveries" aria-label={visited.length + ' of 3 tour places discovered'}><Compass size={15} aria-hidden="true" />{visited.length} / 3 discovered</span><button type="button" aria-label={dusk ? 'Switch to daytime' : 'Switch to golden hour'} aria-pressed={dusk} onClick={() => { const next = !dusk; setDusk(next); controller.current.dusk = next; }}>{dusk ? <Sun size={17} /> : <Moon size={17} />}</button></div>
        <div className="world-navigation"><button type="button" disabled={!canDrive} aria-label="Rotate view left" onClick={() => { controller.current.angle -= Math.PI / 4; }}><RotateCcw size={17} /></button><button type="button" disabled={!canDrive} aria-label="Zoom in" onClick={() => { controller.current.zoom = Math.min(1.25, controller.current.zoom + .1); }}><ZoomIn size={17} /></button><button type="button" disabled={!canDrive} aria-label="Zoom out" onClick={() => { controller.current.zoom = Math.max(.85, controller.current.zoom - .1); }}><ZoomOut size={17} /></button></div>
        {!enabled && <div className="world-entry">{canAnimate && tier > 0 ? <button type="button" onClick={() => { setEntered(true); setNotice('Bringing the 3D world to life.'); }}>Enter 3D world<ArrowUpRight size={17} aria-hidden="true" /></button> : <span>Explore every place using the tour below.</span>}<small>Your tour works in static mode, too.</small></div>}
        <div className="world-drive-panel"><div className="world-dpad" role="group" aria-label="Touch driving controls">{DIRECTIONS.map(({ key, label, Icon }) => <button key={key} className={'world-dpad__' + key} type="button" aria-label={label} disabled={!canDrive} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); controller.current.target = null; controller.current.keys.add(key); }} onPointerUp={() => controller.current.keys.delete(key)} onLostPointerCapture={() => controller.current.keys.delete(key)} onPointerCancel={() => controller.current.keys.delete(key)} onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); controller.current.target = null; controller.current.keys.add(key); } }} onKeyUp={() => controller.current.keys.delete(key)} onBlur={() => controller.current.keys.delete(key)}><Icon size={17} aria-hidden="true" /></button>)}</div><div><button className="world-drive-button" type="button" disabled={!canDrive} aria-pressed={driving} onClick={drive}>Pilot Pebble <ArrowUpRight size={14} aria-hidden="true" /></button><p id="world-driving-instructions">Click a path or use WASD / arrows.<br />Escape releases flight. Tab moves on.</p></div></div>
        <div className="world-little-actions"><button type="button" disabled={!canDrive} onClick={() => { controller.current.pulse++; }}><Sparkles size={14} aria-hidden="true" />A little spark</button><button type="button" disabled={!canDrive} onClick={() => { cancelJourney(); pendingTarget.current = null; controller.current.reset++; setNotice('Pebble is back at the starting point.'); }}><RotateCcw size={14} aria-hidden="true" />Return Pebble home</button></div>
      </div>
      <aside className="world-info" aria-labelledby="welcome-companion-caption"><p className="world-eyebrow">{stop ? stop.number + ' / ' + stop.area.toUpperCase() : 'A SMALL JOURNEY. A BRIGHTER DAY.'}</p><h2 id="welcome-companion-caption">{stop ? stop.title : 'Small steps bring this world to life.'}</h2><p>{stop ? stop.copy : 'Meet Pebble, your leaf-sailed seed glider. Visit work, wellbeing and life to wake three lanterns. A connected day starts with one small move.'}</p>{stop ? <Link to={featurePath(stop.feature)} className="world-info__link">{stop.action}<ArrowUpRight size={16} aria-hidden="true" /></Link> : <Link to="/login" className="world-info__link">Sign in to your space<ArrowUpRight size={16} aria-hidden="true" /></Link>}<span className="world-info__footnote">A playful tour. Your records stay in your workspace.</span></aside>
    </div>
    <div className="world-journey" data-complete={String(visited.length === 3)}>
      <div className="world-journey__intro"><span className="world-eyebrow">YOUR LITTLE FIELD GUIDE</span><strong>{visited.length === 3 ? 'Your little world is awake.' : 'Three places. Three little lights.'}</strong><span>{visited.length === 3 ? 'Take that spark into your own day.' : 'Explore freely, or let Pebble show you around.'}</span></div>
      <nav className="world-route-map" aria-label="Island route map">{WORLD_STOPS.map(item => <button key={item.id} type="button" aria-label={'Map destination ' + item.area} aria-pressed={selected === item.id} data-lit={String(visited.includes(item.id))} onClick={() => choose(item)}><span aria-hidden="true">{visited.includes(item.id) ? '✦' : item.number}</span>{item.area}</button>)}</nav>
      <div className="world-journey__actions"><button className="world-tour-button" type="button" disabled={!canDrive} onClick={() => { if (touring) { cancelJourney(); pendingTarget.current = null; controller.current.target = null; setNotice('Journey paused. Explore at your own pace.'); } else startJourney(); }}>{touring ? 'Stop guided journey' : 'Start guided journey'}<ArrowUpRight size={15} aria-hidden="true" /></button><button className="world-follow-button" type="button" aria-label="Follow Pebble" disabled={!canDrive} aria-pressed={following} onClick={() => { const next = !following; setFollowing(next); controller.current.follow = next; }}>Follow Pebble</button></div>
      <details className="world-guide"><summary>How to explore</summary><p>Choose a place on the map, click a path, or use Pilot Pebble with WASD / arrows. Shift catches a little breeze. Escape releases the controls. Return Pebble home resets your position; your discovered lights remain. The guided journey visits all three places. In static mode, every place is available through the cards below.</p></details>
    </div>
    <nav className="world-destinations" aria-label="Explore GrowthTrack places">{WORLD_STOPS.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => choose(item)}><span className="world-destinations__number">{item.number}</span><span><strong>{item.title}</strong><small>{item.area}{visited.includes(item.id) ? ' · Discovered' : ' · Visit this place'}</small></span><ArrowUpRight size={20} aria-hidden="true" /></button>)}</nav>
    <figcaption className="world-status"><span role="status" aria-live="polite">{notice}</span><span>{renderer === 'loading' ? 'Bringing the world to life…' : canDrive ? '3D exploration is ready' : 'Static tour · every place is available below'}</span></figcaption>
  </figure>;
}
