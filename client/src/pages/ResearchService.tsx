import ServicePage from "./ServicePage";

export default function ResearchService() {
  return (
    <ServicePage
      num="02"
      category="Research & Analysis"
      title="Research & Market Analysis"
      tagline="Deep intelligence, structured and ready to act on."
      intro="Giggo conducts thorough market research, competitive analysis, and industry deep-dives — then delivers structured reports you can present, publish, or act on immediately. Every report is sourced, cited, and formatted to a professional standard. No fluff, no filler. Just the intelligence you need to make better decisions faster."
      whatYouGet={[
        { icon: "📊", title: "Structured Reports", desc: "Every deliverable is a fully formatted document — executive summary, key findings, data tables, and recommendations — ready to present or share." },
        { icon: "🔍", title: "Primary Source Research", desc: "We go beyond surface-level summaries. Reports draw from industry databases, company filings, academic sources, and verified market data." },
        { icon: "📈", title: "Competitive Analysis", desc: "Understand exactly where your competitors stand — their positioning, pricing, strengths, weaknesses, and strategic direction." },
        { icon: "🎯", title: "Actionable Recommendations", desc: "Every report ends with clear, prioritised recommendations. Not just data — a path forward." },
        { icon: "📝", title: "Cited & Verifiable", desc: "All claims are sourced and referenced. You can verify every data point and share the report with confidence." },
        { icon: "🔄", title: "Unlimited Revisions", desc: "Need a different angle, more depth on a section, or a different format? Just ask. We revise until it's exactly what you need." },
      ]}
      howItWorks={[
        { step: "01", title: "You define the research question", desc: "Tell us what you need to understand. A market opportunity, a competitor landscape, an industry trend, an investment thesis — whatever the question is." },
        { step: "02", title: "Giggo researches and structures", desc: "We identify the right sources, gather the data, and structure the findings into a clear, logical report framework." },
        { step: "03", title: "We write and format the report", desc: "The full report is written, formatted, and reviewed for accuracy — typically delivered within 48 hours." },
        { step: "04", title: "You receive the finished document", desc: "Delivered as a PDF, Word document, or Google Doc — whichever format works best for your workflow." },
      ]}
      useCases={[
        "Market entry research", "Competitor landscape", "Investment memo", "Due diligence report", "Industry trend analysis",
        "Customer persona research", "Pricing benchmarking", "Technology landscape", "Regulatory overview", "Partnership evaluation",
        "Product-market fit analysis", "Academic literature review",
      ]}
      turnaround="24–48h"
      startingAt="$29"
    />
  );
}
