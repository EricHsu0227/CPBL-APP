import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData, usePref } from '../lib/data.js';
import { Seg, SeasonSelect, TeamChip } from '../components/ui.jsx';
import { GameCard } from '../components/games.jsx';
import { date, wd } from '../lib/format.js';

export default function Games({ index }) {
  const [season, setSeason] = usePref('season', index.seasons.at(-1));
  const [q, setQ] = useSearchParams();
  const [teamF, setTeamF] = usePref('games:team', 'all');
  const { data: games } = useData(`${season}/games.json`);
  const list = useMemo(() => (games || []).filter((g) => teamF === 'all' || g.away.id === teamF || g.home.id === teamF), [games, teamF]);
  const dates = useMemo(() => [...new Set(list.map((g) => date(g.date)))], [list]);
  const want = q.get('date');
  const d = want && dates.includes(want) ? want : dates.find((x) => x >= (want || '9999')) || dates.at(-1);
  const i = dates.indexOf(d);
  const go = (x) => setQ(x ? { date: x } : {});
  const day = list.filter((g) => date(g.date) === d);
  return (
    <>
      <div className="row between"><h1>賽程比分</h1>
        <div className="row"><SeasonSelect seasons={index.seasons} value={season} onChange={(y) => { setSeason(y); go(null); }} /></div></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <Seg small value={teamF} onChange={setTeamF} options={[['all', '全部球隊'], ...Object.keys(index.teams).map((id) => [id, <TeamChip key={id} id={id} names={index.teams} size={18} />])]} />
      </div>
      {games && !dates.length && <div className="panel muted">沒有比賽。</div>}
      {d && (
        <>
          <div className="datebar">
            <button className="btn" disabled={i <= 0} onClick={() => go(dates[i - 1])}>‹ 前一天</button>
            <span className="d">{d}（{wd(d)}）</span>
            <button className="btn" disabled={i >= dates.length - 1} onClick={() => go(dates[i + 1])}>後一天 ›</button>
            <input type="date" value={d} min={dates[0]} max={dates.at(-1)} onChange={(e) => go(e.target.value)} />
            <span className="muted small">{list.length} 場 · {dates[0]} – {dates.at(-1)}</span>
          </div>
          <div className="games-grid">{day.map((g) => <GameCard key={g.id} g={g} season={season} names={index.teams} />)}</div>
        </>)}
    </>
  );
}
