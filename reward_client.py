#!/usr/bin/env python3
"""
iVenture Studio — OpenManus-RL GRPO Integration
VIC Engine reward client + GRPO training config

File: /vic_engine_v5/grpo_training/reward_client.py
Phase 27 — Skywork-Reward-V2 + Skywork-O1-PRM

Usage:
    from grpo_training.reward_client import RewardClient, PRMClient, GRPORewardComposer
    
    composer = GRPORewardComposer()
    score = await composer.score(prompt, response, steps)
"""

import os
import asyncio
import httpx
import torch
from dataclasses import dataclass
from typing import Optional
from transformers import AutoTokenizer, AutoModelForSequenceClassification


# ──────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────

REWARD_SERVER_URL = os.getenv("VIC_REWARD_ENDPOINT", "http://reward-server:8000")
PRM_SERVER_URL = os.getenv("VIC_PRM_ENDPOINT", "http://prm-server:8001")
VIC_GRPO_TARGET = float(os.getenv("VIC_GRPO_TARGET", "0.997"))
VIC_CURRENT_CALIBRATION = float(os.getenv("VIC_GRPO_CALIBRATION", "0.991337"))


# ──────────────────────────────────────────────────────
# DATA CLASSES
# ──────────────────────────────────────────────────────

@dataclass
class RewardScore:
    """Outcome-level reward from Skywork-Reward-V2"""
    score: float          # 0.0 → 1.0
    model_id: str
    raw_logit: float
    benchmark: str = "RewardBench-v1: 97.8"

@dataclass
class PRMScore:
    """Step-level process reward from Skywork-O1-PRM"""
    step_scores: list[float]   # per reasoning step
    aggregate: float           # weighted mean
    critical_step: int         # index of lowest-scoring step
    
@dataclass
class GRPOReward:
    """Composed GRPO reward signal for VIC training loop"""
    outcome_reward: float      # from Skywork-Reward-V2
    process_reward: float      # from Skywork-O1-PRM  
    format_reward: float       # from VIC format checker
    composite: float           # final weighted score
    target_gap: float          # composite - VIC_GRPO_TARGET
    pass_threshold: bool       # True if composite >= 0.95


# ──────────────────────────────────────────────────────
# SKYWORK REWARD-V2 CLIENT
# ──────────────────────────────────────────────────────

class RewardClient:
    """
    Client for Skywork-Reward-V2 inference server.
    
    Server runs Skywork/Skywork-Reward-V2-Qwen3-8B via SGLang.
    RewardBench v1: 97.8 | v2: 86.5 | Avg: 88.6
    """
    
    def __init__(self, server_url: str = REWARD_SERVER_URL):
        self.server_url = server_url
        self._local_model = None
        self._local_tokenizer = None
    
    async def score_remote(self, prompt: str, response: str) -> RewardScore:
        """Score via SGLang reward server (preferred in Docker env)"""
        payload = {
            "model": "Skywork-Reward-V2",
            "conversations": [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response}
            ]
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{self.server_url}/classify", json=payload)
            res.raise_for_status()
            data = res.json()
            return RewardScore(
                score=data["score"],
                model_id=data.get("model", "Skywork-Reward-V2-Qwen3-8B"),
                raw_logit=data.get("logit", 0.0)
            )
    
    def score_local(self, prompt: str, response: str, 
                    model_id: str = "Skywork/Skywork-Reward-V2-Qwen3-8B") -> RewardScore:
        """Score using local HuggingFace model (for training runs)"""
        if self._local_model is None:
            self._local_tokenizer = AutoTokenizer.from_pretrained(model_id)
            self._local_model = AutoModelForSequenceClassification.from_pretrained(
                model_id,
                torch_dtype=torch.bfloat16,
                device_map="auto"
            )
            self._local_model.eval()
        
        conversation = [
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": response}
        ]
        
        input_ids = self._local_tokenizer.apply_chat_template(
            conversation,
            return_tensors="pt"
        ).to(self._local_model.device)
        
        with torch.no_grad():
            output = self._local_model(input_ids)
            score = output.logits[0][0].item()
        
        # Normalise from logit space to [0, 1]
        normalised = torch.sigmoid(torch.tensor(score)).item()
        
        return RewardScore(
            score=normalised,
            model_id=model_id,
            raw_logit=score
        )
    
    async def score(self, prompt: str, response: str) -> RewardScore:
        """Auto-select remote vs local based on environment"""
        try:
            return await self.score_remote(prompt, response)
        except Exception:
            # Fallback to local model
            return self.score_local(prompt, response)


# ──────────────────────────────────────────────────────
# SKYWORK-O1-PRM CLIENT
# ──────────────────────────────────────────────────────

