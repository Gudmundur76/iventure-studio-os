#!/usr/bin/env python3
"""
GitHub webhook receiver for iVenture OS auto-deploy.
Listens on port 8768, verifies HMAC-SHA256 signature, triggers git pull + docker rebuild.
"""
import hmac
import hashlib
import json
import subprocess
import threading
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("webhook")

WEBHOOK_SECRET = b"vAAL09Cny5HI83u9jXhcEELMd8CaLmDXV84nyOpX"
REPO = "Gudmundur76/iventure-studio-os"
BRANCH = "main"
APP_DIR = "/root/iventure-studio-os"
IMAGE_NAME = "iventure-studio-os:latest"
CONTAINER_NAME = "iventure-studio-os"


def redeploy():
    log.info("Starting redeploy...")
    steps = [
        f"cd {APP_DIR} && git fetch origin && git reset --hard origin/{BRANCH}",
        f"cd {APP_DIR} && docker build -t {IMAGE_NAME} .",
        f"docker stop {CONTAINER_NAME} 2>/dev/null || true",
        f"docker rm {CONTAINER_NAME} 2>/dev/null || true",
    ]
    for step in steps:
        log.info(f"Running: {step[:80]}")
        result = subprocess.run(step, shell=True, capture_output=True, text=True)
        if result.stdout:
            log.info(f"stdout: {result.stdout[:300]}")
        if result.returncode != 0:
            log.error(f"Step failed (exit {result.returncode}): {result.stderr[:300]}")
            return

    # Get env vars from running container config file
    env_file = f"{APP_DIR}/.env.production"
    env_flags = f"--env-file {env_file}" if subprocess.run(f"test -f {env_file}", shell=True).returncode == 0 else ""

    run_cmd = (
        f"docker run -d --name {CONTAINER_NAME} --restart unless-stopped "
        f"--network coolify "
        f"-l coolify.managed=true "
        f"-l coolify.applicationId=pk34tjuje0frawjr55yy0ipm "
        f"{env_flags} "
        f"{IMAGE_NAME}"
    )
    log.info(f"Starting container: {run_cmd[:120]}")
    result = subprocess.run(run_cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        log.info(f"Container started: {result.stdout.strip()}")
    else:
        log.error(f"Container start failed: {result.stderr[:300]}")


class WebhookHandler(BaseHTTPRequestHandler):
    def send_text(self, code, body):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            self.send_text(200, "OK - iVenture OS webhook receiver v2")
        else:
            self.send_text(404, "Not found")

    def do_POST(self):
        if self.path != "/webhook":
            self.send_text(404, "Not found")
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        sig_header = self.headers.get("X-Hub-Signature-256", "")
        expected_sig = "sha256=" + hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig_header, expected_sig):
            log.warning(f"Invalid signature: {sig_header[:40]}")
            self.send_text(401, "Invalid signature")
            return

        try:
            payload = json.loads(body)
            ref = payload.get("ref", "")
            repo = payload.get("repository", {}).get("full_name", "")
            pusher = payload.get("pusher", {}).get("name", "unknown")
            log.info(f"Push: {repo} {ref} by {pusher}")

            if ref == f"refs/heads/{BRANCH}" and repo == REPO:
                log.info("Triggering redeploy...")
                threading.Thread(target=redeploy, daemon=True).start()
                self.send_text(200, "Deploying...")
            else:
                self.send_text(200, "Ignored")
        except Exception as e:
            log.error(f"Error: {e}")
            self.send_text(500, f"Error: {e}")

    def log_message(self, format, *args):
        log.info(f"[{self.address_string()}] {format % args}")


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8768), WebhookHandler)
    log.info("Webhook receiver v2 listening on port 8768")
    server.serve_forever()
