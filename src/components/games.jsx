import { Link } from 'react-router-dom';
import { TeamChip } from './ui.jsx';
import { team } from '../lib/teams.js';
import { KIND, time } from '../lib/format.js';

export function GameCard({ g, season, names }) {
  const win = g.away.r > g.home.r ? 'away' : g.home.r > g.away.r ? 'home' : null;
  const extra = g.away.line.length > 9 ? `/${g.away.line.length}` : '';
  return (
    <Link className="panel game game-card" to={`/game/${season}/${g.id}`}>
      <div className="row between small muted"><span>{g.kind !== 'regular' ? <span className={'kind ' + g.kind}>{KIND[g.kind]}</span> : `第 ${g.seq} 場`}</span><span>{time(g.date)} · {g.stadium}</span></div>
      {['away', 'home'].map((s) => (
        <div key={s} className={'gt' + (win === s ? ' win' : win ? ' lose' : '')}>
          <TeamChip id={g[s].id} names={names} /><span className="grow" style={{ fontWeight: 700 }}>{team(g[s].id, names).name}</span>
          <span className="muted small">{g[s].h} 安</span><span className="score mono" style={{ fontWeight: 800 }}>{g[s].r}</span>
        </div>))}
      <div className="small muted">終場{extra}{win ? '' : '（和局）'}</div>
    </Link>
  );
}

export function LineScore({ g, names }) {
  const n = Math.max(9, g.away.line.length, g.home.line.length);
  return (
    <div className="scroll"><table className="t sm linescore"><thead><tr><th className="l">球隊</th>{Array.from({ length: n }, (_, i) => <th key={i}>{i + 1}</th>)}<th>R</th><th>H</th></tr></thead>
      <tbody>{['away', 'home'].map((s) => <tr key={s}><td className="l"><span className="row"><TeamChip id={g[s].id} names={names} size={20} />{team(g[s].id, names).short}</span></td>
        {Array.from({ length: n }, (_, i) => { const v = g[s].line[i]; return <td key={i} className="mono">{v ?? (s === 'home' && i >= 8 && i < g.away.line.length ? 'X' : '')}</td>; })}
        <td className="mono"><b>{g[s].r}</b></td><td className="mono">{g[s].h}</td></tr>)}</tbody></table></div>
  );
}
