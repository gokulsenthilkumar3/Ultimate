import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './public-pages.css';

const sections = [
  {
    id: 'agreement',
    title: 'Using GrowthTrack',
    paragraphs: ['By using GrowthTrack, you agree to these terms. If you do not agree, do not use the service. The workspace is intended for a single configured owner, not public account registration.'],
  },
  {
    id: 'account',
    title: 'Owner access',
    paragraphs: ['The owner account is set up by the deployment operator. Keep its credentials private and secure. Do not share the password or attempt to access another installation without authorization.'],
  },
  {
    id: 'records',
    title: 'Your records and decisions',
    paragraphs: ['You are responsible for the accuracy of information you enter. Health and finance features are for personal organization; GrowthTrack is not a medical device and does not provide medical or financial advice. Consult a qualified professional for decisions that require it.'],
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    paragraphs: ['GrowthTrack is evolving. Features and integrations may change or require setup, and uninterrupted availability is not guaranteed. The deployment operator is responsible for maintaining backups and preparing for updates.'],
  },
  {
    id: 'conduct',
    title: 'Appropriate use',
    paragraphs: ['Do not misuse the service, seek unauthorized access, or upload information you do not have the right to store. Take care when adding sensitive information and check the security arrangements of your deployment.'],
  },
  {
    id: 'liability',
    title: 'Responsibility and contact',
    paragraphs: [
      'GrowthTrack is provided “as is.” To the extent permitted by applicable law, its operator is not liable for decisions made solely from information displayed by the application.',
      'For questions about these terms, contact the person who operates your GrowthTrack deployment.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="gt-public gt-public--legal">
      <a className="gt-public__skip" href="#public-content" tabIndex={0}>Skip to main content</a>
      <div className="gt-public__wrap">
        <header className="gt-public__header">
          <Link className="gt-public__brand" to="/welcome" aria-label="GrowthTrack home"><span className="gt-public__brand-mark" aria-hidden="true">G<span>.</span></span><span>GrowthTrack</span></Link>
          <Link className="gt-public__back" to="/welcome"><ArrowLeft size={16} aria-hidden="true" /> Back to the overview</Link>
        </header>

        <div className="gt-public-legal">
          <div className="gt-public-legal__intro" id="public-content" tabIndex={-1}>
            <p className="gt-public__eyebrow"><span className="gt-public__eyebrow-rule" /> The details / 02</p>
            <h1>Clear terms for <em>a personal space.</em></h1>
            <p className="gt-public-legal__lead">The ground rules for using an owner-operated GrowthTrack workspace.</p>
            <p className="gt-public-legal__date">Last updated: September 29, 2026</p>
          </div>

          <div className="gt-public-legal__layout">
            <nav className="gt-public-legal__contents" aria-label="On this page">
              <span>On this page</span>
              <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}>{String(index + 1).padStart(2, '0')} &nbsp; {section.title}</a></li>)}</ol>
            </nav>
            <article className="gt-public-legal__body" aria-label="Terms of service">
              {sections.map((section, index) => (
                <section id={section.id} className="gt-public-legal__section" key={section.id} aria-labelledby={`${section.id}-title`}>
                  <span className="gt-public-legal__number">{String(index + 1).padStart(2, '0')} / 06</span>
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </article>
          </div>

          <div className="gt-public-legal__next"><span>Continue reading</span><Link to="/privacy">Privacy policy <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </div>

        <footer className="gt-public__footer"><span>© {new Date().getFullYear()} GrowthTrack</span><nav aria-label="Legal links"><Link to="/privacy">Privacy</Link><Link aria-current="page" to="/terms">Terms</Link><Link to="/login">Owner sign in</Link></nav></footer>
      </div>
    </main>
  );
}
