import React, { useState } from 'react';
import { sanitizeText } from '../utils/textSanitize';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiXCircle, FiClock, FiChevronDown, FiChevronUp, FiShield } from 'react-icons/fi';

const STATUS_CONFIG = {
  RECEIVED: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: FiClock, label: 'Received' },
  ANALYSING: { color: 'text-aegis-cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: FiClock, label: 'Analysing' },
  COUNCIL_REVIEW: { color: 'text-aegis-purple', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: FiShield, label: 'Council Review' },
  APPROVED: { color: 'text-aegis-accent', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: FiCheckCircle, label: 'Approved' },
  EXECUTING: { color: 'text-aegis-blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: FiClock, label: 'Executing' },
  SCALING: { color: 'text-aegis-warn', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: FiClock, label: 'Scaling' },
  VERIFYING: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: FiClock, label: 'Verifying' },
  RESOLVED: { color: 'text-aegis-accent', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: FiCheckCircle, label: 'Resolved' },
  FAILED: { color: 'text-aegis-danger', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: FiXCircle, label: 'Failed' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.RECEIVED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <Icon className="text-xs" />
      {cfg.label}
    </span>
  );
}

function TimelineView({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="mt-3 pl-4 border-l-2 border-aegis-border space-y-2">
      {timeline.map((entry, i) => {
        const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.RECEIVED;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2 text-xs"
          >
            <div className={`w-2 h-2 rounded-full mt-1 ${cfg.bg} border ${cfg.border}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono font-medium ${cfg.color}`}>{entry.status}</span>
                {entry.agent && (
                  <span className="text-[9px] px-1 rounded bg-aegis-purple/10 text-aegis-purple">
                    {entry.agent}
                  </span>
                )}
                <span className="text-gray-600 ml-auto">{entry.ts?.slice(11, 19)}</span>
              </div>
              <p className="text-gray-400 mt-0.5">{entry.message}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function CouncilView({ decision }) {
  if (!decision) return null;

  return (
    <div className="mt-3 p-3 rounded-lg bg-aegis-purple/5 border border-aegis-purple/20">
      <div className="flex items-center gap-2 mb-2">
        <FiShield className="text-aegis-purple" />
        <span className="text-xs font-mono text-aegis-purple">COUNCIL DECISION</span>
        <span className={`ml-auto text-xs font-mono ${
          decision.final_verdict === 'APPROVED' ? 'text-aegis-accent' : 'text-aegis-danger'
        }`}>
          {decision.final_verdict}
        </span>
      </div>
      <div className="space-y-1">
        {decision.votes?.map((vote, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 w-28 font-mono">{vote.role}</span>
            <span className={`font-mono ${
              vote.verdict === 'APPROVED' ? 'text-aegis-accent' : 'text-aegis-danger'
            }`}>
              {vote.verdict}
            </span>
            <span className="text-gray-500 truncate flex-1">– {vote.reasoning?.slice(0, 60)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IncidentPanel({ incidents }) {
  const [expandedId, setExpandedId] = useState(null);

  const sorted = [...(incidents || [])].reverse();

  return (
    <div className="glass-panel rounded-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border bg-black/30">
        <FiAlertCircle className="text-aegis-warn text-sm" />
        <span className="text-xs font-mono text-aegis-warn tracking-wider">INCIDENT TRACKER</span>
        <span className="ml-auto text-[10px] text-gray-600 font-mono">{sorted.length} total</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 && (
          <div className="text-gray-600 text-center py-8 text-xs">
            <FiCheckCircle className="mx-auto text-2xl mb-2 text-aegis-accent" />
            All systems nominal
          </div>
        )}

        <AnimatePresence>
          {sorted.map((inc) => {
            const isExpanded = expandedId === inc.incident_id;
            return (
              <motion.div
                key={inc.incident_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border cursor-pointer ${
                  inc.status === 'FAILED' ? 'border-aegis-danger/30 bg-red-900/5' :
                  inc.status === 'RESOLVED' ? 'border-aegis-accent/20 bg-green-900/5' :
                  'border-aegis-border bg-black/20'
                }`}
              >
                {/* Summary row */}
                <div
                  className="p-3 flex items-center gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : inc.incident_id)}
                >
                  <StatusBadge status={inc.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-200 truncate">{inc.incident_id}</div>
                    <div className="text-[10px] text-gray-500">{inc.alert_type}</div>
                  </div>
                  {inc.replicas_spawned > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-aegis-purple/20 text-aegis-purple">
                      ×{inc.replicas_spawned} replicas
                    </span>
                  )}
                  {isExpanded ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-aegis-border/50">
                        {/* Analysis */}
                        {inc.analysis && (
                          <div className="mt-2 p-2 rounded bg-black/30 text-xs space-y-1">
                            <div><span className="text-gray-500">Root Cause:</span> <span className="text-aegis-warn">{sanitizeText(inc.analysis.root_cause)}</span></div>
                            <div><span className="text-gray-500">Recommended Action:</span> <span className="text-aegis-accent font-mono">{inc.analysis.action}</span></div>
                            <div><span className="text-gray-500">Confidence Level:</span> <span className="text-gray-300">{(Math.max(0, Math.min(1, Number(inc.analysis.confidence)||0)) * 100).toFixed(0)}%</span></div>
                            <div><span className="text-gray-500">Reasoning:</span> <span className="text-gray-400">{sanitizeText(inc.analysis.justification)}</span></div>
                          </div>
                        )}

                        {/* Council */}
                        <CouncilView decision={inc.council_decision} />

                        {/* Timeline */}
                        <TimelineView timeline={inc.timeline} />

                        {/* Error */}
                        {inc.error && (
                          <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-500/20 text-xs text-red-400">
                            {inc.error}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
