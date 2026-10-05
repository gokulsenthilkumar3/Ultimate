import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import './public-pages.css';

const areas = [
  { number: '01', name: 'Wellness', detail: 'Habits, training, nutrition' },
  { number: '02', name: 'Work', detail: 'Tasks, notes, calendar' },
  { number: '03', name: 'Money', detail: 'Transactions, budgets, plans' },
  { number: '04', name: 'Life', detail: 'The details around it all' },
];

const chapters = [
  {
    number: '01 / Organize',
    title: 'A place for the practical.',
    copy: 'Keep tasks, notes, calendar entries, and financial records within reach.',
  },
  {
    number: '02 / Reflect',
    title: 'Space to see progress.',
    copy: 'Record habits, training, nutrition, and other details that matter to you.',
  },
  {
    number: '03 / Return',
    title: 'One familiar workspace.',
    copy: 'Move between the parts of your life without losing your place.',
  },
];

export default function LandingPage() {
  return (
    <main className="gt-public gt-public--landing">
      <a className="gt-public__skip" href="#public-content" tabIndex={0}>Skip to main content</a>
      <div className="gt-public__wrap">
        <header className="gt-public__header">
          <Link className="gt-public__brand" to="/welcome" aria-label="GrowthTrack home">
            <span className="gt-public__brand-mark" aria-hidden="true">G<span>.</span></span>
            <span>GrowthTrack</span>
          </Link>
          <nav className="gt-public__nav" aria-label="Public navigation">
            <a href="#inside">Inside the workspace</a>
            <Link className="gt-public__nav-signin" to="/login">Owner sign in <ArrowRight size={16} aria-hidden="true" /></Link>
          </nav>
        </header>

        <section className="gt-public-hero" id="public-content" tabIndex={-1} aria-labelledby="public-hero-title">
          <div className="gt-public-hero__copy">
            <p className="gt-public__eyebrow"><span className="gt-public__eyebrow-rule" /> A private workspace for one</p>
            <h1 id="public-hero-title">Make room for <em>what matters.</em></h1>
            <p className="gt-public-hero__lead">GrowthTrack brings the everyday details of wellness, work, money, and life into one considered space.</p>
            <div className="gt-public-hero__actions">
              <Link className="gt-public__button gt-public__button--solid" to="/login">Owner sign in <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className="gt-public__text-link" href="#inside">See what’s inside <span aria-hidden="true">↗</span></a>
            </div>
            <p className="gt-public-hero__access"><LockKeyhole size={15} aria-hidden="true" /> Access is reserved for the configured owner.</p>
          </div>

          <aside className="gt-public-portfolio" aria-label="Workspace areas">
            <div className="gt-public-portfolio__topline"><span>GrowthTrack / Index</span><span>Personal edition</span></div>
            <div className="gt-public-portfolio__intro">
              <span className="gt-public-portfolio__ornament" aria-hidden="true">✳</span>
              <p>One place for<br /><em>the many parts</em><br />of a day.</p>
            </div>
            <ol className="gt-public-portfolio__list">
              {areas.map(area => (
                <li key={area.number}>
                  <span className="gt-public-portfolio__number">{area.number}</span>
                  <span className="gt-public-portfolio__name">{area.name}</span>
                  <span className="gt-public-portfolio__detail">{area.detail}</span>
                </li>
              ))}
            </ol>
            <div className="gt-public-portfolio__foot">Four parts, one place.</div>
          </aside>
        </section>

        <section className="gt-public-chapters" id="inside" aria-labelledby="public-chapters-title">
          <div className="gt-public-chapters__intro">
            <p className="gt-public__eyebrow">A more thoughtful overview</p>
            <h2 id="public-chapters-title">Your life has chapters.<br /><em>Keep them together.</em></h2>
            <p>Use the parts you need, when you need them. GrowthTrack is an owner-operated workspace, with no public account creation.</p>
          </div>
          <div className="gt-public-chapters__grid">
            {chapters.map(chapter => (
              <article className="gt-public-chapter" key={chapter.number}>
                <span className="gt-public-chapter__number">{chapter.number}</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="gt-public-closer" aria-labelledby="public-closer-title">
          <div>
            <p className="gt-public__eyebrow">When you’re ready</p>
            <h2 id="public-closer-title">Pick up where you left off.</h2>
          </div>
          <Link className="gt-public__button gt-public__button--light" to="/login">Sign in to your space <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>

        <footer className="gt-public__footer">
          <span>© {new Date().getFullYear()} GrowthTrack</span>
          <nav aria-label="Legal links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
        </footer>
      </div>
    </main>
  );
}
