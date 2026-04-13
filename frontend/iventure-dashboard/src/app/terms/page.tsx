import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — iVenture Studio Reasoning Engine API",
  description:
    "Terms of Use for the iVenture Studio Reasoning Engine API. Effective April 13, 2026.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-zinc-100 font-sans">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-white font-semibold text-lg">
          <span className="text-purple-400">✦</span> Iventure
        </a>
        <div className="flex gap-6 text-sm text-zinc-400">
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/#get-started" className="hover:text-white transition-colors">Get Started</a>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">
          iVenture Studio — Reasoning Engine API
        </h1>
        <h2 className="text-2xl font-semibold text-purple-400 mb-6">Terms of Use</h2>
        <div className="text-sm text-zinc-400 mb-10 flex gap-6">
          <span><strong className="text-zinc-300">Effective Date:</strong> April 13, 2026</span>
          <span><strong className="text-zinc-300">Last Updated:</strong> April 13, 2026</span>
        </div>

        <div className="space-y-10 text-zinc-300 leading-7">

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h3>
            <p>
              By accessing or using the iVenture Reasoning Engine API (&ldquo;the API&rdquo;), you agree to be
              bound by these Terms of Use. If you do not agree, you must not use the API.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">2. Service Description</h3>
            <p>
              The API provides enterprise-grade deep reasoning traces across four domains: Legal,
              Finance, Cybersecurity, and Biotech. The service is powered by the VIC Engine and
              delivers multi-hop chain-of-thought reasoning outputs.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">3. API Access and Authentication</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Access requires a valid API key obtained through RapidAPI or directly from iVenture Studio.</li>
              <li>API keys are non-transferable and must not be shared with third parties.</li>
              <li>You are responsible for all activity under your API key.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">4. Permitted Use</h3>
            <p className="mb-2">You may use the API for:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Internal business analysis and decision support</li>
              <li>Integration into your own products and services (with attribution)</li>
              <li>Research and development purposes</li>
              <li>Building applications that consume reasoning outputs</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">5. Prohibited Use</h3>
            <p className="mb-2">You may <strong className="text-red-400">NOT</strong> use the API to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Reverse-engineer, extract, or reconstruct the underlying models or training data</li>
              <li>Redistribute raw API outputs as a competing dataset or reasoning service</li>
              <li>Generate content that is illegal, harmful, defamatory, or violates third-party rights</li>
              <li>Exceed your subscribed rate limits through circumvention or key sharing</li>
              <li>Use automated systems to scrape or bulk-download reasoning traces for resale</li>
              <li>Misrepresent API outputs as human-generated analysis in regulated filings without disclosure</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">6. Pricing and Billing</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Pricing is determined by your selected plan (Basic, Pro, or Ultra) as listed on RapidAPI.</li>
              <li>Usage-based charges apply per compute minute at published domain rates.</li>
              <li>Bulk discounts: 20% for 10,000+ queries/month, 35% for 100,000+ queries/month.</li>
              <li>All fees are billed through RapidAPI or via PayPal invoice for direct enterprise agreements.</li>
              <li>Payments are non-refundable except where required by applicable law.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">7. Rate Limits and Quotas</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Each plan has defined rate limits and monthly quotas.</li>
              <li>Exceeding limits will result in HTTP 429 responses until the next billing period or quota reset.</li>
              <li>iVenture Studio reserves the right to throttle or suspend access for abusive usage patterns.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">8. Data and Privacy</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>The API processes the content you submit in your requests to generate reasoning outputs.</li>
              <li>iVenture Studio does not store your input prompts beyond the duration needed to process the request.</li>
              <li>Aggregated, anonymized usage statistics may be collected for service improvement.</li>
              <li>iVenture Studio will not sell or share your input data with third parties.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">9. Intellectual Property</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>The API, its underlying models, training data, and documentation are the intellectual property of iVenture Studio, Reykjavik, Iceland.</li>
              <li>You retain ownership of your input prompts.</li>
              <li>API outputs (reasoning traces) are licensed to you for use under your subscribed plan. You may not claim exclusive ownership of generic reasoning patterns.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">10. Service Level and Availability</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>iVenture Studio targets 99.5% API uptime but does not guarantee uninterrupted service.</li>
              <li>Scheduled maintenance windows will be communicated in advance where possible.</li>
              <li>iVenture Studio is not liable for losses arising from service interruptions.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">11. Disclaimer of Warranties</h3>
            <p className="uppercase text-sm text-zinc-400 leading-6">
              THE API IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
              IVENTURE STUDIO DOES NOT WARRANT THAT API OUTPUTS ARE ACCURATE, COMPLETE, OR SUITABLE
              FOR ANY PARTICULAR PURPOSE. API OUTPUTS DO NOT CONSTITUTE LEGAL, FINANCIAL, MEDICAL,
              OR PROFESSIONAL ADVICE.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">12. Limitation of Liability</h3>
            <p className="uppercase text-sm text-zinc-400 leading-6">
              IN NO EVENT SHALL IVENTURE STUDIO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE API. TOTAL LIABILITY
              SHALL NOT EXCEED THE FEES PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">13. Termination</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>iVenture Studio may suspend or terminate your access for violation of these terms.</li>
              <li>You may cancel your subscription at any time through RapidAPI or by contacting iVenture Studio.</li>
              <li>Upon termination, your API key will be revoked and outstanding balances become due.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">14. Modifications</h3>
            <p>
              iVenture Studio reserves the right to modify these terms at any time. Continued use
              of the API after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">15. Governing Law</h3>
            <p>
              These terms are governed by the laws of Iceland. Any disputes shall be resolved in
              the courts of Reykjavik, Iceland.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-3">16. Contact</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-zinc-200">Email:</strong>{" "}
                <a href="mailto:Pippinlitli@hotmail.com" className="text-purple-400 hover:underline">
                  Pippinlitli@hotmail.com
                </a>
              </li>
              <li><strong className="text-zinc-200">Organization:</strong> iVenture Studio</li>
              <li>
                <strong className="text-zinc-200">HuggingFace:</strong>{" "}
                <a
                  href="https://huggingface.co/IVentureISB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  https://huggingface.co/IVentureISB
                </a>
              </li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 px-6 py-8 text-center text-sm text-zinc-500">
        <p>&copy; {new Date().getFullYear()} iVenture Studio. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
          <a href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">Terms</a>
          <a href="mailto:Pippinlitli@hotmail.com" className="hover:text-zinc-300 transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
