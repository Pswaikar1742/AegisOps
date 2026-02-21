import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
import { sanitizeText } from '../utils/textSanitize';

/* ═══════════════════════════════════════════════
   AEGISOPS GOD-MODE DASHBOARD v3 — PRO MAX
   ═══════════════════════════════════════════════ */

const WS_URL = `ws://${window.location.host}/ws`;

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

const SEVERITY = { CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40', HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40', MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };

/* ── Helper: extract readable msg from any WS frame ── */
function extractMsg(type, data) {
    if (!data) return '';
    if (typeof data === 'string') return data;
    switch (type) {
        case 'incident.new':     return `🚨 ${data.alert_type || 'Incident'}: ${data.incident_id || ''}`;
        case 'status.update':    return data.message || data.status || '';
        case 'ai.thinking':      return data.message || data.content || '🧠 Thinking…';
        case 'ai.stream':        return data.chunk || data.content || '';
        case 'ai.complete':      return data.analysis ? `✅ ${sanitizeText(data.analysis.root_cause)} → ${data.analysis.action}` : (data.message || 'Analysis complete');
        case 'council.vote':     return data.vote ? `${data.vote.role}: ${data.vote.verdict} — ${(data.vote.reasoning||'').slice(0,80)}` : JSON.stringify(data).slice(0,100);
        case 'council.decision': return data.decision ? `${data.decision.final_verdict}: ${data.decision.summary||''}` : JSON.stringify(data).slice(0,100);
        case 'docker.action':    return `🐳 ${data.action} → ${data.container || ''}`;
        case 'scale.event':      return data.event ? `Scaled to ${data.event.replica_count} replicas` : `Scaled to ${data.replica_count || '?'} replicas`;
        case 'health.check':     return `Attempt ${data.attempt || '?'}: ${data.healthy ? '✅ Healthy' : '❌ Unhealthy'}`;
        case 'resolved':         return data.message || `Resolved at ${data.resolved_at || 'now'}`;
        case 'failed':           return `❌ ${data.error || 'Failed'}`;
        default:                 return data.message || data.status || data.error || JSON.stringify(data).slice(0,120);
    }
}

/* ── Hooks ── */
function useClock() {
    const [t, setT] = useState(new Date());
    useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
    return t;
}

/* ── Icons ── */
const I = {
    dash: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 7a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zM4 13a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"/></svg>,
    shield: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
    activity: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
    alert: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
    gear: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    logout: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
};

/* ── Sidebar Nav ── */
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

