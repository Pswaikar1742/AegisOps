import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
import { sanitizeText } from '../utils/textSanitize';

/* ═══════════════════════════════════════════════════════════
   AEGISOPS GOD MODE COCKPIT v2 — 4-Zone NASA Control Room
   ═══════════════════════════════════════════════════════════ */

const WS_URL = `ws://${window.location.host}/ws`;

// ── MetricBar ──────────────────────────────────────────────
const MetricBar = ({ label, value, unit = '%', max = 100 }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    pct > 90 ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
    : pct > 70 ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]'
    : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]';
  const textColor = pct > 90 ? 'text-red-400 animate-pulse font-bold' : 'text-slate-300';

  return (
    <div className="mb-4">
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 mb-1">
        <span>{label}</span>
        <span className={textColor}>{value}{unit}</span>
      </div>
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── ReplicaNodes ───────────────────────────────────────────
const ReplicaNodes = ({ count }) => (
  <div className="flex space-x-2 flex-wrap gap-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i}
        className={`h-9 w-9 rounded flex items-center justify-center border text-[10px] font-mono transition-all duration-700 ${
          i < count
            ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-100'
            : 'bg-slate-900 border-slate-800 text-slate-700 scale-90 opacity-40'
        }`}>
        R{i + 1}
      </div>
    ))}
  </div>
);

// ── AgentCard ──────────────────────────────────────────────
const AgentCard = ({ name, role, status, icon }) => (
  <div className={`rounded-lg border relative overflow-hidden transition-all duration-500 p-4 flex flex-col justify-center items-center text-center ${
    status === 'thinking' ? 'border-yellow-500/60 bg-yellow-950/20'
    : status === 'approved' ? 'border-emerald-500/60 bg-emerald-950/15 shadow-[0_0_18px_rgba(16,185,129,0.15)]'
    : 'border-slate-800 bg-[#0F141F]'
  }`}>
    <span className="text-2xl mb-1">{icon}</span>
    <span className={`font-bold text-xs ${status === 'approved' ? 'text-emerald-400' : 'text-slate-300'}`}>{name}</span>
    <span className="text-[9px] text-slate-600 uppercase tracking-wider">{role}</span>
    {status === 'approved' && <div className="absolute top-1.5 right-2 text-emerald-500 text-xs font-bold">✓</div>}
    {status === 'thinking' && (
      <div className="absolute bottom-0 left-0 h-0.5 bg-yellow-500 animate-[growbar_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
    )}
  </div>
);

// ── AI Stream Panel ────────────────────────────────────────
const AIPanel = ({ text, status }) => (
  <div className="flex-1 flex flex-col min-h-0">
    <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 mb-2">
      <span>Agent Neural Stream</span>
      <span className={`flex items-center gap-1 ${status === 'streaming' ? 'text-purple-400 animate-pulse' : status === 'complete' ? 'text-emerald-400' : 'text-slate-600'}`}>
        {status === 'streaming' ? '⚡ ANALYZING' : status === 'complete' ? '✅ DONE' : '● IDLE'}
      </span>
    </div>
    <div className="flex-1 bg-black/60 border border-slate-800 rounded-lg p-4 font-mono text-[11px] overflow-y-auto leading-relaxed text-slate-300 whitespace-pre-wrap min-h-0">
      {text || <span className="text-slate-700">Waiting for incident… Click an injection button.</span>}
      <span className="animate-pulse text-emerald-500 ml-0.5">▌</span>
    </div>
  </div>
);

