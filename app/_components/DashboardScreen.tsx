"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Lead } from "@/lib/types";
import { getStatus, triggerJob } from "@/lib/api";
import { LeadCard } from "@/components/strike/LeadCard";
import { PipelineRow } from "@/components/strike/PipelineRow";
import { LeadDetailSheet } from "@/components/strike/LeadDetailSheet";
import { PostcardReviewDialog } from "@/components/strike/PostcardReviewDialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Search, Activity, RefreshCw } from "lucide-react";

type Tab = "discovery" | "pipeline";

interface Props {
  initialLeads: Lead[];
}

function BrandMark() {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background:
          "linear-gradient(135deg, var(--strike-primary), var(--strike-teal))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--strike-shadow-sm)",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}>
        <path
          d="M4 12L10 18L20 6"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function DashboardScreen({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeTab, setActiveTab] = useState<Tab>("discovery");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [reviewLead, setReviewLead] = useState<Lead | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const confettiFiredRef = useRef(false);

  // Poll every 3s
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await getStatus();
      setLeads(status.leads);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fire confetti on first booked lead
  useEffect(() => {
    if (!confettiFiredRef.current) {
      const hasBooked = leads.some((l) => l.dealStage === "Meeting Booked");
      if (hasBooked) {
        confettiFiredRef.current = true;
        void confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5, x: 0.65 },
          colors: ["#5b4cf0", "#00b3a4", "#e8a33d", "#16a37a", "#7b6ff5"],
        });
      }
    }
  }, [leads]);

  const reviewLeads = leads.filter((l) => l.sequenceStage === "needs_review");
  const reviewCount = reviewLeads.length;

  function handleLeadClick(lead: Lead) {
    if (lead.sequenceStage === "needs_review") {
      setReviewLead(lead);
    } else {
      setSelectedLead(lead);
    }
  }

  const handleRunJob = useCallback(
    async (job: "discover" | "enrich" | "outreach") => {
      setIsRunning(true);
      await triggerJob(job);
      const labels = {
        discover: "Discovery job triggered — searching for new leads",
        enrich: "Enrichment job triggered — researching leads",
        outreach: "Outreach job triggered — sending emails & postcards",
      };
      toast(labels[job]);
      setIsRunning(false);
    },
    []
  );

  const handleRunLeadJob = useCallback(
    async (job: "enrich" | "outreach", lead: Lead) => {
      setIsRunning(true);
      await triggerJob(job, lead.attioRecordId);
      toast(
        job === "enrich"
          ? `Enriching ${lead.name}…`
          : `Reaching out to ${lead.name} — email + postcard`
      );
      setIsRunning(false);
    },
    []
  );

  return (
    <div
      className="strike-animate-fade-up"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        background: "var(--strike-bg)",
      }}
    >
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 228,
          flexShrink: 0,
          background: "var(--strike-surface)",
          borderRight: "1px solid var(--strike-border)",
          padding: "22px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 6px",
            marginBottom: 30,
          }}
        >
          <BrandMark />
          <div
            style={{ fontWeight: 800, fontSize: 17, color: "var(--strike-text)" }}
          >
            Reachd
          </div>
        </div>

        {/* Nav items */}
        {(
          [
            {
              id: "discovery" as Tab,
              label: "Discovery",
              icon: <Search size={16} />,
              badge: null,
            },
            {
              id: "pipeline" as Tab,
              label: "Pipeline",
              icon: <Activity size={16} />,
              badge: reviewCount > 0 ? reviewCount : null,
            },
          ] as const
        ).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: "var(--strike-radius-sm)",
                fontSize: 13.5,
                fontWeight: 600,
                color: isActive
                  ? "var(--strike-primary-dark)"
                  : "var(--strike-text-soft)",
                background: isActive ? "var(--strike-primary-soft)" : "transparent",
                cursor: "pointer",
                marginBottom: 3,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "var(--strike-surface-2)";
                  (e.currentTarget as HTMLDivElement).style.color =
                    "var(--strike-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLDivElement).style.color =
                    "var(--strike-text-soft)";
                }
              }}
            >
              <span style={{ opacity: 0.8 }}>{item.icon}</span>
              {item.label}
              {item.badge !== null && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "var(--strike-warn)",
                    color: "#fff",
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 100,
                    lineHeight: 1.4,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            padding: "12px 12px 0",
            borderTop: "1px solid var(--strike-border)",
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              color: "var(--strike-text-faint)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
            }}
          >
            <span
              className="strike-pulse-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--strike-success)",
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            Reachd · agent running
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 30px",
            borderBottom: "1px solid var(--strike-border)",
            background: "var(--strike-surface)",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
                color: "var(--strike-text)",
              }}
            >
              {activeTab === "discovery" ? "Discovery" : "Pipeline"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--strike-text-faint)" }}>
              {activeTab === "discovery"
                ? "New leads matched against your ICP"
                : "Where every lead stands, autonomously"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Job buttons */}
            {activeTab === "pipeline" && (
              <>
                <button
                  onClick={() => void handleRunJob("enrich")}
                  disabled={isRunning}
                  style={runBtnStyle}
                >
                  Run enrich
                </button>
                <button
                  onClick={() => void handleRunJob("outreach")}
                  disabled={isRunning}
                  style={runBtnStyle}
                >
                  Run outreach
                </button>
              </>
            )}
            <button
              onClick={() => void handleRunJob("discover")}
              disabled={isRunning}
              style={{
                ...runBtnStyle,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              Run discovery now
            </button>

            {/* Agent running pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--strike-success-soft)",
                color: "var(--strike-success)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "7px 13px",
                borderRadius: 100,
              }}
            >
              <span
                className="strike-pulse-dot"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--strike-success)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              Agent running
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "26px 30px 40px",
          }}
        >
          {/* Discovery tab */}
          {activeTab === "discovery" && (
            <div
              className="strike-animate-fade-up"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))",
                gap: 16,
              }}
            >
              {leads.map((lead, i) => (
                <LeadCard
                  key={lead.attioRecordId}
                  lead={lead}
                  onClick={() => handleLeadClick(lead)}
                  animationDelay={i * 80}
                />
              ))}
              {leads.length === 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: "60px 0",
                    color: "var(--strike-text-faint)",
                    fontSize: 14,
                  }}
                >
                  No leads yet — discovery is running in the background.
                </div>
              )}
            </div>
          )}

          {/* Pipeline tab */}
          {activeTab === "pipeline" && (
            <div className="strike-animate-fade-up">
              {/* Review banner */}
              {reviewCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    background: "var(--strike-warn-soft)",
                    border: "1px solid #f3dba9",
                    borderRadius: "var(--strike-radius-md)",
                    padding: "14px 18px",
                    marginBottom: 18,
                    fontSize: 13.5,
                    color: "var(--strike-text)",
                  }}
                >
                  <div>
                    🖼️{" "}
                    <strong>
                      {reviewCount} postcard{reviewCount > 1 ? "s" : ""}
                    </strong>{" "}
                    ready for your review before {reviewCount > 1 ? "they're" : "it's"}{" "}
                    sent
                  </div>
                  <button
                    onClick={() => setReviewLead(reviewLeads[0]!)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "var(--strike-radius-sm)",
                      border: "none",
                      background:
                        "linear-gradient(135deg, var(--strike-primary), var(--strike-primary-dark))",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    Review now →
                  </button>
                </div>
              )}

              {leads.map((lead, i) => (
                <PipelineRow
                  key={lead.attioRecordId}
                  lead={lead}
                  onClick={() => handleLeadClick(lead)}
                  onRunJob={handleRunLeadJob}
                  busy={isRunning}
                  animationDelay={i * 80}
                />
              ))}
              {leads.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: "var(--strike-text-faint)",
                    fontSize: 14,
                  }}
                >
                  No leads in pipeline yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panels / Dialogs ─────────────────────────────────────────── */}
      <LeadDetailSheet
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
      <PostcardReviewDialog
        lead={reviewLead}
        onClose={() => setReviewLead(null)}
        onApproved={() => {
          // refresh leads after approval
          void getStatus().then((s) => setLeads(s.leads));
        }}
      />
    </div>
  );
}

const runBtnStyle: React.CSSProperties = {
  background: "var(--strike-surface-2)",
  color: "var(--strike-text)",
  border: "1px solid var(--strike-border)",
  fontSize: 12.5,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: "var(--strike-radius-sm)",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
};
