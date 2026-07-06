import { getDb } from "./db";
import { agents, skills, memoryEntries, cortexSignals, projects } from "../drizzle/schema";

const VMOA_AGENTS = [
  { agentId: "vmoa-commander", name: "Commander", role: "Orchestrator & Task Router", model: "gpt-5", status: "active" as const, grpoScore: 0.9913, tasksCompleted: 1247, routingPriority: 1, capabilities: ["routing", "orchestration", "planning"] },
  { agentId: "vmoa-financial", name: "Financial Analyst", role: "Finance, VAT, Revenue Intelligence", model: "claude-opus-4-5", status: "active" as const, grpoScore: 0.9891, tasksCompleted: 892, routingPriority: 2, capabilities: ["finance", "tax-calc", "cashflow", "vat"] },
  { agentId: "vmoa-legal", name: "Legal Counsel", role: "Contract Review & Compliance", model: "claude-sonnet-4-5", status: "idle" as const, grpoScore: 0.9867, tasksCompleted: 634, routingPriority: 3, capabilities: ["legal", "contracts", "compliance", "gdpr"] },
  { agentId: "vmoa-marketing", name: "Growth Marketer", role: "SEO, Content, Campaign Strategy", model: "gpt-5", status: "active" as const, grpoScore: 0.9845, tasksCompleted: 1103, routingPriority: 4, capabilities: ["seo", "content", "ads", "social"] },
  { agentId: "vmoa-technical", name: "Tech Architect", role: "Code Review, Architecture, DevOps", model: "claude-opus-4-5", status: "active" as const, grpoScore: 0.9878, tasksCompleted: 756, routingPriority: 5, capabilities: ["code", "architecture", "devops", "security"] },
  { agentId: "vmoa-research", name: "Deep Researcher", role: "Market Research & Intelligence", model: "gemini-2.5-pro", status: "active" as const, grpoScore: 0.9834, tasksCompleted: 521, routingPriority: 6, capabilities: ["research", "analysis", "web-search", "synthesis"] },
  { agentId: "vmoa-operations", name: "Ops Manager", role: "Process Automation & Workflows", model: "gpt-5", status: "idle" as const, grpoScore: 0.9812, tasksCompleted: 445, routingPriority: 7, capabilities: ["automation", "workflows", "scheduling", "monitoring"] },
  { agentId: "vmoa-sales", name: "Sales Intelligence", role: "CRM, Outreach & Pipeline", model: "claude-sonnet-4-5", status: "active" as const, grpoScore: 0.9789, tasksCompleted: 389, routingPriority: 8, capabilities: ["crm", "outreach", "pipeline", "proposals"] },
  { agentId: "vmoa-creative", name: "Creative Director", role: "Brand, Design & Content Production", model: "gemini-2.5-pro", status: "idle" as const, grpoScore: 0.9756, tasksCompleted: 312, routingPriority: 9, capabilities: ["design", "brand", "copywriting", "visual"] },
  { agentId: "vmoa-data", name: "Data Engineer", role: "Analytics, ETL & Reporting", model: "deepseek-v3", status: "active" as const, grpoScore: 0.9823, tasksCompleted: 678, routingPriority: 10, capabilities: ["data", "etl", "sql", "visualization"] },
  { agentId: "vmoa-cortex", name: "Cortex Curator", role: "Knowledge Graph & Signal Ingestion", model: "gemini-2.5-pro", status: "active" as const, grpoScore: 0.9901, tasksCompleted: 2341, routingPriority: 11, capabilities: ["cortex", "knowledge-graph", "signals", "privacy"] },
  { agentId: "vmoa-network", name: "Network Broker", role: "A2A Discovery & Peer Coordination", model: "gpt-5", status: "idle" as const, grpoScore: 0.9767, tasksCompleted: 198, routingPriority: 12, capabilities: ["a2a", "network", "peer-discovery", "reputation"] },
  { agentId: "vmoa-security", name: "Security Sentinel", role: "Threat Detection & Compliance Audit", model: "claude-opus-4-5", status: "active" as const, grpoScore: 0.9856, tasksCompleted: 423, routingPriority: 13, capabilities: ["security", "audit", "threat-detection", "hardening"] },
];

