"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, ReferenceLine,
} from "recharts";

const DASTUR_COLORS = {
  "18-Дастур": "#9aa6bc",
  "19-Дастур": "#2dd4bf",
  "20-Дастур": "#a78bfa",
  "21-Дастур": "#fbbf24",
  "22-Дастур": "#fb923c",
  "23-Дастур": "#34d399",
  "24-Дастур": "#5b95ff",
};
const dc = name => DASTUR_COLORS[name] || "#9aa6bc";
const shortName = name => name.replace("-Дастур", "");
const fAvg = v => Number(v).toFixed(1);
const fDate = iso => { if (!iso) return ""; const [, m, d] = iso.split("-"); return `${d}.${m}`; };

/* ── Custom Tooltip ── */
function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{ background: "var(--panel-top)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, minWidth: 160 }}>
      <div style={{ color: "var(--muted)", marginBottom: 6, fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 2, color: p.color }}>
          <span>{p.name}</span>
          <span className="tnum" style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
      {payload.filter(p => p.value > 0).length > 1 && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", color: "var(--text)" }}>
          <span>Jami</span>
          <span className="tnum" style={{ fontWeight: 700 }}>{total}</span>
        </div>
      )}
    </div>
  );
}

/* ── Heatmap cell ── */
function HCell({ v, max, color }) {
  const alpha = max > 0 && v > 0 ? 0.15 + (v / max) * 0.75 : 0;
  const bg = v === 0 ? "rgba(52,64,86,.12)" : color
    ? color.startsWith("#") ? hexAlpha(color, alpha) : color
    : `rgba(91,149,255,${alpha})`;
  return (
    <td style={{ padding: "3px 4px", textAlign: "center" }}>
      <div style={{
        background: bg, borderRadius: 5, padding: "4px 2px",
        minWidth: 32, fontSize: 12,
        fontWeight: v > 0 ? 700 : 400,
        color: v === 0 ? "rgba(154,166,188,.3)" : alpha > 0.55 ? "#fff" : "var(--text)",
      }}>
        {v === 0 ? "·" : v}
      </div>
    </td>
  );
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

/* ══ MAIN ══ */
export default function SolishtirishPage() {
  const [dasturlar, setDasturlar] = useState([]);
  const [loading,   setLoading]   = useState(true);

  /* Filters */
  const [view,       setView]       = useState("hafta");    // "hafta" | "menejer" | "matrix"
  const [selHafta,   setSelHafta]   = useState(1);          // 1-based hafta index
  const [selManager, setSelManager] = useState(null);
  const [selDasturlar, setSelDasturlar] = useState([]);     // [] = hammasi

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sheets");
      const d = await r.json();
      if (d.success) setDasturlar(d.dasturlar || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Max hafta count */
  const maxHafta = useMemo(() => Math.max(...dasturlar.map(d => d.weeks.length), 1), [dasturlar]);

  /* Active dasturlar (filter) */
  const activeDasturlar = useMemo(() =>
    selDasturlar.length > 0
      ? dasturlar.filter(d => selDasturlar.includes(d.name))
      : dasturlar,
  [dasturlar, selDasturlar]);

  /* All managers (union) */
  const allManagers = useMemo(() => {
    const s = new Set();
    dasturlar.forEach(d => d.managers.forEach(m => s.add(m.name)));
    return [...s].sort();
  }, [dasturlar]);

  /* ── VIEW 1: Hafta ko'rinishi ──
     Tanlangan hafta → har bir menejer, har bir dasturda qancha sotgan
     GroupedBar: X=menejer, group=dastur */
  const haftaChartData = useMemo(() => {
    const idx = selHafta - 1;
    return allManagers.map(name => {
      const obj = { name: name.split(" ")[0] + " " + (name.split(" ")[1] || "").slice(0, 1) + "." };
      let rowTotal = 0;
      activeDasturlar.forEach(d => {
        const m = d.managers.find(x => x.name === name);
        const v = m?.weeks[idx] ?? 0;
        obj[shortName(d.name)] = v;
        rowTotal += v;
      });
      obj._total = rowTotal;
      obj._fullName = name;
      return obj;
    }).filter(r => r._total > 0).sort((a, b) => b._total - a._total);
  }, [allManagers, activeDasturlar, selHafta]);

  /* Hafta sanalarini ko'rsatish uchun */
  const haftaDates = useMemo(() => {
    const idx = selHafta - 1;
    return activeDasturlar.map(d => ({
      name: d.name,
      start: d.weeks[idx]?.start || null,
      end:   d.weeks[idx]?.end   || null,
    }));
  }, [activeDasturlar, selHafta]);

  /* Hafta totallari (dastur bo'yicha) */
  const haftaTotals = useMemo(() => {
    const idx = selHafta - 1;
    return activeDasturlar.map(d => ({
      name: d.name,
      total: d.managers.reduce((s, m) => s + (m.weeks[idx] || 0), 0),
    }));
  }, [activeDasturlar, selHafta]);

  /* ── VIEW 2: Menejer ko'rinishi ──
     Tanlangan menejer → hafta bo'yicha, har bir dasturda
     LineChart: X=hafta, lines=dasturlar */
  const menejerChartData = useMemo(() => {
    if (!selManager) return [];
    return Array.from({ length: maxHafta }, (_, i) => {
      const obj = { hafta: `${i + 1}-hafta` };
      activeDasturlar.forEach(d => {
        const m = d.managers.find(x => x.name === selManager);
        obj[shortName(d.name)] = m?.weeks[i] ?? 0;
      });
      return obj;
    });
  }, [selManager, activeDasturlar, maxHafta]);

  /* Menejer jami per dastur */
  const menejerTotals = useMemo(() => {
    if (!selManager) return [];
    return activeDasturlar.map(d => {
      const m = d.managers.find(x => x.name === selManager);
      return { name: d.name, total: m?.total || 0, weeks: m?.weeks || [] };
    });
  }, [selManager, activeDasturlar]);

  /* ── VIEW 3: Matrix ko'rinishi ──
     Menejerlar × Dasturlar, tanlangan hafta */
  const matrixData = useMemo(() => {
    const idx = selHafta - 1;
    return allManagers.map(name => {
      const byDastur = {};
      let rowTotal = 0;
      activeDasturlar.forEach(d => {
        const m = d.managers.find(x => x.name === name);
        const v = m?.weeks[idx] ?? 0;
        byDastur[d.name] = v;
        rowTotal += v;
      });
      return { name, byDastur, rowTotal };
    }).sort((a, b) => b.rowTotal - a.rowTotal);
  }, [allManagers, activeDasturlar, selHafta]);

  const matrixMax = useMemo(() =>
    Math.max(1, ...matrixData.flatMap(r => Object.values(r.byDastur))),
  [matrixData]);

  /* ── Umumiy statistika (tanlangan hafta) ── */
  const overallStats = useMemo(() => {
    const idx = selHafta - 1;
    const grandTotal = activeDasturlar.reduce((s, d) =>
      s + d.managers.reduce((ms, m) => ms + (m.weeks[idx] || 0), 0), 0);
    const activeM = allManagers.filter(name =>
      activeDasturlar.some(d => {
        const m = d.managers.find(x => x.name === name);
        return (m?.weeks[idx] || 0) > 0;
      })
    ).length;
    return { grandTotal, activeM };
  }, [activeDasturlar, allManagers, selHafta]);

  function toggleDastur(name) {
    setSelDasturlar(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  }

  /* ── Auto-select first manager ── */
  useEffect(() => {
    if (allManagers.length && !selManager) setSelManager(allManagers[0]);
  }, [allManagers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em", color: "var(--text)", margin: 0 }}>
          Dasturlar solishtirish
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          18-Дастурdan 24-Дастургача — hafta va menejer bo'yicha solishtiruv
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="surface" style={{ borderRadius: "1.1rem", padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>

          {/* Dastur filter */}
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Dasturlar</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button className={`chip ${selDasturlar.length === 0 ? "chip-active" : ""}`}
                onClick={() => setSelDasturlar([])}>Barchasi</button>
              {dasturlar.map(d => (
                <button key={d.name}
                  className={`chip ${selDasturlar.includes(d.name) ? "chip-active" : ""}`}
                  onClick={() => toggleDastur(d.name)}
                  style={{ borderColor: selDasturlar.includes(d.name) ? dc(d.name) : undefined }}>
                  {shortName(d.name)}
                </button>
              ))}
            </div>
          </div>

          {/* Hafta filter */}
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
              Hafta — {selHafta}-hafta
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={1} max={maxHafta} value={selHafta}
                onChange={e => setSelHafta(Number(e.target.value))}
                style={{ width: 180, accentColor: "var(--accent)" }} />
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: maxHafta }, (_, i) => (
                  <button key={i} onClick={() => setSelHafta(i + 1)}
                    style={{
                      width: 22, height: 22, borderRadius: 4, border: "1px solid",
                      borderColor: selHafta === i + 1 ? "var(--accent)" : "var(--border)",
                      background: selHafta === i + 1 ? "var(--accent)" : "transparent",
                      color: selHafta === i + 1 ? "#fff" : "var(--muted)",
                      fontSize: 9, cursor: "pointer", fontWeight: 600,
                    }}>{i + 1}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hafta sanalar */}
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {haftaDates.filter(h => h.start).map(h => (
            <span key={h.name} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: hexAlpha(dc(h.name), 0.15), color: dc(h.name), border: `1px solid ${hexAlpha(dc(h.name), 0.3)}` }}>
              {shortName(h.name)}: {fDate(h.start)}–{fDate(h.end)}
            </span>
          ))}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <div className="surface" style={{ borderRadius: "1.1rem", padding: 14, borderTop: "2px solid var(--accent)" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", letterSpacing: ".09em", marginBottom: 4 }}>
            {selHafta}-hafta jami
          </div>
          <div className="tnum font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)" }}>{overallStats.grandTotal}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{activeDasturlar.length} dastur</div>
        </div>
        <div className="surface" style={{ borderRadius: "1.1rem", padding: 14, borderTop: "2px solid var(--good)" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", letterSpacing: ".09em", marginBottom: 4 }}>Faol menejerlar</div>
          <div className="tnum font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--good)" }}>{overallStats.activeM}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>bu haftada</div>
        </div>
        {haftaTotals.map(h => (
          <div key={h.name} className="surface" style={{ borderRadius: "1.1rem", padding: 14, borderTop: `2px solid ${dc(h.name)}` }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", letterSpacing: ".09em", marginBottom: 4 }}>{h.name}</div>
            <div className="tnum font-display" style={{ fontSize: 26, fontWeight: 700, color: dc(h.name) }}>{h.total}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{selHafta}-hafta</div>
          </div>
        ))}
      </div>

      {/* ── View tabs ── */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { id: "hafta",   label: "Hafta bo'yicha" },
          { id: "menejer", label: "Menejer bo'yicha" },
          { id: "matrix",  label: "Matrix (issiqlik)" },
        ].map(v => (
          <button key={v.id} className={`chip ${view === v.id ? "chip-active" : ""}`}
            onClick={() => setView(v.id)}>{v.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="surface pulse-anim" style={{ borderRadius: "1.1rem", height: 300 }} />
      ) : (
        <>
          {/* ══ VIEW 1: HAFTA ══ */}
          {view === "hafta" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="surface" style={{ borderRadius: "1.1rem", padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  {selHafta}-hafta — menejerlar solishtirishi
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                  Har bir menejer {selHafta}-haftada qaysi dasturda nechta sotgan
                </div>

                {haftaChartData.length === 0 ? (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
                    Bu haftada sotuv yo'q
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={haftaChartData} margin={{ left: 0, right: 8, top: 4, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                        <XAxis dataKey="name" tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CT />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)", paddingTop: 8 }} />
                        {activeDasturlar.map(d => (
                          <Bar key={d.name} dataKey={shortName(d.name)} name={d.name} fill={dc(d.name)} radius={[3, 3, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Jadval */}
                    <div style={{ overflowX: "auto", marginTop: 16 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "rgba(0,0,0,.18)", borderBottom: "1px solid var(--border)" }}>
                            <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500 }}>Menejer</th>
                            {activeDasturlar.map(d => (
                              <th key={d.name} style={{ padding: "7px 10px", textAlign: "center", fontSize: 11, color: dc(d.name), textTransform: "uppercase", fontWeight: 600 }}>
                                {shortName(d.name)}
                              </th>
                            ))}
                            <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>Jami</th>
                          </tr>
                        </thead>
                        <tbody>
                          {haftaChartData.map((row, ri) => (
                            <tr key={row._fullName} style={{ borderBottom: "1px solid rgba(52,64,86,.3)" }}
                              className="tbl-row">
                              <td style={{ padding: "7px 12px", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                                  {row._fullName}
                                </span>
                              </td>
                              {activeDasturlar.map(d => {
                                const v = row[shortName(d.name)] || 0;
                                return (
                                  <td key={d.name} style={{ padding: "7px 10px", textAlign: "center" }}>
                                    {v > 0
                                      ? <span className="tnum" style={{ fontWeight: 700, color: dc(d.name), fontSize: 14 }}>{v}</span>
                                      : <span style={{ color: "rgba(154,166,188,.25)" }}>·</span>}
                                  </td>
                                );
                              })}
                              <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>
                                {row._total}
                              </td>
                            </tr>
                          ))}
                          {/* Jami row */}
                          <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(0,0,0,.15)" }}>
                            <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>JAMI</td>
                            {haftaTotals.map(h => (
                              <td key={h.name} className="tnum" style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: dc(h.name), fontSize: 14 }}>
                                {h.total > 0 ? h.total : "·"}
                              </td>
                            ))}
                            <td className="tnum" style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>
                              {overallStats.grandTotal}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══ VIEW 2: MENEJER ══ */}
          {view === "menejer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Menejer selector */}
              <div className="surface" style={{ borderRadius: "1.1rem", padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Menejer tanlang</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {allManagers.map(m => (
                    <button key={m} className={`chip ${selManager === m ? "chip-active" : ""}`}
                      onClick={() => setSelManager(m)}
                      style={{ fontSize: 12 }}>
                      {m.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {selManager && (
                <div className="surface" style={{ borderRadius: "1.1rem", padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{selManager}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {menejerTotals.map(t => (
                        <span key={t.name} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: hexAlpha(dc(t.name), 0.15), color: dc(t.name), border: `1px solid ${hexAlpha(dc(t.name), 0.25)}` }}>
                          {shortName(t.name)}: <strong>{t.total}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                    Har bir dasturda hafta bo'yicha sotuv trendi
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={menejerChartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,64,86,.5)" />
                      <XAxis dataKey="hafta" tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9aa6bc", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CT />} />
                      <ReferenceLine x={`${selHafta}-hafta`} stroke="rgba(255,255,255,.15)" strokeDasharray="4 4" label={{ value: "↑ tanlangan", fill: "var(--muted)", fontSize: 9 }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
                      {activeDasturlar.map(d => (
                        <Line key={d.name} type="monotone" dataKey={shortName(d.name)} name={d.name}
                          stroke={dc(d.name)} strokeWidth={2} dot={{ r: 3, fill: dc(d.name) }}
                          connectNulls activeDot={{ r: 5 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Per-dastur table */}
                  <div style={{ overflowX: "auto", marginTop: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,.18)", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase" }}>Dastur</th>
                          <th style={{ padding: "7px 10px", textAlign: "right", fontSize: 11, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase" }}>Jami</th>
                          <th style={{ padding: "7px 10px", textAlign: "right", fontSize: 11, color: "var(--warn)", fontWeight: 500, textTransform: "uppercase" }}>O'rtacha/hafta</th>
                          {Array.from({ length: maxHafta }, (_, i) => (
                            <th key={i} style={{ padding: "7px 6px", textAlign: "center", fontSize: 10, color: selHafta === i + 1 ? "var(--accent)" : "var(--muted)", fontWeight: selHafta === i + 1 ? 700 : 500 }}>
                              {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {menejerTotals.map(t => {
                          const activeWks = t.weeks.filter(v => v > 0).length;
                          const avg = activeWks > 0 ? t.total / activeWks : 0;
                          return (
                            <tr key={t.name} style={{ borderBottom: "1px solid rgba(52,64,86,.3)" }} className="tbl-row">
                              <td style={{ padding: "7px 12px", whiteSpace: "nowrap" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dc(t.name), display: "inline-block" }} />
                                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{t.name}</span>
                                </span>
                              </td>
                              <td className="tnum" style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: dc(t.name), fontSize: 14 }}>{t.total}</td>
                              <td className="tnum" style={{ padding: "7px 10px", textAlign: "right", color: "var(--warn)", fontSize: 12 }}>{activeWks > 0 ? fAvg(avg) : "—"}</td>
                              {Array.from({ length: maxHafta }, (_, i) => {
                                const v = t.weeks[i] ?? null;
                                return (
                                  <td key={i} style={{ padding: "4px 6px", textAlign: "center", background: selHafta === i + 1 ? "rgba(91,149,255,.06)" : "transparent" }}>
                                    {v === null
                                      ? <span style={{ color: "rgba(154,166,188,.2)", fontSize: 10 }}>—</span>
                                      : v === 0
                                      ? <span style={{ color: "rgba(154,166,188,.25)", fontSize: 10 }}>·</span>
                                      : <span className="tnum" style={{ fontWeight: 700, color: dc(t.name), fontSize: 13 }}>{v}</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ VIEW 3: MATRIX (ISSIQLIK XARITASI) ══ */}
          {view === "matrix" && (
            <div className="surface" style={{ borderRadius: "1.1rem", padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Issiqlik xaritasi — {selHafta}-hafta
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                Menejerlar (satr) × Dasturlar (ustun) — {selHafta}-haftadagi sotuv soni
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "6px 12px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", minWidth: 180 }}>Menejer</th>
                      {activeDasturlar.map(d => (
                        <th key={d.name} style={{ padding: "6px 4px", textAlign: "center", fontSize: 11, color: dc(d.name), fontWeight: 700, minWidth: 64 }}>
                          {d.name}
                        </th>
                      ))}
                      <th style={{ padding: "6px 12px", textAlign: "right", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>Jami</th>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "3px 12px", fontSize: 10, color: "var(--muted)" }}>{selHafta}-hafta sanalari</td>
                      {activeDasturlar.map(d => {
                        const idx = selHafta - 1;
                        const w = d.weeks[idx];
                        return (
                          <td key={d.name} style={{ padding: "3px 4px", textAlign: "center", fontSize: 9, color: "var(--muted)" }}>
                            {w?.start ? `${fDate(w.start)}–${fDate(w.end)}` : "—"}
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map(row => (
                      <tr key={row.name} style={{ borderBottom: "1px solid rgba(52,64,86,.25)" }} className="tbl-row">
                        <td style={{ padding: "5px 12px", color: row.rowTotal > 0 ? "var(--text)" : "var(--muted)", fontWeight: row.rowTotal > 0 ? 500 : 400, whiteSpace: "nowrap" }}>
                          {row.name}
                        </td>
                        {activeDasturlar.map(d => (
                          <HCell key={d.name} v={row.byDastur[d.name] || 0} max={matrixMax} color={dc(d.name)} />
                        ))}
                        <td className="tnum" style={{ padding: "5px 12px", textAlign: "right", fontWeight: 700, color: row.rowTotal > 0 ? "var(--accent)" : "rgba(154,166,188,.3)", fontSize: 14 }}>
                          {row.rowTotal > 0 ? row.rowTotal : "·"}
                        </td>
                      </tr>
                    ))}
                    {/* Ustun totallari */}
                    <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(0,0,0,.15)" }}>
                      <td style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>JAMI</td>
                      {haftaTotals.map(h => (
                        <td key={h.name} className="tnum" style={{ padding: "7px 4px", textAlign: "center", fontWeight: 700, color: dc(h.name), fontSize: 14 }}>
                          {h.total > 0 ? h.total : "·"}
                        </td>
                      ))}
                      <td className="tnum" style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>
                        {overallStats.grandTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
