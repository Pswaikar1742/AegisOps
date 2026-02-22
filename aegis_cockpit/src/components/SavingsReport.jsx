import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function SavingsReport({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!open) return;
    let canceled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch('/savings');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!canceled) setReport(json);
      } catch (err) {
        if (!canceled) setError(String(err));
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [open]);

  if (!open) return null;

  const top = (report && report.top) || [];
  const maxVal = Math.max(1, ...(top.map(t => t.money_saved || 0)));

  const pieData = useMemo(() => {
    if (!report || !report.top) return [];
    const map = {};
    report.top.forEach(t => {
      const k = t.alert_type || 'unknown';
      map[k] = (map[k] || 0) + (t.money_saved || 0);
    });
    return Object.keys(map).map(k => ({ name: k, value: Math.round(map[k] * 100) / 100 }));
  }, [report]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full sm:w-[720px] max-w-[95vw] max-h-[90vh] bg-[#071021] border border-slate-800 rounded-lg p-3 sm:p-5 text-slate-200 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
          <h3 className="text-base sm:text-lg font-bold">Savings Report</h3>
          <div className="text-sm text-slate-400 order-last sm:order-none">Total saved: <span className="font-semibold text-amber-300">${report ? report.total_saved.toFixed(2) : '0.00'}</span></div>
        </div>

        <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 overflow-hidden min-h-0">
          <div className="col-span-1 flex flex-col min-h-0">
            <div className="text-sm text-slate-400">Resolved incidents</div>
            <div className="text-2xl sm:text-3xl font-extrabold mt-1">{report ? report.resolved_count : 0}</div>
            <div className="mt-2 sm:mt-3 text-xs text-slate-500">Top incidents by savings</div>

            <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-48 overflow-y-auto flex-1">
              {top.length === 0 && <div className="text-slate-600 text-sm">No resolved incidents yet.</div>}
              {top.map((t, i) => (
                <div key={t.incident_id || i} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2 h-6 sm:h-8 bg-slate-800 rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] sm:text-[12px] truncate">{t.incident_id} • <span className="text-slate-500">{t.alert_type}</span></div>
                      <div className="text-amber-300 font-semibold text-sm">${(t.money_saved || 0).toFixed(2)}</div>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-slate-900 rounded mt-1.5 sm:mt-2 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${((t.money_saved || 0) / maxVal) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 flex flex-col min-h-0">
            <div className="text-sm text-slate-400">Chart (top incidents)</div>
            <div className="mt-2 sm:mt-3 bg-[#061018] border border-slate-800 rounded p-2 sm:p-3 flex-1 min-h-48 sm:min-h-0 flex flex-col">
              {loading && <div className="text-slate-500 flex items-center justify-center h-full">Loading…</div>}
              {error && <div className="text-red-400 flex items-center justify-center h-full">{error}</div>}
              {!loading && !error && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="h-32 sm:h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top.map((t, i) => ({ name: `#${i+1}`, id: t.incident_id, value: t.money_saved }))} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Tooltip formatter={(v) => ['$' + (v || 0).toFixed(2)]} />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-1 sm:mt-2 h-24 sm:h-20 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={32} innerRadius={14} label={({ name }) => name}>
                          {pieData.map((entry, idx) => (
                            <Cell key={`c-${idx}`} fill={[ '#f59e0b', '#34d399', '#60a5fa', '#f87171', '#a78bfa' ][idx % 5]} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" wrapperStyle={{ color: '#94a3b8', fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded hover:bg-slate-800">Close</button>
          <button onClick={() => { setLoading(true); setReport(null); }} className="w-full sm:w-auto px-3 py-1.5 text-sm bg-amber-800/20 border border-amber-700 text-amber-300 rounded hover:bg-amber-800/30">Refresh</button>
          <button onClick={() => report && exportCSV(report)} className="w-full sm:w-auto px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded hover:bg-slate-800">Export CSV</button>
          <button onClick={() => report && exportPDF(report)} className="w-full sm:w-auto px-3 py-1.5 text-sm bg-emerald-800/20 border border-emerald-700 text-emerald-300 rounded hover:bg-emerald-800/30">Export PDF</button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(report) {
  if (!report) return;
  const rows = [['incident_id','alert_type','money_saved','resolved_at','ttr_minutes']];
  (report.top || []).forEach(r => rows.push([r.incident_id, r.alert_type, (r.money_saved||0).toFixed(2), r.resolved_at||'', r.ttr_minutes||'']));
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aegis_savings_report_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportPDF(report) {
  if (!report) return;
  const rows = (report.top || []).map(r => `<tr><td>${r.incident_id}</td><td>${r.alert_type}</td><td>$${(r.money_saved||0).toFixed(2)}</td><td>${r.ttr_minutes||''}</td></tr>`).join('');
  const html = `
  <html><head><title>Savings Report</title>
  <style>body{font-family:Arial;color:#222}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style>
  </head><body>
  <h2>Savings Report</h2>
  <p>Total saved: $${report.total_saved.toFixed(2)}</p>
  <table><thead><tr><th>Incident</th><th>Type</th><th>Saved</th><th>TTR (min)</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return alert('Popup blocked — allow popups to export PDF');
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}
