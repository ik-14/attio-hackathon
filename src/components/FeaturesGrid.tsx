import { motion } from "motion/react";
import { Zap, Palette, BarChart3, Shield } from "lucide-react";

export default function FeaturesGrid() {
  const cards = [
    {
      icon: Zap,
      title: "Days, Not Months",
      description:
        "Concept to launch at a pace that redefines fast. Because waiting isn't a business strategy.",
    },
    {
      icon: Palette,
      title: "Obsessively Crafted",
      description:
        "Every detail considered. Every element refined. Design so precise and beautiful, it feels inevitable.",
    },
    {
      icon: BarChart3,
      title: "Built to Convert",
      description:
        "Projects informed by real-world data. Decisions backed by performance. Results you can measure from day one.",
    },
    {
      icon: Shield,
      title: "Secure by Default",
      description:
        "Enterprise-grade protection comes standard. SSL, DDoS mitigation, compliance. All completely included.",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section
      id="why-us"
      className="relative w-full bg-black py-24 px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-16">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <span className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
            Why Us
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] mt-2">
            The difference is everything.
          </h2>
        </div>

        {/* 4-Column Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className="liquid-glass rounded-2xl p-8 flex flex-col gap-6 hover:bg-white/[0.03] transition-colors duration-300 group"
              >
                {/* Icon Container */}
                <div className="liquid-glass-strong rounded-full w-12 h-12 flex items-center justify-center text-white bg-white/[0.02] group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-5 w-5" />
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-3 text-left">
                  <h3 className="text-xl font-heading italic text-white">
                    {card.title}
                  </h3>
                  <p className="text-white/60 font-body font-light text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
