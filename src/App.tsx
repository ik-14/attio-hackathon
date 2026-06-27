import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import StartSection from "./components/StartSection";
import FeaturesGrid from "./components/FeaturesGrid";
import Stats from "./components/Stats";
import Testimonials from "./components/Testimonials";
import CtaFooter from "./components/CtaFooter";
import OutreachDashboard from "./components/OutreachDashboard";

export default function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  if (view === "dashboard") {
    return <OutreachDashboard onExit={() => setView("landing")} />;
  }

  return (
    <div className="bg-black text-white min-h-screen relative font-body selection:bg-white selection:text-black overflow-x-hidden">
      {/* Atmospheric Background Layers (Elegant Dark Theme) */}
      <div className="cinematic-bg fixed inset-0 pointer-events-none z-0 opacity-40" />
      <div className="atmosphere-glow atmosphere-glow-left fixed pointer-events-none" />
      <div className="atmosphere-glow atmosphere-glow-right fixed pointer-events-none" />
      <div className="atmosphere-glow atmosphere-glow-center fixed pointer-events-none" />

      {/* High-definition custom background visual fitting the window - Original color, no zoom */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-no-repeat opacity-20"
        style={{ backgroundImage: "url('/images/strike_bg.jpg')", backgroundSize: "contain", backgroundPosition: "center" }}
      />

      {/* Subtle Vignette Overlay on the screen */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.85)] z-20" />

      <div className="relative z-30 w-full flex flex-col">
        {/* Fixed Floating Header */}
        <Navbar />

        {/* Hero Area */}
        <Hero />

        {/* Subsequent sections nested in a dark containment layer */}
        <div className="w-full relative z-20">
          <StartSection />
          <FeaturesGrid />
          <Stats />
          <Testimonials />
          <CtaFooter onRunAgent={() => setView("dashboard")} />
        </div>
      </div>
    </div>
  );
}
