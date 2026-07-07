import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Þjónusta", href: "#services" },
  { label: "Verk", href: "#work" },
  { label: "Verðlag", href: "#pricing" },
  { label: "Samband", href: "#contact" },
];

function GiggoLogo() {
  return (
    <span
      className="font-black uppercase tracking-tight leading-none select-none"
      style={{
        fontFamily: "'Kanit', sans-serif",
        fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
        background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      GUMMI
    </span>
  );
}

export default function GiggoNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      {/* Desktop Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50 hidden sm:flex items-center justify-between px-6 md:px-10 pt-5 pb-4 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(12,12,12,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
        <a href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <GiggoLogo />
        </a>
        <div className="flex items-center gap-6 md:gap-10">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNav(link.href)}
              className="font-medium uppercase tracking-wider text-sm md:text-base transition-opacity duration-200 hover:opacity-70 cursor-pointer bg-transparent border-none"
              style={{ color: "#D7E2EA", fontFamily: "'Kanit', sans-serif" }}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => handleNav("#contact")}
            className="rounded-full font-medium uppercase tracking-widest text-white text-xs md:text-sm px-5 py-2 md:px-7 md:py-2.5 transition-opacity duration-200 hover:opacity-90 cursor-pointer"
            style={{
              background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
              boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1",
              outline: "2px solid white",
              outlineOffset: "-3px",
              fontFamily: "'Kanit', sans-serif",
            }}
          >
            Hefjast handa
          </button>
        </div>
      </motion.nav>

      {/* Mobile Nav */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex sm:hidden items-center justify-between px-4 pt-4 pb-3"
        style={{
          background: scrolled || menuOpen ? "rgba(12,12,12,0.92)" : "transparent",
          backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
        }}
      >
        <a href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <GiggoLogo />
        </a>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex flex-col gap-1.5 p-1 cursor-pointer bg-transparent border-none"
          aria-label="Toggle menu"
        >
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            className="block w-6 h-0.5 rounded-full"
            style={{ background: "#D7E2EA" }}
          />
          <motion.span
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
            className="block w-6 h-0.5 rounded-full"
            style={{ background: "#D7E2EA" }}
          />
          <motion.span
            animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            className="block w-6 h-0.5 rounded-full"
            style={{ background: "#D7E2EA" }}
          />
        </button>
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 sm:hidden"
            style={{ background: "rgba(12,12,12,0.97)" }}
          >
            {NAV_LINKS.map((link, i) => (
              <motion.button
                key={link.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                onClick={() => handleNav(link.href)}
                className="font-black uppercase tracking-widest cursor-pointer bg-transparent border-none"
                style={{ color: "#D7E2EA", fontSize: "clamp(1.5rem, 8vw, 2.5rem)", fontFamily: "'Kanit', sans-serif" }}
              >
                {link.label}
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: NAV_LINKS.length * 0.07, duration: 0.3 }}
              onClick={() => handleNav("#contact")}
              className="mt-4 rounded-full font-medium uppercase tracking-widest text-white px-8 py-3 cursor-pointer"
              style={{
                background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
                boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1",
                outline: "2px solid white",
                outlineOffset: "-3px",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "clamp(0.75rem, 3vw, 1rem)",
              }}
            >
              Hefjast handa
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