const SKILLS_DATA = [
  { skillId: "tax-calc", name: "Tax Calculator", category: "Finance", description: "VAT, corporate tax, and income tax computation across EU/US jurisdictions", usageCount: 1247 },
  { skillId: "cashflow", name: "Cashflow Forecaster", category: "Finance", description: "12-month rolling cashflow projections with scenario modelling", usageCount: 892 },
  { skillId: "contract-review", name: "Contract Reviewer", category: "Legal", description: "AI-powered contract clause analysis with risk scoring and redlines", usageCount: 634 },
  { skillId: "gdpr-audit", name: "GDPR Auditor", category: "Legal", description: "Data processing audit, DPA generation, and compliance gap analysis", usageCount: 412 },
  { skillId: "seo-analysis", name: "SEO Analyser", category: "Marketing", description: "Technical SEO audit, keyword research, and content gap identification", usageCount: 1103 },
  { skillId: "ad-copy", name: "Ad Copy Generator", category: "Marketing", description: "High-converting ad copy for Google, Meta, LinkedIn with A/B variants", usageCount: 876 },
  { skillId: "deep-research", name: "Deep Research", category: "Research", description: "Multi-source research synthesis with citation and confidence scoring", usageCount: 521 },
  { skillId: "competitor-intel", name: "Competitor Intelligence", category: "Research", description: "Real-time competitor monitoring, pricing, and positioning analysis", usageCount: 389 },
  { skillId: "code-review", name: "Code Reviewer", category: "Technical", description: "Security-focused code review with OWASP compliance checks", usageCount: 756 },
  { skillId: "architecture", name: "Architecture Planner", category: "Technical", description: "System design, API contracts, and infrastructure recommendations", usageCount: 445 },
  { skillId: "sheets-export", name: "Sheets Exporter", category: "Integrations", description: "Export any structured data to Google Sheets with formatting", usageCount: 2341 },
  { skillId: "ppt-generator", name: "PPT Generator", category: "Integrations", description: "Generate professional PowerPoint presentations from data or briefs", usageCount: 678 },
  { skillId: "email-intel", name: "Email Intelligence", category: "Integrations", description: "Gmail action item extraction and priority inbox management", usageCount: 534 },
  { skillId: "crm-sync", name: "CRM Sync", category: "Integrations", description: "Bidirectional CRM data sync with lead scoring and pipeline updates", usageCount: 312 },
  { skillId: "cortex-contribute", name: "Cortex Contributor", category: "Cortex", description: "Privacy-safe signal distillation and world model contribution", usageCount: 4521 },
  { skillId: "knowledge-graph", name: "Knowledge Graph Builder", category: "Cortex", description: "Entity extraction and relationship mapping to Neo4j-compatible graph", usageCount: 1876 },
  { skillId: "a2a-discovery", name: "A2A Discovery", category: "Network", description: "Peer node discovery, capability matching, and task delegation routing", usageCount: 198 },
  { skillId: "reputation-score", name: "Reputation Scorer", category: "Network", description: "GRPO-based node reputation calculation and network trust scoring", usageCount: 156 },
  { skillId: "reward-scoring", name: "GRPO Reward Scorer", category: "Intelligence", description: "Composite reward scoring using Skywork-Reward-V2 pipeline", usageCount: 8934 },
  { skillId: "memory-recall", name: "Memory Recall", category: "Intelligence", description: "Semantic memory search across sprint history and session context", usageCount: 3421 },
];

const MEMORY_ENTRIES = [
  { sprintId: "S012", sessionType: "Architecture Decision", title: "MASTER DEVELOPMENT PLAN v1.0 LOCKED", content: "Three-layer architecture confirmed: Layer 1 (Studio OS P1-P10), Layer 2 (OPC Network P11-P13), Layer 3 (VIC Cortex P14-P18). Cortex hooks embedded in P3. A2A stubs embedded in P3. Saves ~300h of refactoring.", phase: "P3", tags: ["architecture", "decision", "locked"] },
  { sprintId: "S012", sessionType: "Technical Migration", title: "BRIDGE ARCHITECTURE v2.0 LIVE", content: "Genspark Bridge activated for Intelligence Layer. LiteLLM re-mapped to localhost:7055. VMOA v2.0 manifest-driven with AGENTS.yaml. Timescale upgrade for Cortex-native storage.", phase: "P4", tags: ["migration", "litellm", "vmoa"] },
  { sprintId: "S011", sessionType: "Strategic Pivot", title: "US/EU PIVOT — China references removed", content: "All Shenzhen/China references removed from active configs. Focus: Icelandic, US, and EU regulatory markets. Currency defaulted to USD/EUR. First Harness prototype live.", phase: "P3", tags: ["strategy", "pivot", "us-eu"] },
  { sprintId: "S011", sessionType: "Build Session", title: "VMOA 9-Agent Team Operational", content: "All 9 VMOA agents routing correctly. GRPO composite computes end-to-end. Cortex contributor stub fires silently. A2A agent card served at /.well-known/agent.json.", phase: "P3", tags: ["vmoa", "grpo", "cortex"] },
  { sprintId: "S010", sessionType: "Infrastructure", title: "P1 Infrastructure Bedrock Complete", content: "Docker stack healthy: Traefik, PostgreSQL (Timescale), Redis, MinIO all running. Cross-container DNS resolves. Volume persistence verified.", phase: "P1", tags: ["infrastructure", "docker", "complete"] },
];

