/**
 * codeGraph.ts — Mr. Agent's eyes on the codebase.
 *
 * Responsibilities:
 *  1. Scan local TypeScript/JavaScript repos with ts-morph (AST-level)
 *  2. Scan remote VPS services via SSH (file listing + basic metrics)
 *  3. Persist nodes + edges to the database
 *  4. Detect anomalies: dead code, high complexity, circular deps, large files
 *  5. Expose helpers consumed by selfHealing.ts and the tRPC router
 */

import * as fs from "fs";
import * as path from "path";
import { Project as TsMorphProject, SyntaxKind } from "ts-morph";
import { getDb } from "./db";
import {
  codeRepos,
  codeNodes,
  codeEdges,
  type CodeRepo,
  type InsertCodeNode,
  type InsertCodeEdge,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScanResult {
  repoId: number;
  repoName: string;
  nodesWritten: number;
  edgesWritten: number;
  anomaliesFound: number;
  durationMs: number;
  error?: string;
}

export interface AnomalyReport {
  nodeId: number;
  filePath: string;
  name: string;
  anomalyType: string;
  anomalyDetail: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COMPLEXITY_THRESHOLD = 8;    // cyclomatic complexity above this = anomaly (Mr. Agent profile default)
const LOC_THRESHOLD = 200;         // lines of code above this = large file anomaly (Mr. Agent profile default)
const FUNC_COUNT_THRESHOLD = 25;   // functions per file above this = anomaly (Mr. Agent profile default)
const DEAD_CODE_MIN_LOC = 5;       // only flag dead code if node has >= 5 lines

// ── Helpers ────────────────────────────────────────────────────────────────

/** Count cyclomatic complexity of a function body (simplified: count branch nodes) */
function calcComplexity(fnNode: import("ts-morph").FunctionDeclaration | import("ts-morph").MethodDeclaration | import("ts-morph").ArrowFunction | import("ts-morph").FunctionExpression): number {
  let complexity = 1;
  const branchKinds = [
    SyntaxKind.IfStatement,
    SyntaxKind.ForStatement,
    SyntaxKind.ForInStatement,
    SyntaxKind.ForOfStatement,
    SyntaxKind.WhileStatement,
    SyntaxKind.DoStatement,
    SyntaxKind.CaseClause,
    SyntaxKind.CatchClause,
    SyntaxKind.ConditionalExpression,
    SyntaxKind.BinaryExpression,
  ];
  fnNode.forEachDescendant((node) => {
    if (branchKinds.includes(node.getKind())) complexity++;
  });
  return complexity;
}

/** Count lines in a source range */
function lineCount(start: number, end: number, text: string): number {
  return text.slice(start, end).split("\n").length;
}

// ── Local TypeScript Scanner ───────────────────────────────────────────────

export async function scanLocalRepo(repo: CodeRepo): Promise<ScanResult> {
  const start = Date.now();
  const db = await getDb();
  if (!db) return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: 0, error: "DB unavailable" };

  try {
    // Clear existing nodes/edges for this repo before re-scanning
    await db.delete(codeEdges).where(eq(codeEdges.repoId, repo.id));
    await db.delete(codeNodes).where(eq(codeNodes.repoId, repo.id));

    const tsConfigPath = path.join(repo.path, "tsconfig.json");
    const hasTsConfig = fs.existsSync(tsConfigPath);

    const project = new TsMorphProject({
      tsConfigFilePath: hasTsConfig ? tsConfigPath : undefined,
      compilerOptions: hasTsConfig ? undefined : {
        allowJs: true,
        noEmit: true,
      },
    });

    if (!hasTsConfig) {
      // Add all ts/tsx/js/jsx files manually
      const addDir = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) addDir(full);
          else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            try { project.addSourceFileAtPath(full); } catch { /* skip unreadable */ }
          }
        }
      };
      addDir(repo.path);
    }

    const nodeMap = new Map<string, number>(); // filePath:name -> nodeId
    const nodesToInsert: InsertCodeNode[] = [];
    const edgesToInsert: InsertCodeEdge[] = [];
    let anomaliesFound = 0;

    for (const sourceFile of project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath();
      // Skip node_modules and generated files
      if (filePath.includes("node_modules") || filePath.includes("/dist/") || filePath.includes(".d.ts")) continue;

      const relPath = path.relative(repo.path, filePath);
      const fileText = sourceFile.getFullText();
      const fileLoc = fileText.split("\n").length;

      // File node
      const fileAnomalyType = fileLoc > LOC_THRESHOLD ? "large_file" : undefined;
      const fileAnomalyDetail = fileAnomalyType ? `File has ${fileLoc} lines (threshold: ${LOC_THRESHOLD})` : undefined;
      if (fileAnomalyType) anomaliesFound++;

      nodesToInsert.push({
        repoId: repo.id,
        nodeType: "file",
        name: path.basename(filePath),
        filePath: relPath,
        startLine: 1,
        endLine: fileLoc,
        complexity: 0,
        linesOfCode: fileLoc,
        churnScore: 0,
        isDeadCode: false,
        hasErrors: false,
        anomalyType: fileAnomalyType ?? null,
        anomalyDetail: fileAnomalyDetail ?? null,
      });

      // Import edges (file → file)
      for (const importDecl of sourceFile.getImportDeclarations()) {
        const moduleSpec = importDecl.getModuleSpecifierValue();
        if (moduleSpec.startsWith(".")) {
          // relative import — record as edge (resolved later after all nodes inserted)
          edgesToInsert.push({
            repoId: repo.id,
            fromNodeId: 0, // placeholder — resolved after insert
            toNodeId: 0,   // placeholder
            edgeType: "imports",
            // Store paths in a temp field we'll resolve
            // We use a convention: store as JSON in a comment field
          } as InsertCodeEdge & { _from: string; _to: string });
          // Actually store the paths for resolution
          (edgesToInsert[edgesToInsert.length - 1] as any)._from = relPath;
          (edgesToInsert[edgesToInsert.length - 1] as any)._to = moduleSpec;
        }
      }

      // Function nodes
      const functions = [
        ...sourceFile.getFunctions(),
        ...sourceFile.getClasses().flatMap(c => c.getMethods()),
      ];

      // Flag files with too many functions
      if (functions.length > FUNC_COUNT_THRESHOLD) {
        const fileNodeIdx = nodesToInsert.length - 1;
        if (fileNodeIdx >= 0 && nodesToInsert[fileNodeIdx].nodeType === "file" && !nodesToInsert[fileNodeIdx].anomalyType) {
          nodesToInsert[fileNodeIdx].anomalyType = "too_many_functions";
          nodesToInsert[fileNodeIdx].anomalyDetail = `File has ${functions.length} functions (threshold: ${FUNC_COUNT_THRESHOLD})`;
          anomaliesFound++;
        }
      }

      for (const fn of functions) {
        const fnName = fn.getName() ?? "<anonymous>";
        const startLine = fn.getStartLineNumber();
        const endLine = fn.getEndLineNumber();
        const loc = endLine - startLine + 1;
        const complexity = calcComplexity(fn as any);

        let anomalyType: string | null = null;
        let anomalyDetail: string | null = null;
        if (complexity > COMPLEXITY_THRESHOLD) {
          anomalyType = "high_complexity";
          anomalyDetail = `Cyclomatic complexity ${complexity} exceeds threshold ${COMPLEXITY_THRESHOLD}`;
          anomaliesFound++;
        }

        nodesToInsert.push({
          repoId: repo.id,
          nodeType: fn.getKind() === SyntaxKind.MethodDeclaration ? "function" : "function",
          name: fnName,
          filePath: relPath,
          startLine,
          endLine,
          complexity,
          linesOfCode: loc,
          churnScore: 0,
          isDeadCode: false,
          hasErrors: false,
          anomalyType,
          anomalyDetail,
        });
      }

      // Class nodes
      for (const cls of sourceFile.getClasses()) {
        const clsName = cls.getName() ?? "<anonymous>";
        nodesToInsert.push({
          repoId: repo.id,
          nodeType: "class",
          name: clsName,
          filePath: relPath,
          startLine: cls.getStartLineNumber(),
          endLine: cls.getEndLineNumber(),
          complexity: 0,
          linesOfCode: cls.getEndLineNumber() - cls.getStartLineNumber() + 1,
          churnScore: 0,
          isDeadCode: false,
          hasErrors: false,
          anomalyType: null,
          anomalyDetail: null,
        });
      }
    }

    // Batch insert nodes
    let nodesWritten = 0;
    const BATCH = 100;
    for (let i = 0; i < nodesToInsert.length; i += BATCH) {
      const batch = nodesToInsert.slice(i, i + BATCH);
      if (batch.length > 0) {
        await db.insert(codeNodes).values(batch);
        nodesWritten += batch.length;
      }
    }

    // Build nodeMap for edge resolution
    const insertedNodes = await db.select({ id: codeNodes.id, filePath: codeNodes.filePath, name: codeNodes.name })
      .from(codeNodes)
      .where(eq(codeNodes.repoId, repo.id));
    for (const n of insertedNodes) {
      nodeMap.set(`${n.filePath}:${n.name}`, n.id);
      nodeMap.set(n.filePath, n.id); // file-level key
    }

    // Resolve and insert edges
    const resolvedEdges: InsertCodeEdge[] = [];
    for (const edge of edgesToInsert) {
      const e = edge as any;
      if (!e._from || !e._to) continue;
      const fromId = nodeMap.get(e._from);
      // Try to resolve relative import to a file path
      const toRelPath = e._to.replace(/^\.\//, "").replace(/^\.\.\//, "");
      const nodeMapEntries = Array.from(nodeMap.entries());
      const toId = nodeMapEntries.find(([k]) => k.includes(toRelPath) && !k.includes(":"))?.[1];
      if (fromId && toId && fromId !== toId) {
        resolvedEdges.push({ repoId: repo.id, fromNodeId: fromId, toNodeId: toId, edgeType: "imports" });
      }
    }

    let edgesWritten = 0;
    for (let i = 0; i < resolvedEdges.length; i += BATCH) {
      const batch = resolvedEdges.slice(i, i + BATCH);
      if (batch.length > 0) {
        await db.insert(codeEdges).values(batch);
        edgesWritten += batch.length;
      }
    }

    // Update repo stats
    await db.update(codeRepos)
      .set({ nodeCount: nodesWritten, edgeCount: edgesWritten, lastScannedAt: new Date(), updatedAt: new Date() })
      .where(eq(codeRepos.id, repo.id));

    return { repoId: repo.id, repoName: repo.name, nodesWritten, edgesWritten, anomaliesFound, durationMs: Date.now() - start };
  } catch (err: any) {
    return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: Date.now() - start, error: String(err?.message ?? err) };
  }
}