class PRMClient:
    """
    Client for Skywork-O1-PRM step-level process reward model.
    
    Scores each reasoning step independently.
    Serves via vLLM at PRM_SERVER_URL.
    """
    
    def __init__(self, server_url: str = PRM_SERVER_URL):
        self.server_url = server_url
    
    def _split_reasoning_steps(self, reasoning: str) -> list[str]:
        """Split chain-of-thought into individual steps"""
        import re
        # Split on step markers: \n\n, numbered steps, or <step> tags
        steps = re.split(r'\n\n+|(?=Step \d+:)|(?=\d+\. )', reasoning)
        return [s.strip() for s in steps if len(s.strip()) > 20]
    
    async def score_steps(self, problem: str, reasoning: str) -> PRMScore:
        """Score each reasoning step via vLLM embeddings endpoint"""
        steps = self._split_reasoning_steps(reasoning)
        step_scores = []
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            for step in steps:
                payload = {
                    "model": "skywork-o1-prm",
                    "input": f"Problem: {problem}\nStep: {step}",
                    "encoding_format": "float"
                }
                try:
                    res = await client.post(
                        f"{self.server_url}/v1/embeddings", json=payload
                    )
                    data = res.json()
                    # PRM returns step reward as first embedding value
                    step_score = data["data"][0]["embedding"][0]
                    step_scores.append(max(0.0, min(1.0, step_score)))
                except Exception:
                    step_scores.append(0.5)  # neutral on error
        
        if not step_scores:
            step_scores = [0.5]
        
        aggregate = sum(step_scores) / len(step_scores)
        critical_step = step_scores.index(min(step_scores))
        
        return PRMScore(
            step_scores=step_scores,
            aggregate=aggregate,
            critical_step=critical_step
        )


# ──────────────────────────────────────────────────────
# VIC FORMAT REWARD CHECKER
# ──────────────────────────────────────────────────────

class FormatRewardChecker:
    """
    Checks VIC Architect response format adherence.
    
    VIC 7-step protocol requires:
    1. Context acknowledgement
    2. Goal decomposition  
    3. Step-by-step reasoning
    4. Self-critique
    5. Revised answer
    6. Confidence score
    7. Action items
    """
    
    REQUIRED_SECTIONS = [
        ("context", ["context", "understanding", "given"]),
        ("goal", ["goal", "objective", "aim", "task"]),
        ("reasoning", ["step", "reasoning", "think", "because"]),
        ("critique", ["however", "caveat", "limitation", "but"]),
        ("answer", ["therefore", "conclusion", "result", "answer"]),
        ("confidence", ["confidence", "certainty", "%", "score"]),
        ("actions", ["action", "next step", "todo", "implement"])
    ]
    
    def score(self, response: str) -> float:
        """Return format compliance score 0.0 → 1.0"""
        response_lower = response.lower()
        found = 0
        
        for _, keywords in self.REQUIRED_SECTIONS:
            if any(kw in response_lower for kw in keywords):
                found += 1
        
        return found / len(self.REQUIRED_SECTIONS)


# ──────────────────────────────────────────────────────
# GRPO REWARD COMPOSER
# ──────────────────────────────────────────────────────

class GRPORewardComposer:
    """
    Composes the final GRPO reward signal for VIC Engine training.
    
    Formula:
        composite = 0.50 * outcome + 0.30 * process + 0.20 * format
    
    Current production calibration: 0.991337
    Target: 0.997
    """
    
    WEIGHTS = {
        "outcome": 0.50,  # Skywork-Reward-V2 (most important)
        "process": 0.30,  # Skywork-O1-PRM (step quality)
        "format":  0.20,  # VIC 7-step protocol compliance
    }
    
    THRESHOLD = 0.95  # Minimum acceptable composite score
    
    def __init__(self):
        self.reward_client = RewardClient()
        self.prm_client = PRMClient()
        self.format_checker = FormatRewardChecker()
    
    async def score(
        self,
        prompt: str,
        response: str,
        reasoning: Optional[str] = None
    ) -> GRPOReward:
        """
        Compute full GRPO reward for a (prompt, response) pair.
        
        Args:
            prompt: The user's input / task description
            response: The agent's response
            reasoning: Optional chain-of-thought (for PRM scoring)
        
        Returns:
            GRPOReward with composite score and diagnostics
        """
        # Run outcome and format scoring in parallel
        outcome_task = self.reward_client.score(prompt, response)
        prm_task = (
            self.prm_client.score_steps(prompt, reasoning)
            if reasoning else asyncio.sleep(0)
        )
        
        outcome_result, prm_result = await asyncio.gather(
            outcome_task, prm_task, return_exceptions=True
        )
        
        # Extract scores (with fallbacks)
        outcome_score = (
            outcome_result.score
            if isinstance(outcome_result, RewardScore) else 0.5
        )
        process_score = (
            prm_result.aggregate
            if isinstance(prm_result, PRMScore) else 0.5
        )
        format_score = self.format_checker.score(response)
        
        # Compute weighted composite
        composite = (
            self.WEIGHTS["outcome"] * outcome_score +
            self.WEIGHTS["process"] * process_score +
            self.WEIGHTS["format"] * format_score
        )
        
        return GRPOReward(
            outcome_reward=outcome_score,
            process_reward=process_score,
            format_reward=format_score,
            composite=composite,
            target_gap=composite - VIC_GRPO_TARGET,
            pass_threshold=composite >= self.THRESHOLD
        )
    
    def log_to_memory(self, reward: GRPOReward, sprint: str = "S012") -> str:
        """Generate memory log entry for MEMORY.md"""
        status = "✓ PASS" if reward.pass_threshold else "✗ FAIL"
        return (
            f"| {sprint} | {reward.composite:.6f} | {reward.outcome_reward:.4f} | "
            f"{reward.process_reward:.4f} | {reward.format_reward:.4f} | {status} |"
        )


