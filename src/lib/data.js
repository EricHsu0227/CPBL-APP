import { useEffect, useState } from 'react';
const cache = new Map();
export function load(path) {
  if (!cache.has(path)) {
    const p = fetch(`./data/${path}`).then((r) => { if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path);
}
export function useData(path) {
  const [s, set] = useState({ data: null, error: null, loading: !!path });
  useEffect(() => {
    let on = true; set({ data: null, error: null, loading: !!path });
    if (path) load(path).then((d) => on && set({ data: d, error: null, loading: false }), (e) => on && set({ data: null, error: e, loading: false }));
    return () => { on = false; };
  }, [path]);
  return s;
}
export const useSeason = (season, role) => useData(season && role ? `${season}/${role}.json` : null);

/** Per-viewer UI preference (localStorage may be unavailable). */
export function usePref(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem('cpbl:' + key); return s ? JSON.parse(s) : init; } catch { return init; } });
  useEffect(() => {
    const on = (e) => { if (e.detail.key === key) setV(e.detail.val); };
    window.addEventListener('cpbl-pref', on);
    return () => window.removeEventListener('cpbl-pref', on);
  }, [key]);
  const set = (n) => {
    const val = typeof n === 'function' ? n(v) : n;
    try { localStorage.setItem('cpbl:' + key, JSON.stringify(val)); } catch { /* ignore */ }
    setV(val);
    window.dispatchEvent(new CustomEvent('cpbl-pref', { detail: { key, val } }));
  };
  return [v, set];
}
