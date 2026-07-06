import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

function CTA({ label = "Hefjast handa", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-full font-medium uppercase tracking-widest text-white cursor-pointer px-6 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base transition-opacity duration-200 hover:opacity-90 whitespace-nowrap"
      style={{ background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)", boxShadow: "0px 4px 4px rgba(181,1,167,0.25),inset 4px 4px 12px #7721B1", outline: "2px solid white", outlineOffset: "-3px", fontFamily: "'Kanit',sans-serif" }}>
      {label}
    </button>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-[100svh] flex flex-col" style={{ background: "#0C0C0C", overflowX: "clip" }}>
      {/* Top nav */}
      <FadeIn delay={0} y={-20}>
        <nav className="flex justify-between items-center px-4 sm:px-6 md:px-10 pt-5 md:pt-8 gap-1 sm:gap-2">
          {[
            { label: "Þjónusta", href: "#services" },
            { label: "Verk", href: "#work" },
            { label: "Um okkur", href: "#about" },
            { label: "Samband", href: "#contact" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              className="font-medium uppercase tracking-wider transition-opacity duration-200 hover:opacity-70 text-[0.65rem] xs:text-xs sm:text-sm md:text-lg lg:text-[1.4rem]"
              style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{label}</a>
          ))}
        </nav>
      </FadeIn>

      {/* Heading — HTML entities ensure ú renders on all platforms */}
      <FadeIn delay={0.15} y={40} className="overflow-hidden">
        <h1 lang="is" className="hero-heading font-black uppercase tracking-tight leading-none w-full mt-4 sm:mt-3 md:-mt-2 px-1"
          style={{ fontFamily: "'Kanit',sans-serif", fontSize: "clamp(3rem,13.5vw,210px)", whiteSpace: "nowrap" }}>
          gummi g&#250;r&#250;
        </h1>
      </FadeIn>

      {/* 3D character — centred below heading on mobile, absolute bottom-centre on sm+ */}
      <FadeIn delay={0.6} y={30}
        className="relative sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:z-10 sm:bottom-0 mx-auto sm:mx-0 mt-4 sm:mt-0"
        style={{ width: "clamp(180px,50vw,460px)" }}>
        <Magnet padding={100} strength={3}>
          <p className="text-center font-medium uppercase tracking-widest mb-3"
            style={{ color: "#D7E2EA", fontSize: "clamp(0.65rem,1.3vw,1.1rem)", fontFamily: "'Kanit',sans-serif", opacity: 0.85 }}>
            hæ þetta er Gummi
          </p>
          <img src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png"
            alt="Gummi G\u00FAr\u00FA" className="w-full h-auto object-contain" loading="eager" />
        </Magnet>
      </FadeIn>

      {/* Bottom bar */}
      <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 sm:pb-8 md:pb-10 px-4 sm:px-6 md:px-10 pt-4 sm:pt-0">
        <FadeIn delay={0.35} y={20}>
          <p className="font-light uppercase tracking-wide leading-snug max-w-[260px] sm:max-w-[220px] md:max-w-[280px]"
            style={{ color: "#D7E2EA", fontSize: "clamp(0.7rem,1.3vw,1.25rem)", fontFamily: "'Kanit',sans-serif" }}>
            Íslenskt gervigreindarstofa. Eitt verkefni. Fullklárað verk afhent.
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20}>
          <CTA label="Hefjast handa" onClick={() => window.location.href = "/chat"} />
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

const ABOUT_TEXT = "Gummi G\u00FAr\u00FA er eins manns stofa knúin áfram af Manus gervigreind. Þú lýsir því sem þú þarft — vefsíðu, rannsóknarskýrslu, markaðsherferð, tillögu — og við afhendum fullklárað verkefni. Ekki drög. Ekki hugmynd. Hið eiginlega verk. Ótakmarkaður geta. Íslenskar rætur. Alþjóðleg sókn.";

function AboutSection() {
  return (
    <section id="about" className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 md:px-10 py-16 sm:py-20" style={{ background: "#0C0C0C" }}>
      <FadeIn delay={0.1} x={-80} y={0} duration={0.9} className="absolute top-[4%] left-[1%] sm:left-[2%] md:left-[4%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png" alt="" className="w-[80px] sm:w-[130px] md:w-[200px]" loading="lazy" />
      </FadeIn>
      <FadeIn delay={0.25} x={-80} y={0} duration={0.9} className="absolute bottom-[8%] left-[2%] sm:left-[6%] md:left-[10%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png" alt="" className="w-[70px] sm:w-[110px] md:w-[170px]" loading="lazy" />
      </FadeIn>
      <FadeIn delay={0.15} x={80} y={0} duration={0.9} className="absolute top-[4%] right-[1%] sm:right-[2%] md:right-[4%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png" alt="" className="w-[80px] sm:w-[130px] md:w-[200px]" loading="lazy" />
      </FadeIn>
      <FadeIn delay={0.3} x={80} y={0} duration={0.9} className="absolute bottom-[8%] right-[2%] sm:right-[6%] md:right-[10%] pointer-events-none">
        <img src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png" alt="" className="w-[90px] sm:w-[140px] md:w-[210px]" loading="lazy" />
      </FadeIn>
      <div className="flex flex-col items-center gap-8 sm:gap-12 md:gap-16 z-10 max-w-[90vw] sm:max-w-2xl">
        <FadeIn delay={0} y={40}>
          <h2 className="hero-heading font-black uppercase leading-none tracking-tight text-center"
            style={{ fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Um okkur</h2>
        </FadeIn>
        <AnimatedText text={ABOUT_TEXT} className="font-medium text-center leading-relaxed"
          style={{ color: "#D7E2EA", fontSize: "clamp(0.9rem,1.8vw,1.3rem)", fontFamily: "'Kanit',sans-serif" }} />
      </div>
      <div className="mt-12 sm:mt-16 md:mt-20 z-10">
        <CTA label="Talaðu við okkur" onClick={() => window.location.href = "/chat"} />
      </div>
    </section>
  );
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

const SERVICES = [
  { num: "01", name: "Vefsíður og forritaþróun", desc: "Fullbúnar, uppsettar vefsíður og vefforrit. Þú sendir okkur lýsingu, við skiluðum lifandi vöru. Engin kóðun þarf af þinni hálfu." },
  { num: "02", name: "Rannsóknir og markaðsgreining", desc: "Ítarlegar rannsóknarskýrslur, samkeppnisgreining og markaðsupplýsingar — skipulegar, tilvísaðar og tilbúnar til notkunar." },
  { num: "03", name: "Markaðsefni og herferðir", desc: "Blogggreinar, tölvupóstkeðjur, auglýsingatextar, efni í samfélagsmiðla og SEO-efni — skrifað, sniðið og tilbúið til birtingar." },
  { num: "04", name: "Viðskiptatillögur og skjöl", desc: "Faglegar tillögur, viðskiptaáætlanir, kynningarsett, samningar og skýrslur — skrifaðar eftir þínum leiðbeiningum og tilbúnar til notkunar." },
  { num: "05", name: "Kynningarglærur", desc: "Sannfærandi glærusett fyrir fjárfestingafundi, sölukynningu og stjórnarfundi — skipulegar, vel útlitslegar og tilbúnar til kynningar." },
  { num: "06", name: "Gagnagreining og töflureiknar", desc: "Hráð gögn inn, skýr greining út. Gröf, samantektir og skipulagðar Excel-skýrslur byggðar á gagnasöfnum þínum." },
  { num: "07", name: "Samfélagsmiðlar og efnispakkar", desc: "Vikna efni skipulagt og skrifað í einni lotu. Færslur, myndatextar, þræðir og hakar yfir allar vettvangana." },
  { num: "08", name: "Viðfangsrannsóknir og listi yfir horfur", desc: "Markvissir listi yfir horfur með tengiliðaupplýsingum, samhengi fyrirtækis og persónulegum nálgunarhornum — tilbúinn til sendingar." },
];

function ServicesSection() {
  return (
    <section id="services" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28" style={{ background: "#FFFFFF" }}>
      <FadeIn y={40}>
        <h2 className="font-black uppercase text-center mb-10 sm:mb-16 md:mb-24"
          style={{ color: "#0C0C0C", fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Þjónusta</h2>
      </FadeIn>
      <div className="max-w-5xl mx-auto overflow-hidden">
        {SERVICES.map((s, i) => (
          <FadeIn key={s.num} delay={i * 0.07} y={20}>
            <div className="flex items-start gap-3 sm:gap-6 md:gap-10 py-5 sm:py-8 md:py-10"
              style={{ borderTop: i === 0 ? "1px solid rgba(12,12,12,0.15)" : undefined, borderBottom: "1px solid rgba(12,12,12,0.15)" }}>
              <span className="font-black leading-none flex-shrink-0"
                style={{ color: "#0C0C0C", fontSize: "clamp(2rem,7vw,110px)", fontFamily: "'Kanit',sans-serif" }}>{s.num}</span>
              <div className="flex flex-col justify-center gap-1 sm:gap-2 pt-1 min-w-0">
                <span className="font-medium uppercase" style={{ color: "#0C0C0C", fontSize: "clamp(0.85rem,1.9vw,1.9rem)", fontFamily: "'Kanit',sans-serif" }}>{s.name}</span>
                <span className="font-light leading-relaxed" style={{ color: "#0C0C0C", opacity: 0.6, fontSize: "clamp(0.75rem,1.3vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}>{s.desc}</span>
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
    num: "01", category: "Vefsíðugerð", name: "Gummi G\u00FAr\u00FA stofusíða",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85",
  },
  {
    num: "02", category: "Rannsóknir", name: "\u00CDslensk mark\u00E6\u00F0sgreining",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85",
  },
  {
    num: "03", category: "Mark\u00E6\u00F0ssetning", name: "Her\u00F0er\u00F0 og efnispakki",
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
    <div className="h-[75vh] sm:h-[80vh] flex items-start" style={{ paddingTop: `${index * 18}px` }}>
      <motion.div className="sticky top-16 sm:top-20 md:top-28 w-full rounded-[20px] sm:rounded-[36px] md:rounded-[56px] border-2 border-[#D7E2EA] p-3 sm:p-5 md:p-8"
        style={{ background: "#0C0C0C", scale, transformOrigin: "top center" }}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-5">
          <span className="font-black leading-none" style={{ color: "#D7E2EA", fontSize: "clamp(1.4rem,4.5vw,70px)", fontFamily: "'Kanit',sans-serif" }}>{project.num}</span>
          <span className="uppercase tracking-widest text-[0.6rem] sm:text-xs font-medium opacity-50" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>{project.category}</span>
          <span className="font-medium uppercase flex-1 min-w-0 truncate" style={{ color: "#D7E2EA", fontSize: "clamp(0.8rem,1.8vw,1.7rem)", fontFamily: "'Kanit',sans-serif" }}>{project.name}</span>
          <button className="rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest px-3 py-1.5 sm:px-6 sm:py-2.5 text-[0.6rem] sm:text-sm transition-colors duration-200 hover:bg-[#D7E2EA]/10 cursor-pointer flex-shrink-0" style={{ fontFamily: "'Kanit',sans-serif" }}>Skoða verk</button>
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
          style={{ fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Verk okkar</h2>
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
    name: "Byrjandi",
    price: "49.900",
    unit: "kr / verkefni",
    desc: "Fullklárað eitt verkefni afhent. Fullkomið fyrir fyrstu verkefnin.",
    features: [
      "1 verkefni í einu",
      "Afhending innan 2-5 daga",
      "Ótak endurskoðana",
      "Fullklárað verk afhent",
      "Tölvupóstsþjónusta",
    ],
    cta: "Hefjast handa",
    highlight: false,
  },
  {
    name: "Vöxtur",
    price: "149.900",
    unit: "kr / mánuð",
    desc: "Ótakmarkaðar beiðnir. Fullkomið fyrir fyrirtæki sem þurfa stöðugar afurðir.",
    features: [
      "Ótakmarkaðar verkefnisbeiðnir",
      "Forgangur í biðröð",
      "Afhending innan 24-48 klukkustunda",
      "Hollur reikningsstjóri",
      "Mánaðarlegar skýrslur",
      "Slack/tölvupóstur samskipti",
    ],
    cta: "Byrja mánaðaráskrift",
    highlight: true,
  },
  {
    name: "Stofuáætlun",
    price: "Sérsniðið",
    unit: "",
    desc: "Fyrir stór fyrirtæki og sérstaka þarfir. Við setjum saman pakka sem hentar þér.",
    features: [
      "Allt í Vöxtur",
      "Sérsniðnar samþættingar",
      "API aðgangur",
      "SLA trygging",
      "Hollur þróunarteymi",
      "Ráðgjöf og stefnumótun",
    ],
    cta: "Hafa samband",
    highlight: false,
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 z-20 relative px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28" style={{ background: "#0C0C0C" }}>
      <FadeIn y={40}>
        <h2 className="hero-heading font-black uppercase text-center mb-3 leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Verðlag</h2>
        <p className="text-center font-light mb-10 sm:mb-14" style={{ color: "rgba(215,226,234,0.5)", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.85rem,1.6vw,1.2rem)" }}>
          Eitt verkefni eða ótakmarkaðar afurðir. Þú velur.
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
                  Vinsælast
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
                onClick={() => window.location.href = plan.name === "Stofuáætlun" ? "#contact" : "/chat"}
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
    onSuccess: () => { setSubmitted(true); toast.success("Skilaboð móttekin! Við höfum samband innan 24 klukkustunda."); },
    onError: () => toast.error("Eitthvað fór úrskeiðis. Vinsamlegast reyndu aftur."),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Vinsamlegast fylltu út öll nauðsynleg svæði."); return; }
    submitEnquiry.mutate(form);
  };
  return (
    <section id="contact" className="rounded-t-[32px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-8 sm:-mt-10 z-20 relative px-4 sm:px-8 md:px-10 py-14 sm:py-20 md:py-28" style={{ background: "#FFFFFF" }}>
      <FadeIn y={40}>
        <h2 className="font-black uppercase text-center mb-10 sm:mb-14"
          style={{ color: "#0C0C0C", fontSize: "clamp(2.5rem,11vw,150px)", fontFamily: "'Kanit',sans-serif" }}>Samband</h2>
      </FadeIn>
      <div className="max-w-2xl mx-auto">
        {submitted ? (
          <FadeIn y={20}>
            <div className="text-center py-16">
              <p className="font-black uppercase text-[#0C0C0C]" style={{ fontSize: "clamp(1.3rem,4vw,2.8rem)", fontFamily: "'Kanit',sans-serif" }}>Skilaboð móttekin.</p>
              <p className="mt-4 font-light" style={{ color: "rgba(12,12,12,0.6)", fontFamily: "'Kanit',sans-serif" }}>Við höfum samband innan 24 klukkustunda.</p>
            </div>
          </FadeIn>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {[
              { key: "name", label: "Nafn þitt", type: "text", placeholder: "Jón Sigurðsson" },
              { key: "email", label: "Netfang", type: "email", placeholder: "jon@fyrirtaeki.is" },
              { key: "service", label: "Þjónusta (valkvætt)", type: "text", placeholder: "t.d. Vefsíðugerð" },
            ].map(({ key, label, type, placeholder }) => (
              <FadeIn key={key} y={15} delay={0.1}>
                <div className="flex flex-col gap-2">
                  <label className="font-medium uppercase tracking-wider text-xs sm:text-sm" style={{ color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 outline-none transition-colors duration-200 focus:border-[#B600A8] text-sm sm:text-base"
                    style={{ borderColor: "rgba(12,12,12,0.15)", background: "#F8F8F8", color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }} />
                </div>
              </FadeIn>
            ))}
            <FadeIn y={15} delay={0.25}>
              <div className="flex flex-col gap-2">
                <label className="font-medium uppercase tracking-wider text-xs sm:text-sm" style={{ color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }}>Lýsing á verkefni</label>
                <textarea rows={5} placeholder="Lýstu því sem þú þarft á einföldu máli. Við sjáum um restina."
                  value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 outline-none transition-colors duration-200 focus:border-[#B600A8] resize-none text-sm sm:text-base"
                  style={{ borderColor: "rgba(12,12,12,0.15)", background: "#F8F8F8", color: "#0C0C0C", fontFamily: "'Kanit',sans-serif" }} />
              </div>
            </FadeIn>
            <FadeIn y={15} delay={0.35} className="flex justify-center mt-2">
              <CTA label={submitEnquiry.isPending ? "Sendi..." : "Senda lýsingu"} />
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
    <footer className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left"
      style={{ background: "#0C0C0C", borderTop: "1px solid rgba(215,226,234,0.1)" }}>
      <span className="font-black uppercase tracking-wider" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif", fontSize: "1rem sm:1.1rem" }}>Gummi G&#250;r&#250;</span>
      <span className="font-light text-xs sm:text-sm" style={{ color: "rgba(215,226,234,0.4)", fontFamily: "'Kanit',sans-serif" }}>© 2025 Gummi G&#250;r&#250;. Íslenskt gervigreindarstofa.</span>
      <a href="/chat" className="font-medium uppercase tracking-widest text-xs sm:text-sm transition-opacity duration-200 hover:opacity-70"
        style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>Talaðu við okkur →</a>
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
      <PricingSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
