"use client";

import { useState } from "react";
import { User, ChevronDown, Eye, EyeOff, CheckCircle } from "lucide-react";
import PageLoader from "./PageLoader";

const CANTEENS = [
  { code: "dou_01", name: "Resto_Centrale" },
  { code: "dou_02", name: "Resto_Sud" },
  { code: "dou_03", name: "Resto_Nord" },
  { code: "dou_04", name: "Resto_Est" },
  { code: "dou_05", name: "Resto_Ouest" },
  { code: "dou_06", name: "Resto_Campus_B" },
  { code: "dou_07", name: "Resto_Sciences" },
  { code: "dou_08", name: "Resto_Medecine" },
];

interface LoginPageProps {
  onLogin: (username: string, canteen: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCanteen, setSelectedCanteen] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Veuillez saisir votre nom d'utilisateur ou email."); return; }
    if (!password) { setError("Veuillez saisir votre mot de passe."); return; }
    if (!selectedCanteen) { setError("Veuillez sélectionner votre restaurant assigné."); return; }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsLoading(false);
    onLogin(username, selectedCanteen);
  };

  const selectedObj = CANTEENS.find((c) => `${c.code}__${c.name}` === selectedCanteen);

  return (
    /* Page — matches the light gray (#ddd) PROGRES background */
    <div style={{ minHeight: "100vh", backgroundColor: "#dde1e4", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "0" }}>

      {/* ── Full-screen loader overlay ── */}
      {isLoading && <PageLoader message="Authentification en cours..." />}

      {/* ── Top strip alerts (exactly like PROGRES) ── */}
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div className="strip-alert strip-alert-blue" style={{ marginTop: 14 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ</span>
          <span>Accès réservé aux Agents de Restaurant agréés par l&apos;administration DOU.</span>
        </div>
        <div className="strip-alert strip-alert-orange" style={{ marginTop: 2 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
          <span>Format identifiant : <strong>nom_agent + code_restaurant</strong> (ex: agent.ali__dou_01)</span>
        </div>
        <div className="strip-alert strip-alert-red" style={{ marginTop: 2 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⊗</span>
          <span>Les comptes sont activés selon validation de la Direction des Œuvres Universitaires.</span>
        </div>
      </div>

      {/* ── Main white card ── */}
      <div style={{
        width: "100%",
        maxWidth: 520,
        backgroundColor: "#ffffff",
        border: "1px solid #cccccc",
        borderRadius: 3,
        marginTop: 18,
        overflow: "hidden",
      }}>
        {/* Card header — gradient gray top band */}
        <div style={{
          background: "linear-gradient(180deg, #f9f9f9 0%, #f0f0f0 100%)",
          borderBottom: "1px solid #dddddd",
          padding: "22px 28px 18px",
          textAlign: "center",
        }}>
          {/* Logo mark */}
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg, #5cb85c 0%, #3a7a3a 100%)",
              borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}>
              <span style={{ color: "#fff", fontSize: 20 }}>🍽</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#2a5a2a", letterSpacing: 1 }}>
                IntelliCanteen
              </div>
              <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>
                Système de Prévision de la Demande
              </div>
            </div>
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, color: "#444", marginTop: 10 }}>
            Portail Agent de Restaurant
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Plateforme IA de Gestion des Repas Universitaires
          </div>
        </div>

        {/* Card body — form */}
        <div style={{ padding: "20px 28px 24px" }}>

          {/* Error box — red like PROGRES */}
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 14, borderRadius: 2 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⊗</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn}>
            {/* Username */}
            <div style={{ marginBottom: 12 }}>
              <div className="progres-input-wrap">
                <input
                  id="login-username"
                  type="text"
                  className="progres-input"
                  placeholder="Nom d'utilisateur ou Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <span className="progres-input-icon">
                  <User size={14} />
                </span>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 12 }}>
              <div className="progres-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="progres-input"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="progres-input-icon"
                  style={{
                    pointerEvents: "auto",
                    cursor: "pointer",
                    background: "#f5f5f5",
                    border: "none",
                    borderLeft: "1px solid #bbbbbb",
                  }}
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Canteen combobox */}
            <div style={{ marginBottom: 16, position: "relative" }}>
              <button
                id="canteen-select-btn"
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  width: "100%",
                  height: 34,
                  padding: "6px 36px 6px 10px",
                  backgroundColor: "#fff",
                  border: "1px solid #bbbbbb",
                  borderRadius: 2,
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: selectedObj ? "#333" : "#999",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {selectedObj
                    ? `${selectedObj.code}__${selectedObj.name}`
                    : "Sélectionner le restaurant..."}
                </span>
                <ChevronDown size={13} color="#888" style={{ flexShrink: 0 }} />
              </button>

              {isDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 999,
                  backgroundColor: "#fff",
                  border: "1px solid #bbbbbb",
                  borderTop: "none",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                  maxHeight: 200,
                  overflowY: "auto",
                }}>
                  {CANTEENS.map((c) => {
                    const val = `${c.code}__${c.name}`;
                    const isSelected = selectedCanteen === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setSelectedCanteen(val); setIsDropdownOpen(false); }}
                        style={{
                          width: "100%",
                          padding: "7px 12px",
                          textAlign: "left",
                          border: "none",
                          borderBottom: "1px solid #f0f0f0",
                          backgroundColor: isSelected ? "#d9edf7" : "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: isSelected ? "#31708f" : "#333",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
                        }}
                      >
                        {isSelected && <CheckCircle size={12} color="#5bc0de" />}
                        <span style={{ marginLeft: isSelected ? 0 : 20 }}>
                          <span style={{ color: "#4cae4c", fontWeight: 600 }}>{c.code}</span>
                          <span style={{ color: "#999" }}>__</span>
                          <span style={{ color: "#333" }}>{c.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sign-in button — green PROGRES style */}
            <button
              id="signin-btn"
              type="submit"
              disabled={isLoading}
              className="btn-progres-green"
              style={{ width: "auto", minWidth: 140 }}
            >
              🔐 Se connecter
            </button>
          </form>
        </div>

        {/* Card footer — gray bar like PROGRES */}
        <div style={{
          backgroundColor: "#f5f5f5",
          borderTop: "1px solid #dddddd",
          padding: "10px 28px",
          textAlign: "center",
        }}>
          <a href="#" style={{ color: "#337ab7", fontSize: 12, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Mot de passe oublié ?
          </a>
        </div>
      </div>

      {/* Copyright footer */}
      <div style={{ marginTop: 16, fontSize: 11, color: "#888", textAlign: "center" }}>
        Copyright 2025{" "}
        <strong style={{ color: "#337ab7" }}>
          Ministère de l&apos;Enseignement Supérieur et de la Recherche Scientifique
        </strong>
      </div>


    </div>
  );
}
