import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = ["Home", "Process"];

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-50 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Spacer to keep layout balanced */}
          <div className="w-12 h-12 hidden md:block" />

          {/* Center: Desktop Links (Pill Container) */}
          <nav className="hidden md:flex items-center justify-center">
            <div className="liquid-glass rounded-full px-2 py-1.5 flex items-center gap-1">
              {links.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors font-body rounded-full hover:bg-white/5"
                >
                  {link}
                </a>
              ))}
            </div>
          </nav>

          {/* Right: Desktop Action Button */}
          <div className="hidden md:block">
            <a
              href="#contact"
              className="inline-flex items-center gap-1 bg-white text-black hover:bg-white/95 rounded-full px-5 py-2 text-sm font-medium transition-transform active:scale-95 font-body"
            >
              Get Started
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden liquid-glass p-2.5 rounded-full text-white hover:bg-white/10 transition-colors ml-auto"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-4 top-20 z-40 md:hidden liquid-glass-strong rounded-3xl p-6 flex flex-col gap-6"
          >
            <nav className="flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium font-body text-white/80 hover:text-white transition-colors py-1 px-2 border-b border-white/5"
                >
                  {link}
                </a>
              ))}
            </nav>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 bg-white text-black hover:bg-white/95 rounded-full py-3 text-sm font-medium font-body transition-colors"
            >
              Get Started
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
