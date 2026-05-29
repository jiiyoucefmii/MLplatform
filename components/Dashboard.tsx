"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import SessionContextPanel from "./SessionContextPanel";
import MenuCompositionPanel, { SelectedMenuItems, selectedItemsToMenuCounts } from "./MenuCompositionPanel";
import EnvironmentalControls, { CalendarState, DEFAULT_CALENDAR } from "./EnvironmentalControls";
import ForecastPanel from "./ForecastPanel";

// ── Types ─────────────────────────────────────────────────────────────────────
export type MealType = "Breakfast" | "Lunch" | "Dinner" | "All Meals";

export interface MenuCounts {
  n_bread:     number;
  n_protein:   number;
  n_main_dish: number;
  n_side_dish: number;
  n_soup:      number;
  n_dessert:   number;
  n_drink:     number;
  n_spread:    number;
}

export interface WeatherDay {
  date:              string;
  temp_max:          number | null;
  temp_min:          number | null;
  temp_mean:         number | null;
  apparent_temp_max: number | null;
  precip:            number | null;
  windspeed:         number | null;
  sunshine_s:        number | null;
  humidity:          number | null;
  weather_code:      number | null;
}

export interface DashboardState {
  date:            string;
  mealType:        MealType;
  canteenId:       string;
  canteenDisplay:  string;
  wilayaNum:       number;
  // menu: selected items per meal per date per category
  selectedMenuItems: Record<string, Record<string, SelectedMenuItems>>;
  // computed counts (derived from selectedMenuItems)
  menuCounts:      Record<string, Record<string, MenuCounts>>;
  weatherDays:     WeatherDay[];
  weatherAutoFetch: boolean;
  calendar:        CalendarState;
}

function defaultWeatherDays(anchorDate: string): WeatherDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchorDate + "T00:00:00");
    d.setDate(d.getDate() + i + 1);
    return {
      date:              d.toISOString().split("T")[0],
      temp_max:          28, temp_min: 14, temp_mean: 21,
      apparent_temp_max: 28, precip: 0,
      windspeed: 10, sunshine_s: 36000, humidity: 55, weather_code: 0,
    };
  });
}

const today = new Date().toISOString().split("T")[0];

interface DashboardProps {
  agentInfo: { username: string; canteen: string };
  onLogout:  () => void;
}

