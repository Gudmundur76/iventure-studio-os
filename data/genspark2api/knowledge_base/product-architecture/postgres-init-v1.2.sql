-- ============================================================
-- iVenture Studio — PostgreSQL Schema v1.2
-- Expanded: 72 skills across 9 clusters (S-01 → S-72)
-- Upgraded from: postgres-init-v1.1.sql
-- Date: 2026-03-18
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- CORE TABLES (v1.0 — preserved)
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    industry        VARCHAR(100),
    country         VARCHAR(10) DEFAULT 'IS',
    currency        VARCHAR(3)  DEFAULT 'EUR',
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    name                VARCHAR(255),
    company_id          UUID REFERENCES companies(id),
    role                VARCHAR(50)  DEFAULT 'operator',
    stripe_customer_id  VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id),
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(100),
    grpo_score  FLOAT   DEFAULT 0.5,
    status      VARCHAR(50) DEFAULT 'idle',
    context     JSONB   DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interactions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id      UUID REFERENCES agents(id),
    company_id    UUID REFERENCES companies(id),
    user_id       UUID REFERENCES users(id),
    skill_id      VARCHAR(10),
    input_text    TEXT,
    output_text   TEXT,
    tokens_input  INTEGER     DEFAULT 0,
    tokens_output INTEGER     DEFAULT 0,
    cost_eur      NUMERIC(10,4) DEFAULT 0,
    duration_ms   INTEGER     DEFAULT 0,
    status        VARCHAR(50) DEFAULT 'completed',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SKILLS TABLE (v1.2 — expanded to 72 skills)
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
    id              VARCHAR(10)  PRIMARY KEY,   -- S-01 … S-72
    name            VARCHAR(100) NOT NULL,
    display_name    VARCHAR(150),
    description     TEXT,
    cluster         VARCHAR(50),                -- finance | sales | intel | hr | tech | china | native | media | core
    compute_class   VARCHAR(20)  DEFAULT 'medium',
    llm_default     VARCHAR(60)  DEFAULT 'kimi-k2.5',
    llm_fallback    VARCHAR(60),
    node_affinity   VARCHAR(30)  DEFAULT 'eu',  -- eu | cn | any
    requires_brick  VARCHAR(10),                -- if skill routes to a brick (e.g. S-19 → B-12)
    internal_target VARCHAR(255),               -- for architecture-native skills: endpoint
    price_addons    JSONB        DEFAULT '{}',  -- any standalone pricing overrides
    enabled         BOOLEAN      DEFAULT TRUE,
    config          JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_cluster ON skills(cluster);
CREATE INDEX IF NOT EXISTS idx_skills_compute ON skills(compute_class);
CREATE INDEX IF NOT EXISTS idx_skills_node    ON skills(node_affinity);

-- ============================================================
-- MEMORY TABLE (v1.0 — preserved)
-- ============================================================

CREATE TABLE IF NOT EXISTS memory_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID REFERENCES agents(id),
    company_id      UUID REFERENCES companies(id),
    memory_type     VARCHAR(50) DEFAULT 'episodic',
    content         TEXT NOT NULL,
    embedding       VECTOR(1536),
    relevance_score FLOAT DEFAULT 1.0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cortex_signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_vector   JSONB NOT NULL,
    sector          VARCHAR(100),
    region          VARCHAR(50)  DEFAULT 'eu-iceland',
    epsilon         FLOAT        DEFAULT 0.1,
    agent_count     INTEGER      DEFAULT 0,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- PRODUCT LAYER (v1.1 — preserved)
-- ============================================================

