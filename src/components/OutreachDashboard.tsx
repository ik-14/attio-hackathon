import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  CheckCircle2,
  X,
  Play,
  Loader2,
  Sparkles,
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Send,
  Check,
  FileText,
  MapPin,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";

interface Lead {
  id: number;
  name: string;
  title: string;
  company: string;
  source: "apollo" | "lookalike";
  score: number;
  stage: number;
  postcard?: {
    hook: string;
    headline: string;
    personal_line: string;
    body: string;
    cta: string;
    gradient: string[];
  };
  activity: Array<{
    t: string;
    time: string;
    win?: boolean;
  }>;
}

interface OutreachDashboardProps {
  onExit: () => void;
}

const STAGES = ["Discovered", "Enriched", "Teaser sent", "Review postcard", "Mail sent", "Booked"];
const REVIEW_STAGE = 3;

export default function OutreachDashboard({ onExit }: OutreachDashboardProps) {
  // Navigation & Screens State
  const [screen, setScreen] = useState<"icp" | "loading" | "dashboard">("loading");
  const [activeTab, setActiveTab] = useState<"discovery" | "pipeline">("discovery");

  // ICP Form State
  const [targetTitles, setTargetTitles] = useState<string[]>(["VP Engineering", "Head of Sales"]);
  const [titleInput, setTitleInput] = useState("");
  const [industries, setIndustries] = useState<string[]>(["Software"]);
  const [industryInput, setIndustryInput] = useState("");
  const [selectedSize, setSelectedSize] = useState("51–200");

  // Leads Data State
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: 1,
      name: "Maya Chen",
      title: "VP Engineering",
      company: "Nova Robotics",
      source: "apollo",
      score: 92,
      stage: 5,
      postcard: {
        hook: "Nova Robotics closed a $6M seed and is opening a Shoreditch office",
        headline: "Saw the Shoreditch news",
        personal_line: "We noticed Nova Robotics just closed a $6M seed and is opening a Shoreditch office.",
        body: "Exciting season to be scaling the team — wanted to say hello before the calendar fills up.",
        cta: "Grab 15 minutes before the new office gets loud →",
        gradient: ["#2563eb", "#1d4ed8"],
      },
      activity: [
        { t: "Lead discovered via Apollo — 92% ICP match", time: "Mon 9:02am" },
        { t: "Enrichment signal: Nova Robotics closed $6M seed, opening a Shoreditch office", time: "Mon 9:14am" },
        { t: "Teaser email sent — content-free, no pitch", time: "Mon 11:30am" },
        { t: "Postcard generated — awaiting your review", time: "Tue 10:02am" },
        { t: "You approved the postcard — sending via Lob", time: "Tue 10:15am" },
        { t: "Mail piece sent — QR linked to personalised booking page", time: "Wed 8:05am" },
        { t: "Booking link clicked", time: "Thu 3:41pm" },
        { t: "Meeting booked — deal stage updated to Booked", time: "Thu 3:43pm", win: true },
      ],
    },
    {
      id: 2,
      name: "Daniel Ortiz",
      title: "Head of Sales",
      company: "Brightline Logistics",
      source: "lookalike",
      score: 87,
      stage: 4,
      postcard: {
        hook: "Brightline Logistics is hiring 12 ops roles",
        headline: "Saw the hiring push",
        personal_line: "We noticed Brightline Logistics is opening 12 ops roles this quarter.",
        body: "Scaling ops teams usually means scaling outreach too — thought it was a good moment to say hi.",
        cta: "Worth 15 minutes before the headcount lands? →",
        gradient: ["#059669", "#047857"],
      },
      activity: [
        { t: "Lead discovered via Attio lookalike — 87% match to closed-won deals", time: "Mon 9:05am" },
        { t: "Enrichment signal: Brightline Logistics hiring 12 ops roles", time: "Mon 9:20am" },
        { t: "Teaser email sent — no reply after 2 days", time: "Mon 11:35am" },
        { t: "Postcard generated — awaiting your review", time: "Tue 10:05am" },
        { t: "You approved the postcard — sending via Lob", time: "Tue 10:20am" },
        { t: "Mail piece sent — QR linked to personalised booking page", time: "Wed 8:10am" },
      ],
    },
    {
      id: 3,
      name: "Priya Shah",
      title: "COO",
      company: "Fernweh Travel",
      source: "apollo",
      score: 81,
      stage: 2,
      activity: [
        { t: "Lead discovered via Apollo — 81% ICP match", time: "Mon 9:08am" },
        { t: "Enrichment signal: Fernweh Travel launched new EU routes", time: "Mon 9:25am" },
        { t: "Teaser email sent — content-free, no pitch", time: "Mon 11:40am" },
      ],
    },
    {
      id: 4,
      name: "Tom Welsh",
      title: "VP Sales",
      company: "Atlas Builders",
      source: "apollo",
      score: 78,
      stage: 1,
      activity: [
        { t: "Lead discovered via Apollo — 78% ICP match", time: "Mon 9:11am" },
        { t: "Enrichment signal: Atlas Builders posted 6 new senior roles", time: "Mon 9:29am" },
      ],
    },
    {
      id: 5,
      name: "Sofia Martins",
      title: "Head of Marketing",
      company: "Holden & Co",
      source: "apollo",
      score: 85,
      stage: 3,
      postcard: {
        hook: "Holden & Co just opened a Berlin studio",
        headline: "Saw Berlin's on the map",
        personal_line: "We noticed Holden & Co's new Berlin studio — exciting season for the team.",
        body: "New markets usually mean new partners too. Thought it was a good moment to introduce ourselves.",
        cta: "Worth 15 minutes before the team gets swamped? →",
        gradient: ["#d97706", "#b45309"],
      },
      activity: [
        { t: "Lead discovered via Apollo — 85% ICP match", time: "Mon 9:18am" },
        { t: "Enrichment signal: Holden & Co opened a new Berlin studio", time: "Mon 9:33am" },
        { t: "Teaser email sent — content-free, no pitch", time: "Mon 11:45am" },
        { t: "Postcard generated — awaiting your review", time: "Tue 9:50am" },
      ],
    },
  ]);

  // UI Detail Panel State
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Postcard Review Modal State
  const [reviewLeadId, setReviewLeadId] = useState<number | null>(null);

  // Loading Screen Subtitles Sequence
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const loadingPhrases = [
    "Querying Apollo People Search…",
    "Scoring candidates against closed-won deals…",
    "Ranking matches by ICP fit…",
    "Writing new records to Attio…",
  ];

  // Toast notifications State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Confetti particles state
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; top: number; color: string; delay: number; angle: number }>>([]);

  // Toast effect timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Loading screen text cycle effect
  useEffect(() => {
    if (screen === "loading") {
      const interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 700);

      const finishTimer = setTimeout(() => {
        clearInterval(interval);
        setScreen("dashboard");
        showToast("✓ Search complete. 5 high-value leads imported directly to Attio.");
      }, 2600);

      return () => {
        clearInterval(interval);
        clearTimeout(finishTimer);
      };
    }
  }, [screen]);

  // Toast trigger helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Add ICP target chips
  const handleAddTitle = (e: FormEvent) => {
    e.preventDefault();
    if (titleInput.trim() && !targetTitles.includes(titleInput.trim())) {
      setTargetTitles([...targetTitles, titleInput.trim()]);
      setTitleInput("");
    }
  };

  const handleAddIndustry = (e: FormEvent) => {
    e.preventDefault();
    if (industryInput.trim() && !industries.includes(industryInput.trim())) {
      setIndustries([...industries, industryInput.trim()]);
      setIndustryInput("");
    }
  };

  const handleRemoveTitle = (t: string) => {
    setTargetTitles(targetTitles.filter((item) => item !== t));
  };

  const handleRemoveIndustry = (ind: string) => {
    setIndustries(industries.filter((item) => item !== ind));
  };

  // Run lead discovery now button
  const handleTriggerDiscoveryNow = () => {
    showToast("↻ Discovery job triggered — Strike is searching for new leads");
  };

  // Start Discovery transition
  const handleStartDiscovery = () => {
    setLoadingPhraseIndex(0);
    setScreen("loading");
  };

  // Postcard approve helper
  const handleApprovePostcard = () => {
    if (reviewLeadId === null) return;
    const lead = leads.find((l) => l.id === reviewLeadId);
    if (!lead) return;

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === reviewLeadId) {
          return {
            ...l,
            stage: STAGES.indexOf("Mail sent"),
            activity: [
              ...l.activity,
              { t: "You approved the postcard — sending via Lob", time: "Just now" },
            ],
          };
        }
        return l;
      })
    );

    showToast(`✓ Approved — ${lead.name}'s postcard is sending via Lob`);
    setReviewLeadId(null);
  };

  const handleRequestChanges = () => {
    if (reviewLeadId === null) return;
    const lead = leads.find((l) => l.id === reviewLeadId);
    setReviewLeadId(null);
    if (lead) {
      showToast(`Flagged for changes — Strike will regenerate ${lead.name}'s postcard`);
    }
  };

  const reviewPendingLeads = leads.filter((l) => l.stage === REVIEW_STAGE);
  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const reviewLead = leads.find((l) => l.id === reviewLeadId);

  // Generate simple mock QR divs
  const renderFakeQR = (seed: number) => {
    const cells = [];
    let s = seed * 9301 + 49297;
    for (let i = 0; i < 49; i++) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      let on = false;
      if ((row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3)) {
        on = true;
      } else {
        s = (s * 9301 + 49297) % 233280;
        on = s / 233280 > 0.5;
      }
      cells.push(<div key={i} className={`h-full w-full rounded-[1px] ${on ? "bg-white" : "bg-transparent"}`} />);
    }
    return <div className="grid grid-cols-7 grid-rows-7 w-[64px] h-[64px] bg-black p-1 border border-white/10 rounded-md">{cells}</div>;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  // Burst confetti effects
  const triggerConfetti = () => {
    const list = [];
    const colors = ["#ffffff", "#d4d4d8", "#71717a", "#a1a1aa", "#e4e4e7"];
    for (let i = 0; i < 40; i++) {
      list.push({
        id: i,
        left: 20 + Math.random() * 60, // percentage from left
        top: -10 - Math.random() * 20, // percentage from top
        color: colors[i % colors.length],
        delay: Math.random() * 0.4,
        angle: Math.random() * 360,
      });
    }
    setConfetti(list);
    setTimeout(() => setConfetti([]), 3500);
  };

  useEffect(() => {
    // Trigger confetti if there is a booked stage
    if (screen === "dashboard" && activeTab === "pipeline") {
      triggerConfetti();
    }
  }, [screen, activeTab]);

  return (
    <div className="bg-black text-white min-h-screen relative font-body selection:bg-white selection:text-black overflow-x-hidden">
      {/* Background atmospheric glows matching landing page */}
      <div className="cinematic-bg fixed inset-0 pointer-events-none z-0 opacity-40" />
      <div className="atmosphere-glow atmosphere-glow-left fixed pointer-events-none" />
      <div className="atmosphere-glow atmosphere-glow-right fixed pointer-events-none" />

      {/* High-definition custom background visual fitting the window - Original color, no zoom */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-no-repeat opacity-20"
        style={{ backgroundImage: "url('/images/strike_bg.jpg')", backgroundSize: "contain", backgroundPosition: "center" }}
      />
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.85)] z-20" />

      {/* Screen 1: ICP Screen */}
      <AnimatePresence mode="wait">
        {screen === "icp" && (
          <motion.section
            key="icp-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="relative z-20 min-h-screen flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-lg liquid-glass rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
              {/* Back button */}
              <button
                onClick={onExit}
                className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-body font-light"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Exit Setup
              </button>

              {/* Logo / Brand Header */}
              <div className="flex flex-col items-center text-center mt-6 mb-8">
                <div className="w-14 h-14 rounded-xl bg-white border border-white flex items-center justify-center shadow-xl mb-4 text-black">
                  <Sparkles className="h-7 w-7 text-black animate-pulse" />
                </div>
                <h1 className="text-3xl font-heading italic text-white tracking-tight">
                  Strike
                </h1>
                <p className="text-sm text-white/50 font-body font-light mt-1">
                  Autonomous outreach for Attio
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/15 text-white/80 text-xs px-3 py-1 rounded-full font-body font-light">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                  ✓ Connected to Lumen Studio
                </div>
              </div>

              {/* Content Form */}
              <h1 className="text-3xl font-heading italic text-white text-center leading-tight tracking-tight mb-2">
                Who are you chasing?
              </h1>
              <p className="text-xs text-white/60 font-body font-light text-center leading-relaxed max-w-sm mx-auto mb-8">
                Strike combines this with a lookalike model of deals you've already won.
              </p>

              {/* Input 1: Target Titles */}
              <div className="mb-6 text-left">
                <label className="block text-xs font-semibold text-white/75 mb-2 font-body tracking-wider uppercase">
                  Target titles
                </label>
                <form onSubmit={handleAddTitle} className="relative">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Type a title and press Enter"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.04] transition-colors font-body"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                {/* Title Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {targetTitles.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/15 text-white/80 text-xs font-body font-light px-2.5 py-1 rounded-full"
                    >
                      {t}
                      <button
                        onClick={() => handleRemoveTitle(t)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {targetTitles.length === 0 && (
                    <span className="text-xs text-white/30 italic font-body font-light">No target titles added</span>
                  )}
                </div>
              </div>

              {/* Input 2: Industries */}
              <div className="mb-6 text-left">
                <label className="block text-xs font-semibold text-white/75 mb-2 font-body tracking-wider uppercase">
                  Industries
                </label>
                <form onSubmit={handleAddIndustry} className="relative">
                  <input
                    type="text"
                    value={industryInput}
                    onChange={(e) => setIndustryInput(e.target.value)}
                    placeholder="Type an industry and press Enter"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.04] transition-colors font-body"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                {/* Industry Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {industries.map((ind) => (
                    <span
                      key={ind}
                      className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/15 text-white/80 text-xs font-body font-light px-2.5 py-1 rounded-full"
                    >
                      {ind}
                      <button
                        onClick={() => handleRemoveIndustry(ind)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {industries.length === 0 && (
                    <span className="text-xs text-white/30 italic font-body font-light">No industries added</span>
                  )}
                </div>
              </div>

              {/* Input 3: Company size chips */}
              <div className="mb-8 text-left">
                <label className="block text-xs font-semibold text-white/75 mb-2.5 font-body tracking-wider uppercase">
                  Company size
                </label>
                <div className="flex flex-wrap gap-2">
                  {["1–50", "51–200", "201–1000", "1000+"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-full border text-xs font-body font-medium tracking-tight transition-all active:scale-95 backdrop-blur-md ${
                        selectedSize === size
                          ? "bg-white/15 border-white/30 text-white shadow-md"
                          : "bg-white/[0.02] border-white/10 text-white/50 hover:text-white hover:border-white/25"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={handleStartDiscovery}
                disabled={targetTitles.length === 0 && industries.length === 0}
                className="w-full liquid-glass-strong disabled:opacity-40 disabled:cursor-not-allowed text-white font-body text-sm font-medium py-3.5 px-6 rounded-full flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg"
              >
                Start finding leads
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </motion.section>
        )}

        {/* Screen 2: Loading State Radar Screen */}
        {screen === "loading" && (
          <motion.section
            key="loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 min-h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
              {/* Radar Rings */}
              <div className="absolute inset-0 border border-white/5 rounded-full animate-[ping_2.5s_linear_infinite]" />
              <div className="absolute inset-4 border border-white/10 rounded-full animate-[ping_2s_linear_infinite_0.4s]" />
              <div className="absolute inset-8 border border-white/15 rounded-full animate-[ping_1.5s_linear_infinite_0.8s]" />
              <div className="absolute inset-12 border border-white/10 rounded-full" />
              {/* Spinning sweeping line */}
              <div className="absolute inset-0 rounded-full border border-white/10 animate-spin" style={{ animationDuration: "3s" }}>
                <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-gradient-to-t from-transparent to-white/40" />
              </div>
              {/* Core Pulsing Point */}
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-xl shadow-white/5 relative z-10 animate-pulse backdrop-blur-md">
                <Search className="h-5 w-5 text-white" />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-heading italic text-white tracking-tight mb-3">
              Searching for your ICP
            </h1>
            <div className="text-base text-white/60 font-body font-light h-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/70 mr-2.5" />
              <span>{loadingPhrases[loadingPhraseIndex]}</span>
            </div>
          </motion.section>
        )}

        {/* Screen 3: Full Dashboard Page */}
        {screen === "dashboard" && (
          <motion.div
            key="dashboard-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-20 min-h-screen flex text-white font-body"
          >
            {/* Confetti Container */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              {confetti.map((c) => (
                <div
                  key={c.id}
                  className="absolute w-2 h-4 rounded-sm animate-[fall_3s_ease-out_forwards]"
                  style={{
                    left: `${c.left}%`,
                    top: `-10px`,
                    backgroundColor: c.color,
                    transform: `rotate(${c.angle}deg)`,
                    animationDelay: `${c.delay}s`,
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>

            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-white/5 bg-[#08080c]/25 backdrop-blur-md p-6 flex flex-col justify-between hidden md:flex">
              <div>
                {/* Brand Logo */}
                <div className="flex items-center gap-3.5 mb-10 px-2">
                  <div className="w-11 h-11 rounded-xl bg-white border border-white flex items-center justify-center shadow-lg text-black">
                    <Sparkles className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <h1 className="text-xl font-heading italic text-white tracking-tight">
                      Strike
                    </h1>
                    <p className="text-xs text-white/50 font-body mt-0.5">Outreach Workspace</p>
                  </div>
                </div>

                {/* Links */}
                <nav className="flex flex-col gap-1">
                  <button
                    onClick={() => setActiveTab("discovery")}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === "discovery"
                        ? "text-white bg-white/[0.05] border border-white/10"
                        : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <Search className="h-4 w-4" />
                    Discovery
                  </button>
                  <button
                    onClick={() => setActiveTab("pipeline")}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === "pipeline"
                        ? "text-white bg-white/[0.05] border border-white/10"
                        : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      Pipeline
                    </span>
                    {reviewPendingLeads.length > 0 && (
                      <span className="bg-white text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                        {reviewPendingLeads.length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>

              {/* Sidebar Footer */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center gap-2 px-2 text-xs font-body font-light text-white/50 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                  Lumen Studio · agent running
                </div>
                <button
                  onClick={onExit}
                  className="w-full text-left text-xs text-red-400/70 hover:text-red-400 font-body font-light flex items-center gap-2 px-2 mt-1 transition-colors py-1.5 rounded-lg hover:bg-red-500/[0.02]"
                >
                  <X className="h-3 w-3" />
                  Exit Dashboard
                </button>
              </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-black/40">
              {/* Topbar Header */}
              <header className="border-b border-white/5 bg-[#08080c]/50 backdrop-blur-md px-8 py-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl md:text-4xl font-heading italic text-white tracking-tight">
                    {activeTab === "discovery" ? "Discovery" : "Pipeline"}
                  </h1>
                  <p className="text-sm md:text-base text-white/50 font-body font-light mt-1.5">
                    {activeTab === "discovery"
                      ? "New leads matched against your ICP"
                      : "Where every lead stands, autonomously"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleTriggerDiscoveryNow}
                    className="liquid-glass text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all font-body"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Run discovery now
                  </button>

                  <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/15 text-white/80 text-xs px-3 py-1.5 rounded-full font-body">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                    Agent running
                  </div>

                  {/* Mobile Back / Exit Trigger */}
                  <button
                    onClick={onExit}
                    className="md:hidden text-white/50 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
                {/* Mobile Tab Toggle */}
                <div className="flex md:hidden bg-white/[0.02] border border-white/5 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setActiveTab("discovery")}
                    className={`flex-1 text-center py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "discovery" ? "bg-white/[0.05] text-white" : "text-white/40"
                    }`}
                  >
                    Discovery
                  </button>
                  <button
                    onClick={() => setActiveTab("pipeline")}
                    className={`flex-1 text-center py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "pipeline" ? "bg-white/[0.05] text-white" : "text-white/40"
                    }`}
                  >
                    Pipeline ({reviewPendingLeads.length})
                  </button>
                </div>

                {/* Tab 1: Discovery Grid */}
                {activeTab === "discovery" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leads.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          if (l.stage === REVIEW_STAGE) {
                            setReviewLeadId(l.id);
                          } else {
                            setSelectedLeadId(l.id);
                          }
                        }}
                        className="liquid-glass rounded-2xl p-6 border border-white/15 hover:border-white/30 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.6)] cursor-pointer hover:-translate-y-1 relative group overflow-hidden"
                      >
                        {/* Soft glow in corner */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all" />

                        {/* Top Profile block */}
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-heading font-semibold text-black bg-white border border-white shadow-md">
                            {getInitials(l.name)}
                          </div>
                          <div>
                            <h3 className="font-heading italic text-lg md:text-xl text-white group-hover:text-white/90 transition-colors">
                              {l.name}
                            </h3>
                            <p className="text-sm text-white/50 font-body font-light mt-0.5">
                              {l.title} · {l.company}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Stats block */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                          <span className="text-xs font-bold font-mono px-3 py-1.5 rounded-full uppercase tracking-wider bg-white text-black shadow-md border border-white">
                            {l.source === "apollo" ? "Apollo" : "Lookalike"}
                          </span>

                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white text-black px-3 py-1.5 rounded-full shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-black/60 shadow-md animate-pulse" />
                            {l.score}% match
                          </span>
                        </div>

                        {/* Stage flag if pending review */}
                        {l.stage === REVIEW_STAGE && (
                          <div className="absolute top-3 right-3 bg-white text-black text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-lg">
                            Review Required
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 2: Pipeline List */}
                {activeTab === "pipeline" && (
                  <div className="flex flex-col gap-6">
                    {/* Review Banner */}
                    {reviewPendingLeads.length > 0 && (
                      <div className="bg-white border border-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-black shadow-2xl">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center text-black shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-heading italic text-black text-base">
                              {reviewPendingLeads.length} Postcard{reviewPendingLeads.length > 1 ? "s" : ""} Awaiting Review
                            </h4>
                            <p className="text-xs text-black/60 font-body font-light mt-0.5 leading-relaxed">
                              Review generated postcard mockups before they are printed and mailed via Lob.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setReviewLeadId(reviewPendingLeads[0].id)}
                          className="bg-black text-white hover:scale-105 hover:bg-black/90 font-body text-xs font-medium px-5 py-2.5 rounded-full self-start sm:self-center shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                        >
                          Review now →
                        </button>
                      </div>
                    )}

                    {/* Pipeline Rows */}
                    <div className="flex flex-col gap-4">
                      {leads.map((l) => {
                        const isBooked = l.stage === STAGES.length - 1;
                        const isReview = l.stage === REVIEW_STAGE;

                        return (
                          <div
                            key={l.id}
                            onClick={() => {
                              if (isReview) {
                                setReviewLeadId(l.id);
                              } else {
                                setSelectedLeadId(l.id);
                              }
                            }}
                            className="liquid-glass rounded-2xl p-6 border border-white/10 hover:border-white/25 transition-all shadow-md hover:shadow-lg cursor-pointer flex flex-col gap-6"
                          >
                            {/* Row Header Block */}
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-semibold text-black bg-white border border-white shadow-md">
                                  {getInitials(l.name)}
                                </div>
                                <div>
                                  <h3 className="font-heading italic text-lg md:text-xl text-white">
                                    {l.name}
                                  </h3>
                                  <p className="text-sm text-white/50 font-body font-light">
                                    {l.company}
                                  </p>
                                </div>
                              </div>

                              <div>
                                {isBooked ? (
                                  <span className="bg-white text-black text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 font-body shadow-lg">
                                    <span className="h-1.5 w-1.5 rounded-full bg-black/60 shadow-md animate-pulse" />
                                    🎉 Booked
                                  </span>
                                ) : isReview ? (
                                  <span className="bg-white text-black text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 font-body shadow-lg">
                                    <span className="h-1.5 w-1.5 rounded-full bg-black/60 shadow-md animate-pulse" />
                                    🖼️ Awaiting review
                                  </span>
                                ) : (
                                  <span className="bg-white text-black text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 font-body shadow-lg">
                                    <span className="h-1.5 w-1.5 rounded-full bg-black/60 shadow-md animate-pulse" />
                                    🚀 {STAGES[l.stage]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Row Progress Stepper */}
                            <div>
                              <div className="flex items-center w-full">
                                {STAGES.map((s, index) => {
                                  const filled = index < l.stage;
                                  const current = index === l.stage;

                                  return (
                                    <div key={s} className="flex-1 flex items-center last:flex-none">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                          filled
                                            ? "bg-white border-white text-black shadow-md"
                                            : current
                                            ? "bg-white border-white text-black shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                                            : "bg-white/[0.02] border-white/10 text-white/20"
                                        }`}
                                      >
                                        {filled ? (
                                          <Check className="h-3 w-3 stroke-[3px] text-black" />
                                        ) : current ? (
                                          <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                                        ) : (
                                          <span className="text-[10px] font-bold font-mono text-white/30">
                                            {index + 1}
                                          </span>
                                        )}
                                      </div>

                                      {index < STAGES.length - 1 && (
                                        <div className="flex-1 h-0.5 bg-white/5 mx-2 relative rounded">
                                          <div
                                            className="absolute inset-y-0 left-0 bg-white/40 transition-all duration-700"
                                            style={{ width: index < l.stage ? "100%" : "0%" }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex justify-between mt-3 text-xs font-bold font-mono tracking-wider text-white/40">
                                {STAGES.map((s, index) => (
                                  <span
                                    key={s}
                                    className={`${index === l.stage ? "text-white font-extrabold" : ""}`}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Detail Sidebar Drawer */}
      <AnimatePresence>
        {selectedLeadId !== null && selectedLead && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLeadId(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#08080c]/95 border-l border-white/5 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header close */}
                <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-6">
                  <span className="text-xs font-bold font-mono tracking-wider text-white/40 uppercase">
                    Lead File
                  </span>
                  <button
                    onClick={() => setSelectedLeadId(null)}
                    className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Lead Profile overview */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-semibold text-black bg-white border border-white shadow-md text-lg">
                    {getInitials(selectedLead.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-heading italic text-white leading-tight">
                      {selectedLead.name}
                    </h3>
                    <p className="text-xs text-white/50 font-body font-light mt-0.5">
                      {selectedLead.title} · {selectedLead.company}
                    </p>
                  </div>
                </div>

                {/* Score & Source badges */}
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/[0.04] text-white/70 border border-white/10">
                    {selectedLead.source === "apollo" ? "Apollo" : "Lookalike"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    {selectedLead.score}% match
                  </span>
                </div>

                {/* Attio activity logs Timeline */}
                <h4 className="text-xs font-semibold text-white/70 mb-4 tracking-wider uppercase font-body">
                  Attio activity log
                </h4>

                <div className="relative border-l border-white/5 pl-5 ml-2.5 space-y-6">
                  {selectedLead.activity.map((act, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <div
                        className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border border-black ${
                          act.win
                            ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            : "bg-white/40"
                        }`}
                      />
                      <p className="text-xs text-white/90 leading-normal font-body">
                        {act.t}
                      </p>
                      <span className="text-[10px] text-white/30 font-mono block mt-1">
                        {act.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide-over Footer CTA buttons */}
              <div className="border-t border-white/5 pt-6 mt-8">
                <button
                  onClick={() => {
                    alert("This simulates redirecting to Attio for this lead.");
                  }}
                  className="w-full liquid-glass hover:scale-105 text-white text-xs font-medium py-3 px-5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  Open record in Attio
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Postcard Review Modal Overlay */}
      <AnimatePresence>
        {reviewLeadId !== null && reviewLead && reviewLead.postcard && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewLeadId(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#08080c] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl z-50 overflow-hidden"
            >
              {/* Header block */}
              <div className="flex items-start justify-between border-b border-white/5 pb-5 mb-6">
                <div>
                  <span className="bg-white text-black text-[9px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded shadow-md inline-block mb-1.5">
                    Awaiting Your Review
                  </span>
                  <h3 className="text-2xl font-heading italic text-white tracking-tight mt-1">
                    {reviewLead.name} · {reviewLead.company}
                  </h3>
                  <p className="text-sm text-white/50 font-body font-light mt-1">
                    Generated postcard — review before it goes to print.
                  </p>
                </div>
                <button
                  onClick={() => setReviewLeadId(null)}
                  className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Side-by-side Postcard render */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Front Side */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-white/30 uppercase">
                    Front
                  </span>
                  <div
                    className="aspect-[3/2] rounded-2xl relative overflow-hidden flex flex-col justify-between p-5 border border-white/5 shadow-lg shadow-black/40"
                    style={{
                      background: `linear-gradient(135deg, ${reviewLead.postcard.gradient[0]}, ${reviewLead.postcard.gradient[1]})`,
                    }}
                  >
                    {/* Small brand stamp/logo in upper left */}
                    <div className="self-start text-[10px] font-extrabold tracking-tight bg-white/90 text-black px-2 py-1 rounded">
                      {getInitials(reviewLead.company)}
                    </div>
                    {/* Centered headline */}
                    <h4 className="text-white font-heading italic text-xl leading-tight text-shadow max-w-xs">
                      {reviewLead.postcard.headline}
                    </h4>
                  </div>
                </div>

                {/* Back Side */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-white/30 uppercase">
                    Back
                  </span>
                  <div className="aspect-[3/2] rounded-2xl bg-white border border-white/10 p-4 shadow-lg text-black flex justify-between gap-3 overflow-hidden">
                    {/* Written message block */}
                    <div className="flex-1 flex flex-col justify-center gap-1.5 leading-relaxed text-left">
                      <p className="text-[10px] font-extrabold text-black font-body">
                        {reviewLead.postcard.personal_line}
                      </p>
                      <p className="text-[9px] text-zinc-600 font-body font-light">
                        {reviewLead.postcard.body}
                      </p>
                      <p className="text-[9px] font-extrabold text-zinc-900 font-body">
                        {reviewLead.postcard.cta}
                      </p>
                    </div>

                    {/* QR Code and stamps block */}
                    <div className="w-[66px] flex flex-col items-center justify-center gap-1.5 shrink-0">
                      {renderFakeQR(reviewLead.id)}
                      <span className="text-[8px] font-bold tracking-wider text-zinc-400 font-mono">
                        SCAN TO BOOK
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hook explanation banner */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 mb-8 text-xs font-body font-light leading-relaxed">
                <span className="text-white/40 block mb-1">Hook used:</span>
                <strong className="text-white font-medium">{reviewLead.postcard.hook}</strong>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-6">
                <button
                  onClick={handleRequestChanges}
                  className="liquid-glass hover:scale-105 text-white text-xs font-medium py-2.5 px-5 rounded-full transition-transform active:scale-95"
                >
                  Request changes
                </button>
                <button
                  onClick={handleApprovePostcard}
                  className="liquid-glass-strong hover:scale-105 text-white text-xs font-medium py-2.5 px-6 rounded-full flex items-center gap-1.5 transition-transform shadow-lg active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                  Approve & send
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Overlay System */}
      <AnimatePresence>
        {toastMessage !== null && (
          <motion.div
            initial={{ opacity: 0, y: 25, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 25, x: "-50%" }}
            className="fixed bottom-8 left-1/2 z-50 bg-[#0f0f15] border border-white/10 text-white rounded-full px-5 py-3 shadow-2xl flex items-center gap-2.5 text-xs font-medium font-body"
          >
            <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
