// Keyed by 野球革命 team id.
export const TEAMS = {
  HCHks: { short: '兄弟', color: '#e6a800' },
  hThSB: { short: '統一', color: '#f26b21' },
  '1zODE': { short: '樂天', color: '#8c1d40' },
  TPKQm: { short: '富邦', color: '#1c3f94' },
  '0MJKt': { short: '味全', color: '#d6001c' },
  LH4lt: { short: '台鋼', color: '#0b5f4a' },
};
export const team = (id, names = {}) => ({ id, name: names[id] || id, short: TEAMS[id]?.short || (names[id] || id).slice(0, 2), color: TEAMS[id]?.color || '#64748b' });
