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
  const [sgeData, setSgeData] = useState(null)
  const [search, setSearch] = useState('')
  const [nextPlayerPage, setNextPlayerPage] = useState(1)
  const [hasMorePlayers, setHasMorePlayers] = useState(false)
  const apiBase = import.meta.env.VITE_API_BASE || 'https://sge-analytics-api.megazepp.workers.dev'

  async function loadPlayers() {
    if (loadingPlayers) return
    setLoadingPlayers(true); setApiError('')
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/sge.json?ts=${Date.now()}`)
      if (!response.ok) throw new Error(`Datendokument nicht erreichbar (${response.status})`)
      const data = await response.json()
      setSgeData(data)
      const incoming = (data.squad?.players || []).map((p, i) => ({
        id: `${p.number}-${i}`, name: p.name, number: p.number,
        nationality: p.nationality || '', age: p.age || null, statistics: []
      }))
      setPlayers(incoming)
      setApiStatus('Lokale Datendatei geladen')
    } catch (error) {
      setApiError(error.message || 'Datendokument konnte nicht geladen werden')
      setApiStatus('Daten nicht erreichbar')
    } finally { setLoadingPlayers(false) }
  }
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sge.json`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Snapshot fehlt')))
      .then(data => {
        setSgeData(data)
        setPlayers((data.squad?.players || []).map((p, i) => ({
          id: `${p.number}-${i}`, name: p.name, number: p.number,
          nationality: p.nationality || '', age: p.age || null, statistics: []
        })))
        setApiStatus('Lokale Datendatei geladen')
      })
      .catch(() => setApiStatus('Warte auf ersten Datenimport'))
  }, [])
  useEffect(() => { if (active === 'squad' && players.length === 0) loadPlayers() }, [active])
  const ranked = useMemo(() => [...players].filter(p => Number(p.statistics?.[0]?.games?.rating) > 0).sort((a,b) => Number(b.statistics[0].games.rating)-Number(a.statistics[0].games.rating)), [players])
  const top = ranked.slice(0,3)
  const flop = [...ranked].reverse().slice(0,3)
  const sgeMatches = sgeData?.matches || []
  const finishedMatches = sgeMatches.filter(m => m.matchIsFinished).sort((a,b) => new Date(b.matchDateTime) - new Date(a.matchDateTime))
  const upcomingMatches = sgeMatches.filter(m => !m.matchIsFinished).sort((a,b) => new Date(a.matchDateTime) - new Date(b.matchDateTime))
  const recentForm = finishedMatches.slice(0,5).map(m => { const home = (m.team1?.teamName || '').toLowerCase().includes('eintracht frankfurt'); const final = (m.matchResults || []).filter(x => x.resultTypeID === 2).slice(-1)[0]; if (!final) return null; const gf = home ? final.pointsTeam1 : final.pointsTeam2; const ga = home ? final.pointsTeam2 : final.pointsTeam1; return { match:m, gf, ga, outcome:gf>ga?'S':gf===ga?'U':'N' } }).filter(Boolean)
  const nextMatch = upcomingMatches[0]
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
      <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">SGE PIXEL WORLD <span>/</span> {title.toUpperCase()}</div><div className="top-actions"><span className="season-pill">SAISON 2026/27</span><span className="status"><i/> {apiStatus}</span>{active==='squad'&&<button className="icon-button" onClick={()=>loadPlayers()} title="Erste Kaderseite aktualisieren"><Activity size={18}/></button>}</div></header>
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
            <section className="metric-grid"><Metric label="KADERGRÖSSE" value={players.length||'—'} note="Spieler im Kader" icon={Users}/><Metric label="SIEGE" value={sgeData?.statistics?.wins ?? '—'} note="Saison 2026/27" icon={Trophy}/><Metric label="TORE" value={sgeData?.statistics?.goalsFor ?? '—'} note="Erzielt" icon={Crosshair}/><Metric label="SPIELE" value={sgeData?.statistics?.matchesPlayed ?? '—'} note="Abgeschlossen" icon={Zap}/></section>
            <section className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><span className="eyebrow">LETZTE SPIELE</span><h3>Aktuelle Form</h3></div><span className="demo-tag">ERGEBNISSE</span></div>{recentForm.length ? recentForm.map(({match,gf,ga,outcome})=><div className="rank-row" key={match.matchID}><b>{outcome}</b><strong>{match.team1?.shortName || match.team1?.teamName} – {match.team2?.shortName || match.team2?.teamName}</strong><span>{gf}:{ga}</span></div>) : <p className="empty-note">Noch keine bestätigten Ergebnisse vorhanden.</p>}</div><div className="panel"><div className="panel-heading"><div><span className="eyebrow">NÄCHSTES SPIEL</span><h3>Match Center</h3></div><CalendarDays/></div>{nextMatch ? <div className="next-match-card"><p>{new Date(nextMatch.matchDateTime).toLocaleString('de-DE',{dateStyle:'full',timeStyle:'short'})}</p><h2>{nextMatch.team1?.shortName || nextMatch.team1?.teamName} <span>vs.</span> {nextMatch.team2?.shortName || nextMatch.team2?.teamName}</h2><p>{nextMatch.group?.groupName || 'Bundesliga'}</p><button className="primary-button" onClick={()=>openSection('matches')}>Alle Spiele ansehen <ArrowUpRight size={16}/></button></div> : <p className="empty-note">Aktuell ist kein kommendes Spiel im Spielplan hinterlegt.</p>}</div></section>
            <section className="panel training-teaser"><div><span className="eyebrow">LIVE FROM THE TRAINING GROUND</span><h3>Die Adler sind auf dem Platz.</h3><p>Schau den Pixel-Spielern beim Training zu.</p><button className="primary-button" onClick={()=>openSection('training')}>Zum Trainingsgelände <ArrowUpRight size={16}/></button></div><TrainingGround/></section>
          </>}
          {active==='squad' && <section className="panel squad-panel"><div className="panel-heading"><div><span className="eyebrow">FIRST TEAM // SEASON 2026/27</span><h3>Der komplette Profikader</h3></div><span className="demo-tag">{players.length} SPIELER</span></div><div className="squad-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler suchen …"/><button className="primary-button" onClick={loadPlayers}>{loadingPlayers?'LÄDT …':'KADER AKTUALISIEREN'}</button></div>{apiError&&<p className="error-note">{apiError}</p>}{loadingPlayers&&<p className="empty-note">Kaderdaten werden geladen …</p>}{!loadingPlayers&&!players.length&&<div className="empty-state"><PixelPlayer number={9}/><h3>Der Kader wartet auf die Datenverbindung</h3><p>Wenn der API-Football-Zugang eingerichtet ist, erscheinen hier automatisch alle Spieler inklusive Position, Nummer und Leistungsdaten.</p><button className="primary-button" onClick={loadPlayers}>ERNEUT VERSUCHEN</button></div>}<div className="squad-grid">{filteredPlayers.map(p=><PlayerCard key={p.id} player={p} onClick={()=>setSelectedPlayer(p)}/>)}</div>{hasMorePlayers&&<button className="primary-button load-more" disabled={loadingPlayers} onClick={()=>loadPlayers({append:true})}>{loadingPlayers?'LÄDT …':'WEITERE SPIELER LADEN'}</button>}</section>}
          {active==='training'&&<section className="training-page panel"><div className="panel-heading"><div><span className="eyebrow">TRAINING COMPLEX // FRANKFURT</span><h3>Trainingsgelände</h3></div><span className="demo-tag">PIXEL SIMULATION</span></div><p className="training-intro">Die Pixel-Adler arbeiten an Passspiel, Abschluss und Fitness.</p><TrainingGround large/><div className="training-drills"><div><b>01</b><strong>PASS-SPIEL</strong><span>Kurze Pässe im Dreieck</span></div><div><b>02</b><strong>TORABSCHLUSS</strong><span>Abschluss auf das Tor</span></div><div><b>03</b><strong>FITNESS</strong><span>Läufe und Sprinttraining</span></div></div></section>}
          {active==='lineup'&&<section className="panel placeholder-panel"><div className="placeholder-icon"><Shield/></div><span className="eyebrow">STARTING XI</span><h2>Offizielle Aufstellung</h2><p>{sgeData?.lineup?.note || 'Die Aufstellung erscheint hier, sobald sie offiziell veröffentlicht wurde.'}</p><span className="demo-tag">{sgeData?.lineup?.status === 'not_published' ? 'NOCH NICHT VERÖFFENTLICHT' : 'DATENSTATUS OFFEN'}</span></section>}
          {active==='matches'&&<section className="panel squad-panel"><div className="panel-heading"><div><span className="eyebrow">BUNDESLIGA // SAISON 2026/27</span><h3>Eintracht-Spielplan & Ergebnisse</h3></div><span className="demo-tag">{sgeData?.matches?.length || 0} SPIELE</span></div><div className="match-list">{(sgeData?.matches || []).slice().sort((a,b)=>new Date(a.matchDateTime)-new Date(b.matchDateTime)).map(m=>{const home=m.team1?.teamName||'—';const away=m.team2?.teamName||'—';const final=(m.matchResults||[]).filter(x=>x.resultTypeID===2).slice(-1)[0];return <div className="rank-row" key={m.matchID}><b>{m.group?.groupName || 'BL'}</b><strong>{home} – {away}</strong><span>{final ? `${final.pointsTeam1} : ${final.pointsTeam2}` : new Date(m.matchDateTime).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})}</span></div>})}</div></section>}
          {active==='statistics'&&<section className="panel squad-panel"><div className="panel-heading"><div><span className="eyebrow">SAISON 2026/27 // DATENBASIERT</span><h3>Eintracht-Statistiken</h3></div><span className="demo-tag">OPENLIGADB</span></div><div className="metric-grid"><Metric label="SPIELE" value={sgeData?.statistics?.matchesPlayed ?? '—'} note="Abgeschlossen" icon={Activity}/><Metric label="SIEGE" value={sgeData?.statistics?.wins ?? '—'} note="Bundesliga" icon={Trophy}/><Metric label="UNENTSCHIEDEN" value={sgeData?.statistics?.draws ?? '—'} note="Bundesliga" icon={BarChart3}/><Metric label="NIEDERLAGEN" value={sgeData?.statistics?.losses ?? '—'} note="Bundesliga" icon={Activity}/><Metric label="TORE" value={sgeData?.statistics?.goalsFor ?? '—'} note="Erzielt" icon={Crosshair}/><Metric label="GEGENTORE" value={sgeData?.statistics?.goalsAgainst ?? '—'} note="Kassiert" icon={Shield}/></div><h3>Bundesliga-Tabelle</h3><div className="match-list">{(sgeData?.table || []).map((t,i)=><div className="rank-row" key={t.team?.teamId || i}><b>{t.team?.teamName || t.teamName || i+1}</b><strong>{t.points ?? t.pointsTeam ?? '—'} Punkte</strong><span>{t.matches ?? t.matchesPlayed ?? ''} Spiele</span></div>)}</div><h3>Torschützen</h3><div className="match-list">{(sgeData?.scorers || []).slice(0,10).map((p,i)=><div className="rank-row" key={p.goalGetterId || i}><b>{p.goalGetterName || p.playerName || 'Spieler'}</b><strong>{p.goalCount ?? p.goals ?? '—'} Tore</strong><span>{p.teamName || ''}</span></div>)}</div></section>}
        </>}
        <footer><span>SGE PIXEL WORLD <b>·</b> INOFFIZIELLES FAN-PROJEKT</span><span>MADE FOR THE EAGLES <span className="footer-cross">✕</span></span></footer>
      </div>
    </main>
  </div>
}
function TrainingGround({large=false}) {
  return <div className={large?'training-ground sge-training large':'training-ground sge-training'} aria-label="Pixel-Art-Trainingsplatz der Eintracht">
    <div className="training-backdrop"><div className="training-cloud cloud-a"/><div className="training-cloud cloud-b"/><div className="training-stand"><span>EINTRACHT FRANKFURT</span><i/><i/><i/></div><div className="training-tree tree-a"/><div className="training-tree tree-b"/></div>
    <div className="training-floodlights"><i/><i/><i/><i/></div>
    <div className="sge-field"><div className="field-half"/><div className="field-circle"/><div className="field-box box-left"/><div className="field-box box-right"/><div className="field-goal goal-left"/><div className="field-goal goal-right"/><div className="field-stripe stripe-a"/><div className="field-stripe stripe-b"/></div>
    <div className="training-cone cone-a"/><div className="training-cone cone-b"/><div className="training-cone cone-c"/>
    <div className="training-player p1"><PixelPlayer number={7}/><span>7</span></div><div className="training-player p2"><PixelPlayer number={9}/><span>9</span></div><div className="training-player p3"><PixelPlayer number={11}/><span>11</span></div><div className="training-player p4"><PixelPlayer number={8}/><span>8</span></div>
    <div className="training-ball ball-one"/><div className="training-ball ball-two"/>
    <div className="training-scoreboard"><b>SGE</b><span>TRAINING DAY</span><strong>1899</strong></div>
    <div className="training-scene-caption">DEUTSCHE BANK PARK · TRAININGSPLATZ</div>
  </div>
}
