import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SPLITS, splitLabel } from '../lib/catalog.js';
import { team } from '../lib/teams.js';
import { useData } from '../lib/data.js';

export function Seg({ value, onChange, options, small }) {
  return (
    <span className={'seg' + (small ? ' small' : '')} role="group">
      {options.map(([v, l]) => <button type="button" key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </span>
  );
}
export const SplitSeg = ({ role = 'bat', ...p }) => <Seg {...p} options={SPLITS.map(([id]) => [id, splitLabel(id, role)])} />;
export const RoleSeg = (p) => <Seg {...p} options={[['bat', '打者'], ['pit', '投手']]} />;
export const SeasonSelect = ({ seasons, value, onChange }) => (
  <select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="球季">
    {[...seasons].reverse().map((y) => <option key={y} value={y}>{y} 球季</option>)}
  </select>
);

export function TeamChip({ id, names, size = 26 }) {
  const t = team(id, names);
  return <span className="tchip" style={{ '--tc': t.color, '--s': size + 'px' }} title={t.name}>{t.short[0]}</span>;
}
export function TeamLink({ id, names, short, size = 22, season, label }) {
  const t = team(id, names);
  return <Link className="team-link" to={`/team/${id}${season ? `?season=${season}` : ''}`}><TeamChip id={id} names={names} size={size} />{short ? t.short : label || t.name}</Link>;
}
export function Avatar({ name, size = 40, color }) {
  return <span className="tchip" style={{ '--tc': color || 'var(--accent)', '--s': size + 'px' }}>{name?.[0] || '?'}</span>;
}

export const playerHref = (role, id, season) => `/player/${id}${role || season ? '?' : ''}${[role && `role=${role}`, season && `season=${season}`].filter(Boolean).join('&')}`;
export const PlayerLink = ({ role, id, season, children }) => <Link to={playerHref(role, id, season)}>{children}</Link>;

/** Search-as-you-type over players-index.json. */
export function PlayerSearch({ onPick, placeholder = '搜尋球員…', autoFocus, className = '', names }) {
  const { data: index } = useData('players-index.json');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!index || !s) return [];
    return index.filter((p) => p.n.toLowerCase().includes(s)).sort((a, b) => (a.n.indexOf(s) - b.n.indexOf(s)) || b.y[1] - a.y[1]).slice(0, 8);
  }, [index, q]);
  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => { const f = (e) => { if (!box.current?.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  const pick = (p) => { onPick(p); setQ(''); setOpen(false); };
  return (
    <div className={'search ' + className} ref={box}>
      <input autoFocus={autoFocus} value={q} placeholder={placeholder} onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && hits[hi]) pick(hits[hi]);
          else if (e.key === 'Escape') setOpen(false);
        }} />
      {open && hits.length > 0 && (
        <div className="search-pop">
          {hits.map((p, i) => (
            <div key={p.id} className={'hit' + (i === hi ? ' hi' : '')} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(p); }}>
              <TeamChip id={p.t} names={names} size={26} /><span className="grow">{p.n}</span>
              <span className="muted small">{p.r.map((r) => (r === 'bat' ? '打' : '投')).join('/')} · {p.y[0] === p.y[1] ? p.y[0] : `${p.y[0]}–${p.y[1]}`}</span>
            </div>))}
        </div>)}
    </div>
  );
}

/** Sortable stat table. rows: [{ key, cells: {...}, lead: ReactNode }] */
export function StatTable({ rows, keys, def, sort, setSort, lead = '球員', extraHead, className = '' }) {
  return (
    <div className="scroll tall">
      <table className={'t lb sticky-first ' + className}>
        <thead><tr><th className="l">{lead}</th>{extraHead}{keys.map((k) => { const d = def(k); return <th key={k} title={d.desc} className={sort?.key === k ? 'active' : ''} onClick={() => setSort?.((s) => ({ key: k, dir: s?.key === k ? -s.dir : d.lowGood ? 1 : -1 }))}>{d.label}</th>; })}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.key}><td className="l">{r.lead}</td>{r.extra}{keys.map((k) => <td key={k} className="mono">{def(k).f(r.cells?.[k])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
