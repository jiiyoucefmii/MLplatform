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
  temp_max:          number;
  temp_min:          number;
  temp_mean:         number;
  apparent_temp_max: number;
  precip:            number;
  windspeed:         number;
  sunshine_s:        number;
  humidity:          number;
  weather_code:      number;
}

export interface DashboardState {
  date:            string;
  mealType:        MealType;
  canteenId:       string;
  canteenDisplay:  string;
  wilayaNum:       number;
  // menu: selected items per meal per category
  selectedMenuItems: SelectedMenuItems;
  // computed counts (derived from selectedMenuItems)
  menuCounts:      Record<string, MenuCounts>;
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

const ZERO_COUNTS: MenuCounts = {
  n_bread:0, n_protein:0, n_main_dish:0, n_side_dish:0,
  n_soup:0, n_dessert:0, n_drink:0, n_spread:0,
};

interface DashboardProps {
  agentInfo: { username: string; canteen: string };
  onLogout:  () => void;
}

export default function Dashboard({ agentInfo, onLogout }: DashboardProps) {
  const [activeNav, setActiveNav] = useState("forecast");

  const [state, setState] = useState<DashboardState>({
    date:            today,
    mealType:        "Lunch",
    canteenId:       "",
    canteenDisplay:  "",
    wilayaNum:       0,
    selectedMenuItems: { breakfast: {}, lunch: {}, dinner: {} },
    menuCounts:      { breakfast: { ...ZERO_COUNTS }, lunch: { ...ZERO_COUNTS }, dinner: { ...ZERO_COUNTS } },
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

  // Toggle a menu item on/off for a given meal + category
  const handleToggleItem = useCallback((meal: string, cat: string, item: string) => {
    setState(prev => {
      const mealSel  = { ...(prev.selectedMenuItems[meal] ?? {}) };
      const catItems = [...(mealSel[cat] ?? [])];
      const idx      = catItems.indexOf(item);
      if (idx >= 0) catItems.splice(idx, 1); else catItems.push(item);
      mealSel[cat]   = catItems;

      const nextSelected = { ...prev.selectedMenuItems, [meal]: mealSel };
      const nextCounts   = { ...prev.menuCounts, [meal]: selectedItemsToMenuCounts(mealSel) };

      return { ...prev, selectedMenuItems: nextSelected, menuCounts: nextCounts };
    });
  }, []);

  const activeMeals: string[] =
    state.mealType === "All Meals"
      ? ["breakfast", "lunch", "dinner"]
      : [state.mealType.toLowerCase()];

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
              onDateChange={handleDateChange}
              onMealTypeChange={handleMealTypeChange}
              onCanteenChange={handleCanteenChange}
            />

            <MenuCompositionPanel
              mealType={state.mealType}
              selectedMenuItems={state.selectedMenuItems}
              onToggleItem={handleToggleItem}
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
