import os
import glob
from typing import List, Dict

class GensparkResourceConnector:
    """
    Connects iVenture Harnesses to the Genspark AI Drive (Knowledge Base).
    Provides semantic-ish retrieval of local documents.
    """
    def __init__(self, base_path: str = "/home/skywork/workspace/iventure-studio/data/genspark2api/knowledge_base/"):
        self.base_path = base_path

    def search(self, query: str, limit: int = 3) -> str:
        """
        Scans the AI Drive for files matching the query keywords.
        Returns a concatenated context string.
        """
        keywords = query.lower().split()
        results = []
        
        # Scan all .md and .txt files in the Drive, excluding venv
        files = [f for f in glob.glob(os.path.join(self.base_path, "**/*.md"), recursive=True) if "/venv/" not in f] + \
                [f for f in glob.glob(os.path.join(self.base_path, "**/*.txt"), recursive=True) if "/venv/" not in f]

        for file_path in files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Simple scoring: count keyword occurrences
                    score = sum(1 for kw in keywords if kw in content.lower())
                    if score > 0:
                        results.append((score, os.path.basename(file_path), content[:2000]))
            except Exception as e:
                print(f"Resource Connector Error reading {file_path}: {e}")

        # Sort by score descending and take the top results
        results.sort(key=lambda x: x[0], reverse=True)
        top_results = results[:limit]

        if not top_results:
            return "No matching internal resources found in Genspark AI Drive."

        formatted_context = "--- INTERNAL RESOURCES FROM GENSPARK AI DRIVE ---\n"
        for score, filename, snippet in top_results:
            formatted_context += f"SOURCE: {filename} (Relevance Score: {score})\nCONTENT: {snippet}\n\n"
        
        return formatted_context

# ── Singleton Instance ──────────────────────────────────────
connector = GensparkResourceConnector()
