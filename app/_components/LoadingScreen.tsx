"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/lib/types";
import { getStatus } from "@/lib/api";
import { RadarLoader } from "@/components/strike/RadarLoader";

const PHRASES = [
  "Querying Apollo People Search…",
  "Scoring candidates against your ICP…",
  "Ranking matches by ICP fit…",
  "Enriching company signals via Tavily…",
  "Writing new records to Attio…",
  "Composing personalised outreach…",
];

interface Props {
  onLeadsFound: (leads: Lead[]) => void;
}

export default function LoadingScreen({ onLeadsFound }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  // Rotate phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        setFadeIn(true);
      }, 220);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Poll for leads — first check immediately, then every 3s
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const status = await getStatus();
      if (!cancelled && status.leads.length > 0) {
        onLeadsFound(status.leads);
        return;
      }
    }

    // Immediate check
    void check();

    const interval = setInterval(() => {
      void check();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onLeadsFound]);

  return (
    <div
      className="strike-animate-fade-up"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Animated background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, #f2f1fc 0%, #f7f7fb 55%, #eef9f7 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            filter: "blur(70px)",
            opacity: 0.45,
            background:
              "radial-gradient(circle, var(--strike-primary), transparent 70%)",
            top: -160,
            left: -120,
            animation: "strike-float-blob 14s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            filter: "blur(70px)",
            opacity: 0.45,
            background:
              "radial-gradient(circle, var(--strike-teal), transparent 70%)",
            bottom: -180,
            right: -140,
            animation: "strike-float-blob 14s ease-in-out infinite",
            animationDelay: "-6s",
          }}
        />
      </div>

      {/* Loading content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <RadarLoader />
        <div
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: "var(--strike-text)",
            marginBottom: 8,
          }}
        >
          Searching for your ICP
        </div>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--strike-text-soft)",
            opacity: fadeIn ? 1 : 0,
            transition: "opacity 0.22s",
          }}
        >
          {PHRASES[phraseIndex]}
        </div>
      </div>
    </div>
  );
}
