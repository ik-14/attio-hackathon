"use client";

import type { Lead } from "@/lib/types";

interface TimelineItem {
  text: string;
  time: string;
  isWin?: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function buildTimeline(lead: Lead): TimelineItem[] {
  const items: TimelineItem[] = [];
  const base = lead.lastTouchAt ?? new Date().toISOString();

  // Step 1: always discovered
  const sourceLabel =
    lead.source === "apollo"
      ? "Apollo"
      : lead.source === "attio_lookalike"
      ? "Attio lookalike"
      : lead.source;

  items.push({
    text: `Lead discovered via ${sourceLabel} — ${lead.icpMatchScore}% ICP match`,
    time: formatDate(base),
  });

  // Step 2: enrichment signal
  if (lead.enrichmentSignal) {
    items.push({
      text: `Enrichment signal: ${lead.enrichmentSignal}`,
      time: formatDate(base),
    });
  }

  // Step 3: outreach
  if (
    lead.sequenceStage === "outreach_sent" ||
    lead.sequenceStage === "engaged" ||
    lead.sequenceStage === "needs_review" ||
    lead.dealStage === "Contacted" ||
    lead.dealStage === "Meeting Booked"
  ) {
    items.push({
      text: "Email + postcard dispatched via Resend / Lob",
      time: formatDate(base),
    });
  }

  // Step 4: needs_review
  if (lead.sequenceStage === "needs_review") {
    items.push({
      text: "Postcard generated — awaiting your review before it goes to print",
      time: formatDate(base),
    });
  }

  // Step 5: postcardProofUrl
  if (lead.postcardProofUrl) {
    items.push({
      text: "Postcard proof ready — linked below",
      time: formatDate(base),
    });
  }

  // Step 6: engaged
  if (lead.sequenceStage === "engaged" || lead.dealStage === "Meeting Booked") {
    items.push({
      text: "Prospect replied / booking link clicked",
      time: formatDate(base),
    });
  }

  // Step 7: booked
  if (lead.dealStage === "Meeting Booked") {
    items.push({
      text: "Meeting booked — deal stage updated to Meeting Booked in Attio",
      time: formatDate(base),
      isWin: true,
    });
  }

  return items;
}

interface ActivityTimelineProps {
  lead: Lead;
}

export function ActivityTimeline({ lead }: ActivityTimelineProps) {
  const items = buildTimeline(lead);

  return (
    <div
      style={{
        position: "relative",
        marginLeft: 8,
        paddingTop: 2,
      }}
    >
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: 5,
          top: 6,
          bottom: 6,
          width: 2,
          background: "var(--strike-border)",
        }}
      />

      {items.map((item, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            paddingLeft: 28,
            paddingBottom: i < items.length - 1 ? 22 : 0,
            opacity: 0,
            transform: "translateX(8px)",
            animation: "strike-tl-in 0.4s ease forwards",
            animationDelay: `${i * 90}ms`,
          }}
        >
          {/* Dot */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: item.isWin
                ? "var(--strike-success)"
                : "var(--strike-primary)",
              border: "2px solid #fff",
              boxShadow: item.isWin
                ? "0 0 0 2px var(--strike-success-soft)"
                : "0 0 0 2px var(--strike-primary-soft)",
            }}
          />
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              lineHeight: 1.45,
              color: "var(--strike-text)",
            }}
          >
            {item.text}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--strike-text-faint)",
              marginTop: 3,
            }}
          >
            {item.time}
          </div>
        </div>
      ))}
    </div>
  );
}
