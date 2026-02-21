import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';

/* ═══════════════════════════════════════════════
   AEGISOPS GOD-MODE DASHBOARD — FULLY LIVE
   ═══════════════════════════════════════════════ */

/* ── Sidebar Icons ─────────────────────────── */
const icons = {
    dashboard: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 7a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zM4 13a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"/></svg>),
    shield: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>),
    activity: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>),
    alert: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>),
    settings: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>),
    logout: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>),
};

/* ── WS URL (through cockpit nginx proxy) ──── */
const WS_URL = `ws://${window.location.host}/ws`;

/* ── Log colours by frame type ───────────────── */
const LOG_COLORS = {
    'incident.new':      'text-red-400',
    'status.update':     'text-blue-400',
    'ai.thinking':       'text-purple-400',
    'ai.stream':         'text-purple-300',
    'ai.complete':       'text-aegis-accent',
    'council.vote':      'text-yellow-400',
    'council.decision':  'text-yellow-300',
    'docker.action':     'text-orange-400',
    'scale.event':       'text-green-400',
    'health.check':      'text-cyan-400',
    'resolved':          'text-green-400',
    'failed':            'text-red-500',
    'metrics':           'text-gray-500',
    'container.list':    'text-gray-500',
    'heartbeat':         'text-gray-600',
};

/* ── Clock Hook ──────────────────────────────── */
function useClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);
    return time;
}