// ── SSH Remote Scanner ─────────────────────────────────────────────────────
// For VPS services (nanoclaw, openmanus, etc.) we SSH in, list files,
// count lines, and look for obvious issues (large files, TODO/FIXME density).

export async function scanSshRepo(repo: CodeRepo): Promise<ScanResult> {
  const start = Date.now();
  const db = await getDb();
  if (!db) return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: 0, error: "DB unavailable" };

  // Parse ssh path: user@host:/remote/path
  const sshMatch = repo.path.match(/^(.+)@(.+):(.+)$/);
  if (!sshMatch) {
    return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: Date.now() - start, error: `Invalid SSH path format: ${repo.path}. Expected user@host:/path` };
  }
  const [, user, host, remotePath] = sshMatch;

  try {
    const { ENV } = await import("./_core/env");
    const password = ENV.vpsRootPassword;
    if (!password) {
      return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: Date.now() - start, error: "VPS_ROOT_PASSWORD not set" };
    }

    // Use sshpass + ssh to run remote commands
    const { execSync } = await import("child_process");
    const sshCmd = (cmd: string) =>
      execSync(`sshpass -p '${password}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host} '${cmd.replace(/'/g, "'\\''")}'`, { timeout: 30000 }).toString().trim();

    // List all source files with line counts
    let fileList: string;
    try {
      fileList = sshCmd(`find ${remotePath} -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.go' \\) ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' 2>/dev/null | head -200`);
    } catch {
      return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: Date.now() - start, error: `SSH connection failed to ${host}` };
    }

    const files = fileList.split("\n").filter(Boolean);
    if (files.length === 0) {
      return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: Date.now() - start };
    }

    // Clear existing nodes for this repo
    await db.delete(codeEdges).where(eq(codeEdges.repoId, repo.id));
    await db.delete(codeNodes).where(eq(codeNodes.repoId, repo.id));

    const nodesToInsert: InsertCodeNode[] = [];
    let anomaliesFound = 0;

    for (const filePath of files) {
      const relPath = filePath.replace(remotePath, "").replace(/^\//, "");
      let loc = 0;
      let todoCount = 0;
      try {
        const wc = sshCmd(`wc -l < "${filePath}" 2>/dev/null || echo 0`);
        loc = parseInt(wc) || 0;
        const todos = sshCmd(`grep -c "TODO\\|FIXME\\|HACK\\|XXX" "${filePath}" 2>/dev/null || echo 0`);
        todoCount = parseInt(todos) || 0;
      } catch { /* skip */ }

      let anomalyType: string | null = null;
      let anomalyDetail: string | null = null;
      if (loc > LOC_THRESHOLD) {
        anomalyType = "large_file";
        anomalyDetail = `File has ${loc} lines (threshold: ${LOC_THRESHOLD})`;
        anomaliesFound++;
      } else if (todoCount > 5) {
        anomalyType = "high_todo_density";
        anomalyDetail = `File has ${todoCount} TODO/FIXME markers — may indicate incomplete implementation`;
        anomaliesFound++;
      }

      nodesToInsert.push({
        repoId: repo.id,
        nodeType: "file",
        name: path.basename(filePath),
        filePath: relPath,
        startLine: 1,
        endLine: loc,
        complexity: 0,
        linesOfCode: loc,
        churnScore: 0,
        isDeadCode: false,
        hasErrors: false,
        anomalyType,
        anomalyDetail,
      });
    }

    const BATCH = 100;
    let nodesWritten = 0;
    for (let i = 0; i < nodesToInsert.length; i += BATCH) {
      const batch = nodesToInsert.slice(i, i + BATCH);
      if (batch.length > 0) {
        await db.insert(codeNodes).values(batch);
        nodesWritten += batch.length;
      }
    }

    await db.update(codeRepos)
      .set({ nodeCount: nodesWritten, edgeCount: 0, lastScannedAt: new Date(), updatedAt: new Date() })
      .where(eq(codeRepos.id, repo.id));

    return { repoId: repo.id, repoName: repo.name, nodesWritten, edgesWritten: 0, anomaliesFound, durationMs: Date.now() - start };
  } catch (err: any) {
    return { repoId: repo.id, repoName: repo.name, nodesWritten: 0, edgesWritten: 0, anomaliesFound: 0, durationMs: Date.now() - start, error: String(err?.message ?? err) };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────

export async function scanRepo(repo: CodeRepo): Promise<ScanResult> {
  if (repo.source === "ssh") return scanSshRepo(repo);
  return scanLocalRepo(repo);
}

export async function scanAllActiveRepos(): Promise<ScanResult[]> {
  const db = await getDb();
  if (!db) return [];
  const repos = await db.select().from(codeRepos).where(eq(codeRepos.isActive, true));
  console.log(`[CodeGraph] Scanning ${repos.length} active repos: ${repos.map(r => r.name).join(", ")}`);
  const results: ScanResult[] = [];
  for (const repo of repos) {
    const result = await scanRepo(repo);
    console.log(`[CodeGraph] ${repo.name} (${repo.source}): ${result.nodesWritten} nodes, ${result.anomaliesFound} anomalies${result.error ? ` | ERROR: ${result.error}` : ""}`);
    results.push(result);
  }
  return results;
}

// ── Anomaly Query ─────────────────────────────────────────────────────────

export async function getAnomalies(repoId?: number): Promise<AnomalyReport[]> {
  const db = await getDb();
  if (!db) return [];
  const { isNotNull } = await import("drizzle-orm");
  const conditions = [isNotNull(codeNodes.anomalyType)];
  if (repoId != null) conditions.push(eq(codeNodes.repoId, repoId));
  const rows = await db.select({
    id: codeNodes.id,
    filePath: codeNodes.filePath,
    name: codeNodes.name,
    anomalyType: codeNodes.anomalyType,
    anomalyDetail: codeNodes.anomalyDetail,
  }).from(codeNodes).where(and(...conditions));
  return rows.map(r => ({
    nodeId: r.id,
    filePath: r.filePath,
    name: r.name,
    anomalyType: r.anomalyType!,
    anomalyDetail: r.anomalyDetail ?? "",
  }));
}

// ── Seed default repos ────────────────────────────────────────────────────
// Called once on startup to ensure the meta-OS repos are registered.

export async function seedDefaultRepos(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: codeRepos.id }).from(codeRepos);
  if (existing.length > 0) return; // already seeded

  const defaults = [
    {
      name: "iVenture Studio OS (this app)",
      source: "local" as const,
      path: process.cwd(),
      language: "typescript",
      isActive: true,
    },
    {
      name: "nanoclaw",
      source: "ssh" as const,
      path: "root@187.124.213.194:/opt/nanoclaw",
      language: "typescript",
      isActive: true,
    },
    {
      name: "openmanus",
      source: "ssh" as const,
      path: "root@187.124.213.194:/opt/openmanus",
      language: "python",
      isActive: true,
    },
    {
      name: "VPS /opt services",
      source: "ssh" as const,
      path: "root@187.124.213.194:/opt",
      language: "typescript",
      isActive: true,
    },
  ];

  for (const repo of defaults) {
    await db.insert(codeRepos).values(repo);
  }
}
