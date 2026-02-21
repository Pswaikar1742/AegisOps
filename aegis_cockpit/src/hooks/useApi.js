import { useState, useEffect, useCallback } from 'react';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : `http://${window.location.hostname}:8001`;

export function useApi() {
  const [incidents, setIncidents] = useState([]);
  const [containers, setContainers] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [topology, setTopology] = useState({ nodes: [], edges: [] });
  const [health, setHealth] = useState(null);

  const fetchJSON = async (path) => {
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`[API] ${path} failed:`, e.message);
      return null;
    }
  };

  const refresh = useCallback(async () => {
    const [inc, cont, met, topo, hp] = await Promise.all([
      fetchJSON('/incidents'),
      fetchJSON('/containers'),
      fetchJSON('/metrics'),
      fetchJSON('/topology'),
      fetchJSON('/health'),
    ]);
    if (inc) setIncidents(inc);
    if (cont) setContainers(cont);
    if (met) setMetrics(met);
    if (topo) setTopology(topo);
    if (hp) setHealth(hp);
  }, []);

  const triggerScale = useCallback(async (direction, count = 2) => {
    try {
      const res = await fetch(`${API_BASE}/scale/${direction}?count=${count}`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.error('[API] Scale failed:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { incidents, containers, metrics, topology, health, refresh, triggerScale, API_BASE };
}