export default function Dashboard({ agentInfo, onLogout }: DashboardProps) {
  const [activeNav, setActiveNav] = useState("forecast");
  const [activeDateIndex, setActiveDateIndex] = useState(0); // 0 to 6 index of forecast days

  const [state, setState] = useState<DashboardState>({
    date:            today,
    mealType:        "Lunch",
    canteenId:       "",
    canteenDisplay:  "",
    wilayaNum:       0,
    selectedMenuItems: { breakfast: {}, lunch: {}, dinner: {} },
    menuCounts:      { breakfast: {}, lunch: {}, dinner: {} },
    weatherDays:     defaultWeatherDays(today),
    weatherAutoFetch: true,
    calendar:        DEFAULT_CALENDAR,
  });

  const handleCanteenChange = useCallback((id: string, display: string, wilayaNum: number) => {
    setState(prev => ({ ...prev, canteenId: id, canteenDisplay: display, wilayaNum }));
  }, []);

  const handleDateChange = useCallback((date: string) => {
    setState(prev => ({ ...prev, date, weatherDays: defaultWeatherDays(date) }));
  }, []);

  const handleMealTypeChange = useCallback((mealType: MealType) => {
    setState(prev => ({ ...prev, mealType }));
  }, []);

  // Toggle a menu item on/off for a given meal + date + category
  const handleToggleItem = useCallback((meal: string, date: string, cat: string, item: string) => {
    setState(prev => {
      const prevSelected = { ...prev.selectedMenuItems };
      const mealSel = { ...(prevSelected[meal] ?? {}) };
      const dateSel = { ...(mealSel[date] ?? {}) };
      const catItems = [...(dateSel[cat] ?? [])];
      
      const idx = catItems.indexOf(item);
      if (idx >= 0) catItems.splice(idx, 1); else catItems.push(item);
      dateSel[cat] = catItems;
      mealSel[date] = dateSel;
      
      const nextSelected = { ...prevSelected, [meal]: mealSel };
      
      const nextCounts = { ...prev.menuCounts };
      const mealCounts = { ...(nextCounts[meal] ?? {}) };
      mealCounts[date] = selectedItemsToMenuCounts(dateSel, meal);
      nextCounts[meal] = mealCounts;

      return { ...prev, selectedMenuItems: nextSelected, menuCounts: nextCounts };
    });
  }, []);

  // Copy current active date's menu to all other forecast days
  const copyActiveMenuToAllDays = useCallback(() => {
    const activeMeals = state.mealType === "All Meals" ? ["breakfast", "lunch", "dinner"] : [state.mealType.toLowerCase()];
    const activeDate = state.weatherDays[activeDateIndex]?.date;
    if (!activeDate) return;
    
    setState(prev => {
      const nextSelected = { ...prev.selectedMenuItems };
      const nextCounts = { ...prev.menuCounts };
      
      for (const meal of activeMeals) {
        const activeSelection = nextSelected[meal]?.[activeDate] || {};
        const mealSel = { ...(nextSelected[meal] ?? {}) };
        const mealCounts = { ...(nextCounts[meal] ?? {}) };
        
        for (const w of prev.weatherDays) {
          if (w.date === activeDate) continue;
          mealSel[w.date] = JSON.parse(JSON.stringify(activeSelection));
          mealCounts[w.date] = selectedItemsToMenuCounts(activeSelection, meal);
        }
        
        nextSelected[meal] = mealSel;
        nextCounts[meal] = mealCounts;
      }
      
      return { ...prev, selectedMenuItems: nextSelected, menuCounts: nextCounts };
    });
  }, [state.mealType, state.weatherDays, activeDateIndex]);

  const activeDate = state.weatherDays[activeDateIndex]?.date;

  const getMenuForActiveDate = () => {
    if (!activeDate) return {};
    const activeMeals = state.mealType === "All Meals" ? ["breakfast", "lunch", "dinner"] : [state.mealType.toLowerCase()];
    const result: Record<string, Record<string, string[]>> = {};
    for (const m of activeMeals) {
      result[m] = state.selectedMenuItems[m]?.[activeDate] || {};
    }
    return result;
  };

  const formatShortDate = (iso: string) => {
    const DOW_ABBR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const d = new Date(iso + "T00:00:00");
    const dow = DOW_ABBR[d.getDay() === 0 ? 6 : d.getDay() - 1];
    return `${dow} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const activeMeals = state.mealType === "All Meals" ? ["breakfast", "lunch", "dinner"] : [state.mealType.toLowerCase()];

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#dde1e4", overflow: "hidden" }}>
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} agentInfo={agentInfo} onLogout={onLogout} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <DashboardHeader agentInfo={agentInfo} state={state} onLogout={onLogout} />

        <main style={{ flex: 1, overflowY: "auto", padding: "16px 20px", backgroundColor: "#dde1e4" }}>
          <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

            <SessionContextPanel
              date={state.date}
              mealType={state.mealType}
              canteenId={state.canteenId}
              canteenDisplay={state.canteenDisplay}
              wilayaNum={state.wilayaNum}
              onDateChange={handleDateChange}
              onMealTypeChange={handleMealTypeChange}
              onCanteenChange={handleCanteenChange}
            />

            {/* Days Selector Tabs & Copy Button */}
            <div style={{
              background: "#fff", border: "1px solid #dee2e6", borderRadius: 4, padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10
            }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#555", marginRight: 8 }}>
                  Menu pour le jour :
                </span>
                {state.weatherDays.map((w, idx) => {
                  const isActive = idx === activeDateIndex;
                  
                  // Compute count of selected items for this day across active meals
                  const activeMeals = state.mealType === "All Meals" ? ["breakfast", "lunch", "dinner"] : [state.mealType.toLowerCase()];
                  let count = 0;
                  for (const m of activeMeals) {
                    const daySelection = state.selectedMenuItems[m]?.[w.date] || {};
                    count += Object.values(daySelection).reduce((acc, arr) => acc + (arr?.length || 0), 0);
                  }
                  
                  return (
                    <button
                      key={w.date}
                      type="button"
                      onClick={() => setActiveDateIndex(idx)}
                      style={{
                        padding: "4px 8px", fontSize: 11, fontWeight: isActive ? 700 : 500,
                        border: "1px solid", borderColor: isActive ? "#2e7d32" : "#ccc",
                        borderRadius: 3, background: isActive ? "#e8f5e9" : "#fff",
                        color: isActive ? "#2e7d32" : "#555", cursor: "pointer"
                      }}
                    >
                      {formatShortDate(w.date)} <span style={{ fontSize: 9, opacity: 0.8, color: isActive ? "#2e7d32" : "#888" }}>({count})</span>
                    </button>
                  );
                })}
              </div>
              
              <button
                type="button"
                onClick={copyActiveMenuToAllDays}
                style={{
                  padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  border: "1px solid #c8e6c9", borderRadius: 3,
                  background: "#e8f5e9", color: "#2e7d32", cursor: "pointer"
                }}
              >
                Copier ce menu sur toute la semaine
              </button>
            </div>

            <MenuCompositionPanel
              mealType={state.mealType}
              selectedMenuItems={getMenuForActiveDate()}
              onToggleItem={(meal, cat, item) => handleToggleItem(meal, activeDate, cat, item)}
            />

            <EnvironmentalControls
              canteenId={state.canteenId}
              wilayaNum={state.wilayaNum}
              anchorDate={state.date}
              weatherDays={state.weatherDays}
              weatherAutoFetch={state.weatherAutoFetch}
              calendar={state.calendar}
              onWeatherDaysChange={(w) => setState(p => ({ ...p, weatherDays: w }))}
              onWeatherAutoFetchChange={(v) => setState(p => ({ ...p, weatherAutoFetch: v }))}
              onCalendarChange={(c) => setState(p => ({ ...p, calendar: c }))}
            />

            <ForecastPanel state={state} activeMeals={activeMeals} />
          </div>
        </main>
      </div>
    </div>
  );
}
