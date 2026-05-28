"use client";

import { LogOut, RefreshCw } from "lucide-react";
import type { DashboardState } from "./Dashboard";

interface DashboardHeaderProps {
  agentInfo: { username: string; canteen: string };
  state: DashboardState;
  onLogout: () => void;
}

export default function DashboardHeader({ agentInfo, state, onLogout }: DashboardHeaderProps) {
  const canteenName = agentInfo.canteen.split("__")[1]?.replace(/_/g, " ") ?? agentInfo.canteen;

  const formattedDate = new Date(state.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mealColors: Record<string, { bg: string; color: string; border: string }> = {
    Breakfast:  { bg: "#fcf8e3", color: "#8a6d3b", border: "#faebcc" },
    Lunch:      { bg: "#dff0d8", color: "#3c763d", border: "#d6e9c6" },
    Dinner:     { bg: "#d9edf7", color: "#31708f", border: "#bce8f1" },
    "All Meals":{ bg: "#ede7f6", color: "#4527a0", border: "#b39ddb" },
  };
  const mc = mealColors[state.mealType] ?? mealColors["Lunch"];
  const mealLabel = state.mealType === "Breakfast" ? "Petit-déjeuner"
    : state.mealType === "Lunch" ? "Déjeuner"
    : state.mealType === "Dinner" ? "Dîner"
    : "Tous les Repas";

  return (
    /* Dark header — matches PROGRES doctorat screenshot top bar */
    <header style={{
      backgroundColor: "#505050",
      color: "#ffffff",
      padding: "0 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
      borderBottom: "2px solid #5cb85c",
      minHeight: 54,
    }}>
      {/* Left: context info */}
      <div>
        <div style={{ fontSize: 11, color: "#aaaaaa", letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1 }}>
          REPUBLIQUE ALGERIENNE DÉMOCRATIQUE ET POPULAIRE | MINISTÈRE DE L&apos;ENSEIGNEMENT SUPÉRIEUR
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", marginTop: 2 }}>
          INTELLICANTEEN — PLATEFORME DE PRÉVISION DE LA DEMANDE EN RESTAURATION UNIVERSITAIRE
        </div>
      </div>

      {/* Right: status badges + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Canteen tag */}
        <span style={{
          backgroundColor: "#4a5060",
          border: "1px solid #666",
          borderRadius: 2,
          padding: "3px 8px",
          fontSize: 11,
          color: "#cccccc",
        }}>
          {canteenName}
        </span>

        {/* Date */}
        <span style={{ fontSize: 11, color: "#bbbbbb" }}>
          {formattedDate}
        </span>

        {/* Meal type badge */}
        <span style={{
          backgroundColor: mc.bg,
          border: `1px solid ${mc.border}`,
          color: mc.color,
          borderRadius: 2,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 600,
        }}>
          {mealLabel}
        </span>

        {/* Refresh */}
        <button
          id="refresh-btn"
          title="Actualiser"
          style={{
            backgroundColor: "transparent",
            border: "1px solid #666",
            borderRadius: 2,
            padding: "4px 8px",
            color: "#bbbbbb",
            cursor: "pointer",
            display: "flex", alignItems: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#aaa"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#666"}
        >
          <RefreshCw size={12} />
        </button>

        {/* Logout */}
        <button
          id="logout-btn-header"
          onClick={onLogout}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            backgroundColor: "#d9534f",
            border: "1px solid #c9302c",
            borderRadius: 2,
            padding: "4px 10px",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#c9302c"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#d9534f"}
        >
          <LogOut size={11} />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
