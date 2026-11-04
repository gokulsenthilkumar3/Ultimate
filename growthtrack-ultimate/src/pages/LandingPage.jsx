import { useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, LockKeyhole, RotateCcw, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import CharacterScene, { MotionToggle } from '../components/motion/CharacterScene';
import usePlayfulMotion from '../hooks/usePlayfulMotion';
import SirenSnipScene from './SirenSnipScene';
import AnimatedLogo from '../components/motion/AnimatedLogo';
import { useKinetic } from '../components/motion/KineticContext';
import useLandingMotion from '../hooks/useLandingMotion';
import { emitCelebration } from '../components/motion/ConfettiHost';
import WelcomeCompanion from './WelcomeCompanion';
import './public-pages.css';
import './playful-landing.css';
import './welcome-crew-motion.css';

const crew = [
  { kind: 'siren', name: 'Siren', title: 'Hello, focus.', number: '01', copy: 'A friendly nudge toward the thing that matters. Big bell energy. Absolutely no alarm required.' },
  { kind: 'snip', name: 'Snip', title: 'Bye, busywork.', number: '02', copy: 'A little space-maker with a simple philosophy: trim the noise and keep the good stuff.' },
  { kind: 'sunny', name: 'Sunny', title: 'Nice, you did it.', number: '03', copy: 'Your small-win enthusiast. Because a five-minute start still deserves a little sunshine.' },
];
const glowCrew = [
  { kind: 'blip', name: 'Blip', title: 'Find your spark.', number: '01', copy: 'One clear next move. A little comet energy.' },
  { kind: 'mochi', name: 'Mochi', title: 'Room to grow.', number: '02', copy: 'Small steps. Soft landings. Your pace.' },
  { kind: 'ziggy', name: 'Ziggy', title: 'Make it happen.', number: '03', copy: 'Quick starts and a spark for every streak.' },
  { kind: 'nova', name: 'Nova', title: 'Stay curious.', number: '04', copy: 'A fresh perspective on what comes next.' },
];
const modes = [
  { id: 'focus', label: 'Find my focus', kind: 'snip', eyebrow: 'WORK / A LITTLE LESS SCATTERED', title: 'One thing at a time.', tasks: ['Write one good paragraph', 'Give the inbox a time limit', 'Make room for a break'] },
  { id: 'wellness', label: 'Feel a little better', kind: 'siren', eyebrow: 'WELLNESS / A MOMENT FOR YOU', title: 'Small steps count, too.', tasks: ['Take a five-minute stretch', 'Refill the water bottle', 'Step outside for a moment'] },
  { id: 'life', label: 'Make room for life', kind: 'sunny', eyebrow: 'LIFE / MORE OF THE GOOD STUFF', title: 'Leave a little room for joy.', tasks: ['Save an idea for the weekend', 'Send a little hello', 'Make time for a favourite thing'] },
];

function TinyDay() {
  const [modeId, setModeId] = useState('focus');
  const [completed, setCompleted] = useState([]);
  const [announcement, setAnnouncement] = useState('Pick one thing. The rest can wait.');
  const mode = modes.find(item => item.id === modeId);
  const checked = mode.tasks.filter((_, index) => completed.includes(`${mode.id}-${index}`)).length;
  const changeMode = id => {
    setModeId(id);
    setAnnouncement(`${modes.find(item => item.id === id).label}. Your fictional day is ready.`);
  };
  const toggle = index => {
    const key = `${mode.id}-${index}`;
    const wasChecked = completed.includes(key);
    setCompleted(current => wasChecked ? current.filter(item => item !== key) : [...current, key]);
    if (!wasChecked) emitCelebration();
    setAnnouncement(wasChecked ? 'A little room to try again.' : 'One tiny win. Nice work!');
  };
  const reset = () => {
    setCompleted(current => current.filter(item => !item.startsWith(`${mode.id}-`)));
    setAnnouncement('A fresh start. Pick one thing.');
  };

  return <section className="playful-playground" id="playground" aria-labelledby="playground-title">
    <div className="playful-section-heading">
      <p className="playful-kicker">A LITTLE TEST DRIVE</p>
      <h2 id="playground-title">Big plans?<br /><span>Start tiny.</span></h2>
      <p>A fictional day. A real feel for the UI.<br />Choose a corner of life and check off a little win.</p>
    </div>
    <div className="playful-playground__body">
      <div className="playful-mode-picker" role="group" aria-label="Choose a fictional day">
        {modes.map(item => <button key={item.id} type="button" aria-pressed={modeId === item.id} onClick={() => changeMode(item.id)} aria-controls="tiny-day-preview">
          <span className={`playful-mode-picker__dot playful-mode-picker__dot--${item.kind}`} aria-hidden="true" />{item.label}<ArrowRight size={17} aria-hidden="true" />
        </button>)}
        <p><Scissors size={18} aria-hidden="true" /> A little snip of the noise.<br />A little more space for you.</p>
      </div>
      <div className={`playful-day playful-day--${mode.kind}`} id="tiny-day-preview" role="region" aria-label="Fictional day preview">
        <div className="playful-day__top"><span><span aria-hidden="true">✳</span> YOUR TINY DEMO</span><span>Fictional examples</span></div>
        <div className="playful-day__intro">
          <div><p className="playful-kicker">{mode.eyebrow}</p><h3>{mode.title}</h3><p>Just a suggestion. You’re in charge.</p></div>
          <CharacterScene kind={mode.kind} happy={checked > 0} />
        </div>
        <ul className="playful-day__tasks">
          {mode.tasks.map((task, index) => <li key={`${mode.id}-${index}`}>
            <label className="playful-check" data-checked={completed.includes(`${mode.id}-${index}`)}>
              <input type="checkbox" checked={completed.includes(`${mode.id}-${index}`)} onChange={() => toggle(index)} />
              <span className="playful-check__box" aria-hidden="true"><Check size={17} /></span>
              <span>{task}</span>
            </label>
          </li>)}
        </ul>
        <div className="playful-day__bottom"><span>{checked} of 3 little wins</span><button type="button" onClick={reset} disabled={!checked}><RotateCcw size={14} aria-hidden="true" />Reset this day</button></div>
        <p className="playful-day__announcement" role="status">{announcement}</p>
      </div>
    </div>
    <p className="playful-playground__note">This playground stays on this page. It doesn’t create an account or save to your workspace.</p>
  </section>;
}

export default function LandingPage() {
  const ref = useRef(null);
  const { canAnimate, reduced } = usePlayfulMotion();
  const { enabled } = useKinetic();
  useLandingMotion(ref);
  const cast = enabled ? glowCrew : crew;

  return <main ref={ref} className="gt-public playful-landing" data-playful-motion={String(canAnimate)} data-reduced-motion={String(reduced)}>
    <a className="gt-public__skip" href="#public-content" tabIndex={0}>Skip to main content</a>
    <div className="playful-wrap">
      <header className="playful-header">
        <div className="playful-header__identity"><Link className="playful-brand" to="/welcome" aria-label="GrowthTrack home"><AnimatedLogo />growthtrack<span className="playful-brand__dot" aria-hidden="true">.</span></Link><span className="playful-fictional-label">A fictional little world</span></div>
        <nav aria-label="Public navigation"><a href="#crew">Meet the crew</a><a href="#playground">The little demo</a><Link className="playful-signin" to="/login">Owner sign in<ArrowRight size={16} aria-hidden="true" /></Link></nav>
      </header>

      <section className="playful-hero" id="public-content" tabIndex={-1} aria-labelledby="public-hero-title">
        <div className="playful-hero__copy playful-enter" data-hero-enter>
          <p className="playful-kicker"><span className="playful-kicker__spark" aria-hidden="true">✳</span> A FAMILIAR FACE. A FRESH LITTLE WORLD.</p>
          <h1 id="public-hero-title">Less noise.<br />More <span className="playful-hero__you">you.<svg viewBox="0 0 220 22" fill="none" aria-hidden="true"><path d="M5 13C64 1 132 1 213 10M18 20c68-9 114-8 175-3" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span></h1>
          <p className="playful-hero__lead">Find your focus. Build a little momentum. Meet a familiar face making room for work, wellness and the wonderfully human bits in between.</p>
          <div className="playful-hero__actions"><a className="playful-button" href="#playground">Try the tiny demo <ArrowRight size={19} aria-hidden="true" /></a><a className="playful-text-link" href="#crew">Meet your little crew <ArrowDown size={17} aria-hidden="true" /></a></div>
          <div className="playful-hero__note"><span className="playful-mini-faces" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i><i>•ᴗ•</i></span><p>Small wins welcome.<br /><strong>Perfect days not required.</strong></p></div>
        </div>
        <div className="playful-hero__art" data-hero-enter>
          <WelcomeCompanion />
          <div className="playful-hero__motion"><span>GOOD VIBES, AT YOUR PACE</span><MotionToggle /></div>
        </div>
      </section>
    </div>

    <div className="playful-ribbon" aria-label="A little focus. A little space. A little progress."><span>A little focus.</span><span aria-hidden="true">✳</span><span>A little space.</span><span aria-hidden="true">✳</span><span>A little progress.</span><span aria-hidden="true">✳</span><span>A lot more life.</span></div>

    <div className="playful-wrap">
      <section className="playful-crew" id="crew" aria-labelledby="crew-title">
        <div className="playful-section-heading playful-section-heading--row"><div><p className="playful-kicker">{enabled ? 'MEET THE GLOW CREW' : 'YOUR VERY HUMAN SUPPORT CREW'}</p><h2 id="crew-title">Life’s a lot.<br /><span>Bring a little backup.</span></h2></div><p>{enabled ? 'Four little sparks.' : 'Three little characters.'}<br />Progress can feel good.</p></div>
        <div className="playful-crew__grid">{cast.map(character => <article className={`playful-crew-card playful-crew-card--${character.kind}`} key={character.kind}>
          <div className="playful-crew-card__top"><span>{character.number} / {character.name}</span><span aria-hidden="true">↗</span></div>
          <CharacterScene kind={character.kind} />
          <h3>{character.title}</h3><p>{character.copy}</p>
        </article>)}</div>
      </section>

      <section className="welcome-space" aria-labelledby="welcome-space-title"><div className="playful-section-heading"><p className="playful-kicker">A LITTLE LESS NOISE</p><h2 id="welcome-space-title">Keep the good.<br /><span>Snip the rest.</span></h2><p>Siren and Snip are here, too. Try their little reset, then take a fictional day for a spin.</p></div><SirenSnipScene /></section>

      <TinyDay />

      <section className="playful-how" aria-labelledby="playful-how-title"><h2 id="playful-how-title">A rhythm.<br /><span>Not a race.</span></h2><ol><li><span>01</span><div><h3>Find your next little thing.</h3><p>A task, a stretch, an idea. Start where you are.</p></div></li><li><span>02</span><div><h3>Snip away the extra.</h3><p>Give one thing your attention. Let the rest wait.</p></div></li><li><span>03</span><div><h3>Keep the good feeling going.</h3><p>Acknowledge the small win. Come back in your own time.</p></div></li></ol></section>

      <section className="playful-closer" aria-labelledby="public-closer-title"><span className="playful-closer__spark" aria-hidden="true">✳</span><p className="playful-kicker">YOUR DAY. YOUR KIND OF PROGRESS.</p><h2 id="public-closer-title">Make a little room<br />for <span>what matters.</span></h2><Link className="playful-button" to="/login">Sign in to your space <ArrowRight size={19} aria-hidden="true" /></Link><p className="playful-closer__access"><LockKeyhole size={14} aria-hidden="true" /> For the configured owner. No public sign-ups.</p></section>

      <footer className="playful-footer"><Link className="playful-brand" to="/welcome" aria-label="GrowthTrack home"><AnimatedLogo />growthtrack.</Link><p>A little more character. A little more you.<br /><span>© {new Date().getFullYear()} GrowthTrack · Fictional character story</span></p><nav aria-label="Legal links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav></footer>
    </div>
  </main>;
}
