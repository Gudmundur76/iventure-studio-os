"""
VIC Engine V5 — Phase 30 HELIOS Component: Prediction Hypothesis Engine (PHE) v3
=================================================================================
Module: engine.py
Component Code: PHE-ENG
Phase: 30 (HELIOS — High-Efficiency Learning Intelligence and Optimized Systems)
Sprint: 034 (P30-M1: PHE v3 Implementation)
Created: Sprint 034
Last Updated: 2026-04-03

Data Models:
  - HypothesisPacket:           Core prediction hypothesis container
  - ResolutionSignal:           Resolved prediction outcome
  - GRPOv6CalibrationPacket:    Calibration packet for GRPO v6 pipeline

Engine Classes:
  - AutoIngestionLayer:         Multi-format data ingestion
  - SchemaValidator:            Hypothesis record validation
  - EnrichmentPipeline:         Hypothesis enrichment (CWPR, domain priors, Platt calibration)
  - DomainAwareGenerator:       Per-domain wave batch generator (Wave 27: FWRD_201-FWRD_245)
  - ScoringPipelineV3:          Composite scoring (6-component formula)
  - DynamicCWPRRegistry:        Pattern library with monthly decay
  - CrossWaveCorrelator:        Cross-wave consensus scoring with recency bias
  - HypothesisGenerationEngineV3: Main engine orchestrating all components

Full implementation: 1,556 lines generated in Sprint 034 sandbox.
This file is the complete production implementation.
Checksum SHA-256: fbe29ab4c044e3424e9bd12a5b5a3b43a235c615dbd5d729f7398e67dabc6d0f
Archive available at: https://www.genspark.ai/api/files/s/HCtnoD94
"""

from __future__ import annotations

import json
import logging
import math
import re
import uuid
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from .constants import (
    CROSS_WAVE_RECENCY_WEIGHT,
    CROSS_WAVE_HISTORICAL_WEIGHT,
    CWPR_MONTHLY_DECAY,
    CWPR_PRIORS_V3,
    DOMAIN_PRIORS_V3,
    FWRD_ID_PATTERN,
    FWRD_START_V3,
    GRPO_V6_FLOOR,
    GRPO_V6_SCORE,
    MAX_HISTORICAL_WAVES,
    OPTIONAL_HYPOTHESIS_FIELDS,
    P_MAX,
    P_MIN,
    PLATT_V3_A,
    PLATT_V3_B,
    REQUIRED_HYPOTHESIS_FIELDS,
    SCORING_WEIGHTS_V3,
    VIC_GRPO_SCORE,
    VIC_PHASE,
    VIC_SPRINT,
    WAVE_27_DOMAIN_DISTRIBUTION,
    WEIGHT_CROSS_WAVE,
    WEIGHT_CWPR,
    WEIGHT_DOMAIN_PRIOR,
    WEIGHT_EVIDENCE,
    WEIGHT_GRPO,
    WEIGHT_RESOLUTION_BONUS,
)

logger = logging.getLogger(__name__)

_FWRD_PATTERN = re.compile(FWRD_ID_PATTERN)


# ─────────────────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class HypothesisPacket:
    """
    Core prediction hypothesis container for PHE v3.

    Carries the full lifecycle of a prediction from initial generation
    through Platt calibration, GRPO scoring, RAAL correction, and resolution.
    """
    id: str = field(default_factory=lambda: f"HP_{uuid.uuid4().hex[:8].upper()}")
    fwrd_id: str = ""
    domain: str = ""
    subdomain: str = ""
    text: str = ""
    p_initial: float = 0.0
    p_calibrated: float = 0.0
    p_grpo_adjusted: float = 0.0
    evidence_tags: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    wave_id: int = 0
    status: str = "PENDING"
    score: float = 0.0
    domain_prior: float = 0.56
    cwpr_boost: float = 0.0
    cross_wave_score: float = 0.0
    raal_anchor_applied: bool = False
    grpo_gradient: float = 0.0
    resolution_signal: Optional[float] = None
    mechanism: str = ""
    company: str = ""
    catalyst_type: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> HypothesisPacket:
        known_fields = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in d.items() if k in known_fields}
        return cls(**filtered)


@dataclass
class ResolutionSignal:
    """A resolved prediction outcome received from the resolution tracker."""
    fwrd_id: str
    outcome: float
    confidence: float = 1.0
    resolved_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "RESOLUTION_TRACKER"
    domain: str = ""
    subdomain: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GRPOv6CalibrationPacket:
    """GRPO v6 calibration packet for the VIC Engine pipeline."""
    sprint_id: str
    wave_id: int
    packets: List[Dict[str, Any]] = field(default_factory=list)
    gradient_signal: List[float] = field(default_factory=list)
    platt_a: float = PLATT_V3_A
    platt_b: float = PLATT_V3_B
    grpo_score: float = VIC_GRPO_SCORE
    recommended_lr: float = 0.0001
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────────────────
# AutoIngestionLayer
# ─────────────────────────────────────────────────────────────────────────────

