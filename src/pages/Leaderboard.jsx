import { useMemo, useState } from 'react';
import { useData, usePref, useSeason } from '../lib/data.js';
import { GROUPS, SPLIT_GROUPS, qualifies, statDef } from '../lib/catalog.js';
import { sortRows, toCSV } from '../lib/stats.js';
import { RoleSeg, Seg, SeasonSelect, SplitSeg, StatTable, TeamChip, PlayerLink } from '../components/ui.jsx';

export const teamGames = (standings) => Math.max(1, ...(standings?.full || []).map((r) => r.G));

export default function Leaderboard({ index }) {
  const [season, setSeason] = usePref('season', index.seasons.at(-1));
  const [role, setRole] = usePref('lb:role', 'bat');
  const [split, setSplit] = usePref('lb:split', 'all');
  const [group, setGroup] = usePref('lb:group', 'std');
  const [qual, setQual] = usePref('lb:qual', true);
  const [teamF, setTeamF] = usePref('lb:team', 'all');
  const [sort, setSort] = useState(null);
  const { data } = useSeason(season, role);
  const { data: st } = useData(`${season}/standings.json`);
  const tg = teamGames(st);
  const keys = split === 'all' ? GROUPS[role][group][1] : SPLIT_GROUPS[role];
  const s = sort && keys.includes(sort.key) ? sort : { key: role === 'bat' ? (split === 'all' && group === 'std' ? 'AVG' : 'wOBA') : (split === 'all' && group === 'std' ? 'ERA' : split === 'all' && group === 'adv' ? 'FIP' : 'wOBA'), dir: role === 'pit' ? 1 : -1 };
  const rows = useMemo(() => {
    let r = (data?.players || []).filter((p) => p.splits[split] && (teamF === 'all' || p.team === teamF));
    if (qual) r = r.filter((p) => qualifies(p, role, tg));
    else r = r.filter((p) => (role === 'bat' ? (p.splits[split].PA || 0) > 0 : (p.splits[split].TBF || 0) > 0));
    return sortRows(r, split, s.key, s.dir);
  }, [data, split, teamF, qual, role, tg, s.key, s.dir]);
  const csv = () => {
    const blob = new Blob(['﻿' + toCSV(rows.map((p) => ({ ...p, team: index.teams[p.team] || p.team })), split, keys)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cpbl-${season}-${role}-${split}.csv`; a.click();
  };
  return (
    <>
      <div className="row between"><h1>{season} 排行榜</h1><SeasonSelect seasons={index.seasons} value={season} onChange={setSeason} /></div>
      <section className="panel">
        <div className="row">
          <RoleSeg value={role} onChange={(r) => { setRole(r); setSort(null); }} />
          <SplitSeg role={role} value={split} onChange={setSplit} />
          {split === 'all' && <Seg value={group} onChange={setGroup} options={Object.entries(GROUPS[role]).map(([k, [l]]) => [k, l])} />}
          <label className="row small"><input type="checkbox" checked={qual} onChange={(e) => setQual(e.target.checked)} /> 規定{role === 'bat' ? '打席' : '投球局數'}（{role === 'bat' ? `${Math.ceil(3.1 * tg)} 打席` : `${tg} 局`}）</label>
          <select value={teamF} onChange={(e) => setTeamF(e.target.value)}><option value="all">全部球隊</option>{Object.entries(index.teams).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
          <button className="btn sm" onClick={csv}>下載 CSV</button>
          <span className="muted small">{rows.length} 人</span>
        </div>
      </section>
      <section className="panel nopad">
        <StatTable keys={keys} def={(k) => statDef(k, role)} sort={s} setSort={setSort}
          extraHead={<><th className="c">#</th><th className="l">球隊</th></>}
          rows={rows.map((p, i) => ({ key: p.id, cells: p.splits[split], lead: <span className="player-cell"><PlayerLink role={role} id={p.id} season={season}>{p.name}</PlayerLink><span className="muted small">{p.hand || ''}</span></span>,
            extra: <><td className="c muted">{i + 1}</td><td className="l"><span className="row"><TeamChip id={p.team} names={index.teams} size={20} /></span></td></> }))} />
      </section>
      <p className="note">例行賽數據，由野球革命逐打席資料計算；wOBA 權重以當季聯盟 RE24 推算，wRC+ 未做球場修正。分項（對左/對右）只含逐打席可算出的數據。</p>
    </>
  );
}
