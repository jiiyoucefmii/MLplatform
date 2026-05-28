"use client";

import { ChefHat, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import type { MealType, MenuCounts } from "./Dashboard";

// ── All items extracted from model_second_stage_clean.csv ────────────────────
const MENU_ITEMS: Record<string, Record<string, string[]>> = {
  breakfast: {
    bread:     ["خبز بالشكولاطة","خبز","خبز محسن","خبز بالمربي","خبز عادي","خبز صغير محسن","خبز مطلي بالزبدة"],
    protein:   ["بيض"],
    dessert:   ["حلويات جافة","هلاليات","ياغورت","مادلين","تمر","كرام ديسار","فاكهة","تفاح","مرطبات","ميلفاي","برتقال","قوفريط","سيقار","موز","حلو","قلب اللوز","زلابية"],
    drink:     ["قهوة بالحليب","حليب","قهوة","عصير","ماء","شاي","لبن"],
    spread:    ["مربي","جبن","زبدة"],
  },
  lunch: {
    bread:     ["خبز","خبز محسن","خبز عادي","خبز بالشكولاطة"],
    protein:   ["بيض","لحم","تونة","سمك","دجاج","كاشير","سكالوب"],
    main_dish: ["عدس","لوبيا","ارز","كسكس","حمص","سباقيتي","عجاين","طاجين زيتون","معكرونة","بوراك","بطاطا مقلية","بطاطا كوشة","تليتلي","جلبانة","بطاطا مهروسة","شكشوكة","مثوم","غراتان","شخشوخة","دولمة","شطيطحة","كسكس بالزبيب","طاجين الجبن","تريدة","فريك","رشتة","راقو"],
    side_dish: ["سلطة متنوعة","سلطة جزايرية"],
    soup:      ["شربة","حريرة","مرق بالخضر"],
    dessert:   ["فاكهة","ياغورت","برتقال","تمر","كرام ديسار","تفاح","زلابية","حلو","قلب اللوز","موز","حلويات جافة","مرطبات","ميلفاي","هلاليات","سيقار","قوفريط","مادلين"],
    drink:     ["ماء","عصير","مشروب غازي"],
    spread:    ["جبن"],
  },
  dinner: {
    bread:     ["خبز","خبز محسن","خبز عادي","خبز بالشكولاطة","خبز مطلي بالزبدة"],
    protein:   ["دجاج","لحم","تونة","بيض","سمك","كاشير","سكالوب"],
    main_dish: ["طاجين زيتون","بطاطا مهروسة","كسكس","بطاطا كوشة","ارز","بطاطا مقلية","تليتلي","جلبانة","شخشوخة","كسكس بالزبيب","غراتان","مثوم","سباقيتي","عدس","لوبيا","عجاين","تريدة","بوراك","شكشوكة","حمص","راقو","معكرونة","رشتة","كسكسي مسفوف","فريك","طاجين الجبن","دولمة","شطيطحة"],
    side_dish: ["سلطة متنوعة","سلطة جزايرية","خضر مشكلة"],
    soup:      ["شربة","حريرة","مرق بالخضر"],
    dessert:   ["ياغورت","كرام ديسار","فاكهة","تفاح","موز","تمر","برتقال","حلو","قلب اللوز","حلويات جافة","هلاليات","زلابية","مرطبات","مادلين","ميلفاي","سيقار","قوفريط"],
    drink:     ["ماء","عصير","مشروب غازي","رايب"],
    spread:    ["جبن","مربي","زبدة"],
  },
};

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; emoji: string; meals: string[] }[] = [
  { key: "bread",     label: "Pain",           emoji: "🍞", meals: ["breakfast","lunch","dinner"] },
  { key: "protein",   label: "Protéine",       emoji: "🥩", meals: ["breakfast","lunch","dinner"] },
  { key: "main_dish", label: "Plat Principal", emoji: "🍲", meals: ["lunch","dinner"] },
  { key: "side_dish", label: "Accompagnement", emoji: "🥗", meals: ["lunch","dinner"] },
  { key: "soup",      label: "Soupe",          emoji: "🍜", meals: ["lunch","dinner"] },
  { key: "dessert",   label: "Dessert",        emoji: "🍮", meals: ["breakfast","lunch","dinner"] },
  { key: "drink",     label: "Boisson",        emoji: "🥤", meals: ["breakfast","lunch","dinner"] },
  { key: "spread",    label: "Garniture",      emoji: "🧈", meals: ["breakfast","lunch","dinner"] },
];

