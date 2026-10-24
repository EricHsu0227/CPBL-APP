import { Link, useNavigate } from 'react-router-dom';
import { useData, useSeason } from '../lib/data.js';
import { PlayerSearch, PlayerLink, TeamChip } from '../components/ui.jsx';
import { StandingsTable } from '../components/standings.jsx';
import { GameCard } from '../components/games.jsx';
import { qualifies, statDef } from '../lib/catalog.js';
import { sortRows } from '../lib/stats.js';
import { date } from '../lib/format.js';
import { teamGames } from './Leaderboard.jsx';

function Leaders({ rows, role, k, season, names, tg, qual = true }) {
  const d = statDef(k, role);
  const pool = (rows || []).filter((p) => !qual || qualifies(p, role, tg));
  const top = sortRows(pool, 'all', k, d.lowGood ? 1 : -1).slice(0, 5);
  return (
    <div className="panel card"><h3>{d.label}</h3>
      {top.map((p, i) => <div key={p.id} className="row" style={{ padding: '3px 0' }}><span className="muted" style={{ width: 16 }}>{i + 1}</span><TeamChip id={p.team} names={names} size={20} />
        <span className="grow"><PlayerLink role={role} id={p.id} season={season}>{p.name}</PlayerLink></span><b className="mono">{d.f(p.splits.all[k])}</b></div>)}
    </div>
  );
}

export default function Home({ index }) {
  const nav = useNavigate();
  const season = index.seasons.at(-1);
  const { data: games } = useData(`${season}/games.json`);
  const { data: st } = useData(`${season}/standings.json`);
  const { data: bat } = useSeason(season, 'bat');
  const { data: pit } = useSeason(season, 'pit');
  const tg = teamGames(st);
  const last = games?.at(-1) && date(games.at(-1).date);
  const lastDay = (games || []).filter((g) => date(g.date) === last);
  const names = index.teams;
  return (
    <>
      <section className="hero">
        <h1>中華職棒，每一球的數據。</h1>
        <p className="muted">{index.seasons[0]}–{index.seasons.at(-1)} 球季賽程、比分、戰績、排行榜與球員進階數據，資料來自野球革命。</p>
        <PlayerSearch className="hero-search" names={names} placeholder="搜尋球員，例如「林安可」" onPick={(p) => nav(`/player/${p.id}?role=${p.r[0]}`)} />
        <div className="row center" style={{ marginTop: 14 }}><Link className="btn primary" to="/leaderboard">排行榜</Link><Link className="btn" to="/games">賽程比分</Link></div>
      </section>
      {lastDay.length > 0 && <section><div className="row between"><h2>最新比賽 · {last}</h2><Link to={`/games?date=${last}`}>更多 ›</Link></div>
        <div className="games-grid">{lastDay.map((g) => <GameCard key={g.id} g={g} season={season} names={names} />)}</div></section>}
      <div className="grid" style={{ marginTop: 'var(--gap)' }}>
        {st && <section className="panel card"><h3>{season} 全年戰績</h3><StandingsTable rows={st.full} names={names} season={season} compact /></section>}
        <section><div className="grid" style={{ '--cols': 2 }}>
          {['AVG', 'HR', 'OPS', 'wRC+'].map((k) => <Leaders key={k} rows={bat?.players} role="bat" k={k} season={season} names={names} tg={tg} qual={k !== 'HR'} />)}
        </div></section>
      </div>
      <div className="grid" style={{ '--cols': 4 }}>
        {['ERA', 'SO', 'WHIP', 'FIP'].map((k) => <Leaders key={k} rows={pit?.players} role="pit" k={k} season={season} names={names} tg={tg} qual={k !== 'SO'} />)}
      </div>
    </>
  );
}
