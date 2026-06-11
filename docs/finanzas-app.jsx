import { useState, useEffect } from "react";

// ─── ICONS (inline SVG components) ───────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  wallet: "M1 4h22v16H1zM1 10h22",
  chart: "M18 20V10M12 20V4M6 20v-6",
  plus: "M12 5v14M5 12h14",
  sun: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  arrow_up: "M12 19V5M5 12l7-7 7 7",
  arrow_down: "M12 5v14M19 12l-7 7-7-7",
  chevron_right: "M9 18l6-6-6-6",
  chevron_left: "M15 18l-6-6 6-6",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  coffee: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3",
  shopping: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  car: "M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2M14 17H9m3 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z",
  home2: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const mockTransactions = [
  { id: 1,  desc: "Mercadona",        amount: -87.43,   category: "Supermercado",  dateObj: "2025-04-30", time: "10:23", icon: Icons.shopping, color: "#22c55e" },
  { id: 2,  desc: "Nómina Empresa S.L.", amount: 2400.00, category: "Ingresos",    dateObj: "2025-04-30", time: "09:00", icon: Icons.arrow_up, color: "#3b82f6" },
  { id: 3,  desc: "Edenred Comidas",  amount: -12.50,   category: "Restaurante",   dateObj: "2025-04-29", time: "14:30", icon: Icons.coffee,   color: "#f59e0b" },
  { id: 4,  desc: "Gasolina BP",      amount: -65.00,   category: "Transporte",    dateObj: "2025-04-29", time: "08:15", icon: Icons.car,      color: "#8b5cf6" },
  { id: 5,  desc: "Netflix",          amount: -17.99,   category: "Ocio",          dateObj: "2025-04-28", time: "00:00", icon: Icons.zap,      color: "#ef4444" },
  { id: 6,  desc: "Alquiler Abril",   amount: -950.00,  category: "Hogar",         dateObj: "2025-04-01", time: "08:00", icon: Icons.home2,    color: "#06b6d4" },
  { id: 7,  desc: "Edenred Comidas",  amount: -9.80,    category: "Restaurante",   dateObj: "2025-04-01", time: "13:45", icon: Icons.coffee,   color: "#f59e0b" },
  { id: 8,  desc: "Amazon",           amount: -34.99,   category: "Compras",       dateObj: "2025-03-30", time: "11:20", icon: Icons.shopping, color: "#22c55e" },
];

const mockAccounts = [
  { id: 1, name: "BBVA Cuenta", type: "bank", balance: 3847.23, number: "•••• 4521", source: "enablebanking", color: "#3b82f6" },
  { id: 2, name: "Tarjeta Visa", type: "card", balance: -234.50, number: "•••• 8834", source: "enablebanking", color: "#8b5cf6" },
  { id: 3, name: "Edenred", type: "edenred", balance: 127.40, number: "Saldo disponible", source: "scraper", color: "#f59e0b" },
];

// ─── NUMBER FORMATTER ─────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const [intPart, decPart] = abs.toFixed(decimals).split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return sign + intFormatted + (decPart !== undefined ? "," + decPart : "");
};

const spendingData = [
  { month: "Nov", value: 1820 },
  { month: "Dic", value: 2340 },
  { month: "Ene", value: 1650 },
  { month: "Feb", value: 1980 },
  { month: "Mar", value: 2100 },
  { month: "Abr", value: 1430 },
];

const categoryData = [
  { name: "Hogar", amount: 950, pct: 42, color: "#06b6d4" },
  { name: "Alimentación", amount: 320, pct: 22, color: "#22c55e" },
  { name: "Transporte", amount: 180, pct: 13, color: "#8b5cf6" },
  { name: "Ocio", amount: 160, pct: 11, color: "#ef4444" },
  { name: "Restaurantes", amount: 120, pct: 8, color: "#f59e0b" },
  { name: "Otros", amount: 80, pct: 4, color: "#64748b" },
];

// ─── SIMPLE BAR CHART (dashboard widget) ─────────────────────────────────────
const BarChart = ({ data, dark }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", height: `${(d.value / max) * 64}px`,
            borderRadius: "6px 6px 0 0",
            background: i === data.length - 1
              ? "linear-gradient(180deg, #6366f1, #8b5cf6)"
              : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            transition: "height 0.5s ease",
          }} />
          <span style={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)", fontFamily: "inherit" }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
};

