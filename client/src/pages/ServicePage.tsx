import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const FONT = "'Kanit', sans-serif";
const DARK = "#0C0C0C";
const LIGHT = "#D7E2EA";
const PURPLE = "#B600A8";
const GRAD = "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)";

function FadeIn({ children, delay = 0, y = 30, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface ServicePageProps {
  num: string;
  category: string;
  title: string;
  tagline: string;
  intro: string;
  whatYouGet: { icon: string; title: string; desc: string }[];
  howItWorks: { step: string; title: string; desc: string }[];
  useCases: string[];
  turnaround: string;
  startingAt: string;
}

export default function ServicePage({
  num, category, title, tagline, intro, whatYouGet, howItWorks, useCases, turnaround, startingAt,
}: ServicePageProps) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: DARK, fontFamily: FONT, overflowX: "clip", minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-10 py-4"
        style={{ background: "rgba(12,12,12,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(215,226,234,0.07)" }}>
        <Link href="/">
          <span className="font-black uppercase tracking-tight cursor-pointer"
            style={{ fontFamily: FONT, fontSize: "clamp(1.1rem,2vw,1.4rem)", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            GIGGO
          </span>
        </Link>
        <Link href="/#contact">
          <span className="rounded-full font-medium uppercase tracking-widest px-5 py-2 text-xs sm:text-sm cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: GRAD, color: "#fff", fontFamily: FONT }}>
            Get Started
          </span>
        </Link>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-5 sm:px-10 md:px-16 max-w-5xl mx-auto">
        <FadeIn delay={0.05}>
          <p className="font-medium uppercase tracking-widest text-xs sm:text-sm mb-3" style={{ color: "rgba(215,226,234,0.4)", fontFamily: FONT }}>
            {num} / {category}
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="font-black uppercase leading-none tracking-tight mb-5"
            style={{ color: LIGHT, fontSize: "clamp(2.4rem,9vw,120px)", fontFamily: FONT }}>
            {title}
          </h1>
        </FadeIn>
        <FadeIn delay={0.18}>
          <p className="font-medium leading-relaxed mb-6"
            style={{ color: "rgba(215,226,234,0.7)", fontSize: "clamp(1rem,2vw,1.4rem)", fontFamily: FONT, maxWidth: "680px" }}>
            {tagline}
          </p>
        </FadeIn>
        <FadeIn delay={0.24}>
          <p className="font-light leading-relaxed"
            style={{ color: "rgba(215,226,234,0.5)", fontSize: "clamp(0.85rem,1.4vw,1.05rem)", fontFamily: FONT, maxWidth: "640px" }}>
            {intro}
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-4 mt-8">
            <div className="rounded-[14px] px-5 py-3 flex flex-col gap-0.5" style={{ background: "rgba(182,0,168,0.12)", border: "1px solid rgba(182,0,168,0.3)" }}>
              <span className="font-black text-white" style={{ fontSize: "clamp(1.1rem,2vw,1.5rem)", fontFamily: FONT }}>{turnaround}</span>
              <span className="font-light uppercase tracking-wide text-xs" style={{ color: "rgba(215,226,234,0.45)", fontFamily: FONT }}>Turnaround</span>
            </div>
            <div className="rounded-[14px] px-5 py-3 flex flex-col gap-0.5" style={{ background: "rgba(215,226,234,0.05)", border: "1px solid rgba(215,226,234,0.1)" }}>
              <span className="font-black text-white" style={{ fontSize: "clamp(1.1rem,2vw,1.5rem)", fontFamily: FONT }}>{startingAt}</span>
              <span className="font-light uppercase tracking-wide text-xs" style={{ color: "rgba(215,226,234,0.45)", fontFamily: FONT }}>Starting at</span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* What You Get */}
      <section className="rounded-t-[40px] sm:rounded-t-[60px] px-5 sm:px-10 md:px-16 py-14 sm:py-20" style={{ background: "#fff" }}>
        <FadeIn y={40}>
          <h2 className="font-black uppercase mb-10 sm:mb-14"
            style={{ color: DARK, fontSize: "clamp(1.8rem,6vw,80px)", fontFamily: FONT }}>What You Get</h2>
        </FadeIn>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {whatYouGet.map((item, i) => (
            <FadeIn key={i} delay={i * 0.08} y={20}>
              <div className="rounded-[20px] p-5 sm:p-6 h-full flex flex-col gap-3"
                style={{ background: "rgba(12,12,12,0.04)", border: "1px solid rgba(12,12,12,0.1)" }}>
                <span style={{ fontSize: "clamp(1.4rem,2.5vw,2rem)" }}>{item.icon}</span>
                <p className="font-medium uppercase" style={{ color: DARK, fontSize: "clamp(0.85rem,1.4vw,1.05rem)", fontFamily: FONT }}>{item.title}</p>
                <p className="font-light leading-relaxed" style={{ color: "rgba(12,12,12,0.55)", fontSize: "clamp(0.78rem,1.1vw,0.9rem)", fontFamily: FONT }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="rounded-t-[40px] sm:rounded-t-[60px] -mt-6 px-5 sm:px-10 md:px-16 py-14 sm:py-20" style={{ background: DARK }}>
        <FadeIn y={40}>
          <h2 className="font-black uppercase mb-10 sm:mb-14"
            style={{ color: LIGHT, fontSize: "clamp(1.8rem,6vw,80px)", fontFamily: FONT }}>How It Works</h2>
        </FadeIn>
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {howItWorks.map((step, i) => (
            <FadeIn key={i} delay={i * 0.1} y={20}>
              <div className="flex gap-4 sm:gap-8 items-start rounded-[20px] p-5 sm:p-7"
                style={{ background: "rgba(215,226,234,0.04)", border: "1px solid rgba(215,226,234,0.08)" }}>
                <span className="font-black flex-shrink-0 leading-none" style={{ color: PURPLE, fontSize: "clamp(1.5rem,4vw,3.5rem)", fontFamily: FONT }}>{step.step}</span>
                <div>
                  <p className="font-medium uppercase mb-1" style={{ color: LIGHT, fontSize: "clamp(0.9rem,1.6vw,1.2rem)", fontFamily: FONT }}>{step.title}</p>
                  <p className="font-light leading-relaxed" style={{ color: "rgba(215,226,234,0.5)", fontSize: "clamp(0.78rem,1.2vw,0.95rem)", fontFamily: FONT }}>{step.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="rounded-t-[40px] sm:rounded-t-[60px] -mt-6 px-5 sm:px-10 md:px-16 py-14 sm:py-20" style={{ background: "#fff" }}>
        <FadeIn y={40}>
          <h2 className="font-black uppercase mb-8 sm:mb-12"
            style={{ color: DARK, fontSize: "clamp(1.8rem,6vw,80px)", fontFamily: FONT }}>Use Cases</h2>
        </FadeIn>
        <div className="max-w-4xl mx-auto flex flex-wrap gap-3">
          {useCases.map((uc, i) => (
            <FadeIn key={i} delay={i * 0.05} y={10}>
              <span className="rounded-full px-4 py-2 font-medium uppercase tracking-wide text-xs sm:text-sm"
                style={{ background: "rgba(12,12,12,0.06)", border: "1px solid rgba(12,12,12,0.15)", color: DARK, fontFamily: FONT }}>
                {uc}
              </span>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-t-[40px] sm:rounded-t-[60px] -mt-6 px-5 sm:px-10 md:px-16 py-16 sm:py-24 text-center" style={{ background: DARK }}>
        <FadeIn y={30}>
          <h2 className="font-black uppercase mb-4" style={{ color: LIGHT, fontSize: "clamp(1.8rem,6vw,80px)", fontFamily: FONT }}>
            Ready to start?
          </h2>
          <p className="font-light mb-8" style={{ color: "rgba(215,226,234,0.5)", fontFamily: FONT, fontSize: "clamp(0.85rem,1.5vw,1.1rem)" }}>
            Describe what you need and Giggo will handle the rest.
          </p>
          <Link href="/#contact">
            <span className="inline-block rounded-full font-medium uppercase tracking-widest px-8 py-4 text-sm cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: GRAD, color: "#fff", fontFamily: FONT, boxShadow: "0px 4px 24px rgba(182,0,168,0.35)" }}>
              Get Started
            </span>
          </Link>
          <div className="mt-10">
            <Link href="/">
              <span className="font-light text-xs uppercase tracking-widest cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "rgba(215,226,234,0.35)", fontFamily: FONT }}>
                ← Back to Giggo
              </span>
            </Link>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
