from harness_core import iVentureHarness
import re

# ── TECHNICAL & DEV HARNESS ──────────────────────────────────
class TechnicalHarness(iVentureHarness):
    """Handles Architecture, Backend, Frontend, DevOps, QA, and Security."""
    def validate_causal_chain(self, task: str) -> bool:
        forbidden = ["rm -rf /", "drop table", "truncate", "mkfs"]
        if any(cmd in task.lower() for cmd in forbidden):
            print(f"Technical Harness: Security violation detected.")
            return False
        return True

    async def get_minimized_context(self, task: str) -> str:
        # Search the Drive for technical docs
        drive_context = self.connector.search(f"technical architecture code {task}")
        return f"Standard: Clean Code, SOLID. {drive_context}"

# ── OPERATIONS & PM HARNESS ─────────────────────────────────
class OperationsHarness(iVentureHarness):
    """Handles Project Management and Sprint Planning."""
    async def get_minimized_context(self, task: str) -> str:
        drive_context = self.connector.search(f"sprint timeline mission {task}")
        return f"Standard: Agile. Focus: US/EU coordination. {drive_context}"

# ── COMPLIANCE & GTM HARNESS ────────────────────────────────
class ComplianceHarness(iVentureHarness):
    """Handles US/EU GTM, NIST Compliance, and Subsidies."""
    def validate_causal_chain(self, task: str) -> bool:
        if "China" in task or "Shenzhen" in task:
            return False
        return True

    async def get_minimized_context(self, task: str) -> str:
        drive_context = self.connector.search(f"compliance NIST regulation subsidy {task}")
        return f"Standard: NIST AI RMF, GDPR. {drive_context}"

# ── EXPERT & SCIENTIFIC HARNESS ─────────────────────────────
class ExpertHarness(iVentureHarness):
    """Handles Kady-Researcher (Scientific/Complex Data)."""
    async def get_minimized_context(self, task: str) -> str:
        drive_context = self.connector.search(f"scientific patent biotech {task}")
        return f"Standard: Peer-reviewed precision. {drive_context}"

# ── MULTIMODAL & VISION HARNESS ─────────────────────────────
class MultimodalHarness(iVentureHarness):
    """Handles Vision and Image Analysis."""
    async def get_minimized_context(self, task: str) -> str:
        drive_context = self.connector.search(f"vision UI OCR {task}")
        return f"Standard: Visual precision. {drive_context}"

# ── BROWSER & AGENCY HARNESS ────────────────────────────────
class BrowserHarness(iVentureHarness):
    """Handles precise browser-based actions and authenticated sessions."""
    async def get_minimized_context(self, task: str) -> str:
        drive_context = self.connector.search(f"browser credentials login URL {task}")
        return f"Standard: Agent-First Compact Browsing. {drive_context}"
    
    async def execute(self, task: str):
        # Implementation logic for spawning agent-browser.dev scripts
        # For now, it inherits the base execution with Bridge support
        return await super().execute(task)
