import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTerminal, FiCpu, FiAlertTriangle } from 'react-icons/fi';
import { sanitizeText } from '../utils/textSanitize';

/**
 * AI Stream Panel – The "movie hacker" typewriter effect.
 * Shows AI thinking in real-time with streaming characters.
 */
export default function AIStreamPanel({ messages }) {
  const [streamText, setStreamText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [logs, setLogs] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!messages.length) return;
    const msg = messages[messages.length - 1];

    if (msg.type === 'ai.thinking') {
      setIsThinking(true);
      setStreamText('');
      setLogs((prev) => [...prev.slice(-50), {
        ts: msg.timestamp,
        type: 'THINKING',
        text: msg.data?.message || 'AI is analysing…',
        color: 'text-aegis-cyan',
      }]);
    } else if (msg.type === 'ai.stream') {
      setStreamText(msg.data?.full_text || '');
    } else if (msg.type === 'ai.complete') {
      setIsThinking(false);
      const analysis = msg.data?.analysis;
      if (analysis) {
        setLogs((prev) => [...prev.slice(-50),
          { ts: msg.timestamp, type: 'ROOT_CAUSE', text: sanitizeText(analysis.root_cause), color: 'text-aegis-warn' },
          { ts: msg.timestamp, type: 'ACTION', text: `${analysis.action} (${(Math.max(0, Math.min(1, Number(analysis.confidence)||0))*100).toFixed(0)}% confidence)`, color: 'text-aegis-accent' },
          { ts: msg.timestamp, type: 'REASONING', text: sanitizeText(analysis.justification), color: 'text-gray-400' },
        ]);
      }
    } else if (msg.type === 'council.vote') {
      const vote = msg.data?.vote;
      if (vote) {
        const color = vote.verdict === 'APPROVED' ? 'text-aegis-accent' : vote.verdict === 'REJECTED' ? 'text-aegis-danger' : 'text-aegis-warn';
        setLogs((prev) => [...prev.slice(-50), {
          ts: msg.timestamp,
          type: `COUNCIL:${vote.role}`,
          text: `${vote.verdict} – ${vote.reasoning}`,
          color,
        }]);
      }
    } else if (msg.type === 'status.update' || msg.type === 'docker.action' || msg.type === 'scale.event') {
      setLogs((prev) => [...prev.slice(-50), {
        ts: msg.timestamp,
        type: msg.type.toUpperCase().replace('.', ':'),
        text: msg.data?.message || JSON.stringify(msg.data),
        color: 'text-aegis-blue',
      }]);
    } else if (msg.type === 'resolved') {
      setLogs((prev) => [...prev.slice(-50), {
        ts: msg.timestamp, type: 'RESOLVED', text: '✅ Incident resolved!', color: 'text-aegis-accent',
      }]);
    } else if (msg.type === 'failed') {
      setLogs((prev) => [...prev.slice(-50), {
        ts: msg.timestamp, type: 'FAILED', text: `❌ ${msg.data?.error || 'Failed'}`, color: 'text-aegis-danger',
      }]);
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs, streamText]);

  return (
    <div className="glass-panel rounded-lg h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border bg-black/30">
        <FiTerminal className="text-aegis-accent text-sm" />
        <span className="text-xs font-mono text-aegis-accent tracking-wider">AI NEURAL STREAM</span>
        {isThinking && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-auto flex items-center gap-1 text-xs text-aegis-cyan"
          >
            <FiCpu className="text-sm" />
            PROCESSING
          </motion.div>
        )}
      </div>

      {/* Log feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-gray-600 text-center py-8">
            <FiAlertTriangle className="mx-auto text-2xl mb-2" />
            Waiting for incidents…
          </div>
        )}

        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <span className="text-gray-600 whitespace-nowrap">
                {log.ts?.slice(11, 19) || '??:??:??'}
              </span>
              <span className="text-aegis-purple whitespace-nowrap">[{log.type}]</span>
              <span className={log.color}>{log.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming typewriter text - BRIGHT GREEN/CYAN WITH TYPEWRITER EFFECT */}
        {isThinking && streamText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 p-3 bg-black/80 rounded border-2 border-cyan-500/40 typewriter-stream"
          >
            {sanitizeText(streamText).split('').map((char, i) => (
              <span
                key={i}
                className="inline-block bright-cyan"
                style={{
                  animation: `typewriter 0.03s ease-out ${i * 0.03}s forwards`,
                  opacity: 0,
                }}
              >
                {char}
              </span>
            ))}
            <span className="ml-1 inline-block animate-pulse text-cyan-400">▊</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