const CORTEX_SIGNALS_DATA = [
  { category: "finance/vat", skillsUsed: ["tax-calc", "sheets-export"], grpoScore: 0.9913, outcomeSignal: "revenue_positive", agentId: "vmoa-financial", nodeId: "node_a1b2c3d4" },
  { category: "marketing/seo", skillsUsed: ["seo-analysis", "deep-research"], grpoScore: 0.9845, outcomeSignal: "traffic_positive", agentId: "vmoa-marketing", nodeId: "node_e5f6g7h8" },
  { category: "legal/contract", skillsUsed: ["contract-review", "gdpr-audit"], grpoScore: 0.9867, outcomeSignal: "risk_mitigated", agentId: "vmoa-legal", nodeId: "node_i9j0k1l2" },
  { category: "technical/architecture", skillsUsed: ["architecture", "code-review"], grpoScore: 0.9878, outcomeSignal: "task_completed", agentId: "vmoa-technical", nodeId: "node_m3n4o5p6" },
  { category: "research/competitor", skillsUsed: ["competitor-intel", "deep-research"], grpoScore: 0.9834, outcomeSignal: "insight_generated", agentId: "vmoa-research", nodeId: "node_q7r8s9t0" },
  { category: "finance/cashflow", skillsUsed: ["cashflow", "sheets-export"], grpoScore: 0.9891, outcomeSignal: "revenue_positive", agentId: "vmoa-financial", nodeId: "node_a1b2c3d4" },
  { category: "marketing/ads", skillsUsed: ["ad-copy", "seo-analysis"], grpoScore: 0.9823, outcomeSignal: "conversion_positive", agentId: "vmoa-marketing", nodeId: "node_u1v2w3x4" },
  { category: "data/analytics", skillsUsed: ["sheets-export", "reward-scoring"], grpoScore: 0.9856, outcomeSignal: "task_completed", agentId: "vmoa-data", nodeId: "node_y5z6a7b8" },
];

const PROJECTS_DATA = [
  { projectRef: "IVS-2026-001", clientName: "Arnarson Ventures", clientEmail: "arnar@arnarson.is", title: "AI-Powered Financial Dashboard", description: "Build a real-time financial intelligence dashboard with automated VAT reporting and cashflow forecasting.", serviceType: "Technical Build", status: "active" as const, priority: "high" as const, budget: "€12,000", assignedAgent: "vmoa-financial" },
  { projectRef: "IVS-2026-002", clientName: "Nordic SaaS Co.", clientEmail: "hello@nordicsaas.com", title: "EU Market Entry Strategy", description: "Comprehensive market analysis and GTM strategy for Nordic SaaS expansion into EU markets.", serviceType: "Research & Strategy", status: "review" as const, priority: "medium" as const, budget: "€8,500", assignedAgent: "vmoa-research" },
  { projectRef: "IVS-2026-003", clientName: "Reykjavik Tech Hub", clientEmail: "info@rvktechhub.is", title: "GDPR Compliance Audit", description: "Full GDPR audit for a 50-person tech company with data processing agreements and DPA generation.", serviceType: "Legal & Compliance", status: "scoping" as const, priority: "urgent" as const, budget: "€5,200", assignedAgent: "vmoa-legal" },
  { projectRef: "IVS-2026-004", clientName: "Vestfjords Fisheries", clientEmail: "ops@vestfjords.is", title: "Marketing Automation Setup", description: "Email sequences, social media automation, and SEO content strategy for B2B fisheries export.", serviceType: "Marketing", status: "intake" as const, priority: "medium" as const, budget: "€6,800", assignedAgent: "vmoa-marketing" },
  { projectRef: "IVS-2026-005", clientName: "Hekla Capital", clientEmail: "invest@heklacap.com", title: "Investment Portfolio Analytics", description: "Custom analytics dashboard for tracking portfolio performance across 40+ investments.", serviceType: "Data & Analytics", status: "delivered" as const, priority: "high" as const, budget: "€15,000", assignedAgent: "vmoa-data" },
];

export async function seedDatabase() {
  const db = await getDb();
  if (!db) return { success: false, message: "No DB connection" };

  try {
    // Seed agents
    for (const agent of VMOA_AGENTS) {
      await db.insert(agents).values({ ...agent, capabilities: agent.capabilities, lastRun: new Date(Date.now() - Math.random() * 3600000) }).onDuplicateKeyUpdate({ set: { grpoScore: agent.grpoScore, status: agent.status } });
    }
    // Seed skills
    for (const skill of SKILLS_DATA) {
      await db.insert(skills).values({ ...skill, lastUsed: new Date(Date.now() - Math.random() * 86400000) }).onDuplicateKeyUpdate({ set: { usageCount: skill.usageCount } });
    }
    // Seed memory entries
    for (const entry of MEMORY_ENTRIES) {
      await db.insert(memoryEntries).values({ ...entry, tags: entry.tags }).onDuplicateKeyUpdate({ set: { content: entry.content } });
    }
    // Seed cortex signals
    for (const signal of CORTEX_SIGNALS_DATA) {
      await db.insert(cortexSignals).values({ ...signal, skillsUsed: signal.skillsUsed }).onDuplicateKeyUpdate({ set: { grpoScore: signal.grpoScore } });
    }
    // Seed projects
    for (const project of PROJECTS_DATA) {
      await db.insert(projects).values(project).onDuplicateKeyUpdate({ set: { status: project.status } });
    }
    return { success: true, message: "Database seeded successfully" };
  } catch (error) {
    console.error("[Seed] Error:", error);
    return { success: false, message: String(error) };
  }
}

