# Braze publishing

Publish one email design to many brands in Braze, each with its own theme, while keeping shared brand pieces (header, footer, optionally styles) in one place.

> **Status:** prototype. Everything runs against a **simulated Braze** by default. The real-Braze path is implemented but has **not yet been run against a real workspace** — see [Not verified yet](#not-verified-yet).

## Why

Braze's drag-and-drop editor themes one email at a time (global style settings, one custom font). It has no shared components with per-brand tokens, and its reusable Content Blocks are limited to one row. Supporting 20+ brands from one design system there means maintaining every component once per brand.

This builder takes the opposite approach: **the builder is the source of truth, Braze receives compiled output.**

## What gets published

For each selected brand, in that brand's Braze workspace:

| Braze object | Name | Contents |
|---|---|---|
| Content Block | `es_<brand>_header` | Brand logo bar |
| Content Block | `es_<brand>_footer` | Legal name, address, social links, `{{${unsubscribe_url}}}` |
| Content Block (optional) | `es_<brand>_style` | Brand colors and fonts as Liquid variables — see [Live brand styles](#live-brand-styles-experimental) |
| Email template | `[<brand>] <key>` | Subject, preheader, brand-themed HTML body, plain-text body |

The header and footer come from the **brand registry**, not from the email being edited. In the template body they're replaced by `{{content_blocks.${es_<brand>_header}}}` / `…_footer}}}`, which Braze resolves at send time.

Everything the builder creates is prefixed `es_` so it can't collide with Content Blocks teams create by hand.

### How Braze treats each object

| You change… | Published as | Effect in Braze |
|---|---|---|
| The email (copy, layout, subject) | Template update | Only **new** campaigns get it. Campaigns copy a template when they're created. |
| A brand's header/footer | Content Block update | Every **live** message including the block sends the new version, immediately. |
| A brand's colors/fonts (live styles on) | Stylesheet block update | Restyles every email of that brand, live ones included. |

### What it doesn't do

- **Create or send campaigns.** Braze has no API for creating campaigns or Canvases; marketers create them in Braze and pick the template.
- **Make templates editable in Braze's drag-and-drop editor.** API-created templates are HTML templates. Edit in the builder and republish; edits made in Braze are overwritten.
- **Upload images.** Images must be at public `https://` URLs (set `ASSET_BASE_URL` to absolutize root-relative paths).

## Publishing flow

1. **Publish to staging.** Creates `[<brand>] <key> (staging)` and `es_<brand>_*__staging` blocks. The staging template only references staging blocks, so it can be tested in Braze without touching live sends.
2. **Promote to production.** Reads what's staged *in Braze* and writes it to the production names. It deliberately doesn't re-render the builder document, which may have changed since it was tested. Promoting a brand with nothing staged is refused.

Publishing is idempotent: templates and blocks are matched by name, unchanged content is skipped, and blocks are written before the template that references them.

### Checks before anything is sent

Errors skip the brand; warnings are shown but don't block.

| Check | Level |
|---|---|
| Subject empty | error |
| Template body over 400 KB / Content Block 50 KB or over (Braze limits) | error |
| Relative image/link URL, or `http://` image | error |
| Unclosed Liquid tag | error |
| Sent HTML over ~102 KB (Gmail clipping) | warning |
| Bare `{{first_name}}` (Braze renders it empty) | warning |
| No `{{${unsubscribe_url}}}` link | warning |
| Placeholder URLs (`placehold.co`, `example.com`) | warning |
| References a Content Block that isn't published from here | warning |

## Personalization

Write Braze Liquid in any text field, link, subject or preheader:

| Want | Write |
|---|---|
| Standard attribute | `{{${first_name}}}` |
| Custom attribute | `{{custom_attribute.${tier}}}` |
| Fallback | `{{${first_name} \| default: 'there'}}` |

- **Rendering keeps Liquid intact.** React escapes quotes, which would turn `default: "there"` into `default: &quot;there&quot;`. Liquid spans are swapped for inert tokens before rendering and restored afterwards (`lib/liquid.ts`).
- **Preview values never reach Braze.** "Preview as" profiles and `{{ vars }}` test values are stripped before compiling.
- **Preview is partial by design.** It evaluates attributes, custom attributes, Content Blocks (nested once, like Braze), `{% assign %}`, and the `default`, `upcase`, `downcase`, `capitalize` filters. Anything else (`{% if %}`, Connected Content, catalogs, other filters) is shown as "not evaluated" rather than guessed.

## Live brand styles (experimental)

With **Live brand styles** on, colors and fonts aren't baked into the HTML. The brand's stylesheet block assigns them as Liquid variables:

```liquid
{% assign es_brand = '#0e7490' %}{% assign es_font_body = '&quot;Inter&quot;, sans-serif' %}…
```

and every inline style uses them (`style="background:{{es_brand}}"`). The template includes the stylesheet block first, so the variables exist before any use. Changing a brand token then updates **only** the stylesheet block; every template stays byte-identical.

Two cautions:

- It relies on variables assigned inside a Content Block being visible to the including template — **unverified** in a real workspace.
- For regulated content it lets an approved email change appearance after approval. Decide on a policy (and probably approve the stylesheet itself) before using it for real sends.

## Setup

Simulated Braze needs no configuration. Its state lives in `.braze-dry-run/` (git-ignored); inspect or reset it with `GET` / `DELETE /api/braze/dry-run`.

For a real workspace, in `.env.local`:

```bash
BRAZE_MODE=live
BRAZE_REST_ENDPOINT=https://rest.iad-01.braze.com   # your cluster
BRAZE_API_KEY_NA=...                                # one per workspace: BRAZE_API_KEY_<WORKSPACE>
# BRAZE_REST_ENDPOINT_EMEA=...                      # per-workspace endpoint override, if clusters differ
ASSET_BASE_URL=https://cdn.example.com              # absolutizes root-relative asset paths
```

The API key needs `templates.email.create`, `templates.email.update`, `templates.email.list`, `templates.email.info`, `content_blocks.create`, `content_blocks.update`, `content_blocks.list` and `content_blocks.info`. Use **Check connection** in the publish dialog to verify; template writes are only verified on first publish, because Braze has no delete endpoint and a test would leave a template behind.

Real requests retry on rate limits (honoring `Retry-After` / `X-RateLimit-Reset`), retry server errors only for reads and updates (never creates), and are logged to `.braze-activity/<workspace>.jsonl`.

To test failure handling in the simulator: `BRAZE_DRY_RUN_DENY=content_blocks.update` makes it refuse that permission.

## Brands

`lib/brand-seeds.ts` holds 21 **fixture** brands across 3 workspaces (`na`, `emea`, `apac`) to exercise the multi-brand path. Each seed sets a base family (typography, radii, spacing), a primary color, legal details and a workspace; `lib/themes.ts` derives the theme and `lib/brands.ts` adds the shared header/footer. Replace the seeds with real brands — ideally generated from your design-token source.

## Code map

| Path | Role |
|---|---|
| `lib/braze/compile-react-email.ts` | Builder document → per-brand package. **The only editor-specific file** — a different editor (e.g. Beefree) replaces just this. |
| `lib/braze/package.ts` | Package shape, validation, recipient preview |
| `lib/braze/publish.ts` | Idempotent publish of packages |
| `lib/braze/promote.ts` | Rebuild a production package from what's staged in Braze |
| `lib/braze/api.ts` | Typed client for the template and Content Block endpoints |
| `lib/braze/transport.ts` | Real HTTP transport and the simulated Braze |
| `lib/braze/connection.ts` | API key permission check |
| `lib/braze/naming.ts` | Names, prefixes, staging suffix |
| `lib/braze/config.ts` | Simulated vs real, credentials, activity log |
| `lib/liquid.ts` | Liquid protection and preview evaluator |
| `pages/api/braze/*` | `publish`, `promote`, `connection`, `dry-run` endpoints |
| `components/PublishModal.tsx` | Publish dialog |

Tests: `pnpm test` (`tests/`).

## Not verified yet

Needs a real Braze workspace:

1. Variables assigned in a Content Block are visible to the including template (live styles depend on it).
2. Response shapes of the update endpoints.
3. Braze accepts an unsubscribe link that lives inside a Content Block.
4. Templates built in Braze's drag-and-drop editor don't appear in the list endpoint — publishing finds existing templates by name, so this matters.

## Known gaps

- The canvas shows the email's own header/footer; publishing uses the brand's shared ones.
- Switching "Preview as" remounts the editor and likely clears the AI chat history.
- No approvals/audit trail, localization (market/language), DAM integration, or rendering QA (Outlook, dark mode) — needed for production use at scale.

For alternatives to building this further, see [paid alternatives](alternatives.md).
