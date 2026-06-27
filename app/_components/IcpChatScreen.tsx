"use client";

import { useState, useEffect, useRef } from "react";
import type { Icp } from "@/lib/types";
import { getIcp, chatIcp, triggerJob } from "@/lib/api";
import { toast } from "sonner";
import { Send, ArrowRight } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

function IcpChips({ icp }: { icp: Icp }) {
  const chips: string[] = [
    ...icp.titles,
    ...icp.industries,
    `${icp.headcount[0]}–${icp.headcount[1]} employees`,
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
      {chips.map((chip, i) => (
        <span
          key={i}
          style={{
            background: "var(--strike-primary-soft)",
            color: "var(--strike-primary-dark)",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 100,
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

interface Props {
  onDiscoveryStarted: () => void;
}

export default function IcpChatScreen({ onDiscoveryStarted }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIcp, setCurrentIcp] = useState<Icp | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [icpConfirmed, setIcpConfirmed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const icp = await getIcp();
      setCurrentIcp(icp);
      const defaultDesc = [
        ...icp.titles.map((t) => `"${t}"`),
        "in",
        icp.industries.join(" / "),
        `(${icp.headcount[0]}–${icp.headcount[1]} employees)`,
      ].join(" ");
      setMessages([
        {
          role: "assistant",
          content: `Hi! I'm Reachd. Tell me who you want to reach — I've pre-filled some defaults from your Attio data.\n\nCurrently targeting: ${defaultDesc}.\n\nJust describe your ideal customer in plain English — or hit "Start finding leads" to go with the defaults.`,
        },
      ]);
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isSending) return;

    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsSending(true);

    const result = await chatIcp(text);
    setCurrentIcp(result.icp);
    setIcpConfirmed(true);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: result.reply },
    ]);
    setIsSending(false);
  }

  async function handleStart() {
    setIsStarting(true);
    const result = await triggerJob("discover");
    if (!result.ok) {
      // graceful: still transition (fixture will handle polling)
      console.warn("[Reachd] discover job returned ok=false, proceeding anyway");
    }
    toast("Discovery started — Reachd is searching for your ICP");
    onDiscoveryStarted();
  }

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

      {/* Chat card */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: 480,
          maxWidth: "92vw",
          background: "var(--strike-surface)",
          borderRadius: "var(--strike-radius-lg)",
          boxShadow: "var(--strike-shadow-lg)",
          border: "1px solid var(--strike-border)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
        }}
      >
        {/* Brand header */}
        <div
          style={{
            padding: "28px 32px 20px",
            borderBottom: "1px solid var(--strike-border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}
          >
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
            <div>
              <div
                style={{ fontWeight: 800, fontSize: 17, color: "var(--strike-text)" }}
              >
                Reachd
              </div>
              <div style={{ fontSize: 11.5, color: "var(--strike-text-faint)" }}>
                Autonomous outreach for Attio
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "11px 15px",
                  borderRadius:
                    msg.role === "user"
                      ? "16px 16px 4px 16px"
                      : "4px 16px 16px 16px",
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, var(--strike-primary), var(--strike-primary-dark))"
                      : "var(--strike-surface-2)",
                  color:
                    msg.role === "user" ? "#fff" : "var(--strike-text)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontWeight: msg.role === "user" ? 600 : 400,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* ICP chips after confirmation */}
          {icpConfirmed && currentIcp && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--strike-text-faint)",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Parsed ICP
              </div>
              <IcpChips icp={currentIcp} />
            </div>
          )}

          {/* Sending indicator */}
          {isSending && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  padding: "11px 15px",
                  borderRadius: "4px 16px 16px 16px",
                  background: "var(--strike-surface-2)",
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--strike-text-faint)",
                      animation: "strike-spin 1s linear infinite",
                      animationDelay: `${d * 0.15}s`,
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input + Start button */}
        <div
          style={{
            padding: "16px 24px 24px",
            borderTop: "1px solid var(--strike-border)",
            flexShrink: 0,
          }}
        >
          {/* Text input */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="e.g. Series B fintech startups, VP Sales, 50–500 employees…"
              rows={2}
              style={{
                width: "100%",
                padding: "11px 44px 11px 14px",
                borderRadius: "var(--strike-radius-sm)",
                border: "1.5px solid var(--strike-border)",
                fontSize: 14,
                fontFamily: "inherit",
                background: "var(--strike-surface-2)",
                color: "var(--strike-text)",
                outline: "none",
                resize: "none",
                lineHeight: 1.5,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--strike-primary)";
                e.currentTarget.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--strike-border)";
                e.currentTarget.style.background = "var(--strike-surface-2)";
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!inputValue.trim() || isSending}
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: inputValue.trim()
                  ? "var(--strike-primary)"
                  : "var(--strike-border)",
                color: "#fff",
                cursor: inputValue.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.18s",
              }}
            >
              <Send size={13} />
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={() => void handleStart()}
            disabled={isStarting}
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: "var(--strike-radius-sm)",
              border: "none",
              background:
                "linear-gradient(135deg, var(--strike-primary), var(--strike-primary-dark))",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: isStarting ? "default" : "pointer",
              opacity: isStarting ? 0.75 : 1,
              boxShadow: "0 10px 24px -10px rgba(91,76,240,.6)",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "opacity 0.15s, box-shadow 0.18s",
            }}
          >
            {isStarting ? (
              "Starting…"
            ) : (
              <>
                Start finding leads
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
