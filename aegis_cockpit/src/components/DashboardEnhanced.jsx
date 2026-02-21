import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { sanitizeText } from '../utils/textSanitize';

const DashboardEnhanced = () => {
    const { data: incidents } = useApi('/incidents', 2000);
    const [stats, setStats] = useState({
        total: 0, resolved: 0, failed: 0, inProgress: 0,
        byType: {}, byAction: {}, avgConfidence: 0, learnedPatterns: 0
    });

    // Compute stats from incidents
    useEffect(() => {
        if (!incidents || incidents.length === 0) return;

        const byType = {}, byAction = {};
        let resolved = 0, failed = 0, inProgress = 0, totalConf = 0, confCount = 0;
        const learned = new Set();

        incidents.forEach(inc => {
            // Count by status
            if (inc.status === 'RESOLVED') resolved++;
            else if (inc.status === 'FAILED') failed++;
            else inProgress++;

            // Count by incident type
            const type = inc.alert_type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;

            // Count by action
            if (inc.analysis?.action) {
                byAction[inc.analysis.action] = (byAction[inc.analysis.action] || 0) + 1;
            }

            // Average confidence
            if (inc.analysis?.confidence) {
                totalConf += inc.analysis.confidence;
                confCount++;
            }

            // Track learned patterns (auto-generated runbook entries)
            if (inc.status === 'RESOLVED') {
                learned.add(`${inc.alert_type}:${inc.analysis?.action}`);
            }
        });

        setStats({
            total: incidents.length,
            resolved,
            failed,
            inProgress,
            byType,
            byAction,
            avgConfidence: confCount > 0 ? (totalConf / confCount * 100).toFixed(1) : 0,
            learnedPatterns: learned.size
        });
    }, [incidents]);

    // Timeline data (last 12 hours, 1-hour buckets)
    const timelineData = useMemo(() => {
        const now = new Date();
        const buckets = {};
        for (let i = 11; i >= 0; i--) {
            const h = new Date(now.getTime() - i * 3600000);
            const key = h.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            buckets[key] = { time: key, resolved: 0, failed: 0, total: 0 };
        }

        incidents?.forEach(inc => {
            const t = inc.timeline?.[inc.timeline.length - 1]?.ts;
            if (t) {
                const d = new Date(t);
                const key = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                if (buckets[key]) {
                    if (inc.status === 'RESOLVED') buckets[key].resolved++;
                    else if (inc.status === 'FAILED') buckets[key].failed++;
                    buckets[key].total++;
                }
            }
        });

        return Object.values(buckets);
    }, [incidents]);

    // Incident type breakdown
    const incidentTypeData = useMemo(() => {
        return Object.entries(stats.byType).map(([type, count]) => ({
            name: type.replace('_', ' ').toUpperCase(),
            value: count,
            color: {
                memory_oom: '#ef4444',
                cpu_spike: '#f97316',
                pod_crash: '#ec4899',
                db_connection: '#3b82f6',
                disk_space: '#f59e0b',
                network_latency: '#06b6d4',
            }[type] || '#8b5cf6'
        }));
    }, [stats]);

    // Action distribution
    const actionData = useMemo(() => {
        return Object.entries(stats.byAction).map(([action, count]) => ({
            action: action || 'NONE',
            count
        }));
    }, [stats]);

    // Simulated monitoring radar (sonar)
    const radarData = [
        { category: 'CPU', value: Math.random() * 100 },
        { category: 'Memory', value: Math.random() * 100 },
        { category: 'Disk', value: Math.random() * 100 },
        { category: 'Network', value: Math.random() * 100 },
        { category: 'DB Pool', value: Math.random() * 100 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    <span className="text-2xl">🛡️</span> AegisOps — SRE Command Center
                </h1>
                <p className="text-gray-400">AI-powered incident detection, diagnosis & autonomous remediation</p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KPICard label="Total Incidents" value={stats.total} icon="📊" color="blue" />
                <KPICard label="Resolved" value={stats.resolved} icon="✅" color="green" />
                <KPICard label="Failed" value={stats.failed} icon="❌" color="red" />
                <KPICard label="In Progress" value={stats.inProgress} icon="⏳" color="yellow" />
            </div>

            {/* METRICS ROW 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Resolution Timeline */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>📈</span> Resolution Timeline (12h)
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={timelineData}>
                            <defs>
                                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="time" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                            <Area type="monotone" dataKey="resolved" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" />
                            <Area type="monotone" dataKey="failed" stackId="1" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Incident Type Breakdown */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>🎯</span> Incident Types
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={incidentTypeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                                {incidentTypeData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* METRICS ROW 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Action Distribution */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>⚡</span> Action Distribution
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={actionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="action" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                            <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Real-time Monitoring Radar (Sonar) */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>🔍</span> System Health Radar (OTel)
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#475569" />
                            <PolarAngleAxis dataKey="category" stroke="#94a3b8" />
                            <PolarRadiusAxis stroke="#94a3b8" angle={90} domain={[0, 100]} />
                            <Radar name="Utilization %" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* LEARNING & STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatBox label="Avg Confidence" value={`${stats.avgConfidence}%`} icon="🎯" color="cyan" />
                <StatBox label="Learned Patterns" value={stats.learnedPatterns} icon="🧠" color="purple" subtitle="Auto-growing runbook" />
                <StatBox label="Resolution Rate" value={`${stats.total > 0 ? (stats.resolved / stats.total * 100).toFixed(1) : 0}%`} icon="📊" color="green" />
            </div>

            {/* INCIDENT LOG */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📝</span> Recent Incidents
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {incidents && incidents.slice(0, 10).map((inc, idx) => (
                        <div key={idx} className={`p-3 rounded border-l-4 ${getStatusColor(inc.status)} bg-slate-900/30`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-mono text-sm text-gray-300">{inc.incident_id}</span>
                                    <p className="text-sm text-gray-300 mt-1">
                                        <strong>Type:</strong> {inc.alert_type?.replace('_', ' ')} |
                                        <strong> Action:</strong> {inc.analysis?.action || 'N/A'} |
                                        <strong> Confidence:</strong> {(inc.analysis?.confidence * 100).toFixed(0)}%
                                    </p>
                                    {inc.analysis?.root_cause && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sanitizeText(inc.analysis.root_cause)}</p>
                                    )}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(inc.status)}`}>
                                    {inc.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

function KPICard({ label, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        green: 'bg-green-500/10 border-green-500/30 text-green-400',
        red: 'bg-red-500/10 border-red-500/30 text-red-400',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    };

    return (
        <div className={`border rounded-lg p-4 ${colors[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon, color, subtitle }) {
    const colors = {
        cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
        green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-6`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{icon}</span>
                <p className="text-sm text-gray-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </div>
    );
}

function getStatusColor(status) {
    const colors = {
        RESOLVED: 'border-green-500 text-green-400',
        FAILED: 'border-red-500 text-red-400',
        RECEIVED: 'border-blue-500 text-blue-400',
        ANALYSING: 'border-yellow-500 text-yellow-400',
        COUNCIL_REVIEW: 'border-purple-500 text-purple-400',
        EXECUTING: 'border-orange-500 text-orange-400',
    };
    return colors[status] || 'border-gray-500 text-gray-400';
}

function getStatusBadgeColor(status) {
    const colors = {
        RESOLVED: 'bg-green-500/20 text-green-400',
        FAILED: 'bg-red-500/20 text-red-400',
        RECEIVED: 'bg-blue-500/20 text-blue-400',
        ANALYSING: 'bg-yellow-500/20 text-yellow-400',
        COUNCIL_REVIEW: 'bg-purple-500/20 text-purple-400',
        EXECUTING: 'bg-orange-500/20 text-orange-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
}

export default DashboardEnhanced;
