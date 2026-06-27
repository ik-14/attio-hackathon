"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import { approvePostcard, regenPostcard } from "@/lib/api";
import { toast } from "sonner";
import { X } from "lucide-react";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Deterministic fake QR grid (7×7) seeded by a number */
function fakeQrCells(seed: number): boolean[] {
  const cells: boolean[] = [];
  let s = seed * 9301 + 49297;
  for (let i = 0; i < 49; i++) {
    const row = Math.floor(i / 7);
    const col = i % 7;
    const isCorner =
      (row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3);
    if (isCorner) {
      cells.push(true);
    } else {
      s = ((s * 9301 + 49297) % 233280 + 233280) % 233280;
      cells.push(s / 233280 > 0.5);
    }
  }
  return cells;
}

const POSTCARD_GRADIENTS: Record<number, [string, string]> = {
  0: ["#5b4cf0", "#7b6ff5"],
  1: ["#00b3a4", "#04cdb8"],
  2: ["#e8a33d", "#f0c178"],
};

interface PostcardReviewDialogProps {
  lead: Lead | null;
  onClose: () => void;
  onApproved?: () => void;
}

export function PostcardReviewDialog({
  lead,
  onClose,
  onApproved,
}: PostcardReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const isOpen = lead !== null;

  if (!lead) {
    return (
      <>
        <div style={{ display: "none" }} />
      </>
    );
  }

  // Use record ID hash for gradient
  const gradIdx =
    lead.attioRecordId
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 3;
  const [g1, g2] = POSTCARD_GRADIENTS[gradIdx] ?? ["#5b4cf0", "#7b6ff5"];

  const qrCells = fakeQrCells(
    lead.attioRecordId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  );

  const headline = lead.enrichmentSignal
    ? `Saw: ${lead.enrichmentSignal.slice(0, 40)}…`
    : `Reaching out to ${lead.company}`;

  const bodyText = lead.enrichmentSignal
    ? `We noticed ${lead.enrichmentSignal}. This looked like a great moment to say hello.`
    : `We've been following ${lead.company}'s growth and thought it was a great time to connect.`;

  async function handleApprove() {
    if (!lead) return;
    setLoading(true);
    await approvePostcard(lead.attioRecordId);
    setLoading(false);
    toast.success(`Approved — ${lead.name}'s postcard is sending via Lob`);
    onApproved?.();
    onClose();
  }

  async function handleRequestChanges() {
    if (!lead) return;
    setLoading(true);
    await regenPostcard(lead.attioRecordId);
    setLoading(false);
    toast(`Flagged for changes — Reachd will regenerate ${lead.name}'s postcard`);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,16,40,.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s",
          zIndex: 55,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: 680,
          maxWidth: "92vw",
          background: "var(--strike-surface)",
          borderRadius: "var(--strike-radius-lg)",
          boxShadow: "var(--strike-shadow-lg)",
          padding: "30px 32px 28px",
          zIndex: 56,
          transform: isOpen
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.94)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "transform 0.28s cubic-bezier(.2,.9,.3,1), opacity 0.22s",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
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

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#9a6a16",
              background: "var(--strike-warn-soft)",
              padding: "5px 11px",
              borderRadius: 100,
              marginBottom: 10,
            }}
          >
            Awaiting your review
          </div>
          <h2
            style={{
              fontSize: 19,
              fontWeight: 800,
              margin: "0 0 2px",
              color: "var(--strike-text)",
            }}
          >
            {lead.name} · {lead.company}
          </h2>
          <p style={{ fontSize: 14, color: "var(--strike-text-soft)", margin: 0 }}>
            Generated postcard — review before it goes to print.
          </p>
        </div>

        {/* Postcard front + back */}
        <div style={{ display: "flex", gap: 18, marginBottom: 18 }}>
          {/* Front */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--strike-text-faint)",
                marginBottom: 7,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Front
            </div>
            <div
              style={{
                aspectRatio: "3/2",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                border: "1px solid var(--strike-border)",
                boxShadow: "var(--strike-shadow-sm)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-end",
                padding: 14,
              }}
            >
              {/* Logo */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: "rgba(255,255,255,.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--strike-text)",
                }}
              >
                {initials(lead.company)}
              </div>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  lineHeight: 1.3,
                  textShadow: "0 2px 10px rgba(0,0,0,.25)",
                }}
              >
                {headline}
              </div>
            </div>
          </div>

          {/* Back */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--strike-text-faint)",
                marginBottom: 7,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Back
            </div>
            <div
              style={{
                aspectRatio: "3/2",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid var(--strike-border)",
                boxShadow: "var(--strike-shadow-sm)",
                padding: 14,
                display: "flex",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "var(--strike-text)",
                    lineHeight: 1.3,
                  }}
                >
                  {bodyText.slice(0, 80)}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--strike-text-soft)",
                    lineHeight: 1.35,
                  }}
                >
                  Reaching out directly — thought it was worth a personalised note.
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: "var(--strike-primary-dark)",
                    marginTop: 2,
                  }}
                >
                  Grab 15 minutes before the calendar fills up →
                </div>
              </div>
              {/* Fake QR */}
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  marginLeft: 10,
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gridTemplateRows: "repeat(7, 1fr)",
                    background: "#fff",
                    border: "1px solid var(--strike-border)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  {qrCells.map((on, i) => (
                    <div
                      key={i}
                      style={{ background: on ? "#15131f" : "transparent" }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "var(--strike-text-faint)",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  SCAN TO BOOK
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hook box */}
        {lead.enrichmentSignal && (
          <div
            style={{
              background: "var(--strike-surface-2)",
              borderRadius: "var(--strike-radius-sm)",
              padding: "11px 14px",
              fontSize: 12.5,
              color: "var(--strike-text-soft)",
              marginBottom: 20,
            }}
          >
            <strong style={{ color: "var(--strike-text)" }}>Hook used: </strong>
            {lead.enrichmentSignal}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={handleRequestChanges}
            disabled={loading}
            style={{
              padding: "12px 18px",
              borderRadius: "var(--strike-radius-sm)",
              border: "1px solid var(--strike-border)",
              background: "transparent",
              color: "var(--strike-text-soft)",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            Request changes
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{
              padding: "12px 22px",
              borderRadius: "var(--strike-radius-sm)",
              border: "none",
              background:
                "linear-gradient(135deg, var(--strike-primary), var(--strike-primary-dark))",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 10px 24px -10px rgba(91,76,240,.6)",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {loading ? "Sending…" : "Approve & send →"}
          </button>
        </div>
      </div>
    </>
  );
}
