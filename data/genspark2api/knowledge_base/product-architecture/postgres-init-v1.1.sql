-- ============================================================
-- iVenture Studio — PostgreSQL Schema v1.1
-- Added: bricks, user_entitlements, simulation_runs
-- Upgraded from: phase1/postgres-init.sql
-- Date: 2026-03-18
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- EXISTING TABLES (from v1.0 — preserved)
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    industry        VARCHAR(100),
    country         VARCHAR(10) DEFAULT 'IS',
    currency        VARCHAR(3) DEFAULT 'EUR',
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    company_id      UUID REFERENCES companies(id),
    role            VARCHAR(50) DEFAULT 'operator',
    stripe_customer_id VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100),
    grpo_score      FLOAT DEFAULT 0.5,
    status          VARCHAR(50) DEFAULT 'idle',
    context         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID REFERENCES agents(id),
    company_id      UUID REFERENCES companies(id),
    user_id         UUID REFERENCES users(id),
    skill_id        VARCHAR(50),
    input_text      TEXT,
    output_text     TEXT,
    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    cost_eur        NUMERIC(10,4) DEFAULT 0,
    duration_ms     INTEGER DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'completed',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
    id              VARCHAR(10) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    compute_class   VARCHAR(20) DEFAULT 'medium',
    enabled         BOOLEAN DEFAULT TRUE,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

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
    region          VARCHAR(50) DEFAULT 'eu-iceland',
    epsilon         FLOAT DEFAULT 0.1,
    agent_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEW IN v1.1 — BRICK CATALOGUE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bricks (
    brick_id        VARCHAR(10) PRIMARY KEY,       -- e.g. 'B-12'
    name            VARCHAR(100) NOT NULL,          -- e.g. 'prediction-engine'
    display_name    VARCHAR(100) NOT NULL,
    tagline         TEXT,
    tier            INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
    tier_name       VARCHAR(50),
    container       VARCHAR(100),
    port            INTEGER,
    status          VARCHAR(20) DEFAULT 'healthy',
    optional        BOOLEAN DEFAULT TRUE,
    compute_class   VARCHAR(20) DEFAULT 'medium',
    pricing_model   VARCHAR(30) NOT NULL,
    price_eur       NUMERIC(10,2) DEFAULT 0,
    price_unit      VARCHAR(50) DEFAULT 'month',
    stripe_price_id VARCHAR(100),
    dependencies    TEXT[] DEFAULT '{}',
    bundles         TEXT[] DEFAULT '{}',
    ai_drive_source VARCHAR(255),
    requires_cost_confirmation BOOLEAN DEFAULT FALSE,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tier/status lookups
CREATE INDEX IF NOT EXISTS idx_bricks_tier ON bricks(tier);
CREATE INDEX IF NOT EXISTS idx_bricks_status ON bricks(status);

-- ============================================================
-- NEW IN v1.1 — USER ENTITLEMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_entitlements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brick_id            VARCHAR(10) NOT NULL REFERENCES bricks(brick_id),
    bundle_id           VARCHAR(30),                  -- e.g. 'PREDICTOR'
    entitlement_type    VARCHAR(30) DEFAULT 'subscription',
    -- subscription | pay_per_use | trial | data_swap | founding_node
    status              VARCHAR(20) DEFAULT 'active',
    -- active | paused | cancelled | expired

    -- Metered entitlements (B-12 subscriptions)
    units_per_month     INTEGER,                     -- e.g. 60 sims/month
    units_used_this_month INTEGER DEFAULT 0,
    reset_day           INTEGER DEFAULT 1,           -- day of month for reset

    -- Financial
    monthly_price_eur   NUMERIC(10,2),
    stripe_subscription_id VARCHAR(100),
    stripe_price_id     VARCHAR(100),

    -- Dates
    valid_from          TIMESTAMPTZ DEFAULT NOW(),
    valid_until         TIMESTAMPTZ,                 -- NULL = perpetual
    last_reset_at       TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, brick_id, status)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_brick ON user_entitlements(brick_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_bundle ON user_entitlements(bundle_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON user_entitlements(status);

-- ============================================================
-- NEW IN v1.1 — SIMULATION RUNS TABLE (B-12, B-13, B-14, B-15)
-- ============================================================

CREATE TABLE IF NOT EXISTS simulation_runs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id           VARCHAR(30) UNIQUE NOT NULL, -- 'sim_xxxxxxxx'
    user_id                 UUID NOT NULL REFERENCES users(id),
    company_id              UUID REFERENCES companies(id),
    brick_id                VARCHAR(10) NOT NULL REFERENCES bricks(brick_id),

    -- Simulation inputs
    question                TEXT NOT NULL,
    agents                  INTEGER NOT NULL,
    rounds                  INTEGER NOT NULL,
    market_segment          VARCHAR(50) DEFAULT 'general',
    language                VARCHAR(5) DEFAULT 'en',
    llm_model               VARCHAR(50) DEFAULT 'kimi-k2.5',
    fast_mode               BOOLEAN DEFAULT FALSE,
    cortex_contribute       BOOLEAN DEFAULT TRUE,

    -- Execution state
    status                  VARCHAR(30) DEFAULT 'queued',
    -- queued | running | completed | failed | cancelled
    progress_pct            INTEGER DEFAULT 0,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    duration_seconds        INTEGER,

    -- Results
    sentiment_score         FLOAT,
    controversy_index       FLOAT,
    virality_score          FLOAT,
    confidence_score        FLOAT,
    trading_signal          VARCHAR(10),  -- GO | NO-GO | HOLD
    coalition_map           JSONB DEFAULT '{}',
    platform_breakdown      JSONB DEFAULT '{}',
    top_objections          JSONB DEFAULT '[]',
    recommended_framing     TEXT,
    framing_alternatives    JSONB DEFAULT '[]',
    strategic_fixes         JSONB DEFAULT '[]',
    persona_highlights      JSONB DEFAULT '[]',
    full_report_json        JSONB,

    -- Delivery
    report_url              VARCHAR(500),
    report_pdf_url          VARCHAR(500),
    cortex_signal_id        VARCHAR(50),

    -- Billing
    billing_model           VARCHAR(30),  -- subscription | pay_per_use
    plan                    VARCHAR(30),
    cost_eur                NUMERIC(10,4) DEFAULT 4.00,
    llm_calls               INTEGER DEFAULT 0,
    tokens_input            BIGINT DEFAULT 0,
    tokens_output           BIGINT DEFAULT 0,
    stripe_meter_event_id   VARCHAR(100),

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sims_user ON simulation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_sims_status ON simulation_runs(status);
CREATE INDEX IF NOT EXISTS idx_sims_brick ON simulation_runs(brick_id);
CREATE INDEX IF NOT EXISTS idx_sims_segment ON simulation_runs(market_segment);
CREATE INDEX IF NOT EXISTS idx_sims_created ON simulation_runs(created_at DESC);

-- ============================================================
-- NEW IN v1.1 — BUNDLES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS product_bundles (
    bundle_id           VARCHAR(30) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    price_eur_monthly   NUMERIC(10,2) NOT NULL,
    price_eur_annual    NUMERIC(10,2),
    stripe_product_id   VARCHAR(100),
    stripe_price_monthly VARCHAR(100),
    stripe_price_annual  VARCHAR(100),
    tokens_per_month    BIGINT,           -- -1 = unlimited
    sims_per_month      INTEGER,          -- -1 = unlimited
    signals_per_month   INTEGER,          -- -1 = unlimited
    companies_included  INTEGER DEFAULT 1,
    sla_uptime_pct      FLOAT DEFAULT 99.5,
    bricks_included     TEXT[] NOT NULL DEFAULT '{}',
    skills_included     INTEGER DEFAULT 5,
    requires_data_contribution BOOLEAN DEFAULT FALSE,
    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA — Skills (19 VMOA skills)
-- ============================================================

INSERT INTO skills (id, name, description, compute_class, config) VALUES
('S-01', 'market-research', 'Deep market analysis and competitor mapping', 'medium', '{"llm": "kimi-k2.5"}'),
('S-02', 'content-creation', 'Blog posts, social copy, newsletters', 'light', '{"llm": "qwen-turbo"}'),
('S-03', 'financial-modeling', 'Revenue projections, P&L, unit economics', 'medium', '{"llm": "kimi-k2.5"}'),
('S-04', 'product-strategy', 'Roadmap planning, feature prioritisation', 'medium', '{"llm": "kimi-k2.5"}'),
('S-05', 'lead-generation', 'Prospect outreach, list building', 'medium', '{"llm": "qwen-turbo"}'),
('S-06', 'seo-optimization', 'Keyword research, on-page SEO', 'light', '{"llm": "qwen-turbo"}'),
('S-07', 'customer-support', 'Helpdesk automation, ticket triage', 'light', '{"llm": "qwen-turbo"}'),
('S-08', 'data-analysis', 'CSV/JSON insights, statistical summaries', 'medium', '{"llm": "kimi-k2.5"}'),
('S-09', 'code-generation', 'Python/JS/SQL boilerplate, refactoring', 'medium', '{"llm": "nemotron-3-super"}'),
('S-10', 'legal-compliance', 'Contract templates, compliance checks', 'medium', '{"llm": "claude-opus-4"}'),
('S-11', 'social-media', 'Campaign planning, post scheduling', 'light', '{"llm": "qwen-turbo"}'),
('S-12', 'email-marketing', 'Newsletter creation, sequence design', 'light', '{"llm": "qwen-turbo"}'),
('S-13', 'presentation-gen', 'Slide deck creation, pitch decks', 'medium', '{"llm": "gpt-5"}'),
('S-14', 'brand-identity', 'Logo briefs, brand guidelines', 'light', '{"llm": "qwen-turbo"}'),
('S-15', 'opc-onboarding', 'Chinese OPC operator onboarding guide', 'medium', '{"llm": "qwen3-72b", "language": "zh"}'),
('S-16', 'subsidy-advisor', 'EU/national grant identification, auto-apply', 'heavy', '{"llm": "kimi-k2.5"}'),
('S-17', 'cross-border-trade', 'Iceland–EU–China routing and compliance', 'heavy', '{"llm": "kimi-k2.5"}'),
('S-18', 'cortex-distiller', 'Anonymise and contribute interactions to Cortex', 'light', '{"epsilon": 0.1}'),
('S-19', 'market-simulation', 'Prediction Engine bridge — routes to B-12', 'heavy', '{"routes_to": "B-12", "requires_confirmation": true}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA — Bricks (19 bricks)
-- ============================================================

INSERT INTO bricks (brick_id, name, display_name, tagline, tier, tier_name, container, port, optional, compute_class, pricing_model, price_eur, price_unit, stripe_price_id, dependencies, bundles, ai_drive_source, requires_cost_confirmation) VALUES
('B-01', 'vic-engine', 'VIC Engine', 'The AI agent runtime that runs your business', 1, 'Infrastructure', 'iventure-vic-engine', 8080, false, 'medium', 'flat', 49.00, 'month', 'price_b01_monthly', ARRAY['B-02','B-05','B-06'], ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'], 'mesh/', false),
('B-02', 'model-gateway', 'Model Gateway', 'One API key. 30+ frontier models. Zero lock-in.', 1, 'Infrastructure', 'iventure-litellm', 4000, false, 'light', 'flat_plus_overage', 29.00, 'month', 'price_b02_monthly', ARRAY['B-06'], ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'], 'phase2/litellm_config_p2.yaml', false),
('B-03', 'openclaw-node', 'OpenClaw Node', 'A browser-capable AI agent that works like a human employee', 1, 'Infrastructure', 'iventure-openclaw', 3001, true, 'light_medium', 'flat', 19.00, 'month', 'price_b03_monthly', ARRAY['B-02'], ARRAY['BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE'], 'openclaw/', false),
('B-04', 'knowledge-graph', 'Knowledge Graph', 'Your business intelligence in a queryable graph', 1, 'Infrastructure', 'iventure-neo4j', 7474, true, 'medium', 'flat', 29.00, 'month', 'price_b04_monthly', ARRAY[]::TEXT[], ARRAY['INTELLIGENCE','PREDICTOR','EMPIRE'], 'docker-compose.yml', false),
('B-05', 'data-store', 'Data Store', 'Structured memory for your entire operation', 1, 'Infrastructure', 'iventure-postgres', 5432, false, 'light', 'flat', 19.00, 'month', 'price_b05_monthly', ARRAY[]::TEXT[], ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'], 'phase1/postgres-init.sql', false),
('B-06', 'cache-layer', 'Cache Layer', 'Speed and cost reduction for everything', 1, 'Infrastructure', 'iventure-redis', 6379, false, 'light', 'bundled', 0.00, 'bundled', NULL, ARRAY[]::TEXT[], ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'], 'docker-compose.yml', false),
('B-07', 'vic-cortex', 'VIC Cortex', 'The world model that gets smarter with every operator', 2, 'Intelligence', 'iventure-cortex', 8070, true, 'medium', 'tiered', 39.00, 'month', 'price_b07_read', ARRAY['B-05'], ARRAY['INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'], 'VIC-CORTEX-SPEC.md', false),
('B-08', 'vmoa-skill-pack', 'VMOA Skill Pack', '19 autonomous business skills, deployable individually or as a suite', 2, 'Intelligence', 'iventure-vmoa', 8085, true, 'varies', 'a_la_carte_or_bundle', 79.00, 'month', 'price_b08_all', ARRAY['B-01','B-02'], ARRAY['SPARK','BUILDER','INTELLIGENCE','PREDICTOR','EMPIRE','CORTEX_PARTNER'], 'phase1/postgres-init.sql', false),
('B-09', 'subsidy-advisor', 'Subsidy Advisor', 'Find and apply for grants automatically', 2, 'Intelligence', 'iventure-subsidy', 8091, true, 'medium', 'flat', 29.00, 'month', 'price_b09_monthly', ARRAY['B-02','B-05'], ARRAY['INTELLIGENCE','PREDICTOR','EMPIRE'], 'phase1/postgres-init.sql', false),
('B-10', 'cross-border-trade', 'Cross-Border Trade', 'Iceland–EU–China in one workflow', 2, 'Intelligence', 'iventure-trade', 8092, true, 'medium', 'flat', 49.00, 'month', 'price_b10_monthly', ARRAY['B-02','B-04','B-18'], ARRAY['EMPIRE'], 'phase1/postgres-init.sql', false),
('B-11', 'opc-onboarding', 'OPC Onboarding', 'Zero-friction onboarding for Chinese OPC operators', 2, 'Intelligence', 'iventure-opc', 8093, true, 'light', 'flat', 19.00, 'month', 'price_b11_monthly', ARRAY['B-02','B-18'], ARRAY['EMPIRE'], 'phase1/postgres-init.sql', false),
('B-12', 'prediction-engine', 'Prediction Engine', 'Run 2,847 AI agents to predict any decision before you make it', 3, 'Prediction', 'iventure-mirofish', 8085, true, 'heavy', 'metered_or_subscription', 4.00, 'simulation', 'price_pred_ppu', ARRAY['B-02','B-04','B-05'], ARRAY['PREDICTOR','EMPIRE'], 'phase25/', true),
('B-13', 'market-signal', 'Market Signal', '2,847 agents. One trading signal.', 3, 'Prediction', 'iventure-market-signal', 8094, true, 'heavy', 'metered', 8.00, 'signal', 'price_b13_ppu', ARRAY['B-12'], ARRAY['PREDICTOR','EMPIRE'], 'phase25/vmoa_skill_market_simulation.py', true),
('B-14', 'policy-simulator', 'Policy Simulator', 'Test any business or regulatory decision before it is irreversible', 3, 'Prediction', 'iventure-policy-sim', 8095, true, 'heavy', 'metered', 6.00, 'simulation', 'price_b14_ppu', ARRAY['B-12'], ARRAY['PREDICTOR','EMPIRE'], NULL, true),
('B-15', 'crisis-tester', 'Crisis Tester', 'What happens to your business if everything goes wrong?', 3, 'Prediction', 'iventure-crisis', 8096, true, 'heavy', 'metered', 6.00, 'simulation', 'price_b15_ppu', ARRAY['B-12'], ARRAY['EMPIRE'], NULL, true),
('B-16', 'portfolio-manager', 'Portfolio Manager', 'One founder. N autonomous companies.', 4, 'Scale', 'iventure-portfolio', 8060, true, 'medium', 'tiered', 99.00, 'month', 'price_b16_monthly', ARRAY['B-01','B-05','B-17'], ARRAY['EMPIRE'], 'MASTER-DEV-PLAN.md', false),
('B-17', 'a2a-network', 'A2A Network', 'Let your companies trade tasks and revenue with each other', 4, 'Scale', 'iventure-a2a', 8050, true, 'light', 'transaction_fee', 0.00, 'pct_task_value', 'price_b17_transaction', ARRAY['B-01','B-05'], ARRAY['EMPIRE'], 'a2a_card.py', false),
('B-18', 'china-node', 'China Node', 'PIPL-compliant. Qwen3-native. Sub-20ms for Chinese OPCs.', 4, 'Scale', 'iventure-cn-node', 8090, true, 'medium', 'flat', 59.00, 'month', 'price_b18_monthly', ARRAY['B-01','B-02'], ARRAY['EMPIRE'], 'integrations/OASIS-MIROFISH-DEFINITIVE.md', false),
('B-19', 'cortex-contributor', 'Cortex Contributor', 'Feed data. Receive intelligence. The cooperative model.', 4, 'Scale', 'iventure-cortex-feed', 8055, true, 'light', 'free', 0.00, 'data_exchange', 'price_b19_free', ARRAY['B-01','B-07'], ARRAY['CORTEX_PARTNER','PREDICTOR','EMPIRE'], 'cortex_contributor.py', false)
ON CONFLICT (brick_id) DO NOTHING;

-- ============================================================
-- SEED DATA — Product Bundles
-- ============================================================

INSERT INTO product_bundles (bundle_id, name, price_eur_monthly, price_eur_annual, stripe_product_id, stripe_price_monthly, tokens_per_month, sims_per_month, signals_per_month, companies_included, sla_uptime_pct, bricks_included, skills_included, requires_data_contribution) VALUES
('SPARK', 'SPARK', 49.00, 470.00, 'prod_spark', 'price_spark_monthly', 1000000, 0, 0, 1, 99.5, ARRAY['B-01','B-02','B-05','B-06'], 5, false),
('BUILDER', 'BUILDER', 149.00, 1430.00, 'prod_builder', 'price_builder_monthly', 5000000, 0, 0, 1, 99.5, ARRAY['B-01','B-02','B-03','B-05','B-06','B-08'], 19, false),
('INTELLIGENCE', 'INTELLIGENCE', 299.00, 2870.00, 'prod_intelligence', 'price_intelligence_monthly', 10000000, 0, 0, 1, 99.5, ARRAY['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09'], 19, false),
('PREDICTOR', 'PREDICTOR', 499.00, 4790.00, 'prod_predictor', 'price_predictor_monthly', 20000000, 60, 15, 1, 99.9, ARRAY['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09','B-12','B-13','B-14','B-19'], 19, false),
('EMPIRE', 'EMPIRE', 999.00, 9590.00, 'prod_empire', 'price_empire_monthly', -1, -1, -1, 5, 99.99, ARRAY['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09','B-10','B-11','B-12','B-13','B-14','B-15','B-16','B-17','B-18','B-19'], 19, false),
('CORTEX_PARTNER', 'CORTEX PARTNER', 0.00, 0.00, 'prod_cortex_partner', 'price_cortex_partner_free', 3000000, 0, 0, 1, 99.5, ARRAY['B-01','B-02','B-07','B-08','B-19'], 10, true)
ON CONFLICT (bundle_id) DO NOTHING;

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- View: Active user entitlements with brick details
CREATE OR REPLACE VIEW v_user_active_entitlements AS
SELECT
    ue.user_id,
    u.email,
    u.name,
    ue.brick_id,
    b.display_name AS brick_name,
    b.tier,
    ue.bundle_id,
    ue.entitlement_type,
    ue.units_per_month,
    ue.units_used_this_month,
    COALESCE(ue.units_per_month, 0) - ue.units_used_this_month AS units_remaining,
    ue.valid_from,
    ue.valid_until
FROM user_entitlements ue
JOIN users u ON u.id = ue.user_id
JOIN bricks b ON b.brick_id = ue.brick_id
WHERE ue.status = 'active'
  AND (ue.valid_until IS NULL OR ue.valid_until > NOW());

-- View: Simulation stats by user
CREATE OR REPLACE VIEW v_user_sim_stats AS
SELECT
    user_id,
    COUNT(*) AS total_sims,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_sims,
    AVG(sentiment_score) AS avg_sentiment,
    AVG(virality_score) AS avg_virality,
    SUM(cost_eur) AS total_cost_eur,
    SUM(tokens_input + tokens_output) AS total_tokens,
    MAX(created_at) AS last_sim_at
FROM simulation_runs
GROUP BY user_id;

-- View: Brick revenue summary
CREATE OR REPLACE VIEW v_brick_revenue AS
SELECT
    brick_id,
    COUNT(DISTINCT user_id) AS active_users,
    SUM(cost_eur) AS total_revenue_eur,
    COUNT(*) AS total_runs,
    AVG(duration_seconds) AS avg_duration_seconds
FROM simulation_runs
WHERE status = 'completed'
GROUP BY brick_id;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Check if user has entitlement to a brick
CREATE OR REPLACE FUNCTION has_entitlement(p_user_id UUID, p_brick_id VARCHAR(10))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_entitlements
        WHERE user_id = p_user_id
          AND brick_id = p_brick_id
          AND status = 'active'
          AND (valid_until IS NULL OR valid_until > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Decrement simulation units and return remaining
CREATE OR REPLACE FUNCTION use_simulation_unit(p_user_id UUID, p_brick_id VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    UPDATE user_entitlements
    SET units_used_this_month = units_used_this_month + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND brick_id = p_brick_id
      AND status = 'active'
      AND (units_per_month IS NULL OR units_used_this_month < units_per_month)
    RETURNING (COALESCE(units_per_month, 9999) - units_used_this_month) INTO v_remaining;

    RETURN COALESCE(v_remaining, -1);
END;
$$ LANGUAGE plpgsql;

-- Function: Reset monthly unit counters (run on 1st of each month via pg_cron)
CREATE OR REPLACE FUNCTION reset_monthly_units()
RETURNS void AS $$
BEGIN
    UPDATE user_entitlements
    SET units_used_this_month = 0,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE units_per_month IS NOT NULL
      AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE bricks IS 'iVenture Studio Brick Catalogue v1.1 — 19 bricks across 4 tiers. Source of truth for all product modules. Synced to DynamoDB brick_registry via Lambda.';
COMMENT ON TABLE user_entitlements IS 'Tracks which users have access to which bricks and on what billing model. Checked by Lambda dispatcher before every brick execution.';
COMMENT ON TABLE simulation_runs IS 'Complete log of all Prediction Engine (B-12), Market Signal (B-13), Policy Simulator (B-14), and Crisis Tester (B-15) runs.';
COMMENT ON TABLE product_bundles IS 'Pre-assembled brick combinations with bundle pricing. Source of truth for Stripe product configuration.';

-- ============================================================
-- SCHEMA VERSION
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_versions (
    version     VARCHAR(10) PRIMARY KEY,
    applied_at  TIMESTAMPTZ DEFAULT NOW(),
    notes       TEXT
);

INSERT INTO schema_versions (version, notes) VALUES
('1.0', 'Initial schema — companies, users, agents, interactions, skills, memory_entries, cortex_signals'),
('1.1', 'Added bricks, user_entitlements, simulation_runs, product_bundles; helper views and functions')
ON CONFLICT (version) DO NOTHING;
