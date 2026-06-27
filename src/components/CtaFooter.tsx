import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import HlsVideo from "./HlsVideo";
import { ArrowUpRight, CheckCircle2, X, Play, Loader2, Sparkles, Send, Mail, Users, FileText } from "lucide-react";

export default function CtaFooter({ onRunAgent }: { onRunAgent?: () => void }) {
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  
  // High fidelity state for the "Describe what you sell" agent form
  const [pitchText, setPitchText] = useState("");
  const [agentStatus, setAgentStatus] = useState<"idle" | "running" | "completed">("idle");
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);

  const getLogsSequence = () => [
    "Initializing sales intelligence agent...",
    `Analyzing input: "${pitchText || "General outbound campaign"}"`,
    "Scanning global buyer registries for target indicators...",
    "Mapping target buyer personas & identifying decision makers...",
    "Filtering active targets matching the description...",
    "Drafting personalized multi-channel outbound message copy...",
    "Agent strategy completed successfully!"
  ];

  const runAgentSimulation = () => {
    const sequence = getLogsSequence();
    setAgentStatus("running");
    setAgentLogs([]);
    setLogIndex(0);

    let index = 0;
    const interval = setInterval(() => {
      if (index < sequence.length) {
        setAgentLogs((prev) => [...prev, sequence[index]]);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setAgentStatus("completed");
        }, 800);
      }
    }, 600);
  };

  return (
    <>
      <section
        id="contact"
        className="relative w-full min-h-[800px] flex flex-col justify-between overflow-hidden bg-black pt-32 pb-12 px-6 md:px-12 text-center"
      >
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none">
          <HlsVideo
            src="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Top and Bottom gradient fades (200px each) */}
        <div
          className="absolute top-0 left-0 right-0 h-[200px] z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, #000000, transparent)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[200px] z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #000000, transparent)",
          }}
        />

        {/* Main CTA Content */}
        <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center gap-6 my-auto">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white leading-[0.95] tracking-tight">
            Your next customer is waiting.
          </h2>

          <p className="text-white/60 font-body font-light text-sm md:text-base max-w-lg leading-relaxed mb-6">
            Describe what you sell and launch automated outbound campaigns in seconds.
          </p>

          {/* Interactive Agent Box (Directly Embedded & Highly Visual) */}
          <div className="w-full max-w-2xl liquid-glass rounded-2xl p-6 text-left border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Step label */}
            <div className="text-xs text-white/50 mb-3 font-body font-light flex items-center justify-between">
              <span>1 · Describe what you sell</span>
              <span className="text-white/30">Studio Agent Workspace</span>
            </div>

            {/* Input Box */}
            <textarea
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3.5 text-sm md:text-base text-white/95 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors font-body resize-none h-20 leading-relaxed"
              placeholder="Describe your target market and value proposition..."
            />

            {/* Action Row */}
            <div className="flex justify-end mt-4">
              {/* Run Agent Action Button */}
              <button
                onClick={onRunAgent || runAgentSimulation}
                className="bg-[#3b82f6] hover:bg-[#2563eb] active:scale-95 text-white rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] w-full md:w-auto"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run agent
              </button>
            </div>

            {/* Simulation overlay & results display */}
            <AnimatePresence>
              {agentStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/95 backdrop-blur-md z-30 p-6 flex flex-col justify-between"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase flex items-center gap-1.5 font-body">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Sales Agent Running
                    </span>
                    <button
                      onClick={() => setAgentStatus("idle")}
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Running state logs */}
                  {agentStatus === "running" && (
                    <div className="flex-grow flex flex-col justify-center gap-3 py-6 text-left max-w-lg mx-auto w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                        <span className="text-sm font-medium font-body text-white">Executing target search matrix...</span>
                      </div>
                      <div className="bg-black/50 rounded-xl p-4 border border-white/5 font-mono text-[11px] text-white/70 h-40 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
                        {agentLogs.map((log, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">&gt;</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed target campaigns overview */}
                  {agentStatus === "completed" && (
                    <div className="flex-grow overflow-y-auto py-4 scrollbar-thin flex flex-col gap-4 text-left">
                      <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-3.5 flex items-center gap-3 text-[#34d399] text-xs">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-semibold font-body">412 High-Value Leads Extracted</p>
                          <p className="text-white/50 font-light">Custom postcards and automated direct outreach templates are prepared.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Playbook Info */}
                        <div className="liquid-glass rounded-xl p-4 border border-white/5 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-white font-heading italic text-lg border-b border-white/5 pb-1.5">
                            <Users className="h-4 w-4 text-blue-400" />
                            Target Buyer Matrix
                          </div>
                          <ul className="text-xs text-white/70 font-body space-y-1.5 font-light">
                            <li>• <strong className="text-white font-medium">Primary:</strong> SaaS Founders & CEOs</li>
                            <li>• <strong className="text-white font-medium">Geography:</strong> UK, US (New York, SF, London)</li>
                            <li>• <strong className="text-white font-medium">Signals:</strong> Crunchbase updates, Fundraise post</li>
                            <li>• <strong className="text-white font-medium">Outreach:</strong> physical postcard + LinkedIn step</li>
                          </ul>
                        </div>

                        {/* Custom Copy Preview */}
                        <div className="liquid-glass rounded-xl p-4 border border-white/5 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-white font-heading italic text-lg border-b border-white/5 pb-1.5">
                            <FileText className="h-4 w-4 text-blue-400" />
                            Postcard Copy Draft
                          </div>
                          <p className="text-[11px] text-white/80 font-mono italic leading-relaxed">
                            "Hey Sarah - Congrats on the new seed round at Luminary! Since you're scaling in the US, I wanted to drop this postcard. We help B2B teams acquire clients via targeted physical outreach..."
                          </p>
                        </div>
                      </div>

                      {/* Launch Actions */}
                      <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-3">
                        <button
                          onClick={() => setAgentStatus("idle")}
                          className="bg-white/5 hover:bg-white/10 text-white font-body text-xs px-4 py-2 rounded-lg transition-colors"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => {
                            alert("Outbound agent sequence launched! Your campaign is now live.");
                            setAgentStatus("idle");
                          }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-body text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-lg transition-all"
                        >
                          <Send className="h-3 w-3" />
                          Launch Campaign
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Indicator Bar */}
                  <div className="text-[10px] text-white/30 font-body text-center border-t border-white/5 pt-2">
                    Running with secure, high-contrast privacy controls. Powered by Agent Studio.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Call-to-action buttons for manual schedule */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          </div>
        </div>

        {/* Footer bar */}
        <div className="relative z-20 w-full max-w-7xl mx-auto mt-32 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left */}
          <div className="text-white/40 text-xs font-body">
            &copy; 2026 KIXIZZ studio, all rights reserved.
          </div>

          {/* Right */}
          <div className="flex gap-6 text-white/40 text-xs font-body">
            <a href="#privacy" className="hover:text-white/80 transition-colors">
              Privacy
            </a>
            <a href="#terms" className="hover:text-white/80 transition-colors">
              Terms
            </a>
            <a href="#contact" className="hover:text-white/80 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </section>

      {/* Booking Form Modal Overlay containing the same high-fidelity screenshot tool layout */}
      <AnimatePresence>
        {isBookModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-xl liquid-glass-strong rounded-3xl p-6 md:p-8 text-left bg-black/60 border border-white/10 overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wider text-white/50 font-body font-semibold">
                    Launch Outbound
                  </span>
                  <h3 className="text-2xl font-heading italic text-white">
                    Agent Setup Environment
                  </h3>
                </div>

                {/* Highly structured target container resembling screenshot */}
                <div className="w-full liquid-glass rounded-xl p-5 text-left border border-white/10 relative overflow-hidden">
                  <div className="text-xs text-white/50 mb-3 font-body font-light">
                    1 · Describe what you sell
                  </div>

                  <textarea
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors font-body resize-none h-16 leading-relaxed"
                    placeholder="Describe your target market..."
                  />

                  <div className="flex justify-end pt-3 mt-3 border-t border-white/5">
                    <button
                      onClick={() => {
                        setIsBookModalOpen(false);
                        if (onRunAgent) {
                          onRunAgent();
                        } else {
                          runAgentSimulation();
                        }
                      }}
                      className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Run agent
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
