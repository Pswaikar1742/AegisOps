import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

/* ══════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════ */

/* ── Sidebar Icons (inline SVG) ──────────────── */
const icons = {
    dashboard: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 7a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zM4 13a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
        </svg>
    ),
    shield: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    activity: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    ),
    alert: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    ),
    settings: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    logout: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
};

/* ── Mock Data ───────────────────────────────── */
function generateChartData() {
    return Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, '0')}:00`,
        threats: Math.floor(Math.random() * 80 + 10),
        blocked: Math.floor(Math.random() * 70 + 5),
        cpu: Math.floor(Math.random() * 40 + 30),
    }));
}

const MOCK_ALERTS = [
    { id: 1, severity: 'CRITICAL', message: 'Unauthorized SSH access attempt detected on node-07', time: '2m ago' },
    { id: 2, severity: 'CRITICAL', message: 'DDoS pattern identified — 12K req/s on API gateway', time: '5m ago' },
    { id: 3, severity: 'WARNING', message: 'SSL certificate expires in 48 hours for *.aegis.io', time: '12m ago' },
    { id: 4, severity: 'WARNING', message: 'Memory usage exceeds 85% on container aegis-worker-3', time: '18m ago' },
];

const SYSTEM_HEALTH = [
    { label: 'CPU Utilization', value: 67, color: '#09D8C7' },
    { label: 'Memory Usage', value: 54, color: '#09D8C7' },
    { label: 'Network I/O', value: 82, color: '#DB0927' },
    { label: 'Disk Usage', value: 41, color: '#09D8C7' },
    { label: 'GPU Load', value: 73, color: '#09D8C7' },
];

const SERVICES_DATA = [
    { name: 'API', health: 98 },
    { name: 'Auth', health: 100 },
    { name: 'DB', health: 95 },
    { name: 'Cache', health: 100 },
    { name: 'Queue', health: 87 },
    { name: 'ML', health: 92 },
];

/* ── Live Clock Hook ─────────────────────────── */
function useClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);
    return time;
}

/* ── Activity Feed (terminal style) ──────────── */
const INITIAL_LOGS = [
    { ts: '20:04:11', type: 'info', msg: 'Heartbeat OK — all 12 nodes responsive' },
    { ts: '20:04:09', type: 'ai', msg: 'AI Agent predicted anomaly on node-04 (confidence: 94.7%)' },
    { ts: '20:04:05', type: 'action', msg: 'Auto-scaled aegis-worker replicas: 3 → 5' },
    { ts: '20:03:58', type: 'warn', msg: 'Latency spike detected: p99 = 340ms on /api/v2/scan' },
    { ts: '20:03:50', type: 'info', msg: 'TLS certificate rotation complete for *.aegis.internal' },
    { ts: '20:03:42', type: 'ai', msg: 'Council vote: SCALE (3/3 agents agreed)' },
    { ts: '20:03:35', type: 'action', msg: 'Container aegis-sentinel restarted (health check failed)' },
    { ts: '20:03:28', type: 'info', msg: 'Backup completed — 2.4GB snapshot written to S3' },
];

const LOG_COLORS = {
    info: 'text-gray-400',
    ai: 'text-aegis-accent',
    action: 'text-purple-400',
    warn: 'text-yellow-400',
    error: 'text-aegis-danger',
};

/* ── Sidebar Nav Item ────────────────────────── */
function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
        ${active
                    ? 'nav-active bg-aegis-accent/10 text-aegis-accent'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
        >
            <span className={active ? 'text-aegis-accent drop-shadow-[0_0_6px_rgba(9,216,199,0.6)]' : ''}>{icon}</span>
            <span className="hidden lg:inline">{label}</span>
        </button>
    );
}

/* ── Widget Wrapper ──────────────────────────── */
function Widget({ title, children, className = '', badge }) {
    return (
        <div className={`glass-panel rounded-xl p-5 flex flex-col ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500">{title}</h3>
                {badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-aegis-accent/10 text-aegis-accent border border-aegis-accent/30">
                        {badge}
                    </span>
                )}
            </div>
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ══════════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const clock = useClock();
    const [activeNav, setActiveNav] = useState('dashboard');
    const logRef = useRef(null);
    const [logs, setLogs] = useState(INITIAL_LOGS);
    const chartData = useMemo(() => generateChartData(), []);

    // Simulate live log entries
    useEffect(() => {
        const newEntries = [
            { type: 'info', msg: 'DNS resolution healthy — avg 12ms' },
            { type: 'ai', msg: 'Threat model updated — 847 new signatures loaded' },
            { type: 'action', msg: 'Rate limiter triggered on /auth endpoint' },
            { type: 'warn', msg: 'Pod aegis-scanner-2 OOMKilled — restarting' },
            { type: 'info', msg: 'WebSocket connections: 142 active clients' },
            { type: 'ai', msg: 'Anomaly score dropped: 0.92 → 0.31 on node-04' },
        ];
        let idx = 0;
        const interval = setInterval(() => {
            if (idx >= newEntries.length) {
                idx = 0;
            }
            const now = new Date();
            const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            setLogs((prev) => [{ ts, ...newEntries[idx] }, ...prev].slice(0, 30));
            idx++;
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = 0;
    }, [logs]);

    const navItems = [
        { key: 'dashboard', icon: icons.dashboard, label: 'Dashboard' },
        { key: 'threats', icon: icons.shield, label: 'Threats' },
        { key: 'activity', icon: icons.activity, label: 'Activity' },
        { key: 'alerts', icon: icons.alert, label: 'Alerts' },
        { key: 'settings', icon: icons.settings, label: 'Settings' },
    ];

    return (
        <div className="h-screen flex bg-aegis-bg grid-bg overflow-hidden">
            {/* ── Sidebar ── */}
            <aside className="w-16 lg:w-56 bg-aegis-panel/80 backdrop-blur-xl border-r border-white/5 flex flex-col py-4 shrink-0">
                {/* Logo */}
                <div className="px-4 mb-6 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-aegis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <span className="hidden lg:inline text-sm font-bold tracking-widest text-gray-200 font-mono">
                        AEGIS<span className="text-aegis-accent">OPS</span>
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 space-y-1">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.key}
                            icon={item.icon}
                            label={item.label}
                            active={activeNav === item.key}
                            onClick={() => setActiveNav(item.key)}
                        />
                    ))}
                </nav>

                {/* Logout */}
                <div className="px-2 mt-4">
                    <NavItem
                        icon={icons.logout}
                        label="Logout"
                        active={false}
                        onClick={() => navigate('/')}
                    />
                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* ── Top Header ── */}
                <header className="h-14 bg-aegis-panel/50 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-sm font-bold text-gray-200 tracking-wide">COMMAND CENTER</h1>
                        <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                            <span className="status-dot healthy" />
                            ALL SYSTEMS OPERATIONAL
                        </span>
                    </div>
                    <div className="flex items-center gap-5">
                        {/* System time */}
                        <span className="text-xs font-mono text-gray-400">
                            {clock.toLocaleTimeString('en-US', { hour12: false })}
                        </span>

                        {/* Alert bell */}
                        <button className="relative text-gray-500 hover:text-aegis-accent transition-colors cursor-pointer" id="btn-alerts">
                            {icons.alert}
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-aegis-danger text-[9px] text-white flex items-center justify-center font-bold">
                                {MOCK_ALERTS.length}
                            </span>
                        </button>

                        {/* User avatar */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center text-xs font-bold text-aegis-accent">
                                OP
                            </div>
                            <span className="hidden md:inline text-xs text-gray-400 font-mono">operator-01</span>
                        </div>
                    </div>
                </header>

                {/* ── Dashboard Grid ── */}
                <main className="flex-1 p-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">

                        {/* ── System Health ── */}
                        <Widget title="System Health" badge="LIVE" className="row-span-1">
                            <div className="space-y-3">
                                {SYSTEM_HEALTH.map((metric) => (
                                    <div key={metric.label}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400">{metric.label}</span>
                                            <span className="font-mono" style={{ color: metric.color }}>{metric.value}%</span>
                                        </div>
                                        <div className="h-2 bg-aegis-bg rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full metric-bar"
                                                style={{
                                                    width: `${metric.value}%`,
                                                    background: `linear-gradient(90deg, ${metric.color}88, ${metric.color})`,
                                                    boxShadow: `0 0 8px ${metric.color}44`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Widget>

                        {/* ── Threat Analytics Chart ── */}
                        <Widget title="Threat Analytics" badge="24H" className="xl:col-span-2 row-span-1">
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gradThreats" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#DB0927" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#DB0927" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#09D8C7" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#09D8C7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={3} />
                                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={30} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#17364F',
                                            border: '1px solid rgba(9,216,199,0.3)',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontFamily: 'JetBrains Mono',
                                        }}
                                        itemStyle={{ color: '#e5e7eb' }}
                                        labelStyle={{ color: '#09D8C7' }}
                                    />
                                    <Area type="monotone" dataKey="threats" stroke="#DB0927" fill="url(#gradThreats)" strokeWidth={2} name="Threats" />
                                    <Area type="monotone" dataKey="blocked" stroke="#09D8C7" fill="url(#gradBlocked)" strokeWidth={2} name="Blocked" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Widget>

                        {/* ── Live Activity Feed ── */}
                        <Widget title="Live Activity Feed" badge="STREAMING" className="row-span-1 xl:row-span-2">
                            <div ref={logRef} className="space-y-1 overflow-y-auto max-h-[360px] pr-1 font-mono text-xs">
                                {logs.map((log, i) => (
                                    <div
                                        key={`${log.ts}-${i}`}
                                        className={`flex gap-2 py-1.5 px-2 rounded transition-colors hover:bg-white/5 ${i === 0 ? 'animate-fade-in' : ''}`}
                                    >
                                        <span className="text-gray-600 shrink-0">{log.ts}</span>
                                        <span className={`${LOG_COLORS[log.type] || 'text-gray-400'}`}>{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </Widget>

                        {/* ── Service Health Bar Chart ── */}
                        <Widget title="Service Health" badge="NODES">
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={SERVICES_DATA} barCategoryGap="20%">
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={30} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#17364F',
                                            border: '1px solid rgba(9,216,199,0.3)',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontFamily: 'JetBrains Mono',
                                        }}
                                    />
                                    <Bar dataKey="health" radius={[4, 4, 0, 0]} name="Health %">
                                        {SERVICES_DATA.map((entry, i) => (
                                            <Cell key={i} fill={entry.health >= 95 ? '#09D8C7' : entry.health >= 90 ? '#411E3A' : '#DB0927'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Widget>

                        {/* ── Alerts Panel ── */}
                        <Widget
                            title="Critical Alerts"
                            badge={`${MOCK_ALERTS.filter((a) => a.severity === 'CRITICAL').length} ACTIVE`}
                            className="xl:col-span-1"
                        >
                            <div className="space-y-2.5">
                                {MOCK_ALERTS.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`rounded-lg p-3 border transition-all hover:scale-[1.01] ${alert.severity === 'CRITICAL'
                                                ? 'bg-[#500A1F]/60 border-aegis-danger/30'
                                                : 'bg-aegis-panel/40 border-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${alert.severity === 'CRITICAL'
                                                        ? 'bg-aegis-danger/20 text-aegis-danger'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}
                                            >
                                                {alert.severity}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-mono ml-auto">{alert.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </Widget>

                        {/* ── Quick Stats ── */}
                        <Widget title="System Overview" className="md:col-span-2 xl:col-span-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Active Containers', value: '24', icon: '🐳', color: 'text-aegis-accent' },
                                    { label: 'Incidents Today', value: '7', icon: '⚡', color: 'text-yellow-400' },
                                    { label: 'Threats Blocked', value: '2,847', icon: '🛡️', color: 'text-aegis-accent' },
                                    { label: 'Uptime', value: '99.97%', icon: '📡', color: 'text-green-400' },
                                ].map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="text-center py-3 px-2 rounded-xl bg-aegis-bg/50 border border-white/5 hover:border-aegis-accent/20 transition-all"
                                    >
                                        <div className="text-2xl mb-1">{stat.icon}</div>
                                        <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{stat.label}</div>
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
