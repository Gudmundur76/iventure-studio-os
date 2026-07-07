import ServicePage from "./ServicePage";

export default function WebDevService() {
  return (
    <ServicePage
      num="01"
      category="Web Development"
      title="Website & App Development"
      tagline="From brief to live URL — no code required on your end."
      intro="You describe what you need. Giggo builds it. Whether it's a marketing landing page, a full SaaS product, a client portal, or a mobile app — we handle design, development, and deployment end-to-end. Every project is built with modern frameworks, optimised for speed, and handed over as a live, production-ready URL."
      whatYouGet={[
        { icon: "🌐", title: "Live Production URL", desc: "Every project is deployed and accessible from day one. You get a real URL, not a ZIP file or a Figma mockup." },
        { icon: "📱", title: "Mobile-First Design", desc: "Every site is fully responsive and tested across devices. Your users get a great experience whether they're on a phone, tablet, or desktop." },
        { icon: "⚡", title: "Fast & Optimised", desc: "Built with performance in mind. Fast load times, clean code, and Lighthouse scores above 90 by default." },
        { icon: "🎨", title: "Custom Design", desc: "No templates. Every project is designed from scratch to match your brand, your audience, and your goals." },
        { icon: "🔒", title: "Secure by Default", desc: "HTTPS, secure headers, environment variable management, and best-practice authentication baked in from the start." },
        { icon: "♾️", title: "Unlimited Revisions", desc: "Not happy with something? Just say so. We iterate until it's exactly right — no extra charges, no arguments." },
      ]}
      howItWorks={[
        { step: "01", title: "You send a brief", desc: "Describe what you need in plain English. Include any reference sites, brand guidelines, or specific requirements. No technical knowledge needed." },
        { step: "02", title: "Giggo plans and builds", desc: "We select the right stack, design the layout, write the code, and build the full project — typically within 24–72 hours depending on complexity." },
        { step: "03", title: "You review and request changes", desc: "We share a live preview URL. You review it, send feedback in plain English, and we make the changes." },
        { step: "04", title: "We deploy to your domain", desc: "Once you're happy, we deploy to your domain (or provide one). Your site is live, indexed, and ready to receive traffic." },
      ]}
      useCases={[
        "SaaS landing page", "Marketing website", "Client portal", "E-commerce store", "Internal tool", "Admin dashboard",
        "Mobile app", "API integration", "Booking system", "Membership platform", "Blog or content site", "One-page pitch site",
      ]}
      turnaround="24–72h"
      startingAt="$29"
    />
  );
}
