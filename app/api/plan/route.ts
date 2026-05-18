import { streamPlan } from "@/lib/planner";
import type { EmailDoc } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanBody = {
  doc: EmailDoc;
  message: string;
  history?: { role: "user" | "assistant"; text: string }[];
};

export async function POST(req: Request) {
  let body: PlanBody;
  try {
    body = (await req.json()) as PlanBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body?.doc || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "Missing doc or message" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamPlan(
          {
            doc: body.doc,
            message: body.message,
            history: body.history ?? [],
          },
          { signal: req.signal },
        )) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (err) {
        // Client abort surfaces here as AbortError — swallow silently, the response is gone.
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Planner failed";
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: msg }) + "\n"));
      } finally {
        try {
          controller.close();
        } catch {
          // ignore if already closed by client abort
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
