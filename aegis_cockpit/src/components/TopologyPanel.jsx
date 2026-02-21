import React from 'react';
import { motion } from 'framer-motion';
import { FiBox, FiArrowRight, FiZap, FiShield, FiMonitor, FiServer } from 'react-icons/fi';

const ICON_MAP = {
  agent: FiShield,
  app: FiServer,
  replica: FiZap,
  dashboard: FiMonitor,
  loadbalancer: FiBox,
  unknown: FiBox,
};

const COLOR_MAP = {
  agent: 'border-aegis-accent text-aegis-accent',
  app: 'border-aegis-blue text-aegis-blue',
  replica: 'border-aegis-purple text-aegis-purple',
  dashboard: 'border-aegis-cyan text-aegis-cyan',
  loadbalancer: 'border-aegis-warn text-aegis-warn',
  unknown: 'border-gray-500 text-gray-500',
};

export default function TopologyPanel({ topology }) {
  const { nodes = [], edges = [] } = topology || {};

  if (nodes.length === 0) {
    return (
      <div className="glass-panel rounded-lg h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border bg-black/30">
          <FiBox className="text-aegis-cyan text-sm" />
          <span className="text-xs font-mono text-aegis-cyan tracking-wider">SERVICE TOPOLOGY</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          No services detected
        </div>
      </div>
    );
  }

  // Group by type for layout
  const agents = nodes.filter(n => n.type === 'agent');
  const apps = nodes.filter(n => n.type === 'app');
  const replicas = nodes.filter(n => n.type === 'replica');
  const lbs = nodes.filter(n => n.type === 'loadbalancer');
  const others = nodes.filter(n => !['agent', 'app', 'replica', 'loadbalancer'].includes(n.type));

  const NodeCard = ({ node, index }) => {
    const Icon = ICON_MAP[node.type] || FiBox;
    const colors = COLOR_MAP[node.type] || COLOR_MAP.unknown;
    const isRunning = node.status === 'running';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className={`relative p-3 rounded-lg border bg-black/30 ${colors} ${
          isRunning ? '' : 'opacity-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className="text-lg" />
          <div>
            <div className="text-xs font-mono font-medium truncate max-w-[120px]">{node.id}</div>
            <div className="text-[9px] text-gray-500">{node.type.toUpperCase()}</div>
          </div>
          <span className={`ml-auto status-dot ${isRunning ? 'healthy' : 'critical'}`} />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="glass-panel rounded-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border bg-black/30">
        <FiBox className="text-aegis-cyan text-sm" />
        <span className="text-xs font-mono text-aegis-cyan tracking-wider">SERVICE TOPOLOGY</span>
        <span className="ml-auto text-[10px] text-gray-600 font-mono">{nodes.length} services</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Agent tier */}
        {agents.length > 0 && (
          <div className="mb-4">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Control Plane</div>
            <div className="flex flex-wrap gap-2">
              {agents.map((n, i) => <NodeCard key={n.id} node={n} index={i} />)}
            </div>
          </div>
        )}

        {/* Connection arrow */}
        {agents.length > 0 && (apps.length > 0 || replicas.length > 0) && (
          <div className="flex justify-center my-2">
            <div className="flex flex-col items-center text-gray-600">
              <div className="w-px h-4 bg-aegis-border" />
              <FiArrowRight className="rotate-90 text-xs" />
              <div className="text-[8px]">monitors</div>
            </div>
          </div>
        )}

        {/* Load Balancer tier */}
        {lbs.length > 0 && (
          <div className="mb-4">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Load Balancer</div>
            <div className="flex flex-wrap gap-2">
              {lbs.map((n, i) => <NodeCard key={n.id} node={n} index={i} />)}
            </div>
          </div>
        )}

        {/* App tier */}
        {(apps.length > 0 || replicas.length > 0) && (
          <div className="mb-4">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Application Tier</div>
            <div className="flex flex-wrap gap-2">
              {apps.map((n, i) => <NodeCard key={n.id} node={n} index={i} />)}
              {replicas.map((n, i) => <NodeCard key={n.id} node={n} index={i + apps.length} />)}
            </div>
          </div>
        )}

        {/* Others */}
        {others.length > 0 && (
          <div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Other Services</div>
            <div className="flex flex-wrap gap-2">
              {others.map((n, i) => <NodeCard key={n.id} node={n} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
