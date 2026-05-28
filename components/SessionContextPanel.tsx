"use client";

import { Calendar, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MealType } from "./Dashboard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CanteenOption {
  canteen_id:   string;
  display_name: string;
  wilaya_num:   number;
  dou_code_num: number;
}

interface SessionContextPanelProps {
  date:           string;
  mealType:       MealType;
  canteenId:      string;
  canteenDisplay: string;
  onDateChange:       (date: string) => void;
  onMealTypeChange:   (meal: MealType) => void;
  onCanteenChange:    (id: string, display: string, wilayaNum: number) => void;
}

const MEAL_TYPES: { id: MealType; fr: string; emoji: string }[] = [
  { id: "Breakfast", fr: "Petit-déj",  emoji: "☕" },
  { id: "Lunch",     fr: "Déjeuner",   emoji: "🍲" },
  { id: "Dinner",    fr: "Dîner",      emoji: "🌙" },
  { id: "All Meals", fr: "Tous repas", emoji: "📊" },
];

export default function SessionContextPanel({
  date, mealType, canteenId, canteenDisplay,
  onDateChange, onMealTypeChange, onCanteenChange,
}: SessionContextPanelProps) {
  const [canteens, setCanteens] = useState<CanteenOption[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [apiError, setApiError] = useState(false);
  const [search,   setSearch]   = useState("");
  const [open,     setOpen]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/canteens`)
      .then((r) => r.json())
      .then((data: CanteenOption[]) => {
        setCanteens(data);
        setApiError(false);
        if (!canteenId && data.length > 0) {
          const first = data[0];
          onCanteenChange(first.canteen_id, first.display_name, first.wilaya_num);
        }
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = canteens.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (c: CanteenOption) => {
    onCanteenChange(c.canteen_id, c.display_name, c.wilaya_num);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="panel">
      <div className="section-header">
        <Calendar size={13} />
        Contexte de la Session de Prévision
      </div>

      <div style={{ padding: "14px 16px" }}>

        {/* ── Canteen Selector ── */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
            Établissement (Cantine)
          </label>

          {apiError ? (
            <div className="alert alert-warning" style={{ marginBottom: 0 }}>
              <span>Backend API introuvable (localhost:8000). Démarrez le serveur.</span>
            </div>
          ) : (
            <div ref={dropRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="progres-input"
                style={{
                  width: "100%", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                  textAlign: "left", gap: 8, background: "#fff",
                  border: "1px solid #bbbbbb",
                }}
              >
                {loading ? (
                  <span style={{ color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                    Chargement des cantines…
                  </span>
                ) : canteenDisplay ? (
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{canteenDisplay}</span>
                ) : (
                  <span style={{ color: "#aaa" }}>Sélectionnez une cantine…</span>
                )}
                <ChevronDown size={14} style={{ color: "#888", flexShrink: 0 }} />
              </button>

              {open && !loading && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                  border: "1px solid #bbbbbb", borderTop: "none",
                  backgroundColor: "#fff", borderRadius: "0 0 2px 2px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  maxHeight: 280, display: "flex", flexDirection: "column",
                }}>
                  <div style={{ padding: "6px 8px", borderBottom: "1px solid #eeeeee" }}>
                    <input
                      autoFocus
                      className="progres-input"
                      placeholder="Rechercher une cantine…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: "100%", fontSize: 12, padding: "5px 8px" }}
                    />
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: "10px 12px", color: "#aaa", fontSize: 12 }}>Aucun résultat</div>
                    ) : filtered.map((c) => (
                      <button
                        key={c.canteen_id}
                        type="button"
                        onClick={() => handleSelect(c)}
                        style={{
                          width: "100%", textAlign: "left", padding: "7px 12px",
                          border: "none", background: c.canteen_id === canteenId ? "#dff0d8" : "transparent",
                          cursor: "pointer", fontFamily: "inherit",
                          borderBottom: "1px solid #f5f5f5",
                          display: "flex", flexDirection: "column", gap: 1,
                        }}
                        onMouseEnter={(e) => { if (c.canteen_id !== canteenId) (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5"; }}
                        onMouseLeave={(e) => { if (c.canteen_id !== canteenId) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{c.display_name}</span>
                        <span style={{ fontSize: 10, color: "#888" }}>Wilaya {c.wilaya_num}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: "4px 12px", borderTop: "1px solid #eeeeee", fontSize: 10, color: "#aaa" }}>
                    {filtered.length} / {canteens.length} cantines
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Date + Meal Type ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <label htmlFor="forecast-date" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
              Date d&#39;ancrage (J) — prévision J+1 à J+7
            </label>
            <div className="progres-input-wrap">
              <input
                id="forecast-date"
                type="date"
                className="progres-input"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                style={{ paddingRight: 10 }}
              />
            </div>
            <p style={{ marginTop: 5, fontSize: 11, color: "#888" }}>
              Dernière date connue avec données réelles de fréquentation.
            </p>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Type de Repas à Prévoir</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MEAL_TYPES.map((m) => {
                const isActive = mealType === m.id;
                return (
                  <button
                    key={m.id}
                    id={`meal-type-${m.id.toLowerCase().replace(" ", "-")}`}
                    type="button"
                    onClick={() => onMealTypeChange(m.id)}
                    style={{
                      flex: 1, minWidth: 70, padding: "7px 6px",
                      border: `2px solid ${isActive ? "#5cb85c" : "#dddddd"}`,
                      borderRadius: 3,
                      backgroundColor: isActive ? "#5cb85c" : "#f5f5f5",
                      color: isActive ? "#ffffff" : "#555555",
                      fontSize: 11, fontWeight: isActive ? 700 : 500,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{m.emoji}</span>
                    <span>{m.fr}</span>
                  </button>
                );
              })}
            </div>
            {mealType === "All Meals" && (
              <p style={{ marginTop: 6, fontSize: 10, color: "#2E7D32", fontWeight: 500 }}>
                ✓ Prévisions Petit-déj, Déjeuner et Dîner simultanément
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
