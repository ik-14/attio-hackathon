import HlsVideo from "./HlsVideo";
import { ArrowUpRight } from "lucide-react";

export default function StartSection() {
  return (
    <section
      id="process"
      className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden bg-black py-24 px-6 text-center"
    >
      {/* HLS Background Video */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none">
        <HlsVideo
          src="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
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

      {/* Content */}
      <div className="relative z-20 max-w-3xl mx-auto flex flex-col items-center gap-6">
        {/* Badge */}
        <span className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
          How It Works
        </span>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] mt-2">
          You dream it. We sell it.
        </h2>

        {/* Subtext */}
        <p className="text-white/60 font-body font-light text-sm md:text-base max-w-lg leading-relaxed">
          Share your vision. Our AI handles the rest—wireframes, design, code,
          launch. All in days, not quarters.
        </p>

        {/* CTA Button */}
        <a
          href="#contact"
          className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 font-body mt-4"
        >
          Get Started
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
