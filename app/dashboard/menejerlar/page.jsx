"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const COLORS = ["#5b95ff","#34d399","#fbbf24","#f87171","#a78bfa","#2dd4bf","#fb923c","#e879f9","#67e8f9","#86efac","#fca5a5","#c4b5fd","#fdba74","#6ee7b7","#93c5fd","#f9a8d4","#a3e635"];
const mc = i => COLORS[i % COLORS.length];
const fN = v => Number(v).toLocaleString("uz-UZ");
const fAvg = v => Number(v).toFixed(1);
const fDate = iso => { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${d}.${m}`; };

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel-top)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 8, justifyContent: "space-between", color: p.color, marginBottom: 2 }}>
          <span>{p.name}</span>
          <span className="tnum" style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function MenejerlarPage() {
  const [dasturlar, setDasturlar] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selManager, setSelManager] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sheets");
      const d = await r.json();
      if (d.success) setDasturlar(d.dasturlar || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Barcha menejerlar nomi (birlashtirilgan) */
  const allManagers = useMemo(() => {
    const names = new Set();
    dasturlar.forEach(d => d.managers.forEach(m => names.add(m.name)));
    return [...names].sort();
  }, [dasturlar]);

  /* Har bir menejer uchun dasturlar bo'yicha statistika */
  const managerMatrix = useMemo(() => {
    return allManagers.map((name, idx) => {
      const byDastur = {};
      let grandTotal = 0;
      let grandOtkazlar = 0;
      let totalActiveWeeks = 0;

      dasturlar.forEach(d => {
        const found = d.managers.find(m => m.name === name);
        const total = found?.total || 0;
        const otkazlar = found?.otkazlar || 0;
        const activeWks = found?.weeks.filter(v => v > 0).length || 0;
        const avg = activeWks > 0 ? total / activeWks : 0;
        byDastur[d.name] = { total, otkazlar, activeWks, avg, weeks: found?.weeks || [] };
        grandTotal += total;
        grandOtkazlar += otkazlar;
        totalActiveWeeks += activeWks;
      });

      const overallAvg = totalActiveWeeks > 0 ? grandTotal / totalActiveWeeks : 0;
      return { name, idx, byDastur, grandTotal, grandOtkazlar, totalActiveWeeks, overallAvg };
    });
  }, [allManagers, dasturlar]);

  const sorted = useMemo(() => [...managerMatrix].sort((a, b) => b.grandTotal - a.grandTotal), [managerMatrix]);
  const maxGrand = sorted[0]?.grandTotal || 1;

  /* Tanlangan menejer uchun dastur bo'yicha haftalik trend */
  const selData = useMemo(() => {
    if (!selManager) return null;
    const m = managerMatrix.find(x => x.name === selManager);
    if (!m) return null;
    return { ...m };
  }, [selManager, managerMatrix]);

  /* Dasturlar bo'yicha jami solishtirish chart data */
  const comparisonData = useMemo(() => {
    return dasturlar.map(d => {
      const obj = { dastur: d.name };
      d.managers.forEach(m => { obj[m.name] = m.total; });
      obj._total = d.totalRow?.total || d.managers.reduce((s,m) => s+m.total, 0);
      return obj;
    });
  }, [dasturlar]);

  /* Menejer dasturdan dasturga o'sish trendi */
  const managerTrend = useMemo(() => {
    const top8 = sorted.slice(0, 8);
    return dasturlar.map(d => {
      const obj = { dastur: d.name };
      top8.forEach(m => {
        obj[m.name] = m.byDastur[d.name]?.total || 0;
      });
      return obj;
    });
  }, [dasturlar, sorted]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em", color: "var(--text)", margin: 0 }}>Menejerlar tahlili</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Barcha dasturlar bo'yicha solishtiruv va o'sish trendi</p>
      </div>

      {loading ? (
        <div className="surface pulse-anim" style={{ borderRadius: "1.1rem", height: 300 }} />
      ) : (
        <>
          {/* ── Umumiy reytingi ── */}
          <section className="surface" style={{ borderRadius: "1.1rem", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Barcha dasturlardagi umumiy reyting
            </div>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: `1.8fr 1fr ${dasturlar.map(() => "70px").join(" ")} 1fr 80px 3fr`, gap: 0, padding: "7px 12px", background: "rgba(0,0,0,.15)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>Menejer</div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", textAlign: "right" }}>Grand Total</div>
              {dasturlar.map(d => (
                <div key={d.name} style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", textTransform: "uppercase" }}>{d.name.replace("-Дастур","")}</div>
              ))}
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", textAlign: "right" }}>O'rtacha</div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", textAlign: "right" }}>Otkazlar</div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", paddingLeft: 16 }}>Progress</div>
            </div>

            {sorted.map((m, rank) => {
              const pct = (m.grandTotal / maxGrand) * 100;
              const isActive = selManager === m.name;
              return (
                <div key={m.name}
                  onClick={() => setSelManager(isActive ? null : m.name)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `1.8fr 1fr ${dasturlar.map(() => "70px").join(" ")} 1fr 80px 3fr`,
                    gap: 0,
                    padding: "9px 12px",
                    borderBottom: "1px solid rgba(52,64,86,.3)",
                    alignItems: "center",
                    cursor: "pointer",
                    background: isActive ? "rgba(91,149,255,.07)" : "transparent",
                    transition: "background .12s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: mc(rank), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{rank + 1}</span>
                    <span style={{ fontSize: 13, color: m.grandTotal > 0 ? "var(--text)" : "var(--muted)", fontWeight: m.grandTotal > 0 ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                  </div>
                  <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: mc(rank), textAlign: "right" }}>{m.grandTotal}</div>
                  {dasturlar.map(d => {
                    const v = m.byDastur[d.name]?.total || 0;
                    return (
                      <div key={d.name} className="tnum" style={{ fontSize: 13, textAlign: "center", color: v > 0 ? "var(--text)" : "rgba(154,166,188,.3)", fontWeight: v > 0 ? 500 : 400 }}>
                        {v > 0 ? v : "·"}
                      </div>
                    );
                  })}
                  <div className="tnum" style={{ fontSize: 12, color: "var(--warn)", textAlign: "right" }}>
                    {m.overallAvg > 0 ? fAvg(m.overallAvg) : "—"}
                  </div>
                  <div className="tnum" style={{ fontSize: 12, color: m.grandOtkazlar > 0 ? "var(--bad)" : "rgba(154,166,188,.3)", textAlign: "right" }}>
                    {m.grandOtkazlar > 0 ? m.grandOtkazlar : "·"}
                  </div>
                  <div style={{ paddingLeft: 16 }}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: pct + "%", background: mc(rank) }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* ── Tanlangan menejer detali ── */}
          {selData && (
            <section className="surface" style={{ borderRadius: "1.1rem", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  {selData.name} — dasturlar bo'yicha sotuv trendi
                </h2>
                <button onClick={() => setSelManager(null)}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--muted)", cursor: "pointer", padding: "4px 10px", fontSize: 12 }}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Dastur bo'yicha bar chart */}
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Har bir dasturda jami sotuv</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={dasturlar.map(d => ({ name: d.name.replace("-Дастур",""), value: selData.byDastur[d.name]?.total || 0 }))}
                      margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                      <XAxis dataKey="name" tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--panel-top)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="value" name="Sotuv" fill="#5b95ff" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Statistika grid */}
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Dasturlar bo'yicha tafsilot</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dasturlar.map(d => {
                      const dv = selData.byDastur[d.name];
                      const mx = Math.max(...dasturlar.map(dd => selData.byDastur[dd.name]?.total || 0), 1);
                      const pct = mx > 0 ? ((dv?.total || 0) / mx) * 100 : 0;
                      return (
                        <div key={d.name}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: "var(--text)" }}>{d.name}</span>
                            <span className="tnum" style={{ color: "var(--muted)" }}>
                              {dv?.total || 0} sotuv
                              {dv?.activeWks > 0 && <span style={{ marginLeft: 6, color: "var(--warn)" }}>~{fAvg(dv.avg)}/hafta</span>}
                              {dv?.otkazlar > 0 && <span style={{ marginLeft: 6, color: "var(--bad)" }}>{dv.otkazlar} otk.</span>}
                            </span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: pct + "%", background: "#5b95ff" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Menejerlar trend linechart (top 8, dastur bo'yicha) ── */}
          <section className="surface" style={{ borderRadius: "1.1rem", padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
              Dasturdan dasturga o'sish trendi — top 8 menejer
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={managerTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                <XAxis dataKey="dastur" tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CT />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
                {sorted.slice(0, 8).map((m, i) => (
                  <Line key={m.name} type="monotone" dataKey={m.name} name={m.name.split(" ")[0]} stroke={mc(i)} strokeWidth={2} dot={{ r: 4, fill: mc(i) }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* ── Dastur bo'yicha solishtirish ── */}
          <section className="surface" style={{ borderRadius: "1.1rem", padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
              Dasturlar bo'yicha jami sotuv (menejer stacklangan)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparisonData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                <XAxis dataKey="dastur" tick={{ fill: "#9aa6bc", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CT />} />
                {sorted.slice(0, 12).map((m, i) => (
                  <Bar key={m.name} dataKey={m.name} name={m.name.split(" ")[0]} stackId="a" fill={mc(i)}
                    radius={i === Math.min(sorted.length, 12) - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </div>
  );
}
