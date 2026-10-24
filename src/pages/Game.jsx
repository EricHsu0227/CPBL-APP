import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../lib/data.js';
import { Seg, TeamChip, PlayerLink } from '../components/ui.jsx';
import { LineScore } from '../components/games.jsx';
import { team } from '../lib/teams.js';
import { BASES, HARD, KIND, PITCH, RESULT, TRAJ, date, isHit, time, wd } from '../lib/format.js';

function BatBox({ side, season, names }) {
  const t = team(side.id, names);
  return (
    <div><h4 className="row"><TeamChip id={side.id} names={names} size={20} />{t.name} 打擊</h4>
      <div className="scroll"><table className="t sm"><thead><tr><th className="l">球員</th><th>打席</th><th>打數</th><th>得分</th><th>安打</th><th>打點</th><th>全壘打</th><th>四壞</th><th>三振</th><th>盜壘</th></tr></thead>
        <tbody>{side.bat.map((b, i) => { const sub = i > 0 && side.bat[i - 1].order === b.order; return (
          <tr key={b.playerId + i}><td className="l" style={sub ? { paddingLeft: 22 } : null}><span className="muted small">{sub ? '' : b.order + '. '}</span><PlayerLink role="bat" id={b.playerId} season={season}>{b.playerName}</PlayerLink> <span className="muted small">#{b.playerNumber}</span></td>
            {['PA', 'AB', 'R', 'H', 'RBI', 'HR', 'BB', 'SO', 'SB'].map((k) => <td key={k} className="mono">{b[k]}</td>)}</tr>); })}</tbody></table></div></div>
  );
}
function PitBox({ side, season, names }) {
  const t = team(side.id, names);
  return (
    <div><h4 className="row"><TeamChip id={side.id} names={names} size={20} />{t.name} 投球</h4>
      <div className="scroll"><table className="t sm"><thead><tr><th className="l">投手</th><th>局數</th><th>用球</th><th>打席</th><th>安打</th><th>全壘打</th><th>四壞</th><th>三振</th><th>失分</th><th>責失</th></tr></thead>
        <tbody>{side.pit.map((b) => <tr key={b.playerId}><td className="l"><PlayerLink role="pit" id={b.playerId} season={season}>{b.playerName}</PlayerLink> <span className="muted small">#{b.playerNumber}</span></td>
          {['IP', 'NP', 'BF', 'H', 'HR', 'BB', 'SO', 'R', 'ER'].map((k) => <td key={k} className="mono">{k === 'IP' ? b.IP.toFixed(1) : b[k]}</td>)}</tr>)}</tbody></table></div></div>
  );
}

/** Home win expectancy after each PA. */
function WEChart({ pbp, names, g }) {
  const end = g.home.r > g.away.r ? 1 : g.home.r < g.away.r ? 0 : 0.5;
  const pts = [...pbp.map((p) => p.we), end]; // WE before each PA, then the final result
  const W = 800, H = 180, n = pts.length - 1 || 1;
  let pen = 'M';
  const d = pts.map((v, i) => { if (v == null) return ''; const c = `${pen}${((i / n) * W).toFixed(1)},${((1 - v) * H).toFixed(1)}`; pen = 'L'; return c; }).join(' ');
  return (
    <svg className="we" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="勝率變化">
      <line className="mid" x1="0" x2={W} y1={H / 2} y2={H / 2} /><path d={d} />
      <text x="6" y="14" className="axis" fill="currentColor" fontSize="12">{team(g.home.id, names).short} 勝率</text>
    </svg>
  );
}

const PC = { S: '好', W: '揮', B: '壞', F: '界', T: '擦', f: '觸界', w: '觸空', X: '進' };

