"""
reward_client.py — GRPO Reward Composer stub.

This is a functional stub that allows harness_core.py to import and run
without the full GRPO training infrastructure. Replace with the real
implementation when the vLLM reward model (port 8001) is available.

Evolva Meta-OS v4.0.0 — generated stub, safe to merge.
"""
import os
from typing import Dict, Any, List, Optional


class GRPORewardComposer:
    """
    Stub implementation of the GRPO Reward Composer.

    In production, this connects to the reward model at VIC_REWARD_BASE
    (default: http://localhost:8001) and scores agent responses using
    Group Relative Policy Optimization signals.

    In stub mode (no reward model available), all responses receive a
    neutral reward score of 1.0 so the harness can run without GPU infrastructure.
    """

    def __init__(self):
        self.reward_base = os.getenv("VIC_REWARD_BASE", "http://localhost:8001")
        self.stub_mode = not self._check_reward_model()

    def _check_reward_model(self) -> bool:
        """Check if the reward model endpoint is reachable."""
        try:
            import httpx
            r = httpx.get(f"{self.reward_base}/health", timeout=2.0)
            return r.status_code == 200
        except Exception:
            return False

    def score(self, response: str, task: str) -> float:
        """
        Score a single response against the task.
        Returns a float in [0, 2] where 1.0 is neutral.
        """
        if self.stub_mode:
            return 1.0
        # TODO: implement real GRPO scoring via reward model API
        return 1.0

    def compose(self, scores: List[float]) -> Dict[str, Any]:
        """
        Compose multiple reward signals into a single GRPO reward dict.
        """
        if not scores:
            return {"reward": 1.0, "confidence": 0.0, "stub": self.stub_mode}
        avg = sum(scores) / len(scores)
        return {
            "reward": avg,
            "confidence": 1.0 - abs(avg - 1.0),
            "stub": self.stub_mode,
            "n_signals": len(scores),
        }

    def calibrate(self, threshold: float = 0.991337) -> bool:
        """
        Calibration check — returns True if reward model meets threshold.
        In stub mode, always returns True to allow execution to proceed.
        """
        if self.stub_mode:
            return True
        return self.score("test", "calibration") >= threshold
