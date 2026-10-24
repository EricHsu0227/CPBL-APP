import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useData, useSeason } from '../lib/data.js';
import { GROUPS, statDef } from '../lib/catalog.js';
import { sortRows } from '../lib/stats.js';
import { RoleSeg, Seg, SeasonSelect, StatTable, TeamChip, PlayerLink } from '../components/ui.jsx';
import { GameCard } from '../components/games.jsx';
import { team } from '../lib/teams.js';

export default function Team({ index }) {
  const { id } = useParams();
  const [q, setQ] = useSearchParams();
  const season = Number(q.get('season')) || index.seasons.at(-1);
  const [role, setRole] = useState('bat');
  const [group, setGroup] = useState('std');
  const [sort, setSort] = useState(null);
  const { data: st } = useData(`${season}/standings.json`);
  const { data: games } = useData(`${season}/games.json`);
  const { data: rows } = useSeason(season, role);
  const t = team(id, index.teams);
  const rec = st?.full.find((r) => r.id === id);
  const rank = st ? st.full.findIndex((r) => r.id === id) + 1 : null;
  const keys = GROUPS[role][group][1];
  const s = sort && keys.includes(sort.key) ? sort : { key: role === 'bat' ? 'PA' : 'IP', dir: -1 };
  const roster = useMemo(() => sortRows((rows?.players || []).filter((p) => p.team === id), 'all', s.key, s.dir), [rows, id, s.key, s.dir]);
  const mine = (games || []).filter((g) => g.away.id === id || g.home.id === id);
  return (
    <>
      <section className="panel hero-card" style={{ borderTop: `4px solid ${t.color}` }}>
        <TeamChip id={id} names={index.teams} size={72} />
        <div className="grow"><h1>{t.name}</h1><div className="muted">{season} 球季{rank ? ` · 全年第 ${rank} 名` : ''}</div></div>
        {rec && <div className="hero-tiles">{[['戰績', `${rec.W}-${rec.L}-${rec.T}`], ['勝率', rec.pct?.toFixed(3)], ['勝差', rec.GB ? rec.GB.toFixed(1) : '—'], ['得分', rec.RS], ['失分', rec.RA], ['近十場', rec.L10]].map(([k, v]) => <div key={k} className="tile"><div className="k">{k}</div><div className="v">{v}</div></div>)}</div>}
        <SeasonSelect seasons={index.seasons} value={season} onChange={(y) => setQ({ season: y })} />
      </section>
      <section className="panel">
        <div className="row" style={{ marginBottom: 10 }}><RoleSeg value={role} onChange={(r) => { setRole(r); setSort(null); }} /><Seg value={group} onChange={setGroup} options={Object.entries(GROUPS[role]).map(([k, [l]]) => [k, l])} /></div>
        <StatTable keys={keys} def={(k) => statDef(k, role)} sort={s} setSort={setSort}
          rows={roster.map((p) => ({ key: p.id, cells: p.splits.all, lead: <span className="player-cell"><span className="muted small">#{p.num}</span><PlayerLink role={role} id={p.id} season={season}>{p.name}</PlayerLink></span> }))} />
      </section>
      <h2>賽程與結果（{mine.length} 場）</h2>
      <div className="games-grid">{[...mine].reverse().slice(0, 30).map((g) => <GameCard key={g.id} g={g} season={season} names={index.teams} />)}</div>
      {mine.length > 30 && <p className="note">只顯示最近 30 場，完整賽程請到「賽程比分」。</p>}
    </>
  );
}
