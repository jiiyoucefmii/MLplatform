"use client";

import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agentInfo, setAgentInfo] = useState<{
    username: string;
    canteen: string;
  } | null>(null);

  const handleLogin = (username: string, canteen: string) => {
    setAgentInfo({ username, canteen });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAgentInfo(null);
  };

  if (isAuthenticated && agentInfo) {
    return <Dashboard agentInfo={agentInfo} onLogout={handleLogout} />;
  }

  return <LoginPage onLogin={handleLogin} />;
}
