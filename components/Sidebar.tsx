"use client";

import {
  Home,
  LineChart,
  History,
  Settings,
  Calendar,
  Phone,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  agentInfo: { username: string; canteen: string };
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: "overview",  label: "ACCUEIL",        icon: Home },
  { id: "forecast",  label: "PRÉVISION",       icon: LineChart },
  { id: "history",   label: "HISTORIQUE",      icon: History },
  { id: "calendar",  label: "CALENDRIER",      icon: Calendar },
  { id: "settings",  label: "PARAMÈTRES",      icon: Settings },
  { id: "contact",   label: "CONTACTS",        icon: Phone },
];

export default function Sidebar({ activeNav, onNavChange, agentInfo, onLogout }: SidebarProps) {
  const canteenDisplay = agentInfo.canteen.replace("__", " · ").replace(/_/g, " ");

  return (
    <aside style={{
      width: 220,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      backgroundColor: "#ffffff",
      borderRight: "1px solid #dddddd",
    }}>
      {/* ── Dark header bar (matches Progres doctorat screenshot) ── */}
      <div style={{
        backgroundColor: "#505050",
        color: "#ffffff",
        padding: "10px 14px",
        borderBottom: "2px solid #5cb85c",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🍽</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
              IntelliCanteen
            </div>
            <div style={{ fontSize: 10, color: "#aaaaaa", fontWeight: 400 }}>
              Prévision de la Demande
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation items ── */}
      <nav style={{ flex: 1, paddingTop: 6 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavChange(item.id)}
              className="sidebar-nav-item"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
                border: "none",
                borderLeft: isActive ? "3px solid #5cb85c" : "3px solid transparent",
                backgroundColor: isActive ? "#f0f7f0" : "transparent",
                color: isActive ? "#3a7a3a" : "#444444",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                letterSpacing: 0.3,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon size={14} color={isActive ? "#5cb85c" : "#888888"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Bottom user info ── */}
      <div style={{
        borderTop: "1px solid #dddddd",
        backgroundColor: "#f9f9f9",
      }}>
        {/* Canteen label */}
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #eeeeee" }}>
          <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
            Restaurant actif
          </div>
          <div style={{ fontSize: 12, color: "#3a7a3a", fontWeight: 600 }}>
            {canteenDisplay}
          </div>
        </div>

        {/* User row */}
        <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28,
            backgroundColor: "#5cb85c",
            borderRadius: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {agentInfo.username.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agentInfo.username}
            </div>
            <div style={{ fontSize: 10, color: "#888" }}>Agent de Restaurant</div>
          </div>
          <button
            id="logout-btn-sidebar"
            onClick={onLogout}
            title="Déconnexion"
            style={{
              border: "1px solid #cccccc",
              backgroundColor: "#fff",
              borderRadius: 2,
              padding: "3px 6px",
              cursor: "pointer",
              color: "#888",
              display: "flex", alignItems: "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#a94442";
              (e.currentTarget as HTMLElement).style.borderColor = "#ebccd1";
              (e.currentTarget as HTMLElement).style.backgroundColor = "#f2dede";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#888";
              (e.currentTarget as HTMLElement).style.borderColor = "#cccccc";
              (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
            }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
