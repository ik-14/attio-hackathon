import HlsVideo from "./HlsVideo";

export default function Stats() {
  const stats = [
    { value: "200+", label: "Sites launched" },
    { value: "98%", label: "Client satisfaction" },
    { value: "3.2x", label: "More conversions" },
    { value: "5 days", label: "Average delivery" },
  ];

  return (
    <section className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden bg-black py-24 px-6 md:px-12">
      {/* Background Video (Desaturated B&W HLS Video) */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-25 pointer-events-none">
        <HlsVideo
          src="https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8"
          className="w-full h-full object-cover"
          saturateZero={true}
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

      {/* Content Grid Card */}
      <div className="relative z-20 w-full max-w-6xl mx-auto">
        <div className="liquid-glass rounded-3xl p-12 md:p-16 bg-white/[0.015] flex flex-col gap-8">
          {/* Subtitle */}
          <div className="text-center md:text-left">
            <span className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body tracking-wider uppercase">
              By The Numbers
            </span>
          </div>

          {/* Stats columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 pt-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center md:items-start text-center md:text-left gap-2 border-l border-white/5 pl-0 md:pl-6 first:border-l-0"
              >
                <div className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="text-white/60 font-body font-light text-xs md:text-sm uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
