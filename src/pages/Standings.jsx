import { useData, usePref } from '../lib/data.js';
import { Seg, SeasonSelect } from '../components/ui.jsx';
import { StandingsTable } from '../components/standings.jsx';
import { allSeasons, inList } from '../lib/seasons.js';

export default function Standings({ index }) {
  const all = allSeasons(index);
  const [pref, setSeason] = usePref('season', index.seasons.at(-1));
  const season = inList(all, pref);
  const [part, setPart] = usePref('standings:part', 'full');
  const { data } = useData(`${season}/standings.json`);
  const halves = !!data?.first;
  const rows = data ? (halves ? data[part] : data.full) : null;
  return (
    <>
      <div className="row between"><h1>{season} 戰績</h1>
        <div className="row">{halves && <Seg value={part} onChange={setPart} options={[['full', '全年'], ['first', '上半季'], ['second', '下半季']]} />}<SeasonSelect seasons={all} value={season} onChange={setSeason} /></div></div>
      <section className="panel nopad">{rows ? <StandingsTable rows={rows} names={index.teams} season={season} /> : <div className="pad muted">載入中…</div>}</section>
      <p className="note">勝率 = 勝 /（勝 + 敗），和局不計。{halves ? `上半季為第 1–${data.halfAt} 場，其餘為下半季。` : '這個球季只有全年成績。'}{season < 2023 ? ' 得分／失分由球員成績加總。' : ''}</p>
    </>
  );
}
