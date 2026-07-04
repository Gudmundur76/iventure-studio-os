import os
import glob
import re
import json
from typing import List, Dict, Set

class StructuralCortex:
    """
    The Unified Brain Component.
    Identifies structural connections between disparate projects in the AI Drive
    and synthesizes them into a single cognitive map.
    """
    def __init__(self, drive_path: str = os.getenv('KNOWLEDGE_BASE_PATH', '/data/knowledge_base')):
        self.drive_path = drive_path
        self.knowledge_map = {} # {entity: [file_list]}
        self.cross_project_links = [] # [(file_a, file_b, reason)]

    def scan_and_map(self):
        """Builds a map of entities and links across all projects."""
        files = [f for f in glob.glob(os.path.join(self.drive_path, "**/*.md"), recursive=True) if "/venv/" not in f]
        
        # High-value entities to track
        entity_patterns = {
            "regulator": r"(FDA|NIST|SEC|EMA|USPTO)",
            "geopolitical": r"(US Federal|EU Market|Iceland|Nordic)",
            "corporate": r"(Alvotech|Ii\.inc|TMTG|Nvidia|OpenAI)",
            "architectural": r"(Harness|VMOA|Cortex|GRPO|RAAL|Strawberry)"
        }

        for file_path in files:
            filename = os.path.basename(file_path)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                    for category, pattern in entity_patterns.items():
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        for match in set(matches):
                            entity = match.upper()
                            if entity not in self.knowledge_map:
                                self.knowledge_map[entity] = []
                            if filename not in self.knowledge_map[entity]:
                                self.knowledge_map[entity].append(filename)
            except Exception:
                continue

        # Generate Cross-Project Links
        for entity, file_list in self.knowledge_map.items():
            if len(file_list) > 1:
                # This entity connects multiple documents
                self.cross_project_links.append({
                    "connection": entity,
                    "nodes": file_list
                })

    def get_unified_context(self, task: str) -> str:
        """Retrieves context by following the structural map, not just keywords."""
        self.scan_and_map() # Refresh map
        
        keywords = task.upper().split()
        connected_files = set()
        
        # Find entities mentioned in task
        for word in keywords:
            if word in self.knowledge_map:
                connected_files.update(self.knowledge_map[word])
        
        if not connected_files:
            return "No structural links found for this mission."

        found_entities = [word for word in keywords if word in self.knowledge_map]
        unified_context = "--- STRUCTURAL CONNECTIONS IDENTIFIED ---\n"
        unified_context += f"CORE ENTITIES: {', '.join(found_entities)}\n\n"
        
        for filename in list(connected_files)[:5]: # Limit to top 5
            unified_context += f"LINKED PROJECT: {filename}\n"
            # In a real system, we'd pull specific related sections here
        
        return unified_context

# ── Singleton Instance ──────────────────────────────────────
cortex = StructuralCortex()