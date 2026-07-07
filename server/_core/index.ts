import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const Busboy = _require('busboy') as (opts: import('busboy').BusboyConfig) => import('busboy').Busboy;
import { WebSocket as WsClient, WebSocketServer } from 'ws';
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── xAI Realtime WebSocket proxy ──────────────────────────────────────────
  // Browser cannot send Authorization headers on WebSocket connections.
  // This proxy: browser → ws://server/api/voice-proxy → wss://api.x.ai/v1/realtime
  const voiceWss = new WebSocketServer({ noServer: true });
  voiceWss.on('connection', (browserWs) => {
    const apiKey = process.env.XAI_API_KEY;
    const agentId = 'agent_fgrublDXzNDfu5MT';
    if (!apiKey) {
      browserWs.close(1011, 'XAI_API_KEY not configured');
      return;
    }
    const xaiWs = new WsClient(
      `wss://api.x.ai/v1/realtime?agent_id=${agentId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    xaiWs.on('open', () => {
      // Relay browser → xAI
      browserWs.on('message', (data) => {
        if (xaiWs.readyState === WsClient.OPEN) xaiWs.send(data);
      });
    });
    // Relay xAI → browser
    xaiWs.on('message', (data) => {
      if (browserWs.readyState === browserWs.OPEN) browserWs.send(data);
    });
    xaiWs.on('error', (err) => {
      console.error('[voice-proxy] xAI WS error:', err.message);
      browserWs.close(1011, 'xAI connection error');
    });
    xaiWs.on('close', (code, reason) => {
      browserWs.close(code, reason);
    });
    browserWs.on('close', () => {
      xaiWs.close();
    });
    browserWs.on('error', () => {
      xaiWs.close();
    });
  });

  // Voice session token endpoint — returns xAI credentials for browser WebSocket (key stays server-side)
  app.get('/api/voice-session-token', (_req, res) => {
    const apiKey = process.env.XAI_API_KEY;
    const agentId = "agent_fgrublDXzNDfu5MT";
    if (!apiKey) { res.status(500).json({ error: 'XAI_API_KEY not configured' }); return; }
    res.json({ apiKey, agentId, wsUrl: `wss://api.x.ai/v1/realtime?agent_id=${agentId}` });
  });

  // Voice clone upload endpoint — receives audio from browser, proxies to xAI Custom Voices API
  app.post('/api/upload-voice-clone', (req, res) => {
    const bb = Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];
    let filename = 'voice.webm';
    let mimeType = 'audio/webm';

    bb.on('file', (_field, file, info) => {
      filename = info.filename || filename;
      mimeType = info.mimeType || mimeType;
      file.on('data', (d: Buffer) => chunks.push(d));
    });

    bb.on('close', async () => {
      try {
        const audioBuffer = Buffer.concat(chunks);
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) { res.status(500).json({ error: 'XAI_API_KEY not configured' }); return; }

        // Build multipart form for xAI API
        const boundary = '----GummiVoiceBoundary' + Date.now();
        const namePart = `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nGummi Eyberg\r\n`;
        const descPart = `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nGummi Gúrú personal agent voice\r\n`;
        const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
        const closing = `\r\n--${boundary}--\r\n`;

        const body = Buffer.concat([
          Buffer.from(namePart),
          Buffer.from(descPart),
          Buffer.from(filePart),
          audioBuffer,
          Buffer.from(closing),
        ]);

        const xaiRes = await fetch('https://api.x.ai/v1/audio/voice-clones', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        const data = await xaiRes.json() as Record<string, unknown>;
        if (!xaiRes.ok) {
          res.status(xaiRes.status).json({ error: (data.error as string) ?? 'xAI API error', details: data });
          return;
        }
        res.json({ voice_id: data.voice_id ?? data.id ?? data, raw: data });
      } catch (e: unknown) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Upload failed' });
      }
    });

    req.pipe(bb);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Upgrade HTTP → WebSocket for /api/voice-proxy
  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/api/voice-proxy')) {
      voiceWss.handleUpgrade(request, socket as import('net').Socket, head, (ws) => {
        voiceWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
