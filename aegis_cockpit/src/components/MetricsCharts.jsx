import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FiActivity } from 'react-icons/fi';

export default function MetricsCharts({ metrics }) {
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);

  useEffect(() => {
    if (!metrics || metrics.length === 0) return;

    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Aggregate CPU across all containers
    const totalCpu = metrics.reduce((sum, m) => sum + (m.cpu_percent || 0), 0);
    const avgCpu = totalCpu / metrics.length;

    // Aggregate Memory
    const totalMem = metrics.reduce((sum, m) => sum + (m.memory_mb || 0), 0);

    setCpuHistory((prev) => [...prev.slice(-30), { time: now, cpu: Math.round(avgCpu * 100) / 100 }]);
    setMemHistory((prev) => [...prev.slice(-30), { time: now, mem: Math.round(totalMem * 10) / 10 }]);
  }, [metrics]);

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiActivity className="text-aegis-accent text-sm" />
        <span className="text-xs font-mono text-aegis-accent tracking-wider">SYSTEM VITALS</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* CPU Chart */}
        <div>
          <div className="text-[10px] text-gray-500 mb-1 font-mono">AVG CPU %</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '10px' }}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#00ff88" fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Chart */}
        <div>
          <div className="text-[10px] text-gray-500 mb-1 font-mono">TOTAL MEMORY MB</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memHistory}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '10px' }}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Area type="monotone" dataKey="mem" stroke="#3b82f6" fill="url(#memGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
