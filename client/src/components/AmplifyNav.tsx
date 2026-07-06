import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { label: "Services", href: "/#services" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Capabilities", href: "/#capabilities" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/#about" },
];

export default function AmplifyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(13,13,13,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid var(--amp-border)" : "1px solid transparent",
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="flex items-center gap-2 cursor-pointer group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--amp-green)", boxShadow: "0 0 16px var(--amp-green-glow)" }}
              >
                <Zap size={16} style={{ color: "var(--amp-black)" }} strokeWidth={2.5} />
              </div>
              <span
                className="text-xl font-display font-800"
                style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--amp-white)" }}
              >
                Amplify
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium transition-colors duration-150"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--amp-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amp-white)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--amp-muted)")}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/chat">
              <button className="btn-outline text-sm px-4 py-2">Talk to us</button>
            </Link>
            <button
              className="btn-primary text-sm px-4 py-2"
              onClick={() => handleNavClick("/#contact")}
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2"
            style={{ color: "var(--amp-white)", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{ background: "rgba(13,13,13,0.98)", borderColor: "var(--amp-border)" }}
        >
          <div className="container py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-left text-base font-medium py-2"
                style={{ fontFamily: "var(--font-body)", color: "var(--amp-white)", background: "none", border: "none", cursor: "pointer" }}
              >
                {link.label}
              </button>
            ))}
            <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: "var(--amp-border)" }}>
              <Link href="/chat" onClick={() => setMobileOpen(false)}>
                <button className="btn-outline w-full text-sm">Talk to us</button>
              </Link>
              <button className="btn-primary w-full text-sm" onClick={() => { handleNavClick("/#contact"); }}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

