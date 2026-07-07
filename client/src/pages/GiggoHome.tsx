import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import GiggoNav from "@/components/GiggoNav";

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────

function FadeIn({
  children, delay = 0, duration = 0.7, x = 0, y = 30, className, style,
}: {
  children: React.ReactNode; delay?: number; duration?: number;
  x?: number; y?: number; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "50px", amount: 0 });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, x, y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  );
}

function Magnet({ children, padding = 150, strength = 3, className }: {
  children: React.ReactNode; padding?: number; strength?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.max(rect.width, rect.height) / 2 + padding;
    if (dist < threshold) { setActive(true); setPos({ x: dx / strength, y: dy / strength }); }
    else { setActive(false); setPos({ x: 0, y: 0 }); }
  }, [padding, strength]);
  const handleMouseLeave = useCallback(() => { setActive(false); setPos({ x: 0, y: 0 }); }, []);
  return (
    <div ref={ref} className={className} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      style={{ transform: `translate3d(${pos.x}px,${pos.y}px,0)`, transition: active ? "transform 0.3s ease-out" : "transform 0.6s ease-in-out", willChange: "transform" }}>
      {children}
    </div>
  );
}

function AnimatedText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.2"] });
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

function CTA({ label = "Get Started", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-full font-medium uppercase tracking-widest text-white cursor-pointer px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base transition-opacity duration-200 hover:opacity-90 whitespace-nowrap"
      style={{ background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)", boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1", outline: "2px solid white", outlineOffset: "-3px", fontFamily: "'Kanit',sans-serif" }}>
      {label}
    </button>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────

function HeroSection() {
  const scrollToContact = () => {
    const el = document.querySelector("#contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section className="relative min-h-[100svh] flex flex-col pt-16 sm:pt-0" style={{ background: "#0C0C0C", overflowX: "clip" }}>
      {/* Heading */}
      <FadeIn delay={0.15} y={40} className="overflow-hidden">
        <h1 className="hero-heading font-black uppercase tracking-tight leading-none w-full mt-6 sm:mt-4 md:-mt-2 px-1"
          style={{ fontFamily: "'Kanit',sans-serif", fontSize: "clamp(2.8rem,12vw,190px)", whiteSpace: "nowrap" }}>
          Hi, i&apos;m giggo
        </h1>
      </FadeIn>

      {/* Hero Portrait — Jack character with magnetic hover effect */}
      <FadeIn delay={0.6} y={30}
        className="absolute left-1/2 -translate-x-1/2 z-10 bottom-0 top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0">
        <Magnet padding={150} strength={3}>
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png"
            alt="Giggo AI Agent"
            className="object-contain pointer-events-none select-none"
            style={{ width: "clamp(280px,45vw,520px)" }}
          />
        </Magnet>
      </FadeIn>

      {/* Bottom bar */}
      <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 sm:pb-8 md:pb-10 px-4 sm:px-6 md:px-10 pt-4 sm:pt-0">
        <FadeIn delay={0.35} y={20}>
          <p className="font-light uppercase tracking-wide leading-snug max-w-[240px] sm:max-w-[220px] md:max-w-[280px]"
            style={{ color: "#D7E2EA", fontSize: "clamp(0.7rem,1.3vw,1.2rem)", fontFamily: "'Kanit',sans-serif" }}>
            AI-powered personal agent. One request. Delivered.
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20}>
          <CTA label="Get Started" onClick={scrollToContact} />
        </FadeIn>
      </div>
    </section>
  );
}

// ─── MARQUEE ─────────────────────────────────────────────────────────────────

const GIFS = [
  "https://motionsites.ai/assets/hero-space-voyage-preview-eECLH3Yc.gif",
  "https://motionsites.ai/assets/hero-codenest-preview-Cgppc2qV.gif",
  "https://motionsites.ai/assets/hero-vex-ventures-preview-BczMFIiw.gif",
  "https://motionsites.ai/assets/hero-stellar-ai-v2-preview-DjvxjG3C.gif",
  "https://motionsites.ai/assets/hero-asme-preview-B_nGDnTP.gif",
  "https://motionsites.ai/assets/hero-transform-data-preview-Cx5OU29N.gif",
  "https://motionsites.ai/assets/hero-vitara-preview-Cjz2QYyU.gif",
  "https://motionsites.ai/assets/hero-terra-preview-BFjrCr7T.gif",
  "https://motionsites.ai/assets/hero-skyelite-preview-DHaZIgUv.gif",
  "https://motionsites.ai/assets/hero-aethera-preview-DknSlcTa.gif",
  "https://motionsites.ai/assets/hero-designpro-preview-D8c5_een.gif",
  "https://motionsites.ai/assets/hero-stellar-ai-preview-D3HL6bw1.gif",
  "https://motionsites.ai/assets/hero-xportfolio-preview-D4A8maiC.gif",
  "https://motionsites.ai/assets/hero-orbit-web3-preview-BXt4OttD.gif",
  "https://motionsites.ai/assets/hero-nexora-preview-cx5HmUgo.gif",
  "https://motionsites.ai/assets/hero-evr-ventures-preview-DZxeVFEX.gif",
  "https://motionsites.ai/assets/hero-planet-orbit-preview-DWAP8Z1P.gif",
  "https://motionsites.ai/assets/hero-new-era-preview-CocuDUm9.gif",
  "https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif",
  "https://motionsites.ai/assets/hero-luminex-preview-CxOP7ce6.gif",
  "https://motionsites.ai/assets/hero-celestia-preview-0yO3jXO8.gif",
];
const ROW1 = GIFS.slice(0, 11);
const ROW2 = GIFS.slice(11);
function triple<T>(arr: T[]): T[] { return [...arr, ...arr, ...arr]; }

function MarqueeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      setOffset((window.scrollY - sectionTop + window.innerHeight) * 0.3);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <section ref={sectionRef} className="overflow-hidden pt-14 sm:pt-24 md:pt-36 pb-8" style={{ background: "#0C0C0C" }}>
      <div className="flex gap-2 sm:gap-3 mb-2 sm:mb-3" style={{ transform: `translateX(${offset - 200}px)`, willChange: "transform" }}>
        {triple(ROW1).map((src, i) => <img key={i} src={src} alt="" loading="lazy" className="rounded-xl sm:rounded-2xl object-cover flex-shrink-0" style={{ width: "clamp(180px,40vw,420px)", height: "clamp(115px,26vw,270px)" }} />)}
      </div>
      <div className="flex gap-2 sm:gap-3" style={{ transform: `translateX(${-(offset - 200)}px)`, willChange: "transform" }}>
        {triple(ROW2).map((src, i) => <img key={i} src={src} alt="" loading="lazy" className="rounded-xl sm:rounded-2xl object-cover flex-shrink-0" style={{ width: "clamp(180px,40vw,420px)", height: "clamp(115px,26vw,270px)" }} />)}
      </div>
    </section>
  );
}