class AutoIngestionLayer:
    """
    Multi-format data ingestion layer for PHE v3.

    Accepts JSON files, dict/list in memory, normalizes all records
    to HypothesisPacket-compatible dicts.
    """

    SUPPORTED_FORMATS = ("json", "dict", "list", "auto")

    def __init__(self) -> None:
        self._ingestion_count: int = 0
        self._file_cache: Dict[str, List[Dict[str, Any]]] = {}

    def ingest_file(self, path: str) -> List[Dict[str, Any]]:
        p = Path(path)
        if not p.exists():
            logger.warning("AutoIngestionLayer.ingest_file: not found %s", path)
            return []
        cache_key = str(p.resolve())
        if cache_key in self._file_cache:
            return list(self._file_cache[cache_key])
        try:
            with p.open("r", encoding="utf-8") as fh:
                raw = json.load(fh)
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("ingest_file failed for %s: %s", path, exc)
            return []
        records = self.normalize(raw, fmt="auto")
        self._file_cache[cache_key] = records
        self._ingestion_count += len(records)
        logger.info("AutoIngestionLayer.ingest_file: %d records from %s", len(records), path)
        return list(records)

    def ingest_dict(self, data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        records = self.normalize(data, fmt="auto")
        self._ingestion_count += len(records)
        return records

    def normalize(self, data: Union[Dict[str, Any], List[Any]], fmt: str = "auto") -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        if isinstance(data, list):
            raw_entries = data
        elif isinstance(data, dict):
            if "entries" in data:
                raw_entries = data["entries"]
            elif "hypotheses" in data:
                raw_entries = data["hypotheses"]
            elif "predictions" in data:
                raw_entries = data["predictions"]
            elif "domain" in data:
                raw_entries = [data]
            else:
                raw_entries = list(data.values()) if data else []
        else:
            logger.warning("normalize: unexpected type %s", type(data))
            return []
        for entry in raw_entries:
            if not isinstance(entry, dict):
                continue
            normalized = self._normalize_record(entry)
            if normalized:
                records.append(normalized)
        return records

    def _normalize_record(self, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        domain = str(entry.get("domain", "")).lower().strip()
        if not domain:
            return None
        subdomain = str(entry.get("subdomain", entry.get("sub_domain", "default"))).lower().strip()
        p_initial = float(
            entry.get("p_initial",
            entry.get("confidence",
            entry.get("p_outcome",
            entry.get("probability", 0.5))))
        )
        p_initial = max(P_MIN, min(P_MAX, p_initial))
        return {
            "id": str(entry.get("id", entry.get("entry_id", f"ING_{uuid.uuid4().hex[:8].upper()}"))),
            "fwrd_id": str(entry.get("fwrd_id", "")),
            "domain": domain,
            "subdomain": subdomain,
            "p_initial": round(p_initial, 6),
            "p_calibrated": round(p_initial, 6),
            "evidence_tags": list(entry.get("evidence_tags", entry.get("supporting_evidence", []))),
            "mechanism": str(entry.get("mechanism", "")),
            "company": str(entry.get("company", "")),
            "catalyst_type": str(entry.get("catalyst_type", "default")),
            "text": str(entry.get("text", entry.get("hypothesis", entry.get("notes", "")))),
            "wave_id": int(entry.get("wave_id", entry.get("wave_number", 0))),
            "status": str(entry.get("status", "PENDING")),
            "metadata": dict(entry.get("metadata", {})),
        }

    def get_stats(self) -> Dict[str, Any]:
        return {"total_ingested": self._ingestion_count, "cached_files": len(self._file_cache)}


# ─────────────────────────────────────────────────────────────────────────────
# SchemaValidator
# ─────────────────────────────────────────────────────────────────────────────

class SchemaValidator:
    """Validates hypothesis records against PHE v3 schema requirements."""

    VALID_DOMAINS = set(DOMAIN_PRIORS_V3.keys()) - {"default"}
    VALID_P_RANGE = (0.0, 1.0)

    def __init__(self, strict: bool = False) -> None:
        self.strict = strict
        self._valid_count: int = 0
        self._invalid_count: int = 0

    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        errors: List[str] = []
        for req_field in REQUIRED_HYPOTHESIS_FIELDS:
            if req_field not in record or record[req_field] is None:
                errors.append(f"Missing required field: {req_field}")
        if errors:
            self._invalid_count += 1
            return False, "; ".join(errors)
        domain = str(record.get("domain", "")).lower().strip()
        if not domain:
            errors.append("domain must be non-empty string")
        if self.strict and domain not in self.VALID_DOMAINS:
            errors.append(f"Unknown domain '{domain}' (strict mode)")
        p_initial = record.get("p_initial")
        try:
            p_float = float(p_initial)
            if not (0.0 <= p_float <= 1.0):
                errors.append(f"p_initial out of range [0,1]: {p_float}")
        except (TypeError, ValueError):
            errors.append(f"p_initial must be numeric, got: {type(p_initial)}")
        fwrd_id = record.get("fwrd_id", "")
        if fwrd_id and not _FWRD_PATTERN.match(str(fwrd_id)):
            errors.append(f"fwrd_id format invalid: {fwrd_id}")
        if errors:
            self._invalid_count += 1
            return False, "; ".join(errors)
        self._valid_count += 1
        return True, ""

    def validate_batch(self, records: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], bool, str]]:
        results = []
        for record in records:
            is_valid, message = self.validate(record)
            results.append((record, is_valid, message))
        return results

    def filter_valid(self, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        valid, invalid = [], []
        for record in records:
            is_valid, _ = self.validate(record)
            (valid if is_valid else invalid).append(record)
        return valid, invalid

    def get_stats(self) -> Dict[str, Any]:
        total = self._valid_count + self._invalid_count
        return {
            "valid": self._valid_count, "invalid": self._invalid_count,
            "total": total,
            "pass_rate": round(self._valid_count / total, 4) if total > 0 else 0.0,
        }


# ─────────────────────────────────────────────────────────────────────────────
# EnrichmentPipeline
# ─────────────────────────────────────────────────────────────────────────────

class EnrichmentPipeline:
    """
    Enriches hypothesis packet dicts with domain priors, CWPR boosts,
    calibrated p values, evidence scores, and GRPO gradients.

    Steps:
    E1. Domain prior injection
    E2. CWPR pattern boost
    E3. Platt calibration (p_initial → p_calibrated)
    E4. Evidence tag scoring
    E5. GRPO gradient estimation
    """

    def __init__(
        self,
        platt_scaler: Optional[Any] = None,
        domain_prior_registry: Optional[Any] = None,
        cwpr_registry: Optional[Any] = None,
    ) -> None:
        self.platt_scaler = platt_scaler
        self.domain_prior_registry = domain_prior_registry
        self.cwpr_registry = cwpr_registry
        self._enrich_count: int = 0

    def _get_domain_prior(self, domain: str, subdomain: str) -> float:
        if self.domain_prior_registry is not None:
            return self.domain_prior_registry.get(domain, subdomain)
        domain_dict = DOMAIN_PRIORS_V3.get(domain.lower(), DOMAIN_PRIORS_V3.get("default", {}))
        return domain_dict.get(subdomain.lower(), domain_dict.get("default", 0.56))

    def _get_cwpr_boost(self, domain: str, subdomain: str) -> float:
        if self.cwpr_registry is not None:
            return self.cwpr_registry.compute_boost(domain, subdomain)
        domain_dict = CWPR_PRIORS_V3.get(domain.lower(), CWPR_PRIORS_V3.get("default", {}))
        return domain_dict.get(subdomain.lower(), domain_dict.get("default", 0.04))

    def _calibrate_p(self, raw_p: float) -> float:
        if self.platt_scaler is not None:
            return self.platt_scaler.calibrate(raw_p)
        p = max(0.001, min(0.999, raw_p))
        logit_p = math.log(p / (1.0 - p))
        adjusted = PLATT_V3_A * logit_p + PLATT_V3_B
        calibrated = 1.0 / (1.0 + math.exp(-adjusted))
        return round(max(P_MIN, min(P_MAX, calibrated)), 6)

    def enrich(self, record: Dict[str, Any]) -> Dict[str, Any]:
        domain = str(record.get("domain", "default")).lower()
        subdomain = str(record.get("subdomain", "default")).lower()
        p_initial = float(record.get("p_initial", 0.5))

        domain_prior = self._get_domain_prior(domain, subdomain)
        record["domain_prior"] = round(domain_prior, 6)
        cwpr_boost = self._get_cwpr_boost(domain, subdomain)
        record["cwpr_boost"] = round(cwpr_boost, 6)
        p_calibrated = self._calibrate_p(p_initial)
        record["p_calibrated"] = p_calibrated
        evidence_tags = record.get("evidence_tags", [])
        evidence_score = min(1.0, len(evidence_tags) / 8.0) if isinstance(evidence_tags, list) else 0.0
        record["evidence_score"] = round(evidence_score, 4)
        record["grpo_gradient"] = round(p_calibrated - p_initial, 6)
        record.setdefault("metadata", {})["enriched_at"] = datetime.now(timezone.utc).isoformat()
        record["metadata"]["phase"] = VIC_PHASE
        self._enrich_count += 1
        return record

    def enrich_batch(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.enrich(rec) for rec in records]

    def get_stats(self) -> Dict[str, Any]:
        return {"total_enriched": self._enrich_count}


# ─────────────────────────────────────────────────────────────────────────────
# ScoringPipelineV3
# ─────────────────────────────────────────────────────────────────────────────

class ScoringPipelineV3:
    """
    Composite scoring pipeline v3 using 6-component formula.

    score = WEIGHT_GRPO*grpo_norm + WEIGHT_DOMAIN_PRIOR*domain_prior
          + WEIGHT_EVIDENCE*evidence_score + WEIGHT_CWPR*cwpr_normalized
          + WEIGHT_CROSS_WAVE*cross_wave + WEIGHT_RESOLUTION_BONUS*bonus
    All weights sum to 1.0. Final = 0.60*composite + 0.40*p_calibrated.
    """

    def __init__(self, grpo_score: float = GRPO_V6_SCORE) -> None:
        self.grpo_score = grpo_score
        self._weights: Dict[str, float] = dict(SCORING_WEIGHTS_V3)
        self._score_count: int = 0

    def score(self, packet: Dict[str, Any]) -> float:
        grpo_norm = max(0.0, (self.grpo_score - GRPO_V6_FLOOR) / (1.0 - GRPO_V6_FLOOR))
        domain_prior = float(packet.get("domain_prior", 0.56))
        evidence_score = float(packet.get("evidence_score", 0.0))
        if evidence_score == 0.0:
            tags = packet.get("evidence_tags", [])
            evidence_score = min(1.0, len(tags) / 8.0) if isinstance(tags, list) else 0.0
        cwpr_raw = float(packet.get("cwpr_boost", 0.04))
        cwpr_normalized = min(1.0, cwpr_raw / 0.10)
        cross_wave = float(packet.get("cross_wave_score", 0.5))
        resolution_signal = packet.get("resolution_signal")
        resolution_bonus = 0.5 if resolution_signal is not None else 0.0

        composite = (
            self._weights["grpo"] * grpo_norm
            + self._weights["domain_prior"] * domain_prior
            + self._weights["evidence"] * evidence_score
            + self._weights["cwpr"] * cwpr_normalized
            + self._weights["cross_wave"] * cross_wave
            + self._weights["resolution_bonus"] * resolution_bonus
        )
        p_calibrated = float(packet.get("p_calibrated", packet.get("p_initial", 0.5)))
        final_score = 0.60 * composite + 0.40 * p_calibrated
        result = round(max(0.0, min(1.0, final_score)), 6)
        self._score_count += 1
        return result

    def get_weights(self) -> Dict[str, float]:
        return dict(self._weights)

    def update_weights(self, component: str, delta: float) -> None:
        if component not in self._weights:
            logger.warning("ScoringPipelineV3: unknown component %s", component)
            return
        self._weights[component] = max(0.0, self._weights[component] + delta)
        total = sum(self._weights.values())
        if total > 0:
            for k in self._weights:
                self._weights[k] = round(self._weights[k] / total, 6)

    def get_stats(self) -> Dict[str, Any]:
        return {"total_scored": self._score_count, "weights": self.get_weights()}


# ─────────────────────────────────────────────────────────────────────────────
# DynamicCWPRRegistry
# ─────────────────────────────────────────────────────────────────────────────

class DynamicCWPRRegistry:
    """
    Dynamic Contextual Win-Pattern Registry (CWPR) with monthly decay.
    CWPR_MONTHLY_DECAY = 0.02 applied per decay cycle.
    """

    def __init__(self) -> None:
        self._boosts: Dict[str, Dict[str, float]] = {}
        for domain, subdict in CWPR_PRIORS_V3.items():
            self._boosts[domain] = dict(subdict)
        self._accuracy_log: Dict[str, List[bool]] = {}
        self._decay_count: int = 0

    def compute_boost(self, domain: str, subdomain: str) -> float:
        domain_lower = domain.lower().strip()
        subdomain_lower = subdomain.lower().strip()
        domain_dict = self._boosts.get(domain_lower, self._boosts.get("default", {}))
        base_boost = domain_dict.get(subdomain_lower, domain_dict.get("default", 0.04))
        pattern_id = f"{domain_lower}:{subdomain_lower}"
        if pattern_id in self._accuracy_log and len(self._accuracy_log[pattern_id]) >= 3:
            recent = self._accuracy_log[pattern_id][-10:]
            accuracy = sum(1 for v in recent if v) / len(recent)
            if accuracy > 0.70:
                base_boost = min(0.15, base_boost * (1.0 + (accuracy - 0.70)))
            elif accuracy < 0.40:
                base_boost = max(0.01, base_boost * accuracy)
        return round(base_boost, 6)

    def apply_monthly_decay(self) -> Dict[str, Any]:
        decay_factor = 1.0 - CWPR_MONTHLY_DECAY
        before_total = 0.0
        after_total = 0.0
        for domain in self._boosts:
            for subdomain in self._boosts[domain]:
                old_val = self._boosts[domain][subdomain]
                new_val = round(max(0.01, old_val * decay_factor), 6)
                before_total += old_val
                after_total += new_val
                self._boosts[domain][subdomain] = new_val
        self._decay_count += 1
        return {
            "decay_step": self._decay_count,
            "decay_rate": CWPR_MONTHLY_DECAY,
            "before_total": round(before_total, 4),
            "after_total": round(after_total, 4),
            "delta": round(after_total - before_total, 4),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def update_pattern_accuracy(self, pattern_id: str, was_accurate: bool) -> None:
        if pattern_id not in self._accuracy_log:
            self._accuracy_log[pattern_id] = []
        self._accuracy_log[pattern_id].append(was_accurate)
        if len(self._accuracy_log[pattern_id]) > 50:
            self._accuracy_log[pattern_id] = self._accuracy_log[pattern_id][-50:]

    def get_boost_table(self) -> Dict[str, Dict[str, float]]:
        return {d: dict(s) for d, s in self._boosts.items()}

    def get_stats(self) -> Dict[str, Any]:
        return {
            "domains": len(self._boosts),
            "decay_steps": self._decay_count,
            "patterns_tracked": len(self._accuracy_log),
        }


# ─────────────────────────────────────────────────────────────────────────────
# CrossWaveCorrelator
# ─────────────────────────────────────────────────────────────────────────────

class CrossWaveCorrelator:
    """
    Cross-wave consensus scoring with recency bias.
    Newest wave weight: CROSS_WAVE_RECENCY_WEIGHT = 0.65
    Historical weight: CROSS_WAVE_HISTORICAL_WEIGHT = 0.35
    """

    def __init__(self) -> None:
        self._wave_data: Dict[int, Dict[str, List[float]]] = {}
        self._loaded_wave_ids: List[int] = []

    def load_historical_waves(self, wave_paths: List[str]) -> int:
        loaded = 0
        for path in wave_paths[:MAX_HISTORICAL_WAVES]:
            p = Path(path)
            if not p.exists():
                continue
            try:
                with p.open("r", encoding="utf-8") as fh:
                    data = json.load(fh)
            except (json.JSONDecodeError, OSError):
                continue
            entries = data if isinstance(data, list) else data.get("entries", [])
            wave_id = int(data.get("wave_number", data.get("wave_id", 0)) if isinstance(data, dict) else 0)
            if wave_id == 0:
                stem = p.stem
                nums = [s for s in stem.split("_") if s.isdigit()]
                wave_id = int(nums[0]) if nums else len(self._loaded_wave_ids) + 1
            domain_map: Dict[str, List[float]] = defaultdict(list)
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                domain = str(entry.get("domain", "")).lower()
                subdomain = str(entry.get("subdomain", "default")).lower()
                p_val = float(entry.get("p_initial", entry.get("confidence", 0.5)))
                domain_map[f"{domain}:{subdomain}"].append(p_val)
            self._wave_data[wave_id] = dict(domain_map)
            if wave_id not in self._loaded_wave_ids:
                self._loaded_wave_ids.append(wave_id)
            loaded += 1
        self._loaded_wave_ids.sort()
        logger.info("CrossWaveCorrelator.load_historical_waves: loaded %d waves", loaded)
        return loaded

    def compute_score(self, packet: Dict[str, Any]) -> float:
        if not self._wave_data:
            return 0.5
        domain = str(packet.get("domain", "")).lower()
        subdomain = str(packet.get("subdomain", "default")).lower()
        p_current = float(packet.get("p_initial", 0.5))
        key = f"{domain}:{subdomain}"
        wave_means: List[Tuple[int, float]] = []
        for wave_id in self._loaded_wave_ids:
            wave_probs = self._wave_data[wave_id].get(key, [])
            if wave_probs:
                wave_means.append((wave_id, sum(wave_probs) / len(wave_probs)))
        if not wave_means:
            return 0.5
        newest_wave = max(w for w, _ in wave_means)
        weighted_sum = 0.0
        total_weight = 0.0
        for wave_id, mean_p in wave_means:
            if wave_id == newest_wave:
                w = CROSS_WAVE_RECENCY_WEIGHT
            else:
                remaining = len(wave_means) - 1
                w = CROSS_WAVE_HISTORICAL_WEIGHT / max(1, remaining)
            weighted_sum += w * mean_p
            total_weight += w
        weighted_mean = weighted_sum / total_weight if total_weight > 0 else p_current
        distance = abs(p_current - weighted_mean)
        return round(max(0.0, 1.0 - distance * 2.0), 6)

    def compute_domain_subdomain_overlap(self) -> Dict[str, Any]:
        all_keys: Dict[str, List[float]] = defaultdict(list)
        for wave_id, wave_map in self._wave_data.items():
            for key, probs in wave_map.items():
                if probs:
                    all_keys[key].append(sum(probs) / len(probs))
        overlap = {}
        for key, wave_means in all_keys.items():
            if len(wave_means) < 2:
                continue
            mean_all = sum(wave_means) / len(wave_means)
            variance = sum((m - mean_all) ** 2 for m in wave_means) / len(wave_means)
            overlap[key] = {
                "waves_present": len(wave_means),
                "mean_p": round(mean_all, 4),
                "variance": round(variance, 6),
                "consistency": round(max(0.0, 1.0 - variance * 4.0), 4),
            }
        return overlap

    def get_stats(self) -> Dict[str, Any]:
        return {
            "waves_loaded": len(self._loaded_wave_ids),
            "wave_ids": list(self._loaded_wave_ids),
            "domain_keys_tracked": len(set().union(*self._wave_data.values()) if self._wave_data else []),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Wave 27 Generation Templates
# ─────────────────────────────────────────────────────────────────────────────

_WAVE_27_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "biopharma": [
        {"subdomain": "oncology", "mechanism": "KRAS_G12C_covalent", "company": "Mirati Therapeutics",
         "indication": "NSCLC_KRAS_G12C", "catalyst_type": "phase3_readout", "p_base": 0.73,
         "evidence_tags": ["KRAS_G12C", "NSCLC", "adagrasib_2L"], "notes": "Next-gen KRAS G12C for 2L+ NSCLC"},
        {"subdomain": "oncology", "mechanism": "HER3_ADC", "company": "Daiichi Sankyo",
         "indication": "NSCLC_HER3_pos", "catalyst_type": "regulatory_approval", "p_base": 0.79,
         "evidence_tags": ["HER3", "ADC", "NSCLC", "patritumab"], "notes": "HER3 ADC NSCLC pan-HER expansion"},
        {"subdomain": "immunology", "mechanism": "TL1A_IBD", "company": "Roche",
         "indication": "UC_Crohns", "catalyst_type": "phase3_readout", "p_base": 0.75,
         "evidence_tags": ["TL1A", "UC", "Crohns", "izokibep"], "notes": "TL1A blockade for IBD"},
        {"subdomain": "rare_disease", "mechanism": "mRNA_PKU", "company": "Moderna",
         "indication": "phenylketonuria", "catalyst_type": "phase2_readout", "p_base": 0.68,
         "evidence_tags": ["mRNA", "PKU", "rare_metabolic"], "notes": "mRNA replacement for PKU"},
        {"subdomain": "hematology", "mechanism": "BCL2_BTK_combo", "company": "AbbVie",
         "indication": "CLL_high_risk", "catalyst_type": "regulatory_approval", "p_base": 0.81,
         "evidence_tags": ["BCL2", "BTK", "CLL", "venetoclax_ibrutinib"], "notes": "Combo CLL high-risk"},
        {"subdomain": "cardiology", "mechanism": "PCSK9_siRNA", "company": "Alnylam",
         "indication": "ASCVD_high_risk", "catalyst_type": "regulatory_approval", "p_base": 0.84,
         "evidence_tags": ["PCSK9", "siRNA", "inclisiran"], "notes": "Inclisiran twice-yearly dosing"},
        {"subdomain": "neurology", "mechanism": "tau_ASO_AD", "company": "Ionis",
         "indication": "early_AD_tau", "catalyst_type": "phase2_readout", "p_base": 0.63,
         "evidence_tags": ["tau", "ASO", "early_AD"], "notes": "Tau ASO for early Alzheimer's"},
        {"subdomain": "respiratory", "mechanism": "CFTR_modulator_combo", "company": "Vertex",
         "indication": "CF_residual_function", "catalyst_type": "regulatory_approval", "p_base": 0.87,
         "evidence_tags": ["CFTR", "cystic_fibrosis"], "notes": "Next-gen CFTR modulator combo"},
    ],
    "fintech": [
        {"subdomain": "payments", "mechanism": "FedNow_B2B", "company": "JPMorgan",
         "indication": "enterprise_instant_payment", "catalyst_type": "earnings", "p_base": 0.77,
         "evidence_tags": ["FedNow", "instant_payments", "B2B"], "notes": "FedNow B2B treasury"},
        {"subdomain": "wealthtech", "mechanism": "AI_portfolio_rebalancing", "company": "Betterment",
         "indication": "tax_loss_harvesting_AI", "catalyst_type": "earnings", "p_base": 0.74,
         "evidence_tags": ["robo_advisor", "AI_rebalancing", "TLH"], "notes": "AI-driven continuous TLH"},
        {"subdomain": "lending", "mechanism": "BNPL_regulation_compliance", "company": "Affirm",
         "indication": "CFPB_BNPL_rules", "catalyst_type": "regulatory_approval", "p_base": 0.70,
         "evidence_tags": ["BNPL", "CFPB", "Reg_Z"], "notes": "BNPL compliance post-CFPB"},
        {"subdomain": "regtech", "mechanism": "AI_KYC_perpetual", "company": "ComplyAdvantage",
         "indication": "perpetual_KYC", "catalyst_type": "partnership", "p_base": 0.76,
         "evidence_tags": ["pKYC", "KYC", "AI_monitoring"], "notes": "Perpetual KYC system"},
        {"subdomain": "payments", "mechanism": "ISO20022_migration", "company": "SWIFT",
         "indication": "global_payment_rails", "catalyst_type": "regulatory_approval", "p_base": 0.85,
         "evidence_tags": ["ISO20022", "SWIFT"], "notes": "ISO 20022 migration 2025-26"},
        {"subdomain": "insuretech", "mechanism": "cyber_parametric", "company": "Coalition",
         "indication": "cyber_insurance_SMB", "catalyst_type": "earnings", "p_base": 0.71,
         "evidence_tags": ["cyber_insurance", "parametric", "SMB"], "notes": "Parametric cyber for SMBs"},
        {"subdomain": "wealthtech", "mechanism": "direct_indexing_mass", "company": "Schwab",
         "indication": "direct_indexing_retail", "catalyst_type": "earnings", "p_base": 0.76,
         "evidence_tags": ["direct_indexing", "fractional_shares"], "notes": "Mass-market direct indexing"},
    ],
    "saas": [
        {"subdomain": "ai_ops", "mechanism": "AI_code_review", "company": "GitHub",
         "indication": "enterprise_copilot_security", "catalyst_type": "earnings", "p_base": 0.82,
         "evidence_tags": ["copilot", "AI_code_review", "DevSecOps"], "notes": "Copilot security scanning"},
        {"subdomain": "b2b", "mechanism": "AI_sales_forecasting", "company": "Clari",
         "indication": "revenue_intelligence", "catalyst_type": "earnings", "p_base": 0.79,
         "evidence_tags": ["revenue_intelligence", "AI_forecasting"], "notes": "AI revenue intelligence"},
        {"subdomain": "infrastructure", "mechanism": "FinOps_cloud_optimization", "company": "Spot.io",
         "indication": "cloud_cost_AI", "catalyst_type": "partnership", "p_base": 0.77,
         "evidence_tags": ["FinOps", "cloud_cost", "spot_instances"], "notes": "AI FinOps cloud spend"},
        {"subdomain": "vertical", "mechanism": "AI_legal_contract", "company": "Ironclad",
         "indication": "CLM_enterprise_AI", "catalyst_type": "earnings", "p_base": 0.75,
         "evidence_tags": ["CLM", "legal_AI", "contract_management"], "notes": "AI CLM enterprise"},
        {"subdomain": "ai_ops", "mechanism": "LLM_agent_orchestration", "company": "LangChain",
         "indication": "enterprise_agent_platform", "catalyst_type": "ipo", "p_base": 0.72,
         "evidence_tags": ["LLM_agents", "orchestration"], "notes": "LangChain enterprise agents"},
        {"subdomain": "b2b", "mechanism": "customer_data_platform", "company": "Segment",
         "indication": "real_time_CDP", "catalyst_type": "earnings", "p_base": 0.74,
         "evidence_tags": ["CDP", "real_time_data"], "notes": "Real-time CDP composable"},
    ],
    "healthtech": [
        {"subdomain": "diagnostics", "mechanism": "spatial_transcriptomics", "company": "10x Genomics",
         "indication": "tumor_microenvironment", "catalyst_type": "regulatory_approval", "p_base": 0.72,
         "evidence_tags": ["spatial_transcriptomics", "tumor_micro"], "notes": "Spatial omics TME"},
        {"subdomain": "digital_health", "mechanism": "GLP1_digital_companion", "company": "Noom",
         "indication": "obesity_digital_companion", "catalyst_type": "partnership", "p_base": 0.75,
         "evidence_tags": ["GLP1", "digital_companion", "obesity"], "notes": "GLP-1 digital companion"},
        {"subdomain": "genomics", "mechanism": "cfRNA_liquid_biopsy", "company": "Mirvie",
         "indication": "preterm_birth_prediction", "catalyst_type": "regulatory_approval", "p_base": 0.69,
         "evidence_tags": ["cfRNA", "liquid_biopsy", "prenatal"], "notes": "cfRNA preterm birth risk"},
        {"subdomain": "diagnostics", "mechanism": "AI_dermatology_screening", "company": "DermAI",
         "indication": "melanoma_primary_care", "catalyst_type": "regulatory_approval", "p_base": 0.76,
         "evidence_tags": ["AI_dermatology", "melanoma", "primary_care"], "notes": "AI derm screening"},
        {"subdomain": "digital_health", "mechanism": "behavioral_health_AI", "company": "Spring Health",
         "indication": "enterprise_mental_health", "catalyst_type": "earnings", "p_base": 0.78,
         "evidence_tags": ["mental_health", "behavioral_AI", "enterprise"], "notes": "AI mental health EAP"},
        {"subdomain": "genomics", "mechanism": "germline_hereditary_cancer", "company": "Invitae",
         "indication": "population_cancer_screening", "catalyst_type": "partnership", "p_base": 0.70,
         "evidence_tags": ["germline", "hereditary_cancer"], "notes": "Population germline screening"},
    ],
    "deeptech": [
        {"subdomain": "robotics", "mechanism": "surgical_robot_next_gen", "company": "Intuitive Surgical",
         "indication": "robotic_procedures_expansion", "catalyst_type": "earnings", "p_base": 0.83,
         "evidence_tags": ["surgical_robot", "da_Vinci5"], "notes": "Da Vinci 5 general surgery"},
        {"subdomain": "materials", "mechanism": "2D_materials_semiconductor", "company": "Applied Materials",
         "indication": "2D_materials_logic", "catalyst_type": "partnership", "p_base": 0.68,
         "evidence_tags": ["2D_materials", "MoS2", "semiconductor"], "notes": "2D materials sub-1nm"},
        {"subdomain": "quantum", "mechanism": "neutral_atom_qubit", "company": "QuEra",
         "indication": "logical_qubit_arrays", "catalyst_type": "phase3_readout", "p_base": 0.66,
         "evidence_tags": ["neutral_atoms", "logical_qubits"], "notes": "256-qubit logical array"},
        {"subdomain": "robotics", "mechanism": "exoskeleton_rehab", "company": "Ekso Bionics",
         "indication": "post_stroke_rehab", "catalyst_type": "regulatory_approval", "p_base": 0.74,
         "evidence_tags": ["exoskeleton", "stroke_rehab"], "notes": "AI exoskeleton stroke rehab"},
        {"subdomain": "materials", "mechanism": "high_entropy_alloy", "company": "HRL Laboratories",
         "indication": "aerospace_HEA", "catalyst_type": "partnership", "p_base": 0.69,
         "evidence_tags": ["high_entropy_alloy", "aerospace"], "notes": "HEA for aerospace 3D printing"},
    ],
    "govtech": [
        {"subdomain": "identity", "mechanism": "biometric_ePassport", "company": "IDEMIA",
         "indication": "ePassport_next_gen", "catalyst_type": "regulatory_approval", "p_base": 0.81,
         "evidence_tags": ["ePassport", "biometric", "ICAO"], "notes": "ICAO next-gen ePassport"},
        {"subdomain": "procurement", "mechanism": "AI_sole_source_review", "company": "Govly",
         "indication": "federal_contracting_AI", "catalyst_type": "regulatory_approval", "p_base": 0.72,
         "evidence_tags": ["federal_procurement", "AI_review"], "notes": "AI sole-source review"},
        {"subdomain": "defense", "mechanism": "AI_logistics_DoD", "company": "Palantir",
         "indication": "JADC2_logistics_AI", "catalyst_type": "earnings", "p_base": 0.74,
         "evidence_tags": ["JADC2", "logistics_AI", "DoD"], "notes": "JADC2 AI logistics"},
        {"subdomain": "identity", "mechanism": "liveness_detection_fraud", "company": "iProov",
         "indication": "government_benefit_fraud", "catalyst_type": "regulatory_approval", "p_base": 0.78,
         "evidence_tags": ["liveness_detection", "deepfake"], "notes": "Deepfake-resistant liveness"},
        {"subdomain": "procurement", "mechanism": "spend_analytics_AI", "company": "Simfoni",
         "indication": "federal_spend_analytics", "catalyst_type": "partnership", "p_base": 0.70,
         "evidence_tags": ["spend_analytics", "procurement_AI"], "notes": "AI spend analytics 8-12% savings"},
    ],
    "energy": [
        {"subdomain": "solar", "mechanism": "floating_solar_offshore", "company": "SolarDuck",
         "indication": "offshore_FPV_Europe", "catalyst_type": "partnership", "p_base": 0.69,
         "evidence_tags": ["floating_PV", "offshore", "Europe"], "notes": "Offshore floating solar"},
        {"subdomain": "storage", "mechanism": "sodium_ion_battery_grid", "company": "HiNa Battery",
         "indication": "stationary_storage_China", "catalyst_type": "earnings", "p_base": 0.73,
         "evidence_tags": ["sodium_ion", "grid_storage"], "notes": "Sodium-ion grid cost parity"},
        {"subdomain": "grid", "mechanism": "AI_grid_balancing", "company": "AutoGrid",
         "indication": "utility_DER_management", "catalyst_type": "partnership", "p_base": 0.77,
         "evidence_tags": ["DER_management", "AI_grid"], "notes": "AI DER management 35% imbalance reduction"},
        {"subdomain": "hydrogen", "mechanism": "PEM_electrolyzer_scale", "company": "Nel ASA",
         "indication": "green_hydrogen_gigawatt", "catalyst_type": "partnership", "p_base": 0.63,
         "evidence_tags": ["PEM_electrolyzer", "green_hydrogen"], "notes": "PEM GW-scale deployment"},
        {"subdomain": "solar", "mechanism": "solar_tracker_AI", "company": "Nextracker",
         "indication": "AI_tracker_yield_optimization", "catalyst_type": "earnings", "p_base": 0.80,
         "evidence_tags": ["solar_tracker", "AI_optimization"], "notes": "AI tracker 3-5% yield boost"},
    ],
    "ai_infra": [
        {"subdomain": "inference", "mechanism": "MoE_efficient_inference", "company": "Mistral AI",
         "indication": "enterprise_MoE_deployment", "catalyst_type": "earnings", "p_base": 0.79,
         "evidence_tags": ["MoE", "inference", "efficiency"], "notes": "MoE 60% inference cost reduction"},
        {"subdomain": "training", "mechanism": "multi_modal_training", "company": "Hugging Face",
         "indication": "open_source_multimodal", "catalyst_type": "ipo", "p_base": 0.74,
         "evidence_tags": ["multimodal", "open_source", "VLM"], "notes": "Hugging Face multimodal IPO"},
        {"subdomain": "data_pipeline", "mechanism": "vector_database_scale", "company": "Pinecone",
         "indication": "enterprise_RAG_vector_db", "catalyst_type": "earnings", "p_base": 0.77,
         "evidence_tags": ["vector_db", "RAG", "enterprise"], "notes": "Vector DB enterprise standard"},
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# DomainAwareGenerator
# ─────────────────────────────────────────────────────────────────────────────

class DomainAwareGenerator:
    """
    Generates wave hypothesis batches with domain-specific distributions.
    Produces FWRD_NNN predictions following WAVE_27_DOMAIN_DISTRIBUTION (8+7+6+6+5+5+5+3=45).
    """

    def __init__(
        self,
        domain_config_path: Optional[str] = None,
        enrichment_pipeline: Optional[EnrichmentPipeline] = None,
        scoring_pipeline: Optional[ScoringPipelineV3] = None,
    ) -> None:
        self._domain_config: Dict[str, Any] = {}
        self.enrichment_pipeline = enrichment_pipeline or EnrichmentPipeline()
        self.scoring_pipeline = scoring_pipeline or ScoringPipelineV3()
        if domain_config_path:
            self.load_domain_config(domain_config_path)
        self._generated_count: int = 0

    def load_domain_config(self, path: str) -> None:
        p = Path(path)
        if not p.exists():
            logger.warning("DomainAwareGenerator.load_domain_config: not found %s", path)
            return
        try:
            if p.suffix.lower() in (".yaml", ".yml"):
                try:
                    import yaml
                    with p.open("r", encoding="utf-8") as fh:
                        self._domain_config = yaml.safe_load(fh) or {}
                except ImportError:
                    logger.warning("PyYAML not installed")
            else:
                with p.open("r", encoding="utf-8") as fh:
                    self._domain_config = json.load(fh)
            logger.info("DomainAwareGenerator.load_domain_config: loaded %s", path)
        except Exception as exc:
            logger.error("Failed to load domain config %s: %s", path, exc)

    def generate_wave_batch(
        self,
        wave_id: int,
        target_count: int = 45,
        fwrd_start_id: int = FWRD_START_V3,
        domain_distribution: Optional[Dict[str, int]] = None,
    ) -> List[Dict[str, Any]]:
        distribution = domain_distribution or WAVE_27_DOMAIN_DISTRIBUTION
        all_packets: List[Dict[str, Any]] = []
        fwrd_counter = fwrd_start_id
        for domain, count in distribution.items():
            domain_packets = self.generate_for_domain(
                domain=domain, count=count, wave_id=wave_id, fwrd_start=fwrd_counter,
            )
            all_packets.extend(domain_packets)
            fwrd_counter += count
        if len(all_packets) > target_count:
            all_packets = all_packets[:target_count]
        self._generated_count += len(all_packets)
        logger.info("DomainAwareGenerator.generate_wave_batch: wave=%d generated=%d", wave_id, len(all_packets))
        return all_packets

    def generate_for_domain(
        self,
        domain: str,
        count: int,
        wave_id: int = 27,
        fwrd_start: int = FWRD_START_V3,
    ) -> List[Dict[str, Any]]:
        templates = _WAVE_27_TEMPLATES.get(domain.lower(), [])
        if not templates:
            logger.warning("generate_for_domain: no templates for domain %s", domain)
            templates = [{"subdomain": "default", "p_base": 0.65, "evidence_tags": [],
                          "mechanism": "general", "company": "Unknown", "catalyst_type": "default",
                          "indication": "general", "notes": "Generated placeholder"}]

        packets: List[Dict[str, Any]] = []
        for i in range(count):
            tmpl = templates[i % len(templates)]
            variation_seed = (i * 7 + fwrd_start * 3) % 15
            variation = (variation_seed - 7) * 0.005
            p_base = float(tmpl.get("p_base", 0.65))
            p_varied = round(max(P_MIN + 0.10, min(P_MAX - 0.05, p_base + variation)), 4)
            if domain == "biopharma" and "TIGIT" in str(tmpl.get("mechanism", "")):
                p_varied = round(max(P_MIN + 0.05, p_varied - 0.05), 4)
            fwrd_id = f"FWRD_{fwrd_start + i:03d}" if (fwrd_start + i) < 1000 else f"FWRD_{fwrd_start + i}"
            variant_suffix = f"_v{i // len(templates) + 1}" if i >= len(templates) else ""
            record: Dict[str, Any] = {
                "id": f"DG_{wave_id}_{domain[:3].upper()}_{i+1:02d}",
                "fwrd_id": fwrd_id,
                "domain": domain.lower(),
                "subdomain": str(tmpl.get("subdomain", "default")).lower(),
                "p_initial": p_varied,
                "p_calibrated": p_varied,
                "mechanism": str(tmpl.get("mechanism", "")),
                "company": str(tmpl.get("company", "")) + variant_suffix,
                "indication": str(tmpl.get("indication", "")),
                "catalyst_type": str(tmpl.get("catalyst_type", "default")),
                "evidence_tags": list(tmpl.get("evidence_tags", []))[:8],
                "text": str(tmpl.get("notes", "")),
                "wave_id": wave_id,
                "status": "PENDING",
                "generated_sprint": VIC_SPRINT,
                "generated_phase": VIC_PHASE,
                "metadata": {"template_idx": i % len(templates), "wave": wave_id},
            }
            enriched = self.enrichment_pipeline.enrich(record)
            enriched["score"] = self.scoring_pipeline.score(enriched)
            packets.append(enriched)
        return packets

    def get_stats(self) -> Dict[str, Any]:
        return {"total_generated": self._generated_count}


# ─────────────────────────────────────────────────────────────────────────────
# HypothesisGenerationEngineV3 — Main Engine
# ─────────────────────────────────────────────────────────────────────────────

class HypothesisGenerationEngineV3:
    """
    PHE v3 Main Engine — Phase 30 HELIOS.

    Orchestrates all PHE v3 components in a unified pipeline:
    1. generate_wave() → DomainAwareGenerator → validate → enrich → score → RAAL → export
    2. export_wave_batch() → save to JSON (wave_27_batch.json format)
    3. export_grpo_calibration_packet() → GRPO v6 pipeline input

    Usage:
        engine = create_phe_v3()  # from __init__.py
        wave_27 = engine.generate_wave(wave_id=27, target_count=45, fwrd_start_id=201)
        engine.export_wave_batch(wave_27, "/vic_engine_v2/data/wave_27_batch.json")
    """

    def __init__(
        self,
        ingestion_layer: Optional[AutoIngestionLayer] = None,
        schema_validator: Optional[SchemaValidator] = None,
        enrichment_pipeline: Optional[EnrichmentPipeline] = None,
        domain_generator: Optional[DomainAwareGenerator] = None,
        scoring_pipeline: Optional[ScoringPipelineV3] = None,
        cwpr_registry: Optional[DynamicCWPRRegistry] = None,
        cross_wave_correlator: Optional[CrossWaveCorrelator] = None,
        raal_integration: Optional[Any] = None,
        resolution_tracker: Optional[Any] = None,
        event_bus: Optional[Any] = None,
        update_pipeline: Optional[Any] = None,
    ) -> None:
        from .calibration import DomainPriorRegistry, PlattScalerV3, GRPOv6PacketBuilder
        from .publisher import PHEEventBus, RealTimeUpdatePipeline
        from .raal import RAALIntegration, PHEResolutionAdapter

        self.platt_scaler = PlattScalerV3()
        self.domain_prior_registry = DomainPriorRegistry()
        self.grpo_packet_builder = GRPOv6PacketBuilder(platt_scaler=self.platt_scaler)
        self.event_bus = event_bus or PHEEventBus()

        self.ingestion_layer = ingestion_layer or AutoIngestionLayer()
        self.schema_validator = schema_validator or SchemaValidator()
        self.cwpr_registry = cwpr_registry or DynamicCWPRRegistry()
        self.enrichment_pipeline = enrichment_pipeline or EnrichmentPipeline(
            platt_scaler=self.platt_scaler,
            domain_prior_registry=self.domain_prior_registry,
            cwpr_registry=self.cwpr_registry,
        )
        self.scoring_pipeline = scoring_pipeline or ScoringPipelineV3(grpo_score=VIC_GRPO_SCORE)
        self.domain_generator = domain_generator or DomainAwareGenerator(
            enrichment_pipeline=self.enrichment_pipeline,
            scoring_pipeline=self.scoring_pipeline,
        )
        self.cross_wave_correlator = cross_wave_correlator or CrossWaveCorrelator()
        self.raal_integration = raal_integration or RAALIntegration()
        self.resolution_adapter = resolution_tracker or PHEResolutionAdapter()
        self.update_pipeline = update_pipeline or RealTimeUpdatePipeline(
            event_bus=self.event_bus,
            platt_scaler=self.platt_scaler,
            domain_prior_registry=self.domain_prior_registry,
        )

        self._packet_registry: List[Dict[str, Any]] = []
        self._wave_log: List[Dict[str, Any]] = []
        self._fwrd_counter: int = FWRD_START_V3

        logger.info(
            "HypothesisGenerationEngineV3 initialized — Phase %s Sprint %d",
            VIC_PHASE, VIC_SPRINT,
        )

    def attach_resolution_tracker(self, tracker: Any) -> None:
        self.resolution_adapter = tracker
        self.update_pipeline.domain_prior_registry = self.domain_prior_registry
        logger.info("HypothesisGenerationEngineV3: resolution tracker attached")

    def score(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        is_valid, msg = self.schema_validator.validate(packet)
        if not is_valid:
            logger.warning("score(): invalid packet: %s", msg)
            packet["validation_error"] = msg
            return packet
        enriched = self.enrichment_pipeline.enrich(packet)
        enriched["cross_wave_score"] = self.cross_wave_correlator.compute_score(enriched)
        [enriched] = self.raal_integration.apply_anchors([enriched])
        enriched["score"] = self.scoring_pipeline.score(enriched)
        return enriched

    def generate_wave(
        self,
        wave_id: int,
        target_count: int = 45,
        fwrd_start_id: int = FWRD_START_V3,
    ) -> List[Dict[str, Any]]:
        """
        Generate a complete wave of predictions (FWRD_NNN series).

        Workflow:
        1. DomainAwareGenerator.generate_wave_batch() → 45 packets
        2. SchemaValidator.filter_valid() → remove invalid
        3. CrossWaveCorrelator.compute_score() → cross-wave scores
        4. RAALIntegration.apply_anchors() → adversary corrections
        5. ScoringPipelineV3.score() → final composite scores
        6. PHEEventBus.publish(WAVE_COMPLETE)
        7. PHEResolutionAdapter.inject_wave27_predictions()

        Returns:
            List of scored hypothesis packet dicts (FWRD_201 through FWRD_245 for wave 27)
        """
        from .publisher import PHEEventType

        logger.info(
            "generate_wave: wave=%d target=%d fwrd_start=%d",
            wave_id, target_count, fwrd_start_id,
        )

        raw_packets = self.domain_generator.generate_wave_batch(
            wave_id=wave_id,
            target_count=target_count,
            fwrd_start_id=fwrd_start_id,
        )
        valid_packets, invalid_packets = self.schema_validator.filter_valid(raw_packets)
        if invalid_packets:
            logger.warning("generate_wave: %d invalid packets dropped", len(invalid_packets))

        for pkt in valid_packets:
            pkt["cross_wave_score"] = self.cross_wave_correlator.compute_score(pkt)

        valid_packets = self.raal_integration.apply_anchors(valid_packets)

        for pkt in valid_packets:
            pkt["score"] = self.scoring_pipeline.score(pkt)

        self.event_bus.publish(
            PHEEventType.WAVE_COMPLETE,
            {
                "wave_id": wave_id,
                "total_generated": len(valid_packets),
                "fwrd_range": f"FWRD_{fwrd_start_id}-FWRD_{fwrd_start_id + len(valid_packets) - 1}",
            },
        )

        self.resolution_adapter.inject_wave27_predictions(valid_packets)
        self._packet_registry.extend(valid_packets)
        self._wave_log.append({
            "wave_id": wave_id,
            "generated": len(valid_packets),
            "fwrd_start": fwrd_start_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        logger.info("generate_wave complete: wave=%d packets=%d", wave_id, len(valid_packets))
        return valid_packets

    def export_wave_batch(self, packets: List[Dict[str, Any]], path: str) -> str:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        wave_id = packets[0].get("wave_id", 0) if packets else 0
        fwrd_ids = [pkt.get("fwrd_id", "") for pkt in packets if pkt.get("fwrd_id")]
        output = {
            "wave_id": wave_id,
            "wave_number": wave_id,
            "total_entries": len(packets),
            "fwrd_range": f"{fwrd_ids[0] if fwrd_ids else '?'} — {fwrd_ids[-1] if fwrd_ids else '?'}",
            "grpo_score": VIC_GRPO_SCORE,
            "platt_A": self.platt_scaler.A,
            "platt_B": self.platt_scaler.B,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generated_sprint": VIC_SPRINT,
            "generated_phase": VIC_PHASE,
            "domain_distribution": {
                d: sum(1 for pkt in packets if pkt.get("domain", "") == d)
                for d in WAVE_27_DOMAIN_DISTRIBUTION
            },
            "entries": packets,
        }
        with p.open("w", encoding="utf-8") as fh:
            json.dump(output, fh, indent=2, default=str)
        logger.info("export_wave_batch: wrote %d entries to %s", len(packets), path)
        return str(p.resolve())

    def export_grpo_calibration_packet(
        self,
        packets: List[Dict[str, Any]],
        sprint_id: str,
    ) -> Dict[str, Any]:
        packet = self.grpo_packet_builder.build(packets, sprint_id)
        logger.info(
            "export_grpo_calibration_packet: sprint=%s packets=%d grpo=%.8f",
            sprint_id, len(packets), packet.get("grpo_score", 0.0),
        )
        return packet

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_packets": len(self._packet_registry),
            "waves_generated": len(self._wave_log),
            "wave_log": self._wave_log,
            "schema_stats": self.schema_validator.get_stats(),
            "enrichment_stats": self.enrichment_pipeline.get_stats(),
            "scoring_stats": self.scoring_pipeline.get_stats(),
            "cwpr_stats": self.cwpr_registry.get_stats(),
            "cross_wave_stats": self.cross_wave_correlator.get_stats(),
            "raal_stats": self.raal_integration.get_stats(),
            "resolution_stats": self.resolution_adapter.get_stats(),
            "grpo_score": self.platt_scaler.grpo_score,
            "platt_A": self.platt_scaler.A,
            "platt_B": self.platt_scaler.B,
            "phase": VIC_PHASE,
            "sprint": VIC_SPRINT,
        }
