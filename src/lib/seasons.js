// Seasons with game-level data (野球革命) vs. season-level history (1990-2022).
export const allSeasons = (index) => [...(index.history || []), ...index.seasons];
export const inList = (list, pref) => (list.includes(pref) ? pref : list.at(-1));
export const isDetailed = (index, season) => index.seasons.includes(Number(season));
