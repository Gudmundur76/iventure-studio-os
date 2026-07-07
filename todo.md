# Amplify Agency Website — TODO

## Phase 2: Scaffold & Theme
- [x] Rename app title to "Amplify" in index.html
- [x] Apply aurora dark theme: #0D0D0D bg, #00FF87 accent, #F0F4F8 text
- [x] Load Syne + DM Sans + JetBrains Mono fonts from Google Fonts
- [x] Build top navigation bar (logo, nav links, CTA button, mobile menu)
- [x] Build footer with links and contact info
- [x] Set up App.tsx routing for Amplify pages

## Phase 3: Homepage Sections
- [x] Hero section: bold headline, aurora gradient text, dual CTA (Chat + Browse Services)
- [x] Services catalogue: 8 service cards with outcome-focused descriptions
- [x] How It Works: 3-step process section
- [x] Skywork capabilities showcase: 6 output types with icons
- [x] Stats bar (8 services, 24h turnaround, 100% finished, ∞ capacity)
- [x] Pricing section: 3 tiers (Starter ISK 49,900 / Growth ISK 149,900 / Agency Custom)
- [x] About section: solo operator + Manus-powered agency story
- [x] Contact/enquiry form with validation and tRPC submit

## Phase 4: Chat Interface
- [x] Chat interface page: LLM-powered client enquiry chat
- [x] Model selector in chat (claude-sonnet-4-5, gpt-4o, gemini-2.0-flash, etc.)
- [x] Amplify-branded system prompt for client intake
- [x] Back to Amplify navigation

## Phase 5: Backend
- [x] DB: enquiries table (name, email, service, message, status)
- [x] tRPC: enquiries.submit mutation + enquiries.list (protected)
- [x] DB helpers: createEnquiry, listEnquiries

## Phase 6: Polish, Tests & Delivery
- [x] Vitest tests for enquiries router (submit valid, reject invalid email, reject empty message, list protected)
- [x] TypeScript: 0 errors
- [x] Run tests and verify pass (16/16 passing)
- [x] Final screenshot verification (homepage + chat confirmed)
- [x] Checkpoint and delivery (v1.0 — version 973ba2dd)

## Phase 7: Nýjustu fréttir — Latest Updates Publishing
- [x] Add updates/posts DB table (title, slug, excerpt, content, category, published, publishedAt)
- [x] Add tRPC router: updates.list, updates.getBySlug, updates.create, updates.update, updates.delete
- [x] Build /updates standalone page (full feed with category filter)
- [x] Build /updates/:slug individual post page
- [x] Build /admin/updates admin page (create/edit/delete posts, owner-only protected route)
- [x] Add "Fréttir" nav link to AmplifyNav
- [x] Wire all routes in App.tsx
- [x] Checkpoint and deliver updates feature

## Phase 8: Giggo.io Rebrand (English / International)
- [x] Build GiggoNav component with English nav items and Giggo wordmark
- [x] Build GiggoHome.tsx — Hero, Marquee, About, Agency Comparison, Services, Work, Pricing, Contact
- [x] Wire App.tsx to use GiggoHome as / route
- [x] Wire App.tsx to use GiggoChat as /chat route
- [x] Update client/index.html title to "Giggo — Your AI Agent"
- [x] Rebrand chat page (GiggoChat.tsx) with English system prompt and Giggo persona
- [ ] Add backend endpoints: POST /api/email, POST /api/reminder, POST /api/task
- [ ] Verify invoice PDF generation end-to-end
- [ ] Add voice agent integration (xAI WebSocket)
- [ ] Connect giggo.io domain
