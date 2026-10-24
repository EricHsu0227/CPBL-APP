import { useData, usePref } from '../lib/data.js';
import { Seg, SeasonSelect } from '../components/ui.jsx';
import { StandingsTable } from '../components/standings.jsx';

export default function Standings({ index }) {
  const [season, setSeason] = usePref('season', index.seasons.at(-1));
  const [part, setPart] = usePref('standings:part', 'full');
  const { data } = useData(`${season}/standings.json`);
  return (
    <>
      <div className="row between"><h1>{season} 戰績</h1>
        <div className="row"><Seg value={part} onChange={setPart} options={[['full', '全年'], ['first', '上半季'], ['second', '下半季']]} /><SeasonSelect seasons={index.seasons} value={season} onChange={setSeason} /></div></div>
      <section className="panel nopad">{data ? <StandingsTable rows={data[part]} names={index.teams} season={season} /> : <div className="pad muted">載入中…</div>}</section>
      <p className="note">勝率 = 勝 /（勝 + 敗），和局不計。上半季為第 1–{data?.halfAt ?? '…'} 場，其餘為下半季。</p>
    </>
  );
}
