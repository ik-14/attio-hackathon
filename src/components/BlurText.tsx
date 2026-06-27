import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface BlurTextProps {
  text: string;
  direction?: "bottom" | "top";
  delay?: number; // Base delay in ms
  staggerDelay?: number; // Delay between elements in ms
  className?: string;
  splitBy?: "words" | "letters";
}

export default function BlurText({
  text,
  direction = "bottom",
  delay = 100,
  staggerDelay = 50,
  className = "",
  splitBy = "words",
}: BlurTextProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Animate once
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const elements = splitBy === "words" ? text.split(" ") : text.split("");

  return (
    <span
      ref={containerRef}
      className={`inline-flex flex-wrap ${className}`}
    >
      {elements.map((element, index) => {
        const itemDelay = (delay + index * staggerDelay) / 1000;
        const initialY = direction === "bottom" ? 50 : -50;

        return (
          <motion.span
            key={index}
            className="inline-block whitespace-pre"
            initial={{
              filter: "blur(10px)",
              opacity: 0,
              y: initialY,
            }}
            animate={
              isInView
                ? {
                    filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                    opacity: [0, 0.5, 1],
                    y: [initialY, -5, 0],
                  }
                : {}
            }
            transition={{
              duration: 0.7, // 0.35s per keyframe step, 2 steps = 0.7s total
              delay: itemDelay,
              times: [0, 0.5, 1],
              ease: "easeOut",
            }}
            style={{ marginRight: splitBy === "words" ? "0.25em" : "0" }}
          >
            {element === "" ? "\u00A0" : element}
          </motion.span>
        );
      })}
    </span>
  );
}
