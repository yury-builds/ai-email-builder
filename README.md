# AI Email Builder

Drag-and-drop email builder with a Claude-powered design assistant. Puck visual editor + react.email render + Resend test send.

## Stack

- **Next.js 15** (app router) on port 3030
- **Puck** for the drag-and-drop canvas
- **react.email** for cross-client HTML rendering
- **Claude Sonnet 4.6** as the planner
- **Resend** for test sends

## Run

```bash
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY and RESEND_API_KEY
pnpm install
pnpm dev
```

Open http://localhost:3030.

## Flow

1. Pick a template on the landing page (welcome, re-engagement, event invite, product announcement, feedback survey, newsletter).
2. Drag-edit blocks in the canvas, or chat with the AI ("make the CTA orange", "add a testimonial section").
3. Preview switches between desktop / mobile / dark.
4. Click "Send test" to ship the rendered HTML to your inbox via Resend.

## Architecture

```
PuckData ──► email block React tree ──► @react-email/render ──► HTML
   ▲                                                              │
   │                                                              ▼
chat msg ──► /api/plan (Claude) ──► op stream ──► applyOps   iframe srcDoc
                                                              │
                                                              ▼
                                                       /api/send (Resend)
```

Block schemas (Zod) are shared between the Puck config and the planner prompt, so the AI proposes ops that always round-trip through the canvas cleanly.
