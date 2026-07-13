import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const Busboy = _require('busboy') as (opts: import('busboy').BusboyConfig) => import('busboy').Busboy;
import { WebSocket as WsClient, WebSocketServer } from 'ws';
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./localAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { memorySyncHandler, cortexDigestHandler, manualTriggerHandler, awarenessLoopHandler } from "../scheduledHandlers";

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
  registerLocalAuthRoutes(app);

  // ── Scheduled job handlers ────────────────────────────────────────────────
  app.post("/api/scheduled/memory-sync", memorySyncHandler);
  app.post("/api/scheduled/cortex-digest", cortexDigestHandler);
  app.post("/api/scheduled/manual-trigger", manualTriggerHandler);
  app.post("/api/scheduled/awareness-loop", awarenessLoopHandler);

  // Start in-process agent schedule runner (node-cron, VPS-compatible)
  startAgentScheduleRunner();


  // ── xAI Realtime WebSocket proxy ──────────────────────────────────────────
  // Browser cannot send Authorization headers on WebSocket connections.
  // This proxy: browser → ws://server/api/voice-proxy → wss://api.openai.com/v1/realtime
  const voiceWss = new WebSocketServer({ noServer: true });
  voiceWss.on('connection', (browserWs) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      browserWs.close(1011, 'OPENAI_API_KEY not configured');
      return;
    }
    const openaiWs = new WsClient(
      'wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1',
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    openaiWs.on('open', () => {
      // Relay browser → OpenAI
      browserWs.on('message', (data) => {
        if (openaiWs.readyState === WsClient.OPEN) openaiWs.send(data);
      });
    });
    // Relay OpenAI → browser
    openaiWs.on('message', (data) => {
      if (browserWs.readyState === browserWs.OPEN) browserWs.send(data);
    });
    openaiWs.on('error', (err) => {
      console.error('[voice-proxy] OpenAI WS error:', err.message);
      browserWs.close(1011, 'OpenAI connection error');
    });
    openaiWs.on('close', (code, reason) => {
      browserWs.close(code, reason);
    });
    browserWs.on('close', () => {
      openaiWs.close();
    });
    browserWs.on('error', () => {
      openaiWs.close();
    });
  });

  // Voice session token endpoint — creates a real OpenAI ephemeral token
  // Browser uses this token to connect DIRECTLY to OpenAI, bypassing Traefik WebSocket issues
  app.get('/api/voice-session-token', async (_req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'OPENAI_API_KEY not configured' }); return; }
    try {
      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-realtime-2.1',
          modalities: ['audio', 'text'],
          voice: 'alloy',
          instructions: 'Þú ert Gummi — persónulegur AI aðstoðarmaður á Íslandi. Svaraðu alltaf á íslensku. Vertu vingjarnlegur, stuttorður og hjálplegur. Þú getur hjálpað með: að finna veitingastaði, finna iðnaðarmenn, bera saman verð og minna á tíma. Þegar viðskiptavinur lýsir verkefni skaltu staðfesta það og segja honum að þú sendir það til Gumma til að vinna.',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 700 },
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        console.error('[voice-session-token] OpenAI error:', err);
        res.status(500).json({ error: 'Failed to create session: ' + err });
        return;
      }
      const session = await response.json() as Record<string, unknown>;
      // Return the client_secret token and WebSocket URL to the browser
      res.json({
        token: (session.client_secret as Record<string, unknown>)?.value,
        wsUrl: 'wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1',
        sessionId: session.id,
      });
    } catch (err) {
      console.error('[voice-session-token] Error:', err);
      res.status(500).json({ error: String(err) });
    }
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
    }
    // All other upgrade requests (Vite HMR, etc.) are left untouched
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
import { startAgentScheduleRunner } from "../agentScheduleRunner";
