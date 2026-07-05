import time
import os
import json
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from structural_cortex import cortex
from swarm_orchestrator import swarm_engine

# ── CONFIG ──────────────────────────────────────────────────
WATCH_PATH = os.getenv("KNOWLEDGE_BASE_PATH", "/data/knowledge_base") + "/"
COMPOUND_PATH = os.path.join(WATCH_PATH, "compounded_intelligence")
os.makedirs(COMPOUND_PATH, exist_ok=True)

logging.basicConfig(level=logging.INFO, format='[PULSE] %(asctime)s - %(message)s')

class PulseHandler(FileSystemEventHandler):
    """
    The Autonomous Pulse Logic.
    Triggers the Brain when the Library changes.
    """
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".md"):
            self.process_change(event.src_path)

    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(".md"):
            self.process_change(event.src_path)

    def process_change(self, file_path):
        # Prevent loop on its own compounded files
        if "compounded_intelligence" in file_path:
            return

        filename = os.path.basename(file_path)
        logging.info(f"Change detected in {filename}. Activating Structural Cortex...")
        
        # 1. Update Knowledge Map
        cortex.scan_and_map()
        
        # 2. Identify Mission
        # Logic: If 'FDA' or 'ALVOTECH' is mentioned, run Biotech mission.
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().upper()
            
            mission_id = None
            if "FDA" in content or "ALVOTECH" in content:
                mission_id = "ubc-biotech-regulatory-strat"
            elif "SECURITY" in content or "GITHUB" in content:
                mission_id = "tech-audit-sync"
            
            if mission_id:
                logging.info(f"Structural Trigger found. Launching mission: {mission_id}")
                asyncio.run(self.launch_autonomous_swarm(mission_id, content))

    async def launch_autonomous_swarm(self, mission_id, trigger_content):
        # Fetch mission details (Mock fetching from MISSIONS.yaml logic)
        # For prototype, we use the known IDs
        missions = {
            "ubc-biotech-regulatory-strat": ["researcher", "subsidy-advisor", "financial-v1"],
            "tech-audit-sync": ["sea-v1", "qaa-v1", "mda-v1"]
        }
        
        sequence = missions.get(mission_id)
        if not sequence: return

        # 3. Execute Swarm
        result = await swarm_engine.execute_swarm_mission(
            mission_goal=f"Autonomous response to content change: {trigger_content[:100]}...",
            sequence=sequence
        )

        # 4. THE COMPOUNDING LOOP
        # Save the result back to the AI Drive as a new project context
        if result.get("status") == "swarm_success":
            compound_file = os.path.join(COMPOUND_PATH, f"compounded_{int(time.time())}.md")
            with open(compound_file, "w") as f:
                f.write(f"# COMPOUNDED INTELLIGENCE ARTIFACT\n")
                f.write(f"Timestamp: {time.ctime()}\n")
                f.write(f"Mission: {mission_id}\n\n")
                f.write("## Swarm Synthesis\n")
                for agent, data in result.get("artifacts", {}).items():
                    f.write(f"### {agent} (GRPO: {data['grpo']})\n")
                    f.write(f"{data['response']}\n\n")
            
            logging.info(f"Compounding Complete. New artifact saved: {os.path.basename(compound_file)}")

if __name__ == "__main__":
    import asyncio
    event_handler = PulseHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_PATH, recursive=False)
    
    logging.info(f"Autonomous Pulse started. Watching: {WATCH_PATH}")
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
