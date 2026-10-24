import { useMemo, useState } from 'react';
import { useData, usePref, useSeason } from '../lib/data.js';
import { GROUPS, SPLIT_GROUPS, availKeys, hasSplits, pickKey, qualifies, statDef } from '../lib/catalog.js';
import { allSeasons, inList } from '../lib/seasons.js';
import { sortRows, toCSV } from '../lib/stats.js';
import { RoleSeg, Seg, SeasonSelect, SplitSeg, StatTable, TeamChip, PlayerLink } from '../components/ui.jsx';

export const teamGames = (standings) => Math.max(1, ...(standings?.full || []).map((r) => r.G));

export default function Leaderboard({ index }) {
  const all = allSeasons(index);
  const [pref, setSeason] = usePref('season', index.seasons.at(-1));
  const season = inList(all, pref);
  const [role, setRole] = usePref('lb:role', 'bat');
  const [split, setSplit] = usePref('lb:split', 'all');
  const [group, setGroup] = usePref('lb:group', 'std');
  const [qual, setQual] = usePref('lb:qual', true);
  const [teamF, setTeamF] = usePref('lb:team', 'all');
  const [sort, setSort] = useState(null);
  const { data } = useSeason(season, role);
  const { data: st } = useData(`${season}/standings.json`);
  const tg = teamGames(st);
  const players = data?.players || [];
  const splitOk = hasSplits(players);
  const sp = splitOk ? split : 'all';
  const groups = Object.entries(GROUPS[role]).filter(([, [, ks]]) => availKeys(ks, players).filter((k) => k !== 'PA' && k !== 'IP' && k !== 'TBF').length > 1);
  const grp = groups.some(([k]) => k === group) ? group : groups[0]?.[0] || 'std';
  const keys = availKeys(sp === 'all' ? GROUPS[role][grp][1] : SPLIT_GROUPS[role], players, sp);
  const s = sort && keys.includes(sort.key) ? sort : { key: pickKey(keys, ...(role === 'bat' ? [sp === 'all' && grp === 'std' ? 'AVG' : 'wOBA', 'OPS+', 'OPS'] : [sp === 'all' && grp === 'std' ? 'ERA' : sp === 'all' ? 'FIP' : 'wOBA', 'ERA'])), dir: role === 'pit' ? 1 : -1 }; // pitcher defaults (ERA, FIP, wOBA against) are lower-is-better
  const teamIds = useMemo(() => [...new Set(players.map((p) => p.team))], [players]);
  const rows = useMemo(() => {
    let r = players.filter((p) => p.splits[sp] && (teamF === 'all' || p.team === teamF));
    if (qual) r = r.filter((p) => qualifies(p, role, tg));
    else r = r.filter((p) => (role === 'bat' ? (p.splits[sp].PA || 0) > 0 : (p.splits[sp].TBF || 0) > 0));
    return sortRows(r, sp, s.key, s.dir);
  }, [players, sp, teamF, qual, role, tg, s.key, s.dir]);
  const csv = () => {
    const blob = new Blob(['﻿' + toCSV(rows.map((p) => ({ ...p, team: index.teams[p.team] || p.team })), sp, keys)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cpbl-${season}-${role}-${sp}.csv`; a.click();
  };
  return (
    <>
      <div className="row between"><h1>{season} 排行榜</h1><SeasonSelect seasons={all} value={season} onChange={setSeason} /></div>
      <section className="panel">
        <div className="row">
          <RoleSeg value={role} onChange={(r) => { setRole(r); setSort(null); }} />
          {splitOk && <SplitSeg role={role} value={sp} onChange={setSplit} />}
          {sp === 'all' && <Seg value={grp} onChange={setGroup} options={groups.map(([k, [l]]) => [k, l])} />}
          <label className="row small"><input type="checkbox" checked={qual} onChange={(e) => setQual(e.target.checked)} /> 規定{role === 'bat' ? '打席' : '投球局數'}（{role === 'bat' ? `${Math.ceil(3.1 * tg)} 打席` : `${tg} 局`}）</label>
          <select value={teamF} onChange={(e) => setTeamF(e.target.value)}><option value="all">全部球隊</option>{teamIds.map((id) => <option key={id} value={id}>{index.teams[id] || id}</option>)}</select>
          <button className="btn sm" onClick={csv}>下載 CSV</button>
          <span className="muted small">{rows.length} 人</span>
        </div>
      </section>
      <section className="panel nopad">
        <StatTable keys={keys} def={(k) => statDef(k, role)} sort={s} setSort={setSort}
          extraHead={<><th className="c">#</th><th className="l">球隊</th></>}
          rows={rows.map((p, i) => ({ key: p.id, cells: p.splits[sp], lead: <span className="player-cell"><PlayerLink role={role} id={p.id} season={season}>{p.name}</PlayerLink><span className="muted small">{p.hand || ''}</span></span>,
            extra: <><td className="c muted">{i + 1}</td><td className="l"><span className="row"><TeamChip id={p.team} names={index.teams} size={20} /></span></td></> }))} />
      </section>
      <p className="note">例行賽數據，由野球革命逐打席資料計算；wOBA 權重以當季聯盟 RE24 推算，wRC+ 未做球場修正。分項（對左/對右）只含逐打席可算出的數據。1990–2022 球季只有整季累計數字（來自 ldkrsi/cpbl-opendata），沒有 wOBA、對左/對右等數據；OPS+ / ERA+ 未做球場修正。</p>
    </>
  );
}
