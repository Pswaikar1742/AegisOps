import React, { useMemo } from 'react';
import Header from './components/Header';
import AIStreamPanel from './components/AIStreamPanel';
import MetricsPanel from './components/MetricsPanel';
import MetricsCharts from './components/MetricsCharts';
import IncidentPanel from './components/IncidentPanel';
import TopologyPanel from './components/TopologyPanel';
import ScaleControls from './components/ScaleControls';
import { useWebSocket } from './hooks/useWebSocket';
import { useApi } from './hooks/useApi';

// Determine WebSocket URL based on environment
const WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:8001/ws'
  : `ws://${window.location.hostname}:8001/ws`;

export default function App() {
  const { connected, messages } = useWebSocket(WS_URL);
  const { incidents, metrics, topology, health, triggerScale } = useApi();

  // Also update metrics from WS if available
  const wsMetrics = useMemo(() => {
    const metricMsgs = messages.filter(m => m.type === 'metrics');
    if (metricMsgs.length > 0) {
      return metricMsgs[metricMsgs.length - 1].data || [];
    }
    return null;
  }, [messages]);

  // Also update containers from WS
  const wsTopology = useMemo(() => {
    const topoMsgs = messages.filter(m => m.type === 'container.list');
    if (topoMsgs.length > 0) {
      return topoMsgs[topoMsgs.length - 1].data;
    }
    return null;
  }, [messages]);

  const displayMetrics = wsMetrics || metrics;

  // Filter AI-related messages for the stream panel
  const aiMessages = useMemo(() => {
    return messages.filter(m =>
      ['ai.thinking', 'ai.stream', 'ai.complete', 'council.vote', 'council.decision',
       'status.update', 'docker.action', 'scale.event', 'health.check',
       'resolved', 'failed', 'incident.new'].includes(m.type)
    );
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-aegis-bg grid-bg">
      {/* Top bar */}
      <Header
        connected={connected}
        health={health}
        incidentCount={incidents.filter(i => !['RESOLVED', 'FAILED'].includes(i.status)).length}
      />

      {/* Main cockpit grid */}
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-2 p-2 overflow-hidden">

        {/* Left column: AI Neural Stream (tall) */}
        <div className="col-span-5 row-span-4">
          <AIStreamPanel messages={aiMessages} />
        </div>

        {/* Center-top: Metrics Charts */}
        <div className="col-span-4 row-span-2">
          <MetricsCharts metrics={displayMetrics} />
        </div>

        {/* Right column: Container Metrics */}
        <div className="col-span-3 row-span-4">
          <MetricsPanel metrics={displayMetrics} />
        </div>

        {/* Center-middle: Service Topology */}
        <div className="col-span-4 row-span-2">
          <TopologyPanel topology={topology} />
        </div>

        {/* Bottom-left: Incident Tracker */}
        <div className="col-span-5 row-span-2">
          <IncidentPanel incidents={incidents} />
        </div>

        {/* Bottom-center: Scale Controls */}
        <div className="col-span-4 row-span-2 flex flex-col gap-2">
          <ScaleControls onScale={triggerScale} />
          {/* Quick stats */}
          <div className="glass-panel rounded-lg p-3 flex-1 flex items-center justify-around">
            <Stat label="Containers" value={displayMetrics?.length || 0} color="text-aegis-blue" />
            <Stat label="Incidents" value={incidents.length} color="text-aegis-warn" />
            <Stat label="Resolved" value={incidents.filter(i => i.status === 'RESOLVED').length} color="text-aegis-accent" />
            <Stat label="Failed" value={incidents.filter(i => i.status === 'FAILED').length} color="text-aegis-danger" />
            <Stat label="WS Clients" value={health?.ws_clients || 0} color="text-aegis-purple" />
          </div>
        </div>

        {/* Bottom-right: stays in metrics column */}
        <div className="col-span-3 row-span-2 flex flex-col gap-2">
          <div className="glass-panel rounded-lg p-3 flex-1">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-mono">System Info</div>
            <div className="space-y-1 text-xs">
              <InfoRow label="Mode" value="GOD MODE" valueClass="text-aegis-purple font-bold" />
              <InfoRow label="WebSocket" value={connected ? 'LIVE' : 'DISCONNECTED'} valueClass={connected ? 'text-aegis-accent' : 'text-aegis-danger'} />
              <InfoRow label="API" value={health ? 'HEALTHY' : 'UNREACHABLE'} valueClass={health ? 'text-aegis-accent' : 'text-aegis-danger'} />
              <InfoRow label="Council" value="3 Agents" valueClass="text-aegis-purple" />
              <InfoRow label="Auto-Scale" value="Enabled" valueClass="text-aegis-warn" />
              <InfoRow label="LLM" value="Claude + Ollama" valueClass="text-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function InfoRow({ label, value, valueClass = 'text-gray-300' }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}
