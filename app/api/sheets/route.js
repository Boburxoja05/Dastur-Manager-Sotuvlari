// CSV parser: multi-dastur pivot table
// Struktura: har bir dastur uchun hafta × menejer matritsa

const SHEET_URL = process.env.SHEET_CSV_URL || "";

function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseDdMmYyyy(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function toInt(s) {
  const n = parseInt(String(s).replace(/\s/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const grid = lines.map(l => splitCsvLine(l));

  const dasturlar = [];
  let i = 0;

  while (i < grid.length) {
    const row = grid[i];

    // Dastur header: col[2] yoki col[0] da "Дастур" bor
    const dasturCell = (row[2] || "") + (row[0] || "");
    const dasturMatch = dasturCell.match(/(\d{2})-?Дастур/);

    if (!dasturMatch) { i++; continue; }

    const dasturName = dasturMatch[0]; // e.g. "24-Дастур"
    i++;

    // "Boshlanish sana" qatorini topamiz (keyingi 5 satr ichida)
    let startDates = [];
    let endDates   = [];
    let headerRow  = null; // "жами", "1 - Hafta", ...
    let weekCount  = 0;
    let boshqaCol  = -1;
    let otkazCol   = -1;

    while (i < grid.length) {
      const r = grid[i];
      const r0 = r[0] || "";
      const r1 = r[1] || "";

      if (r0 === "Boshlanish sana") {
        // col[2] dan boshlab sanalar
        startDates = r.slice(2).map(parseDdMmYyyy).filter(Boolean);
        i++; continue;
      }
      if (r0 === "Tugash sana") {
        endDates = r.slice(2).map(parseDdMmYyyy).filter(Boolean);
        i++; continue;
      }
      // Header row: col[1] = "жами" va col[2] = "1 - Hafta" yoki shunga o'xshash
      if ((r1 === "жами" || r1 === "жами") && (r[2] || "").match(/Hafta|hafta/i)) {
        headerRow = r;
        // Haftalar soni: col[2] dan boshlab "N - Hafta" ni sanash
        weekCount = 0;
        for (let c = 2; c < r.length; c++) {
          if ((r[c] || "").match(/Hafta|hafta/i)) weekCount++;
          else break;
        }
        // бошқа дастурдан va отказ kolonnalari
        for (let c = 2; c < r.length; c++) {
          if ((r[c] || "").toLowerCase().includes("бошқа") || (r[c] || "").toLowerCase().includes("boshqa")) boshqaCol = c;
          if ((r[c] || "").toLowerCase().includes("отказ") || (r[c] || "").toLowerCase().includes("rad")) otkazCol = c;
        }
        i++; break;
      }
      // Agar yangi dastur topilsa — bu dastur tugadi
      if ((r[2] || "").match(/\d{2}-?Дастур/) && r0 === "") break;
      i++;
    }

    if (weekCount === 0) continue;

    // Haftalar massivini yasash
    const weeks = [];
    for (let w = 0; w < weekCount; w++) {
      weeks.push({
        index:  w + 1,
        label:  `${w + 1}-hafta`,
        start:  startDates[w] || null,
        end:    endDates[w]   || null,
      });
    }

    // Manager qatorlarini o'qish (жами: ga yetguncha)
    const managers = [];
    let totalRow = null;

    while (i < grid.length) {
      const r = grid[i];
      const r0 = (r[0] || "").trim();

      // Yangi dastur boshlanishi yoki bo'sh bo'lim
      if ((r[2] || "").match(/\d{2}-?Дастур/) && r0 === "") break;

      // Jami qatori
      if (r0 === "жами:" || r0 === "Jami:" || r0.toLowerCase() === "jami:") {
        const weekVals = [];
        for (let w = 0; w < weekCount; w++) weekVals.push(toInt(r[2 + w]));
        totalRow = {
          total:   toInt(r[1]),
          weeks:   weekVals,
          boshqa:  boshqaCol >= 0 ? toInt(r[boshqaCol]) : 0,
          otkazlar: otkazCol >= 0 ? toInt(r[otkazCol]) : 0,
        };
        i++; break;
      }

      // Manager qatori: col[0] bo'sh emas va "Boshlanish/Tugash" emas
      if (r0 && !r0.match(/^(Boshlanish|Tugash|жами|Jami)/i)) {
        const weekVals = [];
        for (let w = 0; w < weekCount; w++) weekVals.push(toInt(r[2 + w]));
        const total   = toInt(r[1]);
        const boshqa  = boshqaCol >= 0 ? toInt(r[boshqaCol]) : 0;
        const otkazlar = otkazCol >= 0 ? toInt(r[otkazCol])  : 0;

        // Bo'sh menejerlarni o'tkazib yubormaymiz (ism bor, hamma hafta 0 bo'lsa ham)
        managers.push({ name: r0, total, weeks: weekVals, boshqa, otkazlar });
      }
      i++;
    }

    dasturlar.push({ name: dasturName, weeks, managers, totalRow });
  }

  // Dasturlarni nomer bo'yicha o'sish tartibida saralash (18 → 24)
  dasturlar.sort((a, b) => {
    const na = parseInt(a.name) || 0;
    const nb = parseInt(b.name) || 0;
    return na - nb;
  });

  return dasturlar;
}

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  if (!SHEET_URL) {
    return Response.json({
      success: false,
      error: "SHEET_CSV_URL muhit o'zgaruvchisi yo'q. .env.local ga qo'shing.",
    }, { status: 500 });
  }

  const now = Date.now();
  if (!force && cache && now - cacheTime < CACHE_TTL) {
    return Response.json({ success: true, dasturlar: cache, fromCache: true, cacheAge: Math.round((now - cacheTime) / 1000) });
  }

  try {
    const res = await fetch(SHEET_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const dasturlar = parseCsv(text);
    cache = dasturlar;
    cacheTime = now;
    return Response.json({ success: true, dasturlar, fromCache: false, cacheAge: 0 });
  } catch (e) {
    if (cache) {
      return Response.json({ success: true, dasturlar: cache, fromCache: true, cacheAge: Math.round((now - cacheTime) / 1000), warning: e.message });
    }
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
