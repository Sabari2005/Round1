import { useNavigate } from 'react-router-dom';
import { LampEmblem } from '../components/LampEmblem';

const eventRounds = [
  {
    title: 'Round 1: Digital Scavenger Hunt (OSINT)',
    accent: 'Clues in the open world',
    items: [
      'Questions displayed on screen',
      'Explore social media, Google searches, and forums to find clues',
      'Time limit: 45 minutes',
      'Exact answer verification required',
      'Open access to the internet allowed'
    ]
  },
  {
    title: 'Round 2: Chat with Genie (Prompt Injection)',
    accent: 'A guarded conversation',
    items: [
      'Interact with a chat Genie (LLM)',
      'Objective: extract the secret password from the Genie',
      'Genie has pre-defined constraints',
      'Disallowed prompt content rules apply, including no personal attacks',
      'Prizes for top 3 passwords found'
    ]
  }
];

const generalRules = [
  'Team size: 1-2 members',
  'All members must present student ID',
  "Judge's decision final and binding",
  'Prizes awarded as stated on the main poster'
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="page landing-page">
      <div className="magic-bg map-bg" aria-hidden="true" />
      <div className="map-dust map-dust-a" aria-hidden="true" />
      <div className="map-dust map-dust-b" aria-hidden="true" />

      <section className="hero-scroll">
        <div className="scroll-seal left" aria-hidden="true" />
        <div className="scroll-seal right" aria-hidden="true" />

        <header className="notice-header">
          <p className="notice-kicker">Manakula Vinayagar Institute of Technology</p>
          <p className="notice-dept">Department of Computer Science and Engineering</p>
          <div className="notice-emblem-row">
            <LampEmblem />
            <div>
              <h1 className="magic-title">Rules and Regulations</h1>
              <p className="event-mark">captcha&apos;26</p>
              <p className="mind-crash-mark">Mind Crash</p>
            </div>
          </div>
          <p className="magic-subtitle parchment-copy">
            An enchanted notice from the old chamber. Read every line with care before stepping into the trial.
          </p>
        </header>

        <section className="notice-actions">
          <button className="gold-btn" onClick={() => navigate('/dashboard/auth')}>
            Enter The Platform
          </button>
          <button className="ghost-btn" onClick={() => navigate('/admin/login')}>
            Admin Portal
          </button>
        </section>

        <section className="rules-grid">
          {eventRounds.map((round) => (
            <article key={round.title} className="parchment-panel">
              <div className="panel-pin" aria-hidden="true" />
              <p className="parchment-accent">{round.accent}</p>
              <h2>{round.title}</h2>
              <ol className="parchment-list">
                {round.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>
          ))}

          <article className="parchment-panel parchment-panel-wide">
            <div className="panel-pin" aria-hidden="true" />
            <p className="parchment-accent">Read before you enter</p>
            <h2>General Rules</h2>
            <ol className="parchment-list">
              {generalRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
        </section>

        <footer className="notice-footer">
          <span>Venue: CSE Lab</span>
          <span>March 14</span>
          <span>2:00 PM onwards</span>
        </footer>
      </section>
    </main>
  );
}
