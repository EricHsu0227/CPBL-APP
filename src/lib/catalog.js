// Stat labels (zh-Hant), number formats, and which direction is "good".
const dash = (f) => (v) => (v == null || Number.isNaN(v) ? '—' : f(v));
const PCT = dash((v) => (v * 100).toFixed(1) + '%');
const RATE3 = dash((v) => v.toFixed(3).replace(/^0\./, '.').replace(/^-0\./, '-.'));
const D1 = dash((v) => v.toFixed(1));
const D2 = dash((v) => v.toFixed(2));
const INT = dash((v) => String(Math.round(v)));
const GEN = dash((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2)));

const L = {
  G: ['出賽', INT], PA: ['打席', INT], AB: ['打數', INT], R: ['得分', INT], H: ['安打', INT], '1B': ['一安', INT], '2B': ['二安', INT], '3B': ['三安', INT], HR: ['全壘打', INT],
  TB: ['壘打數', INT], RBI: ['打點', INT], BB: ['四壞', INT], IBB: ['故四', INT], HBP: ['觸身', INT], SO: ['三振', INT], SF: ['犧飛', INT], SH: ['犧觸', INT], GIDP: ['雙殺打', INT],
  SB: ['盜壘', INT], CS: ['盜壘刺', INT], AVG: ['打擊率', RATE3], OBP: ['上壘率', RATE3], SLG: ['長打率', RATE3], OPS: ['OPS', RATE3], ISO: ['ISO', RATE3], BABIP: ['BABIP', RATE3],
  wOBA: ['wOBA', RATE3], 'wRC+': ['wRC+', INT], wRAA: ['wRAA', D1], WPA: ['WPA', D2], RE24: ['RE24', D1], 'K%': ['三振率', PCT], 'BB%': ['保送率', PCT], 'BB/K': ['BB/K', D2],
  'GB%': ['滾地%', PCT], 'LD%': ['平飛%', PCT], 'FB%': ['高飛%', PCT], 'PU%': ['內飛%', PCT], 'Hard%': ['強擊%', PCT], 'Mid%': ['中擊%', PCT], 'Soft%': ['弱擊%', PCT],
  'Swing%': ['揮棒%', PCT], 'Whiff%': ['揮空%', PCT], 'CSW%': ['CSW%', PCT], 'Zone%': ['好球帶%', PCT], 'Z-Swing%': ['帶內揮棒%', PCT], 'O-Swing%': ['追打%', PCT], 'Z-Contact%': ['帶內擊中%', PCT],
  'P/PA': ['球數/打席', D2], Pitches: ['球數', INT],
  GS: ['先發', INT], IP: ['局數', D1], IPOuts: ['出局數', INT], BF: ['面對打者', INT], TBF: ['面對打席', INT], NP: ['用球數', INT], ER: ['責失', INT], HB: ['觸身', INT],
  W: ['勝', INT], L: ['敗', INT], SV: ['救援', INT], HLD: ['中繼', INT], GR: ['後援出賽', INT], CG: ['完投', INT], SHO: ['完封', INT], WP: ['暴投', INT], BK: ['投手犯規', INT],
  GO: ['滾地出局', INT], FO: ['飛球出局', INT], 'OPS+': ['OPS+', INT], 'ERA+': ['ERA+', INT],
  ERA: ['防禦率', D2], WHIP: ['WHIP', D2], FIP: ['FIP', D2], 'K/9': ['K/9', D2], 'BB/9': ['BB/9', D2], 'HR/9': ['HR/9', D2], 'K/BB': ['K/BB', D2], 'K-BB%': ['K-BB%', PCT],
};
const DESC = {
  wOBA: '加權上壘率：以聯盟得分期望值（RE24）算出的各事件權重', 'wRC+': '加權得分創造：100 = 聯盟平均（未做球場修正）', wRAA: '比聯盟平均多創造的得分', WPA: '勝率貢獻（Win Probability Added）',
  RE24: '得分期望值貢獻', FIP: '投手獨立防禦率', BABIP: '場內球安打率', ISO: '純長打率 (SLG − AVG)', 'CSW%': '好球 + 揮空 / 總球數', 'O-Swing%': '對壞球帶揮棒比例',
  'Zone%': '進壘在好球帶的比例（依野球革命進壘座標）', 'Hard%': '強勁擊球比例（野球革命人工紀錄）',
};
const BAT_LOW = new Set(['SO', 'CS', 'GIDP', 'K%', 'Whiff%', 'O-Swing%', 'PU%', 'Soft%', 'Swing%']);
const PIT_HIGH = new Set(['W', 'SV', 'HLD', 'CG', 'SHO', 'ERA+', 'SO', 'K%', 'K/9', 'K/BB', 'K-BB%', 'Whiff%', 'CSW%', 'O-Swing%', 'GB%', 'PU%', 'Soft%', 'WPA', 'RE24', 'IP', 'IPOuts', 'GS', 'Zone%']);
const NEUTRAL = new Set(['GO', 'FO', 'GR', 'G', 'PA', 'AB', 'BF', 'TBF', 'NP', 'Pitches', 'P/PA', 'LD%', 'FB%', 'Mid%', 'Z-Swing%', 'Swing%', 'GS', 'IBB']);

