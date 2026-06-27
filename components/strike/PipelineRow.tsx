"use client";

import type { Lead } from "@/lib/types";
import { Stepper } from "./Stepper";

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

interface PipelineRowProps {
  lead: Lead;
  onClick: () => void;
  animationDelay?: number;
}

export function PipelineRow({ lead, onClick, animationDelay = 0 }: PipelineRowProps) {
  const isBooked = lead.dealStage === "Meeting Booked";
  const isReview = lead.sequenceStage === "needs_review";

  let rowBg = "var(--strike-surface)";
  let rowBorder = "var(--strike-border)";
  if (isBooked) {
    rowBg = "linear-gradient(0deg, #f4fcf8, #ffffff)";
    rowBorder = "#bfe9d6";
  } else if (isReview) {
    rowBg = "linear-gradient(0deg, #fff8ec, #ffffff)";
    rowBorder = "#f3dba9";
  }

  return (
    <div
      onClick={onClick}
      className="strike-animate-pop-in"
      style={{
        background: rowBg,
        border: `1px solid ${rowBorder}`,
        borderRadius: "var(--strike-radius-md)",
        padding: "16px 18px",
        marginBottom: 12,
        cursor: "pointer",
        transition: "box-shadow 0.18s, border-color 0.18s, transform 0.18s",
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "both",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--strike-shadow-md)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      {/* Top: who + tag */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: avatarGradient(lead),
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {initials(lead.name)}
          </div>
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 700, color: "var(--strike-text)" }}
            >
              {lead.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--strike-text-faint)" }}>
              {lead.company}
            </div>
          </div>
        </div>

        {isBooked && (
          <span
            style={{
              background: "var(--strike-success)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "5px 11px",
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            🎉 Booked
          </span>
        )}
        {isReview && !isBooked && (
          <span
            style={{
              background: "var(--strike-warn)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "5px 11px",
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            Review
          </span>
        )}
        {!isBooked && !isReview && (
          <span style={{ fontSize: 11.5, color: "var(--strike-text-faint)" }}>
            {lead.dealStage ?? lead.sequenceStage}
          </span>
        )}
      </div>

      {/* Stepper */}
      <Stepper lead={lead} />
    </div>
  );
}
