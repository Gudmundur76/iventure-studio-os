-- ============================================================
-- iVenture Studio – PostgreSQL Initialization Script
-- Phase 1: Schema Bootstrap
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- composite indexing

-- ── CORE TABLES ──────────────────────────────────────────────

-- Companies (OPC nodes)
CREATE TABLE IF NOT EXISTS companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    country     VARCHAR(3) DEFAULT 'ISL',
    currency    VARCHAR(3) DEFAULT 'EUR',
    plan        VARCHAR(20) DEFAULT 'starter', -- starter/growth/enterprise
    a2a_card    JSONB,                          -- Agent Card (P11)
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
    email        VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    role         VARCHAR(20) DEFAULT 'owner',  -- owner/member/viewer
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- VMOA Agents (9 agents per company)
CREATE TABLE IF NOT EXISTS agents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    type         VARCHAR(50),                   -- strategist/researcher/writer/...
    model_alias  VARCHAR(100),                  -- litellm alias
    status       VARCHAR(20) DEFAULT 'idle',    -- idle/running/error
    grpo_score   DECIMAL(8,6) DEFAULT 0.991337,
    config       JSONB DEFAULT '{}',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions (feeds VIC Cortex)
CREATE TABLE IF NOT EXISTS interactions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
    agent_id      UUID REFERENCES agents(id),
    task_category VARCHAR(100),
    skill_used    VARCHAR(100),
    grpo_reward   DECIMAL(8,6),
    outcome_flag  VARCHAR(20),  -- success/partial/failure
    latency_ms    INTEGER,
    cortex_sent   BOOLEAN DEFAULT FALSE,        -- P14 flag
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Skills Library (18+ skills)
CREATE TABLE IF NOT EXISTS skills (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    version     VARCHAR(20) DEFAULT '1.0.0',
    category    VARCHAR(50),
    prompt_file VARCHAR(255),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Memory entries (Sprint memory)
CREATE TABLE IF NOT EXISTS memory_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
    key         VARCHAR(255) NOT NULL,
    value       JSONB,
    sprint_id   VARCHAR(20),
    ttl_seconds INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    UNIQUE(company_id, key)
);

-- Cortex signals queue (P14 – distilled interactions)
CREATE TABLE IF NOT EXISTS cortex_signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_category   VARCHAR(100),
    skill_used      VARCHAR(100),
    grpo_reward     DECIMAL(8,6),
    outcome_pattern VARCHAR(100),
    routing_decision VARCHAR(100),
    failure_flag    BOOLEAN DEFAULT FALSE,
    node_count      INTEGER DEFAULT 1,          -- aggregation count
    processed       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON interactions(company_id);
CREATE INDEX IF NOT EXISTS idx_interactions_cortex_sent ON interactions(cortex_sent) WHERE cortex_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_company_key ON memory_entries(company_id, key);
CREATE INDEX IF NOT EXISTS idx_cortex_signals_processed ON cortex_signals(processed) WHERE processed = FALSE;

-- ── SEED DATA ─────────────────────────────────────────────────

-- Insert 9 default VMOA agent types
INSERT INTO skills (name, description, category, version) VALUES
  ('market-research',    'Deep market analysis and competitive intelligence',    'research',   '1.0.0'),
  ('content-creation',   'Blog posts, social copy, email sequences',             'writing',    '1.0.0'),
  ('financial-modeling', 'Revenue projections, unit economics, P&L',            'finance',    '1.0.0'),
  ('product-strategy',   'Roadmap planning, feature prioritization',            'strategy',   '1.0.0'),
  ('lead-generation',    'Prospect identification and outreach automation',      'sales',      '1.0.0'),
  ('seo-optimization',   'Keyword research and content optimization',           'marketing',  '1.0.0'),
  ('customer-support',   'Automated helpdesk and FAQ handling',                 'operations', '1.0.0'),
  ('data-analysis',      'CSV/spreadsheet insights and visualization',          'analytics',  '1.0.0'),
  ('code-generation',    'Python/JS boilerplate and automation scripts',        'engineering','1.0.0'),
  ('legal-compliance',   'Contract templates, GDPR/Icelandic law guidance',    'legal',      '1.0.0'),
  ('social-media',       'Platform-specific campaigns and scheduling',         'marketing',  '1.0.0'),
  ('email-marketing',    'Newsletter sequences and drip campaigns',             'marketing',  '1.0.0'),
  ('presentation-gen',   'Slide decks and visual storytelling',                'content',    '1.0.0'),
  ('brand-identity',     'Logo briefs, style guides, positioning',             'design',     '1.0.0'),
  ('opc-onboarding',     'Chinese OPC registration guide (EN/ZH)',             'business',   '1.0.0'),
  ('subsidy-advisor',    'Government grant identification and application',    'finance',    '1.0.0'),
  ('cross-border-trade', 'Iceland EU+China FTA import/export routing',        'trade',      '1.0.0'),
  ('cortex-distiller',   'Anonymize and contribute interactions to VIC Cortex', 'system',   '1.0.0')
ON CONFLICT (name) DO NOTHING;

-- ── FUNCTIONS ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Done
SELECT 'iVenture Studio schema initialized ✅' AS status;
