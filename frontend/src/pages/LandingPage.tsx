import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type DustParticle = {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  size: number;
  dx: number;
  dy: number;
};

export function LandingPage() {
  const navigate = useNavigate();
  const [cursorDust, setCursorDust] = useState({ x: 0, y: 0, visible: false });
  const [particles, setParticles] = useState<DustParticle[]>([]);

  useEffect(() => {
    function handleWindowMove(event: MouseEvent) {
      const x = event.clientX;
      const y = event.clientY;
      const now = Date.now();

      setCursorDust({ x, y, visible: true });

      setParticles((prev) => {
        const fresh = prev.filter((particle) => now - particle.createdAt < 700);
        const particle: DustParticle = {
          id: now + Math.floor(Math.random() * 100000),
          x,
          y,
          createdAt: now,
          size: 1.8 + Math.random() * 2.2,
          dx: (Math.random() - 0.5) * 24,
          dy: (Math.random() - 0.5) * 24
        };

        return [...fresh, particle].slice(-48);
      });
    }

    function handleWindowLeave() {
      setCursorDust((prev) => ({ ...prev, visible: false }));
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((particle) => now - particle.createdAt < 700));
    }, 90);

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseout', handleWindowLeave);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseout', handleWindowLeave);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="page landing-page map-landing-page">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="cursor-particle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            ['--dx' as string]: `${particle.dx}px`,
            ['--dy' as string]: `${particle.dy}px`
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className={`cursor-dust${cursorDust.visible ? ' active' : ''}`}
        style={{ left: cursorDust.x, top: cursorDust.y }}
        aria-hidden="true"
      />

      <section className="landing-top-copy">
        <p className="notice-kicker">The Marauder Scroll of Mind Crash</p>
        <p className="notice-dept">Department of Computer Science &amp; Engineering</p>
        <h1 className="magic-title">Mind Crash</h1>
      </section>

      <section className="map-poster-shell">
        <img className="map-poster-image" src="/mind-crash-map.png" alt="Mind Crash event poster" />
        <div className="map-poster-actions">
          <button className="gold-btn" onClick={() => navigate('/dashboard/auth')}>
            Enter The Platform
          </button>
        </div>
      </section>

      <p className="map-undertext">Two enchanted trials await. Decode, discover, and outwit the Genie.</p>

      <section className="landing-notice-content">
        <div className="rules-grid">
          <article className="rule-scroll-card">
            <img className="rule-scroll-image" src="/round1-rules.png" alt="Round 1 rules and regulations" />
          </article>
          <article className="rule-scroll-card">
            <img className="rule-scroll-image" src="/round2-rules.png" alt="Round 2 rules and regulations" />
          </article>

          <article className="rule-scroll-card rule-scroll-card-wide">
            <img className="rule-scroll-image" src="/guidelines.png" alt="Participation guidelines and general rules" />
          </article>
        </div>

        <footer className="notice-footer">
          <span>Venue: CSE Lab</span>
          <span>March 14</span>
          <span>2:00 PM onwards</span>
        </footer>
      </section>
    </main>
  );
}
