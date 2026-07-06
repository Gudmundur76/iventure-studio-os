import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Þjónusta", href: "#services" },
  { label: "Verk", href: "#work" },
  { label: "Verðlag", href: "#pricing" },
  { label: "Um okkur", href: "#about" },
  { label: "Samband", href: "#contact" },
];

export default function AmplifyNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
      {/* Desktop nav — hidden on mobile, shown md+ */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 justify-between items-center px-8 lg:px-12 py-4 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(12,12,12,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(215,226,234,0.08)" : "none",
        }}
      >
        <a href="/" className="font-black uppercase tracking-wider text-base lg:text-lg"
          style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
          Gummi G&#250;r&#250;
        </a>
        <div className="flex items-center gap-6 lg:gap-10">
          {NAV_LINKS.map(({ label, href }) => (
            <button key={label} onClick={() => handleNavClick(href)}
              className="font-medium uppercase tracking-wider text-sm lg:text-base transition-opacity duration-200 hover:opacity-60 cursor-pointer bg-transparent border-0"
              style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleNavClick("/chat")}
          className="rounded-full font-medium uppercase tracking-widest text-white text-xs lg:text-sm px-5 py-2.5 transition-opacity duration-200 hover:opacity-90 cursor-pointer"
          style={{
            background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
            boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1",
            outline: "2px solid white", outlineOffset: "-3px",
            fontFamily: "'Kanit',sans-serif",
          }}>
          Talaðu við okkur
        </button>
      </nav>

      {/* Mobile nav bar — shown on mobile only */}
      <nav
        className="flex md:hidden fixed top-0 left-0 right-0 z-50 justify-between items-center px-4 py-3 transition-all duration-300"
        style={{
          background: scrolled || open ? "rgba(12,12,12,0.95)" : "transparent",
          backdropFilter: scrolled || open ? "blur(12px)" : "none",
          borderBottom: scrolled || open ? "1px solid rgba(215,226,234,0.08)" : "none",
        }}
      >
        <a href="/" className="font-black uppercase tracking-wider text-sm"
          style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
          Gummi G&#250;r&#250;
        </a>
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 cursor-pointer bg-transparent border-0 p-1"
          aria-label={open ? "Loka valmynd" : "Opna valmynd"}
        >
          <motion.span
            animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-6 h-0.5 rounded-full"
            style={{ background: "#D7E2EA" }}
          />
          <motion.span
            animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.15 }}
            className="block w-6 h-0.5 rounded-full"
            style={{ background: "#D7E2EA" }}
          />
          <motion.span
            animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-6 h-0.5 rounded-full"
            style={{ background: "#D7E2EA" }}
          />
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-40 flex flex-col pt-16 px-6 pb-10 md:hidden"
            style={{ background: "rgba(12,12,12,0.97)", backdropFilter: "blur(16px)" }}
          >
            <div className="flex flex-col gap-2 mt-6">
              {NAV_LINKS.map(({ label, href }, i) => (
                <motion.button
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => handleNavClick(href)}
                  className="text-left font-black uppercase tracking-wider py-4 border-b cursor-pointer bg-transparent border-0 transition-opacity duration-200 hover:opacity-60"
                  style={{
                    color: "#D7E2EA",
                    fontFamily: "'Kanit',sans-serif",
                    fontSize: "clamp(1.4rem,6vw,2rem)",
                    borderBottomColor: "rgba(215,226,234,0.1)",
                  }}
                >
                  {label}
                </motion.button>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="mt-auto"
            >
              <button
                onClick={() => handleNavClick("/chat")}
                className="w-full rounded-full font-medium uppercase tracking-widest text-white py-4 text-sm transition-opacity duration-200 hover:opacity-90 cursor-pointer"
                style={{
                  background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
                  boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1",
                  outline: "2px solid white", outlineOffset: "-3px",
                  fontFamily: "'Kanit',sans-serif",
                }}
              >
                Talaðu við okkur
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
