import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

// ─── VELORAH VIDEO ────────────────────────────────────────────────────────────
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');

  .giggo-display { font-family: 'Instrument Serif', serif; }
  .giggo-body    { font-family: 'Inter', sans-serif; }

  .liquid-glass {
    background: rgba(255,255,255,0.01);
    background-blend-mode: luminosity;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: none;
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
    position: relative;
    overflow: hidden;
  }
  .liquid-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(180deg,
      rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
      rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
      rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @keyframes fade-rise {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-rise          { animation: fade-rise 0.8s ease-out both; }
  .animate-fade-rise-delay    { animation: fade-rise 0.8s ease-out 0.2s both; }
  .animate-fade-rise-delay-2  { animation: fade-rise 0.8s ease-out 0.4s both; }
  .animate-fade-rise-delay-3  { animation: fade-rise 0.8s ease-out 0.6s both; }
  .animate-fade-rise-delay-4  { animation: fade-rise 0.8s ease-out 0.8s both; }

  .service-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }
  .service-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.18);
    transform: translateY(-2px);
  }

  .plan-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    transition: border-color 0.2s ease;
  }
  .plan-card:hover { border-color: rgba(255,255,255,0.2); }
  .plan-card.featured {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.25);
  }

  .btn-active:active { transform: scale(0.97); }

  .section-divider {
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .giggo-input {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: white;
    border-radius: 12px;
    padding: 12px 16px;
    width: 100%;
    outline: none;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    transition: border-color 0.2s ease;
  }
  .giggo-input:focus { border-color: rgba(255,255,255,0.35); }
  .giggo-input::placeholder { color: rgba(255,255,255,0.3); }
`;

// ─── DATA ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Þjónusta", href: "#services" },
  { label: "Hvernig", href: "#how" },
  { label: "Verðlag", href: "#pricing" },
  { label: "Samband", href: "#contact" },
];

const SERVICES = [
  { icon: "🤖", title: "AI-umboðsmaður", desc: "Þinn eigin AI-fulltrúi með símanúmer og varanlegt minni. Hann þekkir fyrirtækið þitt og er alltaf tiltækur." },
  { icon: "🌐", title: "Vefsíður og netfang", desc: "Hreyfimyndaríkar, merktar vefsíður og sérsniðið netfang — hönnuð, rekið og uppfært af Giggo." },
  { icon: "🔁", title: "Sjálfvirk verkflæði", desc: "Rannsóknir, útbreiðsla, efnisgerð og gagnaverkefni sem keyra á áætlun — án þess að þú þurfir að gera neitt." },
  { icon: "📞", title: "Raddaðstoð", desc: "Hringdu í númerið þitt. Segðu hvað þú þarft. Umboðsmaðurinn framkvæmir og skilar niðurstöðu." },
  { icon: "📊", title: "Rannsóknir og greining", desc: "Ítarlegar skýrslur, samkeppnisgreining og markaðsgreind — skipulögð, tilvísaðar og tilbúnar til notkunar." },
  { icon: "✍️", title: "Efni og markaðssetning", desc: "Bloggfærslur, tölvupóstar, auglýsingatextar og efni í samfélagsmiðla — skrifað og tilbúið til birtingar." },
];

const HOW_ITEMS = [
  { step: "01", label: "Þú lýsir verkefninu", sub: "Einföld skilaboð eða símtal. Engin eyðublöð, engar fundarboðanir." },
  { step: "02", label: "AI-kerfið tekur við", sub: "Umboðsmaðurinn vinnur verkefnið frá upphafi til enda — sjálfstætt og skilvirkt." },
  { step: "03", label: "Þú færð fullunna niðurstöðu", sub: "Ekki drög. Raunveruleg afhending — tilbúin til notkunar eða birtingar." },
];

const PLANS = [
  {
    name: "Grunnur",
    price: "$29",
    unit: "/ verkefni",
    desc: "Ein fullunnin afhending. Fullkomið til að prófa þjónustuna.",
    features: ["1 verkefni í einu", "Afhent á 2–5 virkum dögum", "Ótakmarkaðar leiðréttingar", "Þjónusta í tölvupósti"],
    cta: "Hefjast handa",
    featured: false,
  },
  {
    name: "Vöxtur",
    price: "$99",
    unit: "/ mánuður",
    desc: "Ótakmarkaðar beiðnir á mánuði. Fullkomið fyrir fyrirtæki sem þurfa stöðugt úttak.",
    features: ["Ótakmarkaðar verkefnisbeiðnir", "Forgangspöntun", "Afhent á 24–48 klukkustundum", "Eigið lén innifalið", "Sérstakur umboðsmaður", "Mánaðarlegar skýrslur"],
    cta: "Hefja mánaðarlega áskrift",
    featured: true,
  },
  {
    name: "Stúdíó",
    price: "Sérsniðið",
    unit: "",
    desc: "Fyrir stór fyrirtæki og sérþarfir. Við setjum saman pakka sem hentar þér nákvæmlega.",
    features: ["Allt sem fylgir Vöxtri", "Sérsniðnar samþættingar", "API-aðgangur", "Þjónustusamningur (SLA)", "Sérstakt þróunarteymi"],
    cta: "Hafa samband",
    featured: false,
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, y = 24, className }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "40px", amount: 0 });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  );
}

function AnimatedText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.2"] });
  const chars = text.split("");
  return (
    <p ref={ref} className={className} style={style} aria-label={text}>
      {chars.map((char, i) => {
        const start = i / chars.length;
        const end = start + 1 / chars.length;
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1]);
        return (
          <span key={i} className="relative inline-block">
            <span className="invisible">{char === " " ? "\u00A0" : char}</span>
            <motion.span className="absolute inset-0" style={{ opacity }}>{char === " " ? "\u00A0" : char}</motion.span>
          </span>
        );
      })}
    </p>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 giggo-body ${scrolled ? "liquid-glass" : ""}`}>
      <div className="flex flex-row justify-between items-center px-6 sm:px-8 py-5 max-w-7xl mx-auto">
        {/* Logo */}
        <span className="text-2xl sm:text-3xl tracking-tight text-white giggo-display select-none cursor-pointer"
          style={{ fontFamily: "'Instrument Serif', serif" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Giggo<sup className="text-xs">®</sup>
        </span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button key={link.label} onClick={() => scrollTo(link.href)}
              className="text-sm text-white/50 hover:text-white transition-colors bg-transparent border-none cursor-pointer giggo-body">
              {link.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button onClick={() => scrollTo("#contact")}
          className="hidden md:block liquid-glass rounded-full px-6 py-2.5 text-sm text-white hover:scale-[1.03] transition-transform btn-active cursor-pointer giggo-body">
          Hefjast handa
        </button>

        {/* Mobile hamburger */}
        <button className="md:hidden text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {menuOpen
              ? <><line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
              : <><line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden liquid-glass px-6 pb-6 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <button key={link.label} onClick={() => scrollTo(link.href)}
              className="text-sm text-white/70 hover:text-white transition-colors text-left bg-transparent border-none cursor-pointer giggo-body py-1">
              {link.label}
            </button>
          ))}
          <button onClick={() => scrollTo("#contact")}
            className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white text-center cursor-pointer giggo-body mt-2">
            Hefjast handa
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);

  const scrollToContact = () => {
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100svh] flex flex-col" style={{ background: "hsl(201,100%,13%)" }}>
      {/* Video */}
      <video ref={videoRef} autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        src={VIDEO_URL} />
      {/* Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,30,50,0.55) 0%, rgba(0,30,50,0.35) 60%, rgba(0,30,50,0.75) 100%)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 sm:px-8 flex-1 pt-28 pb-16 giggo-body">
        <h1 className="animate-fade-rise font-normal text-white max-w-5xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(2.4rem, 8vw, 8rem)",
            lineHeight: 1.0,
            letterSpacing: "-1.5px",
          }}>
          Fyrirtækið þitt,{" "}
          <em className="not-italic" style={{ color: "rgba(255,255,255,0.45)" }}>
            rekið af AI-umboðsmönnum
          </em>{" "}
          sem sofa aldrei.
        </h1>

        <p className="animate-fade-rise-delay text-sm sm:text-lg max-w-xl mt-6 sm:mt-8 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
          Giggo gefur hverju fyrirtæki AI-frjálsráðinn — nafngreindan umboðsmann með símanúmer,
          vefsíðu og minni. Hann sér um rannsóknir, efni, útbreiðslu og þjónustu.
          Þú einbeitir þér að því sem skiptir máli.
        </p>

        <div className="animate-fade-rise-delay-2 flex flex-col sm:flex-row gap-3 mt-8 sm:mt-12 w-full max-w-xs sm:max-w-none sm:w-auto">
          <button onClick={scrollToContact}
            className="liquid-glass rounded-full px-8 py-4 text-base text-white hover:scale-[1.03] transition-transform btn-active cursor-pointer giggo-body w-full sm:w-auto">
            Hefjast handa
          </button>
          <button onClick={() => document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full px-8 py-4 text-base cursor-pointer giggo-body transition-colors w-full sm:w-auto"
            style={{ color: "rgba(255,255,255,0.5)", background: "transparent", border: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            Sjá hvernig það virkar →
          </button>
        </div>

        {/* Stats */}
        <div className="animate-fade-rise-delay-3 flex flex-wrap justify-center gap-6 sm:gap-12 mt-10 sm:mt-16">
          {[["24–48h", "Afhendingartími"], ["100%", "Gagnsæi"], ["∞", "Leiðréttingar"]].map(([val, lbl]) => (
            <div key={lbl} className="flex flex-col items-center gap-1">
              <span className="text-xl sm:text-3xl font-semibold text-white giggo-body">{val}</span>
              <span className="text-[10px] sm:text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex justify-center pb-8 animate-fade-rise-delay-4">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 8l5 5 5-5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>
    </section>
  );
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────
function Services() {
  return (
    <section id="services" className="relative z-10 px-6 sm:px-8 py-24 sm:py-32 giggo-body"
      style={{ background: "hsl(201,100%,10%)" }}>
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>Þjónusta Giggo</p>
          <h2 className="font-normal text-white"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2.2rem,6vw,5rem)", lineHeight: 1.05 }}>
            Þjónusta
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {SERVICES.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.07} y={20}>
              <div className="service-card rounded-2xl p-5 sm:p-7 h-full">
                <span className="text-2xl sm:text-3xl mb-3 sm:mb-4 block">{s.icon}</span>
                <h3 className="text-base sm:text-lg text-white mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', sans-serif" }}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOW WE WORK ──────────────────────────────────────────────────────────────
function HowWeWork() {
  return (
    <section id="how" className="relative z-10 px-6 sm:px-8 py-24 sm:py-32 section-divider giggo-body"
      style={{ background: "hsl(201,100%,10%)" }}>
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>Ferlið</p>
          <h2 className="font-normal text-white"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2.2rem,6vw,5rem)", lineHeight: 1.05 }}>
            Hvernig við vinnum
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {HOW_ITEMS.map((item, i) => (
            <FadeIn key={item.step} delay={i * 0.1} y={20}>
              <div className="service-card rounded-2xl p-5 sm:p-7 h-full">
                <span className="text-xs tracking-widest uppercase mb-3 block" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Inter', sans-serif" }}>{item.step}</span>
                <h3 className="text-base text-white mb-2" style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.1rem" }}>{item.label}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', sans-serif" }}>{item.sub}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <AnimatedText
            text="AI framkvæmir. Þú stjórnar. Við erum gegnsæ um það."
            className="text-center font-normal text-white/80"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(1.3rem, 3vw, 2.2rem)", lineHeight: 1.3 } as React.CSSProperties}
          />
        </FadeIn>
      </div>
    </section>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function Pricing() {
  const scrollToContact = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  return (
    <section id="pricing" className="relative z-10 px-6 sm:px-8 py-24 sm:py-32 section-divider giggo-body"
      style={{ background: "hsl(201,100%,10%)" }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>Verðlag</p>
          <h2 className="font-normal text-white"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2.2rem,6vw,5rem)", lineHeight: 1.05 }}>
            Veldu pakka
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 0.1} y={20}>
              <div className={`plan-card rounded-2xl p-6 sm:p-8 h-full flex flex-col ${plan.featured ? "featured" : ""}`}>
                {plan.featured && (
                  <span className="text-xs tracking-widest uppercase mb-4 block" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Vinsælast</span>
                )}
                <h3 className="text-lg sm:text-xl text-white mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl sm:text-3xl font-semibold text-white giggo-body">{plan.price}</span>
                  {plan.unit && <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>{plan.unit}</span>}
                </div>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', sans-serif" }}>{plan.desc}</p>
                <ul className="flex flex-col gap-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Inter', sans-serif" }}>
                      <span className="mt-0.5 text-white/40">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={scrollToContact}
                  className="liquid-glass rounded-full px-6 py-3.5 text-sm text-white hover:scale-[1.02] transition-transform btn-active cursor-pointer giggo-body w-full">
                  {plan.cta}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", service: "", message: "", plan: "grunnur" });
  const [portalToken, setPortalToken] = useState<string | null>(null);

  const createOrder = trpc.publicOrders.create.useMutation({
    onSuccess: (data) => { setPortalToken(data.portalToken); toast.success("Pöntun móttekin!"); },
    onError: (err) => toast.error(err.message || "Villa við sendingu"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Vinsamlegast fylltu út öll nauðsynleg svæði"); return; }
    createOrder.mutate({
      clientName: form.name,
      clientEmail: form.email,
      service: form.service || "Almenn fyrirspurn",
      description: form.message,
      plan: form.plan,
    });
  };

  return (
    <section id="contact" className="relative z-10 px-6 sm:px-8 py-24 sm:py-32 section-divider giggo-body"
      style={{ background: "hsl(201,100%,10%)" }}>
      <div className="max-w-2xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>Samband</p>
          <h2 className="font-normal text-white"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2.2rem,6vw,5rem)", lineHeight: 1.05 }}>
            Við hlustum
          </h2>
          <p className="mt-4 text-base" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', sans-serif" }}>
            Segðu okkur hvað þú þarft. Við svörum innan 24 stunda.
          </p>
        </FadeIn>

        {portalToken ? (
          <FadeIn>
            <div className="service-card rounded-2xl p-10 text-center">
              <span className="text-4xl mb-4 block">✓</span>
              <h3 className="text-xl text-white mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>Pöntun móttekin!</h3>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', sans-serif" }}>
                Við byrjum strax. Fylgstu með stöðu pöntunarinnar hér:
              </p>
              <a
                href={`/service-portal/${portalToken}`}
                className="liquid-glass rounded-full px-6 py-3 text-sm text-white inline-block hover:scale-[1.02] transition-transform btn-active"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Skoða stöðu pöntunar →
              </a>
            </div>
          </FadeIn>
        ) : (
          <FadeIn>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>Þjónustupakki</label>
                  <select className="giggo-input" value={form.plan} onChange={(e) => setForm(p => ({ ...p, plan: e.target.value }))}>
                    <option value="grunnur">Grunnur — $29 / verkefni</option>
                    <option value="voxtur">Vöxtur — $99 / mánuður</option>
                    <option value="studio">Stúdíó — Sérsniðið</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>Nafn *</label>
                  <input className="giggo-input" placeholder="Fullt nafn" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>Netfang *</label>
                  <input className="giggo-input" type="email" placeholder="netfang@fyrirtaeki.is" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>Þjónusta sem þig vantar</label>
                <input className="giggo-input" placeholder="t.d. AI-umboðsmaður, vefsíða, rannsóknir..." value={form.service} onChange={(e) => setForm(p => ({ ...p, service: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>Skilaboð *</label>
                <textarea className="giggo-input resize-none" rows={4} placeholder="Lýstu verkefninu eða spurðu spurningu..." value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} />
              </div>
              <button type="submit" disabled={createOrder.isPending}
                className="liquid-glass rounded-full px-8 py-4 text-base text-white hover:scale-[1.02] transition-transform btn-active cursor-pointer giggo-body disabled:opacity-50 mt-2">
                {createOrder.isPending ? "Sendi pöntun..." : "Senda pöntun"}
              </button>
            </form>
          </FadeIn>
        )}
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative z-10 section-divider px-6 sm:px-8 py-10 giggo-body"
      style={{ background: "hsl(201,100%,10%)" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <span className="text-xl tracking-tight text-white giggo-display"
          style={{ fontFamily: "'Instrument Serif', serif" }}>
          Giggo<sup className="text-xs">®</sup>
        </span>
        <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Inter', sans-serif" }}>
          © {new Date().getFullYear()} Giggo · Reykjavík
        </p>
        <div className="flex gap-6 text-sm" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>
          <a href="mailto:hello@giggo.io" className="hover:text-white transition-colors">hello@giggo.io</a>
          <Link href="/os" className="hover:text-white transition-colors">OS</Link>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function GiggoHome() {
  return (
    <div style={{ background: "hsl(201,100%,10%)", overflowX: "hidden" }}>
      <style>{GLOBAL_CSS}</style>
      <Nav />
      <Hero />
      <Services />
      <HowWeWork />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
}
