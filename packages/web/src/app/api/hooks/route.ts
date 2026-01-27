import { NextRequest, NextResponse } from "next/server";

// In-memory store for hook events
// In production, you might use Redis or SQLite
interface HookEvent {
  id: string;
  type: string;
  sessionId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Global store with max 100 events
const MAX_EVENTS = 100;
const events: HookEvent[] = [];

// SSE clients waiting for events
const clients: Set<(event: HookEvent) => void> = new Set();

// Add event and notify clients
function addEvent(event: HookEvent) {
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.pop();
  }
  // Notify all SSE clients
  clients.forEach((notify) => notify(event));
}

// POST - Receive hook events from Claude Code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract event type from body
    const eventType = body.hook_type || body.type || "unknown";

    const event: HookEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: eventType,
      sessionId: body.session_id,
      timestamp: new Date(),
      data: body,
    };

    addEvent(event);

    console.log(`[Hooks] Received ${eventType} event:`, JSON.stringify(body).slice(0, 200));

    return NextResponse.json({ success: true, id: event.id });
  } catch (error) {
    console.error("[Hooks] Error processing event:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

// GET - SSE endpoint for subscribing to events
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stream = searchParams.get("stream") === "true";

  if (stream) {
    // SSE streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial event list
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "init", events: events.slice(0, 20) })}\n\n`)
        );

        // Listen for new events
        const notify = (event: HookEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "event", event })}\n\n`)
          );
        };

        clients.add(notify);

        // Cleanup on abort
        request.signal.addEventListener("abort", () => {
          clients.delete(notify);
          controller.close();
        });
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

  // Regular GET - return recent events
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const typeFilter = searchParams.get("type");

  let filteredEvents = events;
  if (typeFilter) {
    filteredEvents = events.filter((e) => e.type === typeFilter);
  }

  return NextResponse.json({
    events: filteredEvents.slice(0, limit),
    total: filteredEvents.length,
  });
}
