import React from 'react';
import { FiShield, FiActivity, FiWifi, FiWifiOff, FiZap } from 'react-icons/fi';

export default function Header({ connected, health, incidentCount }) {
  return (
    <header className="glass-panel border-b border-aegis-border px-6 py-3 flex items-center justify-between relative scan-overlay">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <FiShield className="text-aegis-accent text-3xl" />
          <FiZap className="text-yellow-400 text-xs absolute -top-1 -right-1" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider">
            <span className="text-aegis-accent text-glow">AEGIS</span>
            <span className="text-gray-300">OPS</span>
          </h1>
          <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase">God Mode · SRE Cockpit</p>
        </div>
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <FiActivity className={`text-sm ${incidentCount > 0 ? 'text-aegis-warn animate-pulse' : 'text-aegis-accent'}`} />
          <span className="text-gray-400">INCIDENTS</span>
          <span className={`font-mono font-bold ${incidentCount > 0 ? 'text-aegis-warn' : 'text-aegis-accent'}`}>
            {incidentCount}
          </span>
        </div>
        <div className="h-4 w-px bg-aegis-border" />
        <div className="flex items-center gap-2">
          <span className="text-gray-400">MODE</span>
          <span className="text-aegis-purple font-mono font-bold">GOD</span>
        </div>
        <div className="h-4 w-px bg-aegis-border" />
        <div className="flex items-center gap-2">
          <span className="text-gray-400">VERSION</span>
          <span className="text-gray-300 font-mono">{health?.version || '2.0.0'}</span>
        </div>
      </div>

      {/* Right: Connection */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono ${
          connected ? 'bg-aegis-accent/10 text-aegis-accent border border-aegis-accent/30' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {connected ? <FiWifi className="text-sm" /> : <FiWifiOff className="text-sm animate-pulse" />}
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">
          {new Date().toISOString().slice(11, 19)}Z
        </div>
      </div>
    </header>
  );
}
