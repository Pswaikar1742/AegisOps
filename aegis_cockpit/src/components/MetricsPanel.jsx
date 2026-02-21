import React from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiHardDrive, FiWifi, FiArrowUp, FiArrowDown, FiClock } from 'react-icons/fi';

function MetricBar({ label, value, max, unit, color, icon: Icon }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct > 80 ? 'bg-aegis-danger' : pct > 50 ? 'bg-aegis-warn' : `bg-${color}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-gray-400">
          {Icon && <Icon className="text-xs" />}
          {label}
        </div>
        <span className="font-mono text-gray-300">{typeof value === 'number' ? value.toFixed(1) : value}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full metric-bar ${pct > 80 ? 'bg-aegis-danger' : pct > 50 ? 'bg-aegis-warn' : 'bg-aegis-accent'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function formatUptime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function MetricsPanel({ metrics }) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="glass-panel rounded-lg h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border bg-black/30">
          <FiCpu className="text-aegis-blue text-sm" />
          <span className="text-xs font-mono text-aegis-blue tracking-wider">CONTAINER METRICS</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          No containers detected
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border bg-black/30">
        <FiCpu className="text-aegis-blue text-sm" />
        <span className="text-xs font-mono text-aegis-blue tracking-wider">CONTAINER METRICS</span>
        <span className="ml-auto text-[10px] text-gray-600 font-mono">{metrics.length} containers</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {metrics.map((m) => {
          const isHealthy = m.status === 'running';
          const isCritical = m.cpu_percent > 80 || m.memory_percent > 85;
          const isReplica = m.name.includes('replica');

          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg border ${
                isCritical ? 'border-aegis-danger/40 bg-red-900/10' :
                isReplica ? 'border-aegis-purple/30 bg-purple-900/10' :
                'border-aegis-border bg-black/20'
              }`}
            >
              {/* Container name + status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${isHealthy ? (isCritical ? 'critical' : 'healthy') : 'neutral'}`} />
                  <span className="text-xs font-mono font-medium text-gray-200 truncate max-w-[150px]">
                    {m.name}
                  </span>
                  {isReplica && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-aegis-purple/20 text-aegis-purple border border-aegis-purple/30">
                      REPLICA
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <FiClock className="text-[9px]" />
                  {formatUptime(m.uptime_seconds)}
                </div>
              </div>

              {/* Metrics bars */}
              <div className="space-y-2">
                <MetricBar label="CPU" value={m.cpu_percent} max={100} unit="%" icon={FiCpu} />
                <MetricBar label="MEM" value={m.memory_mb} max={m.memory_limit_mb || 512} unit="MB" icon={FiHardDrive} />
              </div>

              {/* Network */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <FiArrowDown className="text-aegis-accent" />
                  {formatBytes(m.net_rx_bytes)}
                </div>
                <div className="flex items-center gap-1">
                  <FiArrowUp className="text-aegis-blue" />
                  {formatBytes(m.net_tx_bytes)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