CREATE TABLE IF NOT EXISTS bricks (
    brick_id        VARCHAR(10)  PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    tagline         TEXT,
    tier            INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
    tier_name       VARCHAR(50),
    container       VARCHAR(100),
    port            INTEGER,
    status          VARCHAR(20)  DEFAULT 'healthy',
    optional        BOOLEAN      DEFAULT TRUE,
    compute_class   VARCHAR(20)  DEFAULT 'medium',
    pricing_model   VARCHAR(30)  NOT NULL,
    price_eur       NUMERIC(10,2) DEFAULT 0,
    price_unit      VARCHAR(50)  DEFAULT 'month',
    stripe_price_id VARCHAR(100),
    dependencies    TEXT[]       DEFAULT '{}',
    bundles         TEXT[]       DEFAULT '{}',
    ai_drive_source VARCHAR(255),
    requires_cost_confirmation BOOLEAN DEFAULT FALSE,
    config          JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bricks_tier   ON bricks(tier);
CREATE INDEX IF NOT EXISTS idx_bricks_status ON bricks(status);

CREATE TABLE IF NOT EXISTS user_entitlements (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brick_id               VARCHAR(10) NOT NULL REFERENCES bricks(brick_id),
    bundle_id              VARCHAR(30),
    entitlement_type       VARCHAR(30) DEFAULT 'subscription',
    status                 VARCHAR(20) DEFAULT 'active',
    units_per_month        INTEGER,
    units_used_this_month  INTEGER DEFAULT 0,
    reset_day              INTEGER DEFAULT 1,
    monthly_price_eur      NUMERIC(10,2),
    stripe_subscription_id VARCHAR(100),
    stripe_price_id        VARCHAR(100),
    valid_from             TIMESTAMPTZ DEFAULT NOW(),
    valid_until            TIMESTAMPTZ,
    last_reset_at          TIMESTAMPTZ DEFAULT NOW(),
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, brick_id, status)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user   ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_brick  ON user_entitlements(brick_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_bundle ON user_entitlements(bundle_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON user_entitlements(status);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id           VARCHAR(30) UNIQUE NOT NULL,
    user_id                 UUID NOT NULL REFERENCES users(id),
    company_id              UUID REFERENCES companies(id),
    brick_id                VARCHAR(10) NOT NULL REFERENCES bricks(brick_id),
    question                TEXT NOT NULL,
    agents                  INTEGER NOT NULL,
    rounds                  INTEGER NOT NULL,
    market_segment          VARCHAR(50)  DEFAULT 'general',
    language                VARCHAR(5)   DEFAULT 'en',
    llm_model               VARCHAR(50)  DEFAULT 'kimi-k2.5',
    fast_mode               BOOLEAN      DEFAULT FALSE,
    cortex_contribute       BOOLEAN      DEFAULT TRUE,
    status                  VARCHAR(30)  DEFAULT 'queued',
    progress_pct            INTEGER      DEFAULT 0,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    duration_seconds        INTEGER,
    sentiment_score         FLOAT,
    controversy_index       FLOAT,
    virality_score          FLOAT,
    confidence_score        FLOAT,
    trading_signal          VARCHAR(10),
    coalition_map           JSONB        DEFAULT '{}',
    platform_breakdown      JSONB        DEFAULT '{}',
    top_objections          JSONB        DEFAULT '[]',
    recommended_framing     TEXT,
    framing_alternatives    JSONB        DEFAULT '[]',
    strategic_fixes         JSONB        DEFAULT '[]',
    persona_highlights      JSONB        DEFAULT '[]',
    full_report_json        JSONB,
    report_url              VARCHAR(500),
    report_pdf_url          VARCHAR(500),
    cortex_signal_id        VARCHAR(50),
    billing_model           VARCHAR(30),
    plan                    VARCHAR(30),
    cost_eur                NUMERIC(10,4) DEFAULT 4.00,
    llm_calls               INTEGER      DEFAULT 0,
    tokens_input            BIGINT       DEFAULT 0,
    tokens_output           BIGINT       DEFAULT 0,
    stripe_meter_event_id   VARCHAR(100),
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sims_user    ON simulation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_sims_status  ON simulation_runs(status);
CREATE INDEX IF NOT EXISTS idx_sims_brick   ON simulation_runs(brick_id);
CREATE INDEX IF NOT EXISTS idx_sims_segment ON simulation_runs(market_segment);
CREATE INDEX IF NOT EXISTS idx_sims_created ON simulation_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS product_bundles (
    bundle_id                   VARCHAR(30)  PRIMARY KEY,
    name                        VARCHAR(100) NOT NULL,
    price_eur_monthly           NUMERIC(10,2) NOT NULL,
    price_eur_annual            NUMERIC(10,2),
    stripe_product_id           VARCHAR(100),
    stripe_price_monthly        VARCHAR(100),
    stripe_price_annual         VARCHAR(100),
    tokens_per_month            BIGINT,
    sims_per_month              INTEGER,
    signals_per_month           INTEGER,
    companies_included          INTEGER DEFAULT 1,
    sla_uptime_pct              FLOAT   DEFAULT 99.5,
    bricks_included             TEXT[]  NOT NULL DEFAULT '{}',
    skills_included             INTEGER DEFAULT 5,
    -- v1.2: skill cluster access
    clusters_unlocked           TEXT[]  DEFAULT '{}',
    requires_data_contribution  BOOLEAN DEFAULT FALSE,
    active                      BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHEMA VERSION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_versions (
    version     VARCHAR(10) PRIMARY KEY,
    applied_at  TIMESTAMPTZ DEFAULT NOW(),
    notes       TEXT
);

-- ============================================================
-- SEED DATA — 72 SKILLS (S-01 → S-72)
-- ============================================================

-- ── CLUSTER: CORE (original 19, upgraded with new columns) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-01', 'market-research',    'Market Research',       'Deep market analysis, competitor mapping, TAM/SAM/SOM sizing',                                'core', 'medium', 'kimi-k2.5',       'qwen3-max',    'any', '{}'),
('S-02', 'content-creation',   'Content Creation',      'Blog posts, social copy, newsletters, long-form articles',                                    'core', 'light',  'qwen-turbo',      'kimi-k2.5',    'any', '{}'),
('S-03', 'financial-modeling', 'Financial Modelling',   'Revenue projections, P&L, unit economics, scenario planning',                                 'core', 'medium', 'kimi-k2.5',       'deepseek-r1',  'any', '{}'),
('S-04', 'product-strategy',   'Product Strategy',      'Roadmap planning, feature prioritisation, PRD generation',                                    'core', 'medium', 'kimi-k2.5',       'gpt-5',        'any', '{}'),
('S-05', 'lead-generation',    'Lead Generation',       'Prospect identification, outreach copy, list building via OpenClaw',                          'core', 'medium', 'qwen-turbo',      'kimi-k2.5',    'any', '{"uses_openclaw": true}'),
('S-06', 'seo-optimization',   'SEO Optimisation',      'Keyword research, on-page SEO, content gap analysis, meta generation',                       'core', 'light',  'qwen-turbo',      null,           'any', '{}'),
('S-07', 'customer-support',   'Customer Support',      'Helpdesk automation, ticket triage, FAQ generation, escalation logic',                       'core', 'light',  'qwen-turbo',      null,           'any', '{}'),
('S-08', 'data-analysis',      'Data Analysis',         'CSV/JSON/SQL insights, statistical summaries, chart generation',                              'core', 'medium', 'kimi-k2.5',       'deepseek-r1',  'any', '{}'),
('S-09', 'code-generation',    'Code Generation',       'Python/JS/SQL/Go boilerplate, refactoring, code review',                                     'core', 'medium', 'nemotron-3-super', 'kimi-k2.5',    'any', '{}'),
('S-10', 'legal-compliance',   'Legal Compliance',      'Contract templates, compliance checks, GDPR/PIPL gap analysis',                               'core', 'medium', 'claude-opus-4',   'kimi-k2.5',    'any', '{}'),
('S-11', 'social-media',       'Social Media',          'Campaign planning, post scheduling, platform-specific copy',                                  'core', 'light',  'qwen-turbo',      null,           'any', '{}'),
('S-12', 'email-marketing',    'Email Marketing',       'Newsletter creation, drip sequences, subject line A/B testing',                               'core', 'light',  'qwen-turbo',      null,           'any', '{}'),
('S-13', 'presentation-gen',   'Presentation Generator','Slide deck creation, pitch decks, investor updates',                                          'core', 'medium', 'gpt-5',           'kimi-k2.5',    'any', '{}'),
('S-14', 'brand-identity',     'Brand Identity',        'Logo briefs, brand guidelines, tone-of-voice documentation',                                  'core', 'light',  'qwen-turbo',      null,           'any', '{}'),
('S-15', 'opc-onboarding',     'OPC Onboarding',        'Chinese OPC operator onboarding guide, first 90-day plan',                                    'core', 'medium', 'qwen3-72b',       null,           'cn',  '{"language": "zh"}'),
('S-16', 'subsidy-advisor',    'Subsidy Advisor',       'EU/national grant identification, eligibility scoring, auto-draft applications',               'core', 'heavy',  'kimi-k2.5',       'claude-opus-4','any', '{}'),
('S-17', 'cross-border-trade', 'Cross-Border Trade',    'Iceland–EU–China customs routing, FTA utilisation, currency hedging signals',                 'core', 'heavy',  'kimi-k2.5',       null,           'any', '{}'),
('S-18', 'cortex-distiller',   'Cortex Distiller',      'Anonymise and contribute VIC Engine interactions to Cortex (ε≤0.1)',                          'core', 'light',  'qwen-turbo',      null,           'any', '{"epsilon": 0.1, "requires_brick": "B-07"}'),
('S-19', 'market-simulation',  'Market Simulation',     'Routes to Prediction Engine B-12 — spawns 50–2847 agents for decision simulation',           'core', 'heavy',  'kimi-k2.5',       null,           'any', '{"requires_confirmation": true}')
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    cluster      = EXCLUDED.cluster,
    llm_default  = EXCLUDED.llm_default,
    llm_fallback = EXCLUDED.llm_fallback,
    node_affinity= EXCLUDED.node_affinity,
    config       = EXCLUDED.config;

-- Update requires_brick for skills that route to bricks
UPDATE skills SET requires_brick = 'B-12' WHERE id = 'S-19';
UPDATE skills SET requires_brick = 'B-07' WHERE id = 'S-18';

-- ── CLUSTER A: FINANCE (S-20 → S-26) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-20', 'cashflow-forecaster', 'Cashflow Forecaster',
 '13-week rolling cashflow model with burn rate alerts and runway countdown; pulls live figures from Data Store',
 'finance', 'medium', 'kimi-k2.5', 'deepseek-r1', 'any',
 '{"data_source": "B-05", "output_format": "json+chart"}'),

('S-21', 'invoice-manager', 'Invoice Manager',
 'Generates, sends, and chases invoices; matches incoming payments to PO records; escalates overdue items',
 'finance', 'light', 'qwen-turbo', null, 'any',
 '{"integrations": ["stripe", "xero", "quickbooks"]}'),

('S-22', 'fundraising-prep', 'Fundraising Prep',
 'Full pitch deck narrative, cap table modelling, VC targeting list with warm-intro mapping via Neo4j graph, term sheet red-flag checker',
 'finance', 'heavy', 'claude-opus-4', 'gpt-5', 'any',
 '{"uses_graph": true, "requires_brick": "B-04"}'),

('S-23', 'unit-economics', 'Unit Economics',
 'LTV/CAC ratio, payback period, contribution margin, magic number — live against Data Store figures with cohort drill-down',
 'finance', 'medium', 'kimi-k2.5', 'deepseek-r1', 'any',
 '{"data_source": "B-05"}'),

('S-24', 'tax-navigator', 'Tax Navigator',
 'Iceland/EU/China tax obligations mapped to company structure; VAT, WHT, transfer pricing, R&D credits, CFC rules',
 'finance', 'medium', 'kimi-k2.5', 'claude-opus-4', 'any',
 '{"jurisdictions": ["IS", "EU", "CN"]}'),

('S-25', 'pricing-optimiser', 'Pricing Optimiser',
 'Van Westendorp + conjoint analysis on B-12 simulation data to find statistically optimal price point per segment',
 'finance', 'heavy', 'kimi-k2.5', null, 'any',
 '{"requires_brick": "B-12", "uses_sim_output": true}'),

('S-26', 'equity-modeller', 'Equity Modeller',
 'Dilution scenarios, option pool sizing, ESOP waterfall, pro-rata rights modelling, exit-scenario distributions',
 'finance', 'medium', 'gpt-5', 'kimi-k2.5', 'any',
 '{}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER B: SALES (S-27 → S-33) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-27', 'crm-manager', 'CRM Manager',
 'Maintains contact records, deal stages, follow-up sequences, pipeline health reports inside Data Store',
 'sales', 'light', 'qwen-turbo', null, 'any',
 '{"data_source": "B-05", "outputs_to": "companies,users"}'),

('S-28', 'proposal-generator', 'Proposal Generator',
 'Produces branded, bespoke sales proposals from a brief in < 3 minutes; includes pricing table, ROI calculator, social proof',
 'sales', 'medium', 'kimi-k2.5', 'qwen3-max', 'any',
 '{}'),

('S-29', 'sales-script', 'Sales Script',
 'Generates objection-handling scripts tailored to persona profile from B-12 coalition maps; includes discovery questions',
 'sales', 'light', 'qwen-turbo', 'kimi-k2.5', 'any',
 '{"uses_sim_output": true}'),

('S-30', 'churn-predictor', 'Churn Predictor',
 'Scores each customer on 30/60/90-day churn risk using interaction history; recommends intervention for at-risk accounts',
 'sales', 'heavy', 'kimi-k2.5', 'deepseek-r1', 'any',
 '{"data_source": "B-05", "ml_mode": "logistic_llm_hybrid"}'),

('S-31', 'partnership-scout', 'Partnership Scout',
 'Identifies and ranks partnership candidates using Neo4j OPC network graph — finds second-degree connections to target firms',
 'sales', 'medium', 'kimi-k2.5', null, 'any',
 '{"requires_brick": "B-04", "uses_graph": true}'),

('S-32', 'channel-playbook', 'Channel Playbook',
 'Builds distribution channel strategy (direct, reseller, marketplace, OEM, white-label) with margin waterfall per channel',
 'sales', 'medium', 'kimi-k2.5', null, 'any',
 '{}'),

('S-33', 'customer-segmentation', 'Customer Segmentation',
 'Clusters customer base by behaviour, LTV, and cultural profile (China vs EU vs Nordic) using Data Store interaction logs',
 'sales', 'medium', 'kimi-k2.5', 'deepseek-r1', 'any',
 '{"data_source": "B-05", "method": "llm_kmeans_hybrid"}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER C: INTELLIGENCE (S-34 → S-40) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-34', 'competitive-intel', 'Competitive Intelligence',
 'Deep competitor monitoring via OpenClaw: pricing changes, new features, job postings (hiring signals), funding rounds, patent filings',
 'intel', 'heavy', 'kimi-k2.5', 'qwen3-max', 'any',
 '{"uses_openclaw": true, "requires_brick": "B-03", "refresh_interval_hours": 24}'),

('S-35', 'patent-research', 'Patent Research',
 'Prior art search, FTO (freedom-to-operate) analysis, patent landscape mapping; sources: USPTO, EPO, CNIPA',
 'intel', 'medium', 'kimi-k2.5', 'nemotron-3-super', 'any',
 '{"sources": ["USPTO", "EPO", "CNIPA"]}'),

('S-36', 'trend-forecaster', 'Trend Forecaster',
 'Synthesises Cortex signals + real-time web data into 90-day trend predictions for your sector; outputs confidence bands',
 'intel', 'heavy', 'kimi-k2.5', 'gemini-2.5-pro', 'any',
 '{"requires_brick": "B-07", "uses_cortex": true, "horizon_days": 90}'),

('S-37', 'news-digest', 'News Digest',
 'Daily curated briefing: industry news, regulatory changes, competitor moves — delivered to Slack/email/WeChat on schedule',
 'intel', 'light', 'qwen-turbo', null, 'any',
 '{"delivery_channels": ["slack", "email", "wechat"], "frequency": "daily"}'),

('S-38', 'academic-synthesiser', 'Academic Synthesiser',
 'Searches arXiv, PubMed, SSRN, Google Scholar; reads full papers; synthesises findings for R&D or product questions',
 'intel', 'medium', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"sources": ["arxiv", "pubmed", "ssrn", "scholar"], "context_window": 1000000}'),

('S-39', 'sentiment-monitor', 'Sentiment Monitor',
 'Real-time brand/product sentiment across Twitter/X, LinkedIn, Reddit, WeChat; triggers Cortex alert if controversy > threshold',
 'intel', 'medium', 'kimi-k2.5', 'qwen3-72b', 'any',
 '{"platforms": ["twitter", "linkedin", "reddit", "wechat"], "alert_threshold": 0.7, "requires_brick": "B-07"}'),

('S-40', 'regulatory-radar', 'Regulatory Radar',
 'Tracks regulatory changes across EU, China, Iceland affecting your business; auto-drafts impact assessment and action checklist',
 'intel', 'medium', 'claude-opus-4', 'kimi-k2.5', 'any',
 '{"jurisdictions": ["EU", "CN", "IS"], "domains": ["data_privacy", "trade", "employment", "finance"]}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER D: HR & ORGANISATION (S-41 → S-46) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-41', 'talent-scout', 'Talent Scout',
 'Writes JDs, screens applications with scoring rubric, ranks candidates, drafts offer letters and rejection emails',
 'hr', 'medium', 'kimi-k2.5', 'gpt-5', 'any',
 '{"output": ["jd", "screening_rubric", "offer_letter"]}'),

('S-42', 'contractor-manager', 'Contractor Manager',
 'SoW templates, milestone tracking, payment schedule management, NDA generation for freelancers and contractors',
 'hr', 'light', 'qwen-turbo', null, 'any',
 '{"document_types": ["sow", "nda", "invoice_schedule"]}'),

('S-43', 'onboarding-builder', 'Onboarding Builder',
 'Creates 30/60/90-day onboarding plans for new hires or virtual team members; assigns tasks to VMOA agents',
 'hr', 'medium', 'kimi-k2.5', null, 'any',
 '{"outputs_tasks_to": "B-01"}'),

('S-44', 'compensation-bench', 'Compensation Benchmarker',
 'Benchmarks salaries and equity against market data for Iceland, EU, and China tech/ops roles; recommends comp bands',
 'hr', 'medium', 'kimi-k2.5', null, 'any',
 '{"markets": ["IS", "EU", "CN"], "roles": ["tech", "ops", "sales", "executive"]}'),

('S-45', 'org-designer', 'Org Designer',
 'Recommends optimal team structure for given growth stage and revenue target; draws org chart; maps to A2A network roles',
 'hr', 'medium', 'gpt-5', 'kimi-k2.5', 'any',
 '{"outputs_to": "B-17"}'),

('S-46', 'performance-coach', 'Performance Coach',
 'Runs quarterly review cycles for contractors and agents; tracks OKRs against Data Store metrics; flags underperformers',
 'hr', 'medium', 'kimi-k2.5', null, 'any',
 '{"data_source": "B-05", "cadence": "quarterly"}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER E: TECH & DEVOPS (S-47 → S-53) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-47', 'api-documenter', 'API Documenter',
 'Auto-generates OpenAPI 3.1 specs, README docs, Postman collections, and SDK usage examples from code or endpoints',
 'tech', 'light', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"output_formats": ["openapi", "readme", "postman", "sdk_examples"]}'),

('S-48', 'security-auditor', 'Security Auditor',
 'OWASP Top-10 scan, dependency CVE check, IAM policy review, secrets detection, GDPR/PIPL data-flow mapping',
 'tech', 'heavy', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"standards": ["OWASP", "CIS", "GDPR", "PIPL"], "output": "findings_report"}'),

('S-49', 'infra-planner', 'Infrastructure Planner',
 'Recommends cloud architecture (brick-aware — references B-01→B-19) for given workload, latency, cost, and compliance constraints',
 'tech', 'medium', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"brick_aware": true, "clouds": ["atNorth", "alibaba", "aws", "nvidia_nim"]}'),

('S-50', 'devops-automator', 'DevOps Automator',
 'Writes CI/CD pipelines (GitHub Actions, GitLab CI), Dockerfile optimisations, k8s manifests, Terraform modules',
 'tech', 'medium', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"tools": ["github_actions", "gitlab_ci", "docker", "kubernetes", "terraform"]}'),

('S-51', 'data-pipeline', 'Data Pipeline Builder',
 'Builds ETL/ELT pipelines from any source to Data Store; schema inference, type mapping, incremental load logic',
 'tech', 'heavy', 'nemotron-3-super', 'deepseek-r1', 'any',
 '{"target": "B-05", "formats": ["csv", "json", "parquet", "api", "webhook"]}'),

('S-52', 'bug-triage', 'Bug Triage',
 'Prioritises bug backlog by severity × user-impact × fix-effort matrix; drafts GitHub issues; suggests root-cause hypotheses',
 'tech', 'medium', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"integrations": ["github", "jira", "linear"]}'),

('S-53', 'test-generator', 'Test Generator',
 'Writes unit, integration, and load tests from docstrings, OpenAPI specs, or function signatures; targets 80%+ coverage',
 'tech', 'medium', 'nemotron-3-super', 'kimi-k2.5', 'any',
 '{"frameworks": ["pytest", "jest", "go_test", "locust"], "target_coverage": 0.8}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER F: CHINA & APAC (S-54 → S-59) ──
-- All cn node_affinity → routed to B-18 (China Node), Qwen3-72B, PIPL-safe

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-54', 'wechat-campaign', 'WeChat Campaign Manager',
 'WeChat Official Account content, mini-program copy, campaign calendar, message automation — native Simplified Chinese',
 'china', 'medium', 'qwen3-72b', null, 'cn',
 '{"language": "zh", "requires_brick": "B-18", "platforms": ["wechat_oa", "wechat_mini"]}'),

('S-55', 'tmall-optimizer', 'Tmall / JD Listing Optimiser',
 'Alibaba/Tmall/JD/1688 listing optimisation: search-ranked titles, bullet keywords, A+ content, Q&A seeding, review strategy',
 'china', 'medium', 'qwen3-72b', null, 'cn',
 '{"language": "zh", "requires_brick": "B-18", "platforms": ["tmall", "jd", "1688", "taobao"]}'),

('S-56', 'kol-scout', 'KOL / KOC Scout',
 'Identifies and scores KOLs and KOCs for Douyin, Xiaohongshu, Weibo, Bilibili by reach, engagement, and brand fit',
 'china', 'medium', 'qwen3-72b', null, 'cn',
 '{"language": "zh", "requires_brick": "B-18", "platforms": ["douyin", "xiaohongshu", "weibo", "bilibili"]}'),

('S-57', 'china-regulatory', 'China Regulatory Navigator',
 'PIPL, CSL, ICP filing, SAMR compliance, cross-border data transfer SCC — produces prioritised action checklist',
 'china', 'heavy', 'qwen3-72b', 'claude-opus-4', 'cn',
 '{"language": "zh", "requires_brick": "B-18", "regulations": ["PIPL", "CSL", "ICP", "SAMR", "MLPS"]}'),

('S-58', 'golden-week-planner', 'Golden Week Campaign Planner',
 'Builds campaign playbooks for major Chinese commercial events: 11/11 (Singles Day), 618 Festival, Golden Week, CNY',
 'china', 'medium', 'qwen3-72b', null, 'cn',
 '{"language": "zh", "requires_brick": "B-18", "events": ["11.11", "618", "golden_week", "cny", "380_day"]}'),

('S-59', 'baidu-seo', 'Baidu SEO',
 'Baidu-specific SEO: keyword research (Baidu Index), meta structure, canonical tags, ICP-compliant content, Baidu Spider optimisation',
 'china', 'light', 'qwen3-72b', null, 'cn',
 '{"language": "zh", "requires_brick": "B-18", "tools": ["baidu_index", "baidu_webmaster"]}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER G: ARCHITECTURE-NATIVE (S-60 → S-66) ──
-- These skills talk directly to internal bricks

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, internal_target, config) VALUES
('S-60', 'vic-spawner', 'VIC Spawner',
 'Creates a new autonomous company: provisions VIC Engine instance, allocates skills, seeds Data Store, assigns A2A address',
 'native', 'medium', 'kimi-k2.5', null, 'any',
 'http://iventure-vic-engine:8080/v1/spawn',
 '{"requires_brick": "B-16", "outputs": ["company_id", "vic_endpoint", "a2a_address"]}'),

('S-61', 'a2a-delegator', 'A2A Delegator',
 'Posts tasks to A2A Network B-17; receives and evaluates bids; selects winning contractor; tracks delivery and triggers payment',
 'native', 'light', 'qwen-turbo', null, 'any',
 'http://iventure-a2a:8050/v1/post',
 '{"requires_brick": "B-17"}'),

('S-62', 'cortex-reader', 'Cortex Reader',
 'Queries live Cortex signals (B-07) and injects sector-relevant patterns as context into any concurrent skill run',
 'native', 'light', 'qwen-turbo', null, 'any',
 'http://iventure-cortex:8070/v1/query',
 '{"requires_brick": "B-07", "inject_as": "system_context"}'),

('S-63', 'graph-navigator', 'Graph Navigator',
 'Natural-language Cypher query builder over Neo4j B-04: "who in my OPC network is two hops from Foxconn?" returns structured results',
 'native', 'medium', 'kimi-k2.5', 'nemotron-3-super', 'any',
 'http://iventure-neo4j:7474/v1/query',
 '{"requires_brick": "B-04", "query_language": "cypher", "nl_to_cypher": true}'),

('S-64', 'brick-composer', 'Brick Composer',
 'Chains multiple bricks and skills into a multi-step workflow from a single natural-language instruction; manages state across steps',
 'native', 'medium', 'kimi-k2.5', null, 'any',
 'http://iventure-vic-engine:8080/v1/compose',
 '{"meta_skill": true, "max_chain_depth": 10, "state_store": "B-05"}'),

('S-65', 'entitlement-manager', 'Entitlement Manager',
 'Manages user brick entitlements: upgrades, downgrades, trials, founding-node assignments, monthly unit resets',
 'native', 'light', 'qwen-turbo', null, 'any',
 'http://iventure-vic-engine:8080/v1/entitlements',
 '{"data_source": "B-05", "billing": "stripe"}'),

('S-66', 'simulation-scheduler', 'Simulation Scheduler',
 'Schedules recurring B-12 runs on cron syntax: "run 500-agent market pulse every Monday 07:00 EU/Reykjavik"',
 'native', 'light', 'qwen-turbo', null, 'any',
 'http://iventure-mirofish:8085/v1/schedule',
 '{"requires_brick": "B-12", "scheduler": "aws_eventbridge", "timezone_aware": true}')
ON CONFLICT (id) DO NOTHING;

-- ── CLUSTER H: COMMUNICATION & MEDIA (S-67 → S-72) ──

INSERT INTO skills (id, name, display_name, description, cluster, compute_class, llm_default, llm_fallback, node_affinity, config) VALUES
('S-67', 'translator', 'Translator & Localiser',
 'Translates documents/copy between EN/ZH/DE/FR/JA/IS with brand-voice preservation, cultural adaptation, and back-translation QA',
 'media', 'light', 'qwen3-72b', 'gemini-2.5-pro', 'any',
 '{"languages": ["en", "zh", "de", "fr", "ja", "is"], "modes": ["translate", "localise", "back_qa"]}'),

('S-68', 'press-release', 'Press Release',
 'Writes press releases, media kits, journalist pitch emails; tailors angle per outlet type (tech, trade, national, Chinese)',
 'media', 'medium', 'kimi-k2.5', null, 'any',
 '{"outlet_types": ["tech", "trade", "national", "cn_media"]}'),

('S-69', 'crisis-comms', 'Crisis Communications',
 'Real-time crisis response: statement drafts, spokesperson Q&A prep, platform-by-platform strategy, hour-by-hour narrative plan',
 'media', 'heavy', 'claude-opus-4', 'gpt-5', 'any',
 '{"response_time_target_minutes": 30, "uses_sim_output": true, "requires_brick": "B-15"}'),

('S-70', 'video-script', 'Video & Podcast Script',
 'Writes video scripts, YouTube descriptions, podcast outlines, webinar agendas, TikTok/Douyin hooks',
 'media', 'medium', 'kimi-k2.5', 'qwen3-72b', 'any',
 '{"formats": ["youtube", "podcast", "webinar", "tiktok", "douyin"]}'),

('S-71', 'ab-test-designer', 'A/B Test Designer',
 'Designs statistically valid A/B tests for landing pages, emails, pricing, onboarding — feeds results back to B-12 for simulation',
 'media', 'medium', 'kimi-k2.5', null, 'any',
 '{"output_to_sim": true, "requires_brick": "B-12", "stat_method": "bayesian"}'),

('S-72', 'doc-extractor', 'Document Extractor',
 'Reads PDFs, contracts, invoices, scanned images, Excel files — extracts structured data into Data Store tables via schema inference',
 'media', 'medium', 'gemini-2.5-pro', 'kimi-k2.5', 'any',
 '{"input_types": ["pdf", "docx", "xlsx", "jpg", "png", "csv"], "output_target": "B-05"}')
ON CONFLICT (id) DO NOTHING;

-- Update requires_brick for new skills
UPDATE skills SET requires_brick = 'B-04' WHERE id IN ('S-22','S-31','S-63');
UPDATE skills SET requires_brick = 'B-03' WHERE id IN ('S-34','S-05');
UPDATE skills SET requires_brick = 'B-12' WHERE id IN ('S-19','S-25','S-66','S-71');
UPDATE skills SET requires_brick = 'B-07' WHERE id IN ('S-18','S-36','S-39','S-62');
UPDATE skills SET requires_brick = 'B-15' WHERE id =  'S-69';
UPDATE skills SET requires_brick = 'B-16' WHERE id =  'S-60';
UPDATE skills SET requires_brick = 'B-17' WHERE id IN ('S-45','S-61');
UPDATE skills SET requires_brick = 'B-18' WHERE id IN ('S-15','S-54','S-55','S-56','S-57','S-58','S-59');

-- ============================================================
-- SEED DATA — 19 BRICKS (unchanged from v1.1)
-- ============================================================

INSERT INTO bricks (brick_id, name, display_name, tagline, tier, tier_name, container, port, optional, compute_class, pricing_model, price_eur, price_unit, stripe_price_id, dependencies, bundles, ai_drive_source, requires_cost_confirmation) VALUES
('B-01','vic-engine','VIC Engine','The AI agent runtime that runs your business',1,'Infrastructure','iventure-vic-engine',8080,false,'medium','flat',49.00,'month','price_b01_monthly',ARRAY['B-02','B-05','B-06'],ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'],'mesh/',false),
('B-02','model-gateway','Model Gateway','One API key. 30+ frontier models. Zero lock-in.',1,'Infrastructure','iventure-litellm',4000,false,'light','flat_plus_overage',29.00,'month','price_b02_monthly',ARRAY['B-06'],ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'],'phase2/litellm_config_p2.yaml',false),
('B-03','openclaw-node','OpenClaw Node','A browser-capable AI agent that works like a human employee',1,'Infrastructure','iventure-openclaw',3001,true,'light_medium','flat',19.00,'month','price_b03_monthly',ARRAY['B-02'],ARRAY['BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE'],'openclaw/',false),
('B-04','knowledge-graph','Knowledge Graph','Your business intelligence in a queryable graph',1,'Infrastructure','iventure-neo4j',7474,true,'medium','flat',29.00,'month','price_b04_monthly',ARRAY[]::TEXT[],ARRAY['INTELLIGENCE','PREDICTOR','EMPIRE'],'docker-compose.yml',false),
('B-05','data-store','Data Store','Structured memory for your entire operation',1,'Infrastructure','iventure-postgres',5432,false,'light','flat',19.00,'month','price_b05_monthly',ARRAY[]::TEXT[],ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'],'phase1/postgres-init.sql',false),
('B-06','cache-layer','Cache Layer','Speed and cost reduction for everything',1,'Infrastructure','iventure-redis',6379,false,'light','bundled',0.00,'bundled',NULL,ARRAY[]::TEXT[],ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'],'docker-compose.yml',false),
('B-07','vic-cortex','VIC Cortex','The world model that gets smarter with every operator',2,'Intelligence','iventure-cortex',8070,true,'medium','tiered',39.00,'month','price_b07_read',ARRAY['B-05'],ARRAY['INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'],'VIC-CORTEX-SPEC.md',false),
('B-08','vmoa-skill-pack','VMOA Skill Pack','72 autonomous business skills across 9 clusters',2,'Intelligence','iventure-vmoa',8085,true,'varies','a_la_carte_or_bundle',79.00,'month','price_b08_all',ARRAY['B-01','B-02'],ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'],'phase1/postgres-init.sql',false),
('B-09','subsidy-advisor','Subsidy Advisor','Find and apply for grants automatically',2,'Intelligence','iventure-subsidy',8091,true,'medium','flat',29.00,'month','price_b09_monthly',ARRAY['B-02','B-05'],ARRAY['INTELLIGENCE','PREDICTOR','EMPIRE'],'phase1/postgres-init.sql',false),
('B-10','cross-border-trade','Cross-Border Trade','Iceland–EU–China in one workflow',2,'Intelligence','iventure-trade',8092,true,'medium','flat',49.00,'month','price_b10_monthly',ARRAY['B-02','B-04','B-18'],ARRAY['EMPIRE'],'phase1/postgres-init.sql',false),
('B-11','opc-onboarding','OPC Onboarding','Zero-friction onboarding for Chinese OPC operators',2,'Intelligence','iventure-opc',8093,true,'light','flat',19.00,'month','price_b11_monthly',ARRAY['B-02','B-18'],ARRAY['EMPIRE'],'phase1/postgres-init.sql',false),
('B-12','prediction-engine','Prediction Engine','Run 2,847 AI agents to predict any decision before you make it',3,'Prediction','iventure-mirofish',8085,true,'heavy','metered_or_subscription',4.00,'simulation','price_pred_ppu',ARRAY['B-02','B-04','B-05'],ARRAY['PREDICTOR','EMPIRE'],'phase25/',true),
('B-13','market-signal','Market Signal','2,847 agents. One trading signal.',3,'Prediction','iventure-market-signal',8094,true,'heavy','metered',8.00,'signal','price_b13_ppu',ARRAY['B-12'],ARRAY['PREDICTOR','EMPIRE'],'phase25/vmoa_skill_market_simulation.py',true),
('B-14','policy-simulator','Policy Simulator','Test any business or regulatory decision before it is irreversible',3,'Prediction','iventure-policy-sim',8095,true,'heavy','metered',6.00,'simulation','price_b14_ppu',ARRAY['B-12'],ARRAY['PREDICTOR','EMPIRE'],NULL,true),
('B-15','crisis-tester','Crisis Tester','What happens to your business if everything goes wrong?',3,'Prediction','iventure-crisis',8096,true,'heavy','metered',6.00,'simulation','price_b15_ppu',ARRAY['B-12'],ARRAY['EMPIRE'],NULL,true),
('B-16','portfolio-manager','Portfolio Manager','One founder. N autonomous companies.',4,'Scale','iventure-portfolio',8060,true,'medium','tiered',99.00,'month','price_b16_monthly',ARRAY['B-01','B-05','B-17'],ARRAY['EMPIRE'],'MASTER-DEV-PLAN.md',false),
('B-17','a2a-network','A2A Network','Let your companies trade tasks and revenue with each other',4,'Scale','iventure-a2a',8050,true,'light','transaction_fee',0.00,'pct_task_value','price_b17_transaction',ARRAY['B-01','B-05'],ARRAY['EMPIRE'],'a2a_card.py',false),
('B-18','china-node','China Node','PIPL-compliant. Qwen3-native. Sub-20ms for Chinese OPCs.',4,'Scale','iventure-cn-node',8090,true,'medium','flat',59.00,'month','price_b18_monthly',ARRAY['B-01','B-02'],ARRAY['EMPIRE'],'integrations/OASIS-MIROFISH-DEFINITIVE.md',false),
('B-19','cortex-contributor','Cortex Contributor','Feed data. Receive intelligence. The cooperative model.',4,'Scale','iventure-cortex-feed',8055,true,'light','free',0.00,'data_exchange','price_b19_free',ARRAY['B-01','B-07'],ARRAY['CORTEX_PARTNER','PREDICTOR','EMPIRE'],'cortex_contributor.py',false)
ON CONFLICT (brick_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    tagline      = EXCLUDED.tagline,
    updated_at   = NOW();

-- ============================================================
-- SEED DATA — 6 PRODUCT BUNDLES (v1.2 — clusters_unlocked added)
-- ============================================================

INSERT INTO product_bundles (bundle_id, name, price_eur_monthly, price_eur_annual, stripe_product_id, stripe_price_monthly, tokens_per_month, sims_per_month, signals_per_month, companies_included, sla_uptime_pct, bricks_included, skills_included, clusters_unlocked, requires_data_contribution) VALUES
('SPARK',          'SPARK',          49.00,   470.00,  'prod_spark',          'price_spark_monthly',          1000000,  0,  0, 1, 99.5,  ARRAY['B-01','B-02','B-05','B-06'],                                                                                  19, ARRAY['core'],                                                             false),
('BUILDER',        'BUILDER',        149.00,  1430.00, 'prod_builder',        'price_builder_monthly',        5000000,  0,  0, 1, 99.5,  ARRAY['B-01','B-02','B-03','B-05','B-06','B-08'],                                                                     38, ARRAY['core','finance','sales'],                                           false),
('INTELLIGENCE',   'INTELLIGENCE',   299.00,  2870.00, 'prod_intelligence',   'price_intelligence_monthly',   10000000, 0,  0, 1, 99.5,  ARRAY['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09'],                                                53, ARRAY['core','finance','sales','intel','hr'],                              false),
('PREDICTOR',      'PREDICTOR',      499.00,  4790.00, 'prod_predictor',      'price_predictor_monthly',      20000000, 60, 15,1, 99.9,  ARRAY['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09','B-12','B-13','B-14','B-19'],                     60, ARRAY['core','finance','sales','intel','hr','tech','media'],               false),
('EMPIRE',         'EMPIRE',         999.00,  9590.00, 'prod_empire',         'price_empire_monthly',         -1,      -1, -1, 5, 99.99, ARRAY['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09','B-10','B-11','B-12','B-13','B-14','B-15','B-16','B-17','B-18','B-19'], 72, ARRAY['core','finance','sales','intel','hr','tech','china','native','media'], false),
('CORTEX_PARTNER', 'CORTEX PARTNER', 0.00,    0.00,   'prod_cortex_partner', 'price_cortex_partner_free',    3000000,  0,  0, 1, 99.5,  ARRAY['B-01','B-02','B-07','B-08','B-19'],                                                                            19, ARRAY['core'],                                                             true)
ON CONFLICT (bundle_id) DO UPDATE SET
    skills_included  = EXCLUDED.skills_included,
    clusters_unlocked= EXCLUDED.clusters_unlocked,
    updated_at       = NOW();

-- ============================================================
-- VIEWS (upgraded for v1.2)
-- ============================================================

CREATE OR REPLACE VIEW v_user_active_entitlements AS
SELECT
    ue.user_id,
    u.email,
    u.name,
    ue.brick_id,
    b.display_name         AS brick_name,
    b.tier,
    ue.bundle_id,
    ue.entitlement_type,
    ue.units_per_month,
    ue.units_used_this_month,
    COALESCE(ue.units_per_month, 0) - ue.units_used_this_month AS units_remaining,
    ue.valid_from,
    ue.valid_until
FROM user_entitlements ue
JOIN users  u ON u.id       = ue.user_id
JOIN bricks b ON b.brick_id = ue.brick_id
WHERE ue.status = 'active'
  AND (ue.valid_until IS NULL OR ue.valid_until > NOW());

-- Skill cluster summary — how many skills per cluster, avg compute
CREATE OR REPLACE VIEW v_skill_clusters AS
SELECT
    cluster,
    COUNT(*)                                              AS skill_count,
    COUNT(*) FILTER (WHERE compute_class = 'light')      AS light_count,
    COUNT(*) FILTER (WHERE compute_class = 'medium')     AS medium_count,
    COUNT(*) FILTER (WHERE compute_class = 'heavy')      AS heavy_count,
    COUNT(*) FILTER (WHERE node_affinity = 'cn')         AS china_only_count,
    COUNT(*) FILTER (WHERE requires_brick IS NOT NULL)   AS brick_dependent_count,
    ARRAY_AGG(id ORDER BY id)                            AS skill_ids
FROM skills
WHERE enabled = TRUE
GROUP BY cluster
ORDER BY
    CASE cluster
        WHEN 'core'    THEN 1
        WHEN 'finance' THEN 2
        WHEN 'sales'   THEN 3
        WHEN 'intel'   THEN 4
        WHEN 'hr'      THEN 5
        WHEN 'tech'    THEN 6
        WHEN 'china'   THEN 7
        WHEN 'native'  THEN 8
        WHEN 'media'   THEN 9
        ELSE 10
    END;

-- Which skills each user can run based on their entitlements
CREATE OR REPLACE VIEW v_user_skill_access AS
SELECT
    u.id        AS user_id,
    u.email,
    s.id        AS skill_id,
    s.name      AS skill_name,
    s.cluster,
    s.compute_class,
    s.node_affinity,
    CASE
        WHEN s.requires_brick IS NULL THEN TRUE
        WHEN EXISTS (
            SELECT 1 FROM user_entitlements ue
            WHERE ue.user_id = u.id
              AND ue.brick_id = s.requires_brick
              AND ue.status   = 'active'
        ) THEN TRUE
        ELSE FALSE
    END AS can_run
FROM users u
CROSS JOIN skills s
WHERE s.enabled = TRUE;

CREATE OR REPLACE VIEW v_user_sim_stats AS
SELECT
    user_id,
    COUNT(*)                                           AS total_sims,
    COUNT(*) FILTER (WHERE status = 'completed')       AS completed_sims,
    AVG(sentiment_score)                               AS avg_sentiment,
    AVG(virality_score)                                AS avg_virality,
    SUM(cost_eur)                                      AS total_cost_eur,
    SUM(tokens_input + tokens_output)                  AS total_tokens,
    MAX(created_at)                                    AS last_sim_at
FROM simulation_runs
GROUP BY user_id;

CREATE OR REPLACE VIEW v_brick_revenue AS
SELECT
    brick_id,
    COUNT(DISTINCT user_id)    AS active_users,
    SUM(cost_eur)              AS total_revenue_eur,
    COUNT(*)                   AS total_runs,
    AVG(duration_seconds)      AS avg_duration_seconds
FROM simulation_runs
WHERE status = 'completed'
GROUP BY brick_id;

-- ============================================================
-- HELPER FUNCTIONS (v1.2 — upgraded)
-- ============================================================

CREATE OR REPLACE FUNCTION has_entitlement(p_user_id UUID, p_brick_id VARCHAR(10))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_entitlements
        WHERE user_id  = p_user_id
          AND brick_id = p_brick_id
          AND status   = 'active'
          AND (valid_until IS NULL OR valid_until > NOW())
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_run_skill(p_user_id UUID, p_skill_id VARCHAR(10))
RETURNS BOOLEAN AS $$
DECLARE
    v_requires_brick VARCHAR(10);
BEGIN
    SELECT requires_brick INTO v_requires_brick
    FROM skills WHERE id = p_skill_id AND enabled = TRUE;

    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF v_requires_brick IS NULL THEN RETURN TRUE; END IF;

    RETURN has_entitlement(p_user_id, v_requires_brick);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION use_simulation_unit(p_user_id UUID, p_brick_id VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    UPDATE user_entitlements
    SET    units_used_this_month = units_used_this_month + 1,
           updated_at = NOW()
    WHERE  user_id   = p_user_id
      AND  brick_id  = p_brick_id
      AND  status    = 'active'
      AND  (units_per_month IS NULL OR units_used_this_month < units_per_month)
    RETURNING (COALESCE(units_per_month, 9999) - units_used_this_month) INTO v_remaining;

    RETURN COALESCE(v_remaining, -1);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_monthly_units()
RETURNS void AS $$
BEGIN
    UPDATE user_entitlements
    SET    units_used_this_month = 0,
           last_reset_at         = NOW(),
           updated_at            = NOW()
    WHERE  units_per_month IS NOT NULL
      AND  status = 'active';
END;
$$ LANGUAGE plpgsql;

-- New in v1.2: get all skills a user can currently run
CREATE OR REPLACE FUNCTION get_user_runnable_skills(p_user_id UUID)
RETURNS TABLE(skill_id VARCHAR(10), skill_name VARCHAR(100), cluster VARCHAR(50), compute_class VARCHAR(20)) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.cluster, s.compute_class
    FROM   skills s
    WHERE  s.enabled = TRUE
      AND  can_run_skill(p_user_id, s.id) = TRUE
    ORDER  BY s.cluster, s.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE COMMENTS
-- ============================================================

COMMENT ON TABLE skills          IS 'iVenture Studio VMOA Skill Catalogue v1.2 — 72 skills across 9 clusters (S-01→S-72). Add new skills with INSERT only; no schema change required.';
COMMENT ON TABLE bricks          IS 'iVenture Studio Brick Catalogue v1.1 — 19 bricks across 4 tiers. Synced to DynamoDB brick_registry via Lambda.';
COMMENT ON TABLE user_entitlements IS 'Tracks which users have access to which bricks and on what billing model. Checked before every skill/brick execution via has_entitlement() or can_run_skill().';
COMMENT ON TABLE simulation_runs IS 'Complete log of all Prediction Engine (B-12), Market Signal (B-13), Policy Simulator (B-14), and Crisis Tester (B-15) runs.';
COMMENT ON TABLE product_bundles IS 'Pre-assembled brick combinations with bundle pricing and cluster access grants. Source of truth for Stripe product configuration.';
COMMENT ON COLUMN skills.cluster        IS 'Skill domain cluster: core|finance|sales|intel|hr|tech|china|native|media';
COMMENT ON COLUMN skills.node_affinity  IS 'Preferred compute node: eu (atNorth Iceland) | cn (Alibaba cn-hangzhou, PIPL-safe) | any';
COMMENT ON COLUMN skills.internal_target IS 'For architecture-native skills (cluster=native): internal brick HTTP endpoint to call';
COMMENT ON COLUMN skills.requires_brick  IS 'If set, user must have active entitlement to this brick_id to run the skill';

-- ============================================================
-- SCHEMA VERSION LOG
-- ============================================================

INSERT INTO schema_versions (version, notes) VALUES
('1.0', 'Initial schema — companies, users, agents, interactions, skills (19), memory_entries, cortex_signals'),
('1.1', 'Added bricks (19), user_entitlements, simulation_runs, product_bundles (6); helper views and functions'),
('1.2', 'Expanded skills to 72 across 9 clusters; added cluster/node_affinity/internal_target/requires_brick columns; added can_run_skill() and get_user_runnable_skills() functions; added v_skill_clusters and v_user_skill_access views; clusters_unlocked column on product_bundles')
ON CONFLICT (version) DO NOTHING;
