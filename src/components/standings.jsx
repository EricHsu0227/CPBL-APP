import { TeamLink } from './ui.jsx';

export function StandingsTable({ rows, names, season, compact }) {
  return (
    <div className="scroll"><table className="t">
      <thead><tr><th className="c">#</th><th className="l">球隊</th><th>出賽</th><th>勝</th><th>敗</th><th>和</th><th>勝率</th><th>勝差</th>
        {!compact && <><th>得分</th><th>失分</th><th>主場</th><th>客場</th><th>近十場</th><th>連勝/敗</th></>}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={r.id}><td className="c">{i + 1}</td><td className="l"><TeamLink id={r.id} names={names} short={compact} season={season} /></td>
        <td className="mono">{r.G}</td><td className="mono">{r.W}</td><td className="mono">{r.L}</td><td className="mono">{r.T}</td>
        <td className="mono"><b>{r.pct == null ? '—' : r.pct.toFixed(3).replace(/^0/, '')}</b></td><td className="mono">{r.GB ? r.GB.toFixed(1) : '—'}</td>
        {!compact && <><td className="mono">{r.RS}</td><td className="mono">{r.RA}</td><td className="mono">{r.home}</td><td className="mono">{r.away}</td><td className="mono">{r.L10}</td><td>{r.streak}</td></>}</tr>)}</tbody>
    </table></div>
  );
}
