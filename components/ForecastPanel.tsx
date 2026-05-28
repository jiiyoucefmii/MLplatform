"use client";

import { useState } from "react";
import {
  BrainCircuit, TrendingUp, AlertCircle, Zap, Download, RefreshCw,
} from "lucide-react";
import type { DashboardState, MenuCounts } from "./Dashboard";
import PageLoader from "./PageLoader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── API schemas ───────────────────────────────────────────────────────────────
interface DayResult {
  date:    string;
  horizon: number;
  q10:     number;
  q50:     number;
  q90:     number;
}
interface HistoryPoint {
  date:   string;
  demand: number;
}
interface MealResult {
  meal_type: string;
  forecasts: DayResult[];
  history?:  HistoryPoint[];
  warnings:  string[];
}
interface ForecastResponse {
  canteen_id:         string;
  anchor_date:        string;
  results:            Record<string, MealResult>;
  processing_time_ms: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MEAL_LABELS: Record<string, string> = {
  breakfast: "☕ Petit-déjeuner",
  lunch:     "🍲 Déjeuner",
  dinner:    "🌙 Dîner",
};
const MEAL_COLORS: Record<string, { header: string; row: string; accent: string }> = {
  breakfast: { header: "#fff8e1", row: "#fffde7", accent: "#f9a825" },
  lunch:     { header: "#e8f5e9", row: "#f1f8f1", accent: "#43a047" },
  dinner:    { header: "#ede7f6", row: "#f3effe", accent: "#7b1fa2" },
};
const DOW_ABBR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const dow = DOW_ABBR[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${dow} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function confidenceColor(q10: number, q90: number, q50: number): string {
  if (q50 === 0) return "#bbb";
  const spread = q90 - q10;
  const rel = spread / (q50 || 1);
  if (rel < 0.4) return "#43a047";
  if (rel < 0.8) return "#fb8c00";
  return "#e53935";
}

function buildPayload(state: DashboardState, activeMeals: string[]) {
  // menu_counts per meal
  const menu_counts: Record<string, MenuCounts> = {};
  for (const meal of activeMeals) {
    menu_counts[meal] = state.menuCounts[meal] || {
      n_bread:0, n_protein:0, n_main_dish:0, n_side_dish:0,
      n_soup:0, n_dessert:0, n_drink:0, n_spread:0,
    };
  }

  // calendar_days: same flags repeated 7 times, date injected from weatherDays
  const cal = state.calendar;
  const calendar_days = state.weatherDays.map((w) => ({
    date:                  w.date,
    is_holiday:            cal.isHoliday,
    is_religion_holiday:   cal.isReligionHoliday,
    is_national_holiday:   cal.isNationalHoliday,
    is_international_holiday: false,
    is_day_off:            cal.isDayOff,
    is_vacation:           cal.isVacation,
    is_ramadan:            cal.isRamadan,
    is_exam_period:        cal.isExamPeriod,
    is_midterm_period:     cal.isMidtermPeriod,
    is_final_period:       cal.isFinalPeriod,
    is_week_before_ramadan: cal.isWeekBeforeRamadan,
    is_semester_start:     cal.isSemesterStart,
  }));

  return {
    canteen_id:    state.canteenId,
    meal_types:    activeMeals,
    anchor_date:   state.date,
    weather_days:  state.weatherDays,
    calendar_days,
    menu_counts,
  };
}

function HistoryForecastChart({
  history,
  forecasts,
  meal,
}: {
  history: HistoryPoint[];
  forecasts: DayResult[];
  meal: string;
}) {
  const colors = MEAL_COLORS[meal] || MEAL_COLORS.lunch;
  
  if (!history || history.length === 0) {
    return (
      <div style={{ padding: "12px", fontSize: 11, color: "#888", textAlign: "center", background: "#f8f9fa", borderRadius: 4, border: "1px solid #e9ecef" }}>
        Données historiques insuffisantes pour afficher la tendance du mois passé.
      </div>
    );
  }

  // Combine data to find boundaries
  const allHistoryDemands = history.map((h) => h.demand);
  const allForecastQ50s = forecasts.map((f) => f.q50);
  const allForecastQ90s = forecasts.map((f) => f.q50 + (f.q90 - f.q10) / 2);
  const allForecastQ10s = forecasts.map((f) => Math.max(0, f.q50 - (f.q90 - f.q10) / 2));
  
  const allYValues = [...allHistoryDemands, ...allForecastQ50s, ...allForecastQ90s, ...allForecastQ10s];
  const maxYRaw = allYValues.length > 0 ? Math.max(...allYValues) : 100;
  const maxY = Math.ceil((maxYRaw > 0 ? maxYRaw : 10) * 1.1 / 10) * 10;
  const minY = 0;

  // Chart dimensions
  const width = 800;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;
  
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const totalPoints = history.length + forecasts.length;
  const dx = plotWidth / (totalPoints - 1 || 1);

  // Compute history coordinates
  const historyPoints = history.map((h, i) => {
    const x = paddingLeft + i * dx;
    const y = height - paddingBottom - ((h.demand - minY) / (maxY - minY)) * plotHeight;
    return { x, y, ...h };
  });

  // Compute forecast coordinates
  const forecastPoints = forecasts.map((f, i) => {
    const idx = history.length + i;
    const x = paddingLeft + idx * dx;
    const halfSpread = (f.q90 - f.q10) / 2;
    
    const y = height - paddingBottom - ((f.q50 - minY) / (maxY - minY)) * plotHeight;
    const yMin = height - paddingBottom - ((Math.max(0, f.q50 - halfSpread) - minY) / (maxY - minY)) * plotHeight;
    const yMax = height - paddingBottom - (((f.q50 + halfSpread) - minY) / (maxY - minY)) * plotHeight;
    return { x, y, yMin, yMax, ...f };
  });

  // SVG Paths
  let historyPath = "";
  if (historyPoints.length > 0) {
    historyPath = `M ${historyPoints[0].x} ${historyPoints[0].y} ` + 
      historyPoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  }

  let historyAreaPath = "";
  if (historyPoints.length > 0) {
    historyAreaPath = `${historyPath} L ${historyPoints[historyPoints.length - 1].x} ${height - paddingBottom} L ${historyPoints[0].x} ${height - paddingBottom} Z`;
  }

  let forecastPath = "";
  if (forecastPoints.length > 0 && historyPoints.length > 0) {
    forecastPath = `M ${historyPoints[historyPoints.length - 1].x} ${historyPoints[historyPoints.length - 1].y} ` +
      forecastPoints.map((p) => `L ${p.x} ${p.y}`).join(" ");
  }

  let confidenceAreaPath = "";
  if (forecastPoints.length > 0 && historyPoints.length > 0) {
    const lastHistory = historyPoints[historyPoints.length - 1];
    const topLine = `M ${lastHistory.x} ${lastHistory.y} ` + forecastPoints.map(p => `L ${p.x} ${p.yMax}`).join(" ");
    const bottomLine = forecastPoints.slice().reverse().map(p => `L ${p.x} ${p.yMin}`).join(" ") + ` L ${lastHistory.x} ${lastHistory.y}`;
    confidenceAreaPath = `${topLine} ${bottomLine} Z`;
  }

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const val = minY + p * (maxY - minY);
    const y = height - paddingBottom - p * plotHeight;
    return { y, val };
  });

