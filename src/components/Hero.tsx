import { motion } from "motion/react";
import { ArrowUpRight, Play } from "lucide-react";
import BlurText from "./BlurText";

export default function Hero() {
  return (
    <section id="home" className="relative w-full h-[850px] flex flex-col items-center justify-between overflow-hidden bg-black text-center pt-28 pb-12 px-6">
      {/* Background Video */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
        poster="/images/hero_bg.jpeg"
        autoPlay
        loop
        muted
        playsInline
        className="absolute left-0 top-0 w-full h-full object-cover z-0 opacity-80 pointer-events-none"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/15 z-0 pointer-events-none" />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[300px] z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #000000)",
        }}
      />

      {/* Hero Content */}
      <div className="relative z-20 flex flex-col items-center justify-center max-w-4xl mx-auto flex-grow gap-8">
        {/* Heading using BlurText */}
        <div className="px-4">
          <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[1] max-w-3xl tracking-[-4px] select-none text-center flex flex-col items-center gap-2">
            <BlurText
              text="Your Sales Team"
              direction="bottom"
              delay={100}
              staggerDelay={80}
              className="justify-center"
            />
            <BlurText
              text="in Minutes"
              direction="bottom"
              delay={340}
              staggerDelay={80}
              className="justify-center text-white/95"
            />
          </h1>
        </div>

        {/* Subtext */}
        <motion.p
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="text-sm md:text-base text-white/85 font-body font-light leading-relaxed max-w-md text-center mx-auto"
        >
          Built by AI, refined by experts. Blazing performance.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-center gap-4 mt-2"
        >
          <a
            href="#contact"
            className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 font-body"
          >
            Get Started
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>

      {/* Partners Bar */}
      <div className="relative z-20 w-full max-w-5xl mx-auto flex flex-col items-center gap-6 mt-auto pb-6">
        <div className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/60 font-body tracking-wider uppercase">
          Trusted by the teams behind
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-2xl md:text-3xl font-heading italic text-white/40">
          {["Attio", "Gemini", "SLNG", "Tavily", "Superlinked", "n8n", "Mubit"].map((partner) => (
            <span
              key={partner}
              className="hover:text-white/80 transition-colors cursor-default"
            >
              {partner}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
