"use client";

import type { Lead } from "@/lib/types";
import { ActivityTimeline } from "./ActivityTimeline";
import { ExternalLink, X } from "lucide-react";

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

interface LeadDetailSheetProps {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadDetailSheet({ lead, onClose }: LeadDetailSheetProps) {
  const isOpen = lead !== null;
  const sourceLabel =
    lead?.source === "apollo"
      ? "Apollo"
      : lead?.source === "attio_lookalike"
      ? "Lookalike"
      : lead?.source ?? "";
  const isApollo = lead?.source === "apollo";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,16,40,.32)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s",
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: 420,
          maxWidth: "92vw",
          background: "var(--strike-surface)",
          boxShadow: "-30px 0 60px -20px rgba(40,30,90,.25)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(.2,.9,.3,1)",
          zIndex: 41,
          overflowY: "auto",
        }}
      >
        {lead && (
          <>
            {/* Header */}
            <div
              style={{
                padding: "26px 26px 20px",
                borderBottom: "1px solid var(--strike-border)",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  position: "absolute",
                  top: 22,
                  right: 22,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--strike-surface-2)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--strike-text-soft)",
                }}
              >
                <X size={15} />
              </button>

              {/* Avatar + Name */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: avatarGradient(lead),
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {initials(lead.name)}
                </div>
                <div>
                  <div
                    style={{ fontSize: 17, fontWeight: 800, color: "var(--strike-text)" }}
                  >
                    {lead.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--strike-text-faint)", marginTop: 1 }}>
                    {lead.company}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

            {/* Body */}
            <div style={{ padding: "22px 26px 40px" }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--strike-text-soft)",
                  marginBottom: 14,
                }}
              >
                Attio activity log
              </div>
              <ActivityTimeline lead={lead} />

              {/* Postcard proof link */}
              {lead.postcardProofUrl && (
                <div style={{ marginTop: 20 }}>
                  <a
                    href={lead.postcardProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--strike-primary)",
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={14} />
                    View postcard proof (PDF)
                  </a>
                </div>
              )}

              {/* Open in Attio */}
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={() => {
                    if (lead.attioRecordId) {
                      window.open(
                        `https://app.attio.com/records/${lead.attioRecordId}`,
                        "_blank"
                      );
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "12px 16px",
                    borderRadius: "var(--strike-radius-sm)",
                    border: "1px solid var(--strike-border)",
                    background: "transparent",
                    color: "var(--strike-text-soft)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <ExternalLink size={14} />
                  Open record in Attio ↗
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
