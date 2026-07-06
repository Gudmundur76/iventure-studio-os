import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────

function FadeIn({
  children, delay = 0, duration = 0.7, x = 0, y = 30, className,
}: {
  children: React.ReactNode; delay?: number; duration?: number;
  x?: number; y?: number; className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "50px", amount: 0 });
  return (
    <motion.div ref={ref} className={className}
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
      className="rounded-full font-medium uppercase tracking-widest text-white cursor-pointer px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base transition-opacity duration-200 hover:opacity-90"
      style={{ background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)", boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1", outline: "2px solid white", outlineOffset: "-3px", fontFamily: "'Kanit',sans-serif" }}>
      {label}
    </button>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative h-screen flex flex-col" style={{ background: "#0C0C0C", overflowX: "clip" }}>
      <FadeIn delay={0} y={-20}>
        <nav className="flex justify-between items-center px-6 md:px-10 pt-6 md:pt-8">
          {["Services", "Work", "About", "Contact"].map((link) => (
            <a key={link} href={`#${link.toLowerCase()}`}
              className="font-medium uppercase tracking-wider transition-opacity duration-200 hover:opacity-70 text-sm md:text-lg lg:text-[1.4rem]"
              style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{link}</a>
          ))}
        </nav>
      </FadeIn>

      <FadeIn delay={0.15} y={40} className="overflow-hidden">
        <h1 className="hero-heading font-black uppercase tracking-tight leading-none whitespace-nowrap w-full text-[11vw] sm:text-[12vw] md:text-[13vw] lg:text-[14.5vw] mt-6 sm:mt-4 md:-mt-5"
          style={{ fontFamily: "'Kanit',sans-serif" }}>
          gummi guru
        </h1>
      </FadeIn>

      <FadeIn delay={0.6} y={30}
        className="absolute left-1/2 -translate-x-1/2 z-10 top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0 w-[240px] sm:w-[320px] md:w-[400px] lg:w-[480px]">
        <Magnet padding={150} strength={3}>
          <p
            className="text-center font-medium uppercase tracking-widest mb-4"
            style={{ color: "#D7E2EA", fontSize: "clamp(0.85rem,1.6vw,1.4rem)", fontFamily: "'Kanit',sans-serif", opacity: 0.85 }}
          >
            hæ þetta er Gummi
          </p>
          <img src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png"
            alt="Amplify" className="w-full h-auto object-contain" loading="eager" />
        </Magnet>
      </FadeIn>

      <div className="mt-auto flex justify-between items-end pb-7 sm:pb-8 md:pb-10 px-6 md:px-10">
        <FadeIn delay={0.35} y={20}>
          <p className="font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
            style={{ color: "#D7E2EA", fontSize: "clamp(0.75rem,1.4vw,1.5rem)", fontFamily: "'Kanit',sans-serif" }}>
            Gummi Guru — Iceland&apos;s AI-powered agency. One brief. Finished work delivered.
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20}>
          <CTA label="Get Started" onClick={() => window.location.href = "/chat"} />
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
    <section ref={sectionRef} className="overflow-hidden pt-24 sm:pt-32 md:pt-40 pb-10" style={{ background: "#0C0C0C" }}>
      <div className="flex gap-3 mb-3" style={{ transform: `translateX(${offset - 200}px)`, willChange: "transform" }}>
        {triple(ROW1).map((src, i) => <img key={i} src={src} alt="" loading="lazy" className="rounded-2xl object-cover flex-shrink-0" style={{ width: 420, height: 270 }} />)}
      </div>
      <div className="flex gap-3" style={{ transform: `translateX(${-(offset - 200)}px)`, willChange: "transform" }}>
        {triple(ROW2).map((src, i) => <img key={i} src={src} alt="" loading="lazy" className="rounded-2xl object-cover flex-shrink-0" style={{ width: 420, height: 270 }} />)}
      </div>
    </section>
  );
}

