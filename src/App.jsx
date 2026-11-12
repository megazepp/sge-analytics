import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, CalendarDays, ChevronRight, Crosshair, Dumbbell, LayoutDashboard, Menu, Shield, Users, Zap, ArrowLeft, Star, Trophy } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const nav = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
  { id: 'squad', label: 'Kompletter Kader', icon: Users },
  { id: 'training', label: 'Trainingsgelände', icon: Dumbbell },
  { id: 'lineup', label: 'Starting XI', icon: Shield },
  { id: 'matches', label: 'Match Center', icon: CalendarDays },
  { id: 'statistics', label: 'Statistiken', icon: BarChart3 },
]
const TEAM_ID = 169
const SEASON = 2026

function PixelPlayer({ number = 9, tone = 'light', small = false }) {
  return <svg className={`pixel-player-sprite ${tone} ${small ? 'small' : ''}`} viewBox="0 0 32 48" role="img" aria-label="Pixel-Art-Spieler" shapeRendering="crispEdges">
    <rect x="11" y="2" width="10" height="2" fill="#493329"/><rect x="9" y="4" width="14" height="2" fill="#493329"/>
    <rect x="10" y="6" width="12" height="8" fill="#d99b70"/><rect x="8" y="8" width="2" height="5" fill="#493329"/><rect x="22" y="8" width="2" height="5" fill="#493329"/>
    <rect x="12" y="10" width="2" height="2" fill="#29212a"/><rect x="19" y="10" width="2" height="2" fill="#29212a"/><rect x="14" y="13" width="5" height="1" fill="#9b574b"/>
    <rect x="14" y="14" width="4" height="3" fill="#d99b70"/>
    <rect x="8" y="17" width="16" height="14" fill="#17191d"/><rect x="11" y="17" width="3" height="14" fill="#f7f0df"/><rect x="18" y="17" width="3" height="14" fill="#f7f0df"/>
    <rect x="6" y="18" width="3" height="11" fill="#17191d"/><rect x="23" y="18" width="3" height="11" fill="#17191d"/>
    <rect x="6" y="27" width="3" height="4" fill="#d99b70"/><rect x="23" y="27" width="3" height="4" fill="#d99b70"/>
    <rect x="9" y="31" width="14" height="7" fill="#171c2b"/><rect x="10" y="38" width="4" height="7" fill="#d99b70"/><rect x="18" y="38" width="4" height="7" fill="#d99b70"/>
    <rect x="8" y="44" width="7" height="3" fill="#ece8dc"/><rect x="17" y="44" width="7" height="3" fill="#ece8dc"/>
    <text x="16" y="26" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#171717">{number}</text>
  </svg>
}
function Metric({ label, value, note, icon: Icon }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><Icon size={17}/></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>
}
function PlayerCard({ player, onClick, rank }) {
  const stats = player.statistics?.[0] || {}
  const rating = Number(stats.games?.rating || 0)
  return <button className="player-card" onClick={onClick}>
    <div className="player-card-top"><span>#{player.number ?? '—'}</span>{rank && <b>{rank}</b>}</div>
    <PixelPlayer number={player.number || 0}/>
    <strong>{player.name}</strong><span className="player-position">{stats.games?.position || 'Kader'}</span>
    <div className="player-mini-stats"><span>TORE <b>{stats.goals?.total ?? 0}</b></span><span>ASSISTS <b>{stats.goals?.assists ?? 0}</b></span></div>
    {rating > 0 && <span className="player-rating">★ {rating.toFixed(2)}</span>}
  </button>
}
export default function App() {
  const [active, setActive] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState('API noch nicht verbunden')
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [apiError, setApiError] = useState('')
  const [search, setSearch] = useState('')
  const apiBase = import.meta.env.VITE_API_BASE

  async function loadPlayers() {
    if (!apiBase) { setApiStatus('API noch nicht verbunden'); return }
    setLoadingPlayers(true); setApiError('')
    try {
      const base = apiBase.replace(/\/$/, '')
      const first = await fetch(`${base}/api/players?team=${TEAM_ID}&season=${SEASON}&page=1`)
      if (!first.ok) throw new Error('Spielerdaten konnten nicht geladen werden')
      const data = await first.json()
      let all = data.response || []
      const pages = Math.min(Number(data.paging?.total || 1), 10)
      for (let page = 2; page <= pages; page++) {
        const response = await fetch(`${base}/api/players?team=${TEAM_ID}&season=${SEASON}&page=${page}`)
        if (!response.ok) break
        const next = await response.json()
        all = all.concat(next.response || [])
      }
      setPlayers(all.map(item => ({ ...item.player, statistics: item.statistics || [] })))
      setApiStatus('Echte Kaderdaten geladen')
    } catch (error) { setApiError(error.message); setApiStatus('Daten nicht erreichbar') }
    finally { setLoadingPlayers(false) }
  }
  useEffect(() => { if (active === 'squad' && players.length === 0) loadPlayers() }, [active])
  const ranked = useMemo(() => [...players].filter(p => Number(p.statistics?.[0]?.games?.rating) > 0).sort((a,b) => Number(b.statistics[0].games.rating)-Number(a.statistics[0].games.rating)), [players])
  const top = ranked.slice(0,3)
  const flop = [...ranked].reverse().slice(0,3)
  const filteredPlayers = players.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
  const title = selectedPlayer ? selectedPlayer.name : nav.find(item => item.id === active)?.label ?? 'Übersicht'

  function openSection(id) { setActive(id); setSelectedPlayer(null); setMenuOpen(false) }

  return <div className="app-shell">
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark">SGE</div><div><strong>SGE ANALYTICS</strong><span>PIXEL FOOTBALL MANAGER</span></div></div>
      <div className="side-label">SPIELWELT</div>
      <nav>{nav.map(({id,label,icon:Icon}) => <button key={id} className={active===id?'nav-item active':'nav-item'} onClick={()=>openSection(id)}><Icon size={18}/><span>{label}</span>{active===id&&<ChevronRight size={15} className="nav-arrow"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="club-chip"><div className="club-dot">✕</div><div><strong>Eintracht Frankfurt</strong><span>Bundesliga · Deutschland</span></div></div><span className="version">SGE ANALYTICS <b>v0.2.0</b></span></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">SGE PIXEL WORLD <span>/</span> {title.toUpperCase()}</div><div className="top-actions"><span className="season-pill">SAISON 2026/27</span><span className="status"><i/> {apiStatus}</span><button className="icon-button" onClick={loadPlayers} title="Spielerdaten aktualisieren"><Activity size={18}/></button></div></header>
      <div className="content">
        {selectedPlayer ? <section className="player-profile panel">
          <button className="back-button" onClick={()=>setSelectedPlayer(null)}><ArrowLeft size={16}/> ZURÜCK ZUM KADER</button>
          <div className="profile-hero"><PixelPlayer number={selectedPlayer.number || 0}/><div><span className="eyebrow">EINTRACHT FRANKFURT // SPIELERPROFIL</span><h1>{selectedPlayer.name}</h1><p>{selectedPlayer.statistics?.[0]?.games?.position || 'Position offen'} · Rückennummer {selectedPlayer.number ?? '—'}</p><span className="profile-nationality">{selectedPlayer.nationality || '—'} · {selectedPlayer.age ? selectedPlayer.age + ' Jahre' : 'Alter —'}</span></div></div>
          <div className="metric-grid"><Metric label="EINSÄTZE" value={selectedPlayer.statistics?.[0]?.games?.appearences ?? '—'} note="Saison" icon={Activity}/><Metric label="TORE" value={selectedPlayer.statistics?.[0]?.goals?.total ?? '—'} note="Erzielte Tore" icon={Crosshair}/><Metric label="VORLAGEN" value={selectedPlayer.statistics?.[0]?.goals?.assists ?? '—'} note="Assists" icon={Zap}/><Metric label="FORMWERT" value={Number(selectedPlayer.statistics?.[0]?.games?.rating || 0).toFixed(2)} note="Anbieterbewertung" icon={Star}/></div>
          <div className="panel profile-note"><h3>SPIELER-DOSSIER</h3><p>Die Spielerkarte wird mit offiziellen Saisonwerten befüllt, sobald die Fußball-API verbunden ist. Pixel-Porträts sind stilisierte Fan-Art und keine originalen Spielerfotos.</p></div>
        </section> : <>
          <section className="page-heading"><div><div className="eyebrow"><span className="red-line"/> THE EAGLES PIXEL WORLD</div><h1>{active==='overview'?'Adler im Fokus.':title+'.'}</h1><p>Eintracht Frankfurt als spielbare Pixel-Art-Fußballwelt.</p></div><div className="heading-date"><span>DATENSTATUS</span><strong>{players.length?'KADER GELADEN':'API BEREITSTELLEN'}</strong><small>{players.length+' Spieler im Speicher'}</small></div></section>

          {active==='overview' && <>
            <section className="hero-card"><div className="hero-copy"><div className="pixel-kicker">PIXEL ART EDITION // SGE 1899</div><div className="live-label"><i/> CLUB OVERVIEW</div><h2>Eintracht.<br/><em>Alles im Blick.</em></h2><p>Dein Pixel-Art-Fußballmanager rund um die Eintracht.</p><button className="primary-button" onClick={()=>openSection('squad')}>Kader entdecken <ArrowUpRight size={16}/></button></div><div className="hero-art"><img className="stadium-art" src={`${import.meta.env.BASE_URL}stadium-pixel.svg`} alt="Pixel-Art-Stadion in Frankfurt"/><div className="hero-caption">DEUTSCHE BANK PARK <span>·</span> FRANKFURT</div></div></section>
            <section className="metric-grid"><Metric label="KADERGRÖSSE" value={players.length||'—'} note="Spieler im Kader" icon={Users}/><Metric label="TOP-FORM" value={top[0]?.name?.split(' ').slice(-1)[0]||'—'} note="Bester Formwert" icon={Trophy}/><Metric label="FLOP-FORM" value={flop[0]?.name?.split(' ').slice(-1)[0]||'—'} note="Niedrigster Formwert" icon={Activity}/><Metric label="SAISON" value="26/27" note="Bundesliga" icon={Zap}/></section>
            <section className="form-rank-grid"><div className="panel rank-panel top-rank"><div className="panel-heading"><div><span className="eyebrow">HOT STREAK</span><h3>TOP 3 FORM</h3></div><Trophy/></div>{top.length?top.map((p,i)=><button className="rank-row" key={p.id} onClick={()=>setSelectedPlayer(p)}><b>0{i+1}</b><PixelPlayer number={p.number||0} small/><strong>{p.name}</strong><span>★ {Number(p.statistics[0].games.rating).toFixed(2)}</span></button>):<p className="empty-note">Wird angezeigt, sobald echte Spielerdaten geladen sind.</p>}</div>
            <div className="panel rank-panel flop-rank"><div className="panel-heading"><div><span className="eyebrow">NEEDS A BOOST</span><h3>FLOP 3 FORM</h3></div><Activity/></div>{flop.length?flop.map((p,i)=><button className="rank-row" key={p.id} onClick={()=>setSelectedPlayer(p)}><b>0{i+1}</b><PixelPlayer number={p.number||0} small/><strong>{p.name}</strong><span>★ {Number(p.statistics[0].games.rating).toFixed(2)}</span></button>):<p className="empty-note">Wird angezeigt, sobald echte Spielerdaten geladen sind.</p>}</div></section>
            <section className="panel training-teaser"><div><span className="eyebrow">LIVE FROM THE TRAINING GROUND</span><h3>Die Adler sind auf dem Platz.</h3><p>Schau den Pixel-Spielern beim Training zu.</p><button className="primary-button" onClick={()=>openSection('training')}>Zum Trainingsgelände <ArrowUpRight size={16}/></button></div><TrainingGround/></section>
          </>}
          {active==='squad' && <section className="panel squad-panel"><div className="panel-heading"><div><span className="eyebrow">FIRST TEAM // SEASON 2026/27</span><h3>Der komplette Profikader</h3></div><span className="demo-tag">{players.length} SPIELER</span></div><div className="squad-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler suchen …"/><button className="primary-button" onClick={loadPlayers}>{loadingPlayers?'LÄDT …':'KADER AKTUALISIEREN'}</button></div>{apiError&&<p className="error-note">{apiError}</p>}{loadingPlayers&&<p className="empty-note">Kaderdaten werden geladen …</p>}{!loadingPlayers&&!players.length&&<div className="empty-state"><PixelPlayer number={9}/><h3>Der Kader wartet auf die Datenverbindung</h3><p>Wenn der API-Football-Zugang eingerichtet ist, erscheinen hier automatisch alle Spieler inklusive Position, Nummer und Leistungsdaten.</p><button className="primary-button" onClick={loadPlayers}>ERNEUT VERSUCHEN</button></div>}<div className="squad-grid">{filteredPlayers.map(p=><PlayerCard key={p.id} player={p} onClick={()=>setSelectedPlayer(p)}/>)}</div></section>}
          {active==='training'&&<section className="training-page panel"><div className="panel-heading"><div><span className="eyebrow">TRAINING COMPLEX // FRANKFURT</span><h3>Trainingsgelände</h3></div><span className="demo-tag">PIXEL SIMULATION</span></div><p className="training-intro">Die Pixel-Adler arbeiten an Passspiel, Abschluss und Fitness.</p><TrainingGround large/><div className="training-drills"><div><b>01</b><strong>PASS-SPIEL</strong><span>Kurze Pässe im Dreieck</span></div><div><b>02</b><strong>TORABSCHLUSS</strong><span>Abschluss auf das Tor</span></div><div><b>03</b><strong>FITNESS</strong><span>Läufe und Sprinttraining</span></div></div></section>}
          {['lineup','matches','statistics'].includes(active)&&<section className="panel placeholder-panel"><div className="placeholder-icon">{active==='lineup'?<Shield/>:active==='matches'?<CalendarDays/>:<BarChart3/>}</div><span className="eyebrow">NÄCHSTES MODUL</span><h2>{title}</h2><p>Dieses Modul bekommt ebenfalls Pixel-Art-Elemente und echte Eintracht-Daten.</p><button className="primary-button" onClick={()=>openSection('overview')}>Zur Übersicht <ArrowUpRight size={16}/></button></section>}
        </>}
        <footer><span>SGE PIXEL WORLD <b>·</b> INOFFIZIELLES FAN-PROJEKT</span><span>MADE FOR THE EAGLES <span className="footer-cross">✕</span></span></footer>
      </div>
    </main>
  </div>
}
function TrainingGround({large=false}) {
  return <div className={large?'training-ground large':'training-ground'}><div className="training-sky"/><div className="training-fence"/><div className="training-pitch"><div className="pitch-line"/><div className="pitch-circle"/><div className="training-goal"/></div><div className="training-player p1"><PixelPlayer number={7} small/></div><div className="training-player p2"><PixelPlayer number={9} small/></div><div className="training-player p3"><PixelPlayer number={11} small/></div><div className="training-player p4"><PixelPlayer number={8} small/></div><div className="training-ball"/><div className="training-label">SGE TRAINING CAMP</div></div>
}
