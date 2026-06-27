import { motion } from "motion/react";

export default function Testimonials() {
  const testimonials = [
    {
      quote:
        "A complete rebuild in five days. The result outperformed everything we'd spent months building before.",
      name: "Sarah Chen",
      role: "CEO, Luminary",
    },
    {
      quote:
        "Conversions up 4x. That's not a typo. The design just works differently when it's built on real data.",
      name: "Marcus Webb",
      role: "Head of Growth, Arcline",
    },
    {
      quote:
        "They didn't just design our site. They defined our brand. World-class doesn't begin to cover it.",
      name: "Elena Voss",
      role: "Brand Director, Helix",
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
      id="work"
      className="relative w-full bg-black py-24 px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-16">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <span className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
            What They Say
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] mt-2">
            Don't take our word for it.
          </h2>
        </div>

        {/* 3-Column Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="liquid-glass rounded-2xl p-8 flex flex-col justify-between gap-8 hover:bg-white/[0.025] transition-colors duration-300 min-h-[220px]"
            >
              {/* Quote */}
              <p className="text-white/80 font-body font-light text-sm italic leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author Info */}
              <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
                <div className="text-white font-body font-medium text-sm">
                  {testimonial.name}
                </div>
                <div className="text-white/50 font-body font-light text-xs">
                  {testimonial.role}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