/* ── Nav Item ────────────────────────────────── */
function NavItem({ icon, label, active, onClick, badge }) {
    return (
        <button onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative
                ${active ? 'nav-active bg-aegis-accent/10 text-aegis-accent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
            <span className={active ? 'text-aegis-accent drop-shadow-[0_0_6px_rgba(9,216,199,0.6)]' : ''}>{icon}</span>
            <span className="hidden lg:inline">{label}</span>
            {badge > 0 && <span className="absolute right-2 top-2 min-w-[18px] h-[18px] rounded-full bg-aegis-danger text-[9px] text-white flex items-center justify-center font-bold">{badge}</span>}
        </button>
    );
}

/* ── Widget ──────────────────────────────────── */
function Widget({ title, children, className = '', badge }) {
    return (
        <div className={`glass-panel rounded-xl p-5 flex flex-col ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500">{title}</h3>
                {badge && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-aegis-accent/10 text-aegis-accent border border-aegis-accent/30">{badge}</span>}
            </div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}

/* ── Typewriter Text ─────────────────────────── */
function Typewriter({ text, speed = 20 }) {
    const [display, setDisplay] = useState('');
    useEffect(() => {
        setDisplay('');
        let i = 0;
        const t = setInterval(() => { setDisplay(p => p + (text[i] || '')); i++; if (i >= text.length) clearInterval(t); }, speed);
        return () => clearInterval(t);
    }, [text, speed]);
    return <>{display}<span className="typewriter-cursor" /></>;
}

/* ── Council Agent Icon ──────────────────────── */
function CouncilAgent({ emoji, label, approved }) {
    return (
        <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${approved ? 'scale-110' : 'opacity-40'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-500
                ${approved ? 'bg-green-500/20 border-2 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-gray-800/60 border border-gray-700'}`}>
                {emoji}
            </div>
            <span className={`text-[10px] font-mono ${approved ? 'text-green-400' : 'text-gray-600'}`}>{label}</span>
            {approved && <span className="text-[9px] text-green-400 font-bold">✓ APPROVED</span>}
        </div>
    );
}

/* ── Scale Visual ────────────────────────────── */
function ScaleVisual({ replicas }) {
    const count = Math.max(1, replicas);
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-lg bg-aegis-accent/15 border border-aegis-accent/40 flex items-center justify-center text-xs font-mono text-aegis-accent animate-fade-in"
                    style={{ animationDelay: `${i * 150}ms` }}>🖥️</div>
            ))}
            <span className="text-xs font-mono text-gray-400 ml-2">{count} instance{count > 1 ? 's' : ''}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD — EVERYTHING LIVE-WIRED
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const clock = useClock();
    const [activeNav, setActiveNav] = useState('dashboard');
    const logRef = useRef(null);

    /* ── Real connections ── */
    const { connected, messages, lastMessage } = useWebSocket(WS_URL);
    const { incidents, containers, metrics, topology, health, triggerScale } = useApi();

    /* ── Live state derived from WS ── */
    const [liveLog, setLiveLog] = useState([]);
    const [councilVotes, setCouncilVotes] = useState({ SRE: false, Security: false, Auditor: false });
    const [councilDecision, setCouncilDecision] = useState(null);
    const [currentAIText, setCurrentAIText] = useState('');
    const [replicas, setReplicas] = useState(1);
    const [resolvedCount, setResolvedCount] = useState(0);
    const [metricsHistory, setMetricsHistory] = useState([]);

    /* ── Process WS frames ── */
    useEffect(() => {
        if (!lastMessage) return;
        const { type, data, incident_id, timestamp } = lastMessage;
        const ts = timestamp
            ? new Date(timestamp).toLocaleTimeString('en-US', { hour12: false })
            : new Date().toLocaleTimeString('en-US', { hour12: false });

        const SKIP = ['metrics', 'container.list', 'heartbeat', 'topology'];
        if (!SKIP.includes(type)) {
            const msg = data?.message || data?.content || data?.chunk || data?.action || data?.status || data?.root_cause || JSON.stringify(data || {}).slice(0, 140);
            setLiveLog(prev => [{ ts, type, msg, incident_id }, ...prev].slice(0, 150));
        }

        switch (type) {
            case 'incident.new':
                setCouncilVotes({ SRE: false, Security: false, Auditor: false });
                setCouncilDecision(null);
                setCurrentAIText('');
                break;
            case 'ai.thinking':
                setCurrentAIText(data?.message || data?.content || '');
                break;
            case 'ai.stream':
                setCurrentAIText(prev => prev + (data?.chunk || data?.content || ''));
                break;
            case 'ai.complete':
                setCurrentAIText(data?.root_cause || data?.message || 'Analysis complete');
                break;
            case 'council.vote': {
                const a = (data?.agent || '').toLowerCase();
                if (a.includes('sre'))      setCouncilVotes(p => ({ ...p, SRE: data?.vote === 'APPROVE' || !!data?.approved }));
                if (a.includes('security')) setCouncilVotes(p => ({ ...p, Security: data?.vote === 'APPROVE' || !!data?.approved }));
                if (a.includes('auditor'))  setCouncilVotes(p => ({ ...p, Auditor: data?.vote === 'APPROVE' || !!data?.approved }));
                break;
            }
            case 'council.decision':
                setCouncilDecision(data);
                if (data?.approved) setCouncilVotes({ SRE: true, Security: true, Auditor: true });
                break;
            case 'scale.event':
                setReplicas(data?.replicas || data?.total || 1);
                break;
            case 'resolved':
                setResolvedCount(p => p + 1);
                break;
            case 'metrics':
                if (Array.isArray(data) && data.length) {
                    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                    const n = data.length;
                    const avgCpu = data.reduce((s, m) => s + (m.cpu_percent || 0), 0) / n;
                    const avgMem = data.reduce((s, m) => s + (m.mem_percent || 0), 0) / n;
                    setMetricsHistory(p => [...p.slice(-40), { time: now, cpu: +avgCpu.toFixed(1), mem: +avgMem.toFixed(1) }]);
                }
                break;
            default: break;
        }
    }, [lastMessage]);

    useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0; }, [liveLog]);

    /* ── Latest per-container metrics ── */
    const latestMetrics = useMemo(() => {
        const mf = messages.filter(m => m.type === 'metrics' && Array.isArray(m.data));
        return mf.length ? mf[mf.length - 1].data : [];
    }, [messages]);

    const systemHealth = useMemo(() => {
        if (!latestMetrics.length) return [{ label: 'CPU', value: 0, color: '#09D8C7' }, { label: 'Memory', value: 0, color: '#09D8C7' }];
        const n = latestMetrics.length;
        const cpu = Math.round(latestMetrics.reduce((s, m) => s + (m.cpu_percent || 0), 0) / n);
        const mem = Math.round(latestMetrics.reduce((s, m) => s + (m.mem_percent || 0), 0) / n);
        return [
            { label: 'Avg CPU', value: cpu, color: cpu > 80 ? '#DB0927' : '#09D8C7' },
            { label: 'Avg Memory', value: mem, color: mem > 80 ? '#DB0927' : '#09D8C7' },
        ];
    }, [latestMetrics]);

    /* ── Trigger demo ── */
    const triggerDemo = useCallback(async () => {
        const id = `DEMO-${Date.now().toString(36).toUpperCase()}`;
        try {
            await fetch('/api/webhook', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incident_id: id, container_name: 'buggy-app-v2', alert_type: 'Memory Leak', severity: 'CRITICAL',
                    logs: `Memory usage at 94.2%. Heap allocation growing. OOM killer imminent. Container ${id} nearing limits.`,
                    timestamp: new Date().toISOString() }),
            });
        } catch (e) { console.error('Trigger failed:', e); }
    }, []);

    const incidentCount = incidents.filter(i => !['RESOLVED', 'resolved'].includes(i.status)).length;
    const navItems = [
        { key: 'dashboard', icon: icons.dashboard, label: 'Dashboard' },
        { key: 'threats', icon: icons.shield, label: 'Incidents', badge: incidentCount },
        { key: 'activity', icon: icons.activity, label: 'Activity' },
        { key: 'alerts', icon: icons.alert, label: 'Alerts' },
        { key: 'settings', icon: icons.settings, label: 'Settings' },
    ];

    return (
        <div className="h-screen flex bg-aegis-bg grid-bg overflow-hidden">
            {/* Sidebar */}
            <aside className="w-16 lg:w-56 bg-aegis-panel/80 backdrop-blur-xl border-r border-white/5 flex flex-col py-4 shrink-0">
                <div className="px-4 mb-6 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-aegis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                    </div>
                    <span className="hidden lg:inline text-sm font-bold tracking-widest text-gray-200 font-mono">AEGIS<span className="text-aegis-accent">OPS</span></span>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                    {navItems.map(item => <NavItem key={item.key} icon={item.icon} label={item.label} active={activeNav === item.key} onClick={() => setActiveNav(item.key)} badge={item.badge} />)}
                </nav>
                <div className="px-2 mt-4"><NavItem icon={icons.logout} label="Logout" active={false} onClick={() => navigate('/')} /></div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 bg-aegis-panel/50 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-sm font-bold text-gray-200 tracking-wide">GOD MODE — COMMAND CENTER</h1>
                        <span className={`flex items-center gap-1.5 text-xs font-mono ${connected ? 'text-green-400' : 'text-red-400'}`}>
                            <span className={`status-dot ${connected ? 'healthy' : 'critical'}`} />
                            {connected ? 'LIVE' : 'OFFLINE'}
                        </span>
                        {health && <span className="text-[10px] font-mono text-gray-500">v{health.version} WS:{health.ws_clients}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={triggerDemo} className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer">⚡ TRIGGER INCIDENT</button>
                        <button onClick={() => triggerScale('up', 2)} className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-aegis-accent/10 border border-aegis-accent/30 text-aegis-accent hover:bg-aegis-accent/20 transition-all cursor-pointer">📈 SCALE UP</button>
                        <span className="text-xs font-mono text-gray-400">{clock.toLocaleTimeString('en-US', { hour12: false })}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center text-xs font-bold text-aegis-accent">OP</div>
                            <span className="hidden md:inline text-xs text-gray-400 font-mono">operator-01</span>
                        </div>
                    </div>
                </header>

                {/* Grid */}
                <main className="flex-1 p-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">

                        {/* System Health */}
                        <Widget title="System Health" badge={connected ? 'LIVE' : 'OFFLINE'}>
                            <div className="space-y-3">
                                {systemHealth.map(m => (
                                    <div key={m.label}>
                                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{m.label}</span><span className="font-mono" style={{ color: m.color }}>{m.value}%</span></div>
                                        <div className="h-2 bg-aegis-bg rounded-full overflow-hidden"><div className="h-full rounded-full metric-bar" style={{ width: `${m.value}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})`, boxShadow: `0 0 8px ${m.color}44` }} /></div>
                                    </div>
                                ))}
                                {latestMetrics.length > 0 && (
                                    <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                                        <span className="text-[10px] font-mono text-gray-600 uppercase">Per Container</span>
                                        {latestMetrics.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                                                <span className="text-gray-500 truncate max-w-[120px]">{(m.container || m.name || '').replace(/aegisops[-_]?/, '')}</span>
                                                <span className="text-aegis-accent">{(m.cpu_percent||0).toFixed(1)}%</span>
                                                <span className="text-purple-400">{(m.mem_percent||0).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Widget>

                        {/* Metrics Chart */}
                        <Widget title="CPU / Memory Over Time" badge="STREAMING" className="xl:col-span-2">
                            {metricsHistory.length > 2 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <AreaChart data={metricsHistory}>
                                        <defs>
                                            <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DB0927" stopOpacity={0.4}/><stop offset="100%" stopColor="#DB0927" stopOpacity={0}/></linearGradient>
                                            <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#09D8C7" stopOpacity={0.4}/><stop offset="100%" stopColor="#09D8C7" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveEnd" />
                                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ background: '#17364F', border: '1px solid rgba(9,216,199,0.3)', borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                                        <Area type="monotone" dataKey="cpu" stroke="#DB0927" fill="url(#gCpu)" strokeWidth={2} name="CPU %" />
                                        <Area type="monotone" dataKey="mem" stroke="#09D8C7" fill="url(#gMem)" strokeWidth={2} name="Mem %" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-[180px] flex items-center justify-center text-gray-600 text-xs font-mono">Collecting metrics…</div>)}
                        </Widget>

                        {/* Live Activity Feed */}
                        <Widget title="Live Activity" badge="WEBSOCKET" className="row-span-2 xl:row-span-2">
                            <div ref={logRef} className="space-y-1 overflow-y-auto max-h-[420px] pr-1 font-mono text-xs">
                                {liveLog.length === 0
                                    ? <div className="text-gray-600 text-center py-8">Waiting for events… Click ⚡ TRIGGER INCIDENT</div>
                                    : liveLog.map((l, i) => (
                                        <div key={`${l.ts}-${i}`} className={`flex gap-2 py-1.5 px-2 rounded hover:bg-white/5 ${i === 0 ? 'animate-fade-in' : ''}`}>
                                            <span className="text-gray-600 shrink-0 w-[60px]">{l.ts}</span>
                                            <span className={`text-[10px] px-1 py-0.5 rounded shrink-0 bg-white/5 ${LOG_COLORS[l.type] || 'text-gray-400'}`}>{l.type.split('.').pop().toUpperCase()}</span>
                                            <span className={`break-all ${LOG_COLORS[l.type] || 'text-gray-400'}`}>{typeof l.msg === 'string' ? l.msg : JSON.stringify(l.msg)}</span>
                                        </div>
                                    ))}
                            </div>
                        </Widget>

                        {/* AI Brain */}
                        <Widget title="AI Brain" badge={currentAIText ? 'ANALYZING' : 'IDLE'}>
                            <div className="bg-aegis-bg/60 rounded-lg p-4 font-mono text-xs min-h-[100px] max-h-[200px] overflow-y-auto">
                                {currentAIText
                                    ? <span className="text-purple-300"><Typewriter text={currentAIText} /></span>
                                    : <span className="text-gray-600">AI idle — trigger an incident…</span>}
                            </div>
                        </Widget>

                        {/* Safety Council */}
                        <Widget title="Safety Council" badge={councilDecision ? (councilDecision.approved ? '✓ APPROVED' : '✗ REJECTED') : 'WAITING'}>
                            <div className="flex items-center justify-around py-2">
                                <CouncilAgent emoji="🧠" label="SRE" approved={councilVotes.SRE} />
                                <CouncilAgent emoji="🛡️" label="Security" approved={councilVotes.Security} />
                                <CouncilAgent emoji="📝" label="Auditor" approved={councilVotes.Auditor} />
                            </div>
                            {councilDecision && (
                                <div className={`mt-3 text-center text-xs font-mono py-2 rounded-lg ${councilDecision.approved ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                    {councilDecision.approved ? '✓ MAJORITY CONSENSUS — ACTION AUTHORIZED' : '✗ ACTION DENIED'}
                                </div>
                            )}
                        </Widget>

                        {/* Containers */}
                        <Widget title="Containers" badge={`${containers.length} RUNNING`}>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {containers.length === 0
                                    ? <span className="text-gray-600 text-xs font-mono">Loading…</span>
                                    : containers.map((c, i) => (
                                        <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-aegis-bg/40 border border-white/5">
                                            <span className={`status-dot ${c.status === 'running' ? 'healthy' : 'critical'}`} />
                                            <span className="text-xs font-mono text-gray-300 truncate flex-1">{c.name}</span>
                                            <span className="text-[10px] font-mono text-gray-500">{c.status}</span>
                                        </div>
                                    ))}
                            </div>
                        </Widget>

                        {/* Scale Visual */}
                        <Widget title="Load Balancer / Replicas" badge={`${replicas} INSTANCE${replicas > 1 ? 'S' : ''}`}>
                            <ScaleVisual replicas={replicas} />
                            <div className="mt-3 flex gap-2">
                                <button onClick={() => triggerScale('up', 2)} className="flex-1 text-[10px] font-mono py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 cursor-pointer">▲ SCALE UP</button>
                                <button onClick={() => triggerScale('down')} className="flex-1 text-[10px] font-mono py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer">▼ SCALE DOWN</button>
                            </div>
                        </Widget>

                        {/* Incidents */}
                        <Widget title="Recent Incidents" badge={`${incidents.length} TOTAL`} className="xl:col-span-2">
                            <div className="space-y-2.5 max-h-[250px] overflow-y-auto">
                                {incidents.length === 0
                                    ? <span className="text-gray-600 text-xs font-mono">No incidents yet.</span>
                                    : incidents.slice(-8).reverse().map((inc, i) => (
                                        <div key={i} className={`rounded-lg p-3 border hover:scale-[1.01] transition-all ${
                                            ['FAILED','failed'].includes(inc.status) ? 'bg-[#500A1F]/60 border-aegis-danger/30'
                                            : ['RESOLVED','resolved'].includes(inc.status) ? 'bg-green-900/20 border-green-500/20'
                                            : 'bg-aegis-panel/40 border-white/5'}`}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                                    ['RESOLVED','resolved'].includes(inc.status) ? 'bg-green-500/20 text-green-400'
                                                    : ['FAILED','failed'].includes(inc.status) ? 'bg-aegis-danger/20 text-aegis-danger'
                                                    : 'bg-yellow-500/20 text-yellow-400'}`}>{(inc.status||'').toUpperCase()}</span>
                                                <span className="text-[10px] text-gray-500 font-mono">{inc.incident_id || inc.id || ''}</span>
                                                <span className="text-[10px] text-gray-600 font-mono ml-auto">{inc.alert_type || ''}</span>
                                            </div>
                                            <p className="text-xs text-gray-300 leading-relaxed truncate">{inc.analysis?.root_cause || inc.error || 'Processing…'}</p>
                                        </div>
                                    ))}
                            </div>
                        </Widget>

                        {/* Quick Stats */}
                        <Widget title="System Overview" className="md:col-span-2 xl:col-span-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Containers', value: containers.length || '…', icon: '🐳', color: 'text-aegis-accent' },
                                    { label: 'Incidents', value: incidents.length, icon: '⚡', color: 'text-yellow-400' },
                                    { label: 'Resolved', value: resolvedCount, icon: '✅', color: 'text-green-400' },
                                    { label: 'WS Clients', value: health?.ws_clients || '…', icon: '📡', color: 'text-aegis-accent' },
                                ].map(s => (
                                    <div key={s.label} className="text-center py-3 px-2 rounded-xl bg-aegis-bg/50 border border-white/5 hover:border-aegis-accent/20 transition-all">
                                        <div className="text-2xl mb-1">{s.icon}</div>
                                        <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </Widget>
                    </div>
                </main>
            </div>
        </div>
    );
}
