"use client";

import { Cloud, Thermometer, BookOpen, RefreshCw, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import type { WeatherDay } from "./Dashboard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Calendar types ────────────────────────────────────────────────────────────
export interface CalendarState {
  isHoliday:           boolean;
  isReligionHoliday:   boolean;
  isNationalHoliday:   boolean;
  isVacation:          boolean;
  isRamadan:           boolean;
  isExamPeriod:        boolean;
  isMidtermPeriod:     boolean;
  isFinalPeriod:       boolean;
  isWeekBeforeRamadan: boolean;
  isSemesterStart:     boolean;
  isDayOff:            boolean;
}

export const DEFAULT_CALENDAR: CalendarState = {
  isHoliday: false, isReligionHoliday: false, isNationalHoliday: false,
  isVacation: false, isRamadan: false, isExamPeriod: false,
  isMidtermPeriod: false, isFinalPeriod: false,
  isWeekBeforeRamadan: false, isSemesterStart: false, isDayOff: false,
};

// ── WMO code → label mapping ──────────────────────────────────────────────────
const WMO_LABELS: Record<number, string> = {
  0: "☀️ Clair", 1: "🌤 Surtout clair", 2: "⛅ Partiellement nuageux",
  3: "☁️ Couvert", 45: "🌫 Brouillard", 48: "🌫 Brouillard givrant",
  51: "🌦 Bruine légère", 53: "🌦 Bruine modérée", 55: "🌦 Bruine dense",
  61: "🌧 Pluie légère", 63: "🌧 Pluie modérée", 65: "🌧 Pluie forte",
  71: "❄️ Neige légère", 73: "❄️ Neige modérée", 75: "❄️ Neige forte",
  80: "🌨 Averses légères", 81: "🌨 Averses modérées", 82: "🌨 Averses fortes",
  85: "🌨 Averses neige légères", 86: "🌨 Averses neige fortes",
  95: "⛈ Orage", 96: "⛈ Orage avec grêle", 99: "⛈ Orage fort avec grêle",
};

// ── Day-of-week abbreviations ─────────────────────────────────────────────────
const DOW_ABBR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ── Props ─────────────────────────────────────────────────────────────────────
interface EnvironmentalControlsProps {
  canteenId:            string;
  wilayaNum:            number;
  anchorDate:           string;
  weatherDays:          WeatherDay[];
  weatherAutoFetch:     boolean;
  calendar:             CalendarState;
  onWeatherDaysChange:       (days: WeatherDay[]) => void;
  onWeatherAutoFetchChange:  (v: boolean) => void;
  onCalendarChange:          (c: CalendarState) => void;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: () => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <label className="toggle-switch" style={{ marginBottom: 0 }}>
        <input id={id} type="checkbox" checked={checked} onChange={onChange} />
        <span className="toggle-slider" />
      </label>
      <label htmlFor={id} style={{ fontSize: 12, color: "#444", cursor: "pointer" }}>{label}</label>
    </div>
  );
}

function SubHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 11, fontWeight: 700, color: "#555",
      textTransform: "uppercase", letterSpacing: "0.05em",
      marginBottom: 10, marginTop: 2,
    }}>
      {icon}<span>{label}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EnvironmentalControls({
  canteenId, wilayaNum, anchorDate,
  weatherDays, weatherAutoFetch, calendar,
  onWeatherDaysChange, onWeatherAutoFetchChange, onCalendarChange,
}: EnvironmentalControlsProps) {
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Auto-fetch when canteen / anchor date changes and auto-fetch is enabled
  useEffect(() => {
    if (!weatherAutoFetch || !canteenId || !anchorDate) return;
    triggerFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canteenId, anchorDate, weatherAutoFetch]);

  async function triggerFetch() {
    if (!canteenId) { setFetchError("Sélectionnez d'abord une cantine."); return; }
    setFetching(true);
    setFetchError("");
    try {
      // start_date = anchorDate + 1 (first forecast day)
      const d = new Date(anchorDate + "T00:00:00");
      d.setDate(d.getDate() + 1);
      const startDate = d.toISOString().split("T")[0];

      const res = await fetch(
        `${API_BASE}/api/weather?canteen_id=${encodeURIComponent(canteenId)}&start_date=${startDate}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WeatherDay[] = await res.json();
      onWeatherDaysChange(data);
    } catch (e: unknown) {
      setFetchError(`Échec de récupération météo: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFetching(false);
    }
  }

  function updateDay(idx: number, field: keyof WeatherDay, value: number | string | null) {
    const next = weatherDays.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    onWeatherDaysChange(next);
  }

  function updateCal(field: keyof CalendarState, value: boolean) {
    onCalendarChange({ ...calendar, [field]: value });
  }

  // Compute forecast date labels
  const forecastDates = weatherDays.map((d) => {
    const dt = new Date(d.date + "T00:00:00");
    return { dateStr: d.date, dow: DOW_ABBR[dt.getDay() === 0 ? 6 : dt.getDay() - 1], day: dt.getDate() };
  });

  return (
    <div className="panel">
      <div className="section-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Cloud size={13} />
        <span style={{ flex: 1 }}>Conditions Environnementales &amp; Calendrier</span>
        {/* Auto-fetch toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400, fontSize: 12 }}>
          <span style={{ color: "#666" }}>Météo auto (Open-Meteo)</span>
          <label className="toggle-switch">
            <input
              id="weather-auto-fetch"
              type="checkbox"
              checked={weatherAutoFetch}
              onChange={() => onWeatherAutoFetchChange(!weatherAutoFetch)}
            />
            <span className="toggle-slider" />
          </label>
          <button
            type="button"
            onClick={triggerFetch}
            disabled={fetching || !canteenId}
            style={{
              border: "1px solid #aaa", borderRadius: 3, background: "#f5f5f5",
              cursor: canteenId ? "pointer" : "not-allowed", padding: "3px 8px",
              fontSize: 11, display: "flex", alignItems: "center", gap: 4,
              color: "#444", opacity: canteenId ? 1 : 0.5,
            }}
          >
            <RefreshCw size={11} style={{ animation: fetching ? "spin 1s linear infinite" : "none" }} />
            {fetching ? "…" : "Actualiser"}
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 16px" }}>
        {fetchError && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 3, padding: "6px 10px", fontSize: 11, color: "#856404", marginBottom: 10 }}>
            ⚠ {fetchError}
          </div>
        )}

        {/* ── 7-day weather table ─────────────────────────────────────────── */}
        <SubHeader icon={<Thermometer size={12} />} label="Prévisions Météo 7 Jours (J+1 → J+7)" />

        <div style={{ overflowX: "auto", marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#f0f4f8" }}>
                <th style={th}>Jour</th>
                <th style={th}>🌡 Max</th>
                <th style={th}>🌡 Min</th>
                <th style={th}>💧 Précip</th>
                <th style={th}>💦 Humidité</th>
                <th style={th}>💨 Vent</th>
                <th style={th}>☀ Sunshine (h)</th>
                <th style={th}>Conditions</th>
              </tr>
            </thead>
            <tbody>
              {weatherDays.map((day, idx) => {
                const label = forecastDates[idx];
                const isWeekend = label ? (label.dow === "Sam" || label.dow === "Dim") : false;
                return (
                  <tr key={day.date} style={{ background: isWeekend ? "#fafff8" : "#ffffff", borderBottom: "1px solid #eeeeee" }}>
                    <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>
                      <span style={{ color: isWeekend ? "#2e7d32" : "#444" }}>
                        {label ? `${label.dow} ${label.day}` : `J+${idx+1}`}
                      </span>
                    </td>
                    {/* temp_max */}
                    <td style={td}>
                      <NumInput value={day.temp_max} min={-10} max={55} unit="°C"
                        onChange={(v) => updateDay(idx, "temp_max", v)} disabled={weatherAutoFetch} />
                    </td>
                    {/* temp_min */}
                    <td style={td}>
                      <NumInput value={day.temp_min} min={-10} max={50} unit="°C"
                        onChange={(v) => updateDay(idx, "temp_min", v)} disabled={weatherAutoFetch} />
                    </td>
                    {/* precip */}
                    <td style={td}>
                      <NumInput value={day.precip} min={0} max={200} unit="mm"
                        onChange={(v) => updateDay(idx, "precip", v)} disabled={weatherAutoFetch} />
                    </td>
                    {/* humidity */}
                    <td style={td}>
                      <NumInput value={day.humidity} min={0} max={100} unit="%"
                        onChange={(v) => updateDay(idx, "humidity", v)} disabled={weatherAutoFetch} />
                    </td>
                    {/* windspeed */}
                    <td style={td}>
                      <NumInput value={day.windspeed} min={0} max={150} unit="km/h"
                        onChange={(v) => updateDay(idx, "windspeed", v)} disabled={weatherAutoFetch} />
                    </td>
                    {/* sunshine_s → display as hours */}
                    <td style={td}>
                      <NumInput
                        value={day.sunshine_s === null || day.sunshine_s === undefined ? null : Math.round(day.sunshine_s / 3600 * 10) / 10}
                        min={0} max={14} unit="h"
                        onChange={(v) => updateDay(idx, "sunshine_s", v === null ? null : v * 3600)}
                        step={0.5}
                        disabled={weatherAutoFetch}
                      />
                    </td>
                    {/* weather_code */}
                    <td style={td}>
                      {weatherAutoFetch ? (
                        <span style={{ fontSize: 11, color: "#555" }}>
                          {day.weather_code !== null && day.weather_code !== undefined ? (WMO_LABELS[day.weather_code] ?? `Code ${day.weather_code}`) : "Inconnu"}
                        </span>
                      ) : (
                        <select
                          value={day.weather_code === null || day.weather_code === undefined ? "" : day.weather_code}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDay(idx, "weather_code", val === "" ? null : parseInt(val, 10));
                          }}
                          style={{ fontSize: 11, border: "1px solid #ccc", borderRadius: 2, padding: "2px 4px" }}
                        >
                          <option value="">— Inconnu —</option>
                          {Object.entries(WMO_LABELS).map(([code, label]) => (
                            <option key={code} value={code}>{label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {weatherAutoFetch && (
          <p style={{ fontSize: 10, color: "#666", marginTop: -6, marginBottom: 12 }}>
            <Zap size={10} style={{ verticalAlign: "middle" }} /> Données auto-récupérées depuis Open-Meteo pour la wilaya {wilayaNum || "—"}.
            Désactivez l&#39;auto pour modifier manuellement.
          </p>
        )}

        {/* ── Calendar flags ──────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid #eeeeee", paddingTop: 12 }}>
          <SubHeader icon={<BookOpen size={12} />} label="Calendrier Académique &amp; Jours Spéciaux (appliqué aux 7 jours)" />
          <p style={{ fontSize: 10, color: "#999", marginBottom: 10 }}>
            Ces flags s&#39;appliquent uniformément à tous les 7 jours de prévision.
            Pour des situations mixtes (ex: exam 3 jours puis vacances), utilisez la date d&#39;ancrage au bon moment.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Congés &amp; Fêtes</div>
              <Toggle id="cal-holiday"    checked={calendar.isHoliday}          onChange={() => updateCal("isHoliday", !calendar.isHoliday)}             label="Jour férié" />
              <Toggle id="cal-religion"   checked={calendar.isReligionHoliday}  onChange={() => updateCal("isReligionHoliday", !calendar.isReligionHoliday)} label="Fête religieuse" />
              <Toggle id="cal-national"   checked={calendar.isNationalHoliday}  onChange={() => updateCal("isNationalHoliday", !calendar.isNationalHoliday)} label="Fête nationale" />
              <Toggle id="cal-vacation"   checked={calendar.isVacation}         onChange={() => updateCal("isVacation", !calendar.isVacation)}             label="Vacances scolaires" />
              <Toggle id="cal-dayoff"     checked={calendar.isDayOff}           onChange={() => updateCal("isDayOff", !calendar.isDayOff)}                 label="Jour de congé" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Examens &amp; Semestre</div>
              <Toggle id="cal-exam"       checked={calendar.isExamPeriod}        onChange={() => updateCal("isExamPeriod", !calendar.isExamPeriod)}           label="Période d'examen" />
              <Toggle id="cal-midterm"    checked={calendar.isMidtermPeriod}     onChange={() => updateCal("isMidtermPeriod", !calendar.isMidtermPeriod)}     label="Examens intermédiaires" />
              <Toggle id="cal-final"      checked={calendar.isFinalPeriod}       onChange={() => updateCal("isFinalPeriod", !calendar.isFinalPeriod)}          label="Examens finals" />
              <Toggle id="cal-semstart"   checked={calendar.isSemesterStart}     onChange={() => updateCal("isSemesterStart", !calendar.isSemesterStart)}     label="Début de semestre" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Ramadan</div>
              <Toggle id="cal-ramadan"    checked={calendar.isRamadan}           onChange={() => updateCal("isRamadan", !calendar.isRamadan)}               label="Ramadan" />
              <Toggle id="cal-preramadan" checked={calendar.isWeekBeforeRamadan} onChange={() => updateCal("isWeekBeforeRamadan", !calendar.isWeekBeforeRamadan)} label="Semaine avant Ramadan" />

              <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Pression Académique (auto-calculée)</div>
              <div style={{
                background: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: 3,
                padding: "6px 10px", fontSize: 12, fontWeight: 600,
                color: calendar.isExamPeriod || calendar.isFinalPeriod ? "#c62828" :
                       calendar.isMidtermPeriod ? "#e65100" :
                       calendar.isVacation ? "#388e3c" : "#1565c0",
              }}>
                {calendar.isExamPeriod || calendar.isFinalPeriod ? "🔴 Niveau 3 — Finals" :
                 calendar.isMidtermPeriod ? "🟠 Niveau 2 — Intermédiaires" :
                 calendar.isVacation ? "🟢 Niveau 0 — Vacances" :
                 "🔵 Niveau 1 — Normal"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline table styles ────────────────────────────────────────────────────────
const th: React.CSSProperties = {
  padding: "6px 8px", textAlign: "center", fontSize: 10,
  fontWeight: 700, color: "#555", borderBottom: "1px solid #dee2e6",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "5px 6px", textAlign: "center", verticalAlign: "middle",
};

// ── Numeric input ─────────────────────────────────────────────────────────────
function NumInput({
  value, onChange, min, max, unit, step = 1, disabled = false,
}: { value: number | null | undefined; onChange: (v: number | null) => void; min: number; max: number; unit: string; step?: number; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <input
        type="number"
        value={value === null || value === undefined ? "" : value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            onChange(null);
          } else {
            const v = parseFloat(val);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }
        }}
        style={{
          width: 54, textAlign: "center", fontSize: 11,
          border: "1px solid #ccc", borderRadius: 2, padding: "2px 4px",
          background: disabled ? "#f8f8f8" : "#fff",
          color: disabled ? "#888" : "#222",
        }}
      />
      <span style={{ fontSize: 9, color: "#999" }}>{unit}</span>
    </div>
  );
}
