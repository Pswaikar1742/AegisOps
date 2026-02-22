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
    <div className="mb-3 sm:mb-4">
      <div className="flex justify-between text-[8px] sm:text-[9px] lg:text-[10px] uppercase tracking-widest text-slate-500 mb-1">
        <span className="truncate">{label}</span>
        <span className={`${textColor} shrink-0 ml-2`}>{value}{unit}</span>
      </div>
      <div className="w-full bg-slate-900 h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── SavingsMeter ───────────────────────────────────────────
const SavingsMeter = ({ total }) => (
  <div className="flex-1 p-2 sm:p-3 rounded border border-slate-800 bg-gradient-to-r from-amber-900/6 to-emerald-900/6">
    <div className="text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500">💰 Est. Savings</div>
    <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-amber-300 mt-1">{'$' + total.toFixed(2)}</div>
    <div className="text-[8px] sm:text-[9px] text-slate-500 mt-1">demo estimate</div>
  </div>
);

// ── ReplicaNodes ───────────────────────────────────────────
const ReplicaNodes = ({ count, confirmed }) => (
  <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-y-1 sm:gap-y-2 items-center">
    {Array.from({ length: 5 }).map((_, i) => {
      const active = i < count;
      const confirmedActive = i < confirmed;
      const pending = active && !confirmedActive;
      return (
        <div key={i} className="relative group">
          <div
            role="img"
            aria-label={`Replica ${i + 1} ${active ? 'active' : 'available'}`}
            title={`Replica R${i + 1} — ${active ? (pending ? 'Pending start' : 'Active replica') : 'Available slot'}`}
            className={`h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 rounded flex items-center justify-center border text-[9px] sm:text-[10px] font-mono transition-all duration-700 ${
              active
                ? pending
                  ? 'bg-amber-900 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.25)] scale-100'
                  : 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-100'
                : 'bg-slate-900 border-slate-800 text-slate-700 scale-90 opacity-40'
            }`}
          >
            R{i + 1}
            {pending && <span className="ml-0.5 text-[8px] animate-pulse">⏳</span>}
          </div>
        </div>
      );
    })}
  </div>
);