  const separatorX = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1].x : paddingLeft;

  const formatShortDate = (iso: string) => {
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return iso;
  };

  return (
    <div style={{ border: "1px solid #e9ecef", borderRadius: 4, padding: "10px 14px", background: "#f8f9fa", width: "100%", boxSizing: "border-box" }}>
      {/* Legend & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#495057" }}>
          Tendance des 30 derniers jours vs Prévisions sur 7 jours
        </span>
        <div style={{ display: "flex", gap: 10, fontSize: 9, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 2, background: "#64748b", display: "inline-block" }} />
            Historique
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 2, background: colors.accent, display: "inline-block" }} />
            Prévision (q50)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 6, background: colors.accent, opacity: 0.12, display: "inline-block" }} />
            Marge d&apos;incertitude
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: "100%" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke="#e9ecef"
                strokeWidth={1}
                strokeDasharray={idx === 0 ? "none" : "3,3"}
              />
              <text
                x={paddingLeft - 8}
                y={line.y + 3}
                textAnchor="end"
                style={{ fontSize: 8, fill: "#6c757d", fontFamily: "sans-serif" }}
              >
                {line.val.toFixed(0)}
              </text>
            </g>
          ))}

          {historyAreaPath && (
            <path d={historyAreaPath} fill="rgba(100, 116, 139, 0.05)" stroke="none" />
          )}

          {confidenceAreaPath && (
            <path d={confidenceAreaPath} fill={colors.accent} fillOpacity={0.12} stroke="none" />
          )}

          {historyPath && (
            <path d={historyPath} fill="none" stroke="#64748b" strokeWidth={1.5} />
          )}

          {forecastPath && (
            <path d={forecastPath} fill="none" stroke={colors.accent} strokeWidth={2.0} />
          )}

          {historyPoints.filter((_, i) => i % 4 === 0 || i === historyPoints.length - 1).map((p, i) => (
            <circle key={`hd-${i}`} cx={p.x} cy={p.y} r={2} fill="#64748b" />
          ))}

          {forecastPoints.map((p, i) => (
            <g key={`fd-${i}`}>
              <circle cx={p.x} cy={p.y} r={3} fill={colors.accent} stroke="#fff" strokeWidth={1} />
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                style={{ fontSize: 8, fontWeight: 700, fill: colors.accent, fontFamily: "sans-serif" }}
              >
                {p.q50.toFixed(0)}
              </text>
            </g>
          ))}

          <line
            x1={separatorX}
            y1={paddingTop}
            x2={separatorX}
            y2={height - paddingBottom}
            stroke="#adb5bd"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <text
            x={separatorX}
            y={paddingTop - 4}
            textAnchor="middle"
            style={{ fontSize: 7, fontWeight: 700, fill: "#6c757d", fontFamily: "sans-serif" }}
          >
            Aujourd&apos;hui
          </text>

          {historyPoints.length > 0 && (
            <text
              x={historyPoints[0].x}
              y={height - paddingBottom + 12}
              textAnchor="middle"
              style={{ fontSize: 8, fill: "#6c757d", fontFamily: "sans-serif" }}
            >
              {formatShortDate(historyPoints[0].date)}
            </text>
          )}

          {historyPoints.length > 15 && (
            <text
              x={historyPoints[Math.floor(historyPoints.length / 2)].x}
              y={height - paddingBottom + 12}
              textAnchor="middle"
              style={{ fontSize: 8, fill: "#6c757d", fontFamily: "sans-serif" }}
            >
              {formatShortDate(historyPoints[Math.floor(historyPoints.length / 2)].date)}
            </text>
          )}

          {historyPoints.length > 0 && (
            <text
              x={separatorX}
              y={height - paddingBottom + 12}
              textAnchor="middle"
              style={{ fontSize: 8, fontWeight: 700, fill: "#495057", fontFamily: "sans-serif" }}
            >
              {formatShortDate(history[history.length - 1].date)}
            </text>
          )}

          {forecastPoints.length > 0 && (
            <text
              x={forecastPoints[forecastPoints.length - 1].x}
              y={height - paddingBottom + 12}
              textAnchor="middle"
              style={{ fontSize: 8, fontWeight: 700, fill: colors.accent, fontFamily: "sans-serif" }}
            >
              {formatShortDate(forecastPoints[forecastPoints.length - 1].date)}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

// ── Meal result table ─────────────────────────────────────────────────────────
function MealForecastTable({ meal, result }: { meal: string; result: MealResult }) {
  const colors = MEAL_COLORS[meal] || MEAL_COLORS.lunch;
  const totalForecasted = result.forecasts.reduce((s, d) => s + d.q50, 0);

  return (
    <div style={{
      border: "1px solid #dee2e6", borderRadius: 4, overflow: "hidden",
      width: "100%",
    }}>
      {/* Header */}
      <div style={{
        background: colors.header, padding: "8px 14px",
        borderBottom: "1px solid #dee2e6",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>
          {MEAL_LABELS[meal] || meal}
        </span>
        <span style={{ fontSize: 11, color: "#666" }}>
          Total 7j: <strong style={{ color: colors.accent }}>{Math.round(totalForecasted)}</strong> repas (q50)
        </span>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{ background: "#fff8e1", padding: "5px 12px", fontSize: 10, color: "#856404", borderBottom: "1px solid #ffe082" }}>
          ⚠ {result.warnings.slice(0, 2).join(" · ")}
          {result.warnings.length > 2 && ` (+${result.warnings.length - 2} autres)`}
        </div>
      )}

      {/* Content Container */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14, backgroundColor: "#fff" }}>
        {/* SVG History and Forecast Chart */}
        <HistoryForecastChart history={result.history || []} forecasts={result.forecasts} meal={meal} />

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#f1f1f1" }}>
            <th style={thStyle}>Date</th>
            <th style={{ ...thStyle, color: "#1565c0" }}>Minimale attendue</th>
            <th style={{ ...thStyle, color: "#2e7d32", fontWeight: 800, fontSize: 12 }}>Le plus probable</th>
            <th style={{ ...thStyle, color: "#b71c1c" }}>Maximale attendue</th>
            <th style={thStyle}>Marge (±)</th>
            <th style={thStyle}>Confiance</th>
          </tr>
        </thead>
        <tbody>
          {result.forecasts.map((d, i) => {
            const spread = d.q90 - d.q10;
            const halfSpread = spread / 2;
            const lowerBound = Math.max(0, d.q50 - halfSpread);
            const upperBound = d.q50 + halfSpread;
            const rel = spread / (d.q50 || 1);
            const confPercent = Math.max(5, Math.min(99, Math.round((1 - (rel / 2)) * 100)));
            const confColor = confidenceColor(d.q10, d.q90, d.q50);
            
            const isWeekend = (() => {
              const dt = new Date(d.date + "T00:00:00");
              const day = dt.getDay();
              return day === 0 || day === 5 || day === 6;
            })();
            return (
              <tr key={d.date} style={{
                background: i % 2 === 0 ? "#ffffff" : colors.row,
                borderBottom: "1px solid #eeeeee",
              }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: isWeekend ? "#2e7d32" : "#333" }}>
                  {formatDate(d.date)}
                  {isWeekend && <span style={{ marginLeft: 3, fontSize: 9, background: "#e8f5e9", color: "#2e7d32", borderRadius: 2, padding: "1px 3px" }}>WE</span>}
                </td>
                <td style={{ ...tdStyle, color: "#1565c0" }}>{lowerBound.toFixed(0)}</td>
                <td style={{ ...tdStyle, fontWeight: 800, fontSize: 13, color: "#1b5e20" }}>{d.q50.toFixed(0)}</td>
                <td style={{ ...tdStyle, color: "#b71c1c" }}>{upperBound.toFixed(0)}</td>
                <td style={{ ...tdStyle, color: "#555" }}>±{halfSpread.toFixed(0)}</td>
                <td style={{ ...tdStyle }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8,
                    borderRadius: "50%", background: confColor, marginRight: 4,
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>
                    {confPercent}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f9f9f9", borderTop: "2px solid #dee2e6" }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>TOTAL 7j</td>
            <td style={{ ...tdStyle, fontWeight: 600, color: "#1565c0" }}>
              {result.forecasts.reduce((s, d) => s + Math.max(0, d.q50 - (d.q90 - d.q10) / 2), 0).toFixed(0)}
            </td>
            <td style={{ ...tdStyle, fontWeight: 800, color: "#1b5e20", fontSize: 12 }}>
              {result.forecasts.reduce((s, d) => s + d.q50, 0).toFixed(0)}
            </td>
            <td style={{ ...tdStyle, fontWeight: 600, color: "#b71c1c" }}>
              {result.forecasts.reduce((s, d) => s + (d.q50 + (d.q90 - d.q10) / 2), 0).toFixed(0)}
            </td>
            <td style={{ ...tdStyle, fontWeight: 600, color: "#555" }}>
              ±{result.forecasts.reduce((s, d) => s + (d.q90 - d.q10) / 2, 0).toFixed(0)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      </div>

      {/* Meal note */}
      {meal === "breakfast" && (
        <div style={{ background: "#fff3e0", padding: "5px 12px", fontSize: 10, color: "#e65100", borderTop: "1px solid #ffe0b2" }}>
          Note: ~32% des jours de petit-déjeuner ont demande = 0 dans les données d&#39;entraînement.
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface ForecastPanelProps {
  state:       DashboardState;
  activeMeals: string[];
}

export default function ForecastPanel({ state, activeMeals }: ForecastPanelProps) {
  const [loading,   setLoading]   = useState(false);
  const [response,  setResponse]  = useState<ForecastResponse | null>(null);
  const [error,     setError]     = useState("");

  const getSelectedCount = (meal: string) => {
    const selected = state.selectedMenuItems[meal] || {};
    return Object.values(selected).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  };

  const validationErrors: string[] = [];
  if (activeMeals.includes("breakfast")) {
    const count = getSelectedCount("breakfast");
    if (count < 3) {
      validationErrors.push(`Petit-déjeuner : au moins 3 articles requis (actuel : ${count})`);
    }
  }
  if (activeMeals.includes("lunch")) {
    const count = getSelectedCount("lunch");
    if (count < 5) {
      validationErrors.push(`Déjeuner : au moins 5 articles requis (actuel : ${count})`);
    }
  }
  if (activeMeals.includes("dinner")) {
    const count = getSelectedCount("dinner");
    if (count < 5) {
      validationErrors.push(`Dîner : au moins 5 articles requis (actuel : ${count})`);
    }
  }

  const isMenuValid = validationErrors.length === 0;
  const canRun = !!state.canteenId && state.weatherDays.length === 7 && isMenuValid;

  async function runForecast() {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const payload = buildPayload(state, activeMeals);
      const res = await fetch(`${API_BASE}/api/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }
      setResponse(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!response) return;
    const rows = ["Repas,Date,Horizon,Q10,Q50,Q90"];
    for (const [meal, result] of Object.entries(response.results)) {
      for (const d of result.forecasts) {
        rows.push(`${meal},${d.date},${d.horizon},${d.q10.toFixed(1)},${d.q50.toFixed(1)},${d.q90.toFixed(1)}`);
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `forecast_${state.canteenId}_${state.date}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      {loading && <PageLoader message="Calcul des prévisions en cours…" />}
      <div className="panel">
        <div className="section-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrainCircuit size={13} />
          <span style={{ flex: 1 }}>Prévision de Demande — 7 Jours · Quantiles Q10/Q50/Q90</span>
          {response && (
            <span style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>
              Calculé en {response.processing_time_ms.toFixed(0)} ms
            </span>
          )}
        </div>

        <div style={{ padding: "14px 16px" }}>

          {/* ── Run button area ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <button
              id="run-forecast-btn"
              type="button"
              onClick={runForecast}
              disabled={!canRun || loading}
              style={{
                padding: "9px 22px", fontSize: 13, fontWeight: 700,
                background: canRun ? "linear-gradient(135deg, #43a047, #2e7d32)" : "#ccc",
                color: "#fff", border: "none", borderRadius: 4,
                cursor: canRun ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: canRun ? "0 2px 6px rgba(46,125,50,0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              <Zap size={15} />
              Calculer les Prévisions
            </button>

            {response && (
              <>
                <button
                  type="button"
                  onClick={runForecast}
                  style={{
                    padding: "8px 14px", fontSize: 12, fontWeight: 600,
                    background: "#f5f5f5", color: "#444",
                    border: "1px solid #ccc", borderRadius: 4, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <RefreshCw size={12} /> Recalculer
                </button>
                <button
                  type="button"
                  onClick={exportCSV}
                  style={{
                    padding: "8px 14px", fontSize: 12, fontWeight: 600,
                    background: "#e8f5e9", color: "#2e7d32",
                    border: "1px solid #c8e6c9", borderRadius: 4, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Download size={12} /> Exporter CSV
                </button>
              </>
            )}

            {!canRun && !state.canteenId && (
              <span style={{ fontSize: 12, color: "#888" }}>
                <AlertCircle size={12} style={{ verticalAlign: "middle" }} /> Sélectionnez une cantine pour lancer la prévision
              </span>
            )}

            {!isMenuValid && state.canteenId && (
              <span style={{ fontSize: 12, color: "#d32f2f", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{validationErrors.join(" · ")}</span>
              </span>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 3,
              padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#856404",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Erreur:</strong> {error}</span>
            </div>
          )}

          {/* ── Results ── */}
          {response && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {activeMeals.map((meal) => {
                const result = response.results[meal];
                if (!result) return (
                  <div key={meal} style={{ width: "100%", padding: 20, background: "#fff3cd", borderRadius: 4, fontSize: 12, color: "#856404" }}>
                    Aucun résultat pour <strong>{meal}</strong>
                  </div>
                );
                return <MealForecastTable key={meal} meal={meal} result={result} />;
              })}
            </div>
          )}

          {/* ── Placeholder ── */}
          {!response && !error && (
            <div style={{
              textAlign: "center", padding: "32px 20px",
              color: "#bbb", fontSize: 13,
            }}>
              <TrendingUp size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>Sélectionnez une cantine, configurez les paramètres,</div>
              <div>puis cliquez sur <strong style={{ color: "#43a047" }}>Calculer les Prévisions</strong></div>
              <div style={{ marginTop: 8, fontSize: 11 }}>
                Modèles: LightGBM 63 quantiles (Q10/Q50/Q90) · 7 horizons × 3 repas × 3 quantiles
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Table styles ──────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "7px 10px", textAlign: "center", fontSize: 10,
  fontWeight: 700, color: "#555", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "6px 10px", textAlign: "center", verticalAlign: "middle",
};