export function direction(key, role = 'bat') {
  if (NEUTRAL.has(key)) return 0;
  if (role === 'pit') return PIT_HIGH.has(key) ? 1 : -1;
  return BAT_LOW.has(key) ? -1 : 1;
}
export function statDef(key, role = 'bat') {
  const [label, f] = L[key] || [key, GEN];
  const dir = direction(key, role);
  return { key, label, f, pct: f === PCT, dir, lowGood: dir < 0, desc: DESC[key] || '' };
}
export const SPLITS = [['all', '全部'], ['vsL', (role) => (role === 'pit' ? '對左打' : '對左投')], ['vsR', (role) => (role === 'pit' ? '對右打' : '對右投')]];
export const splitLabel = (id, role = 'bat') => { const s = SPLITS.find((x) => x[0] === id); return typeof s[1] === 'function' ? s[1](role) : s[1]; };

// Column groups for tables.
export const GROUPS = {
  bat: {
    std: ['標準', ['G', 'PA', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'SB', 'AVG', 'OBP', 'SLG', 'OPS']],
    adv: ['進階', ['PA', 'OPS+', 'wOBA', 'wRC+', 'wRAA', 'ISO', 'BABIP', 'K%', 'BB%', 'BB/K', 'WPA', 'RE24']],
    disc: ['選球', ['PA', 'P/PA', 'Swing%', 'Z-Swing%', 'O-Swing%', 'Whiff%', 'Z-Contact%', 'CSW%', 'Zone%']],
    bb: ['擊球', ['PA', 'GB%', 'LD%', 'FB%', 'PU%', 'Hard%', 'Mid%', 'Soft%']],
  },
  pit: {
    std: ['標準', ['G', 'GS', 'W', 'L', 'SV', 'HLD', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO', 'ERA', 'WHIP']],
    adv: ['進階', ['IP', 'ERA+', 'FIP', 'K%', 'BB%', 'K-BB%', 'K/9', 'BB/9', 'HR/9', 'BABIP', 'wOBA', 'WPA', 'RE24']],
    disc: ['球路', ['TBF', 'Pitches', 'Whiff%', 'CSW%', 'Zone%', 'O-Swing%', 'Z-Contact%', 'Swing%']],
    bb: ['被擊球', ['TBF', 'AVG', 'OBP', 'SLG', 'GB%', 'LD%', 'FB%', 'PU%', 'Hard%', 'Soft%']],
  },
};
// Split lines only have PA-derived stats.
export const SPLIT_GROUPS = {
  bat: ['PA', 'AB', 'H', 'HR', 'BB', 'SO', 'AVG', 'OBP', 'SLG', 'OPS', 'wOBA', 'K%', 'BB%', 'Whiff%', 'Hard%'],
  pit: ['TBF', 'H', 'HR', 'BB', 'SO', 'AVG', 'OBP', 'SLG', 'OPS', 'wOBA', 'K%', 'BB%', 'Whiff%', 'GB%'],
};
/** CPBL qualifiers: 3.1 PA / 1 IP per team game. */
export const qualifies = (row, role, teamGames) => (role === 'bat' ? (row.splits.all.PA || 0) >= 3.1 * teamGames : (row.splits.all.IPOuts || 0) >= 3 * teamGames);

/** Columns of a stat group that exist in the data (history seasons only have season totals). */
export const availKeys = (keys, rows, split = 'all') => keys.filter((k) => rows.some((r) => r.splits?.[split]?.[k] != null));
export const hasSplits = (rows) => rows.some((r) => r.splits?.vsL);
export const pickKey = (keys, ...cands) => cands.find((k) => keys.includes(k)) || keys[0];
