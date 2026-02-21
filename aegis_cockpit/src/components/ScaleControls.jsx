import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiArrowUp, FiArrowDown, FiLoader } from 'react-icons/fi';

export default function ScaleControls({ onScale }) {
  const [loading, setLoading] = useState(false);
  const [replicaCount, setReplicaCount] = useState(2);

  const handleScale = async (direction) => {
    setLoading(true);
    try {
      await onScale(direction, replicaCount);
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiZap className="text-aegis-warn text-sm" />
        <span className="text-xs font-mono text-aegis-warn tracking-wider">SCALE CONTROLS</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Replica count selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Replicas:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setReplicaCount(n)}
                className={`w-6 h-6 rounded text-xs font-mono transition-all ${
                  replicaCount === n
                    ? 'bg-aegis-purple text-white'
                    : 'bg-black/30 text-gray-500 hover:text-gray-300 border border-aegis-border'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Scale buttons */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleScale('up')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aegis-accent/10 text-aegis-accent border border-aegis-accent/30 text-xs font-mono hover:bg-aegis-accent/20 transition-all disabled:opacity-50"
        >
          {loading ? <FiLoader className="animate-spin" /> : <FiArrowUp />}
          SCALE UP
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleScale('down')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aegis-danger/10 text-aegis-danger border border-aegis-danger/30 text-xs font-mono hover:bg-aegis-danger/20 transition-all disabled:opacity-50"
        >
          {loading ? <FiLoader className="animate-spin" /> : <FiArrowDown />}
          SCALE DOWN
        </motion.button>
      </div>
    </div>
  );
}
