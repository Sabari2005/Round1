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

  useEffect(() => {
    void api.getPublicLeaderboard().then((data) => setLeaderboard(data.leaderboard));

    socket.connect();
    socket.emit('leaderboard:join');
    socket.on('leaderboard:update', (rows: LeaderboardRow[]) => {
      setLeaderboard(rows);
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
        </div>
        <Link className="ghost-btn" to="/">
          Back Home
        </Link>
      </header>

      <section className="glow-card leaderboard-card leaderboard-page-card">
        <div className="leaderboard-title-row">
          <span className="label">Current Standings</span>
          <span className="lamp-icon">Lamp</span>
        </div>
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
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>{row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaderboard.length === 0 && <p className="status-text">No scores have been recorded yet.</p>}
      </section>
    </main>
  );
}
