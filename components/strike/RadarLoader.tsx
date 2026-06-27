"use client";

export function RadarLoader() {
  return (
    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 26px" }}>
      {/* Ring 1 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid var(--strike-primary)",
          animation: "strike-radar-ping 1.8s ease-out infinite",
        }}
      />
      {/* Ring 2 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid var(--strike-teal)",
          animation: "strike-radar-ping 1.8s ease-out infinite",
          animationDelay: "0.6s",
        }}
      />
      {/* Ring 3 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid var(--strike-primary)",
          animation: "strike-radar-ping 1.8s ease-out infinite",
          animationDelay: "1.2s",
        }}
      />
      {/* Core */}
      <div
        style={{
          position: "absolute",
          inset: 38,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, var(--strike-primary), var(--strike-teal))",
          boxShadow: "0 0 0 0 rgba(91,76,240,.4)",
        }}
      />
    </div>
  );
}