const MEAL_COLORS: Record<string, { bg: string; header: string; accent: string; chip: string; chipText: string; border: string }> = {
  breakfast: { bg: "#fff8e1", header: "#fff3cd", accent: "#f57f17", chip: "#fff3cd", chipText: "#e65100", border: "#ffcc02" },
  lunch:     { bg: "#e8f5e9", header: "#dcedc8", accent: "#2e7d32", chip: "#dcedc8", chipText: "#1b5e20", border: "#81c784" },
  dinner:    { bg: "#ede7f6", header: "#e8eaf6", accent: "#4527a0", chip: "#e8eaf6", chipText: "#311b92", border: "#b39ddb" },
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "☕ Petit-déjeuner",
  lunch:     "🍲 Déjeuner",
  dinner:    "🌙 Dîner",
};

// ── State: selected items per meal per category ───────────────────────────────
export type SelectedMenuItems = Record<string, Record<string, string[]>>;

// Convert selected items → MenuCounts (just count per category)
export function selectedItemsToMenuCounts(selected: Record<string, string[]>): MenuCounts {
  return {
    n_bread:     selected.bread?.length     ?? 0,
    n_protein:   selected.protein?.length   ?? 0,
    n_main_dish: selected.main_dish?.length ?? 0,
    n_side_dish: selected.side_dish?.length ?? 0,
    n_soup:      selected.soup?.length      ?? 0,
    n_dessert:   selected.dessert?.length   ?? 0,
    n_drink:     selected.drink?.length     ?? 0,
    n_spread:    selected.spread?.length    ?? 0,
  };
}

