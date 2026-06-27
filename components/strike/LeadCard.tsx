"use client";

import type { Lead } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function avatarGradient(lead: Lead): string {
  return lead.source === "apollo"
    ? "linear-gradient(135deg, #5b4cf0, #7b6ff5)"
    : "linear-gradient(135deg, #00b3a4, #04cdb8)";
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  animationDelay?: number;
}

export function LeadCard({ lead, onClick, animationDelay = 0 }: LeadCardProps) {
  const sourceLabel = lead.source === "apollo" ? "Apollo" : "Lookalike";
  const isApollo = lead.source === "apollo";

  return (
    <div
      onClick={onClick}
      className="strike-animate-pop-in"
      style={{
        background: "var(--strike-surface)",
        border: "1px solid var(--strike-border)",
        borderRadius: "var(--strike-radius-md)",
        padding: 18,
        cursor: "pointer",
        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "both",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "var(--strike-shadow-md)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#d8d4f5";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--strike-border)";
      }}
    >
      {/* Top row: avatar + name */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: avatarGradient(lead),
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {initials(lead.name)}
        </div>
        <div>
          <div
            style={{ fontSize: 14.5, fontWeight: 700, color: "var(--strike-text)" }}
          >
            {lead.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--strike-text-faint)", marginTop: 1 }}>
            {lead.company}
          </div>
        </div>
      </div>

      {/* Bottom row: source badge + score */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 9px",
            borderRadius: 100,
            background: isApollo
              ? "var(--strike-primary-soft)"
              : "var(--strike-teal-soft)",
            color: isApollo ? "var(--strike-primary-dark)" : "#067468",
          }}
        >
          {sourceLabel}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "var(--strike-text)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--strike-primary)",
              display: "inline-block",
            }}
          />
          {lead.icpMatchScore}% match
        </span>
      </div>
    </div>
  );
}
