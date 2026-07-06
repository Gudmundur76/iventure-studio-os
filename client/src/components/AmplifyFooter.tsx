import { Zap, Mail, Linkedin, Github } from "lucide-react";

const footerLinks = {
  Services: [
    "Website Development",
    "Research Reports",
    "Marketing Content",
    "Business Proposals",
    "Presentations",
    "Data Analysis",
  ],
  Company: [
    "About Amplify",
    "How It Works",
    "Capabilities",
    "Pricing",
  ],
  Legal: [
    "Privacy Policy",
    "Terms of Service",
  ],
};

export default function AmplifyFooter() {
  return (
    <footer
      className="relative"
      style={{ background: "var(--amp-dark)", borderTop: "1px solid var(--amp-border)" }}
    >
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--amp-green)" }}
              >
                <Zap size={16} style={{ color: "var(--amp-black)" }} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "var(--amp-white)" }}>
                Amplify
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: "var(--amp-muted)" }}>
              Iceland's AI-powered agency. One brief. Finished work delivered — websites, research, marketing, proposals, and more.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="mailto:hello@amplify.is"
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: "var(--amp-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amp-green)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--amp-muted)")}
              >
                <Mail size={16} />
                hello@amplify.is
              </a>
            </div>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: <Linkedin size={18} />, href: "#" },
                { icon: <Github size={18} />, href: "#" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "var(--amp-surface-2)", color: "var(--amp-muted)", border: "1px solid var(--amp-border)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--amp-green)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--amp-green-dim)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--amp-muted)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--amp-border)";
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--amp-muted-2)" }}
              >
                {category}
              </h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors"
                      style={{ color: "var(--amp-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amp-white)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--amp-muted)")}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="amp-divider my-10" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "var(--amp-muted-2)" }}>
            © 2026 Amplify. Based in Iceland. Powered by Manus AI.
          </p>
          <p className="text-xs" style={{ color: "var(--amp-muted-2)" }}>
            Built by one person. Delivered like an agency.
          </p>
        </div>
      </div>
    </footer>
  );
}

