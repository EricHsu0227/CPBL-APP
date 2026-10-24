import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useData, useSeason } from '../lib/data.js';
import { GROUPS, SPLITS, SPLIT_GROUPS, availKeys, qualifies, splitLabel, statDef } from '../lib/catalog.js';
import { percentile } from '../lib/stats.js';
import { Seg, StatTable, TeamChip, TeamLink } from '../components/ui.jsx';
import { team } from '../lib/teams.js';
import { PITCH, PITCH_COLOR } from '../lib/format.js';
import { teamGames } from './Leaderboard.jsx';

const TILES = { bat: ['AVG', 'OBP', 'SLG', 'OPS', 'HR', 'wRC+', 'OPS+'], pit: ['ERA', 'IP', 'SO', 'WHIP', 'FIP', 'K%'] };
const PCTS = { bat: ['wOBA', 'wRC+', 'OPS+', 'AVG', 'OBP', 'SLG', 'ISO', 'K%', 'BB%', 'Whiff%', 'O-Swing%', 'Hard%', 'WPA'], pit: ['ERA', 'ERA+', 'FIP', 'WHIP', 'K%', 'BB%', 'K-BB%', 'K/9', 'Whiff%', 'CSW%', 'GB%', 'wOBA'] };

function pctColor(p) { // blue (low) -> grey -> red (high), Savant style
  const a = [59, 130, 246], m = [203, 213, 225], b = [239, 68, 68];
  const t = p / 100, [x, y, u] = t < 0.5 ? [a, m, t * 2] : [m, b, (t - 0.5) * 2];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * u)).join(',')})`;
}

function Percentiles({ row, role, season, tg }) {
  const { data } = useSeason(season, role);
  const pool = useMemo(() => (data?.players || []).filter((p) => qualifies(p, role, tg)), [data, role, tg]);
  if (!data) return null;
  return (
    <div className="panel card"><h3>聯盟百分位（規定{role === 'bat' ? '打席' : '局數'} {pool.length} 人）</h3>
      {PCTS[role].filter((k) => row.splits.all[k] != null).slice(0, 10).map((k) => { const d = statDef(k, role); const v = row.splits.all[k]; const p = percentile(pool.map((r) => r.splits.all[k]), v, d.lowGood); return (
        <div key={k} className="pct"><span title={d.desc}>{d.label}</span>
          <div className="bar">{p != null && <><i style={{ width: `${p}%`, background: pctColor(p) }} /><b style={{ left: `${p}%`, background: pctColor(p) }}>{p}</b></>}</div>
          <span className="val mono">{d.f(v)}</span></div>); })}
      <p className="note">紅色 = 優於聯盟、藍色 = 劣於聯盟（防禦率等越低越好的數據已反轉）。</p>
    </div>
  );
}

function Arsenal({ ars }) {
  const list = Object.entries(ars).filter(([, a]) => a.n >= 5);
  return (
    <div className="panel card"><h3>球種配球</h3>
      <div className="mixbar">{list.map(([t, a]) => <i key={t} title={`${PITCH[t] || t} ${(a.pct * 100).toFixed(1)}%`} style={{ width: `${a.pct * 100}%`, background: PITCH_COLOR[t] || '#888' }} />)}</div>
      <div className="scroll" style={{ marginTop: 10 }}><table className="t sm"><thead><tr><th className="l">球種</th><th>球數</th><th>比例</th><th>均速</th><th>最快</th><th>揮空%</th><th>CSW%</th><th>好球帶%</th></tr></thead>
        <tbody>{list.map(([t, a]) => <tr key={t}><td className="l"><span className="legend-row"><i style={{ background: PITCH_COLOR[t] || '#888' }} />{PITCH[t] || t}</span></td><td className="mono">{a.n}</td>
          <td className="mono">{(a.pct * 100).toFixed(1)}%</td><td className="mono">{a.velo ? a.velo.toFixed(1) : '—'}</td><td className="mono">{a.max ?? '—'}</td>
          {['whiff', 'csw', 'zone'].map((k) => <td key={k} className="mono">{a[k] == null ? '—' : (a[k] * 100).toFixed(1) + '%'}</td>)}</tr>)}</tbody></table></div>
      <p className="note">球速單位 km/h。</p>
    </div>
  );
}

function GameLog({ log, role, season, names }) {
  const cols = role === 'bat' ? ['PA', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'SB'] : ['IP', 'NP', 'BF', 'H', 'HR', 'BB', 'SO', 'R', 'ER'];
  return (
    <div className="panel card span"><h3>{season} 逐場紀錄（{log.length} 場）</h3>
      <div className="scroll tall"><table className="t sm"><thead><tr><th className="l">日期</th><th className="l">對手</th><th>結果</th>{role === 'pit' && <th>先發</th>}{cols.map((c) => <th key={c}>{statDef(c, role).label}</th>)}</tr></thead>
        <tbody>{[...log].reverse().map((g) => <tr key={g.g}><td className="l"><Link to={`/game/${season}/${g.g}`}>{g.date}</Link>{!g.g.startsWith('regular') && <span className="kind" style={{ marginLeft: 6 }}>{g.g.startsWith('taiwan') ? '台灣大賽' : '挑戰賽'}</span>}</td>
          <td className="l"><span className="row">{g.home ? 'vs' : '@'} <TeamChip id={g.opp} names={names} size={18} />{team(g.opp, names).short}</span></td><td>{g.res} {g.score}</td>
          {role === 'pit' && <td>{g.GS ? '✓' : ''}</td>}{cols.map((c) => <td key={c} className="mono">{c === 'IP' ? g.IP.toFixed(1) : g[c]}</td>)}</tr>)}</tbody></table></div>
    </div>
  );
}

export default function Player({ index }) {
  const { id } = useParams();
  const [q, setQ] = useSearchParams();
  const { data: p, error } = useData(`players/${id}.json`);
  const [group, setGroup] = useState('std');
  const names = index.teams;
  if (error) return <div className="panel">找不到這位球員。</div>;
  if (!p) return <div className="panel muted">載入中…</div>;
  const role = p.roles.includes(q.get('role')) ? q.get('role') : p.roles[0]; // roles are primary-first
  const years = Object.keys(p.seasons).filter((y) => p.seasons[y][role]).sort();
  const season = years.includes(q.get('season')) ? q.get('season') : years.at(-1);
  const cur = p.seasons[season][role];
  const careerRows = years.map((y) => p.seasons[y][role]);
  const groups = Object.entries(GROUPS[role]).filter(([, [, ks]]) => availKeys(ks, careerRows).filter((k) => k !== 'PA' && k !== 'IP' && k !== 'TBF').length > 1);
  const grp = groups.some(([k]) => k === group) ? group : groups[0]?.[0] || 'std';
  const tiles = availKeys(TILES[role], [cur]).slice(0, 6);
  const set = (o) => setQ({ role, season, ...o });
  const tgOf = (st) => teamGames(st);
  return (
    <>
      <section className="panel hero-card" style={{ borderTop: `4px solid ${team(cur.team, names).color}` }}>
        <TeamChip id={cur.team} names={names} size={72} />
        <div className="grow"><h1>{p.name}</h1>
          <div className="row muted"><TeamLink id={cur.team} names={names} season={season} /> {cur.num ? `· #${cur.num} ` : ''}· {role === 'bat' ? `打擊 ${cur.hand === 'S' ? '左右開弓' : cur.hand === 'L' ? '左打' : cur.hand === 'R' ? '右打' : '—'}` : `${cur.hand === 'L' ? '左投' : cur.hand === 'R' ? '右投' : '—'}`}</div>
          <div className="row" style={{ marginTop: 8 }}>
            {p.roles.length > 1 && <Seg small value={role} onChange={(r) => setQ({ role: r })} options={[['bat', '打擊'], ['pit', '投球']]} />}
            <select value={season} onChange={(e) => set({ season: e.target.value })}>{[...years].reverse().map((y) => <option key={y} value={y}>{y} 球季</option>)}</select>
          </div></div>
        <div className="hero-tiles">{tiles.map((k) => { const d = statDef(k, role); return <div key={k} className="tile"><div className="k">{d.label}</div><div className="v">{d.f(cur.splits.all[k])}</div></div>; })}</div>
      </section>
      <div className="grid">
        <PercentilesWrap row={cur} role={role} season={season} tgOf={tgOf} />
        {role === 'pit' && p.seasons[season].arsenal && <Arsenal ars={p.seasons[season].arsenal} />}
        {cur.splits.vsL && <SplitsCard cur={cur} role={role} season={season} />}
        <div className="panel card span"><div className="row between"><h3>生涯例行賽成績{years[0] < 2023 && '（1990–2022 為整季累計）'}</h3><Seg small value={grp} onChange={setGroup} options={groups.map(([k, [l]]) => [k, l])} /></div>
          <StatTable lead="球季" keys={availKeys(GROUPS[role][grp][1], careerRows)} def={(k) => statDef(k, role)}
            rows={years.map((y) => ({ key: y, cells: p.seasons[y][role].splits.all, lead: <span className="row"><a href={`#/player/${id}?role=${role}&season=${y}`}>{y}</a><TeamChip id={p.seasons[y][role].team} names={names} size={18} /></span> }))} /></div>
        {p.logs?.[season]?.[role]?.length > 0 && <GameLog log={p.logs[season][role]} role={role} season={season} names={names} />}
      </div>
    </>
  );
}

function PercentilesWrap({ row, role, season, tgOf }) {
  const { data: st } = useData(`${season}/standings.json`);
  if (!st) return <div className="panel card muted">載入中…</div>;
  return <Percentiles row={row} role={role} season={season} tg={tgOf(st)} />;
}

function SplitsCard({ cur, role, season }) {
  const keys = SPLIT_GROUPS[role];
  return (
    <div className="panel card"><h3>{season} 對左 / 對右</h3>
      <StatTable lead="分項" keys={keys} def={(k) => statDef(k, role)}
        rows={SPLITS.filter(([s]) => cur.splits[s]).map(([s]) => ({ key: s, cells: cur.splits[s], lead: <span className={'splitpill ' + s}>{splitLabel(s, role)}</span> }))} />
    </div>
  );
}