// ─── DUAL BAR CHART with navigation + selection ──────────────────────────────
const DualBarChart = ({ allData, dark, selectedBarIdx, onSelect, showYoY }) => {
  const [offset, setOffset] = useState(0);

  const windowSize = 6;
  const total = allData.length;
  const endIdx = total - offset;
  const startIdx = Math.max(0, endIdx - windowSize);
  const visible = allData.slice(startIdx, endIdx);

  // Map global selectedBarIdx to local visible index
  const localSelIdx = selectedBarIdx !== null && selectedBarIdx !== undefined
    ? selectedBarIdx - startIdx
    : visible.length - 1;
  const clampedSel = Math.max(0, Math.min(visible.length - 1, localSelIdx));
  const selBar = visible[clampedSel];

  const handleSelect = (localIdx) => {
    onSelect(startIdx + localIdx);
  };
  const maxVal = Math.max(...allData.map(d => Math.max(d.ingresos, d.gastos)));
  const BAR_H = 90;

  const canGoBack = startIdx > 0;
  const canGoFwd  = offset > 0;

  const shift = (dir) => {
    onSelect(null);
    setOffset(o => dir === "back" ? Math.min(total - windowSize, o + 1) : Math.max(0, o - 1));
  };

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14, justifyContent: "flex-end" }}>
        {[["#22c55e", "Ingresos"], ["#6366f1", "Gastos"]].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Bar area */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: BAR_H + 18 }}>
        {visible.map((d, i) => {
          const isSel = i === clampedSel;
          const pctI = Math.max(0.04, d.ingresos / maxVal);
          const pctG = Math.max(0.04, d.gastos   / maxVal);
          const pctIprev = d.prevIngresos ? Math.max(0.04, d.prevIngresos / maxVal) : null;
          const pctGprev = d.prevGastos   ? Math.max(0.04, d.prevGastos   / maxVal) : null;
          return (
            <div
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4, cursor: "pointer",
                transition: "opacity 0.2s",
                opacity: isSel ? 1 : 0.45,
              }}
            >
              {/* Bar group */}
              <div style={{
                width: "100%", height: BAR_H,
                display: "flex", alignItems: "flex-end",
                gap: "10%", padding: "0 5%",
                boxSizing: "border-box",
                position: "relative",
              }}>
                {/* Ingreso bar */}
                <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", position: "relative" }}>
                  <div style={{
                    width: "100%",
                    height: `${pctI * BAR_H}px`,
                    borderRadius: "4px 4px 0 0",
                    background: isSel
                      ? "linear-gradient(180deg,#4ade80,#22c55e)"
                      : dark ? "#22c55e55" : "#22c55e44",
                    transition: "height 0.45s ease, background 0.2s",
                    boxShadow: isSel ? "0 4px 14px #22c55e44" : "none",
                    position: "relative",
                  }}>
                    {/* YoY reference line — ingresos */}
                    {showYoY && pctIprev !== null && (
                      <div style={{
                        position: "absolute",
                        bottom: `${(pctIprev / pctI) * 100}%`,
                        left: "-3px", right: "-3px",
                        height: 2,
                        background: "#22c55e",
                        opacity: isSel ? 1 : 0.7,
                        borderRadius: 2,
                        transition: "bottom 0.45s ease",
                      }}>
                        {/* Tick marks on both ends */}
                        <div style={{ position: "absolute", top: -3, left: 0, width: 2, height: 8, background: "#22c55e", borderRadius: 1, opacity: 0.8 }} />
                        <div style={{ position: "absolute", top: -3, right: 0, width: 2, height: 8, background: "#22c55e", borderRadius: 1, opacity: 0.8 }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Gasto bar */}
                <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", position: "relative" }}>
                  <div style={{
                    width: "100%",
                    height: `${pctG * BAR_H}px`,
                    borderRadius: "4px 4px 0 0",
                    background: isSel
                      ? "linear-gradient(180deg,#818cf8,#6366f1)"
                      : dark ? "#6366f155" : "#6366f144",
                    transition: "height 0.45s ease, background 0.2s",
                    boxShadow: isSel ? "0 4px 14px #6366f144" : "none",
                    position: "relative",
                  }}>
                    {/* YoY reference line — gastos */}
                    {showYoY && pctGprev !== null && (
                      <div style={{
                        position: "absolute",
                        bottom: `${(pctGprev / pctG) * 100}%`,
                        left: "-3px", right: "-3px",
                        height: 2,
                        background: "#6366f1",
                        opacity: isSel ? 1 : 0.7,
                        borderRadius: 2,
                        transition: "bottom 0.45s ease",
                      }}>
                        <div style={{ position: "absolute", top: -3, left: 0, width: 2, height: 8, background: "#6366f1", borderRadius: 1, opacity: 0.8 }} />
                        <div style={{ position: "absolute", top: -3, right: 0, width: 2, height: 8, background: "#6366f1", borderRadius: 1, opacity: 0.8 }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Label */}
              <span style={{
                fontSize: isSel ? 10 : 9,
                fontWeight: isSel ? 700 : 400,
                fontFamily: "inherit",
                color: isSel
                  ? (dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)")
                  : (dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)"),
                whiteSpace: "nowrap",
              }}>{d.label}</span>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <button onClick={() => canGoBack && shift("back")} style={{
          background: "none", border: "none", padding: 0,
          cursor: canGoBack ? "pointer" : "default",
          color: canGoBack
            ? (dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)")
            : "transparent",
          fontSize: 13, fontWeight: 600,
        }}>‹ Anteriores</button>
        <span style={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }}>
          {startIdx + 1}–{endIdx} / {total}
        </span>
        <button onClick={() => canGoFwd && shift("fwd")} style={{
          background: "none", border: "none", padding: 0,
          cursor: canGoFwd ? "pointer" : "default",
          color: canGoFwd
            ? (dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)")
            : "transparent",
          fontSize: 13, fontWeight: 600,
        }}>Siguientes ›</button>
      </div>
    </div>
  );
};

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
const DonutChart = ({ data }) => {
  const size = 120, cx = 60, cy = 60, r = 46, strokeW = 14;
  const circ = 2 * Math.PI * r;
  let cumPct = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(128,128,128,0.1)" strokeWidth={strokeW} />
      {data.map((d, i) => {
        const dash = (d.pct / 100) * circ;
        const offset = circ - cumPct * circ / 100;
        cumPct += d.pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="rgba(128,128,128,0.8)" fontFamily="DM Sans, sans-serif">Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="14" fill="#6366f1" fontWeight="700" fontFamily="DM Sans, sans-serif">1.810€</text>
    </svg>
  );
};

// ─── PREDEFINED CATEGORIES ────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "supermercado",  name: "Supermercado",  icon: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0", color: "#22c55e" },
  { id: "restaurante",   name: "Restaurante",   icon: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3", color: "#f59e0b" },
  { id: "transporte",    name: "Transporte",    icon: "M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2M14 17H9m3 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z", color: "#8b5cf6" },
  { id: "hogar",         name: "Hogar",         icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", color: "#06b6d4" },
  { id: "ocio",          name: "Ocio",          icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", color: "#ef4444" },
  { id: "compras",       name: "Compras",       icon: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0", color: "#ec4899" },
  { id: "salud",         name: "Salud",         icon: "M22 12h-4l-3 9L9 3l-3 9H2", color: "#10b981" },
  { id: "ingresos",      name: "Ingresos",      icon: "M12 19V5M5 12l7-7 7 7", color: "#3b82f6" },
  { id: "otros",         name: "Otros",         icon: "M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24", color: "#64748b" },
];

const findCategory = (name) => CATEGORIES.find(c => c.name === name) || CATEGORIES.find(c => c.id === "otros");

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const [screen, setScreen] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [animating, setAnimating] = useState(false);

  // Onboarding state — first time users
  const [hasOnboarded, setHasOnboarded] = useState(true); // default true so demo loads with data
  // Transactions can be re-categorized at runtime
  const [txCategories, setTxCategories] = useState({}); // { [txId]: categoryName }
  const [swipedTxId, setSwipedTxId] = useState(null); // tx being swiped open
  const [drilldownCat, setDrilldownCat] = useState(null); // { name, color, icon, gran }
  const [prevScreen, setPrevScreen] = useState(null); // to go back

  // Shared analytics period state — shared between AnalyticsScreen and CategoryDetailScreen
  const [gran, setGran] = useState("mes");
  const [showPicker, setShowPicker] = useState(false);

  const navigate = (tab) => {
    setAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setScreen(tab);
      setDrilldownCat(null);
      setAnimating(false);
    }, 150);
  };

  const navigateToCat = (cat, gran) => {
    setAnimating(true);
    setTimeout(() => {
      setDrilldownCat({ ...cat, gran });
      setScreen("category-detail");
      setAnimating(false);
    }, 150);
  };

  const navigateBack = () => {
    setAnimating(true);
    setTimeout(() => {
      setDrilldownCat(null);
      setScreen("analytics");
      setAnimating(false);
    }, 150);
  };

  // Shared gran handler — resets bar selection via ref
  const handleSetGran = (g) => {
    setGran(g);
    setShowPicker(false);
  };

  // Theme tokens
  const t = {
    bg: dark ? "#0f0f14" : "#f5f5f7",
    surface: dark ? "#1a1a24" : "#ffffff",
    surface2: dark ? "#22222f" : "#f0f0f5",
    border: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    text: dark ? "#f0f0f5" : "#0f0f14",
    textMuted: dark ? "rgba(240,240,245,0.45)" : "rgba(15,15,20,0.45)",
    accent: "#6366f1",
    accentLight: dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
    positive: "#22c55e",
    negative: "#ef4444",
    card: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  };

  const styles = {
    app: {
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: t.bg,
      minHeight: "100vh",
      maxWidth: 420,
      margin: "0 auto",
      position: "relative",
      overflow: "clip",  /* clip no rompe position:sticky, hidden sí */
    },
    header: {
      padding: "52px 24px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    screenWrap: {
      padding: "0 0 90px",
      opacity: animating ? 0 : 1,
      transition: "opacity 0.2s ease",
    },
    nav: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 420,
      background: dark ? "rgba(15,15,20,0.92)" : "rgba(245,245,247,0.92)",
      backdropFilter: "blur(20px)",
      borderTop: `1px solid ${t.border}`,
      display: "flex",
      padding: "10px 0 24px",
      zIndex: 100,
    },
    navItem: (active) => ({
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      padding: "6px 0",
      cursor: "pointer",
      color: active ? t.accent : t.textMuted,
      transition: "color 0.2s ease",
      fontSize: 10,
      fontWeight: active ? 600 : 400,
    }),
    card: {
      background: t.surface,
      borderRadius: 20,
      padding: "20px",
      border: `1px solid ${t.border}`,
    },
    pill: (color) => ({
      background: color + "22",
      color: color,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 600,
    }),
  };

  // ── DASHBOARD SCREEN ────────────────────────────────────────────────────────
  // ── PATRIMONIO NETO DATA (últimos 12 meses) ───────────────────────────────
  const patrimonioData = [
    { label: "May", value: 2840 }, { label: "Jun", value: 3120 },
    { label: "Jul", value: 2980 }, { label: "Ago", value: 3380 },
    { label: "Sep", value: 3210 }, { label: "Oct", value: 3050 },
    { label: "Nov", value: 3290 }, { label: "Dic", value: 3180 },
    { label: "Ene", value: 3420 }, { label: "Feb", value: 3560 },
    { label: "Mar", value: 3640 }, { label: "Abr", value: 3740 },
  ];

  const DashboardScreen = () => (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 2 }}>Buenos días 👋</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Mis Finanzas</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setDark(!dark)} style={{
            background: t.surface2, border: `1px solid ${t.border}`,
            borderRadius: 12, width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: t.textMuted,
          }}>
            <Icon d={dark ? Icons.sun : Icons.moon} size={16} />
          </button>
          <div onClick={() => setHasOnboarded(false)} title="Ver onboarding" style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <Icon d={Icons.user} size={16} stroke="white" />
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Balance total card */}
        <div style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
          borderRadius: 24, padding: "24px",
          boxShadow: "0 20px 60px rgba(99,102,241,0.35)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -20, right: -20,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }} />
          <div style={{
            position: "absolute", bottom: -30, left: 40,
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Balance total</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "white", letterSpacing: -1, marginBottom: 4 }}>
              3.740,13 €
            </div>
            {/* Weekly delta */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: "#a7f3d0",
                background: "rgba(167, 243, 208, 0.18)",
                padding: "2px 8px", borderRadius: 20,
              }}>↑ +120 €</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>esta semana</span>
            </div>

            {/* Sparkline — last 30 days */}
            <svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none" style={{ display: "block" }}>
              {(() => {
                const points = [3540, 3580, 3520, 3610, 3650, 3590, 3640, 3680, 3620, 3700, 3660, 3690, 3720, 3680, 3710, 3650, 3690, 3730, 3680, 3720, 3700, 3740, 3690, 3720, 3680, 3700, 3720, 3700, 3730, 3740];
                const min = Math.min(...points);
                const max = Math.max(...points);
                const range = max - min || 1;
                const w = 300, h = 40, pad = 4;
                const coords = points.map((v, i) => {
                  const x = (i / (points.length - 1)) * w;
                  const y = h - pad - ((v - min) / range) * (h - 2 * pad);
                  return [x, y];
                });
                const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
                const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
                return (
                  <>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#sparkGrad)" />
                    <path d={linePath} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>Últimos 30 días</div>
          </div>
        </div>

        {/* Patrimonio neto — evolución 12 meses */}
        <div style={{ ...styles.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Patrimonio neto</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.positive, background: t.positive + "18", padding: "3px 10px", borderRadius: 20 }}>
              ↑ +900 € vs hace 12 meses
            </div>
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>Últimos 12 meses</div>
          {(() => {
            const w = 320, h = 80, pad = 6;
            const vals = patrimonioData.map(d => d.value);
            const min = Math.min(...vals) - 200;
            const max = Math.max(...vals) + 100;
            const range = max - min;
            const coords = patrimonioData.map((d, i) => ({
              x: pad + (i / (patrimonioData.length - 1)) * (w - 2 * pad),
              y: h - pad - ((d.value - min) / range) * (h - 2 * pad),
              ...d,
            }));
            const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
            const areaPath = `${linePath} L${coords[coords.length-1].x},${h} L${coords[0].x},${h} Z`;
            const accentRGB = dark ? "99,102,241" : "99,102,241";
            return (
              <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                <defs>
                  <linearGradient id="netoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`rgba(${accentRGB},0.18)`} />
                    <stop offset="100%" stopColor={`rgba(${accentRGB},0)`} />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#netoGrad)" />
                <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Last point dot */}
                <circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r="4" fill="#6366f1" />
                <circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r="7" fill="rgba(99,102,241,0.2)" />
                {/* Month labels — first, mid, last */}
                {[0, 5, 11].map(i => (
                  <text key={i} x={coords[i].x} y={h} textAnchor="middle" fontSize="9"
                    fill={dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} fontFamily="DM Sans, sans-serif">
                    {coords[i].label}
                  </text>
                ))}
              </svg>
            );
          })()}
        </div>

        {/* Cuentas */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Mis cuentas</div>
            <div onClick={() => navigate("accounts")} style={{ fontSize: 12, color: t.accent, cursor: "pointer", fontWeight: 600 }}>Ver todas</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {mockAccounts.map(acc => (
              <div key={acc.id} onClick={() => navigate("accounts")} style={{
                background: t.surface, borderRadius: 16,
                padding: "14px", border: `1px solid ${t.border}`, cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: acc.color + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: acc.color }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {acc.type === "bank" ? "Cuenta" : acc.type === "card" ? "Tarjeta" : "Edenred"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc.name}</div>
                <div style={{
                  fontSize: 17, fontWeight: 700,
                  color: acc.balance < 0 ? t.negative : t.text,
                }}>
                  {fmt(acc.balance, 2)} €
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{acc.number}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  // ── TRANSACTIONS SCREEN ─────────────────────────────────────────────────────
  const TransactionsScreen = () => {
    const [filter, setFilter] = useState("todos");
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [txSearch, setTxSearch] = useState("");
    const searchRef = React.useRef(null);
    const filters = ["todos", "ingresos", "gastos", "no computable"];

    const txWithAccount = mockTransactions.map((tx, i) => ({
      ...tx,
      account_id: i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 3,
    }));

    const filtered = txWithAccount
      .filter(tx => selectedAccounts.length === 0 || selectedAccounts.includes(tx.account_id))
      .filter(tx => {
        const catName = getTxCategory(tx).name;
        return filter === "todos"          ? true
          : filter === "ingresos"          ? tx.amount > 0
          : filter === "gastos"            ? tx.amount < 0 && catName !== "Restaurante"
          : catName === "Restaurante";
      })
      .filter(tx => {
        if (!txSearch.trim()) return true;
        const q = txSearch.toLowerCase().trim();
        const catName = getTxCategory(tx).name.toLowerCase();
        return tx.desc.toLowerCase().includes(q) || catName.includes(q);
      })
      .sort((a, b) => b.dateObj.localeCompare(a.dateObj) || b.time.localeCompare(a.time));

    // Group by day
    const TODAY = "2025-04-30";
    const YESTERDAY = "2025-04-29";
    const formatDayLabel = (dateStr) => {
      if (dateStr === TODAY)     return "Hoy";
      if (dateStr === YESTERDAY) return "Ayer";
      const [y, m, d] = dateStr.split("-");
      const MONTHS_D = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      return `${parseInt(d)} ${MONTHS_D[parseInt(m) - 1]} ${y}`;
    };

    const groups = filtered.reduce((acc, tx) => {
      const key = tx.dateObj;
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {});
    const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const accountLabel = selectedAccounts.length === 0
      ? "Todas las cuentas"
      : selectedAccounts.length === 1
        ? mockAccounts.find(a => a.id === selectedAccounts[0])?.name
        : `${selectedAccounts.length} cuentas`;

    const toggleAccount = (id) => {
      setSelectedAccounts(prev =>
        prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
      );
    };

    const AccountPicker = () => (
      <div style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end",
      }} onClick={() => setShowAccountPicker(false)}>
        <div onClick={e => e.stopPropagation()} style={{
          width: "100%", maxWidth: 420, margin: "0 auto",
          background: t.surface, borderRadius: "28px 28px 0 0",
          padding: "20px 20px 40px",
        }}>
          <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 20px" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 6 }}>Filtrar por cuenta</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16 }}>Selecciona una o varias cuentas</div>
          <button onClick={() => { setSelectedAccounts([]); setShowAccountPicker(false); }} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 14, border: "none", cursor: "pointer",
            background: selectedAccounts.length === 0 ? t.accentLight : t.surface2,
            borderLeft: selectedAccounts.length === 0 ? `3px solid ${t.accent}` : "3px solid transparent",
            marginBottom: 8, transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: t.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: selectedAccounts.length === 0 ? t.accent : t.text }}>Todas las cuentas</span>
            </div>
            {selectedAccounts.length === 0 && (
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            )}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mockAccounts.map(acc => {
              const isSelected = selectedAccounts.includes(acc.id);
              return (
                <button key={acc.id} onClick={() => toggleAccount(acc.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 14, border: "none", cursor: "pointer",
                  background: isSelected ? t.accentLight : t.surface2,
                  borderLeft: isSelected ? `3px solid ${t.accent}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: acc.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: acc.color }} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? t.accent : t.text }}>{acc.name}</div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{acc.number}</div>
                    </div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    border: isSelected ? "none" : `2px solid ${t.border}`,
                    background: isSelected ? t.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", flexShrink: 0,
                  }}>
                    {isSelected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

    return (
      <div>
        <div style={styles.header}>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Movimientos</div>
          <button onClick={() => setShowAdd(true)} style={{
            background: t.accent, border: "none", borderRadius: 12,
            width: 36, height: 36, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}>
            <Icon d={Icons.plus} size={18} stroke="white" />
          </button>
        </div>
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Buscador */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: t.surface2, border: `1px solid ${t.border}`,
            borderRadius: 14, padding: "10px 14px",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={txSearch}
              onChange={e => setTxSearch(e.target.value)}
              placeholder="Buscar por descripción o categoría…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 13, color: t.text, fontFamily: "inherit",
              }}
            />
            {txSearch && (
              <button onClick={() => setTxSearch("")} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: t.textMuted, padding: 0, display: "flex",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </button>
            )}
          </div>

          {/* Filtro por cuenta */}
          <button onClick={() => setShowAccountPicker(true)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 14,
            background: selectedAccounts.length > 0 ? t.accentLight : t.surface2,
            border: selectedAccounts.length > 0 ? `1px solid ${t.accent}44` : `1px solid ${t.border}`,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={selectedAccounts.length > 0 ? t.accent : t.textMuted}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: selectedAccounts.length > 0 ? t.accent : t.textMuted }}>{accountLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {selectedAccounts.length > 0 && (
                <div style={{ background: t.accent, color: "white", borderRadius: 20, width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{selectedAccounts.length}</div>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </button>

          {/* Filtros tipo */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? t.accent : t.surface2,
                color: filter === f ? "white" : t.textMuted,
                border: "none", borderRadius: 20, padding: "6px 14px",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                textTransform: "capitalize", transition: "all 0.2s",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>{f}</button>
            ))}
          </div>

          {/* Lista agrupada por día */}
          {sortedDays.length > 0 ? sortedDays.map(day => (
            <div key={day}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted }}>
                  {formatDayLabel(day)}
                </span>
                <span style={{ fontSize: 12, color: t.textMuted }}>
                  {((d) => (d >= 0 ? '+' : '') + fmt(d, 2))(groups[day].reduce((s, tx) => s + tx.amount, 0))} €
                </span>
              </div>
              {/* Transactions for this day */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {groups[day].map(tx => (
              <TxRow key={tx.id} tx={tx} t={t} effective={getTxCategory(tx)}
                onClick={() => { setSwipedTxId(null); setSelectedTx(tx); }}
                swipedId={swipedTxId} onSwipe={setSwipedTxId}
                onRecategorize={(tx) => { setSwipedTxId(null); setCatPickerTx(tx); setShowCatPicker(true); }}
              />
                ))}
              </div>
            </div>
          )) : (
            <div style={{ textAlign: "center", padding: "32px 0", color: t.textMuted, fontSize: 13 }}>
              No hay movimientos con estos filtros
            </div>
          )}
        </div>

        {showAccountPicker && <AccountPicker />}
      </div>
    );
  };

  // ── ACCOUNTS SCREEN ─────────────────────────────────────────────────────────
  const AccountsScreen = () => (
    <div>
      <div style={styles.header}>
        <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Cuentas</div>
        <button style={{
          background: t.accent, border: "none", borderRadius: 12,
          width: 36, height: 36, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer",
        }}>
          <Icon d={Icons.plus} size={18} stroke="white" />
        </button>
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {mockAccounts.map(acc => (
          <div key={acc.id} style={{
            background: t.surface, borderRadius: 20, padding: "20px",
            border: `1px solid ${t.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: acc.color + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: acc.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{acc.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{acc.number}</div>
                </div>
              </div>
              <div style={styles.pill(acc.source === "enablebanking" ? t.accent : "#f59e0b")}>
                {acc.source === "enablebanking" ? "PSD2" : "Scraper"}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Saldo actual</div>
                <div style={{
                  fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
                  color: acc.balance < 0 ? t.negative : t.text,
                }}>
                  {fmt(acc.balance, 2)} €
                </div>
              </div>
              <div style={{
                background: t.accentLight, color: t.accent,
                borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}>Ver movimientos</div>
            </div>
            {/* Mini sync info */}
            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}`,
              fontSize: 11, color: t.textMuted, display: "flex", alignItems: "center", gap: 4,
            }}>
              <Icon d={Icons.check} size={12} stroke={t.positive} />
              Sincronizado hace 2 horas
            </div>
          </div>
        ))}

        {/* Añadir cuenta */}
        <div style={{
          background: t.accentLight, border: `2px dashed ${t.accent}44`,
          borderRadius: 20, padding: "20px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          cursor: "pointer",
        }}>
          <Icon d={Icons.plus} size={18} stroke={t.accent} />
          <span style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>Conectar nueva cuenta</span>
        </div>
      </div>
    </div>
  );

  // ── ANALYTICS DATA ───────────────────────────────────────────────────────────
  // Current period is always used — no manual selection
  const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MONTHS_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const now = new Date(); // real current date
  const curMonth = now.getMonth();       // 0-indexed
  const curYear = now.getFullYear();
  const curQuarter = Math.floor(curMonth / 3); // 0-indexed Q
  const qLabels = ["Q1","Q2","Q3","Q4"];
  const qRanges = ["Ene – Mar","Abr – Jun","Jul – Sep","Oct – Dic"];
  const curWeek = Math.ceil(now.getDate() / 7); // 1-4

  const periodLabels = {
    semana: `Sem ${curWeek} · ${MONTHS_SHORT[curMonth]} ${curYear}`,
    mes:    `${MONTHS_FULL[curMonth]} ${curYear}`,
    trimestre: `${qLabels[curQuarter]} ${curYear} · ${qRanges[curQuarter]}`,
    año:    `${curYear}`,
  };

  const dataByGran = {
    semana: {
      ingresos: 600, gastos: 320, ahorro: 280, ahorroObj: 600,
      deltaIngresos: "+5%", deltaGastos: "-12%", deltaRef: "vs sem. anterior",
      vsAnioIngresos: "+3%", vsAnioGastos: "+8%",
      chartData: [
        { label: "S18", ingresos: 600, gastos: 410 }, { label: "S19", ingresos: 570, gastos: 380 },
        { label: "S20", ingresos: 600, gastos: 290 }, { label: "S21", ingresos: 580, gastos: 350 },
        { label: "S22", ingresos: 600, gastos: 300 }, { label: "S23", ingresos: 610, gastos: 320 },
        { label: "S24", ingresos: 600, gastos: 340 }, { label: "S25", ingresos: 590, gastos: 280 },
        { label: "S26", ingresos: 600, gastos: 360 },
      ],
      chartTitle: "Semanas recientes",
      ahorroLabel: "semana",
      cats: [
        { name: "Alimentación", amount: 110, pct: 34, color: "#22c55e" },
        { name: "Transporte", amount: 75, pct: 24, color: "#8b5cf6" },
        { name: "Restaurantes", amount: 65, pct: 20, color: "#f59e0b" },
        { name: "Ocio", amount: 45, pct: 14, color: "#ef4444" },
        { name: "Otros", amount: 25, pct: 8, color: "#64748b" },
      ],
      catsIngresos: [
        { name: "Nómina", amount: 550, pct: 92, color: "#22c55e" },
        { name: "Freelance", amount: 50, pct: 8, color: "#06b6d4" },
      ],
    },
    mes: {
      ingresos: 2400, gastos: 1430, ahorro: 970, ahorroObj: 2400,
      deltaIngresos: "+12%", deltaGastos: "-8%", deltaRef: "vs mes anterior",
      vsAnioIngresos: "+9%", vsAnioGastos: "-5%",
      chartData: [
        { label: "May'24", ingresos: 2200, gastos: 1920, ahorro: 280, cats: [{ name:"Hogar",amount:760,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:380,pct:20,color:"#22c55e"},{ name:"Transporte",amount:230,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:288,pct:15,color:"#ef4444"},{ name:"Otros",amount:262,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2000,pct:91,color:"#22c55e"},{ name:"Otros",amount:200,pct:9,color:"#64748b"}] },
        { label: "Jun'24", ingresos: 2200, gastos: 1580, ahorro: 620, cats: [{ name:"Hogar",amount:620,pct:39,color:"#06b6d4"},{ name:"Alimentación",amount:300,pct:19,color:"#22c55e"},{ name:"Transporte",amount:190,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:220,pct:14,color:"#ef4444"},{ name:"Otros",amount:250,pct:16,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2000,pct:91,color:"#22c55e"},{ name:"Otros",amount:200,pct:9,color:"#64748b"}] },
        { label: "Jul'24", ingresos: 2200, gastos: 1900, ahorro: 300, cats: [{ name:"Hogar",amount:760,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:380,pct:20,color:"#22c55e"},{ name:"Transporte",amount:285,pct:15,color:"#8b5cf6"},{ name:"Ocio",amount:285,pct:15,color:"#ef4444"},{ name:"Otros",amount:190,pct:10,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2000,pct:91,color:"#22c55e"},{ name:"Otros",amount:200,pct:9,color:"#64748b"}] },
        { label: "Ago'24", ingresos: 2200, gastos: 1340, ahorro: 860, cats: [{ name:"Hogar",amount:536,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:268,pct:20,color:"#22c55e"},{ name:"Transporte",amount:161,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:201,pct:15,color:"#ef4444"},{ name:"Otros",amount:174,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2000,pct:91,color:"#22c55e"},{ name:"Otros",amount:200,pct:9,color:"#64748b"}] },
        { label: "Sep'24", ingresos: 2400, gastos: 1760, ahorro: 640, cats: [{ name:"Hogar",amount:704,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:352,pct:20,color:"#22c55e"},{ name:"Transporte",amount:211,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:264,pct:15,color:"#ef4444"},{ name:"Otros",amount:229,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Oct'24", ingresos: 2400, gastos: 2050, ahorro: 350, cats: [{ name:"Hogar",amount:820,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:410,pct:20,color:"#22c55e"},{ name:"Transporte",amount:246,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:307,pct:15,color:"#ef4444"},{ name:"Otros",amount:267,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Nov'24", ingresos: 2400, gastos: 1820, ahorro: 580, cats: [{ name:"Hogar",amount:728,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:364,pct:20,color:"#22c55e"},{ name:"Transporte",amount:218,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:273,pct:15,color:"#ef4444"},{ name:"Otros",amount:237,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Dic'24", ingresos: 2400, gastos: 2340, ahorro:  60, cats: [{ name:"Hogar",amount:936,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:468,pct:20,color:"#22c55e"},{ name:"Transporte",amount:281,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:351,pct:15,color:"#ef4444"},{ name:"Otros",amount:304,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Ene", ingresos: 2400, gastos: 1650, ahorro: 750, prevIngresos: 2200, prevGastos: 1720, cats: [{ name:"Hogar",amount:950,pct:58,color:"#06b6d4"},{ name:"Alimentación",amount:330,pct:20,color:"#22c55e"},{ name:"Transporte",amount:198,pct:12,color:"#8b5cf6"},{ name:"Otros",amount:172,pct:10,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Feb", ingresos: 2400, gastos: 1980, ahorro: 420, prevIngresos: 2200, prevGastos: 2050, cats: [{ name:"Hogar",amount:950,pct:48,color:"#06b6d4"},{ name:"Alimentación",amount:396,pct:20,color:"#22c55e"},{ name:"Transporte",amount:238,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:198,pct:10,color:"#ef4444"},{ name:"Otros",amount:198,pct:10,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Mar", ingresos: 2400, gastos: 2100, ahorro: 300, prevIngresos: 2200, prevGastos: 2180, cats: [{ name:"Hogar",amount:950,pct:45,color:"#06b6d4"},{ name:"Alimentación",amount:420,pct:20,color:"#22c55e"},{ name:"Transporte",amount:252,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:273,pct:13,color:"#ef4444"},{ name:"Otros",amount:205,pct:10,color:"#64748b"}], catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:200,pct:8,color:"#06b6d4"}] },
        { label: "Abr", ingresos: 2400, gastos: 1430, ahorro: 970, prevIngresos: 2200, prevGastos: 1510, cats: categoryData, catsI:[{ name:"Nómina",amount:2200,pct:92,color:"#22c55e"},{ name:"Freelance",amount:150,pct:6,color:"#06b6d4"},{ name:"Otros",amount:50,pct:2,color:"#64748b"}] },
      ],
      chartTitle: "Ingresos vs Gastos",
      ahorroLabel: "mes",
      cats: categoryData,
      catsIngresos: [
        { name: "Nómina", amount: 2200, pct: 92, color: "#22c55e" },
        { name: "Freelance", amount: 150, pct: 6, color: "#06b6d4" },
        { name: "Otros", amount: 50, pct: 2, color: "#64748b" },
      ],
    },
    trimestre: {
      ingresos: 7200, gastos: 5010, ahorro: 2190, ahorroObj: 7200,
      deltaIngresos: "+9%", deltaGastos: "+4%", deltaRef: "vs Q1",
      vsAnioIngresos: "+6%", vsAnioGastos: "-2%",
      chartData: [
        { label: "Q1'23", ingresos: 6200, gastos: 5800, ahorro:  400, cats:[{ name:"Hogar",amount:2320,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1160,pct:20,color:"#22c55e"},{ name:"Transporte",amount:696,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:870,pct:15,color:"#ef4444"},{ name:"Otros",amount:754,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:5700,pct:92,color:"#22c55e"},{ name:"Otros",amount:500,pct:8,color:"#64748b"}] },
        { label: "Q2'23", ingresos: 6400, gastos: 5200, ahorro: 1200, cats:[{ name:"Hogar",amount:2080,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1040,pct:20,color:"#22c55e"},{ name:"Transporte",amount:624,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:780,pct:15,color:"#ef4444"},{ name:"Otros",amount:676,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:5900,pct:92,color:"#22c55e"},{ name:"Otros",amount:500,pct:8,color:"#64748b"}] },
        { label: "Q3'23", ingresos: 6600, gastos: 5600, ahorro: 1000, cats:[{ name:"Hogar",amount:2240,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1120,pct:20,color:"#22c55e"},{ name:"Transporte",amount:672,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:840,pct:15,color:"#ef4444"},{ name:"Otros",amount:728,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6100,pct:92,color:"#22c55e"},{ name:"Otros",amount:500,pct:8,color:"#64748b"}] },
        { label: "Q4'23", ingresos: 7000, gastos: 6400, ahorro:  600, cats:[{ name:"Hogar",amount:2560,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1280,pct:20,color:"#22c55e"},{ name:"Transporte",amount:768,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:960,pct:15,color:"#ef4444"},{ name:"Otros",amount:832,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6400,pct:91,color:"#22c55e"},{ name:"Otros",amount:600,pct:9,color:"#64748b"}] },
        { label: "Q1'24", ingresos: 6800, gastos: 5300, ahorro: 1500, cats:[{ name:"Hogar",amount:2120,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1060,pct:20,color:"#22c55e"},{ name:"Transporte",amount:636,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:795,pct:15,color:"#ef4444"},{ name:"Otros",amount:689,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6200,pct:91,color:"#22c55e"},{ name:"Freelance",amount:600,pct:9,color:"#06b6d4"}] },
        { label: "Q2'24", ingresos: 6800, gastos: 5100, ahorro: 1700, cats:[{ name:"Hogar",amount:2040,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1020,pct:20,color:"#22c55e"},{ name:"Transporte",amount:612,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:765,pct:15,color:"#ef4444"},{ name:"Otros",amount:663,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6200,pct:91,color:"#22c55e"},{ name:"Freelance",amount:600,pct:9,color:"#06b6d4"}] },
        { label: "Q3'24", ingresos: 6900, gastos: 5400, ahorro: 1500, cats:[{ name:"Hogar",amount:2160,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1080,pct:20,color:"#22c55e"},{ name:"Transporte",amount:648,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:810,pct:15,color:"#ef4444"},{ name:"Otros",amount:702,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6300,pct:91,color:"#22c55e"},{ name:"Freelance",amount:600,pct:9,color:"#06b6d4"}] },
        { label: "Q4'24", ingresos: 7200, gastos: 6200, ahorro: 1000, cats:[{ name:"Hogar",amount:2480,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:1240,pct:20,color:"#22c55e"},{ name:"Transporte",amount:744,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:930,pct:15,color:"#ef4444"},{ name:"Otros",amount:806,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6600,pct:92,color:"#22c55e"},{ name:"Freelance",amount:600,pct:8,color:"#06b6d4"}] },
        { label: "Q1'25", ingresos: 7200, gastos: 4820, ahorro: 2380, cats:[{ name:"Hogar",amount:1928,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:964,pct:20,color:"#22c55e"},{ name:"Transporte",amount:578,pct:12,color:"#8b5cf6"},{ name:"Ocio",amount:723,pct:15,color:"#ef4444"},{ name:"Otros",amount:627,pct:13,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6600,pct:92,color:"#22c55e"},{ name:"Freelance",amount:600,pct:8,color:"#06b6d4"}] },
        { label: "Q2'25", ingresos: 7200, gastos: 5010, ahorro: 2190, cats:[{ name:"Hogar",amount:2004,pct:40,color:"#06b6d4"},{ name:"Alimentación",amount:852,pct:17,color:"#22c55e"},{ name:"Transporte",amount:651,pct:13,color:"#8b5cf6"},{ name:"Ocio",amount:501,pct:10,color:"#ef4444"},{ name:"Restaurantes",amount:401,pct:8,color:"#f59e0b"},{ name:"Otros",amount:601,pct:12,color:"#64748b"}], catsI:[{ name:"Nómina",amount:6600,pct:92,color:"#22c55e"},{ name:"Freelance",amount:450,pct:6,color:"#06b6d4"},{ name:"Inversiones",amount:150,pct:2,color:"#f59e0b"}] },
      ],
      chartTitle: "Ingresos vs Gastos",
      ahorroLabel: "trimestre",
      cats: [
        { name: "Hogar", amount: 2850, pct: 40, color: "#06b6d4" },
        { name: "Alimentación", amount: 1200, pct: 17, color: "#22c55e" },
        { name: "Transporte", amount: 900, pct: 13, color: "#8b5cf6" },
        { name: "Ocio", amount: 700, pct: 10, color: "#ef4444" },
        { name: "Restaurantes", amount: 580, pct: 8, color: "#f59e0b" },
        { name: "Otros", amount: 780, pct: 12, color: "#64748b" },
      ],
      catsIngresos: [
        { name: "Nómina", amount: 6600, pct: 92, color: "#22c55e" },
        { name: "Freelance", amount: 450, pct: 6, color: "#06b6d4" },
        { name: "Inversiones", amount: 150, pct: 2, color: "#f59e0b" },
      ],
    },
    año: {
      ingresos: 28800, gastos: 19450, ahorro: 9350, ahorroObj: 28800,
      deltaIngresos: "+7%", deltaGastos: "+3%", deltaRef: "vs 2024",
      vsAnioIngresos: "+7%", vsAnioGastos: "+3%",
      chartData: [
        { label: "2018", ingresos: 18000, gastos: 16200 }, { label: "2019", ingresos: 20000, gastos: 17400 },
        { label: "2020", ingresos: 19200, gastos: 17800 }, { label: "2021", ingresos: 22000, gastos: 18200 },
        { label: "2022", ingresos: 24000, gastos: 18600 }, { label: "2023", ingresos: 25200, gastos: 18900 },
        { label: "2024", ingresos: 26400, gastos: 18900 }, { label: "2025", ingresos: 28800, gastos: 19450 },
      ],
      chartTitle: "Ingresos vs Gastos",
      ahorroLabel: "año",
      cats: [
        { name: "Hogar", amount: 11400, pct: 38, color: "#06b6d4" },
        { name: "Alimentación", amount: 4200, pct: 22, color: "#22c55e" },
        { name: "Transporte", amount: 2800, pct: 14, color: "#8b5cf6" },
        { name: "Ocio", amount: 2100, pct: 11, color: "#ef4444" },
        { name: "Restaurantes", amount: 1600, pct: 8, color: "#f59e0b" },
        { name: "Otros", amount: 1350, pct: 7, color: "#64748b" },
      ],
      catsIngresos: [
        { name: "Nómina", amount: 26400, pct: 92, color: "#22c55e" },
        { name: "Freelance", amount: 1440, pct: 5, color: "#06b6d4" },
        { name: "Inversiones", amount: 600, pct: 2, color: "#f59e0b" },
        { name: "Otros", amount: 360, pct: 1, color: "#64748b" },
      ],
    },
  };

  // ── YTD DATA per granularity ─────────────────────────────────────────────────
  // Mes: acumulado Ene → mes actual (Abr = 4 meses)
  const dataYTD_mes = {
    ingresos: 9600, gastos: 7160, ahorro: 2440, ahorroObj: 9600,
    deltaIngresos: "+8%", deltaGastos: "+2%", deltaRef: "vs mismo período 2024",
    vsAnioIngresos: "+8%", vsAnioGastos: "+2%",
    chartData: [
      { label: "Ene", ingresos: 2400, gastos: 1650 },
      { label: "Feb", ingresos: 2400, gastos: 1980 },
      { label: "Mar", ingresos: 2400, gastos: 2100 },
      { label: "Abr", ingresos: 2400, gastos: 1430 },
    ],
    chartTitle: "Ene – Abr 2025 (acumulado)",
    ahorroLabel: "YTD",
    cats: [
      { name: "Hogar", amount: 3800, pct: 40, color: "#06b6d4" },
      { name: "Alimentación", amount: 1400, pct: 15, color: "#22c55e" },
      { name: "Transporte", amount: 1050, pct: 11, color: "#8b5cf6" },
      { name: "Ocio", amount: 820, pct: 9, color: "#ef4444" },
      { name: "Restaurantes", amount: 680, pct: 7, color: "#f59e0b" },
      { name: "Otros", amount: 1410, pct: 18, color: "#64748b" },
    ],
    catsIngresos: [
      { name: "Nómina", amount: 8800, pct: 92, color: "#22c55e" },
      { name: "Freelance", amount: 560, pct: 6, color: "#06b6d4" },
      { name: "Otros", amount: 240, pct: 2, color: "#64748b" },
    ],
  };
  // Trimestre Q2: acumulado Q1+Q2 = Ene–Jun
  // Q1 YTD = solo Q1 (Ene–Mar), Q2 YTD = Ene–Jun, Q3 = Ene–Sep, Q4 = año entero
  const dataYTD_trimestre = {
    // Q2 YTD shown as default (current quarter)
    ingresos: 14400, gastos: 10170, ahorro: 4230, ahorroObj: 14400,
    deltaIngresos: "+7%", deltaGastos: "+3%", deltaRef: "vs Q1+Q2 2024",
    vsAnioIngresos: "+7%", vsAnioGastos: "+3%",
    chartData: [
      { label: "Q1'24", ingresos: 6600, gastos: 4900 },
      { label: "Q2'24", ingresos: 13200, gastos: 9870 },
      { label: "Q3'24", ingresos: 19800, gastos: 15270 },
      { label: "Q4'24", ingresos: 26400, gastos: 21470 },
      { label: "Q1'25", ingresos: 7200, gastos: 4820 },
      { label: "Q2'25", ingresos: 14400, gastos: 10170 },
    ],
    chartTitle: "Acumulado por trimestre",
    ahorroLabel: "YTD",
    cats: [
      { name: "Hogar", amount: 5700, pct: 40, color: "#06b6d4" },
      { name: "Alimentación", amount: 2200, pct: 15, color: "#22c55e" },
      { name: "Transporte", amount: 1830, pct: 13, color: "#8b5cf6" },
      { name: "Ocio", amount: 1420, pct: 10, color: "#ef4444" },
      { name: "Restaurantes", amount: 1100, pct: 8, color: "#f59e0b" },
      { name: "Otros", amount: 1920, pct: 14, color: "#64748b" },
    ],
    catsIngresos: [
      { name: "Nómina", amount: 13200, pct: 92, color: "#22c55e" },
      { name: "Freelance", amount: 864, pct: 6, color: "#06b6d4" },
      { name: "Inversiones", amount: 336, pct: 2, color: "#f59e0b" },
    ],
  };

  const ytdSubLabel = {
    mes: "Ene – Abr 2025",
    trimestre: "Ene – Jun 2025",
  };

  // ── ANALYTICS SCREEN ────────────────────────────────────────────────────────
  const AnalyticsScreen = () => {
    const [catView, setCatView] = useState("gastos");
    const [selectedBarIdx, setSelectedBarIdx] = useState(null);
    const [showYoY, setShowYoY] = useState(false);

    const handleSetGranLocal = (g) => {
      handleSetGran(g);
      setSelectedBarIdx(null);
      setSelectedCatIdx(null);
    };

    const pd = dataByGran[gran];

    // Derive active KPI from selected bar
    const chartData = pd.chartData;
    const activeBarIdx = selectedBarIdx !== null ? selectedBarIdx : chartData.length - 1;
    const activeBar = chartData[activeBarIdx];

    // If bar has per-bar detail, use it; otherwise fall back to pd-level data
    const activeIngresos = activeBar.ingresos;
    const activeGastos   = activeBar.gastos;
    const activeAhorro   = activeBar.ahorro ?? (activeBar.ingresos - activeBar.gastos);
    const activeCatsG    = activeBar.cats   ?? pd.cats;
    const activeCatsI    = activeBar.catsI  ?? pd.catsIngresos;
    const activeLabel    = activeBar.label;
    const isCurrentBar   = activeBarIdx === chartData.length - 1;

    const [selectedCatIdx, setSelectedCatIdx] = useState(null);

    const DonutDynamic = ({ data, accentColor = "#6366f1" }) => {
      const total = data.reduce((s, c) => s + c.amount, 0);
      const size = 220, cx = 110, cy = 110, r = 72, strokeW = 22;
      const circ = 2 * Math.PI * r;
      const iconR = r + strokeW / 2 + 18; // radius for icon placement

      // Build arc segments with angles
      let cumDeg = -90;
      const segments = data.map((d, i) => {
        const deg = (d.pct / 100) * 360;
        const startDeg = cumDeg;
        const midDeg = cumDeg + deg / 2;
        cumDeg += deg;
        const dash = (d.pct / 100) * circ;
        return { ...d, i, dash, startDeg, midDeg };
      });

      const sel = selectedCatIdx !== null ? data[selectedCatIdx] : null;
      const centerLabel = sel ? sel.name : "Total";
      const centerValue = sel
        ? `${fmt(sel.amount)} €`
        : (total >= 10000 ? `${(total / 1000).toFixed(0)}k€` : `${total}€`);

      const degToRad = d => (d * Math.PI) / 180;

      const catDefs = data.map(d => findCategory(d.name));

      return (
        <svg width={size} height={size} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
            strokeWidth={strokeW} />

          {/* Arc segments */}
          {segments.map((seg, i) => {
            const isSelected = selectedCatIdx === i;
            const isDimmed = selectedCatIdx !== null && !isSelected;
            let cumPct = 0;
            for (let j = 0; j < i; j++) cumPct += data[j].pct;
            const offset = circ - (cumPct / 100) * circ;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={seg.color}
                strokeWidth={isSelected ? strokeW + 4 : strokeW}
                strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={isDimmed ? 0.2 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.25s, stroke-width 0.2s" }}
                onClick={() => setSelectedCatIdx(selectedCatIdx === i ? null : i)}
              />
            );
          })}

          {/* External icons */}
          {segments.map((seg, i) => {
            const angle = degToRad(seg.midDeg);
            const ix = cx + iconR * Math.cos(angle);
            const iy = cy + iconR * Math.sin(angle);
            const isSelected = selectedCatIdx === i;
            const isDimmed = selectedCatIdx !== null && !isSelected;
            const catDef = catDefs[i];
            // Parse icon path — we draw a small circle bg + SVG path
            return (
              <g key={i}
                onClick={() => setSelectedCatIdx(selectedCatIdx === i ? null : i)}
                style={{ cursor: "pointer" }}
                opacity={isDimmed ? 0.15 : 1}
              >
                <circle cx={ix} cy={iy} r={11}
                  fill={isSelected ? seg.color : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)")}
                  style={{ transition: "fill 0.2s" }}
                />
                {/* SVG icon centered on ix,iy — scale 0.6 of 24px viewbox = 14.4px */}
                <g transform={`translate(${ix - 7.2}, ${iy - 7.2}) scale(0.6)`}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
                    stroke={isSelected ? "white" : seg.color}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={catDef?.icon || Icons.list} />
                  </svg>
                </g>
              </g>
            );
          })}

          {/* Center label */}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10"
            fill={dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"}
            fontFamily="DM Sans, sans-serif">
            {centerLabel.length > 10 ? centerLabel.slice(0, 10) + "…" : centerLabel}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="15"
            fill={sel ? sel.color : accentColor}
            fontWeight="800" fontFamily="DM Sans, sans-serif">
            {centerValue}
          </text>
        </svg>
      );
    };

    // ── GRANULARITY PICKER ────────────────────────────────────────────────────
    const GranPicker = () => {
      const options = [
        { id: "semana",    label: "Semana",     sub: `Sem ${curWeek} de ${MONTHS_FULL[curMonth]}` },
        { id: "mes",       label: "Mes",         sub: `${MONTHS_FULL[curMonth]} ${curYear}` },
        { id: "trimestre", label: "Trimestre",   sub: `${qLabels[curQuarter]} · ${qRanges[curQuarter]} ${curYear}` },
        { id: "año",       label: "Año",         sub: `${curYear}` },
      ];
      return (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end",
        }} onClick={() => setShowPicker(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 420, margin: "0 auto",
            background: t.surface, borderRadius: "28px 28px 0 0",
            padding: "20px 20px 40px",
          }}>
            <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 16, textAlign: "center" }}>
              Ver por período
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {options.map(o => (
                <button key={o.id} onClick={() => handleSetGranLocal(o.id)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 16, border: "none", cursor: "pointer",
                  background: gran === o.id ? t.accentLight : t.surface2,
                  borderLeft: gran === o.id ? `3px solid ${t.accent}` : `3px solid transparent`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: gran === o.id ? t.accent : t.text }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{o.sub}</div>
                  </div>
                  {gran === o.id && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: t.accent,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    };

    // ── PERIOD BUTTON (shared) ────────────────────────────────────────────────
    const PeriodButton = () => (
      <button onClick={() => setShowPicker(true)} style={{
        background: t.accentLight, border: `1px solid ${t.accent}44`,
        borderRadius: 20, padding: "5px 12px 5px 10px",
        display: "flex", alignItems: "center", gap: 5,
        cursor: "pointer", color: t.accent,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{periodLabels[gran]}</span>
        <span style={{ fontSize: 10, color: t.accent, opacity: 0.7 }}>▾</span>
      </button>
    );

    return (
      <div>
        {/* ── Sticky header ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: dark ? "rgba(15,15,20,0.92)" : "rgba(245,245,247,0.92)",
          backdropFilter: "blur(16px)",
          padding: "52px 16px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${t.border}`,
          marginBottom: 4,
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Análisis</div>
          <PeriodButton />
        </div>

        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Ingresos", value: activeIngresos, color: t.positive, delta: pd.deltaIngresos, vsAnio: pd.vsAnioIngresos },
              { label: "Gastos",   value: activeGastos,   color: t.negative,  delta: pd.deltaGastos,  vsAnio: pd.vsAnioGastos  },
            ].map((s, i) => {
              const vsPositive = s.vsAnio?.startsWith("+");
              const vsColor = s.label === "Ingresos"
                ? (vsPositive ? t.positive : t.negative)
                : (vsPositive ? t.negative : t.positive);
              return (
                <div key={i} style={{ flex: 1, ...styles.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: t.textMuted }}>{s.label}</div>
                    {!isCurrentBar && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, background: t.accentLight, borderRadius: 8, padding: "2px 6px" }}>
                        {activeLabel}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: s.value >= 10000 ? 16 : 20, fontWeight: 800, color: s.color, marginBottom: 8 }}>
                    {fmt(s.value)} €
                  </div>
                  <div style={styles.pill(s.color)}>{s.delta} {pd.deltaRef}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: vsColor + "18" }}>
                    <span style={{ fontSize: 10, color: vsColor, fontWeight: 700 }}>{s.vsAnio}</span>
                    <span style={{ fontSize: 10, color: t.textMuted }}>vs año anterior</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Evolución */}
          <div style={{ ...styles.card }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Evolución de gastos</div>
              <button onClick={() => setShowYoY(v => !v)} style={{
                background: showYoY ? t.accentLight : t.surface2,
                border: showYoY ? `1px solid ${t.accent}44` : `1px solid ${t.border}`,
                borderRadius: 20, padding: "4px 10px", cursor: "pointer",
                fontSize: 10, fontWeight: 700, color: showYoY ? t.accent : t.textMuted,
                transition: "all 0.2s",
              }}>vs año ant.</button>
            </div>
            {showYoY && (
              <div style={{ display: "flex", gap: 14, marginBottom: 6 }}>
                {[["#22c55e", "Ingresos 2024"], ["#6366f1", "Gastos 2024"]].map(([color, label], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {/* Mini reference line icon */}
                    <svg width="18" height="10" viewBox="0 0 18 10">
                      <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                      <line x1="0" y1="2" x2="0" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                      <line x1="18" y1="2" x2="18" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: 10, color: t.textMuted }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>{pd.chartTitle}</div>
            <DualBarChart allData={pd.chartData} dark={dark} selectedBarIdx={selectedBarIdx} onSelect={setSelectedBarIdx} showYoY={showYoY} />
          </div>

          {/* Categorías detalle */}
          <div style={{ ...styles.card }}>
            {/* Header with toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Desglose por categoría</div>
              <div style={{ display: "flex", background: t.surface2, borderRadius: 20, padding: 3 }}>
                {["gastos", "ingresos"].map(v => (
                  <button key={v} onClick={() => { setCatView(v); setSelectedCatIdx(null); }} style={{
                    padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                    background: catView === v
                      ? (v === "gastos" ? "#6366f1" : "#22c55e")
                      : "transparent",
                    color: catView === v ? "white" : t.textMuted,
                    fontSize: 11, fontWeight: 700, transition: "all 0.2s",
                    textTransform: "capitalize",
                  }}>{v}</button>
                ))}
              </div>
            </div>

            {(() => {
              const activeCats = catView === "gastos" ? activeCatsG : activeCatsI;
              const accentColor = catView === "gastos" ? "#6366f1" : "#22c55e";
              return (
                <>
                  {/* Donut centrado, sin leyenda lateral */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                    <DonutDynamic data={activeCats} accentColor={accentColor} />
                  </div>

                  {/* Barras de categorías */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {activeCats.map((c, i) => {
                      const catDef = findCategory(c.name);
                      const isSelected = selectedCatIdx === i;
                      const isDimmed = selectedCatIdx !== null && !isSelected;
                      return (
                        <div key={i}
                          onClick={() => {
                            setSelectedCatIdx(selectedCatIdx === i ? null : i);
                            navigateToCat({ name: c.name, color: c.color, icon: catDef?.icon || Icons.list }, gran);
                          }}
                          style={{ cursor: "pointer", opacity: isDimmed ? 0.35 : 1, transition: "opacity 0.25s" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: 7,
                                background: isSelected ? c.color : c.color + "22",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.2s", flexShrink: 0,
                              }}>
                                <Icon d={catDef?.icon || Icons.list} size={13}
                                  stroke={isSelected ? "white" : c.color} />
                              </div>
                              <span style={{ fontSize: 13, color: t.text, fontWeight: isSelected ? 700 : 500 }}>{c.name}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: t.textMuted }}>{c.pct}%</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{fmt(c.amount)} €</span>
                              <span style={{ fontSize: 11, color: t.accent }}>›</span>
                            </div>
                          </div>
                          <div style={{ height: 6, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              width: `${c.pct}%`, height: "100%",
                              background: c.color, borderRadius: 3,
                              transition: "width 0.6s ease",
                              opacity: isDimmed ? 0.35 : 1,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Ahorro */}
          <div style={{
            background: "linear-gradient(135deg, #059669, #10b981)",
            borderRadius: 20, padding: "20px",
            boxShadow: "0 10px 40px rgba(16,185,129,0.25)",
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
              Ahorro {gran === "año" ? "anual" : gran === "semana" ? "semanal" : gran === "trimestre" ? "trimestral" : "mensual"}
              {!isCurrentBar && <span style={{ marginLeft: 6, opacity: 0.8 }}>· {activeLabel}</span>}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "white", marginBottom: 8 }}>
              {fmt(activeAhorro)} €
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3 }}>
              <div style={{
                width: `${Math.min(100, Math.round(activeAhorro / activeIngresos * 100))}%`,
                height: "100%", background: "white", borderRadius: 3, transition: "width 0.6s ease",
              }} />
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
              {Math.min(100, Math.round(activeAhorro / activeIngresos * 100))}% de tus ingresos del {pd.ahorroLabel}
            </div>
          </div>
        </div>

        {showPicker && <GranPicker />}
      </div>
    );
  };

  // ── SHARED MODAL FIELD ROW ───────────────────────────────────────────────────
  const FieldRow = ({ label, icon, children, onClick, chevron }) => (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 16px", borderRadius: 16,
      background: t.surface2,
      cursor: onClick ? "pointer" : "default",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = t.surface2)}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
        {children}
      </div>
      {chevron && <span style={{ fontSize: 14, color: t.textMuted, flexShrink: 0 }}>›</span>}
    </div>
  );

  // ── ADD MANUAL TX MODAL ─────────────────────────────────────────────────────
  const AddModal = () => {
    const [type, setType] = useState("gasto");
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [selCat, setSelCat] = useState(CATEGORIES[0]);
    const [showCatGrid, setShowCatGrid] = useState(false);

    const accentColor = type === "gasto" ? t.negative : t.positive;

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end",
      }} onClick={() => setShowAdd(false)}>
        <div onClick={e => e.stopPropagation()} style={{
          width: "100%", maxWidth: 420, margin: "0 auto",
          background: t.surface, borderRadius: "28px 28px 0 0",
          padding: "20px 20px 40px",
        }}>
          <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 20px" }} />

          {/* ── Importe prominente ── */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            {/* Toggle gasto / ingreso */}
            <div style={{ display: "inline-flex", background: t.surface2, borderRadius: 20, padding: 3, marginBottom: 16 }}>
              {["gasto", "ingreso"].map(tp => (
                <button key={tp} onClick={() => setType(tp)} style={{
                  padding: "6px 20px", borderRadius: 20, border: "none",
                  background: type === tp ? (tp === "gasto" ? t.negative : t.positive) : "transparent",
                  color: type === tp ? "white" : t.textMuted,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  textTransform: "capitalize", transition: "all 0.2s",
                }}>{tp}</button>
              ))}
            </div>
            {/* Importe */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                type="number"
                autoFocus
                style={{
                  fontSize: 48, fontWeight: 800, letterSpacing: -2,
                  color: amount ? accentColor : t.textMuted,
                  background: "transparent", border: "none", outline: "none",
                  width: 180, textAlign: "right", fontFamily: "inherit",
                  caretColor: accentColor,
                }}
              />
              <span style={{ fontSize: 28, fontWeight: 700, color: amount ? accentColor : t.textMuted }}>€</span>
            </div>
          </div>

          {/* ── Campos ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>

            {/* Descripción */}
            <FieldRow label="Descripción"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>}
            >
              <input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Ej: Café con Juan"
                style={{
                  background: "transparent", border: "none", outline: "none",
                  fontSize: 14, fontWeight: 600, color: t.text,
                  width: "100%", fontFamily: "inherit",
                }}
              />
            </FieldRow>

            {/* Fecha */}
            <FieldRow label="Fecha"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            >
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  fontSize: 14, fontWeight: 600, color: t.text,
                  width: "100%", fontFamily: "inherit",
                }}
              />
            </FieldRow>

            {/* Cuenta */}
            <FieldRow label="Cuenta"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>Manual</span>
            </FieldRow>

            {/* Categoría */}
            <FieldRow label="Categoría" chevron
              onClick={() => setShowCatGrid(g => !g)}
              icon={
                <div style={{ width: 34, height: 34, borderRadius: 10, background: selCat.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon d={selCat.icon} size={16} stroke={selCat.color} />
                </div>
              }
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{selCat.name}</span>
            </FieldRow>

            {/* Category grid */}
            {showCatGrid && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {CATEGORIES.filter(c => type === "ingreso" ? c.id === "ingresos" || c.id === "otros" : c.id !== "ingresos").map(cat => (
                  <button key={cat.id} onClick={() => { setSelCat(cat); setShowCatGrid(false); }} style={{
                    padding: "12px 8px", borderRadius: 12,
                    border: selCat.id === cat.id ? `2px solid ${cat.color}` : `1px solid ${t.border}`,
                    background: selCat.id === cat.id ? cat.color + "15" : t.surface2,
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon d={cat.icon} size={15} stroke={cat.color} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: t.text, textAlign: "center" }}>{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Guardar ── */}
          <button style={{
            width: "100%", border: "none", borderRadius: 16, padding: "15px",
            background: amount ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` : t.surface2,
            color: amount ? "white" : t.textMuted,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: amount ? `0 8px 24px ${accentColor}44` : "none",
          }}>
            Guardar movimiento
          </button>
        </div>
      </div>
    );
  };

  // ── TX DETAIL MODAL ─────────────────────────────────────────────────────────
  const TxDetail = ({ tx }) => {
    const effCat = getTxCategory(tx);
    const wasReassigned = !!txCategories[tx.id];
    const [confirmDelete, setConfirmDelete] = useState(false);
    const dateStr = tx.dateObj
      ? new Date(tx.dateObj).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : tx.date || "";

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end",
      }} onClick={() => setSelectedTx(null)}>
        <div onClick={e => e.stopPropagation()} style={{
          width: "100%", maxWidth: 420, margin: "0 auto",
          background: t.surface, borderRadius: "28px 28px 0 0",
          padding: "20px 20px 36px",
        }}>
          <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 20px" }} />

          {/* ── Importe prominente ── */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: effCat.color + "20",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <Icon d={effCat.icon} size={26} stroke={effCat.color} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 4 }}>{tx.desc}</div>
            <div style={{
              fontSize: 44, fontWeight: 800, letterSpacing: -2,
              color: tx.amount > 0 ? t.positive : t.text, lineHeight: 1,
            }}>
              {tx.amount > 0 ? "+" : ""}{fmt(tx.amount, 2)} €
            </div>
          </div>

          {/* ── Campos ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>

            {/* Fecha */}
            <FieldRow label="Fecha"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text, textTransform: "capitalize" }}>{dateStr}</span>
            </FieldRow>

            {/* Cuenta */}
            <FieldRow label="Cuenta"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>BBVA •••• 4521</span>
            </FieldRow>

            {/* Categoría — editable */}
            <FieldRow label="Categoría" chevron
              onClick={() => { setCatPickerTx(tx); setShowCatPicker(true); }}
              icon={
                <div style={{ width: 34, height: 34, borderRadius: 10, background: effCat.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon d={effCat.icon} size={16} stroke={effCat.color} />
                </div>
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{effCat.name}</span>
                {wasReassigned && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: t.accent, background: t.accentLight, padding: "1px 6px", borderRadius: 8 }}>EDITADA</span>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ── Acciones ── */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{
              width: "100%", background: "transparent",
              border: `1.5px solid ${dark ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 16, padding: "13px", color: t.negative,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
              Eliminar movimiento
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: t.textMuted, textAlign: "center", marginBottom: 4 }}>
                ¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmDelete(false)} style={{
                  flex: 1, background: t.surface2, border: "none",
                  borderRadius: 14, padding: "13px", color: t.text,
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>Cancelar</button>
                <button onClick={() => setSelectedTx(null)} style={{
                  flex: 1, background: t.negative, border: "none",
                  borderRadius: 14, padding: "13px", color: "white",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>Sí, eliminar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── ONBOARDING SCREEN ───────────────────────────────────────────────────────
  const OnboardingScreen = () => (
    <div style={{
      minHeight: "100vh", background: t.bg, padding: "60px 24px 40px",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        {/* Hero icon */}
        <div style={{
          width: 96, height: 96, margin: "0 auto 28px",
          borderRadius: 28,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 20px 60px rgba(99,102,241,0.4)",
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
        </div>

        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, marginBottom: 10, letterSpacing: -0.5 }}>
          Bienvenido a tus finanzas
        </div>
        <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 40, lineHeight: 1.5, padding: "0 12px" }}>
          Conecta tus cuentas y empieza a entender en qué se va tu dinero. Privado, seguro y bajo tu control.
        </div>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40, textAlign: "left" }}>
          {[
            { icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", title: "Conexión bancaria PSD2", desc: "Vía Open Banking, lectura segura" },
            { icon: "M18 20V10M12 20V4M6 20v-6", title: "Análisis automático", desc: "Categorías, tendencias y comparativas" },
            { icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", title: "Todo en un solo sitio", desc: "Cuentas, tarjetas, Edenred y más" },
          ].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", borderRadius: 16,
              background: t.surface, border: `1px solid ${t.border}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: t.accentLight, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon}/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setHasOnboarded(true)} style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none", borderRadius: 16, padding: "16px",
          color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 10px 30px rgba(99,102,241,0.35)",
        }}>
          Conectar mi primer banco
        </button>
        <button onClick={() => setHasOnboarded(true)} style={{
          background: "transparent", border: "none",
          padding: "10px", color: t.textMuted, fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}>
          Empezar con datos de ejemplo
        </button>
      </div>
    </div>
  );

  // ── CATEGORY PICKER BOTTOM SHEET ────────────────────────────────────────────
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [catPickerTx, setCatPickerTx] = useState(null);

  const reassignCategory = (txId, newCategoryName) => {
    setTxCategories(prev => ({ ...prev, [txId]: newCategoryName }));
    setShowCatPicker(false);
    setCatPickerTx(null);
  };

  // Get the effective category for a tx (custom or original)
  const getTxCategory = (tx) => {
    const customName = txCategories[tx.id];
    if (customName) {
      const cat = findCategory(customName);
      return { name: customName, color: cat.color, icon: cat.icon };
    }
    return { name: tx.category, color: tx.color, icon: tx.icon };
  };

  const CategoryPicker = () => (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end",
    }} onClick={() => { setShowCatPicker(false); setCatPickerTx(null); }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420, margin: "0 auto",
        background: t.surface, borderRadius: "28px 28px 0 0",
        padding: "20px 20px 40px",
      }}>
        <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 4 }}>
          Cambiar categoría
        </div>
        {catPickerTx && (
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16 }}>{catPickerTx.desc}</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {CATEGORIES.map(cat => {
            const isCurrent = catPickerTx && getTxCategory(catPickerTx).name === cat.name;
            return (
              <button key={cat.id}
                onClick={() => catPickerTx && reassignCategory(catPickerTx.id, cat.name)}
                style={{
                  padding: "14px 8px", borderRadius: 14,
                  border: isCurrent ? `2px solid ${cat.color}` : `1px solid ${t.border}`,
                  background: isCurrent ? cat.color + "18" : t.surface2,
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: cat.color + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon d={cat.icon} size={18} stroke={cat.color} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.text, textAlign: "center" }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── CATEGORY DETAIL SCREEN ──────────────────────────────────────────────────
  const CategoryDetailScreen = ({ cat }) => {
    // Build last 6 periods of data for this category based on gran
    const gran = cat.gran || "mes";
    const PERIOD_LABELS = {
      semana: ["S21","S22","S23","S24","S25","S26"],
      mes:    ["Nov'24","Dic'24","Ene","Feb","Mar","Abr"],
      trimestre: ["Q3'23","Q4'23","Q1'24","Q2'24","Q1'25","Q2'25"],
      año:    ["2020","2021","2022","2023","2024","2025"],
    };
    // Mock per-period spending for this category (random-ish but stable)
    const seed = cat.name.length;
    const catBarData = (PERIOD_LABELS[gran] || PERIOD_LABELS.mes).map((label, i) => ({
      label,
      value: Math.round(60 + ((seed * 17 + i * 43) % 180)),
      isCurrent: i === 5,
    }));

    const [selectedBarIdx, setSelectedBarIdx] = useState(5); // default = current
    const selectedBar = catBarData[selectedBarIdx];
    const maxVal = Math.max(...catBarData.map(d => d.value));
    const BAR_H = 80;

    // Filter transactions by category
    const allTxs = mockTransactions.filter(tx => getTxCategory(tx).name === cat.name);
    // In a real app, also filter by the selected bar's period. Here we show all.
    const txs = allTxs;
    const total = txs.reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const periodTotal = selectedBar.value;

    // Group transactions by day
    const TODAY = "2025-04-30";
    const YESTERDAY = "2025-04-29";
    const MONTHS_D = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const formatDayLabel = (dateStr) => {
      if (dateStr === TODAY) return "Hoy";
      if (dateStr === YESTERDAY) return "Ayer";
      const [y, m, d] = dateStr.split("-");
      return `${parseInt(d)} ${MONTHS_D[parseInt(m) - 1]} ${y}`;
    };

    const groups = txs.reduce((acc, tx) => {
      const key = tx.dateObj;
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {});
    const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    // Shared GranPicker for category detail
    const CatGranPicker = () => {
      const options = [
        { id: "semana",    label: "Semana",    sub: `Sem ${curWeek} de ${MONTHS_FULL[curMonth]}` },
        { id: "mes",       label: "Mes",        sub: `${MONTHS_FULL[curMonth]} ${curYear}` },
        { id: "trimestre", label: "Trimestre",  sub: `${qLabels[curQuarter]} · ${qRanges[curQuarter]} ${curYear}` },
        { id: "año",       label: "Año",        sub: `${curYear}` },
      ];
      return (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end",
        }} onClick={() => setShowPicker(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 420, margin: "0 auto",
            background: t.surface, borderRadius: "28px 28px 0 0",
            padding: "20px 20px 40px",
          }}>
            <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 16, textAlign: "center" }}>
              Ver por período
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {options.map(o => (
                <button key={o.id} onClick={() => { handleSetGran(o.id); setSelectedBarIdx(5); }} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 16, border: "none", cursor: "pointer",
                  background: gran === o.id ? t.accentLight : t.surface2,
                  borderLeft: gran === o.id ? `3px solid ${t.accent}` : `3px solid transparent`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: gran === o.id ? t.accent : t.text }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{o.sub}</div>
                  </div>
                  {gran === o.id && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div>
        {/* ── Sticky header with back + period selector ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: dark ? "rgba(15,15,20,0.92)" : "rgba(245,245,247,0.92)",
          backdropFilter: "blur(16px)",
          padding: "52px 16px 14px",
          borderBottom: `1px solid ${t.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Left: back + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              <button onClick={navigateBack} style={{
                width: 34, height: 34, borderRadius: 10, border: "none",
                background: t.surface2, cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", color: t.text,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: cat.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon d={cat.icon} size={15} stroke={cat.color} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.name}</span>
              </div>
            </div>
            {/* Right: period selector */}
            <button onClick={() => setShowPicker(true)} style={{
              background: t.accentLight, border: `1px solid ${t.accent}44`,
              borderRadius: 20, padding: "5px 10px 5px 8px", flexShrink: 0, marginLeft: 8,
              display: "flex", alignItems: "center", gap: 4,
              cursor: "pointer", color: t.accent,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{periodLabels[gran]}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
            </button>
          </div>
          {/* Subtitle */}
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, paddingLeft: 44 }}>
            {txs.length} movimientos · <span style={{ fontWeight: 700, color: cat.color }}>{fmt(total, 2)} €</span>
          </div>
        </div>

        <div style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...styles.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Evolución</div>
              <div style={{ fontSize: 12, color: t.textMuted, textTransform: "capitalize" }}>{gran}</div>
            </div>

            {/* Selected period KPI */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: cat.color, letterSpacing: -1 }}>
                {fmt(periodTotal)} €
              </span>
              <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 6 }}>
                en {selectedBar.label}
              </span>
            </div>

            {/* Bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: BAR_H + 20 }}>
              {catBarData.map((d, i) => {
                const isSel = i === selectedBarIdx;
                const pct = Math.max(0.06, d.value / maxVal);
                return (
                  <div key={i} onClick={() => setSelectedBarIdx(i)} style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 4, cursor: "pointer",
                    opacity: isSel ? 1 : 0.4, transition: "opacity 0.2s",
                  }}>
                    <div style={{
                      width: "100%", height: `${pct * BAR_H}px`,
                      borderRadius: "6px 6px 0 0",
                      background: isSel
                        ? `linear-gradient(180deg, ${cat.color}dd, ${cat.color})`
                        : cat.color + "88",
                      transition: "height 0.4s ease, background 0.2s",
                      boxShadow: isSel ? `0 4px 16px ${cat.color}44` : "none",
                    }} />
                    <span style={{
                      fontSize: 9, fontFamily: "inherit",
                      fontWeight: isSel ? 700 : 400,
                      color: isSel
                        ? (dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)")
                        : (dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"),
                      whiteSpace: "nowrap",
                    }}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Lista de movimientos agrupada por día ── */}
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Movimientos</div>

          {sortedDays.length > 0 ? sortedDays.map(day => (
            <div key={day}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted }}>
                  {formatDayLabel(day)}
                </span>
                <span style={{ fontSize: 12, color: t.textMuted }}>
                  {((d) => (d >= 0 ? "+" : "") + fmt(d, 2))(groups[day].reduce((s, tx) => s + tx.amount, 0))} €
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 12 }}>
                {groups[day].map(tx => (
                  <TxRow key={tx.id} tx={tx} t={t}
                    effective={getTxCategory(tx)}
                    onClick={() => setSelectedTx(tx)}
                    swipedId={swipedTxId} onSwipe={setSwipedTxId}
                    onRecategorize={(tx) => { setSwipedTxId(null); setCatPickerTx(tx); setShowCatPicker(true); }}
                  />
                ))}
              </div>
            </div>
          )) : (
            <div style={{
              textAlign: "center", padding: "40px 0",
              color: t.textMuted, fontSize: 13,
            }}>
              No hay movimientos en esta categoría
            </div>
          )}
        </div>

        {showPicker && <CatGranPicker />}
      </div>
    );
  };

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(128,128,128,0.5); }
      `}</style>

      {!hasOnboarded ? (
        <OnboardingScreen />
      ) : (
        <>
          <div style={styles.screenWrap}>
            {screen === "dashboard" && <DashboardScreen />}
            {screen === "transactions" && <TransactionsScreen />}
            {screen === "accounts" && <AccountsScreen />}
            {screen === "analytics" && <AnalyticsScreen />}
            {screen === "category-detail" && drilldownCat && <CategoryDetailScreen cat={drilldownCat} />}
          </div>

          {/* Bottom Nav — hidden on sub-screens */}
          {screen !== "category-detail" && (
          <nav style={styles.nav}>
            {[
              { id: "dashboard", icon: Icons.home, label: "Inicio" },
              { id: "transactions", icon: Icons.list, label: "Movimientos" },
              { id: "accounts", icon: Icons.wallet, label: "Cuentas" },
              { id: "analytics", icon: Icons.chart, label: "Análisis" },
            ].map(item => (
              <div key={item.id} style={styles.navItem(activeTab === item.id)} onClick={() => navigate(item.id)}>
                <div style={{
                  padding: "6px 16px", borderRadius: 12,
                  background: activeTab === item.id ? t.accentLight : "transparent",
                  transition: "background 0.2s",
                }}>
                  <Icon d={item.icon} size={20} stroke="currentColor" />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          )}

          {showAdd && <AddModal />}
          {selectedTx && <TxDetail tx={selectedTx} />}
          {showCatPicker && <CategoryPicker />}
        </>
      )}
    </div>
  );
}

// ─── TX ROW COMPONENT ─────────────────────────────────────────────────────────
function TxRow({ tx, t, onClick, effective, swipedId, onSwipe, onRecategorize }) {
  const cat = effective || { name: tx.category, color: tx.color, icon: tx.icon };
  const isOpen = swipedId === tx.id;
  const startX = React.useRef(null);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx > 60) onSwipe && onSwipe(tx.id);   // swipe right → open
    if (dx < -60) onSwipe && onSwipe(null);    // swipe left → close
    startX.current = null;
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      {/* Swipe action revealed behind */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 16,
        background: t.accent,
        display: "flex", alignItems: "center", paddingLeft: 16,
        opacity: isOpen ? 1 : 0,
        transition: "opacity 0.2s",
        pointerEvents: isOpen ? "auto" : "none",
      }}>
        <button onClick={() => onRecategorize && onRecategorize(tx)} style={{
          background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10,
          padding: "6px 12px", color: "white", fontSize: 12, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Categoría
        </button>
      </div>

      {/* Row content */}
      <div
        onClick={() => { if (isOpen) { onSwipe(null); } else onClick(); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 12px", borderRadius: 16, cursor: "pointer",
          transition: "background 0.15s, transform 0.25s",
          transform: isOpen ? "translateX(80px)" : "translateX(0)",
          background: "transparent",
          position: "relative", zIndex: 1,
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = t.surface2; }}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0,
          background: cat.color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon d={cat.icon} size={18} stroke={cat.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.desc}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: t.textMuted }}>{cat.name}</span>
          </div>
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700, flexShrink: 0,
          color: tx.amount > 0 ? "#22c55e" : t.text,
        }}>
          {tx.amount > 0 ? "+" : ""}{fmt(tx.amount, 2)} €
        </div>
      </div>
    </div>
  );
}