# ──────────────────────────────────────────────────────
# OPENMANUSRL GRPO TRAINING CONFIG
# ──────────────────────────────────────────────────────

OPENMANUS_RL_CONFIG = {
    # Base model to fine-tune
    "base_model": "Qwen/Qwen2.5-7B-Instruct",
    
    # Training algorithm
    "algorithm": "grpo",
    
    # GRPO hyperparameters (tuned for VIC agent tasks)
    "grpo": {
        "learning_rate": 1e-6,
        "batch_size": 16,
        "num_epochs": 3,
        "kl_coef": 0.1,          # KL penalty weight
        "clip_range": 0.2,        # PPO-style clip
        "reward_baseline": VIC_CURRENT_CALIBRATION,
    },
    
    # Reward configuration
    "reward": {
        "primary": "skywork-reward-v2",
        "primary_url": REWARD_SERVER_URL,
        "secondary": "skywork-o1-prm",
        "secondary_url": PRM_SERVER_URL,
        "format_checker": "vic-7step-protocol",
        "weights": GRPORewardComposer.WEIGHTS,
    },
    
    # Dataset (OpenManus-RL HuggingFace dataset)
    "dataset": {
        "name": "CharlieDreemur/OpenManus-RL",
        "split": "train",
        "max_samples": 10000,
        "task_filter": ["business_ops", "financial", "research", "coding"]
    },
    
    # Training target
    "target_reward": VIC_GRPO_TARGET,  # 0.997
    "early_stop_reward": 0.995,
    
    # Output
    "output_dir": "/models/vic-agent-tuned",
    "checkpoint_every": 500,
    "eval_every": 100,
}


# ──────────────────────────────────────────────────────
# CLI TEST
# ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    
    async def test():
        composer = GRPORewardComposer()
        
        test_prompt = "Analyse the Q1 revenue data for my SaaS business and identify the top growth opportunity."
        test_response = """
        Context: I understand you need a Q1 revenue analysis for your SaaS business to identify growth opportunities.
        
        Goal: Decompose the Q1 data → identify top growth vector → provide actionable recommendation.
        
        Reasoning:
        Step 1: Examine revenue sources — recurring vs one-time
        Step 2: Compare MoM growth rates across product lines
        Step 3: Identify highest-growth segment with available capacity
        
        However, without specific Q1 data I must work from SaaS industry benchmarks.
        
        Therefore: The top growth opportunity for most SaaS businesses in 2026 is annual plan upselling — 
        typically 25-40% higher LTV vs monthly plans.
        
        Confidence: 78% (pending actual data review)
        
        Next actions:
        1. Share your Q1 revenue CSV → I will run detailed analysis
        2. Schedule pricing review for annual plan conversion
        3. A/B test annual plan landing page
        """
        
        reward = await composer.score(test_prompt, test_response)
        
        print("=== VIC GRPO Reward Evaluation ===")
        print(f"Outcome (Skywork-Reward-V2): {reward.outcome_reward:.4f}")
        print(f"Process (Skywork-O1-PRM):    {reward.process_reward:.4f}")
        print(f"Format  (VIC 7-step):        {reward.format_reward:.4f}")
        print(f"COMPOSITE:                   {reward.composite:.6f}")
        print(f"Target gap:                  {reward.target_gap:+.6f}")
        print(f"Pass threshold (≥0.95):      {reward.pass_threshold}")
        print()
        print("Memory log entry:")
        print(composer.log_to_memory(reward))
        print()
        print("OpenManus-RL training config (excerpt):")
        print(json.dumps(OPENMANUS_RL_CONFIG["grpo"], indent=2))
    
    asyncio.run(test())