export default function Game({ index }) {
  const { season, id } = useParams();
  const { data: g, error } = useData(`${season}/game/${id}.json`);
  const [tab, setTab] = useState('box');
  const [open, setOpen] = useState(null);
  const names = index.teams;
  const top = useMemo(() => (g ? [...g.pbp].filter((p) => p.wpa != null).sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa)).slice(0, 5) : []), [g]);
  if (error) return <div className="panel">找不到這場比賽。</div>;
  if (!g) return <div className="panel muted">載入中…</div>;
  const inns = [...new Set(g.pbp.map((p) => `${p.inn}-${p.half}`))];
  return (
    <>
      <p className="muted small"><Link to={`/games?date=${date(g.date)}`}>‹ {date(g.date)} 賽程</Link></p>
      <section className="panel hero-card">
        <div className="grow">
          <div className="muted small">{g.kind !== 'regular' ? <span className={'kind ' + g.kind}>{KIND[g.kind]} 第 {g.seq} 戰</span> : `${season} 例行賽 第 ${g.seq} 場`} · {date(g.date)}（{wd(g.date)}）{time(g.date)} · {g.stadium}</div>
          <div className="row" style={{ gap: 20, marginTop: 8, fontSize: '1.4em', fontWeight: 800 }}>
            <span className="row"><TeamChip id={g.away.id} names={names} size={40} />{team(g.away.id, names).name}</span>
            <span className="mono" style={{ fontSize: '1.4em' }}>{g.away.r} : {g.home.r}</span>
            <span className="row">{team(g.home.id, names).name}<TeamChip id={g.home.id} names={names} size={40} /></span>
          </div>
        </div>
      </section>
      <section className="panel"><LineScore g={g} names={names} /></section>
      <div className="row" style={{ marginBottom: 10 }}><Seg value={tab} onChange={setTab} options={[['box', 'Box Score'], ['pbp', '逐打席'], ['we', '勝率走勢']]} /></div>
      {tab === 'box' && <section className="panel"><div className="box-grid">
        <BatBox side={g.away} season={season} names={names} /><BatBox side={g.home} season={season} names={names} />
        <PitBox side={g.away} season={season} names={names} /><PitBox side={g.home} season={season} names={names} /></div></section>}
      {tab === 'we' && <section className="panel"><h3>主隊勝率走勢</h3><WEChart pbp={g.pbp} names={names} g={g} />
        <h3 style={{ marginTop: 14 }}>關鍵打席（WPA）</h3>
        {top.map((p, i) => <div key={i} className="pbp"><div><b>{p.inn}局{p.half === 'top' ? '上' : '下'}</b> {p.b} 對 {p.p}：<span className="res">{RESULT[p.res] || p.res}</span>{p.rbi ? `（${p.rbi} 分打點）` : ''}</div>
          <div className={'wpa ' + (p.wpa > 0 ? 'up' : 'down')}>{p.wpa > 0 ? '+' : ''}{(p.wpa * 100).toFixed(1)}%</div></div>)}
        <p className="note">勝率（WE）與 WPA 為野球革命計算，WPA 以進攻方角度表示。</p></section>}
      {tab === 'pbp' && <section className="panel">
        {inns.map((k) => { const [inn, half] = k.split('-'); const side = half === 'top' ? g.away : g.home; return (
          <div key={k}><div className="pbp-inn row"><TeamChip id={side.id} names={names} size={18} />{inn} 局{half === 'top' ? '上' : '下'}</div>
            {g.pbp.filter((p) => `${p.inn}-${p.half}` === k).map((p, i) => { const key = k + i; return (
              <div key={key} className="pbp" onClick={() => setOpen(open === key ? null : key)} style={{ cursor: 'pointer' }}>
                <div><span className="muted small">{p.outs} 出局 · {BASES[p.bases] ?? ''}</span><br />
                  {p.isPH && <span className="kind">代打</span>} <b>{p.b}</b> <span className="muted small">({p.bh})</span> 對 {p.p} <span className="muted small">({p.ph})</span>：
                  <span className="res" style={isHit(p.res) ? { color: 'var(--c1)' } : null}>{RESULT[p.res] || p.res || '—'}</span>
                  {p.traj && <span className="muted small"> · {TRAJ[p.traj]}{p.hard ? ` · ${HARD[p.hard]}` : ''}{p.loc ? ` · ${p.loc}` : ''}</span>}
                  {p.rbi > 0 && <span> · {p.rbi} 分打點 <b className="mono">{p.score[0]}:{p.score[1]}</b></span>}
                  {open === key ? <div className="pseq">{p.pitches.map(([t, v, c], j) => <span key={j} className={c === 'H' || c === 'BUNT' ? 'x' : ['S', 'SW', 'F', 'FT', 'FOUL_BUNT', 'TRY_BUNT'].includes(c) ? 's' : ''}>{j + 1}. {PITCH[t] || t || '?'}{v ? ` ${v}` : ''}</span>)}</div>
                    : <div className="pseq">{[...p.seq].map((c, j) => <span key={j} className={c === 'X' ? 'x' : c === 'B' ? '' : 's'}>{PC[c] || c}</span>)}</div>}
                </div>
                <div className={'wpa ' + (p.wpa > 0 ? 'up' : p.wpa < 0 ? 'down' : '')}>{p.wpa == null ? '' : `${p.wpa > 0 ? '+' : ''}${(p.wpa * 100).toFixed(1)}%`}</div>
              </div>); })}
          </div>); })}
        <p className="note">點一下打席可看每一球的球種與球速（km/h）。WPA 為進攻方的勝率變化。</p></section>}
    </>
  );
}
