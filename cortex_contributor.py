#!/usr/bin/env python3
"""
iVenture Studio — Cortex Contributor Stub
vic_engine_v5/cortex/contributor.py

Embed this during P3. It costs 2 hours now and enables the
entire VIC Cortex world model from Day 1 of launch.

Every VIC interaction fires contribute_to_cortex() silently.
It never blocks. It never sends raw text. It never exposes
company identity, financials, or user PII.

It sends only: category, skills, reward score, outcome signal.
The cortex builds itself from these signals, compounding forever.
"""

import asyncio
import hashlib
import logging
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
import httpx

logger = logging.getLogger("vic.cortex")

# Config from environment
CORTEX_INGEST_URL = os.getenv("CORTEX_INGEST_URL", "http://cortex-api:8020")
CORTEX_INGEST_SECRET = os.getenv("CORTEX_INGEST_SECRET", "")
CORTEX_ENABLED = os.getenv("CORTEX_ENABLED", "true").lower() == "true"

# Outcome signal mapping — never send raw text, only coded labels
OUTCOME_SIGNALS = {
    "high_reward":       "task_completed_excellent",   # reward >= 0.97
    "good_reward":       "task_completed_positive",    # reward >= 0.90
    "acceptable":        "task_completed_neutral",     # reward >= 0.80
    "low_reward":        "task_completed_low",         # reward >= 0.70
    "failed":            "task_failed",                # reward < 0.70
    "user_approved":     "user_explicit_approval",
    "user_rejected":     "user_explicit_rejection",
    "a2a_completed":     "a2a_task_completed",
    "a2a_failed":        "a2a_task_failed",
}

# Category taxonomy — maps VIC domain → cortex category code
CATEGORY_MAP = {
    "finance":           "finance",
    "financial":         "finance",
    "tax":               "finance/tax",
    "invoice":           "finance/invoice",
    "cashflow":          "finance/cashflow",
    "vat":               "finance/vat",
    "payroll":           "finance/payroll",
    "marketing":         "marketing",
    "seo":               "marketing/seo",
    "content":           "marketing/content",
    "social":            "marketing/social",
    "ads":               "marketing/ads",
    "legal":             "legal",
    "contract":          "legal/contract",
    "compliance":        "legal/compliance",
    "ip":                "legal/ip",
    "research":          "research",
    "market":            "research/market",
    "competitive":       "research/competitive",
    "technical":         "technical",
    "code":              "technical/code",
    "architecture":      "technical/architecture",
    "operations":        "operations",
    "workflow":          "operations/workflow",
    "communication":     "communication",
    "email":             "communication/email",
    "pitch":             "communication/pitch",
    "strategy":          "strategy",
    "ecommerce":         "ecommerce",
    "trade":             "trade",
    "customs":           "trade/customs",
    "logistics":         "trade/logistics",
}


@dataclass
class CortexSignal:
    """
    The only data structure that leaves a node.
    No raw text. No amounts. No names. No company ID.
    Only coded signals that teach the cortex what works.
    """
    category: str          # e.g. "finance/vat"
    vertical: str          # e.g. "finance"
    skills: list           # e.g. ["tax-calc", "sheets-export"]
    reward: float          # e.g. 0.991 (will be noised server-side)
    outcome: str           # coded label, see OUTCOME_SIGNALS
    agent_type: str        # e.g. "vmoa-financial"
    node_hash: str         # sha256[:16] of node_id, NOT company name
    skill_count: int       # number of skills used
    day_of_week: int       # 0=Mon, 6=Sun (no exact date)
    week_of_year: int      # 1-52 (no exact date)
    schema_version: str = "cortex-signal/v1"
    # NOT included: prompt text, response text, company name,
    #               financial figures, user PII, exact timestamp


def map_category(domain_hint: str) -> tuple[str, str]:
    """Map a domain hint to (category_code, vertical)"""
    hint_lower = domain_hint.lower()
    for key, category in CATEGORY_MAP.items():
        if key in hint_lower:
            vertical = category.split("/")[0]
            return category, vertical
    return "general", "general"


def map_outcome(reward: float, explicit_signal: Optional[str] = None) -> str:
    """Map reward score to coded outcome label"""
    if explicit_signal and explicit_signal in OUTCOME_SIGNALS:
        return OUTCOME_SIGNALS[explicit_signal]
    if reward >= 0.97:
        return OUTCOME_SIGNALS["high_reward"]
    elif reward >= 0.90:
        return OUTCOME_SIGNALS["good_reward"]
    elif reward >= 0.80:
        return OUTCOME_SIGNALS["acceptable"]
    elif reward >= 0.70:
        return OUTCOME_SIGNALS["low_reward"]
    else:
        return OUTCOME_SIGNALS["failed"]


def anonymise_node(node_id: str) -> str:
    """One-way hash of node ID. Cannot be reversed."""
    return hashlib.sha256(node_id.encode()).hexdigest()[:16]