// ── Category picker for one meal ─────────────────────────────────────────────
function CategoryPicker({
  catKey, label, emoji, items, selected, onToggle,
  accentColor, chipBg, chipText,
}: {
  catKey: string; label: string; emoji: string;
  items: string[]; selected: string[];
  onToggle: (item: string) => void;
  accentColor: string; chipBg: string; chipText: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = selected.length;

  return (
    <div style={{ marginBottom: 8, border: "1px solid #e0e0e0", borderRadius: 4, overflow: "hidden" }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", cursor: "pointer",
          background: count > 0 ? chipBg : "#fafafa",
          borderBottom: expanded ? "1px solid #e0e0e0" : "none",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 13 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#444" }}>{label}</span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: count > 0 ? accentColor : "#ccc",
          color: "#fff", borderRadius: 10,
          padding: "1px 7px", minWidth: 20, textAlign: "center",
        }}>{count}</span>
        {expanded ? <ChevronUp size={12} color="#888" /> : <ChevronDown size={12} color="#888" />}
      </div>

      {/* Selected chips (always visible) */}
      {!expanded && count > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "5px 10px", background: "#fff" }}>
          {selected.map(item => (
            <span key={item} style={{
              background: chipBg, color: chipText, fontSize: 10, fontWeight: 600,
              borderRadius: 3, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3,
              direction: "rtl",
            }}>
              {item}
              <span
                onClick={(e) => { e.stopPropagation(); onToggle(item); }}
                style={{ cursor: "pointer", opacity: 0.6, lineHeight: 1 }}
              >✕</span>
            </span>
          ))}
        </div>
      )}

      {/* Expanded checkbox list */}
      {expanded && (
        <div style={{ background: "#fff", padding: "8px 10px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, direction: "rtl" }}>
            {items.map(item => {
              const checked = selected.includes(item);
              return (
                <label key={item} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  cursor: "pointer", padding: "3px 8px",
                  border: `1px solid ${checked ? accentColor : "#ddd"}`,
                  borderRadius: 3,
                  background: checked ? chipBg : "#fafafa",
                  fontSize: 11, fontWeight: checked ? 600 : 400,
                  color: checked ? chipText : "#555",
                  transition: "all 0.1s",
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item)}
                    style={{ width: 12, height: 12, accentColor: accentColor }}
                  />
                  {item}
                </label>
              );
            })}
          </div>
          {/* Quick actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => items.forEach(i => { if (!selected.includes(i)) onToggle(i); })}
              style={{ fontSize: 10, color: accentColor, border: "none", background: "none", cursor: "pointer", textDecoration: "underline" }}>
              Tout sélect.
            </button>
            <button type="button" onClick={() => selected.forEach(i => onToggle(i))}
              style={{ fontSize: 10, color: "#e53935", border: "none", background: "none", cursor: "pointer", textDecoration: "underline" }}>
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Meal block ────────────────────────────────────────────────────────────────
function MealMenuBlock({
  meal, selectedItems, onToggleItem,
}: {
  meal: string;
  selectedItems: Record<string, string[]>;
  onToggleItem: (cat: string, item: string) => void;
}) {
  const color = MEAL_COLORS[meal] || MEAL_COLORS.lunch;
  const cats = CATEGORIES.filter(c => c.meals.includes(meal));
  const totalSelected = cats.reduce((s, c) => s + (selectedItems[c.key]?.length ?? 0), 0);
  const mealItems = MENU_ITEMS[meal] ?? {};

  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: 4, overflow: "hidden", width: "100%" }}>
      {/* Meal header */}
      <div style={{
        background: color.header, padding: "8px 14px",
        borderBottom: `1px solid ${color.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>{MEAL_LABELS[meal]}</span>
        <span style={{ fontSize: 11, color: "#666" }}>
          <strong style={{ color: color.accent }}>{totalSelected}</strong> articles sélectionnés
          &nbsp;→&nbsp;modèle utilise les <strong>comptages</strong> par catégorie
        </span>
      </div>

      {/* Categories */}
      <div style={{ padding: "10px 12px", background: color.bg }}>
        {cats.map(cat => (
          <CategoryPicker
            key={cat.key}
            catKey={cat.key}
            label={cat.label}
            emoji={cat.emoji}
            items={mealItems[cat.key] ?? []}
            selected={selectedItems[cat.key] ?? []}
            onToggle={(item) => onToggleItem(cat.key, item)}
            accentColor={color.accent}
            chipBg={color.chip}
            chipText={color.chipText}
          />
        ))}
      </div>

      {/* Summary chips */}
      <div style={{ padding: "6px 12px 10px", background: color.bg, borderTop: `1px solid ${color.border}` }}>
        <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Comptages envoyés au modèle :</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {cats.map(cat => {
            const n = selectedItems[cat.key]?.length ?? 0;
            return (
              <span key={cat.key} style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 3,
                background: n > 0 ? color.chip : "#f0f0f0",
                color: n > 0 ? color.chipText : "#aaa",
                fontWeight: n > 0 ? 700 : 400,
                border: `1px solid ${n > 0 ? color.border : "#e0e0e0"}`,
              }}>
                {cat.emoji} {cat.label}: <strong>{n}</strong>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface MenuCompositionPanelProps {
  mealType:     MealType;
  selectedMenuItems: SelectedMenuItems;
  onToggleItem: (meal: string, cat: string, item: string) => void;
}

export default function MenuCompositionPanel({
  mealType, selectedMenuItems, onToggleItem,
}: MenuCompositionPanelProps) {
  const activeMeals =
    mealType === "All Meals"
      ? ["breakfast", "lunch", "dinner"]
      : [mealType.toLowerCase()];

  return (
    <div className="panel">
      <div className="section-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ChefHat size={13} />
        <span>Composition du Menu — Sélection des Articles</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 400, color: "#888" }}>
          Données réelles du CSV d&#39;entraînement · Le modèle compte les articles par catégorie
        </span>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {activeMeals.map(meal => (
          <MealMenuBlock
            key={meal}
            meal={meal}
            selectedItems={selectedMenuItems[meal] ?? {}}
            onToggleItem={(cat, item) => onToggleItem(meal, cat, item)}
          />
        ))}
        <p style={{ marginTop: 2, fontSize: 10, color: "#aaa" }}>
          Les articles cochés comptent par catégorie (ex: 3 plats principaux → <code>fc_n_main_dish_items=3</code>).
          Le texte n&#39;est pas transmis au modèle — seulement les comptages.
        </p>
      </div>
    </div>
  );
}
