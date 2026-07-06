import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Zap, Globe, FileText, Megaphone, Presentation,
  BarChart3, Users, Search, CheckCircle2, ChevronRight,
  MessageSquare, Sparkles, Clock, Shield, Star, Send, Loader2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/* ── DATA ── */
const services = [
  {
    icon: <Globe size={24} />,
    title: "Website & App Development",
    tagline: "Brief us. We build it. You own it.",
    description: "From landing pages to full-stack web apps. We design, develop, and deploy production-ready websites — responsive, fast, and built to convert.",
    deliverable: "Live website or web app",
    time: "2–5 days",
    examples: ["Landing pages", "SaaS dashboards", "E-commerce stores", "Client portals"],
  },
  {
    icon: <Search size={24} />,
    title: "Research Reports & Market Intelligence",
    tagline: "Deep research. Structured insight. Delivered.",
    description: "Competitor analysis, market research, industry reports, due diligence briefs. We gather, synthesise, and format intelligence into polished, actionable reports.",
    deliverable: "PDF or Word report",
    time: "1–2 days",
    examples: ["Market entry reports", "Competitor analysis", "Industry overviews", "Due diligence briefs"],
  },
  {
    icon: <Megaphone size={24} />,
    title: "Marketing Content & Campaigns",
    tagline: "Content that converts. At scale.",
    description: "Blog posts, email sequences, ad copy, social media batches, SEO content — written, formatted, and ready to publish. One brief, a week of content.",
    deliverable: "Ready-to-publish content files",
    time: "1–3 days",
    examples: ["Blog articles", "Email sequences", "Ad copy", "Social media batches"],
  },
  {
    icon: <FileText size={24} />,
    title: "Business Proposals & Documents",
    tagline: "Professional documents. No back-and-forth.",
    description: "Client proposals, business plans, pitch decks, contracts, SOPs, and reports — written to your brief and formatted for immediate use.",
    deliverable: "DOCX or PDF document",
    time: "Same day – 2 days",
    examples: ["Client proposals", "Business plans", "SOPs", "Grant applications"],
  },
  {
    icon: <Presentation size={24} />,
    title: "Presentation Decks",
    tagline: "Slide decks that close deals.",
    description: "Investor pitches, sales presentations, board updates, and training decks — structured, visually polished, and ready to present.",
    deliverable: "PPTX or PDF presentation",
    time: "1–2 days",
    examples: ["Investor pitch decks", "Sales presentations", "Board updates", "Training materials"],
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Data Analysis & Spreadsheets",
    tagline: "Raw data in. Insight out.",
    description: "Upload your data — we analyse it, build dashboards, create charts, and deliver a structured Excel report with findings and recommendations.",
    deliverable: "Excel file or HTML dashboard",
    time: "Same day – 2 days",
    examples: ["Sales analysis", "Financial models", "KPI dashboards", "Data cleaning"],
  },
  {
    icon: <MessageSquare size={24} />,
    title: "Social Media & Content Batches",
    tagline: "A month of content. One brief.",
    description: "Captions, threads, LinkedIn posts, newsletter issues — batched, scheduled, and ready to go. Stop writing, start publishing.",
    deliverable: "Content calendar + copy files",
    time: "1–2 days",
    examples: ["LinkedIn posts", "Twitter/X threads", "Newsletter issues", "Instagram captions"],
  },
  {
    icon: <Users size={24} />,
    title: "Lead Research & Prospect Lists",
    tagline: "Targeted lists. Ready to contact.",
    description: "We research, qualify, and compile prospect lists — company name, contact, email, and scoring — so your outreach starts with the right people.",
    deliverable: "Scored spreadsheet",
    time: "Same day – 1 day",
    examples: ["B2B prospect lists", "Competitor customer research", "Partnership targets", "Investor lists"],
  },
];

const capabilities = [
  { icon: <FileText size={20} />, name: "Documents", desc: "Reports, proposals, contracts, plans — any format (DOCX, PDF, HTML, Markdown)" },
  { icon: <Presentation size={20} />, name: "Presentations", desc: "Polished slide decks generated from a topic, template, or brief" },
  { icon: <BarChart3 size={20} />, name: "Spreadsheets", desc: "Excel files with live data, charts, pivot tables, and financial models" },
  { icon: <Search size={20} />, name: "Deep Research", desc: "Multi-source web research synthesised into structured, cited reports" },
  { icon: <Globe size={20} />, name: "Web Development", desc: "Full-stack websites and apps — designed, built, and deployed live" },
  { icon: <Sparkles size={20} />, name: "Design Assets", desc: "Posters, logos, illustrations, and branded visuals generated to brief" },
];

