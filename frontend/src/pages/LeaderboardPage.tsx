import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

type LeaderboardRow = {
  id: string;
  name: string;
  totalScore: number;
};

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());

  const topThree = leaderboard.slice(0, 3);
  const averageScore = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((sum, row) => sum + row.totalScore, 0) / leaderboard.length)
    : 0;

  useEffect(() => {
    void api.getPublicLeaderboard().then((data) => {
      setLeaderboard(data.leaderboard);
      setLastUpdatedAt(new Date());
    });

    socket.connect();
    socket.emit('leaderboard:join');
    socket.on('leaderboard:update', (rows: LeaderboardRow[]) => {
      setLeaderboard(rows);
      setLastUpdatedAt(new Date());
    });

    return () => {
      socket.off('leaderboard:update');
      socket.emit('leaderboard:leave');
      socket.disconnect();
    };
  }, []);

  return (
    <main className="page leaderboard-page-only">
      <header className="top-header glow-card">
        <div>
          <span className="label">Live Rankings</span>
          <h2>Leaderboard</h2>
          <span className="label">Updated {lastUpdatedAt.toLocaleTimeString()}</span>
        </div>
        <Link className="ghost-btn" to="/">
          Back Home
        </Link>
      </header>

      <section className="leaderboard-hero-grid">
        <article className="glow-card leaderboard-stat-card">
          <span className="label">Teams</span>
          <strong>{leaderboard.length}</strong>
          <p>Total teams in current standings.</p>
        </article>
        <article className="glow-card leaderboard-stat-card">
          <span className="label">Top Score</span>
          <strong>{leaderboard[0]?.totalScore ?? 0}</strong>
          <p>Highest score achieved right now.</p>
        </article>
        <article className="glow-card leaderboard-stat-card">
          <span className="label">Average Score</span>
          <strong>{averageScore}</strong>
          <p>Average score across all teams.</p>
        </article>
      </section>

      {topThree.length > 0 && (
        <section className="podium-grid">
          {topThree.map((team, index) => (
            <article key={team.id} className={`glow-card podium-card podium-rank-${index + 1}`}>
              <span className="label">Rank #{index + 1}</span>
              <h3>{team.name}</h3>
              <p>{team.totalScore} pts</p>
            </article>
          ))}
        </section>
      )}

      <section className="glow-card leaderboard-card leaderboard-page-card">
        <div className="leaderboard-title-row">
          <span className="label">Current Standings</span>
          <span className="lamp-icon">Teams: {leaderboard.length}</span>
        </div>
        <div className="leaderboard-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={row.id} className={index < 3 ? 'leaderboard-top-row' : ''}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leaderboard.length === 0 && <p className="status-text">No scores have been recorded yet.</p>}
      </section>
    </main>
  );
}
