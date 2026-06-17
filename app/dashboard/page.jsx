"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from "recharts";

/* ── Colors ── */
const COLORS = ["#5b95ff","#34d399","#fbbf24","#f87171","#a78bfa","#2dd4bf","#fb923c","#e879f9","#67e8f9","#86efac","#fca5a5","#c4b5fd","#fdba74","#6ee7b7","#93c5fd","#f9a8d4","#a3e635"];
const mc = i => COLORS[i % COLORS.length];

const fN = v => Number(v).toLocaleString("uz-UZ");
const fDate = iso => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };
const fAvg = v => Number(v).toFixed(1);

/* ── Tooltip ── */
function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel-top)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, maxHeight: 280, overflowY: "auto" }}>
      <div style={{ color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>{label}</div>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 10, justifyContent: "space-between", color: p.color, marginBottom: 2 }}>
          <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
          <span className="tnum" style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, color: "var(--text)", display: "flex", justifyContent: "space-between" }}>
        <span>Jami</span>
        <span className="tnum" style={{ fontWeight: 700 }}>{payload.reduce((s, p) => s + (p.value || 0), 0)}</span>
      </div>
    </div>
  );
}

/* ── KPI card ── */
function KPI({ label, value, sub, color }) {
  return (
    <div className="surface" style={{ borderRadius: "1.1rem", padding: 18, borderTop: `2px solid ${color || "var(--accent)"}` }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--muted)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div className="tnum font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em", color: color || "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Heatmap cell ── */
function HCell({ v, max }) {
  const intensity = max > 0 ? v / max : 0;
  const bg = v === 0
    ? "rgba(52,64,86,.15)"
    : `rgba(91,149,255,${0.15 + intensity * 0.75})`;
  return (
    <td style={{ padding: "4px 2px", textAlign: "center", minWidth: 34 }}>
      <div style={{ background: bg, borderRadius: 5, padding: "3px 0", fontSize: 11, fontWeight: v > 0 ? 600 : 400, color: v === 0 ? "var(--muted)" : intensity > 0.5 ? "#fff" : "var(--text)" }}>
        {v === 0 ? "·" : v}
      </div>
    </td>
  );
}

/* ══ MAIN ══ */
export default function Dashboard() {
  const [dasturlar, setDasturlar] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge,  setCacheAge]  = useState(null);
  const [selDastur, setSelDastur] = useState(null);   // null = oxirgi dastur
  const [view,      setView]      = useState("hafta"); // "hafta" | "heatmap" | "managers"

  const load = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/sheets${force ? "?force=1" : ""}`);
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "API xatosi");
      setDasturlar(d.dasturlar || []);
      setFromCache(d.fromCache || false);
      setCacheAge(d.cacheAge || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Active dastur */
  const dastur = useMemo(() => {
    if (!dasturlar.length) return null;
    if (selDastur) return dasturlar.find(d => d.name === selDastur) || dasturlar[dasturlar.length - 1];
    return dasturlar[dasturlar.length - 1]; // eng oxirgi (eng yangi)
  }, [dasturlar, selDastur]);

  /* KPIs */
  const kpi = useMemo(() => {
    if (!dastur) return {};
    const activeManagers = dastur.managers.filter(m => m.total > 0);
    const top = [...activeManagers].sort((a, b) => b.total - a.total)[0];
    const activeWeeks = dastur.weeks.filter((_, wi) => dastur.managers.some(m => m.weeks[wi] > 0));
    const weekTotals  = dastur.weeks.map((_, wi) => dastur.managers.reduce((s, m) => s + m.weeks[wi], 0)).filter(v => v > 0);
    const avgPerWeek  = weekTotals.length > 0 ? weekTotals.reduce((s, v) => s + v, 0) / weekTotals.length : 0;
    return {
      jami: dastur.totalRow?.total || dastur.managers.reduce((s, m) => s + m.total, 0),
      topManager: top?.name || "—",
      topVal: top?.total || 0,
      activeWeeks: activeWeeks.length,
      totalWeeks: dastur.weeks.length,
      avgPerWeek,
    };
  }, [dastur]);

  /* Hafta chart data */
  const haftaData = useMemo(() => {
    if (!dastur) return [];
    return dastur.weeks.map((w, wi) => {
      const obj = { label: w.label, start: w.start };
      let total = 0;
      dastur.managers.forEach(m => { obj[m.name] = m.weeks[wi]; total += m.weeks[wi]; });
      obj._total = total;
      return obj;
    });
  }, [dastur]);

  /* Manager ranking */
  const managerRank = useMemo(() => {
    if (!dastur) return [];
    return [...dastur.managers].sort((a, b) => b.total - a.total);
  }, [dastur]);

  const maxTotal = managerRank[0]?.total || 1;
  const heatmapMax = useMemo(() => {
    if (!dastur) return 1;
    return Math.max(1, ...dastur.managers.flatMap(m => m.weeks));
  }, [dastur]);

  /* Active managers (at least 1 sotuv) */
  const activeManagers = useMemo(() => managerRank.filter(m => m.total > 0), [managerRank]);

  if (error && !dasturlar.length) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ color: "var(--bad)", fontSize: 15, marginBottom: 8 }}>Ma'lumot yuklanmadi</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{error}</div>
        <button onClick={() => load(true)} style={{ marginTop: 16, padding: "8px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Qayta urinish</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em", color: "var(--text)", margin: 0 }}>
            Dashboard — Haftalik sotuv
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Har bir dastur bo'yicha menejerlar tahlili
            {fromCache && <span style={{ marginLeft: 8 }}>⚡ {cacheAge}s oldin</span>}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={loading}
          style={{ padding: "7px 16px", background: "rgba(91,149,255,.15)", border: "1px solid rgba(91,149,255,.3)", color: "var(--accent)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: loading ? .6 : 1 }}>
          {loading ? "Yuklanmoqda…" : "Yangilash"}
        </button>
      </div>

      {/* ── Dastur tabs ── */}
      {dasturlar.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dasturlar.map(d => {
            const isActive = dastur?.name === d.name;
            const total = d.totalRow?.total || d.managers.reduce((s, m) => s + m.total, 0);
            return (
              <button key={d.name} onClick={() => setSelDastur(d.name)}
                className={`chip ${isActive ? "chip-active" : ""}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 14px", borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontSize: 10, opacity: .8 }}>{total} sotuv</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !dasturlar.length && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="surface pulse-anim" style={{ borderRadius: "1.1rem", height: 100 }} />)}
          </div>
          <div className="surface pulse-anim" style={{ borderRadius: "1.1rem", height: 280 }} />
        </>
      )}

      {dastur && (
        <>
          {/* ── KPI Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
            <KPI label="Jami sotuv" value={fN(kpi.jami)} sub={`${dastur.name}`} color="var(--accent)" />
            <KPI label="Faol haftalar" value={`${kpi.activeWeeks} / ${kpi.totalWeeks}`} sub="hafta o'tdi" color="var(--teal)" />
            <KPI label="O'rtacha / hafta" value={fAvg(kpi.avgPerWeek)} sub="sotuv" color="var(--purple)" />
            <KPI label="Top menejer" value={kpi.topManager.split(" ")[0]} sub={`${kpi.topVal} sotuv`} color="var(--good)" />
          </div>

          {/* ── View switcher ── */}
          <div className="surface" style={{ borderRadius: "1.1rem", padding: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[
                { id: "hafta",    label: "Haftalik grafik" },
                { id: "heatmap",  label: "Issiqlik xaritasi" },
                { id: "managers", label: "Menejer reytingi" },
              ].map(v => (
                <button key={v.id} className={`chip ${view === v.id ? "chip-active" : ""}`} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>

            {/* ── Haftalik stacked bar ── */}
            {view === "hafta" && (
              <>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                  {dastur.name} — haftalar bo'yicha sotuv (menejerlar stacklangan)
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={haftaData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                    <XAxis dataKey="label" tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CT />} />
                    {activeManagers.map((m, i) => (
                      <Bar key={m.name} dataKey={m.name} stackId="a" fill={mc(i)}
                        radius={i === activeManagers.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                {/* Hafta sanalari jadvali */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {dastur.weeks.map(w => (
                    <div key={w.index} style={{ fontSize: 10, color: "var(--muted)", background: "rgba(52,64,86,.3)", borderRadius: 5, padding: "2px 7px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{w.label}</span>
                      {w.start && ` ${fDate(w.start)}–${fDate(w.end)}`}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Heatmap ── */}
            {view === "heatmap" && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 500, minWidth: 160, whiteSpace: "nowrap" }}>Menejer</th>
                      <th style={{ padding: "4px 6px", textAlign: "center", color: "var(--accent)", fontSize: 11, fontWeight: 600, minWidth: 44 }}>Jami</th>
                      {dastur.weeks.map(w => (
                        <th key={w.index} style={{ padding: "4px 2px", textAlign: "center", color: "var(--muted)", fontSize: 10, minWidth: 34 }}>
                          {w.index}
                        </th>
                      ))}
                      <th style={{ padding: "4px 6px", textAlign: "center", color: "var(--warn)", fontSize: 10, minWidth: 40 }}>O'rtacha</th>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "2px 8px", fontSize: 10, color: "var(--muted)" }}></td>
                      <td></td>
                      {dastur.weeks.map(w => (
                        <td key={w.index} style={{ padding: "2px 2px", textAlign: "center", fontSize: 9, color: "var(--muted)" }}>
                          {w.start ? fDate(w.start).slice(0, 5) : ""}
                        </td>
                      ))}
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    {managerRank.map((m, ri) => {
                      const activeWks = m.weeks.filter(v => v > 0).length;
                      const avg = activeWks > 0 ? m.total / activeWks : 0;
                      return (
                        <tr key={m.name} style={{ borderBottom: "1px solid rgba(52,64,86,.3)" }}>
                          <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: mc(ri), flexShrink: 0, display: "inline-block" }} />
                              <span style={{ fontSize: 12, color: m.total > 0 ? "var(--text)" : "var(--muted)" }}>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "4px 6px", textAlign: "center" }}>
                            <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: mc(ri) }}>{m.total}</span>
                          </td>
                          {m.weeks.map((v, wi) => <HCell key={wi} v={v} max={heatmapMax} />)}
                          <td style={{ padding: "4px 6px", textAlign: "center" }}>
                            <span className="tnum" style={{ fontSize: 11, color: "var(--warn)" }}>
                              {activeWks > 0 ? fAvg(avg) : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Jami qatori */}
                    {dastur.totalRow && (
                      <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(0,0,0,.15)" }}>
                        <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>JAMI</td>
                        <td style={{ padding: "6px 6px", textAlign: "center" }}>
                          <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{dastur.totalRow.total}</span>
                        </td>
                        {dastur.totalRow.weeks.map((v, wi) => (
                          <td key={wi} style={{ padding: "4px 2px", textAlign: "center" }}>
                            <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: v > 0 ? "var(--accent)" : "var(--muted)" }}>{v > 0 ? v : "·"}</span>
                          </td>
                        ))}
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          {(() => {
                            const wkTotals = dastur.totalRow.weeks.filter(v => v > 0);
                            const avg = wkTotals.length > 0 ? wkTotals.reduce((s, v) => s + v, 0) / wkTotals.length : 0;
                            return <span className="tnum" style={{ fontSize: 11, color: "var(--warn)" }}>{fAvg(avg)}</span>;
                          })()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Manager reytingi ── */}
            {view === "managers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 3fr", gap: 0, padding: "6px 12px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,.15)" }}>
                  {["Menejer", "Jami", "O'rtacha/hafta", "Otkazlar", "Progress"].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", textAlign: i > 1 ? "right" : "left" }}>{h}</div>
                  ))}
                </div>
                {managerRank.map((m, idx) => {
                  const pct = (m.total / maxTotal) * 100;
                  const activeWks = m.weeks.filter(v => v > 0).length;
                  const avg = activeWks > 0 ? m.total / activeWks : 0;
                  return (
                    <div key={m.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 3fr", gap: 0, padding: "9px 12px", borderBottom: "1px solid rgba(52,64,86,.3)", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: mc(idx), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{idx + 1}</span>
                        <span style={{ fontSize: 13, color: m.total > 0 ? "var(--text)" : "var(--muted)", fontWeight: m.total > 0 ? 500 : 400 }}>{m.name}</span>
                      </div>
                      <div className="tnum" style={{ fontSize: 15, fontWeight: 700, color: mc(idx), textAlign: "right" }}>{m.total}</div>
                      <div className="tnum" style={{ fontSize: 13, color: "var(--warn)", textAlign: "right" }}>{activeWks > 0 ? fAvg(avg) : "—"}</div>
                      <div className="tnum" style={{ fontSize: 13, color: m.otkazlar > 0 ? "var(--bad)" : "var(--muted)", textAlign: "right" }}>{m.otkazlar > 0 ? m.otkazlar : "—"}</div>
                      <div style={{ paddingLeft: 16 }}>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: pct + "%", background: mc(idx) }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
