from harness_core import iVentureHarness
import re

# ── TECHNICAL & DEV HARNESS ──────────────────────────────────
class TechnicalHarness(iVentureHarness):
    """Handles Architecture, Backend, Frontend, DevOps, QA, and Security."""
    def validate_causal_chain(self, task: str) -> bool:
        # Prevent accidental production wipes or unsafe script execution commands
        forbidden = ["rm -rf /", "drop table", "truncate", "mkfs"]
        if any(cmd in task.lower() for cmd in forbidden):
            print(f"Technical Harness: Security violation detected.")
            return False
        return True

    def get_minimized_context(self, task: str) -> str:
        return "Standard: Clean Code, PEP8, SOLID principles. Context: iVenture OS Architecture."

# ── OPERATIONS & PM HARNESS ─────────────────────────────────
class OperationsHarness(iVentureHarness):
    """Handles Project Management and Sprint Planning."""
    def get_minimized_context(self, task: str) -> str:
        return "Standard: Agile/Scrum. Focus: US/EU timezone coordination and deadline tracking."

# ── COMPLIANCE & GTM HARNESS ────────────────────────────────
class ComplianceHarness(iVentureHarness):
    """Handles US/EU GTM, NIST Compliance, and Subsidies."""
    def validate_causal_chain(self, task: str) -> bool:
        # Ensure focus remains on US/EU
        if "China" in task or "Shenzhen" in task:
            return False
        return True

    def get_minimized_context(self, task: str) -> str:
        return "Standard: NIST AI Risk Management Framework, GDPR, and US Federal Grant requirements."

# ── EXPERT & SCIENTIFIC HARNESS ─────────────────────────────
class ExpertHarness(iVentureHarness):
    """Handles Kady-Researcher (Scientific/Complex Data)."""
    def get_minimized_context(self, task: str) -> str:
        return "Standard: Peer-reviewed precision. Focus: Biotech, Patents, and Neural Architectures."

# ── MULTIMODAL & VISION HARNESS ─────────────────────────────
class MultimodalHarness(iVentureHarness):
    """Handles Vision and Image Analysis."""
    def get_minimized_context(self, task: str) -> str:
        return "Standard: Visual precision. Focus: UI/UX Audit and OCR data extraction."