const steps = [
  {
    number: "01",
    title: "You brief us",
    desc: "Tell us what you need — via the chat, a form, or an email. Be as rough or as detailed as you like. We'll ask if we need more.",
  },
  {
    number: "02",
    title: "We run it",
    desc: "Our AI-powered system researches, writes, builds, or analyses — depending on your brief. No back-and-forth. No waiting for a human to start.",
  },
  {
    number: "03",
    title: "You receive the finished work",
    desc: "A polished, ready-to-use deliverable lands in your inbox or dashboard. Not a draft. Not a prompt. The actual finished thing.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "49.900",
    currency: "ISK",
    period: "per project",
    desc: "For one-off tasks and single deliverables.",
    features: [
      "1 service delivery",
      "Research or content or document",
      "Delivered within 2 business days",
      "1 revision round",
      "Email delivery",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Growth",
    price: "149.900",
    currency: "ISK",
    period: "per month",
    desc: "For businesses that need ongoing AI-powered output.",
    features: [
      "Up to 8 service deliveries/month",
      "All service types included",
      "Priority turnaround (same day – 2 days)",
      "Unlimited revisions",
      "Dedicated chat channel",
      "Monthly performance review",
    ],
    cta: "Start Growing",
    highlight: true,
  },
  {
    name: "Agency",
    price: "Custom",
    currency: "",
    period: "tailored",
    desc: "For agencies and teams needing high-volume output.",
    features: [
      "Unlimited deliveries",
      "White-label option",
      "API / connector integration",
      "Dedicated account management",
      "Custom workflows",
      "SLA guarantee",
    ],
    cta: "Talk to Us",
    highlight: false,
  },
];

const stats = [
  { value: "8", label: "Service categories" },
  { value: "24h", label: "Average turnaround" },
  { value: "100%", label: "Finished deliverables" },
  { value: "∞", label: "Manus-powered capacity" },
];

/* ── COMPONENT ── */
export default function AmplifyHome() {
  const [contactForm, setContactForm] = useState({ name: "", email: "", service: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);

  const submitEnquiry = trpc.enquiries.submit.useMutation({
    onSuccess: () => {
      toast.success("Enquiry sent! We'll be in touch within 24 hours.");
      setContactForm({ name: "", email: "", service: "", message: "" });
      setSubmitting(false);
    },
    onError: (_err) => {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    submitEnquiry.mutate(contactForm);
  };

  return (
    <div style={{ background: "var(--amp-black)", color: "var(--amp-white)" }}>

      {/* ── HERO ── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ paddingTop: "6rem" }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,135,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,135,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Aurora glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: "800px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(0,255,135,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="amp-badge mb-8 inline-flex">
              <Zap size={12} />
              Iceland's AI-Powered Agency
            </div>

            <h1
              className="mb-6 animate-fade-in-up"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(2.5rem, 7vw, 5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              One brief.{" "}
              <span className="aurora-gradient">Finished work</span>
              {" "}delivered.
            </h1>

            <p
              className="text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-fade-in-up"
              style={{
                color: "var(--amp-muted)",
                animationDelay: "0.1s",
                lineHeight: 1.7,
              }}
            >
              Amplify is a one-person agency powered by Manus AI. You describe what you need — a website, a research report, a marketing campaign, a proposal — and we deliver the finished asset. Not a draft. Not a prompt. The actual thing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Link href="/chat">
                <button className="btn-primary flex items-center gap-2 text-base px-6 py-3">
                  <MessageSquare size={18} />
                  Talk to us
                </button>
              </Link>
              <button
                className="btn-outline flex items-center gap-2 text-base px-6 py-3"
                onClick={() => {
                  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Browse services
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Stats bar */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-10 border-t"
              style={{ borderColor: "var(--amp-border)" }}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div
                    className="text-3xl font-display font-800 mb-1"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--amp-green)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm" style={{ color: "var(--amp-muted)" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="section" style={{ background: "var(--amp-dark)" }}>
        <div className="container">
          <div className="text-center mb-16">
            <div className="amp-badge mb-4 inline-flex">Services</div>
            <h2
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "1rem" }}
            >
              What we deliver
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--amp-muted)" }}>
              Every service is outcome-focused. You receive a finished, ready-to-use deliverable — not a starting point.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((service, i) => (
              <div
                key={service.title}
                className="amp-card p-6 flex flex-col gap-4 cursor-pointer"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,255,135,0.1)", color: "var(--amp-green)" }}
                >
                  {service.icon}
                </div>
                <div>
                  <h3
                    className="text-base font-semibold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}
                  >
                    {service.title}
                  </h3>
                  <p className="text-xs font-medium mb-3" style={{ color: "var(--amp-green)" }}>
                    {service.tagline}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                    {service.description}
                  </p>
                </div>
                <div className="mt-auto pt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--amp-border)" }}>
                  <div>
                    <div className="text-xs" style={{ color: "var(--amp-muted-2)" }}>Deliverable</div>
                    <div className="text-xs font-medium" style={{ color: "var(--amp-white)" }}>{service.deliverable}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs" style={{ color: "var(--amp-muted-2)" }}>Turnaround</div>
                    <div className="text-xs font-medium" style={{ color: "var(--amp-green)" }}>{service.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="section">
        <div className="container">
          <div className="text-center mb-16">
            <div className="amp-badge mb-4 inline-flex">Process</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "1rem" }}>
              How it works
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--amp-muted)" }}>
              Three steps from brief to finished work. No project management overhead. No waiting for a team to start.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div
              className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px"
              style={{ background: "linear-gradient(90deg, var(--amp-green-dim), transparent, var(--amp-green-dim))" }}
            />
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10"
                  style={{
                    background: i === 1 ? "var(--amp-green)" : "var(--amp-surface)",
                    border: `2px solid ${i === 1 ? "var(--amp-green)" : "var(--amp-border-2)"}`,
                    boxShadow: i === 1 ? "0 0 32px var(--amp-green-glow)" : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      color: i === 1 ? "var(--amp-black)" : "var(--amp-green)",
                    }}
                  >
                    {step.number}
                  </span>
                </div>
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link href="/chat">
              <button className="btn-primary flex items-center gap-2 mx-auto text-base px-6 py-3">
                Start your first brief
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="capabilities" className="section" style={{ background: "var(--amp-dark)" }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="amp-badge mb-6 inline-flex">Powered by Manus + Skywork</div>
              <h2
                style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", marginBottom: "1.25rem", lineHeight: 1.1 }}
              >
                What Amplify can produce
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                Every deliverable is generated using Manus AI's autonomous capabilities — research, writing, coding, data analysis — combined with Skywork's professional document and presentation engine. The result is agency-quality output at machine speed.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Finished deliverables, not drafts",
                  "Professional formatting in every output",
                  "Built-in web research for up-to-date content",
                  "Multiple output formats (DOCX, PDF, PPTX, XLSX, HTML)",
                  "Delivered within hours, not weeks",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 size={18} style={{ color: "var(--amp-green)", marginTop: "2px", flexShrink: 0 }} />
                    <span className="text-sm" style={{ color: "var(--amp-muted)" }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capabilities.map((cap) => (
                <div
                  key={cap.name}
                  className="amp-card p-5 flex flex-col gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,255,135,0.1)", color: "var(--amp-green)" }}
                  >
                    {cap.icon}
                  </div>
                  <div>
                    <h4
                      className="font-semibold mb-1 text-sm"
                      style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}
                    >
                      {cap.name}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                      {cap.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="section">
        <div className="container">
          <div className="text-center mb-16">
            <div className="amp-badge mb-4 inline-flex">Pricing</div>
            <h2
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "1rem" }}
            >
              Simple, transparent pricing
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--amp-muted)" }}>
              Pay per project or subscribe for ongoing output. No retainers, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className="amp-card p-8 flex flex-col relative"
                style={{
                  border: plan.highlight ? "1px solid var(--amp-green-dim)" : "1px solid var(--amp-border)",
                  boxShadow: plan.highlight ? "0 0 40px var(--amp-green-glow)" : "none",
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 amp-badge text-xs"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3
                    className="text-lg font-semibold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "var(--amp-muted)" }}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.currency && (
                      <span className="text-sm" style={{ color: "var(--amp-muted)" }}>{plan.currency}</span>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: plan.price === "Custom" ? "2rem" : "2.25rem",
                        color: plan.highlight ? "var(--amp-green)" : "var(--amp-white)",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: "var(--amp-muted)" }}>/{plan.period}</span>
                  </div>
                </div>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 size={15} style={{ color: "var(--amp-green)", marginTop: "2px", flexShrink: 0 }} />
                      <span className="text-sm" style={{ color: "var(--amp-muted)" }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={plan.highlight ? "btn-primary w-full" : "btn-outline w-full"}
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="section" style={{ background: "var(--amp-dark)" }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="amp-badge mb-6 inline-flex">About Amplify</div>
              <h2
                style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", marginBottom: "1.25rem", lineHeight: 1.1 }}
              >
                Built by one person.<br />
                <span className="aurora-gradient">Delivered like an agency.</span>
              </h2>
              <p className="mb-5 leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                Amplify is a solo operation based in Iceland. I built it because I believe the most valuable thing a business owner has is their time — and too much of that time gets spent on work that a machine could do better and faster.
              </p>
              <p className="mb-5 leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                By combining Manus AI's autonomous capabilities with Skywork's professional output engine, I can deliver the kind of work that used to require a team of specialists — research analysts, copywriters, developers, designers — as a single, fast, affordable service.
              </p>
              <p className="leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                The result is an agency that punches far above its weight. You get agency-quality deliverables at a fraction of the cost and a fraction of the time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Clock size={20} />, title: "Fast turnaround", desc: "Most deliverables within 24–48 hours. Some same day." },
                { icon: <Shield size={20} />, title: "Finished work only", desc: "We don't deliver drafts. Every output is ready to use." },
                { icon: <Zap size={20} />, title: "AI-powered capacity", desc: "No team bottlenecks. Manus handles the workload." },
                { icon: <Star size={20} />, title: "Icelandic roots", desc: "Based in Iceland. Understanding local market context." },
              ].map((item) => (
                <div key={item.title} className="amp-card p-5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: "rgba(0,255,135,0.1)", color: "var(--amp-green)" }}
                  >
                    {item.icon}
                  </div>
                  <h4
                    className="font-semibold mb-1 text-sm"
                    style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}
                  >
                    {item.title}
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--amp-muted)" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="section" ref={contactRef}>
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="amp-badge mb-4 inline-flex">Get Started</div>
              <h2
                style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "1rem" }}
              >
                Send us your brief
              </h2>
              <p style={{ color: "var(--amp-muted)" }}>
                Tell us what you need. We'll get back to you within 24 hours with a plan and a price.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="amp-card p-8 flex flex-col gap-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                    style={{
                      background: "var(--amp-surface-2)",
                      border: "1px solid var(--amp-border)",
                      color: "var(--amp-white)",
                      fontFamily: "var(--font-body)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--amp-green)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--amp-border)")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                    style={{
                      background: "var(--amp-surface-2)",
                      border: "1px solid var(--amp-border)",
                      color: "var(--amp-white)",
                      fontFamily: "var(--font-body)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--amp-green)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--amp-border)")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}>
                  Service needed
                </label>
                <select
                  value={contactForm.service}
                  onChange={(e) => setContactForm({ ...contactForm, service: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: "var(--amp-surface-2)",
                    border: "1px solid var(--amp-border)",
                    color: contactForm.service ? "var(--amp-white)" : "var(--amp-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--amp-green)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--amp-border)")}
                >
                  <option value="">Select a service...</option>
                  {services.map((s) => (
                    <option key={s.title} value={s.title}>{s.title}</option>
                  ))}
                  <option value="Not sure yet">Not sure yet — let's talk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--amp-white)" }}>
                  Tell us what you need *
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Describe your project, what you need delivered, and any relevant context. The more detail, the better."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all resize-none"
                  style={{
                    background: "var(--amp-surface-2)",
                    border: "1px solid var(--amp-border)",
                    color: "var(--amp-white)",
                    fontFamily: "var(--font-body)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--amp-green)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--amp-border)")}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center justify-center gap-2 w-full text-base py-3"
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Sending...</>
                ) : (
                  <><Send size={18} /> Send brief</>
                )}
              </button>

              <p className="text-xs text-center" style={{ color: "var(--amp-muted-2)" }}>
                Or chat directly →{" "}
                <Link href="/chat">
                  <span style={{ color: "var(--amp-green)", cursor: "pointer" }}>Open chat</span>
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
}
