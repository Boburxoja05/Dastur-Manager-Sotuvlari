"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#5b95ff","#34d399","#fbbf24","#f87171","#a78bfa","#2dd4bf","#fb923c","#e879f9","#67e8f9","#86efac","#fca5a5","#c4b5fd","#fdba74","#6ee7b7","#93c5fd","#f9a8d4","#a3e635"];
const mc = i => COLORS[i % COLORS.length];
const fDate = iso => { if (!iso) return "—"; const [y,m,d] = iso.split("-"); return `${d}.${m}.${y}`; };
const fAvg = v => Number(v).toFixed(2);

export default function SotuvlarPage() {
  const [dasturlar, setDasturlar] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selDastur, setSelDastur] = useState(null);
  const [selHafta,  setSelHafta]  = useState(null); // null = hammasi

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sheets");
      const d = await r.json();
      if (d.success) setDasturlar(d.dasturlar || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dastur = useMemo(() => {
    if (!dasturlar.length) return null;
    if (selDastur) return dasturlar.find(d => d.name === selDastur) || dasturlar[dasturlar.length - 1];
    return dasturlar[dasturlar.length - 1];
  }, [dasturlar, selDastur]);

  /* Tanlangan hafta yoki hammasi */
  const displayManagers = useMemo(() => {
    if (!dastur) return [];
    return dastur.managers.map(m => ({
      ...m,
      displayVal: selHafta !== null ? (m.weeks[selHafta] || 0) : m.total,
    })).sort((a, b) => b.displayVal - a.displayVal);
  }, [dastur, selHafta]);

  /* Hafta bo'yicha jami */
  const weekTotals = useMemo(() => {
    if (!dastur) return [];
    return dastur.weeks.map((w, wi) => ({
      ...w,
      total: dastur.managers.reduce((s, m) => s + (m.weeks[wi] || 0), 0),
    }));
  }, [dastur]);

  const maxDisplay = displayManagers[0]?.displayVal || 1;

  /* O'rtacha hisoblash */
  const stats = useMemo(() => {
    if (!dastur) return {};
    const activeWkTotals = weekTotals.filter(w => w.total > 0);
    const avgPerWeek = activeWkTotals.length > 0 ? activeWkTotals.reduce((s, w) => s + w.total, 0) / activeWkTotals.length : 0;
    const activeManagers = dastur.managers.filter(m => m.total > 0);
    const avgPerManager = activeManagers.length > 0 ? dastur.managers.reduce((s,m) => s+m.total, 0) / activeManagers.length : 0;
    const maxWeek = weekTotals.reduce((mx, w) => w.total > mx.total ? w : mx, weekTotals[0] || { total: 0 });
    return { avgPerWeek, avgPerManager, maxWeek, activeManagers: activeManagers.length };
  }, [dastur, weekTotals]);

  /* Chart data */
  const chartData = useMemo(() => {
    if (!dastur) return [];
    return weekTotals.map(w => ({ name: w.label, total: w.total }));
  }, [weekTotals]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em", color: "var(--text)", margin: 0 }}>Haftalik sotuv tahlili</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Dastur va hafta bo'yicha menejerlar sotuvi, o'rtachalar</p>
      </div>

      {/* Dastur tabs */}
      {dasturlar.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dasturlar.map(d => (
            <button key={d.name} className={`chip ${dastur?.name === d.name ? "chip-active" : ""}`}
              onClick={() => { setSelDastur(d.name); setSelHafta(null); }}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="surface pulse-anim" style={{ borderRadius: "1.1rem", height: 300 }} />
      ) : dastur && (
        <>
          {/* KPI stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            {[
              { l: "Jami sotuv", v: (dastur.totalRow?.total || dastur.managers.reduce((s,m)=>s+m.total,0)).toString(), c: "var(--accent)" },
              { l: "Faol menejerlar", v: stats.activeManagers + " kishi", c: "var(--good)" },
              { l: "O'rtacha / hafta", v: fAvg(stats.avgPerWeek) + " sotuv", c: "var(--warn)" },
              { l: "O'rtacha / menejer", v: fAvg(stats.avgPerManager) + " sotuv", c: "var(--purple)" },
              { l: "Eng yaxshi hafta", v: stats.maxWeek?.label || "—", c: "var(--teal)" },
            ].map(({ l, v, c }) => (
              <div key={l} className="surface" style={{ borderRadius: "1.1rem", padding: 14, borderTop: `2px solid ${c}` }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--muted)", marginBottom: 4 }}>{l}</div>
                <div className="tnum font-display" style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Hafta filter + chart */}
          <div className="surface" style={{ borderRadius: "1.1rem", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
              {dastur.name} — haftalik jami sotuv
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                <XAxis dataKey="name" tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel-top)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="total" name="Sotuv" fill="#5b95ff" radius={[4,4,0,0]}
                  onClick={(data, index) => setSelHafta(selHafta === index ? null : index)} />
              </BarChart>
            </ResponsiveContainer>

            {/* Hafta chips */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
              <button className={`chip ${selHafta === null ? "chip-active" : ""}`} onClick={() => setSelHafta(null)}>
                Barchasi
              </button>
              {dastur.weeks.map((w, wi) => {
                const wTotal = weekTotals[wi]?.total || 0;
                return (
                  <button key={wi} className={`chip ${selHafta === wi ? "chip-active" : ""}`}
                    onClick={() => setSelHafta(selHafta === wi ? null : wi)}
                    style={{ position: "relative" }}>
                    <span style={{ fontWeight: 600 }}>{w.label}</span>
                    {wTotal > 0 && <span style={{ marginLeft: 4, opacity: .7 }}>({wTotal})</span>}
                  </button>
                );
              })}
            </div>

            {/* Tanlangan hafta ma'lumoti */}
            {selHafta !== null && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(91,149,255,.08)", borderRadius: 8, border: "1px solid rgba(91,149,255,.2)", fontSize: 13 }}>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{dastur.weeks[selHafta]?.label}</span>
                {dastur.weeks[selHafta]?.start && (
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                    {fDate(dastur.weeks[selHafta].start)} — {fDate(dastur.weeks[selHafta].end)}
                  </span>
                )}
                <span style={{ marginLeft: 12, color: "var(--muted)" }}>
                  Jami: <span className="tnum" style={{ color: "var(--text)", fontWeight: 600 }}>{weekTotals[selHafta]?.total || 0}</span> sotuv
                </span>
              </div>
            )}
          </div>

          {/* Menejer detayli jadval */}
          <div className="surface" style={{ borderRadius: "1.1rem", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {selHafta !== null
                ? `${dastur.weeks[selHafta]?.label} — menejer reytingi`
                : `${dastur.name} — barcha haftalar menejer reytingi`}
            </div>

            {/* Table header */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,.18)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500, minWidth: 50 }}>#</th>
                    <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500, minWidth: 160 }}>Menejer</th>
                    {selHafta === null ? (
                      <>
                        <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500 }}>Jami</th>
                        <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500 }}>O'rtacha/hafta</th>
                        <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500 }}>Otkazlar</th>
                        {dastur.weeks.map(w => (
                          <th key={w.index} style={{ padding: "7px 8px", textAlign: "center", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 500, minWidth: 36 }}>
                            {w.index}
                          </th>
                        ))}
                        <th style={{ padding: "7px 12px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500, minWidth: 120 }}>Progress</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500 }}>Bu hafta</th>
                        <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500 }}>Jami (dastur)</th>
                        <th style={{ padding: "7px 12px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500, minWidth: 120 }}>Progress</th>
                      </>
                    )}
                  </tr>
                  {/* Hafta sanalar satri */}
                  {selHafta === null && (
                    <tr style={{ borderBottom: "1px solid rgba(52,64,86,.5)" }}>
                      <td colSpan={4} />
                      {dastur.weeks.map(w => (
                        <td key={w.index} style={{ padding: "3px 8px", textAlign: "center", fontSize: 9, color: "var(--muted)" }}>
                          {w.start ? fDate(w.start).slice(0, 5) : ""}
                        </td>
                      ))}
                      <td />
                    </tr>
                  )}
                </thead>
                <tbody>
                  {displayManagers.map((m, rank) => {
                    const pct = maxDisplay > 0 ? (m.displayVal / maxDisplay) * 100 : 0;
                    const activeWks = m.weeks.filter(v => v > 0).length;
                    const avg = activeWks > 0 ? m.total / activeWks : 0;
                    return (
                      <tr key={m.name} style={{ borderBottom: "1px solid rgba(52,64,86,.3)", background: m.displayVal === 0 ? "rgba(0,0,0,.05)" : "transparent" }}>
                        <td style={{ padding: "7px 12px" }}>
                          <span style={{ width: 20, height: 20, borderRadius: "50%", background: mc(rank), display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{rank + 1}</span>
                        </td>
                        <td style={{ padding: "7px 12px", color: m.displayVal > 0 ? "var(--text)" : "var(--muted)", fontWeight: m.displayVal > 0 ? 500 : 400, whiteSpace: "nowrap" }}>{m.name}</td>

                        {selHafta === null ? (
                          <>
                            <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: mc(rank), fontSize: 14 }}>{m.total}</td>
                            <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", color: "var(--warn)", fontSize: 12 }}>{activeWks > 0 ? fAvg(avg) : "—"}</td>
                            <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", color: m.otkazlar > 0 ? "var(--bad)" : "rgba(154,166,188,.3)", fontSize: 12 }}>{m.otkazlar > 0 ? m.otkazlar : "·"}</td>
                            {m.weeks.map((v, wi) => (
                              <td key={wi} style={{ padding: "4px 8px", textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block", minWidth: 22, padding: "2px 4px", borderRadius: 4,
                                  background: v === 0 ? "transparent" : `rgba(91,149,255,${0.2 + (v / Math.max(...m.weeks, 1)) * 0.7})`,
                                  fontSize: 11, fontWeight: v > 0 ? 600 : 400,
                                  color: v === 0 ? "rgba(154,166,188,.25)" : "var(--text)",
                                }}>
                                  {v === 0 ? "·" : v}
                                </span>
                              </td>
                            ))}
                            <td style={{ padding: "7px 12px", minWidth: 100 }}>
                              <div className="bar-track">
                                <div className="bar-fill" style={{ width: pct + "%", background: mc(rank) }} />
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: mc(rank), fontSize: 15 }}>{m.displayVal}</td>
                            <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", color: "var(--muted)", fontSize: 12 }}>{m.total}</td>
                            <td style={{ padding: "7px 12px", minWidth: 100 }}>
                              <div className="bar-track">
                                <div className="bar-fill" style={{ width: pct + "%", background: mc(rank) }} />
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {/* Jami row */}
                  <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(0,0,0,.15)" }}>
                    <td colSpan={2} style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>JAMI</td>
                    {selHafta === null ? (
                      <>
                        <td className="tnum" style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>
                          {dastur.totalRow?.total || dastur.managers.reduce((s,m)=>s+m.total,0)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <span className="tnum" style={{ color: "var(--warn)", fontSize: 12 }}>
                            {fAvg(stats.avgPerWeek)}
                          </span>
                        </td>
                        <td className="tnum" style={{ padding: "8px 12px", textAlign: "right", color: "var(--bad)", fontSize: 12 }}>
                          {dastur.totalRow?.otkazlar > 0 ? dastur.totalRow.otkazlar : "·"}
                        </td>
                        {dastur.weeks.map((_, wi) => (
                          <td key={wi} style={{ padding: "4px 8px", textAlign: "center" }}>
                            <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: weekTotals[wi]?.total > 0 ? "var(--accent)" : "rgba(154,166,188,.25)" }}>
                              {weekTotals[wi]?.total > 0 ? weekTotals[wi].total : "·"}
                            </span>
                          </td>
                        ))}
                        <td />
                      </>
                    ) : (
                      <>
                        <td className="tnum" style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>
                          {weekTotals[selHafta]?.total || 0}
                        </td>
                        <td className="tnum" style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted)" }}>
                          {dastur.totalRow?.total || 0}
                        </td>
                        <td />
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
