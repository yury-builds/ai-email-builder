# Paid alternatives to explore

Researched **October 2026**. Prices are vendor list prices where published and change often — confirm with vendors. Items marked *unverified* couldn't be confirmed from a primary source.

The core requirement these are judged against: **one design system of themable components used across 20+ brands, published to Braze**, with Liquid personalization preserved and marketers comfortable with the visual editing.

## Two paths

- **Build** on an embeddable editor: keep this repo's Braze publishing layer (`lib/braze/`) and replace the Puck canvas. Only `lib/braze/compile-react-email.ts` is editor-specific.
- **Buy** a SaaS builder that already syncs to Braze.

## Embeddable editors (build path)

| Option | Multi-brand theming | Braze | Price (list) | Notes |
|---|---|---|---|---|
| **[Beefree SDK](https://developers.beefree.io/pricing-plans)** | Per-brand `contentDefaults`, fonts and CSS at init; custom rows per brand; [synced rows](https://docs.beefree.io/beefree-sdk/rows/reusable-content/sync) that can be locked (Core+); [Brand Style API](https://docs.beefree.io/beefree-sdk/apis/content-services-api/brand-style-management) restyles existing templates | Via your backend (this repo's publish layer) | Essentials $400/mo · Core $1,200/mo · Superpowers $3,000/mo · Enterprise custom | Most mature marketer UX; very active (release on 2026-10-20). Often said to power Braze's own editor — *unverified*. |
| **[Unlayer](https://unlayer.com/pricing)** | Per-tenant appearance, fonts, brand kits; limited custom tools by plan; brand style guide is Enterprise-only | Via your backend | Launch $250/mo · Scale $750/mo · Optimize $2,000/mo | Cheaper; no design tokens as such. |
| **[Stripo Plugin](https://plugin.stripo.email)** | Synchronized modules, shared module folders, brand guideline kits; custom-block extensions API in beta | Via your backend (Braze export is a feature of the Stripo app, not the plugin) | *Unverified* (~$100–550/mo per third-party source) | Strong Outlook output. |
| **[GrapesJS Studio SDK](https://grapesjs.com/pricing)** | MJML email projects; theming via global styles — *unverified* | Via your backend; Liquid handling *unverified* | Enterprise license, on request | Most control, most build work. Open-source GrapesJS + grapesjs-mjml is free but DIY. |
| [Chamaileon SDK](https://chamaileon.io/sdk/) | Reusable blocks; brand-locking per vendor | HTML export | Free tier; paid from ~$200/mo — *unverified* | Low recent activity. |

Not recommended: EmailBuilder.js and Easy Email (open source, low activity).

## SaaS builders with Braze integration (buy path)

| Option | Why look | Braze integration | Watch out for |
|---|---|---|---|
| **[Copy Pastd](https://braze.com/docs/partners/message_orchestration/templates/copy_pastd)** | Closest fit: brand stylesheets cascade to every block; stylesheet and block library synced as Braze Content Blocks; generates Content Block, Connected Content and catalog Liquid | Templates + Content Blocks, idempotent sync | Young vendor (Braze partner listing June 2026); pricing not public; one Braze instance per team; style edits hit scheduled sends |
| **[Dyspatch](https://www.dyspatch.io/partners/braze/)** | Mature coded-block themes, guardrails, revision history; theme-level logos for multi-brand (Sep 2025); AI features | Template sync with localization | Confirm Content Block support; enterprise pricing |
| **[Knak](https://knak.com/integrations/knak-braze/)** | Enterprise brand governance, locking, approvals | One-click template sync | Liquid handling not documented; enterprise pricing |
| **Stensul** | Enterprise governance and approvals | Template export | Enterprise pricing |
| **[EmailShepherd](https://braze.com/docs/partners/message_orchestration/templates/emailshepherd)**, Better Email, Mailizio | Email-design-system / locked-component builders; Better Email has shared blocks and styles; Mailizio exports Content Blocks | Template export | Smaller vendors; quote-based |
| **[Stripo](https://braze.com/docs/partners/message_orchestration/templates/stripo/)** (app) | Cheaper visual editor | Template export (replaces same-name templates) | Weaker design-system theming |
| **[Email Love](https://help.emaillove.com/plugin/export/braze)** | Design in Figma, export to Braze | Template export with translation tags | Requires an Email Love footer; marketers work in Figma |

Full list of Braze template partners: [braze.com/docs/partners/message_orchestration/templates](https://braze.com/docs/partners/message_orchestration/templates/).

## Braze itself

As of October 2026: global style settings remain the theming mechanism (per email, per workspace); Content Block width setting (Feb 2026); Operator AI generally available 2026-09-17 (creates/edits drag-and-drop designs from prompts). No per-brand style kits or synced rows. Sources: [drag-and-drop editor](https://braze.com/docs/user_guide/message_building_by_channel/email/drag_and_drop/), [release notes 2026-09-17](https://www.braze.com/docs/releases/2026/9_17_26).

## Questions to ask every vendor

1. How do you represent 20+ brands — one theme per brand from shared components, or copies?
2. What lands in Braze — templates only, or Content Blocks too? Do shared-component edits reach live sends?
3. Does Liquid survive export byte-for-byte, including quotes and Liquid inside `href`/`src`?
4. Multiple Braze workspaces (per brand / region) from one account?
5. Approvals, audit trail and version history (needed for regulated content review)?
6. Localization: markets and languages without duplicating every template?
7. DAM integration and image hosting?
8. What happens to edits made directly in Braze?

## Suggested evaluation

Pilot 3 brands × 2 markets for two weeks, including one full approval cycle. Score: Liquid round-trip, shared footer propagation via Content Blocks, multi-workspace publishing, and marketer ratings of the editor. Compare against this prototype with Beefree SDK in place of Puck.