/* ── Glass Widget ── */
function W({ title, children, className = '', badge, actions }) {
    return (
        <div className={`glass-panel rounded-xl p-5 flex flex-col ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500">{title}</h3>
                <div className="flex items-center gap-2">
                    {actions}
                    {badge && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-aegis-accent/10 text-aegis-accent border border-aegis-accent/30">{badge}</span>}
                </div>
            </div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}

/* ── Typewriter ── */
function Typewriter({ text, speed = 18 }) {
    const [d, setD] = useState('');
    useEffect(() => {
        setD(''); let i = 0;
        const t = setInterval(() => { setD(p => p + (text[i]||'')); i++; if(i>=text.length) clearInterval(t); }, speed);
        return () => clearInterval(t);
    }, [text, speed]);
    return <>{d}<span className="typewriter-cursor" /></>;
}

/* ── Council Agent ── */
function CouncilAgent({ emoji, label, approved, reasoning }) {
    return (
        <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${approved ? 'scale-110' : 'opacity-40'}`} title={reasoning || ''}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-500
                ${approved ? 'bg-green-500/20 border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-gray-800/60 border border-gray-700'}`}>
                {emoji}
            </div>
            <span className={`text-[10px] font-mono font-bold ${approved ? 'text-green-400' : 'text-gray-600'}`}>{label}</span>
            {approved && <span className="text-[9px] text-green-400 font-bold animate-fade-in">✓ APPROVED</span>}
        </div>
    );
}

/* ── Scale Visual ── */
function ScaleVisual({ replicas }) {
    const c = Math.max(1, replicas);
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: c }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-lg bg-aegis-accent/15 border border-aegis-accent/40 flex items-center justify-center text-sm font-mono text-aegis-accent animate-fade-in"
                    style={{ animationDelay: `${i*120}ms` }}>🖥️</div>
            ))}
            <span className="text-xs font-mono text-gray-400 ml-2">{c} instance{c>1?'s':''}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const clock = useClock();
    const [activeNav, setActiveNav] = useState('dashboard');
    const logRef = useRef(null);

    const { connected, messages, lastMessage } = useWebSocket(WS_URL);
    const { incidents, containers, metrics, topology, health, triggerScale, refresh } = useApi();

    /* ── Live state ── */
    const [liveLog, setLiveLog] = useState([]);
    const [councilVotes, setCouncilVotes] = useState({});
    const [councilDecision, setCouncilDecision] = useState(null);
    const [currentAIText, setCurrentAIText] = useState('');
    const [aiStatus, setAiStatus] = useState('idle');
    const [replicas, setReplicas] = useState(1);
    const [resolvedCount, setResolvedCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [metricsHistory, setMetricsHistory] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);

    /* ── WS Frame Processor — FIXED to match backend shapes ── */
    useEffect(() => {
        if (!lastMessage) return;
        const { type, data, incident_id, timestamp } = lastMessage;
        const ts = timestamp ? new Date(timestamp).toLocaleTimeString('en-US',{hour12:false}) : new Date().toLocaleTimeString('en-US',{hour12:false});

        /* Log everything except noisy frames */
        const SKIP = ['metrics','container.list','heartbeat','topology'];
        if (!SKIP.includes(type)) {
            const msg = extractMsg(type, data);
            setLiveLog(prev => [{ ts, type, msg, incident_id: incident_id || data?.incident_id }, ...prev].slice(0, 200));
        }

        switch (type) {
            case 'incident.new':
                setCouncilVotes({});
                setCouncilDecision(null);
                setCurrentAIText('');
                setAiStatus('thinking');
                break;
            case 'ai.thinking':
                setCurrentAIText(data?.message || data?.content || '');
                setAiStatus('thinking');
                break;
            case 'ai.stream':
                setCurrentAIText(prev => prev + (data?.chunk || data?.content || ''));
                setAiStatus('streaming');
                break;
            case 'ai.complete':
                /* Backend sends: { analysis: { root_cause, action, ... } } */
                setCurrentAIText(data?.analysis
                    ? sanitizeText(`Root Cause: ${data.analysis.root_cause}\nAction: ${data.analysis.action}\nConfidence: ${(Math.max(0, Math.min(1, Number(data.analysis.confidence)||0))*100).toFixed(0)}%\nJustification: ${data.analysis.justification||''}`)
                    : (data?.message || 'Analysis complete'));
                setAiStatus('complete');
                break;
            case 'council.vote': {
                /* Backend sends: { vote: { role, verdict, reasoning } } */
                const v = data?.vote;
                if (v) {
                    const role = (v.role||'').toUpperCase();
                    setCouncilVotes(prev => ({ ...prev, [role]: { verdict: v.verdict, reasoning: v.reasoning } }));
                }
                break;
            }
            case 'council.decision': {
                /* Backend sends: { decision: { final_verdict, consensus, summary, votes } } */
                const d = data?.decision;
                if (d) {
                    setCouncilDecision(d);
                    if (d.final_verdict === 'APPROVED') {
                        setCouncilVotes(prev => {
                            const next = {...prev};
                            (d.votes||[]).forEach(v => { next[v.role] = { verdict: v.verdict, reasoning: v.reasoning }; });
                            return next;
                        });
                    }
                }
                break;
            }
            case 'scale.event':
                /* Pipeline sends { event: { replica_count } }, manual sends { replica_count } */
                setReplicas(data?.event?.replica_count || data?.replica_count || 1);
                break;
            case 'resolved':
                setResolvedCount(p => p + 1);
                setAiStatus('idle');
                break;
            case 'failed':
                setFailedCount(p => p + 1);
                setAiStatus('idle');
                break;
            case 'metrics':
                /* Backend sends array of { name, cpu_percent, memory_percent, ... } */
                if (Array.isArray(data) && data.length) {
                    const now = new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
                    const n = data.length;
                    const avgCpu = data.reduce((s,m) => s + (m.cpu_percent||0), 0) / n;
                    const avgMem = data.reduce((s,m) => s + (m.memory_percent||0), 0) / n;
                    setMetricsHistory(p => [...p.slice(-60), { time: now, cpu: +avgCpu.toFixed(1), mem: +avgMem.toFixed(1) }]);
                }
                break;
            default: break;
        }
    }, [lastMessage]);

    useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0; }, [liveLog]);

    /* ── Derived data ── */
    const latestMetrics = useMemo(() => {
        const mf = messages.filter(m => m.type === 'metrics' && Array.isArray(m.data));
        return mf.length ? mf[mf.length - 1].data : [];
    }, [messages]);

    const systemHealth = useMemo(() => {
        if (!latestMetrics.length) return [{ label: 'CPU', value: 0, color: '#09D8C7' }, { label: 'Memory', value: 0, color: '#09D8C7' }];
        const n = latestMetrics.length;
        const cpu = Math.round(latestMetrics.reduce((s,m) => s + (m.cpu_percent||0), 0) / n);
        const mem = Math.round(latestMetrics.reduce((s,m) => s + (m.memory_percent||0), 0) / n);
        return [
            { label: 'Avg CPU', value: cpu, color: cpu > 80 ? '#DB0927' : cpu > 50 ? '#f59e0b' : '#09D8C7' },
            { label: 'Avg Memory', value: mem, color: mem > 80 ? '#DB0927' : mem > 50 ? '#f59e0b' : '#09D8C7' },
        ];
    }, [latestMetrics]);

    const activeIncidents = useMemo(() => incidents.filter(i => !['RESOLVED','resolved'].includes(i.status)), [incidents]);

    const triggerDemo = useCallback(async () => {
        const types = ['Memory Leak','CPU Spike','Disk Full','Network Timeout','OOM Kill'];
        const sev = ['CRITICAL','HIGH','MEDIUM'];
        const id = `INC-${Date.now().toString(36).toUpperCase()}`;
        const at = types[Math.floor(Math.random()*types.length)];
        const sv = sev[Math.floor(Math.random()*sev.length)];
        try {
            await fetch('/api/webhook', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ incident_id: id, container_name: 'buggy-app-v2', alert_type: at, severity: sv,
                    logs: `${at} detected. Usage critical. Container ${id} nearing limits. Immediate action required.`,
                    timestamp: new Date().toISOString() }),
            });
        } catch (e) { console.error('Trigger failed:', e); }
    }, []);

    const navItems = [
        { key: 'dashboard', icon: I.dash, label: 'Dashboard' },
        { key: 'incidents', icon: I.shield, label: 'Incidents', badge: activeIncidents.length },
        { key: 'activity', icon: I.activity, label: 'Activity' },
        { key: 'alerts', icon: I.alert, label: 'Alerts', badge: failedCount },
        { key: 'settings', icon: I.gear, label: 'Settings' },
    ];

    /* ═══════════════════════════════════════
       VIEW RENDERERS — each nav = real view
       ═══════════════════════════════════════ */

    const renderDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
            {/* Quick Stats Row */}
            <W title="System Overview" className="md:col-span-2 xl:col-span-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label:'Containers', value: containers.length||'…', icon:'🐳', color:'text-aegis-accent' },
                        { label:'Active Incidents', value: activeIncidents.length, icon:'🔥', color: activeIncidents.length>0?'text-red-400':'text-green-400' },
                        { label:'Resolved', value: resolvedCount || incidents.filter(i=>['RESOLVED','resolved'].includes(i.status)).length, icon:'✅', color:'text-green-400' },
                        { label:'Failed', value: failedCount || incidents.filter(i=>['FAILED','failed'].includes(i.status)).length, icon:'💀', color:'text-red-400' },
                        { label:'WS Clients', value: health?.ws_clients||'…', icon:'📡', color:'text-aegis-accent' },
                    ].map(s => (
                        <div key={s.label} className="text-center py-3 px-2 rounded-xl bg-aegis-bg/50 border border-white/5 hover:border-aegis-accent/20 transition-all">
                            <div className="text-xl mb-1">{s.icon}</div>
                            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                            <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </W>

            {/* System Health */}
            <W title="System Health" badge={connected ? 'LIVE' : 'OFFLINE'}>
                <div className="space-y-3">
                    {systemHealth.map(m => (
                        <div key={m.label}>
                            <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{m.label}</span><span className="font-mono font-bold" style={{color:m.color}}>{m.value}%</span></div>
                            <div className="h-2.5 bg-aegis-bg rounded-full overflow-hidden"><div className="h-full rounded-full metric-bar" style={{width:`${Math.max(m.value,1)}%`,background:`linear-gradient(90deg,${m.color}88,${m.color})`,boxShadow:`0 0 8px ${m.color}44`}} /></div>
                        </div>
                    ))}
                    {latestMetrics.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Per Container</span>
                            {latestMetrics.map((m,i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] font-mono py-0.5">
                                    <span className="text-gray-400 truncate max-w-[110px]">{(m.name||'').replace(/aegisops[-_]?/,'')}</span>
                                    <div className="flex gap-4">
                                        <span className="text-aegis-accent">{(m.cpu_percent||0).toFixed(1)}% <span className="text-gray-600">cpu</span></span>
                                        <span className="text-purple-400">{(m.memory_percent||0).toFixed(1)}% <span className="text-gray-600">mem</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </W>

            {/* Metrics Chart */}
            <W title="CPU / Memory Over Time" badge="STREAMING" className="xl:col-span-2">
                {metricsHistory.length > 2 ? (
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={metricsHistory}>
                            <defs>
                                <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DB0927" stopOpacity={0.4}/><stop offset="100%" stopColor="#DB0927" stopOpacity={0}/></linearGradient>
                                <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#09D8C7" stopOpacity={0.4}/><stop offset="100%" stopColor="#09D8C7" stopOpacity={0}/></linearGradient>
                            </defs>
                            <XAxis dataKey="time" tick={{fontSize:9,fill:'#6b7280'}} axisLine={false} tickLine={false} interval="preserveEnd" />
                            <YAxis tick={{fontSize:9,fill:'#6b7280'}} axisLine={false} tickLine={false} width={28} domain={[0,100]} />
                            <Tooltip contentStyle={{background:'#17364F',border:'1px solid rgba(9,216,199,0.3)',borderRadius:8,fontSize:11,fontFamily:'JetBrains Mono'}} />
                            <Area type="monotone" dataKey="cpu" stroke="#DB0927" fill="url(#gCpu)" strokeWidth={2} name="CPU %" dot={false} />
                            <Area type="monotone" dataKey="mem" stroke="#09D8C7" fill="url(#gMem)" strokeWidth={2} name="Mem %" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (<div className="h-[180px] flex items-center justify-center text-gray-600 text-xs font-mono animate-pulse">Collecting metrics data…</div>)}
            </W>

            {/* Live Activity */}
            <W title="Live Activity" badge="WEBSOCKET" className="row-span-2">
                <div ref={logRef} className="space-y-0.5 overflow-y-auto max-h-[420px] pr-1 font-mono text-[11px]">
                    {liveLog.length === 0
                        ? <div className="text-gray-600 text-center py-12">Waiting for events…<br/><span className="text-gray-700 text-[10px]">Click ⚡ TRIGGER INCIDENT above</span></div>
                        : liveLog.map((l,i) => (
                            <div key={`${l.ts}-${i}`} className={`flex gap-2 py-1 px-2 rounded hover:bg-white/5 ${i===0?'animate-fade-in bg-white/[0.03]':''}`}>
                                <span className="text-gray-600 shrink-0 w-[56px]">{l.ts}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 bg-white/5 whitespace-nowrap ${LOG_COLORS[l.type]||'text-gray-400'}`}>{l.type.split('.').pop().toUpperCase()}</span>
                                <span className={`break-all leading-relaxed ${LOG_COLORS[l.type]||'text-gray-400'}`}>{typeof l.msg === 'string' ? l.msg : JSON.stringify(l.msg)}</span>
                            </div>
                        ))}
                </div>
            </W>

            {/* AI Brain */}
            <W title="AI Brain" badge={aiStatus === 'idle' ? 'IDLE' : aiStatus === 'complete' ? '✓ DONE' : '⚡ ANALYZING'}>
                <div className={`bg-aegis-bg/60 rounded-lg p-4 font-mono text-xs min-h-[120px] max-h-[200px] overflow-y-auto border ${aiStatus !== 'idle' ? 'border-purple-500/30' : 'border-transparent'}`}>
                    {currentAIText
                        ? <span className="text-purple-300 whitespace-pre-wrap"><Typewriter text={currentAIText} /></span>
                        : <span className="text-gray-600 italic">AI engine idle — trigger an incident to see analysis…</span>}
                </div>
            </W>

            {/* Safety Council */}
            <W title="Safety Council" badge={councilDecision ? (councilDecision.final_verdict === 'APPROVED' ? '✓ APPROVED' : '✗ REJECTED') : 'WAITING'}>
                <div className="flex items-center justify-around py-3">
                    <CouncilAgent emoji="🧠" label="SRE" approved={councilVotes.SRE_AGENT?.verdict==='APPROVED'} reasoning={councilVotes.SRE_AGENT?.reasoning} />
                    <CouncilAgent emoji="🛡️" label="Security" approved={councilVotes.SECURITY_OFFICER?.verdict==='APPROVED'} reasoning={councilVotes.SECURITY_OFFICER?.reasoning} />
                    <CouncilAgent emoji="📋" label="Auditor" approved={councilVotes.AUDITOR?.verdict==='APPROVED'} reasoning={councilVotes.AUDITOR?.reasoning} />
                </div>
                {councilDecision && (
                    <div className={`mt-3 text-center text-xs font-mono py-2.5 rounded-lg animate-fade-in ${councilDecision.final_verdict==='APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                        {councilDecision.final_verdict==='APPROVED' ? '✓ CONSENSUS — ACTION AUTHORIZED' : '✗ ACTION DENIED'}
                        {councilDecision.summary && <div className="text-[10px] text-gray-500 mt-1">{councilDecision.summary}</div>}
                    </div>
                )}
            </W>

            {/* Containers */}
            <W title="Containers" badge={`${containers.length} ACTIVE`}>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {containers.length === 0
                        ? <span className="text-gray-600 text-xs font-mono">Loading…</span>
                        : containers.map((c,i) => (
                            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-aegis-bg/40 border border-white/5 hover:border-aegis-accent/20 transition-all">
                                <span className={`status-dot ${c.status==='running'?'healthy':'critical'}`} />
                                <span className="text-xs font-mono text-gray-300 truncate flex-1">{c.name}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.status==='running'?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{c.status}</span>
                            </div>
                        ))}
                </div>
            </W>

            {/* Scale */}
            <W title="Load Balancer / Replicas" badge={`${replicas} INSTANCE${replicas>1?'S':''}`}>
                <ScaleVisual replicas={replicas} />
                <div className="mt-3 flex gap-2">
                    <button onClick={() => triggerScale('up',2)} className="flex-1 text-[10px] font-mono py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 active:scale-95 cursor-pointer transition-all">▲ SCALE UP</button>
                    <button onClick={() => triggerScale('down')} className="flex-1 text-[10px] font-mono py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 cursor-pointer transition-all">▼ SCALE DOWN</button>
                </div>
            </W>

            {/* Recent Incidents */}
            <W title="Recent Incidents" badge={`${incidents.length} TOTAL`} className="xl:col-span-2">
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {incidents.length === 0
                        ? <span className="text-gray-600 text-xs font-mono">No incidents yet — click ⚡ Trigger Incident.</span>
                        : incidents.slice(-6).reverse().map((inc,i) => (
                            <div key={i} onClick={() => { setSelectedIncident(inc); setActiveNav('incidents'); }}
                                className={`rounded-lg p-3 border cursor-pointer hover:scale-[1.01] transition-all ${
                                    ['FAILED','failed'].includes(inc.status)?'bg-[#500A1F]/50 border-aegis-danger/30'
                                    :['RESOLVED','resolved'].includes(inc.status)?'bg-green-900/20 border-green-500/20'
                                    :'bg-aegis-panel/40 border-white/5 border-l-2 border-l-yellow-400/60'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        ['RESOLVED','resolved'].includes(inc.status)?'bg-green-500/20 text-green-400'
                                        :['FAILED','failed'].includes(inc.status)?'bg-aegis-danger/20 text-aegis-danger'
                                        :'bg-yellow-500/20 text-yellow-400'}`}>{(inc.status||'').toUpperCase()}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{inc.incident_id||inc.id||''}</span>
                                    <span className="text-[10px] text-gray-600 font-mono ml-auto">{inc.alert_type||''}</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed truncate">{inc.analysis?.root_cause || inc.error || 'Processing…'}</p>
                            </div>
                        ))}
                </div>
            </W>
        </div>
    );

    /* ── INCIDENTS VIEW ── */
    const renderIncidents = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-200">Incidents <span className="text-sm text-gray-500 font-normal">({incidents.length} total)</span></h2>
                <button onClick={triggerDemo} className="text-xs font-mono px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer">⚡ Trigger New</button>
            </div>
            {selectedIncident && (
                <div className="glass-panel rounded-xl p-6 border-l-4 border-l-aegis-accent animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${['RESOLVED','resolved'].includes(selectedIncident.status)?'bg-green-500/20 text-green-400':['FAILED','failed'].includes(selectedIncident.status)?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400'}`}>{(selectedIncident.status||'').toUpperCase()}</span>
                            <span className="text-sm font-mono text-aegis-accent">{selectedIncident.incident_id}</span>
                            <span className="text-xs text-gray-500">{selectedIncident.alert_type}</span>
                        </div>
                        <button onClick={() => setSelectedIncident(null)} className="text-gray-500 hover:text-gray-300 text-xs cursor-pointer">✕ Close</button>
                    </div>
                    {selectedIncident.analysis && (
                        <div className="bg-aegis-bg/60 rounded-lg p-4 mb-3 space-y-2">
                            <div className="text-xs"><span className="text-gray-500">Root Cause:</span> <span className="text-purple-300">{selectedIncident.analysis.root_cause}</span></div>
                            <div className="text-xs"><span className="text-gray-500">Action:</span> <span className="text-aegis-accent font-bold">{selectedIncident.analysis.action}</span></div>
                            <div className="text-xs"><span className="text-gray-500">Confidence:</span> <span className="text-yellow-400">{((selectedIncident.analysis.confidence||0)*100).toFixed(0)}%</span></div>
                        </div>
                    )}
                    {selectedIncident.council_decision && (
                        <div className="bg-aegis-bg/60 rounded-lg p-4 mb-3">
                            <div className="text-[10px] font-mono text-gray-500 uppercase mb-2">Council Decision: <span className={selectedIncident.council_decision.final_verdict==='APPROVED'?'text-green-400':'text-red-400'}>{selectedIncident.council_decision.final_verdict}</span></div>
                            <div className="space-y-1.5">
                                {(selectedIncident.council_decision.votes||[]).map((v,i) => (
                                    <div key={i} className="text-[11px] font-mono">
                                        <span className={v.verdict==='APPROVED'?'text-green-400':'text-red-400'}>{v.role}: {v.verdict}</span>
                                        <span className="text-gray-600 ml-2">— {(v.reasoning||'').slice(0,100)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedIncident.timeline && (
                        <div className="space-y-1 max-h-[250px] overflow-y-auto">
                            <div className="text-[10px] font-mono text-gray-500 uppercase mb-2">Timeline</div>
                            {selectedIncident.timeline.map((t,i) => (
                                <div key={i} className="flex gap-3 text-[11px] font-mono py-1 border-l-2 border-aegis-accent/20 pl-3">
                                    <span className="text-gray-600 shrink-0 w-[56px]">{new Date(t.ts).toLocaleTimeString('en-US',{hour12:false})}</span>
                                    <span className="text-aegis-accent shrink-0 w-[90px]">{t.status}</span>
                                    <span className="text-gray-400">{t.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div className="space-y-2">
                {incidents.slice().reverse().map((inc,i) => (
                    <div key={i} onClick={() => setSelectedIncident(inc)}
                        className={`glass-panel rounded-lg p-4 cursor-pointer hover:border-aegis-accent/30 transition-all ${selectedIncident?.incident_id===inc.incident_id?'border-aegis-accent/50 bg-aegis-accent/5':''}`}>
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                                ['RESOLVED','resolved'].includes(inc.status)?'bg-green-500/20 text-green-400'
                                :['FAILED','failed'].includes(inc.status)?'bg-red-500/20 text-red-400'
                                :'bg-yellow-500/20 text-yellow-400'}`}>{(inc.status||'').toUpperCase()}</span>
                            <span className="text-sm font-mono text-gray-300">{inc.incident_id||''}</span>
                            <span className="text-xs text-gray-500">{inc.alert_type||''}</span>
                            <span className="text-[10px] text-gray-600 ml-auto">{inc.resolved_at ? new Date(inc.resolved_at).toLocaleTimeString('en-US',{hour12:false}) : ''}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{inc.analysis?.root_cause || inc.error || 'Processing…'}</p>
                    </div>
                ))}
                {incidents.length === 0 && <div className="text-center text-gray-600 py-12 text-sm">No incidents recorded yet.</div>}
            </div>
        </div>
    );

    /* ── ACTIVITY VIEW ── */
    const renderActivity = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-200">Live Activity Stream <span className="text-sm text-gray-500 font-normal">({liveLog.length} events)</span></h2>
                <div className="flex gap-2">
                    <button onClick={() => setLiveLog([])} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:bg-gray-500/20 cursor-pointer">Clear</button>
                    <span className={`text-xs font-mono px-3 py-1.5 rounded-lg ${connected?'bg-green-500/10 border border-green-500/30 text-green-400':'bg-red-500/10 border border-red-500/30 text-red-400'}`}>{connected?'● CONNECTED':'○ DISCONNECTED'}</span>
                </div>
            </div>
            <div className="glass-panel rounded-xl p-4">
                <div className="space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto font-mono text-[11px]">
                    {liveLog.length === 0
                        ? <div className="text-gray-600 text-center py-16">No activity yet. Trigger an incident to see the pipeline in action.</div>
                        : liveLog.map((l,i) => (
                            <div key={`${l.ts}-${i}`} className={`flex gap-2 py-1.5 px-3 rounded hover:bg-white/5 ${i===0?'animate-fade-in bg-white/[0.03]':''}`}>
                                <span className="text-gray-600 shrink-0 w-[60px]">{l.ts}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 bg-white/5 whitespace-nowrap min-w-[60px] text-center ${LOG_COLORS[l.type]||'text-gray-400'}`}>{l.type.split('.').pop().toUpperCase()}</span>
                                {l.incident_id && <span className="text-[9px] text-gray-600 shrink-0">[{l.incident_id}]</span>}
                                <span className={`break-all leading-relaxed ${LOG_COLORS[l.type]||'text-gray-400'}`}>{typeof l.msg === 'string' ? l.msg : JSON.stringify(l.msg)}</span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );

    /* ── ALERTS VIEW ── */
    const renderAlerts = () => {
        const failedIncs = incidents.filter(i => ['FAILED','failed'].includes(i.status));
        const criticalLogs = liveLog.filter(l => ['incident.new','failed','health.check'].includes(l.type));
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-200">Alerts & Failures <span className="text-sm text-gray-500 font-normal">({failedIncs.length} failed)</span></h2>
                {failedIncs.length === 0 && criticalLogs.length === 0 && (
                    <div className="glass-panel rounded-xl p-12 text-center">
                        <div className="text-4xl mb-4">✅</div>
                        <div className="text-gray-400 text-sm">No active alerts. All systems nominal.</div>
                    </div>
                )}
                {failedIncs.length > 0 && (
                    <W title="Failed Incidents" badge={`${failedIncs.length} FAILED`}>
                        <div className="space-y-2">
                            {failedIncs.map((inc,i) => (
                                <div key={i} onClick={() => { setSelectedIncident(inc); setActiveNav('incidents'); }}
                                    className="p-3 rounded-lg bg-[#500A1F]/50 border border-aegis-danger/30 cursor-pointer hover:border-aegis-danger/50 transition-all">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-mono font-bold text-red-400">❌ {inc.incident_id}</span>
                                        <span className="text-[10px] text-gray-500">{inc.alert_type}</span>
                                    </div>
                                    <p className="text-xs text-red-300">{inc.error || 'Health check failed after all retries.'}</p>
                                </div>
                            ))}
                        </div>
                    </W>
                )}
                {criticalLogs.length > 0 && (
                    <W title="Critical Events" badge="LIVE">
                        <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-[11px]">
                            {criticalLogs.map((l,i) => (
                                <div key={i} className="flex gap-2 py-1.5 px-2 rounded bg-red-500/5">
                                    <span className="text-gray-600 shrink-0 w-[56px]">{l.ts}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 bg-red-500/10 ${LOG_COLORS[l.type]}`}>{l.type.split('.').pop().toUpperCase()}</span>
                                    <span className="text-red-300 break-all">{l.msg}</span>
                                </div>
                            ))}
                        </div>
                    </W>
                )}
            </div>
        );
    };

    /* ── SETTINGS VIEW ── */
    const renderSettings = () => (
        <div className="space-y-4 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-200">Settings & System Info</h2>
            <W title="Connection Status">
                <div className="space-y-3 text-sm font-mono">
                    <div className="flex justify-between"><span className="text-gray-500">WebSocket</span><span className={connected?'text-green-400':'text-red-400'}>{connected?'● Connected':'○ Disconnected'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Backend</span><span className="text-gray-300">{health?'● Online':'○ Offline'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="text-aegis-accent">{health?.version||'—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Mode</span><span className="text-yellow-400">{health?.mode||'—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">WS Clients</span><span className="text-gray-300">{health?.ws_clients||0}</span></div>
                </div>
            </W>
            <W title="Services">
                <div className="space-y-2 text-sm font-mono">
                    {[
                        { name:'Agent API', url:'http://localhost:8001', desc:'FastAPI + Uvicorn' },
                        { name:'Cockpit UI', url:'http://localhost:3000', desc:'React + Nginx' },
                        { name:'Dashboard', url:'http://localhost:8501', desc:'Streamlit' },
                        { name:'Load Balancer', url:'http://localhost:80', desc:'Nginx LB' },
                        { name:'Buggy App', url:'http://localhost:8000', desc:'Target app' },
                    ].map(s => (
                        <div key={s.name} className="flex items-center justify-between py-1.5">
                            <div><span className="text-gray-300">{s.name}</span> <span className="text-gray-600 text-xs">— {s.desc}</span></div>
                            <a href={s.url} target="_blank" rel="noreferrer" className="text-aegis-accent text-xs hover:underline">{s.url}</a>
                        </div>
                    ))}
                </div>
            </W>
            <W title="Actions">
                <div className="flex flex-wrap gap-3">
                    <button onClick={refresh} className="text-xs font-mono px-4 py-2 rounded-lg bg-aegis-accent/10 border border-aegis-accent/30 text-aegis-accent hover:bg-aegis-accent/20 cursor-pointer">🔄 Refresh Data</button>
                    <button onClick={() => { setLiveLog([]); setMetricsHistory([]); setResolvedCount(0); setFailedCount(0); }} className="text-xs font-mono px-4 py-2 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:bg-gray-500/20 cursor-pointer">🗑️ Clear Session</button>
                    <button onClick={() => triggerScale('up',2)} className="text-xs font-mono px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 cursor-pointer">📈 Scale Up</button>
                    <button onClick={() => triggerScale('down')} className="text-xs font-mono px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer">📉 Scale Down</button>
                </div>
            </W>
        </div>
    );

    const views = { dashboard: renderDashboard, incidents: renderIncidents, activity: renderActivity, alerts: renderAlerts, settings: renderSettings };

    return (
        <div className="h-screen flex bg-aegis-bg grid-bg overflow-hidden">
            {/* Sidebar */}
            <aside className="w-16 lg:w-56 bg-aegis-panel/80 backdrop-blur-xl border-r border-white/5 flex flex-col py-4 shrink-0">
                <div className="px-4 mb-6 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-aegis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <span className="hidden lg:inline text-sm font-bold tracking-widest text-gray-200 font-mono">AEGIS<span className="text-aegis-accent">OPS</span></span>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                    {navItems.map(item => <NavItem key={item.key} icon={item.icon} label={item.label} active={activeNav===item.key} onClick={() => setActiveNav(item.key)} badge={item.badge} />)}
                </nav>
                <div className="px-2 mt-4"><NavItem icon={I.logout} label="Logout" active={false} onClick={() => navigate('/')} /></div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 bg-aegis-panel/50 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-sm font-bold text-gray-200 tracking-wide">GOD MODE — COMMAND CENTER</h1>
                        <span className={`flex items-center gap-1.5 text-xs font-mono ${connected?'text-green-400':'text-red-400'}`}>
                            <span className={`status-dot ${connected?'healthy':'critical'}`} />
                            {connected ? 'LIVE' : 'OFFLINE'}
                        </span>
                        {health && <span className="text-[10px] font-mono text-gray-500">v{health.version} WS:{health.ws_clients}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={triggerDemo} className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer">⚡ TRIGGER INCIDENT</button>
                        <button onClick={() => triggerScale('up',2)} className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-aegis-accent/10 border border-aegis-accent/30 text-aegis-accent hover:bg-aegis-accent/20 active:scale-95 transition-all cursor-pointer">📈 SCALE UP</button>
                        <span className="text-xs font-mono text-gray-400">{clock.toLocaleTimeString('en-US',{hour12:false})}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center text-xs font-bold text-aegis-accent">OP</div>
                            <span className="hidden md:inline text-xs text-gray-400 font-mono">operator</span>
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-4 overflow-y-auto">
                    {(views[activeNav] || renderDashboard)()}
                </main>
            </div>
        </div>
    );
}
