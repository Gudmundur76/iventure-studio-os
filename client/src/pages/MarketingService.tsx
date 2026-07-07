import ServicePage from "./ServicePage";

export default function MarketingService() {
  return (
    <ServicePage
      num="03"
      category="Marketing"
      title="Marketing Content & Campaigns"
      tagline="Content that converts — written, formatted, and ready to publish."
      intro="From SEO blog posts and email sequences to ad copy, social media content, and full campaign briefs — Giggo produces the complete content stack your business needs to grow. Every piece is written to your brand voice, optimised for your channel, and delivered ready to publish. No editing required."
      whatYouGet={[
        { icon: "✍️", title: "On-Brand Copy", desc: "Every piece is written to match your brand voice, tone, and audience — not generic AI filler. We adapt to your style from the first brief." },
        { icon: "📧", title: "Email Sequences", desc: "Welcome flows, nurture sequences, re-engagement campaigns — full multi-email sequences written, formatted, and ready to load into your ESP." },
        { icon: "📱", title: "Social Media Content", desc: "Weeks of posts, threads, carousels, and hooks across LinkedIn, X, Instagram, and TikTok — planned, written, and formatted for each platform." },
        { icon: "🔎", title: "SEO-Optimised Blog Posts", desc: "Long-form articles built around your target keywords, structured for search intent, and written to rank — not just fill a content calendar." },
        { icon: "💰", title: "Ad Copy & Landing Pages", desc: "Google Ads, Meta Ads, LinkedIn Ads — headlines, body copy, and CTAs written and tested for conversion, paired with matching landing pages." },
        { icon: "📋", title: "Campaign Briefs", desc: "Full campaign strategy documents — audience, messaging, channels, creative direction, and KPIs — ready to hand to any team or agency." },
      ]}
      howItWorks={[
        { step: "01", title: "You share your brief and brand", desc: "Tell us your product, audience, goals, and any brand guidelines. The more context you give, the more on-brand the output." },
        { step: "02", title: "Giggo plans the content strategy", desc: "We map out the content structure — what to write, for which channel, in what format — before writing a single word." },
        { step: "03", title: "We write, format, and package", desc: "All content is written, formatted for its channel, and packaged into a single deliverable — ready to copy-paste or upload directly." },
        { step: "04", title: "You publish and grow", desc: "No editing, no reformatting. Your content is ready to go live the moment it lands in your inbox." },
      ]}
      useCases={[
        "Product launch campaign", "Monthly blog content", "Email welcome sequence", "LinkedIn thought leadership",
        "Google Ads copy", "Instagram content calendar", "SaaS onboarding emails", "B2B nurture sequence",
        "Press release", "Case study", "Newsletter", "Podcast show notes",
      ]}
      turnaround="24h"
      startingAt="$29"
    />
  );
}

