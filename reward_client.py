#!/usr/bin/env python3
"""
iVenture Studio — OpenManus-RL GRPO Integration
VIC Engine reward client + GRPO training config

File: /vic_engine_v5/grpo_training/reward_client.py
Phase 27 — Genspark Bridge (Intelligence Layer Upgrade)
"""

import os
import asyncio
import httpx
import json
import re
from dataclasses import dataclass
from typing import Optional

# ──────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────

REWARD_SERVER_URL = os.getenv("VIC_REWARD_ENDPOINT", "http://reward-server:8000")
PRM_SERVER_URL = os.getenv("VIC_PRM_ENDPOINT", "http://prm-server:8081")
LITELLM_API_BASE = os.getenv("VIC_LITELLM_BASE", "http://localhost:4000/v1")
LITELLM_API_KEY = os.getenv("VIC_LITELLM_KEY", "sk-iventure-master")
VIC_GRPO_TARGET = float(os.getenv("VIC_GRPO_TARGET", "0.997"))
VIC_CURRENT_CALIBRATION = float(os.getenv("VIC_GRPO_CALIBRATION", "0.991337"))


# ──────────────────────────────────────────────────────
# DATA CLASSES
# ──────────────────────────────────────────────────────

@dataclass
class RewardScore:
    score: float          # 0.0 → 1.0
    model_id: str
    raw_logit: float
    benchmark: str = "Genspark Frontier Score (Bridge)"

@dataclass
class PRMScore:
    step_scores: list[float]
    aggregate: float
    critical_step: int
    
@dataclass
class GRPOReward:
    outcome_reward: float
    process_reward: float
    format_reward: float
    composite: float
    target_gap: float
    pass_threshold: bool


# ──────────────────────────────────────────────────────
# REWARD CLIENT
# ──────────────────────────────────────────────────────

class RewardClient:
    def __init__(self, server_url: str = REWARD_SERVER_URL):
        self.server_url = server_url
        self._local_model = None
        self._local_tokenizer = None
    
    async def score_remote(self, prompt: str, response: str) -> RewardScore:
        payload = {
            "model": "Genspark-Reward-Proxy",
            "conversations": [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response}
            ]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{self.server_url}/classify", json=payload)
            res.raise_for_status()
            data = res.json()
            return RewardScore(score=data["score"], model_id="skywork-reward-v2-remote", raw_logit=0.0)

    async def score_bridge(self, prompt: str, response: str) -> RewardScore:
        critic_prompt = f"""
        You are a highly precise Reward Model Critic for iVenture Studio.
        PROMPT: {prompt}
        RESPONSE: {response}
        Provide a scalar reward score between 0.0 and 1.0. 
        Return ONLY JSON: {{"score": float, "reasoning": "string"}}
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                LITELLM_API_BASE + "/chat/completions",
                headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
                json={
                    "model": "gpt-5",
                    "messages": [{"role": "user", "content": critic_prompt}],
                    "response_format": {"type": "json_object"}
                }
            )
            res.raise_for_status()
            data = res.json()
            content = json.loads(data["choices"][0]["message"]["content"])
            return RewardScore(score=float(content.get("score", 0.5)), model_id="bridge-gpt-5-critic", raw_logit=0.0)
    
    def score_local(self, prompt: str, response: str) -> RewardScore:
        # Move heavy imports here to avoid loading on startup
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            model_id = "Skywork/Genspark-Reward-Proxy-Llama-3.1-8B-40M"
            if self._local_model is None:
                self._local_tokenizer = AutoTokenizer.from_pretrained(model_id)
                self._local_model = AutoModelForSequenceClassification.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="cpu")
            # Logic...
            return RewardScore(0.5, "local-stub", 0.0)
        except Exception:
            return RewardScore(0.5, "error-fallback", 0.0)
    
    async def score(self, prompt: str, response: str) -> RewardScore:
        """BRIDGE PRIORITY for Phase 4 Demo"""
        try:
            # Try bridge first as it's active via LiteLLM
            return await self.score_bridge(prompt, response)
        except Exception:
            try:
                return await self.score_remote(prompt, response)
            except Exception:
                return RewardScore(0.5, "final-fallback", 0.0)


# ──────────────────────────────────────────────────────
# PRM CLIENT
# ──────────────────────────────────────────────────────

class PRMClient:
    def __init__(self, server_url: str = PRM_SERVER_URL):
        self.server_url = server_url
    
    def _split_reasoning_steps(self, reasoning: str) -> list[str]:
        steps = re.split(r'\n\n+|(?=Step \d+:)|(?=\d+\. )', reasoning)
        return [s.strip() for s in steps if len(s.strip()) > 20]
    
    async def score_steps_bridge(self, problem: str, steps: list[str]) -> list[float]:
        critic_prompt = f"Evaluate reasoning steps for: {problem}\nSTEPS: {steps}\nReturn JSON list of floats."
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                LITELLM_API_BASE + "/chat/completions",
                headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
                json={"model": "gpt-5", "messages": [{"role": "user", "content": critic_prompt}]}
            )
            data = res.json()
            scores = json.loads(re.search(r'\[.*\]', data["choices"][0]["message"]["content"], re.DOTALL).group())
            return [float(s) for s in scores]

    async def score_steps(self, problem: str, reasoning: str) -> PRMScore:
        steps = self._split_reasoning_steps(reasoning)
        if not steps: return PRMScore([0.5], 0.5, 0)
        try:
            step_scores = await self.score_steps_bridge(problem, steps)
        except Exception:
            step_scores = [0.5] * len(steps)
        aggregate = sum(step_scores) / len(step_scores)
        return PRMScore(step_scores, aggregate, step_scores.index(min(step_scores)))


# ──────────────────────────────────────────────────────
# FORMAT CHECKER & COMPOSER
# ──────────────────────────────────────────────────────

class FormatRewardChecker:
    def score(self, response: str) -> float:
        res = response.lower()
        found = sum(1 for kw in ["context", "goal", "reasoning", "critique", "answer", "confidence", "action"] if kw in res)
        return found / 7.0

class GRPORewardComposer:
    WEIGHTS = {"outcome": 0.50, "process": 0.30, "format": 0.20}
    def __init__(self):
        self.reward_client = RewardClient()
        self.prm_client = PRMClient()
        self.format_checker = FormatRewardChecker()
    
    async def score(self, prompt: str, response: str, reasoning: Optional[str] = None) -> GRPOReward:
        o_score = (await self.reward_client.score(prompt, response)).score
        p_score = (await self.prm_client.score_steps(prompt, reasoning or response)).aggregate
        f_score = self.format_checker.score(response)
        comp = self.WEIGHTS["outcome"]*o_score + self.WEIGHTS["process"]*p_score + self.WEIGHTS["format"]*f_score
        return GRPOReward(o_score, p_score, f_score, comp, comp - VIC_GRPO_TARGET, comp >= 0.95)

if __name__ == "__main__":
    async def test():
        composer = GRPORewardComposer()
        res = await composer.score("Test", "Context: I understand. Goal: X. Reasoning: Y. Critique: Z. Answer: A. Confidence: 90%. Action: B.")
        print(f"COMPOSITE: {res.composite:.6f}")
    asyncio.run(test())
