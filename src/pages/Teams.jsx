import { Link } from 'react-router-dom';
import { useData, usePref } from '../lib/data.js';
import { SeasonSelect, TeamChip } from '../components/ui.jsx';

export default function Teams({ index }) {
  const [season, setSeason] = usePref('season', index.seasons.at(-1));
  const { data } = useData(`${season}/standings.json`);
  return (
    <>
      <div className="row between"><h1>球隊</h1><SeasonSelect seasons={index.seasons} value={season} onChange={setSeason} /></div>
      <div className="games-grid">{(data?.full || []).map((r) => (
        <Link key={r.id} className="panel game-card" to={`/team/${r.id}?season=${season}`}>
          <div className="row"><TeamChip id={r.id} names={index.teams} size={48} /><div className="grow"><div style={{ fontWeight: 800, fontSize: '1.2em' }}>{index.teams[r.id]}</div>
            <div className="muted small">{r.W} 勝 {r.L} 敗 {r.T} 和 · 勝率 {r.pct?.toFixed(3)} · 得失分 {r.RS}-{r.RA}</div></div></div>
        </Link>))}</div>
    </>
  );
}
