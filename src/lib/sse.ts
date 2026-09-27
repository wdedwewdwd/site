import "server-only";
import type { EventEmitter } from "node:events";

const encoder = new TextEncoder();

export type SseIO = {
  send: (event: string, data: unknown, id?: string) => void;
  readonly closed: boolean;
};

/**
 * Server-Sent Events response. `loop` runs until it returns or the client disconnects;
 * a comment heartbeat keeps proxies from closing idle connections. Browsers reconnect
 * automatically (sending the last event id), so loops may end after a few minutes.
 */
export function sseResponse(signal: AbortSignal, loop: (io: SseIO) => Promise<void>) {
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const io: SseIO = {
        send: (event, data, id) => write(`${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        get closed() {
          return closed || signal.aborted;
        },
      };
      const onAbort = () => (closed = true);
      signal.addEventListener("abort", onAbort);
      const heartbeat = setInterval(() => write(": ping\n\n"), 20_000);
      write("retry: 3000\n\n");
      try {
        await loop(io);
      } catch (e) {
        if (!io.closed) console.error("[sse]", e);
      } finally {
        clearInterval(heartbeat);
        signal.removeEventListener("abort", onAbort);
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Tell Nginx-style proxies (Liara) not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}

/** Resolves on the next event on `channel`, after `ms`, or when the request is aborted. */
export function waitForEvent(bus: EventEmitter, channel: string, ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      bus.off(channel, done);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    bus.on(channel, done);
    signal.addEventListener("abort", done);
  });
}

/** Parses a stream cursor (ISO date) from the Last-Event-ID header or `since` query parameter. */
export function parseCursor(request: Request) {
  const raw = request.headers.get("last-event-id") || new URL(request.url).searchParams.get("since");
  const d = raw && raw.length < 40 ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return new Date();
  // Never trust a cursor far in the past (would replay a huge history) or in the future.
  const min = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(Math.min(Math.max(d.getTime(), min), Date.now()));
}

/** Same-origin check for state-changing API routes (server actions do this themselves). */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}