// ─── ABOUT ───────────────────────────────────────────────────────────────────

const ABOUT_TEXT = "Amplify is a one-person agency powered by Manus AI. You describe what you need — a website, a research report, a marketing campaign, a proposal — and we deliver the finished asset. Not a draft. Not a prompt. The actual thing. Unlimited capacity. Icelandic roots. Global reach.";

function AboutSection() {
  return (
    <section id="about" className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 md:px-10 py-20" style={{ background: "#0C0C0C" }}>
      <FadeIn delay={0.1} x={-80} y={0} duration={0.9} className="absolute top-[4%] left-[1%] sm:left-[2%] md:left-[4%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png" alt="" className="w-[120px] sm:w-[160px] md:w-[210px]" loading="lazy" />
      </FadeIn>
      <FadeIn delay={0.25} x={-80} y={0} duration={0.9} className="absolute bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png" alt="" className="w-[100px] sm:w-[140px] md:w-[180px]" loading="lazy" />
      </FadeIn>
      <FadeIn delay={0.15} x={80} y={0} duration={0.9} className="absolute top-[4%] right-[1%] sm:right-[2%] md:right-[4%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png" alt="" className="w-[120px] sm:w-[160px] md:w-[210px]" loading="lazy" />
      </FadeIn>
      <FadeIn delay={0.3} x={80} y={0} duration={0.9} className="absolute bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png" alt="" className="w-[130px] sm:w-[170px] md:w-[220px]" loading="lazy" />
      </FadeIn>
      <div className="flex flex-col items-center gap-10 sm:gap-14 md:gap-16 z-10">
        <FadeIn delay={0} y={40}>
          <h2 className="hero-heading font-black uppercase leading-none tracking-tight text-center"
            style={{ fontSize: "clamp(3rem,12vw,160px)", fontFamily: "'Kanit',sans-serif" }}>About us</h2>
        </FadeIn>
        <AnimatedText text={ABOUT_TEXT} className="font-medium text-center leading-relaxed max-w-[560px]"
          style={{ color: "#D7E2EA", fontSize: "clamp(1rem,2vw,1.35rem)", fontFamily: "'Kanit',sans-serif" }} />
      </div>
      <div className="mt-16 sm:mt-20 md:mt-24 z-10">
        <CTA label="Talk to us" onClick={() => window.location.href = "/chat"} />
      </div>
    </section>
  );
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

const SERVICES = [
  { num: "01", name: "Website & App Development", desc: "Fully built, deployed websites and web applications. You brief us, we ship the live product. No code required on your end." },
  { num: "02", name: "Research & Market Intelligence", desc: "Deep-dive research reports, competitor analysis, and market intelligence — structured, cited, and ready to act on." },
  { num: "03", name: "Marketing Content & Campaigns", desc: "Blog posts, SEO copy, social media batches, email sequences, and ad copy — written, formatted, and ready to publish." },
  { num: "04", name: "Business Proposals & Documents", desc: "Professional proposals, reports, and business documents — polished and client-ready, generated to your brief." },
  { num: "05", name: "Presentation Decks", desc: "Compelling slide decks for pitches, board meetings, and client presentations — structured, designed, and delivered." },
  { num: "06", name: "Data Analysis & Spreadsheets", desc: "Raw data in, clean analysis out. Charts, summaries, and structured spreadsheets built from your data sources." },
  { num: "07", name: "Social Media & Content Batches", desc: "Weeks of content planned and written in one session. Posts, captions, threads, and hooks across all platforms." },
  { num: "08", name: "Lead Research & Prospect Lists", desc: "Targeted prospect lists with contact details, company context, and personalised outreach angles — ready to send." },
];

function ServicesSection() {
  return (
    <section id="services" className="rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32" style={{ background: "#FFFFFF" }}>
      <FadeIn y={40}>
        <h2 className="font-black uppercase text-center mb-16 sm:mb-20 md:mb-28"
          style={{ color: "#0C0C0C", fontSize: "clamp(3rem,12vw,160px)", fontFamily: "'Kanit',sans-serif" }}>Services</h2>
      </FadeIn>
      <div className="max-w-5xl mx-auto">
        {SERVICES.map((s, i) => (
          <FadeIn key={s.num} delay={i * 0.07} y={20}>
            <div className="flex items-start gap-6 md:gap-10 py-8 sm:py-10 md:py-12"
              style={{ borderTop: i === 0 ? "1px solid rgba(12,12,12,0.15)" : undefined, borderBottom: "1px solid rgba(12,12,12,0.15)" }}>
              <span className="font-black leading-none flex-shrink-0"
                style={{ color: "#0C0C0C", fontSize: "clamp(3rem,10vw,140px)", fontFamily: "'Kanit',sans-serif" }}>{s.num}</span>
              <div className="flex flex-col justify-center gap-2 pt-2">
                <span className="font-medium uppercase" style={{ color: "#0C0C0C", fontSize: "clamp(1rem,2.2vw,2.1rem)", fontFamily: "'Kanit',sans-serif" }}>{s.name}</span>
                <span className="font-light leading-relaxed max-w-2xl" style={{ color: "#0C0C0C", opacity: 0.6, fontSize: "clamp(0.85rem,1.6vw,1.25rem)", fontFamily: "'Kanit',sans-serif" }}>{s.desc}</span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─── WORK ────────────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    num: "01", category: "Web Development", name: "Amplify Agency Site",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85",
  },
  {
    num: "02", category: "Research", name: "Icelandic Market Report",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85",
  },
  {
    num: "03", category: "Marketing", name: "Campaign & Content Suite",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png&w=1280&q=85",
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
    <div className="h-[85vh] flex items-start" style={{ paddingTop: `${index * 28}px` }}>
      <motion.div className="sticky top-24 md:top-32 w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] border-2 border-[#D7E2EA] p-4 sm:p-6 md:p-8"
        style={{ background: "#0C0C0C", scale, transformOrigin: "top center" }}>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="font-black leading-none" style={{ color: "#D7E2EA", fontSize: "clamp(2rem,6vw,80px)", fontFamily: "'Kanit',sans-serif" }}>{project.num}</span>
          <span className="uppercase tracking-widest text-sm font-medium opacity-50" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{project.category}</span>
          <span className="font-medium uppercase flex-1" style={{ color: "#D7E2EA", fontSize: "clamp(1rem,2.5vw,2rem)", fontFamily: "'Kanit',sans-serif" }}>{project.name}</span>
          <button className="rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base transition-colors duration-200 hover:bg-[#D7E2EA]/10 cursor-pointer" style={{ fontFamily: "'Kanit',sans-serif" }}>View Work</button>
        </div>
        <div className="flex gap-3 sm:gap-4">
          <div className="flex flex-col gap-3 sm:gap-4" style={{ width: "40%" }}>
            <img src={project.col1[0]} alt={project.name} loading="lazy" className="w-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px]" style={{ height: "clamp(130px,16vw,230px)" }} />
            <img src={project.col1[1]} alt={project.name} loading="lazy" className="w-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px]" style={{ height: "clamp(160px,22vw,340px)" }} />
          </div>
          <div style={{ width: "60%" }}>
            <img src={project.col2} alt={project.name} loading="lazy" className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px]" />
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
      className="rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 z-10 relative px-5 sm:px-8 md:px-10 pt-20 pb-32"
      style={{ background: "#0C0C0C" }}>
      <FadeIn y={40} className="mb-16 sm:mb-20 md:mb-28">
        <h2 className="hero-heading font-black uppercase text-center leading-none tracking-tight"
          style={{ fontSize: "clamp(3rem,12vw,160px)", fontFamily: "'Kanit',sans-serif" }}>Our Work</h2>
      </FadeIn>
      {PROJECTS.map((project, i) => (
        <ProjectCard key={project.num} project={project} index={i} progress={scrollYProgress} />
      ))}
    </section>
  );
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", service: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const submitEnquiry = trpc.enquiries.submit.useMutation({
    onSuccess: () => { setSubmitted(true); toast.success("Message sent! We'll be in touch within 24 hours."); },
    onError: () => toast.error("Something went wrong. Please try again."),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Please fill in all required fields."); return; }
    submitEnquiry.mutate(form);
  };
  return (
    <section id="contact" className="rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 z-20 relative px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32" style={{ background: "#FFFFFF" }}>
      <FadeIn y={40}>
        <h2 className="font-black uppercase text-center mb-16 sm:mb-20"
          style={{ color: "#0C0C0C", fontSize: "clamp(3rem,12vw,160px)", fontFamily: "'Kanit',sans-serif" }}>Contact</h2>
      </FadeIn>
      <div className="max-w-2xl mx-auto">
        {submitted ? (
          <FadeIn y={20}>
            <div className="text-center py-20">
              <p className="font-black uppercase text-[#0C0C0C]" style={{ fontSize: "clamp(1.5rem,4vw,3rem)", fontFamily: "'Kanit',sans-serif" }}>Message received.</p>
              <p className="mt-4 font-light" style={{ color: "rgba(12,12,12,0.6)", fontFamily: "'Kanit',sans-serif" }}>We&apos;ll be in touch within 24 hours.</p>
            </div>
          </FadeIn>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {[
              { key: "name", label: "Your Name", type: "text", placeholder: "Jón Sigurðsson" },
              { key: "email", label: "Email Address", type: "email", placeholder: "jon@company.is" },
              { key: "service", label: "Service (optional)", type: "text", placeholder: "e.g. Website Development" },
            ].map(({ key, label, type, placeholder }) => (
              <FadeIn key={key} y={15} delay={0.1}>
                <div className="flex flex-col gap-2">
                  <label className="font-medium uppercase tracking-wider text-sm" style={{ color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-5 py-4 rounded-2xl border-2 outline-none transition-colors duration-200 focus:border-[#B600A8]"
                    style={{ borderColor: "rgba(12,12,12,0.15)", background: "#F8F8F8", color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }} />
                </div>
              </FadeIn>
            ))}
            <FadeIn y={15} delay={0.25}>
              <div className="flex flex-col gap-2">
                <label className="font-medium uppercase tracking-wider text-sm" style={{ color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }}>Your Brief</label>
                <textarea rows={5} placeholder="Describe what you need in plain language. We'll handle the rest."
                  value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-5 py-4 rounded-2xl border-2 outline-none transition-colors duration-200 focus:border-[#B600A8] resize-none"
                  style={{ borderColor: "rgba(12,12,12,0.15)", background: "#F8F8F8", color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }} />
              </div>
            </FadeIn>
            <FadeIn y={15} delay={0.35} className="flex justify-center mt-4">
              <CTA label={submitEnquiry.isPending ? "Sending..." : "Send Brief"} />
            </FadeIn>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="px-6 md:px-10 py-10 flex flex-col sm:flex-row justify-between items-center gap-4"
      style={{ background: "#0C0C0C", borderTop: "1px solid rgba(215,226,234,0.1)" }}>
      <span className="font-black uppercase tracking-wider" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif", fontSize: "1.2rem" }}>Amplify</span>
      <span className="font-light text-sm" style={{ color: "rgba(215,226,234,0.4)", fontFamily: "'Kanit',sans-serif" }}>© 2025 Amplify. Iceland&apos;s AI-powered agency.</span>
      <a href="/chat" className="font-medium uppercase tracking-widest text-sm transition-opacity duration-200 hover:opacity-70"
        style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>Talk to us →</a>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function AmplifyHome() {
  return (
    <div style={{ background: "#0C0C0C", fontFamily: "'Kanit',sans-serif", overflowX: "clip" }}>
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <WorkSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
