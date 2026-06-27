"use client";

import { useState, useCallback } from "react";
import type { Lead } from "@/lib/types";
import IcpChatScreen from "@/app/_components/IcpChatScreen";
import LoadingScreen from "@/app/_components/LoadingScreen";
import DashboardScreen from "@/app/_components/DashboardScreen";

type Phase = "chat" | "loading" | "dashboard";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("chat");
  const [initialLeads, setInitialLeads] = useState<Lead[]>([]);

  const handleDiscoveryStarted = useCallback(() => {
    setPhase("loading");
  }, []);

  const handleLeadsFound = useCallback((leads: Lead[]) => {
    setInitialLeads(leads);
    setPhase("dashboard");
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      {phase === "chat" && (
        <IcpChatScreen onDiscoveryStarted={handleDiscoveryStarted} />
      )}
      {phase === "loading" && (
        <LoadingScreen onLeadsFound={handleLeadsFound} />
      )}
      {phase === "dashboard" && (
        <DashboardScreen initialLeads={initialLeads} />
      )}
    </div>
  );
}