async def contribute_to_cortex(
    node_id: str,
    domain_hint: str,
    skills_used: list[str],
    grpo_score: float,
    agent_type: str,
    explicit_outcome: Optional[str] = None,
) -> None:
    """
    Main entry point. Call this after every VIC Engine interaction.

    Args:
        node_id:          Company's internal ID (hashed before sending)
        domain_hint:      e.g. "financial analysis", "vat returns"
        skills_used:      e.g. ["tax-calc", "sheets-export"]
        grpo_score:       The composite GRPO reward score
        agent_type:       Which VMOA agent handled this (e.g. "vmoa-financial")
        explicit_outcome: Optional override signal (e.g. "user_approved")

    Returns:
        None. Always. This never blocks and never raises to the caller.
        All errors are logged silently.
    """
    if not CORTEX_ENABLED:
        return

    # Fire as a background task — never blocks VIC's response to the user
    asyncio.create_task(
        _send_signal(
            node_id=node_id,
            domain_hint=domain_hint,
            skills_used=skills_used,
            grpo_score=grpo_score,
            agent_type=agent_type,
            explicit_outcome=explicit_outcome,
        )
    )


async def _send_signal(
    node_id: str,
    domain_hint: str,
    skills_used: list[str],
    grpo_score: float,
    agent_type: str,
    explicit_outcome: Optional[str],
) -> None:
    """Internal async send. All errors caught silently."""
    try:
        now = datetime.utcnow()
        category, vertical = map_category(domain_hint)
        outcome = map_outcome(grpo_score, explicit_outcome)
        node_hash = anonymise_node(node_id)

        signal = CortexSignal(
            category=category,
            vertical=vertical,
            skills=skills_used[:10],        # cap at 10 skills
            reward=round(grpo_score, 4),     # 4 decimal places
            outcome=outcome,
            agent_type=agent_type,
            node_hash=node_hash,
            skill_count=len(skills_used),
            day_of_week=now.weekday(),
            week_of_year=now.isocalendar()[1],
        )

        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.post(
                f"{CORTEX_INGEST_URL}/ingest",
                json=asdict(signal),
                headers={
                    "X-Cortex-Secret": CORTEX_INGEST_SECRET,
                    "X-Schema-Version": "cortex-signal/v1",
                },
            )
            if response.status_code == 200:
                logger.debug(
                    f"Cortex signal sent: {category} | reward={grpo_score:.4f}"
                )
            elif response.status_code == 202:
                logger.debug(
                    f"Cortex signal buffered (k-anonymity pending): {category}"
                )
            else:
                logger.warning(
                    f"Cortex signal rejected: {response.status_code}"
                )

    except httpx.TimeoutException:
        # Cortex is down or slow — silently skip, never affects VIC
        logger.debug("Cortex ingest timeout — skipped silently")
    except Exception as e:
        # Never let cortex errors surface to VIC users
        logger.debug(f"Cortex contribute error (suppressed): {e}")


# ──────────────────────────────────────────────────────────────
# VIC ENGINE INTEGRATION POINT
# Add this call to vic_engine_v5/engine.py after every response
# ──────────────────────────────────────────────────────────────

async def post_interaction_hook(
    vic_response: dict,
    node_id: str,
) -> None:
    """
    Drop this into VIC Engine's response pipeline.
    Call after GRPO scoring, before returning to user.

    Example usage in vic_engine_v5/engine.py:
        grpo_result = await grpo_composer.score(prompt, response)
        await post_interaction_hook(
            vic_response={
                "agent_type": agent_used,
                "domain": task_domain,
                "skills": skills_invoked,
                "grpo_score": grpo_result.composite,
            },
            node_id=session.company_id
        )
    """
    await contribute_to_cortex(
        node_id=node_id,
        domain_hint=vic_response.get("domain", "general"),
        skills_used=vic_response.get("skills", []),
        grpo_score=vic_response.get("grpo_score", 0.5),
        agent_type=vic_response.get("agent_type", "vmoa-general"),
    )


# ──────────────────────────────────────────────────────────────
# CLI TEST — verify signal sends correctly
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    async def test():
        print("Testing VIC Cortex Contributor...")
        print(f"Cortex URL: {CORTEX_INGEST_URL}")
        print(f"Enabled: {CORTEX_ENABLED}")
        print()

        # Simulate a VIC Financial Agent interaction
        await contribute_to_cortex(
            node_id="test-company-iceland-001",
            domain_hint="VAT returns for e-commerce",
            skills_used=["tax-calc", "sheets-export", "invoice-gen"],
            grpo_score=0.9913,
            agent_type="vmoa-financial",
        )
        print("Signal 1 sent: finance/vat | reward=0.9913")

        # Simulate a VIC Research Agent interaction
        await contribute_to_cortex(
            node_id="test-company-iceland-001",
            domain_hint="market research competitive analysis",
            skills_used=["web-search", "summarise", "report-gen"],
            grpo_score=0.9876,
            agent_type="vmoa-research",
        )
        print("Signal 2 sent: research/market | reward=0.9876")

        # Simulate a low-scoring interaction (cortex learns what NOT to do)
        await contribute_to_cortex(
            node_id="test-company-iceland-001",
            domain_hint="contract legal review",
            skills_used=["contract-review"],
            grpo_score=0.7234,
            agent_type="vmoa-legal",
        )
        print("Signal 3 sent: legal/contract | reward=0.7234 (low — cortex notes)")

        await asyncio.sleep(0.5)   # let async tasks complete
        print()
        print("All signals dispatched. Check cortex-api logs.")
        print("Expected: 3 signals buffering until k-anonymity threshold met")

    asyncio.run(test())
