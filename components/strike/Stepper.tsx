"use client";

import type { Lead } from "@/lib/types";

const STEP_LABELS = ["Discovered", "Enriched", "Outreach", "Engaged", "Booked"];

function getStepIndex(lead: Lead): number {
  if (lead.dealStage === "Meeting Booked") return 4;
  switch (lead.sequenceStage) {
    case "engaged":       return 3;
    case "needs_review":  return 2;
    case "outreach_sent": return 2;
    case "enriched":      return 1;
    case "discovered":    return 0;
    default:              return 0;
  }
}

interface StepperProps {
  lead: Lead;
}

export function Stepper({ lead }: StepperProps) {
  const currentIdx = getStepIndex(lead);
  const isFullyBooked = lead.dealStage === "Meeting Booked";

  return (
    <div>
      {/* Dots + Lines */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {STEP_LABELS.map((_, i) => {
          const filled = isFullyBooked ? true : i < currentIdx;
          const current = !isFullyBooked && i === currentIdx;
          const isLast = i === STEP_LABELS.length - 1;

          return (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              {/* Dot */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                  transition: "all 0.5s ease",
                  background: filled
                    ? "var(--strike-primary)"
                    : current
                    ? "#fff"
                    : "var(--strike-surface-2)",
                  border: filled
                    ? "2px solid var(--strike-primary)"
                    : current
                    ? "2px solid var(--strike-primary)"
                    : "2px solid var(--strike-border)",
                  boxShadow: current
                    ? "0 0 0 4px var(--strike-primary-soft)"
                    : undefined,
                }}
              >
                {filled && (
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 10, height: 10 }}>
                    <path
                      d="M4 12L10 18L20 6"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {current && (
                  <div
                    className="strike-pulse-step"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--strike-primary)",
                    }}
                  />
                )}
              </div>

              {/* Connector line (not after last dot) */}
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: "var(--strike-border)",
                    margin: "0 2px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "var(--strike-primary)",
                      width:
                        isFullyBooked
                          ? "100%"
                          : i < currentIdx
                          ? "100%"
                          : "0%",
                      transition: "width 0.7s ease",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div style={{ display: "flex", marginTop: 9 }}>
        {STEP_LABELS.map((label, i) => {
          const isCurrent = !isFullyBooked && i === currentIdx;
          const isBookedStep = isFullyBooked && i === 4;
          return (
            <span
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 10.5,
                fontWeight: 600,
                color:
                  isCurrent || isBookedStep
                    ? "var(--strike-primary-dark)"
                    : "var(--strike-text-faint)",
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