// ── AgentCard (Council member status) ───────────────────────
const AgentCard = ({ name, role, status, icon }) => {
  const statusColor = 
    status === 'approved' ? 'from-emerald-900/40 to-emerald-900/20 border-emerald-500/60 text-emerald-300 shadow-emerald-500/20'
    : status === 'thinking' ? 'from-blue-900/40 to-blue-900/20 border-blue-500/60 text-blue-300 shadow-blue-500/20'
    : 'from-slate-900/30 to-slate-900/10 border-slate-600/40 text-slate-400 shadow-slate-500/10';
  const statusDot =
    status === 'approved' ? '🟢'
    : status === 'thinking' ? '🟡'
    : '⚪';
  return (
    <div className={`bg-gradient-to-br ${statusColor} border rounded-lg p-3 sm:p-4 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg sm:text-xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-200 truncate">{name}</div>
          <div className="text-[7px] sm:text-[8px] text-slate-500 truncate">{role}</div>
        </div>
        <span className="text-lg shrink-0 animate-bounce">{statusDot}</span>
      </div>
      <div className="text-[8px] sm:text-[9px] capitalize text-slate-300 font-semibold">{status || 'idle'}</div>
    </div>
  );
};

// ── AIPanel (AI Analysis streaming) ───────────────────────────
const AIPanel = ({ text, status }) => (
  <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/30 border border-slate-700/50 rounded-lg p-3 sm:p-4 flex flex-col h-auto sm:min-h-28 lg:min-h-40 shadow-lg hover:shadow-xl transition-all card-dark">
    <div className="flex items-center justify-between mb-2 shrink-0">
      <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">🧠 AI Analysis</h2>
      <span className={`text-[8px] uppercase font-bold px-2 py-1 rounded-full ${
        status === 'complete' ? 'bg-emerald-900/40 text-emerald-400 text-glow-success' 
        : status === 'streaming' ? 'bg-blue-900/40 text-blue-400 text-glow animate-pulse' 
        : 'bg-slate-900/40 text-slate-600'
      }`}>
        ●  {status}
      </span>
    </div>
    <div className="flex-1 min-h-24 sm:min-h-32 overflow-y-auto bg-slate-950/60 rounded-lg border border-slate-700/30 p-3 sm:p-4 text-[9px] sm:text-[10px] lg:text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-words terminal-text">
      {text || '(waiting for incident...)'}
    </div>
  </div>
);

// ── TerminalLog (Event log terminal) ───────────────────────────
const TerminalLog = ({ logs }) => (
  <div className="bg-slate-950/80 border border-slate-700/50 rounded-lg font-mono text-[8px] sm:text-[9px] lg:text-[10px] overflow-hidden flex flex-col h-full shadow-lg card-dark">
    <div className="bg-gradient-to-r from-slate-900/80 to-slate-900/40 px-3 sm:px-4 py-2 border-b border-slate-700/50 text-slate-500 shrink-0 font-semibold">
      <span className="text-emerald-500">$</span> aegis-event-log
    </div>
    <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-0.5 sm:space-y-1">
      {logs.length === 0 ? (
        <div className="text-slate-600 italic">Waiting for events...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={`flex gap-2 sm:gap-3 terminal-line font-mono ${
            log.type === 'alert' ? 'text-red-400 font-semibold'
            : log.type === 'resolve' ? 'text-emerald-400 font-semibold'
            : log.type === 'council' ? 'text-blue-400'
            : log.type === 'ai' ? 'text-purple-400'
            : log.type === 'action' ? 'text-amber-400'
            : 'text-slate-400'
          }`}>
            <span className="text-slate-600 shrink-0">[{log.ts}]</span>
            <span className="break-words flex-1">{log.msg}</span>
          </div>
        ))
      )}
    </div>
  </div>
);

export default function DashboardCockpit() {
  const { connected, lastMessage, messages, send } = useWebSocket(WS_URL);
  const [metrics, setMetrics]           = useState({ cpu: 15, memory: 42, db: 18, net: 7, disk: 12 });
  const [containers, setContainers]    = useState([]);
  const [replicaCount, setReplicaCount] = useState(1);
  const [confirmedReplicaCount, setConfirmedReplicaCount] = useState(1); // last confirmed by backend
  const [councilStatus, setCouncilStatus] = useState({ sre: 'idle', security: 'idle', auditor: 'idle' });
  const [aiText, setAiText]             = useState('');
  const [aiStatus, setAiStatus]         = useState('idle'); // idle | streaming | complete
  const [logs, setLogs]                 = useState([]);
  const [decision, setDecision]         = useState(null);
  const [cumulativeSavings, setCumulativeSavings] = useState(0.0);
  const [lastSavedPopup, setLastSavedPopup] = useState({ amt: 0, visible: false });
  const simTimers                       = useRef([]);
  const pendingScaleTimer = useRef(null);
  const pendingScaleTarget = useRef(null);

  // ── Helpers ────────────────────────────────────────────────
  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-199), { ts: ts(), msg, type }]);
  }, []);

  // Savings baseline table (demo-friendly defaults)
  const SAVINGS_BASELINE = {
    memory_oom:    { baseline_minutes: 30, cost_per_min: 10 },
    cpu_spike:     { baseline_minutes: 20, cost_per_min: 8 },
    db_connection: { baseline_minutes: 45, cost_per_min: 12 },
    network_latency:{ baseline_minutes: 15, cost_per_min: 5 },
    disk_space:    { baseline_minutes: 60, cost_per_min: 4 },
    pod_crash:     { baseline_minutes: 10, cost_per_min: 15 },
  };

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
          setConfirmedReplicaCount(rc);
          // clear any pending optimistic state
          if (pendingScaleTimer.current) { clearTimeout(pendingScaleTimer.current); pendingScaleTimer.current = null; pendingScaleTarget.current = null; }
          addLog(`📈 SCALED to ${rc} replicas (confirmed)`, 'action');
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

      case 'incident.savings': {
        const money = Number(f.data?.money_saved || 0);
        if (money > 0) {
          setCumulativeSavings(prev => Math.round((prev + money) * 100) / 100);
          setLastSavedPopup({ amt: money, visible: true });
          setTimeout(() => setLastSavedPopup({ amt: money, visible: false }), 3000);
          addLog(`💰 Authoritative savings: $${money.toFixed(2)}`, 'action');
        }
        break;
      }

      case 'failed':
        addLog(`❌ FAILED: ${f.data?.error || ''}`, 'alert');
        break;

      default: break;
    }
  }, [lastMessage, addLog]);

  // ── Scale trigger (call backend endpoint) ────────────────
  const triggerScale = async (direction, count = 1) => {
    try {
      const endpoint = direction === 'up' ? `/scale/up?count=${count}` : `/scale/down?count=${count}`;
      const resp = await fetch(endpoint, { method: 'POST' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      throw new Error(err.message || 'Scale request failed');
    }
  };

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
    const receivedAt = Date.now();

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
      // --- Simulated savings calculation (demo only) ---
      try {
        const baseline = SAVINGS_BASELINE[alertType] || { baseline_minutes: 20, cost_per_min: 5 };
        const resolvedAt = Date.now();
        const ttrMinutes = Math.max(0, (resolvedAt - receivedAt) / 60000);
        const moneySaved = Math.max(0, (baseline.baseline_minutes - ttrMinutes) * baseline.cost_per_min);
        const rounded = Math.round(moneySaved * 100) / 100;
        if (rounded > 0) {
          setCumulativeSavings(prev => Math.round((prev + rounded) * 100) / 100);
          setLastSavedPopup({ amt: rounded, visible: true });
          setTimeout(() => setLastSavedPopup({ amt: rounded, visible: false }), 3000);
          addLog(`💰 Estimated savings: $${rounded.toFixed(2)} (baseline ${baseline.baseline_minutes}m)`, 'action');
        } else {
          addLog('ℹ️ No measurable savings relative to baseline.', 'action');
        }
      } catch (e) {
        // no-op for demo
      }
    });
  }, [addLog]);

  // ── Scale handlers (UI hooks into backend + optimistic update) ───
  const handleScaleUp = async (count = 1) => {
    const prev = replicaCount;
    const next = Math.min(5, prev + count);
    setReplicaCount(next);
    // mark pending target until confirmed
    pendingScaleTarget.current = next;
    if (pendingScaleTimer.current) clearTimeout(pendingScaleTimer.current);
    pendingScaleTimer.current = setTimeout(() => {
      // revert optimistic UI if no confirmation
      setReplicaCount(confirmedReplicaCount);
      pendingScaleTarget.current = null;
      pendingScaleTimer.current = null;
      addLog('⚠️ Scale confirmation timeout — reverting UI', 'alert');
    }, 12000);
    addLog(`🔧 UI: scaling up to ${next} replicas (optimistic)`, 'action');
    try {
      await triggerScale('up', count);
      addLog(`📈 Scale request successful (+${count})`, 'action');
    } catch (err) {
      setReplicaCount(prev);
      addLog(`⚠️ Scale up failed: ${err?.message || err}`, 'alert');
    }
  };

  const handleScaleDown = async (count = 1) => {
    const prev = replicaCount;
    const next = Math.max(1, prev - count);
    setReplicaCount(next);
    // mark pending target until confirmed
    pendingScaleTarget.current = next;
    if (pendingScaleTimer.current) clearTimeout(pendingScaleTimer.current);
    pendingScaleTimer.current = setTimeout(() => {
      setReplicaCount(confirmedReplicaCount);
      pendingScaleTarget.current = null;
      pendingScaleTimer.current = null;
      addLog('⚠️ Scale confirmation timeout — reverting UI', 'alert');
    }, 12000);
    addLog(`🔧 UI: scaling down to ${next} replicas (optimistic)`, 'action');
    try {
      await triggerScale('down', count);
      addLog(`📉 Scale request successful (-${count})`, 'action');
    } catch (err) {
      setReplicaCount(prev);
      addLog(`⚠️ Scale down failed: ${err?.message || err}`, 'alert');
    }
  };

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
    <div className="h-screen w-full bg-gradient-to-br from-[#0B0F17] via-[#0D1621] to-[#0A0E16] text-slate-200 flex flex-col lg:flex-row font-sans overflow-hidden select-none">

      {/* ── ZONE 1: CHAOS INJECTION PANEL (Left) ── */}
      <div className="w-full lg:w-60 xl:w-72 bg-gradient-to-b from-[#0F141F] to-[#0A0E16] border-b lg:border-b-0 lg:border-r border-slate-800/50 flex flex-col z-10 shrink-0 max-h-[40vh] lg:max-h-none overflow-y-auto lg:overflow-y-auto">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-800/50 relative bg-gradient-to-r from-slate-900/50 to-transparent">
          <h1 className="text-base sm:text-lg lg:text-lg font-extrabold tracking-wider text-white text-glow">AEGIS<span className="text-emerald-500">OPS</span></h1>
          <div className="flex items-center mt-2 gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span className={`text-[8px] sm:text-[9px] uppercase tracking-widest font-semibold ${connected ? 'text-emerald-500 text-glow-success' : 'text-red-500 text-glow-danger'}`}>{connected ? '● ONLINE' : '● OFFLINE'}</span>
          </div>
          {lastSavedPopup.visible && (
            <div className="absolute top-3 right-2 bg-gradient-to-r from-amber-900 to-amber-800 text-amber-100 px-3 py-1.5 rounded-lg shadow-lg text-[11px] sm:text-[12px] font-bold border border-amber-500/40 text-glow-warning">
              {'+$' + lastSavedPopup.amt.toFixed(2)}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 lg:p-4 flex-1 flex flex-col gap-3 lg:gap-4">
          <div className="metric-card p-3 sm:p-4">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 font-semibold">💰 Est. Savings</div>
            <div className="metric-value mt-2">${cumulativeSavings.toFixed(2)}</div>
            <div className="text-[8px] sm:text-[9px] text-slate-600 mt-2">Demo estimate</div>
          </div>
          
          <div className="pt-2 border-t border-slate-800/30">
            <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">🎯 Chaos Injection</h2>
            <div className="space-y-1.5 sm:space-y-2">
              {INJECT_BUTTONS.map(b => (
                <button key={b.type}
                  onClick={() => triggerIncident(b.type, b.label)}
                  className={`group w-full text-left px-2 sm:px-3 py-2 sm:py-2.5 border rounded-lg transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-medium cursor-pointer btn-glow backdrop-blur-sm ${
                    b.color === 'red'
                      ? 'bg-red-950/20 border-red-900/50 hover:bg-red-950/40 hover:border-red-500/60 text-red-400 hover:shadow-lg hover:shadow-red-500/20'
                      : 'bg-orange-950/20 border-orange-900/50 hover:bg-orange-950/40 hover:border-orange-500/60 text-orange-400 hover:shadow-lg hover:shadow-orange-500/20'
                  }`}>
                  <span className="text-sm sm:text-base group-hover:scale-125 transition-transform shrink-0">{b.icon}</span>
                  <span className="truncate font-semibold">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scale controls */}
          <div className="mt-3 lg:mt-auto pt-3 sm:pt-4 lg:pt-4 border-t border-slate-800/30 space-y-2">
            <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">⚙️ Replicas</h2>
            <button onClick={() => { triggerScale('up', 2); setReplicaCount(c => Math.min(5, c + 2)); }}
              className="w-full btn-primary btn-glow px-2 sm:px-3 py-2 rounded-lg text-[9px] sm:text-[10px] font-semibold hover:shadow-emerald-500/50">
              ▲ SCALE UP
            </button>
            <button onClick={() => { triggerScale('down'); setReplicaCount(c => Math.max(1, c - 1)); }}
              className="w-full px-2 sm:px-3 py-2 bg-slate-900/40 border border-slate-700/50 hover:border-slate-600 text-slate-400 rounded-lg text-[9px] sm:text-[10px] font-semibold cursor-pointer transition-all hover:bg-slate-800/40">
              ▼ SCALE DOWN
            </button>
          </div>
        </div>
      </div>

      {/* ── ZONE 2: TELEMETRY & TOPOLOGY (Center) ── */}
      <div className="w-full lg:w-60 xl:w-80 bg-gradient-to-b from-[#0B0F17] to-[#0A0E16] border-b lg:border-b-0 lg:border-r border-slate-800/50 p-3 sm:p-4 lg:p-5 flex flex-col gap-4 lg:gap-6 overflow-y-auto shrink-0 max-h-[30vh] lg:max-h-none zone-divider">

        {/* Live Telemetry */}
        <div className="metric-card p-4 sm:p-5 rounded-lg">
          <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">📡 Live Telemetry</h2>
          <MetricBar label="CPU Usage"     value={metrics.cpu}    unit="%" />
          <MetricBar label="Memory RSS"    value={metrics.memory} unit="%" />
          <MetricBar label="DB Latency"    value={metrics.db}     unit="ms" max={100} />
          <MetricBar label="Network RTT"   value={metrics.net}    unit="ms" max={100} />
        </div>

        {/* Infrastructure Topology */}
        <div className="hidden sm:block">
          <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">🗺️ Infrastructure</h2>
          <div className="card-dark rounded-lg p-4 space-y-3 border border-slate-800/50">
            {/* Topology nodes */}
            <div className="flex flex-col items-center space-y-2 text-[9px] sm:text-[10px]">
              <div className="px-3 py-1.5 rounded-lg border border-blue-500/50 bg-blue-900/20 text-blue-400 font-semibold">🌐 Internet</div>
              <div className="h-4 w-px bg-gradient-to-b from-slate-700 to-transparent" />
              <div className="px-3 py-1.5 rounded-lg border border-purple-500/50 bg-purple-900/20 text-purple-400 font-semibold">⚖️ NGINX LB</div>
              <div className="h-4 w-px bg-gradient-to-b from-slate-700 to-transparent" />
              <div className="w-full">
                <div className="flex justify-between text-[8px] sm:text-[9px] text-slate-600 mb-3 uppercase font-semibold">
                  <span>App Replicas</span>
                  <span className={replicaCount > 1 ? 'text-emerald-400 text-glow-success' : 'text-slate-600'}>{replicaCount}/5</span>
                </div>
                <ReplicaNodes count={replicaCount} />

                <div className="mt-3 flex items-center gap-1 flex-wrap">
                  <button onClick={() => handleScaleUp(1)}
                    className="px-2 py-1 bg-emerald-800/30 border border-emerald-700/50 text-emerald-300 text-[9px] sm:text-[10px] rounded-md hover:bg-emerald-800/50 hover:border-emerald-500 transition-all font-semibold">
                    +1
                  </button>
                  <button onClick={() => handleScaleUp(2)}
                    className="px-2 py-1 bg-emerald-800/20 border border-emerald-700/50 text-emerald-300 text-[9px] sm:text-[10px] rounded-md hover:bg-emerald-800/40 hover:border-emerald-500 transition-all font-semibold">
                    +2
                  </button>
                  <button onClick={() => handleScaleDown(1)}
                    className="px-2 py-1 bg-slate-900/40 border border-slate-700/50 text-slate-400 text-[9px] sm:text-[10px] rounded-md hover:bg-slate-800/50 hover:border-slate-600 transition-all">
                    -1
                  </button>
                  <button onClick={() => handleScaleDown(2)}
                    className="px-2 py-1 bg-slate-900/40 border border-slate-700/50 text-slate-400 text-[9px] sm:text-[10px] rounded-md hover:bg-slate-800/50 hover:border-slate-600 transition-all">
                    -2
                  </button>
                  <span className="text-[8px] sm:text-[9px] text-slate-500 ml-auto font-mono">Slots: 5</span>
                </div>
              </div>
            </div>

            {/* Container health */}
            <div className="pt-3 border-t border-slate-800/50 space-y-1.5">
              <div className="text-[8px] font-semibold text-slate-500 uppercase mb-2">Container Status</div>
              {(containers.length ? containers : [
                { name: 'aegis-agent', status: 'running' },
                { name: 'aegis-cockpit', status: 'running' },
                { name: 'buggy-app-v2', status: 'running' },
                { name: 'aegis-lb', status: 'running' },
                { name: 'aegis-dashboard', status: 'running' },
              ]).slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[8px] sm:text-[9px] terminal-line hover:bg-slate-800/20">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'running' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-slate-400 truncate font-mono">{c.name}</span>
                  <span className={`ml-auto font-semibold ${c.status === 'running' ? 'text-emerald-400 text-glow-success' : 'text-red-400 text-glow-danger'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ZONE 3 & 4: COUNCIL + AI BRAIN + TERMINAL (Right) ── */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-5 gap-3 lg:gap-4 min-w-0 overflow-y-auto">

        {/* Multi-Agent Council */}
        <div className="card-dark p-4 sm:p-5 rounded-lg border border-slate-800/50">
          <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
            <span>🗳️ Multi-Agent Governance Council</span>
            {decision && (
              <span className={`ml-2 lg:ml-3 px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-bold inline-block ${
                decision.final_verdict === 'APPROVED'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/40 text-glow-success'
                  : 'bg-red-900/40 text-red-400 border border-red-500/40 text-glow-danger'
              }`}>
                {decision.final_verdict === 'APPROVED' ? '✓ APPROVED' : '✗ REJECTED'}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <AgentCard name="SRE Lead"   role="Diagnosis"    status={councilStatus.sre}      icon="🧠" />
            <AgentCard name="SecOps"     role="Safety Check" status={councilStatus.security}  icon="🛡️" />
            <AgentCard name="Auditor"    role="Compliance"   status={councilStatus.auditor}   icon="📝" />
          </div>
        </div>

        {/* AI Brain Analysis */}
        <div className="min-h-28 lg:min-h-40">
          <AIPanel text={aiText} status={aiStatus} />
        </div>

        {/* Event Log */}
        <div className="flex-1 flex flex-col min-h-32 lg:min-h-44">
          <h2 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between shrink-0">
            <span>📋 Event Log</span>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="text-slate-500 hover:text-slate-300 text-[8px] sm:text-[9px] cursor-pointer transition-colors">clear</button>
            )}
          </h2>
          <TerminalLog logs={logs} />
        </div>
      </div>
    </div>
  );
}
