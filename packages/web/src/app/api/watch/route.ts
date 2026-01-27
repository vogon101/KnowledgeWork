import { NextRequest } from "next/server";
import chokidar, { FSWatcher } from "chokidar";
import path from "path";

const KB_ROOT = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), "../../content");

// Store for active watchers - we'll use a singleton pattern
let watcher: FSWatcher | null = null;
const clients = new Set<ReadableStreamDefaultController>();

function initWatcher() {
  if (watcher) return;

  watcher = chokidar.watch(KB_ROOT, {
    ignored: [
      /(^|[\/\\])\../, // dotfiles
      /node_modules/,
      /\.git/,
      /knowledge-work-web/,
      /venv/,
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  watcher.on("change", (filePath) => {
    const relativePath = path.relative(KB_ROOT, filePath);
    notifyClients({ type: "change", path: relativePath });
  });

  watcher.on("add", (filePath) => {
    const relativePath = path.relative(KB_ROOT, filePath);
    notifyClients({ type: "add", path: relativePath });
  });

  watcher.on("unlink", (filePath) => {
    const relativePath = path.relative(KB_ROOT, filePath);
    notifyClients({ type: "unlink", path: relativePath });
  });
}

function notifyClients(event: { type: string; path: string }) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Client disconnected, will be cleaned up
    }
  });
}

export async function GET(request: NextRequest) {
  // Initialize watcher on first request
  initWatcher();

  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send initial connection message
      controller.enqueue(
        new TextEncoder().encode('data: {"type":"connected"}\n\n')
      );

      // Clean up on abort (client disconnect)
      request.signal.addEventListener("abort", () => {
        clients.delete(controller);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Also clean up on stream cancel
      clients.delete(this as unknown as ReadableStreamDefaultController);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
