import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './public-pages.css';

const sections = [
  {
    id: 'information',
    title: 'Information in your workspace',
    paragraphs: [
      'GrowthTrack processes the owner account’s email address and name, together with information entered into the workspace. That can include health and activity records, finance entries, tasks, notes, files, and other personal details.',
      'Location samples are saved only when the owner requests a capture or enables capture while the Places page is open. GrowthTrack does not provide a feature to sell owner data.',
    ],
  },
  {
    id: 'use',
    title: 'How information is used',
    paragraphs: [
      'Owner data is used to display and manage the workspace. Records are stored in the database configured for the deployment. Some preferences and unfinished drafts may also be kept on the owner’s device.',
      'Optional product analytics and error monitoring are initialized only after consent is granted through the privacy choice banner. They stay off when that choice is declined.',
    ],
  },
  {
    id: 'security',
    title: 'Security and deployment',
    paragraphs: [
      'Sign-in sessions use HttpOnly, SameSite=Strict cookies. Protected writes require a CSRF token. The production session cookie is marked Secure.',
      'HTTPS, database storage, backups, and their encryption depend on how the service is deployed. The deployment operator is responsible for configuring and maintaining those safeguards; this page does not imply that every installation has encrypted storage.',
    ],
  },
  {
    id: 'services',
    title: 'Other services',
    paragraphs: [
      'Optional features can contact external providers when used or configured, including map tiles, weather or media services, and analytics or error monitoring services. A map tile request can reveal your network address and the viewed map area to the map provider.',
      'A hosted installation may also use an external database or hosting provider. The services involved depend on the operator’s configuration.',
    ],
  },
  {
    id: 'choices',
    title: 'Your choices and requests',
    paragraphs: [
      'The owner can decline optional analytics in the privacy choice banner. Requests to access, correct, export, or delete data should be made to the person operating the deployment. There is no self-service account deletion flow in the application today.',
      'Retention and backup schedules are set by the operator. Deleted records may remain in backups until those backups expire.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: ['For privacy questions or data requests, contact the person who operates your GrowthTrack deployment.'],
  },
];

export default function PrivacyPage() {
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
            <p className="gt-public__eyebrow"><span className="gt-public__eyebrow-rule" /> The details / 01</p>
            <h1>Privacy, <em>plainly put.</em></h1>
            <p className="gt-public-legal__lead">How GrowthTrack handles the information in an owner-operated workspace. The exact services and safeguards vary by deployment.</p>
            <p className="gt-public-legal__date">Last updated: September 29, 2026</p>
          </div>

          <div className="gt-public-legal__layout">
            <nav className="gt-public-legal__contents" aria-label="On this page">
              <span>On this page</span>
              <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}>{String(index + 1).padStart(2, '0')} &nbsp; {section.title}</a></li>)}</ol>
            </nav>
            <article className="gt-public-legal__body" aria-label="Privacy policy">
              {sections.map((section, index) => (
                <section id={section.id} className="gt-public-legal__section" key={section.id} aria-labelledby={`${section.id}-title`}>
                  <span className="gt-public-legal__number">{String(index + 1).padStart(2, '0')} / 06</span>
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </article>
          </div>

          <div className="gt-public-legal__next"><span>Continue reading</span><Link to="/terms">Terms of service <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </div>

        <footer className="gt-public__footer"><span>© {new Date().getFullYear()} GrowthTrack</span><nav aria-label="Legal links"><Link aria-current="page" to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Owner sign in</Link></nav></footer>
      </div>
    </main>
  );
}
