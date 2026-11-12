import { useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, CalendarDays, ChevronRight, CircleDot, Clock3, Crosshair, LayoutDashboard, Menu, Shield, Users, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const form = [
  { match: 'Eintracht Frankfurt – SC Freiburg', date: 'Letztes Spiel', result: '2 : 1', outcome: 'win' },
  { match: 'Bayer 04 Leverkusen – Eintracht Frankfurt', date: 'Vorheriges Spiel', result: '3 : 1', outcome: 'loss' },
  { match: 'Eintracht Frankfurt – 1. FC Köln', date: 'Vorheriges Spiel', result: '2 : 0', outcome: 'win' },
  { match: 'VfB Stuttgart – Eintracht Frankfurt', date: 'Vorheriges Spiel', result: '1 : 1', outcome: 'draw' },
  { match: 'Eintracht Frankfurt – Mainz 05', date: 'Vorheriges Spiel', result: '3 : 2', outcome: 'win' },
]

const trend = [
  { game: 'S1', points: 1.8 }, { game: 'S2', points: 2.1 }, { game: 'S3', points: 1.7 },
  { game: 'S4', points: 2.5 }, { game: 'S5', points: 2.9 }, { game: 'S6', points: 2.6 },
  { game: 'S7', points: 3.2 }, { game: 'S8', points: 3.5 },
]

const nav = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
  { id: 'squad', label: 'Kader & Spieler', icon: Users },
  { id: 'lineup', label: 'Starting XI', icon: Shield },
  { id: 'matches', label: 'Match Center', icon: CalendarDays },
  { id: 'statistics', label: 'Statistiken', icon: BarChart3 },
]

function Metric({ label, value, note, icon: Icon }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><Icon size={17} /></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>
}

export default function App() {
  const [active, setActive] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiStatus, setApiStatus] = useState('Demo-Modus')

  async function checkApi() {
    const base = import.meta.env.VITE_API_BASE
    if (!base) { setApiStatus('API noch nicht verbunden'); return }
    setRefreshing(true)
    try {
      const response = await fetch(base.replace(/\/$/, '') + '/api/health')
      if (!response.ok) throw new Error('API nicht erreichbar')
      setApiStatus('Backend verbunden')
    } catch { setApiStatus('Backend nicht erreichbar') }
    finally { setRefreshing(false) }
  }

  const title = nav.find(item => item.id === active)?.label ?? 'Übersicht'

  return <div className="app-shell">
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark">SGE</div><div><strong>SGE ANALYTICS</strong><span>PERFORMANCE HUB</span></div></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(id); setMenuOpen(false) }}><Icon size={18}/><span>{label}</span>{active === id && <ChevronRight size={15} className="nav-arrow"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="club-chip"><div className="club-dot">✕</div><div><strong>Eintracht Frankfurt</strong><span>Bundesliga · Deutschland</span></div></div><span className="version">SGE ANALYTICS <b>v0.1.0</b></span></div>
    </aside>

    <main className="main">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">SGE ANALYTICS <span>/</span> {title.toUpperCase()}</div><div className="top-actions"><span className="season-pill">SAISON 2026/27</span><span className="status"><i/> {apiStatus}</span><button className="icon-button" onClick={checkApi} title="Backend-Verbindung prüfen"><Activity size={18}/></button></div></header>
      <div className="content">
        <section className="page-heading"><div><div className="eyebrow"><span className="red-line"/> THE EAGLES PERFORMANCE HUB</div><h1>{active === 'overview' ? 'Adler im Fokus.' : title + '.'}</h1><p>Alle wichtigen Leistungsdaten der Eintracht. Ein Blick. Volle Analyse.</p></div><div className="heading-date"><span>DATENSTATUS</span><strong>DEMO-DATEN</strong><small>API-Anbindung folgt</small></div></section>

        {active === 'overview' && <>
          <section className="hero-card"><div className="hero-copy"><div className="pixel-kicker">PIXEL ART EDITION // SGE 1899</div><div className="live-label"><i/> CLUB OVERVIEW</div><h2>Eintracht.<br/><em>Alles im Blick.</em></h2><p>Das zentrale Analyse-Dashboard für Kader, Performance und Spieltagsdaten der SGE.</p><button className="primary-button" onClick={() => setActive('lineup')}>Startelf ansehen <ArrowUpRight size={16}/></button></div><div className="hero-art"><img className="stadium-art" src={`${import.meta.env.BASE_URL}stadium-pixel.svg`} alt="Pixel-Art-Illustration des Deutsche Bank Park in Frankfurt"/><div className="hero-caption">DEUTSCHE BANK PARK <span>·</span> FRANKFURT</div></div><div className="hero-index">01 <span>/ 05</span></div></section>
          <section className="metric-grid"><Metric label="TABELLENPLATZ" value="—" note="Wird mit API-Daten geladen" icon={BarChart3}/><Metric label="PUNKTE" value="—" note="Aktuelle Saison" icon={Zap}/><Metric label="TORE" value="—" note="Erzielte Saisontore" icon={Crosshair}/><Metric label="FORM (LETZTE 5)" value="—" note="Noch keine Live-Daten" icon={Activity}/></section>
          <section className="dashboard-grid"><div className="panel form-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT PERFORMANCE</span><h3>Letzte Ergebnisse</h3></div><span className="demo-tag">BEISPIELDATEN</span></div><div className="form-list">{form.map((item, index) => <div className="form-row" key={index}><div className={'result-dot ' + item.outcome}/><div className="form-match"><strong>{item.match}</strong><span>{item.date}</span></div><b className="score">{item.result}</b></div>)}</div></div>
          <div className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">PERFORMANCE TREND</span><h3>Form-Entwicklung</h3></div><span className="chart-unit">INDEX</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e12632" stopOpacity={0.3}/><stop offset="100%" stopColor="#e12632" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#292929" vertical={false}/><XAxis dataKey="game" stroke="#666" tickLine={false} axisLine={false}/><YAxis hide domain={[0,4]}/><Tooltip contentStyle={{background:'#171717',border:'1px solid #333',borderRadius:8}}/><Area type="monotone" dataKey="points" stroke="#e12632" strokeWidth={2.5} fill="url(#redFill)"/></AreaChart></ResponsiveContainer></div><p className="chart-footnote">Illustrativer Index – keine offiziellen Spieldaten.</p></div></section>
        </>}

        {active !== 'overview' && <section className="panel placeholder-panel"><div className="placeholder-icon">{active === 'squad' ? <Users/> : active === 'lineup' ? <Shield/> : active === 'matches' ? <CalendarDays/> : <BarChart3/>}</div><span className="eyebrow">MODULE IN VORBEREITUNG</span><h2>{title}</h2><p>Dieses Modul wird im nächsten Entwicklungsschritt mit echten Eintracht-Daten aus der Fußball-API verbunden.</p><button className="primary-button" onClick={() => setActive('overview')}>Zur Übersicht <ArrowUpRight size={16}/></button></section>}
        <footer><span>SGE ANALYTICS <b>·</b> INOFFIZIELLES FAN-PROJEKT</span><span>MADE FOR THE EAGLES <span className="footer-cross">✕</span></span></footer>
      </div>
    </main>
  </div>
}