// ─── ABOUT ───────────────────────────────────────────────────────────────────

const ABOUT_TEXT = "Giggo is a fully autonomous AI agent platform. You describe what you need — a website, a research report, a marketing campaign, a proposal — and we deliver the finished work. Not a draft. Not a concept. The actual deliverable. Unlimited capability. Zero overhead. International reach.";

function AboutSection() {
  const scrollToContact = () => {
    const el = document.querySelector("#contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section id="about" className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 md:px-10 py-16 sm:py-20" style={{ background: "#0C0C0C" }}>
      {/* Decorative 3D corner images — exact from design prompt */}
      <FadeIn delay={0.1} x={-80} y={0} duration={0.9} className="absolute top-[4%] left-[1%] sm:left-[2%] md:left-[4%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png" alt="" className="w-[120px] sm:w-[160px] md:w-[210px] select-none" />
      </FadeIn>
      <FadeIn delay={0.25} x={-80} y={0} duration={0.9} className="absolute bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png" alt="" className="w-[100px] sm:w-[140px] md:w-[180px] select-none" />
      </FadeIn>
      <FadeIn delay={0.15} x={80} y={0} duration={0.9} className="absolute top-[4%] right-[1%] sm:right-[2%] md:right-[4%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png" alt="" className="w-[120px] sm:w-[160px] md:w-[210px] select-none" />
      </FadeIn>
      <FadeIn delay={0.3} x={80} y={0} duration={0.9} className="absolute bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png" alt="" className="w-[130px] sm:w-[170px] md:w-[220px] select-none" />
      </FadeIn>
      <div className="flex flex-col items-center gap-8 sm:gap-12 md:gap-16 z-10 max-w-[90vw] sm:max-w-2xl">
        <FadeIn delay={0} y={40}>
          <h2 className="hero-heading font-black uppercase leading-none tracking-tight text-center"
            style={{ fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>About</h2>
        </FadeIn>
        <AnimatedText text={ABOUT_TEXT} className="font-medium text-center leading-relaxed"
          style={{ color: "#D7E2EA", fontSize: "clamp(0.9rem,1.8vw,1.3rem)", fontFamily: "'Kanit',sans-serif" }} />
      </div>
      <div className="mt-12 sm:mt-16 md:mt-20 z-10">
        <CTA label="Talk to Giggo" onClick={scrollToContact} />
      </div>
    </section>
  );
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

const SERVICES = [
  { num: "01", name: "Website & App Development", desc: "Fully built, deployed websites and web apps. You send a brief, we deliver a live product. No coding required on your end.", img: "/manus-storage/web-dev_9f3ed2d4.jpg" },
  { num: "02", name: "Research & Market Analysis", desc: "In-depth research reports, competitive analysis, and market intelligence — structured, cited, and ready to use.", img: "/manus-storage/research_d21f261b.jpg" },
  { num: "03", name: "Marketing Content & Campaigns", desc: "Blog posts, email sequences, ad copy, social media content, and SEO material — written, formatted, and ready to publish.", img: "/manus-storage/marketing_de815124.jpg" },
  { num: "04", name: "Business Proposals & Documents", desc: "Professional proposals, business plans, pitch decks, contracts, and reports — written to your brief and ready to send.", img: "/manus-storage/proposals_9184996c.jpg" },
  { num: "05", name: "Presentation Decks", desc: "Compelling slide decks for investor meetings, sales pitches, and board presentations — structured, polished, and presentation-ready.", img: "/manus-storage/presentations_e0a10063.jpg" },
  { num: "06", name: "Data Analysis & Spreadsheets", desc: "Raw data in, clear analysis out. Charts, summaries, and structured Excel reports built from your datasets.", img: "/manus-storage/data_a19e38e9.jpg" },
  { num: "07", name: "Social Media Content Packages", desc: "Weeks of content planned and written in one session. Posts, captions, threads, and hooks across all platforms.", img: "/manus-storage/social_9058f934.jpg" },
  { num: "08", name: "Lead Research & Prospect Lists", desc: "Targeted prospect lists with contact details, company context, and personalised outreach angles — ready to send.", img: "/manus-storage/leads_7daa99e9.jpg" },
];

function ServicesSection() {
  return (
    <section id="services" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28" style={{ background: "#FFFFFF" }}>
      <FadeIn y={40}>
        <h2 className="font-black uppercase text-center mb-10 sm:mb-16 md:mb-24"
          style={{ color: "#0C0C0C", fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Services</h2>
      </FadeIn>
      <div className="max-w-5xl mx-auto overflow-hidden">
        {SERVICES.map((s, i) => (
          <FadeIn key={s.num} delay={i * 0.08} y={20}>
            <div className="flex items-start gap-3 sm:gap-6 md:gap-8 py-5 sm:py-8 md:py-10"
              style={{ borderTop: i === 0 ? "1px solid rgba(12,12,12,0.15)" : undefined, borderBottom: "1px solid rgba(12,12,12,0.15)" }}>
              <span className="font-black leading-none flex-shrink-0"
                style={{ color: "#0C0C0C", fontSize: "clamp(2rem,7vw,110px)", fontFamily: "'Kanit',sans-serif" }}>{s.num}</span>
              <div className="flex flex-col justify-center gap-1 sm:gap-2 pt-1 min-w-0 flex-1">
                <span className="font-medium uppercase" style={{ color: "#0C0C0C", fontSize: "clamp(0.85rem,1.9vw,1.9rem)", fontFamily: "'Kanit',sans-serif" }}>{s.name}</span>
                <span className="font-light leading-relaxed" style={{ color: "#0C0C0C", opacity: 0.6, fontSize: "clamp(0.75rem,1.3vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}>{s.desc}</span>
              </div>
              {s.img && (
                <img src={s.img} alt={s.name} loading="lazy"
                  className="hidden sm:block flex-shrink-0 object-cover rounded-xl sm:rounded-2xl"
                  style={{ width: "clamp(80px,14vw,180px)", height: "clamp(55px,9vw,115px)" }} />
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─── AGENT SESSION ────────────────────────────────────────────────────────────

const SESSION_STEPS = [
  {
    step: "01",
    title: "You describe what you need",
    detail: "Type a plain-English brief — 'Build me a landing page for my SaaS', 'Write a 10-page market report on EV charging in Europe', 'Create 30 days of LinkedIn content for a fintech brand'. No forms, no briefs, no calls.",
    icon: "💬",
    color: "#B600A8",
  },
  {
    step: "02",
    title: "Giggo spins up a dedicated session",
    detail: "A fresh agent session is assigned to your request. Giggo reads your brief, identifies the deliverable type, selects the right tools and models, and begins autonomous execution — all within seconds of your message.",
    icon: "⚡",
    color: "#7621B0",
  },
  {
    step: "03",
    title: "The agent works end-to-end",
    detail: "Giggo researches, writes, builds, and formats. It browses the web, writes code, generates assets, structures documents, and quality-checks its own output — without you lifting a finger. You can watch progress in real time.",
    icon: "🤖",
    color: "#B600A8",
  },
  {
    step: "04",
    title: "You receive the finished deliverable",
    detail: "Not a draft. Not a concept. The actual finished work — a live URL, a PDF report, a ready-to-send document, a published post. Delivered to your inbox or dashboard, typically within 24–48 hours.",
    icon: "✅",
    color: "#7621B0",
  },
  {
    step: "05",
    title: "Revise, iterate, or start the next one",
    detail: "Request changes in plain English. The session remembers full context. Or close it and open a new one for your next project. Growth plan clients get unlimited concurrent sessions — your output scales with your ambition.",
    icon: "🔄",
    color: "#BE4C00",
  },
];

const LIVE_MESSAGES = [
  { role: "user", text: "Build me a landing page for a B2B SaaS that does invoice automation. Dark theme, purple accents, pricing section, contact form." },
  { role: "agent", text: "Session started. Analysing brief...\n\n✓ Deliverable type: Landing page\n✓ Stack: React + Tailwind\n✓ Sections identified: Hero, Features, Pricing, Contact\n\nBuilding now. I'll have a live URL for you within 2 hours." },
  { role: "agent", text: "✓ Hero section complete — headline, subheadline, CTA button\n✓ Features grid — 6 cards with icons\n✓ Pricing section — 3 tiers, monthly/annual toggle\n⏳ Contact form + deployment in progress..." },
  { role: "agent", text: "✅ Done. Your landing page is live:\n\nhttps://invoice-auto.giggo.io\n\nAll sections complete. Lighthouse score: 97. Ready to review — reply with any changes." },
];

function AgentSessionSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSession = useCallback(() => {
    setIsPlaying(true);
    setVisibleMessages(1);
    let count = 1;
    const tick = () => {
      count++;
      if (count <= LIVE_MESSAGES.length) {
        setVisibleMessages(count);
        timerRef.current = setTimeout(tick, 1800);
      } else {
        setIsPlaying(false);
      }
    };
    timerRef.current = setTimeout(tick, 1800);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <section id="session" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 md:-mt-14 z-10 relative px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28"
      style={{ background: "#0C0C0C" }}>
      <FadeIn y={40} className="text-center mb-10 sm:mb-16 md:mb-20">
        <h2 className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2rem,8vw,110px)", fontFamily: "'Kanit',sans-serif" }}>
          A Giggo Session
        </h2>
        <p className="mt-4 font-light uppercase tracking-wide"
          style={{ color: "rgba(215,226,234,0.55)", fontSize: "clamp(0.8rem,1.5vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}>
          From brief to deliverable — here's exactly what happens
        </p>
      </FadeIn>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
        {/* Left: step-by-step explainer */}
        <div className="flex flex-col gap-3">
          {SESSION_STEPS.map((s, i) => (
            <FadeIn key={s.step} delay={i * 0.1} y={20}>
              <button
                onClick={() => setActiveStep(i)}
                className="w-full text-left rounded-[18px] sm:rounded-[24px] p-4 sm:p-6 transition-all duration-300 cursor-pointer"
                style={{
                  background: activeStep === i ? "rgba(182,0,168,0.12)" : "rgba(215,226,234,0.03)",
                  border: activeStep === i ? `1px solid ${s.color}` : "1px solid rgba(215,226,234,0.08)",
                  boxShadow: activeStep === i ? `0 0 24px rgba(182,0,168,0.15)` : "none",
                }}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <span style={{ fontSize: "clamp(1.2rem,2.5vw,1.8rem)", lineHeight: 1 }}>{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-xs opacity-40" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{s.step}</span>
                      <span className="font-medium uppercase" style={{ color: "#D7E2EA", fontSize: "clamp(0.8rem,1.5vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}>{s.title}</span>
                    </div>
                    {activeStep === i && (
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                        className="font-light leading-relaxed mt-2"
                        style={{ color: "rgba(215,226,234,0.6)", fontSize: "clamp(0.78rem,1.2vw,0.95rem)", fontFamily: "'Kanit',sans-serif" }}>
                        {s.detail}
                      </motion.p>
                    )}
                  </div>
                </div>
              </button>
            </FadeIn>
          ))}
        </div>

        {/* Right: live session demo terminal */}
        <FadeIn delay={0.3} y={30} className="sticky top-24">
          <div className="rounded-[24px] sm:rounded-[32px] overflow-hidden"
            style={{ background: "#111", border: "1px solid rgba(215,226,234,0.12)" }}>
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(215,226,234,0.08)]"
              style={{ background: "rgba(215,226,234,0.04)" }}>
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 font-medium text-xs uppercase tracking-widest opacity-40" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
                giggo session · agent_fgrublDXzNDfu5MT
              </span>
            </div>
            {/* Messages */}
            <div className="p-4 sm:p-6 flex flex-col gap-4 min-h-[320px] sm:min-h-[400px]">
              {LIVE_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: msg.role === "user" ? "rgba(215,226,234,0.15)" : "linear-gradient(135deg,#7621B0,#B600A8)" }}>
                    {msg.role === "user" ? "U" : "G"}
                  </div>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3"
                    style={{
                      background: msg.role === "user" ? "rgba(215,226,234,0.08)" : "rgba(182,0,168,0.12)",
                      border: msg.role === "agent" ? "1px solid rgba(182,0,168,0.25)" : "1px solid rgba(215,226,234,0.1)",
                    }}>
                    <p className="font-light leading-relaxed whitespace-pre-line text-xs sm:text-sm"
                      style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {isPlaying && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: "linear-gradient(135deg,#7621B0,#B600A8)" }}>G</div>
                  <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                    style={{ background: "rgba(182,0,168,0.12)", border: "1px solid rgba(182,0,168,0.25)" }}>
                    {[0, 0.2, 0.4].map(d => (
                      <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-[#B600A8]"
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            {/* Play button */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={playSession}
                disabled={isPlaying}
                className="w-full rounded-full font-medium uppercase tracking-widest py-3 text-xs sm:text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
                style={{
                  background: isPlaying ? "rgba(215,226,234,0.06)" : "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
                  color: "#fff",
                  border: isPlaying ? "1px solid rgba(215,226,234,0.1)" : "none",
                  fontFamily: "'Kanit',sans-serif",
                }}>
                {isPlaying ? "Session running..." : visibleMessages >= LIVE_MESSAGES.length ? "▶ Replay Session" : "▶ Watch a Live Session"}
              </button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── AGENCY COMPARISON ───────────────────────────────────────────────────────

const COMPARISON_ITEMS = [
  { icon: "🔍", label: "We find the best agency quote", sub: "Giggo scours the market and gets you the real price from top human agencies." },
  { icon: "⚡", label: "We deliver the same at 50% less", sub: "Our AI agent produces the identical output — same quality, half the cost, faster turnaround." },
  { icon: "✅", label: "You choose what works for you", sub: "Take the human agency quote, or let Giggo do it. Total transparency, zero pressure." },
];

function AgencyComparisonSection() {
  const scrollToContact = () => {
    const el = document.querySelector("#contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 md:-mt-14 z-10 relative px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28"
      style={{ background: "#0C0C0C" }}>
      <FadeIn y={40} className="text-center mb-10 sm:mb-16 md:mb-20">
        <h2 className="hero-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2rem,8vw,110px)", fontFamily: "'Kanit',sans-serif" }}>
          The Giggo Edge
        </h2>
        <p className="mt-4 font-light uppercase tracking-wide"
          style={{ color: "rgba(215,226,234,0.55)", fontSize: "clamp(0.8rem,1.5vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}>
          We find the best human agency quote — then beat it by 50%
        </p>
      </FadeIn>
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
        {COMPARISON_ITEMS.map((item, i) => (
          <FadeIn key={i} delay={i * 0.12} y={30}>
            <div className="flex flex-col gap-3 rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 md:p-8 h-full"
              style={{ background: "rgba(215,226,234,0.04)", border: "1px solid rgba(215,226,234,0.1)" }}>
              <span style={{ fontSize: "clamp(1.5rem,3vw,2.2rem)" }}>{item.icon}</span>
              <p className="font-medium uppercase" style={{ color: "#D7E2EA", fontSize: "clamp(0.8rem,1.4vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}>{item.label}</p>
              <p className="font-light leading-relaxed" style={{ color: "rgba(215,226,234,0.5)", fontSize: "clamp(0.75rem,1.1vw,0.9rem)", fontFamily: "'Kanit',sans-serif" }}>{item.sub}</p>
            </div>
          </FadeIn>
        ))}
      </div>
      {/* Side-by-side comparison bar */}
      <FadeIn y={20} className="max-w-3xl mx-auto">
        <div className="rounded-[20px] sm:rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(215,226,234,0.1)" }}>
          <div className="grid grid-cols-2">
            <div className="p-5 sm:p-7 flex flex-col gap-2" style={{ background: "rgba(215,226,234,0.04)" }}>
              <p className="font-medium uppercase tracking-widest text-xs" style={{ color: "rgba(215,226,234,0.4)", fontFamily: "'Kanit',sans-serif" }}>Human Agency</p>
              <p className="font-black" style={{ color: "#D7E2EA", fontSize: "clamp(1.2rem,3vw,2rem)", fontFamily: "'Kanit',sans-serif" }}>$2,000+</p>
              <p className="font-light text-xs sm:text-sm" style={{ color: "rgba(215,226,234,0.4)", fontFamily: "'Kanit',sans-serif" }}>5–10 business days</p>
            </div>
            <div className="p-5 sm:p-7 flex flex-col gap-2"
              style={{ background: "linear-gradient(135deg,#18011F 0%,#7621B0 60%,#B600A8 100%)" }}>
              <p className="font-medium uppercase tracking-widest text-xs" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Kanit',sans-serif" }}>Giggo AI ⚡</p>
              <p className="font-black" style={{ color: "#fff", fontSize: "clamp(1.2rem,3vw,2rem)", fontFamily: "'Kanit',sans-serif" }}>$99/mo</p>
              <p className="font-light text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Kanit',sans-serif" }}>24–48 hours</p>
            </div>
          </div>
        </div>
      </FadeIn>
      <div className="flex justify-center mt-10 sm:mt-14">
        <CTA label="See How It Works" onClick={scrollToContact} />
      </div>
    </section>
  );
}

// ─── WORK ────────────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    num: "01", category: "Web Development", name: "Nextlevel Studio",
    col1: [
      "/manus-storage/work-01a_a919dc06.jpg",
      "/manus-storage/work-01b_d39b44dd.jpg",
    ],
    col2: "/manus-storage/work-01c_c220cd01.jpg",
  },
  {
    num: "02", category: "Research", name: "Market Intelligence Report",
    col1: [
      "/manus-storage/work-02a_2722d362.jpg",
      "/manus-storage/work-02b_7e6a6c46.jpg",
    ],
    col2: "/manus-storage/work-02c_9bd77144.jpg",
  },
  {
    num: "03", category: "Marketing", name: "Solaris Digital Campaign",
    col1: [
      "/manus-storage/work-03a_a3a82397.jpg",
      "/manus-storage/work-03b_30601d76.jpg",
    ],
    col2: "/manus-storage/work-03c_a6fb29ae.jpg",
  },
];

const TOTAL = PROJECTS.length;

function ProjectCard({ project, index, progress }: {
  project: (typeof PROJECTS)[0]; index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const targetScale = 1 - (TOTAL - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / TOTAL, 1], [1, targetScale]);
  return (
    <div className="h-[75vh] sm:h-[80vh] flex items-start" style={{ paddingTop: `${index * 18}px` }}>
      <motion.div className="sticky top-16 sm:top-20 md:top-28 w-full rounded-[20px] sm:rounded-[36px] md:rounded-[56px] border-2 border-[#D7E2EA] p-3 sm:p-5 md:p-8"
        style={{ background: "#0C0C0C", scale, transformOrigin: "top center" }}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-5">
          <span className="font-black leading-none" style={{ color: "#D7E2EA", fontSize: "clamp(1.4rem,4.5vw,70px)", fontFamily: "'Kanit',sans-serif" }}>{project.num}</span>
          <span className="uppercase tracking-widest text-[0.6rem] sm:text-xs font-medium opacity-50" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{project.category}</span>
          <span className="font-medium uppercase flex-1 min-w-0 truncate" style={{ color: "#D7E2EA", fontSize: "clamp(0.8rem,1.8vw,1.7rem)", fontFamily: "'Kanit',sans-serif" }}>{project.name}</span>
          <button className="rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest px-3 py-1.5 sm:px-6 sm:py-2.5 text-[0.6rem] sm:text-sm transition-colors duration-200 hover:bg-[#D7E2EA]/10 cursor-pointer flex-shrink-0" style={{ fontFamily: "'Kanit',sans-serif" }}>View Work</button>
        </div>
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          <div className="flex flex-col gap-2 sm:gap-3" style={{ width: "40%" }}>
            <img src={project.col1[0]} alt={project.name} loading="lazy" className="w-full object-cover rounded-[14px] sm:rounded-[28px] md:rounded-[44px]" style={{ height: "clamp(80px,13vw,210px)" }} />
            <img src={project.col1[1]} alt={project.name} loading="lazy" className="w-full object-cover rounded-[14px] sm:rounded-[28px] md:rounded-[44px]" style={{ height: "clamp(100px,17vw,290px)" }} />
          </div>
          <div style={{ width: "60%" }}>
            <img src={project.col2} alt={project.name} loading="lazy" className="w-full h-full object-cover rounded-[14px] sm:rounded-[28px] md:rounded-[44px]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WorkSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  return (
    <section id="work" ref={containerRef}
      className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 md:-mt-14 z-10 relative px-4 sm:px-8 md:px-10 pt-14 sm:pt-20 pb-24 sm:pb-32"
      style={{ background: "#0C0C0C" }}>
      <FadeIn y={40} className="mb-10 sm:mb-16 md:mb-24">
        <h2 className="hero-heading font-black uppercase text-center leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Our Work</h2>
      </FadeIn>
      {PROJECTS.map((project, i) => (
        <ProjectCard key={project.num} project={project} index={i} progress={scrollYProgress} />
      ))}
    </section>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    unit: "/ project",
    desc: "One completed deliverable. Perfect for your first project or a one-off task.",
    features: [
      "1 project at a time",
      "Delivered in 2–5 days",
      "Unlimited revisions",
      "Finished work delivered",
      "Email support",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$99",
    unit: "/ month",
    desc: "Unlimited requests. Perfect for businesses that need a constant output stream.",
    features: [
      "Unlimited project requests",
      "Priority queue",
      "Delivered in 24–48 hours",
      "Your own .top domain included",
      "Dedicated account manager",
      "Monthly reports",
      "Slack / email comms",
    ],
    cta: "Start Monthly Plan",
    highlight: true,
  },
  {
    name: "Studio",
    price: "Custom",
    unit: "",
    desc: "For large organisations and special needs. We build a package that fits you.",
    features: [
      "Everything in Growth",
      "Custom integrations",
      "API access",
      "SLA guarantee",
      "Dedicated development team",
      "Strategy & consulting",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

function PricingSection() {
  const scrollToContact = () => {
    const el = document.querySelector("#contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section id="pricing" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 z-20 relative px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28" style={{ background: "#0C0C0C" }}>
      <FadeIn y={40}>
        <h2 className="hero-heading font-black uppercase text-center mb-3 leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Pricing</h2>
        <p className="text-center font-light mb-10 sm:mb-14" style={{ color: "rgba(215,226,234,0.5)", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.85rem,1.6vw,1.2rem)" }}>
          One project or unlimited output. You choose.
        </p>
      </FadeIn>
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {PLANS.map((plan, i) => (
          <FadeIn key={plan.name} delay={i * 0.1} y={30}>
            <div
              className="flex flex-col rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 md:p-8 h-full transition-transform duration-300 hover:-translate-y-1"
              style={{
                background: plan.highlight ? "linear-gradient(135deg,#18011F 0%,#7621B0 60%,#B600A8 100%)" : "rgba(215,226,234,0.05)",
                border: plan.highlight ? "2px solid #B600A8" : "2px solid rgba(215,226,234,0.12)",
                boxShadow: plan.highlight ? "0 0 40px rgba(182,0,168,0.25)" : "none",
              }}
            >
              {plan.highlight && (
                <span className="self-start mb-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: "'Kanit',sans-serif" }}>
                  Most Popular
                </span>
              )}
              <p className="font-black uppercase mb-1" style={{ color: "#D7E2EA", fontSize: "clamp(1.2rem,2.5vw,1.9rem)", fontFamily: "'Kanit',sans-serif" }}>{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-black" style={{ color: "#fff", fontSize: "clamp(1.5rem,3.5vw,2.6rem)", fontFamily: "'Kanit',sans-serif" }}>{plan.price}</span>
                {plan.unit && <span className="font-light text-xs sm:text-sm" style={{ color: "rgba(215,226,234,0.5)", fontFamily: "'Kanit',sans-serif" }}>{plan.unit}</span>}
              </div>
              <p className="font-light mb-5 leading-relaxed" style={{ color: "rgba(215,226,234,0.6)", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.8rem,1.2vw,0.95rem)" }}>{plan.desc}</p>
              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-light" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: plan.highlight ? "#fff" : "rgba(182,0,168,0.9)" }}>✓</span>
                    <span style={{ fontSize: "clamp(0.75rem,1.1vw,0.9rem)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={scrollToContact}
                className="w-full rounded-full font-medium uppercase tracking-widest py-3 text-xs sm:text-sm transition-all duration-200 cursor-pointer"
                style={{
                  background: plan.highlight ? "#fff" : "transparent",
                  color: plan.highlight ? "#0C0C0C" : "#D7E2EA",
                  border: plan.highlight ? "none" : "2px solid rgba(215,226,234,0.3)",
                  fontFamily: "'Kanit',sans-serif",
                }}
                onMouseEnter={(e) => { if (!plan.highlight) { e.currentTarget.style.borderColor = "rgba(215,226,234,0.7)"; } }}
                onMouseLeave={(e) => { if (!plan.highlight) { e.currentTarget.style.borderColor = "rgba(215,226,234,0.3)"; } }}
              >
                {plan.cta}
              </button>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", service: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const submitEnquiry = trpc.enquiries.submit.useMutation({
    onSuccess: () => { setSubmitted(true); toast.success("Message received! We'll be in touch within 24 hours."); },
    onError: () => toast.error("Something went wrong. Please try again."),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Please fill in all required fields."); return; }
    submitEnquiry.mutate(form);
  };
  return (
    <section id="contact" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 z-20 relative px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28" style={{ background: "#FFFFFF" }}>
      <FadeIn y={40}>
        <h2 className="font-black uppercase text-center mb-10 sm:mb-14"
          style={{ color: "#0C0C0C", fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Contact</h2>
      </FadeIn>
      <div className="max-w-2xl mx-auto">
        {submitted ? (
          <FadeIn y={20}>
            <div className="text-center py-16">
              <p className="font-black uppercase text-[#0C0C0C]" style={{ fontSize: "clamp(1.3rem,4vw,2.8rem)", fontFamily: "'Kanit',sans-serif" }}>Message received.</p>
              <p className="mt-4 font-light" style={{ color: "rgba(12,12,12,0.6)", fontFamily: "'Kanit',sans-serif" }}>We'll be in touch within 24 hours.</p>
            </div>
          </FadeIn>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {[
              { key: "name", label: "Your Name", type: "text", placeholder: "Jane Smith" },
              { key: "email", label: "Email Address", type: "email", placeholder: "jane@company.com" },
              { key: "service", label: "Service (optional)", type: "text", placeholder: "e.g. Website Development" },
            ].map(({ key, label, type, placeholder }) => (
              <FadeIn key={key} y={15} delay={0.1}>
                <div className="flex flex-col gap-2">
                  <label className="font-medium uppercase tracking-wider text-xs sm:text-sm" style={{ color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 font-light outline-none transition-all duration-200"
                    style={{ background: "rgba(12,12,12,0.06)", border: "1px solid rgba(12,12,12,0.15)", color: "#0C0C0C", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.85rem,1.3vw,1rem)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#B600A8"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(12,12,12,0.15)"; }}
                  />
                </div>
              </FadeIn>
            ))}
            <FadeIn y={15} delay={0.2}>
              <div className="flex flex-col gap-2">
                <label className="font-medium uppercase tracking-wider text-xs sm:text-sm" style={{ color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }}>Message</label>
                <textarea
                  placeholder="Tell us what you need..."
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 font-light outline-none transition-all duration-200 resize-none"
                  style={{ background: "rgba(12,12,12,0.06)", border: "1px solid rgba(12,12,12,0.15)", color: "#0C0C0C", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.85rem,1.3vw,1rem)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#B600A8"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(12,12,12,0.15)"; }}
                />
              </div>
            </FadeIn>
            <FadeIn y={15} delay={0.3}>
              <button
                type="submit"
                disabled={submitEnquiry.isPending}
                className="w-full rounded-full font-medium uppercase tracking-widest text-white py-3.5 sm:py-4 text-sm transition-opacity duration-200 hover:opacity-90 disabled:opacity-60 cursor-pointer"
                style={{ background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)", boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1", outline: "2px solid #0C0C0C", outlineOffset: "-3px", fontFamily: "'Kanit',sans-serif" }}
              >
                {submitEnquiry.isPending ? "Sending..." : "Send Message"}
              </button>
            </FadeIn>
          </form>
        )}
      </div>
      {/* Footer */}
      <div className="mt-20 sm:mt-28 pt-8 border-t border-[rgba(12,12,12,0.1)] flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="font-black uppercase tracking-tight"
          style={{ fontFamily: "'Kanit',sans-serif", fontSize: "clamp(1.1rem,2vw,1.5rem)", background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          GIGGO
        </span>
        <p className="font-light text-center" style={{ color: "rgba(12,12,12,0.4)", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.7rem,1.1vw,0.85rem)" }}>
          © {new Date().getFullYear()} Giggo. All rights reserved. · giggo.io
        </p>
        <div className="flex gap-4">
          <button onClick={() => window.location.href = "/chat"}
            className="font-medium uppercase tracking-wider text-xs transition-opacity duration-200 hover:opacity-70 cursor-pointer bg-transparent border-none"
            style={{ color: "rgba(12,12,12,0.5)", fontFamily: "'Kanit',sans-serif" }}>
            AI Chat
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function GiggoHome() {
  return (
    <div style={{ background: "#0C0C0C", fontFamily: "'Kanit',sans-serif", overflowX: "clip" }}>
      <GiggoNav />
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <AgentSessionSection />
      <AgencyComparisonSection />
      <WorkSection />
      <PricingSection />
      <ContactSection />
    </div>
  );
}