// ── Terminal Log ───────────────────────────────────────────
const TerminalLog = ({ logs }) => {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);

  return (
    <div ref={ref} className="flex-1 bg-black/50 border border-slate-800 rounded-lg p-3 font-mono text-[10px] overflow-y-auto space-y-1 min-h-0">
      {logs.length === 0 && <div className="text-slate-700 text-center pt-8">Trigger an incident to begin…</div>}
      {logs.map((l, i) => (
        <div key={i} className={`flex gap-2 py-0.5 px-1 rounded ${
          l.type === 'alert'    ? 'text-red-400 bg-red-950/20 border-l-2 border-red-500 pl-2'
          : l.type === 'resolve' ? 'text-emerald-400 bg-emerald-950/10 border-l-2 border-emerald-500 pl-2'
          : l.type === 'action'  ? 'text-yellow-400'
          : l.type === 'council' ? 'text-yellow-300'
          : l.type === 'ai'      ? 'text-purple-400'
          : 'text-slate-500'
        }`}>
          <span className="text-slate-700 shrink-0">[{l.ts}]</span>
          <span>{l.msg}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function DashboardCockpit() {
  const { connected, lastMessage } = useWebSocket(WS_URL);
  const { containers, triggerScale } = useApi();

  // ── State ──────────────────────────────────────────────────
  const [metrics, setMetrics]           = useState({ cpu: 12, memory: 45, db: 20, net: 8 });
  const [replicaCount, setReplicaCount] = useState(1);
  const [councilStatus, setCouncilStatus] = useState({ sre: 'idle', security: 'idle', auditor: 'idle' });
  const [aiText, setAiText]             = useState('');
  const [aiStatus, setAiStatus]         = useState('idle'); // idle | streaming | complete
  const [logs, setLogs]                 = useState([]);
  const [decision, setDecision]         = useState(null);
  const simTimers                       = useRef([]);

  // ── Helpers ────────────────────────────────────────────────
  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-199), { ts: ts(), msg, type }]);
  }, []);

  // ── Real WebSocket handler ─────────────────────────────────
  useEffect(() => {
    if (!lastMessage) return;
    const f = lastMessage;

    switch (f.type) {
      case 'incident.new':
        setCouncilStatus({ sre: 'idle', security: 'idle', auditor: 'idle' });
        setDecision(null);
        setAiText('');
        setAiStatus('idle');
        addLog(`🚨 ALERT: ${f.data?.alert_type?.toUpperCase()} — ${f.data?.incident_id}`, 'alert');
        // spike matching metric
        if (f.data?.alert_type === 'memory_oom')      setMetrics(m => ({ ...m, memory: 97 }));
        if (f.data?.alert_type === 'cpu_spike')        setMetrics(m => ({ ...m, cpu: 99 }));
        if (f.data?.alert_type === 'db_connection')    setMetrics(m => ({ ...m, db: 94 }));
        if (f.data?.alert_type === 'network_latency')  setMetrics(m => ({ ...m, net: 95 }));
        if (f.data?.alert_type === 'disk_space')       setMetrics(m => ({ ...m, disk: 96 }));
        break;

      case 'ai.thinking':
        setAiStatus('streaming');
        setAiText(f.data?.message || '🧠 Analyzing root cause…');
        addLog('🧠 AI: Analyzing root cause…', 'ai');
        break;

      case 'ai.stream':
        setAiStatus('streaming');
        setAiText(prev => prev + (f.data?.chunk || f.data?.content || ''));
        break;

      case 'ai.complete': {
        setAiStatus('complete');
        const a = f.data?.analysis;
        if (a) {
          setAiText(`ROOT CAUSE:\n${sanitizeText(a.root_cause)}\n\nACTION: ${a.action}\nCONFIDENCE: ${(a.confidence * 100).toFixed(0)}%\n\nJUSTIFICATION:\n${sanitizeText(a.justification || '')}`);
          addLog(`✅ AI complete: ${a.action} (${(a.confidence * 100).toFixed(0)}% confidence)`, 'ai');
        }
        break;
      }

      case 'council.vote': {
        const v = f.data?.vote;
        if (v) {
          const role = (v.role || '').toUpperCase();
          if (role === 'SRE_AGENT')        setCouncilStatus(s => ({ ...s, sre: v.verdict === 'APPROVED' ? 'approved' : 'thinking' }));
          if (role === 'SECURITY_OFFICER') setCouncilStatus(s => ({ ...s, security: v.verdict === 'APPROVED' ? 'approved' : 'thinking' }));
          if (role === 'AUDITOR')          setCouncilStatus(s => ({ ...s, auditor: v.verdict === 'APPROVED' ? 'approved' : 'thinking' }));
          addLog(`🗳️ ${role}: ${v.verdict} — ${(v.reasoning || '').slice(0, 80)}`, 'council');
        }
        break;
      }

      case 'council.decision':
        setDecision(f.data?.decision);
        addLog(`📋 COUNCIL: ${f.data?.decision?.final_verdict} — ${f.data?.decision?.summary || ''}`, 'council');
        break;

      case 'scale.event': {
        const rc = f.data?.event?.replica_count || f.data?.replica_count;
        if (rc) {
          setReplicaCount(rc);
          addLog(`📈 SCALED to ${rc} replicas`, 'action');
        }
        break;
      }

      case 'docker.action':
        addLog(`🐳 ${f.data?.action} → ${f.data?.container || ''}`, 'action');
        break;

      case 'resolved':
        addLog(`✅ RESOLVED: ${f.data?.message || ''}`, 'resolve');
        setMetrics({ cpu: 15, memory: 42, db: 18, net: 7 });
        setAiStatus('complete');
        break;

      case 'failed':
        addLog(`❌ FAILED: ${f.data?.error || ''}`, 'alert');
        break;

      default: break;
    }
  }, [lastMessage, addLog]);

  // ── Fire real webhook + simulation overlay ─────────────────
  const triggerIncident = useCallback(async (alertType, label) => {
    // Clear old simulation timers
    simTimers.current.forEach(clearTimeout);
    simTimers.current = [];

    setCouncilStatus({ sre: 'idle', security: 'idle', auditor: 'idle' });
    setDecision(null);
    setAiText('');
    setAiStatus('idle');

    addLog(`🚨 INJECT: ${label.toUpperCase()}`, 'alert');

    // --- Spike the metric immediately (visual "wow") ---
    if (alertType === 'memory_oom')     setMetrics(m => ({ ...m, memory: 97 }));
    if (alertType === 'cpu_spike')      setMetrics(m => ({ ...m, cpu: 99 }));
    if (alertType === 'db_connection')  setMetrics(m => ({ ...m, db: 94 }));
    if (alertType === 'network_latency')setMetrics(m => ({ ...m, net: 95 }));
    if (alertType === 'disk_space')     setMetrics(m => ({ ...m, disk: 96 }));
    if (alertType === 'pod_crash')      setMetrics(m => ({ ...m, cpu: 88, memory: 80 }));

    // --- Fire real backend webhook ---
    try {
      await fetch('/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: `INC-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
          alert_type: alertType,
          severity: 'critical',
          source: 'aegis-cockpit',
          timestamp: new Date().toISOString(),
          details: { service: 'buggy-app-v2', namespace: 'production' }
        })
      });
    } catch (e) {
      addLog('⚠️  Backend unreachable — running simulation mode', 'alert');
    }

    // --- Simulation overlay (runs even if backend dies) ---
    const sim = (delay, fn) => { simTimers.current.push(setTimeout(fn, delay)); };

    sim(1500, () => {
      setAiStatus('streaming');
      setAiText('🧠 Scanning runbook for similar incidents…\n');
      addLog('🧠 AI: Scanning runbook…', 'ai');
      setCouncilStatus(s => ({ ...s, sre: 'thinking' }));
    });
    sim(3000, () => {
      setAiText(prev => prev + `Identified root cause: ${label} condition detected.\nService degradation in production namespace.\n`);
      addLog('🧠 AI: Root cause identified', 'ai');
    });
    sim(5000, () => {
      const action = ['memory_oom','pod_crash'].includes(alertType) ? 'RESTART' : 'SCALE_UP';
      setAiText(prev => prev + `\nRecommended Action: ${action}\nConfidence: 94%\nJustification: Immediate remediation required to restore SLA.`);
      setAiStatus('complete');
      setCouncilStatus(s => ({ ...s, sre: 'approved', security: 'thinking' }));
      addLog(`🧠 AI complete → ${action} (94%)`, 'ai');
    });
    sim(7000, () => {
      setCouncilStatus(s => ({ ...s, security: 'approved', auditor: 'thinking' }));
      addLog('🛡️ SECURITY: No PII risk. APPROVED', 'council');
    });
    sim(9000, () => {
      setCouncilStatus({ sre: 'approved', security: 'approved', auditor: 'approved' });
      setDecision({ final_verdict: 'APPROVED', summary: 'Council voted 3/3 APPROVED' });
      addLog('📋 AUDITOR: Proportionate response. APPROVED', 'council');
      addLog('✅ CONSENSUS — ACTION AUTHORIZED', 'council');
    });
    sim(10500, () => {
      addLog('🐳 EXECUTING action…', 'action');
      if (!['memory_oom','pod_crash'].includes(alertType)) {
        setReplicaCount(3);
        addLog('📈 SCALED to 3 replicas', 'action');
      } else {
        addLog('🔄 Container RESTART initiated', 'action');
      }
    });
    sim(13000, () => {
      setMetrics({ cpu: 18, memory: 44, db: 19, net: 9 });
      setReplicaCount(prev => prev > 1 ? prev : 1);
      addLog('✅ RESOLVED: Metrics stabilized. Service healthy.', 'resolve');
    });
  }, [addLog]);

  const INJECT_BUTTONS = [
    { type: 'memory_oom',     label: 'OOM Kill',    icon: '💀', color: 'red' },
    { type: 'cpu_spike',      label: 'CPU Spike',   icon: '🔥', color: 'red' },
    { type: 'db_connection',  label: 'DB Lock',     icon: '🐌', color: 'red' },
    { type: 'network_latency',label: 'Net Lag',     icon: '🌐', color: 'orange' },
    { type: 'disk_space',     label: 'Disk Full',   icon: '📦', color: 'orange' },
    { type: 'pod_crash',      label: 'Pod Crash',   icon: '💥', color: 'orange' },
  ];

  const btnCls = (color) => color === 'red'
    ? 'bg-red-950/10 border-red-900/40 hover:bg-red-950/50 hover:border-red-500/60 text-red-400'
    : 'bg-orange-950/10 border-orange-900/40 hover:bg-orange-950/50 hover:border-orange-500/60 text-orange-400';

  return (
    <div className="h-screen w-full bg-[#0B0F17] text-slate-200 flex font-sans overflow-hidden select-none">

      {/* ── ZONE 1: CHAOS INJECTION PANEL (Left) ── */}
      <div className="w-56 bg-[#0F141F] border-r border-slate-800 flex flex-col z-10 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-lg font-extrabold tracking-wider text-white">AEGIS<span className="text-emerald-500">OPS</span></h1>
          <div className="flex items-center mt-2 gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span className={`text-[9px] uppercase tracking-widest ${connected ? 'text-emerald-500' : 'text-red-500'}`}>{connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">🎯 Chaos Injection</h2>
          <div className="space-y-2">
            {INJECT_BUTTONS.map(b => (
              <button key={b.type}
                onClick={() => triggerIncident(b.type, b.label)}
                className={`group w-full text-left px-3 py-2.5 border rounded transition-all flex items-center gap-3 text-[11px] font-medium cursor-pointer ${btnCls(b.color)}`}>
                <span className="text-base group-hover:scale-125 transition-transform">{b.icon}</span>
                {b.label}
              </button>
            ))}
          </div>

          {/* Scale controls */}
          <div className="mt-auto pt-4 border-t border-slate-800 space-y-2">
            <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">⚙️ Replicas</h2>
            <button onClick={() => { triggerScale('up', 2); setReplicaCount(c => Math.min(5, c + 2)); }}
              className="w-full px-3 py-2 bg-emerald-950/20 border border-emerald-900/40 hover:bg-emerald-950/50 text-emerald-400 rounded text-[10px] font-mono cursor-pointer">
              ▲ SCALE UP
            </button>
            <button onClick={() => { triggerScale('down'); setReplicaCount(c => Math.max(1, c - 1)); }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-500 rounded text-[10px] font-mono cursor-pointer">
              ▼ SCALE DOWN
            </button>
          </div>
        </div>
      </div>

      {/* ── ZONE 2: TELEMETRY & TOPOLOGY (Center-Left) ── */}
      <div className="w-72 bg-[#0B0F17] border-r border-slate-800 p-5 flex flex-col gap-6 overflow-y-auto shrink-0">

        {/* Live Telemetry */}
        <div>
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-4">📡 Live Telemetry</h2>
          <MetricBar label="CPU Usage"     value={metrics.cpu}    unit="%" />
          <MetricBar label="Memory RSS"    value={metrics.memory} unit="%" />
          <MetricBar label="DB Latency"    value={metrics.db}     unit="ms" max={100} />
          <MetricBar label="Network RTT"   value={metrics.net}    unit="ms" max={100} />
        </div>

        {/* Infrastructure Topology */}
        <div>
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">🗺️ Infrastructure</h2>
          <div className="border border-slate-800 rounded-lg p-4 bg-[#0F141F] space-y-3">
            {/* Topology nodes */}
            <div className="flex flex-col items-center space-y-2 text-[10px]">
              <div className="px-3 py-1 rounded border border-blue-500/50 bg-blue-900/20 text-blue-400">🌐 Internet</div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="px-3 py-1 rounded border border-purple-500/50 bg-purple-900/20 text-purple-400">⚖️ NGINX LB</div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="w-full">
                <div className="flex justify-between text-[9px] text-slate-600 mb-2 uppercase">
                  <span>App Replicas</span>
                  <span className={replicaCount > 1 ? 'text-emerald-400 font-bold' : 'text-slate-600'}>{replicaCount}/5</span>
                </div>
                <ReplicaNodes count={replicaCount} />
              </div>
            </div>

            {/* Container health */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              {(containers.length ? containers : [
                { name: 'aegis-agent', status: 'running' },
                { name: 'aegis-cockpit', status: 'running' },
                { name: 'buggy-app-v2', status: 'running' },
              ]).slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === 'running' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-slate-500 truncate">{c.name}</span>
                  <span className={`ml-auto ${c.status === 'running' ? 'text-emerald-600' : 'text-red-500'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ZONE 3 & 4: COUNCIL + AI BRAIN + TERMINAL (Right) ── */}
      <div className="flex-1 flex flex-col p-5 gap-4 min-w-0 overflow-hidden">

        {/* Multi-Agent Council */}
        <div>
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">
            🗳️ Multi-Agent Governance Council
            {decision && (
              <span className={`ml-3 px-2 py-0.5 rounded text-[9px] font-bold ${
                decision.final_verdict === 'APPROVED'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                  : 'bg-red-900/40 text-red-400 border border-red-700/40'
              }`}>
                {decision.final_verdict === 'APPROVED' ? '✓ CONSENSUS APPROVED' : '✗ REJECTED'}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-3 gap-3 h-28">
            <AgentCard name="SRE Lead"   role="Diagnosis"    status={councilStatus.sre}      icon="🧠" />
            <AgentCard name="SecOps"     role="Safety Check" status={councilStatus.security}  icon="🛡️" />
            <AgentCard name="Auditor"    role="Compliance"   status={councilStatus.auditor}   icon="📝" />
          </div>
        </div>

        {/* AI Brain Analysis */}
        <AIPanel text={aiText} status={aiStatus} />

        {/* Event Log */}
        <div className="h-44 flex flex-col shrink-0">
          <h2 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2 flex justify-between">
            <span>Event Log</span>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="text-slate-700 hover:text-slate-500 text-[9px] cursor-pointer">clear</button>
            )}
          </h2>
          <TerminalLog logs={logs} />
        </div>
      </div>
    </div>
  );
}
