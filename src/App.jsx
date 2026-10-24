import { NavLink, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { useData } from './lib/data.js';
import { PlayerSearch } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Games from './pages/Games.jsx';
import Game from './pages/Game.jsx';
import Standings from './pages/Standings.jsx';
import Teams from './pages/Teams.jsx';
import Team from './pages/Team.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Player from './pages/Player.jsx';

export default function App() {
  const { data: index, error } = useData('index.json');
  const nav = useNavigate();
  const names = index?.teams;
  return (
    <>
      <header className="nav">
        <NavLink to="/" className="brand"><span className="logo">⚾</span> 中職數據</NavLink>
        <nav>
          <NavLink to="/games">賽程比分</NavLink>
          <NavLink to="/standings">戰績</NavLink>
          <NavLink to="/teams">球隊</NavLink>
          <NavLink to="/leaderboard">排行榜</NavLink>
        </nav>
        <PlayerSearch className="nav-search" names={names} onPick={(p) => nav(`/player/${p.id}?role=${p.r[0]}`)} />
      </header>
      <main>
        {error && <div className="panel">讀不到 data/index.json，請先執行 <code>npm run data</code>。</div>}
        {index && (
          <Routes>
            <Route path="/" element={<Home index={index} />} />
            <Route path="/games" element={<Games index={index} />} />
            <Route path="/game/:season/:id" element={<Game index={index} />} />
            <Route path="/standings" element={<Standings index={index} />} />
            <Route path="/teams" element={<Teams index={index} />} />
            <Route path="/team/:id" element={<Team index={index} />} />
            <Route path="/leaderboard" element={<Leaderboard index={index} />} />
            <Route path="/player/:id" element={<Player index={index} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>)}
      </main>
      <footer className="foot muted small">數據來源：<a href="https://www.rebas.tw" target="_blank" rel="noreferrer">野球革命 rebas.tw</a>（<a href="https://github.com/rebas-tw/rebas.tw-open-data" target="_blank" rel="noreferrer">開放資料</a>，ODC-By）。部分資料為人工紀錄。1990–2022 球季成績：<a href="https://github.com/ldkrsi/cpbl-opendata" target="_blank" rel="noreferrer">ldkrsi/cpbl-opendata</a>（MIT，原始資料來自中華職棒官網）。</footer>
    </>
  );
}
