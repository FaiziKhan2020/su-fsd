# R&D Pipeline OS — Technical Brief

**Owner:** Chesky
**Status:** Working prototype, ready for engineering implementation
**Stack target:** Vercel · n8n · Claude API · (TBD: data store, auth)

---

## 1. What this is

R&D Pipeline OS is the system of record for moving a supplement product from **idea → niche analysis → approval → build → production → launched/post-launch**. It replaces a Slack list that became unmanageable.

Two surfaces:
- **Desktop web app** — full editor / control surface for everyone on the team (sourcing, design, listing, finance, overseer).
- **Mobile companion** (iOS-first PWA, can become native React Native later) — read + react. Approve, comment, capture ideas. Built for Chesky.

---

## 2. The team & roles (data model anchors)

| Person | Handle  | Role |
|---|---|---|
| Chesky | `@chesky` | Overseer — final approver, runs the system |
| Joel   | `@joel`   | Finance / Purchasing partner — co-approver on niche reviews |
| Malik  | `@malik`  | Niche & Research lead — drives Stage 1–2 |
| Ronel  | `@ronel`  | Purchasing — owns Sourcing stream + POs |
| Esty   | `@esty`   | Designer — labels, cartons, inserts |
| April  | `@april`  | Catalog lead — listing copy, KW research |
| Paresh | `@paresh` | Main image |
| Qaiser | `@qaiser` | Gallery + A+ content |

Approvals are **dual-sign** (Chesky + Joel) for niche → build transitions.

---

## 3. Pipeline stages

Stages are linear, with one back-channel (Hold/Park):

```
Idea  →  Niche  →  Approval  →  Build  →  Production  →  Launched
                ↘                                     ↘
                  Hold/Park                             Discontinued
```

Each stage has a **target cycle time** (in `data/products-v3.js` per product). When a card exceeds it, the cycle-time band on the board card turns warn → err.

### Stage details

**Idea** — fast capture. Working name, brand, format, why-now. No commitment yet. Promoted to Niche by Malik or Chesky.

**Niche** — has two sub-states:
- `researching` — Malik working on the niche analysis doc
- `parsed` — doc uploaded, AI-parsed, ready for review

**Approval** — dual approval gate (Chesky + Joel). Once both sign, auto-advances to Build.

**Build** — three parallel streams running concurrently:
- **Sourcing** (owner: Ronel) — RFQ, sample, BOM, PO
- **Design** (owner: Esty) — Label / Box / Insert (three artifact families)
- **Listing** (owner: April) — title, bullets, copy → Paresh main image → Qaiser gallery + A+ content

Each stream has independent status & % complete. Build is "done" when all three streams are ≥ approved/live.

**Production** — PO sent, in transit, at customs, received. Light surface.

**Launched** — live on Amazon. The **Live tab** shows thesis vs. actual (revenue, ranking, CVR).

---

## 4. Data model (high level)

A product is roughly:

```js
{
  id, code, name, brand, type, // type = capsule/liquid/powder/gummy/topical/food/softgel/tea
  stage,                        // see above
  owner,                        // primary point of contact
  waitingOn,                    // who blocks progress (e.g. "chesky" for approval)
  lastActivity, urgency,        // signals
  cycleTime: { inStage, target }, // for cycle-time band
  
  // Stage-specific
  synopsis, recommendation, nicheVerdict,    // niche + approval
  market: { sv, revenue, trend, cvr },        // niche
  approvals: { chesky: {decision, at, note}, joel: {...} },
  nicheSubState, docUploadedDaysAgo,         // niche
  
  streams: {                                  // build
    sourcing: { owner, status, pct, lastNote },
    design:   { owner, status, pct, lastNote },
    listing:  { owner, status, pct, lastNote },
  },
  blocker: { stream, reason, days },
  
  bom: [{ component, supplier, costPer, moq, leadTime }],  // sourcing
  packaging: { label, box, insert },          // design — three artifact types
  listing: { title, bullets, asin, upc, mainImage, gallery, aplus }, // listing

  // Post-launch
  thesis: { revenue, margin, cvr, keywords },
  actual: { revenue, margin, cvr, keywordHits, keywordMisses },
  liveVerdict, // BEAT / MISS / ON-TARGET
  
  // Comments — single unified stream, topic-tagged
  comments: [{ at, who, text, topic /* sourcing|design|listing|niche|general */ }],
  
  // AI nudges (computed, but cached)
  aiNudges: [{ severity, headline, detail, actions }],
}
```

There's also **watchlist** (competitors, ingredients, trend keywords — outside the pipeline radar) and **idea inbox** (pre-niche capture).

---

## 5. The AI angle — what Claude does in this system

We're using Claude API for **four discrete jobs**, all triggered via n8n workflows:

### 5.1 Niche analysis parser
**Trigger:** A `.pdf` or `.xlsx` niche analysis doc is uploaded to a product (`niche` stage, sub-state `researching`).

**Pipeline:**
1. n8n picks up the upload (via webhook or storage trigger)
2. Extracts text (n8n PDF/XLSX extraction nodes)
3. Calls Claude with a structured-extraction prompt:
   - Verdict (Proceed / Pivot / Kill)
   - Market data (search volume, est. revenue, trend, CVR)
   - Pricing recommendation + margin estimate
   - Top competitors (ASINs)
   - Key risks
4. Writes parsed JSON back to product record
5. Flips sub-state from `researching` → `parsed`
6. Slack-pings Chesky + Joel: "Niche analysis ready for review"

**Why Claude:** the docs are unstructured (Malik's free-form analysis), but the output schema is rigid. Claude does this in one shot reliably.

### 5.2 Proactive nudges (AI rail in dossier)
**Trigger:** Cron, every 30 min. Or on-demand when a dossier opens.

**Pipeline:**
1. n8n queries products with `lastActivity > 3d` AND `stage in (build, niche, approval)`
2. For each product, sends Claude:
   - Product card + last 7 days of activity log
   - Stream statuses + cycle-time vs. target
   - Recent comments
3. Claude returns 0–3 nudges per product:
   ```json
   { "severity": "med", "headline": "Esty's label is 4d in review",
     "detail": "Last reply from her was 'awaiting your eyes'. Likely waiting on you.",
     "actions": [{"label": "Ping Esty", "action": "comment", "to": "esty"}] }
   ```
4. Cache on product record. Surface in dossier AI rail.

**Why Claude:** these are judgment calls, not metric thresholds. "Stuck because waiting on you" vs. "stuck because vendor is slow" need natural-language reasoning.

### 5.3 Daily push queue (the home screen)
**Trigger:** Cron, 7:00 AM daily. Or pull-to-refresh.

**Pipeline:**
1. n8n fetches all open products + their AI nudges + Chesky's calendar (optional)
2. Sends Claude a "rank these in priority order for Chesky today" prompt with:
   - Approvals waiting (highest priority by default)
   - Blockers > 5 days
   - Mentions of @chesky
   - Cycle-time over-target items
3. Claude returns ordered queue with `focus` hints:
   ```json
   [{ "productId": "B-301", "priority": 1, "action": "Decide go/no-go on label v3",
      "why": "Esty waiting 3d", "focus": { "tab": "decide" } }]
   ```
4. Saved as today's queue. Surfaces on Home screen (desktop + mobile).

**Critical:** the `focus` hints drive deep linking. Tapping a queue item lands directly on the right tab/section, not the dossier root.

### 5.4 Live thesis vs. actual diagnosis
**Trigger:** Weekly cron for launched products. Or on-demand via Live tab.

**Pipeline:**
1. n8n pulls Amazon performance (revenue, CVR, keyword ranks) — could be Helium10 / Jungle Scout API or scraped
2. Sends Claude the thesis (what we predicted at niche stage) + 30-day actual
3. Claude returns a verdict + 1-paragraph diagnosis:
   ```json
   { "verdict": "MISS 0.6×", "diagnosis": "Listing converts at 7% vs. 11% thesis.
     Likely: main image doesn't show 'fast-acting' angle that won the niche analysis." }
   ```
4. Surfaces on Live tab + can trigger an AI nudge on the product

**Why Claude:** "diagnose why we missed" is a writing task, not a calculation. Numbers are easy; the *why* is what owners need.

### 5.5 (Optional, later) — Conversational query
A free-text "ask the pipeline" box: "what's stuck the longest in design?", "how much have we spent on Wuxi this quarter?". Claude with tools/function calling pulling from the data layer.

---

## 6. Slack integration

Slack is the notification surface. **Rules** (in the Rules view) define what fires:

```yaml
- when: approval_needed
  to: [chesky, joel]
  channel: dm
- when: blocker_aging_over: 5d
  to: stream_owner + chesky
  channel: dm
- when: niche_doc_parsed
  to: [chesky, joel]
  channel: "#rd-approvals"
- when: launched_thesis_miss
  to: [chesky]
  channel: "#rd-launches"
- when: comment_with_mention
  to: mentioned_user
  channel: dm
```

n8n executes these. The Rules view in the desktop app shows **which rules fired in the last 7 days** so you can audit/preview before flipping new ones on.

---

## 7. The desktop app — view inventory

Single-page React app. Three top-level sections in the left rail:

### Workspace
- **Home / Push Queue** — today's prioritized list. Single column. Click → dossier with focus hint.
- **Pipeline** — Kanban by stage. Stream-aware cards (avatars per stream, cycle-time band, blocker chip).
- **Idea Inbox** — list of unstaged ideas. "Promote to Niche" CTA.
- **People** — load per person (open count, stuck count). Click → filtered pipeline.
- **Activity** — global feed of changes (who/what/when).
- **Watchlist** — competitor ASINs, ingredients-to-watch, trend keywords. Outside-the-pipeline radar.

### System
- **Rules** — Slack notification rules + 7d preview feed.
- **Slack panel** — mock channel feed showing the Slack side of recent events.

### Per-product Dossier (right rail or full-screen)
Tabs (stage-aware):
- **Overview** — persistent thesis card, stage hero with primary action, dual-approval card if applicable.
- **Niche** — uploaded doc viewer, AI-parsed structured analysis, market data.
- **Streams** — sourcing/design/listing detail (only on Build).
- **Sourcing** — BOM table, suppliers, POs, lead times.
- **Design** — three artifact families (Label / Box / Insert) with version history per file.
- **Listing** — title, bullets, ASIN/UPC fields, image grid (main/gallery/A+).
- **Live** — thesis vs. actual side-by-side. Only on Launched. Verdict + diagnosis.
- **Activity** — per-product change log.
- **Comments** — unified stream, topic-filterable (sourcing/design/listing/niche/general).

### Always-available
- **AI rail** in dossier — proactive nudges with one-click actions (Ping owner, Move to Hold).
- **Comments** with @-mention — when triggered from a nudge or stream, pre-fills `@person `.

---

## 8. The mobile companion

iOS-first. PWA acceptable for v1; React Native later. **Read + react only — no full editing.**

Screens:
- **Inbox** (default) — feed of items needing Chesky, sorted by urgency. Three kinds: Approval / Mention / Stuck.
- **Product Detail** — stage-aware tabs (Decide / Overview / Streams / Comments). Tapping an inbox item lands on the right tab via the same `focus` hint as desktop.
- **Comment Composer** — full screen, with `@` mention picker. Quick-reaction chips ("Looks good", "Need more info", etc.).
- **Idea Capture** — minimal form, 4 fields. Saves to Idea Inbox.
- **Pipeline** — stage filter + light list view. Tap → detail.
- **Ideas** — list of unstaged ideas. + button to capture new.
- **People** — load per person.
- **Me** — settings (notifications, quiet hours, briefing time).

**Specifically dropped on mobile:**
- BOM editing
- Listing copy editing (read-only with "open on desktop" link)
- Live thesis-vs-actual side-by-side (verdict only, full table on desktop)
- Niche doc upload (mobile-uploaded files routed to desktop AI parse pipeline)

---

## 9. Implementation notes for the dev

### 9.1 What's in the prototype
- `R&D Pipeline OS v3.html` — full desktop app. React via Babel inline; no build step yet. All views functional with mock data.
- `R&D Pipeline Mobile.html` — full mobile app, in iOS frame. Same data model, scaled-down feature set.
- `data/products-v3.js` — the canonical mock data. **Use this as the schema source of truth.**
- `components/v3/` — component code. The prototype is structured so each major feature is one file (board, dossier, home, watchlist, etc.).
- `mobile/app.jsx` — the entire mobile app in one file (router + screens).
- `styles/app-v3.css` — design tokens + component styles. Tokens at the top.

### 9.2 What to build first (suggested order)

1. **Data layer + auth.** Pick a backend (Supabase / Firebase / custom Postgres). Migrate the schema from `products-v3.js`. Auth: Slack SSO since the team's already there.
2. **Read-only desktop.** Wire the existing UI to the live data layer. No editing yet.
3. **Slack notifications via n8n.** The Rules → n8n → Slack pipeline. Test with read-only data.
4. **Niche doc parser (Claude job 5.1).** First AI integration — high-value, well-defined I/O.
5. **Editing.** Inline-editable fields, dual approval flow, comments with @-mentions.
6. **Push queue (Claude job 5.3).** Daily cron + on-demand refresh.
7. **AI nudges (Claude job 5.2).** Per-product, cached, with action hooks.
8. **Mobile PWA.** Same data layer, mobile UI from prototype.
9. **Live tab + thesis diagnosis (Claude job 5.4).** Last because it requires Amazon performance data.

### 9.3 Tech stack as discussed

- **Vercel** — hosting + deploy pipeline (Next.js or plain React/Vite app). CDN, preview deploys per PR, edge functions for the Claude/n8n proxy.
- **n8n** — orchestration for all AI jobs + Slack webhooks + cron schedules
- **Claude API** — `claude-sonnet-4-5` recommended for the parsing jobs, `claude-haiku` is fine for the nudges/queue ranking (cheaper, faster, plenty smart for those tasks).
- **Slack** — primary notification surface + auth
- **Storage** — wherever niche docs live (S3 / Google Drive)
- **Amazon performance data** — Helium10 / Jungle Scout / SP-API (for the Live tab, future)

### 9.4 Things to NOT skip

- **The `focus` hint pattern.** Push queue items, AI nudges, Slack deep links — they all carry a focus target ({tab, stream, replyTo}). The dossier needs to honor this. Without it, "tap → dossier root → hunt for the thing" makes the system feel slow.
- **Cycle-time targets per product.** Not per-stage globally. Different categories take different times. Store target in the product record, not a constant.
- **Unified comments stream with topic tag.** Don't split into separate threads per artifact. One product, one conversation, filterable. This was a deliberate decision after looking at Slack — context switches kill comprehension.
- **Dual-approval as a hard gate.** Don't let single-sign through.
- **AI nudge actions.** "Ping owner" must actually do something (open composer with @-fill). Read-only AI advice is useless.

### 9.5 Things to defer

- Drag-reorder / drag-promote on the board (nice but slow to build correctly)
- File diff viewer (we mocked it for spec sheets — defer until we know the actual file formats)
- Custom views per person (we discussed; agreed everyone sees the same UI for v1)
- Mobile native shell (PWA first)

---

## 10. Open questions for the dev

1. **Auth provider?** Slack SSO is clean; Google Workspace is also fine if the team uses Workspace.
2. **Storage for design files & niche docs?** Need a single source. S3 + signed URLs is simple. Google Drive integration is friendlier for non-technical team.
3. **Amazon data source for Live tab?** Helium10 has the cleanest API. SP-API is more correct but heavier.
4. **n8n self-hosted or cloud?** Self-hosted (Docker on a VPS) is what I'd suggest — full control, low cost, sensitive prompts stay in-house.
5. **Mobile push notifications?** PWA push works on iOS 16.4+ but is flaky. May want to bite off React Native earlier than expected if mobile is critical.

---

## 11. Files in this handoff

```
R&D Pipeline OS v3.html         ← Desktop app (entry)
R&D Pipeline Mobile.html        ← Mobile app (entry)
data/products-v3.js             ← Schema + mock data (source of truth)
components/v3/                  ← Desktop component code
  app.jsx, shell.jsx, board.jsx, home-people.jsx,
  dossier.jsx, dossier-parts.jsx, niche-flow.jsx, watchlist.jsx
styles/app-v3.css               ← Design tokens + styles
styles/app.css                  ← Base tokens (extend, don't override)
mobile/                         ← Mobile app
  app.jsx, data.jsx, ios-frame.jsx
tweaks-panel.jsx                ← Demo control panel (can remove for production)
README.md                       ← This file
```

To run the prototype locally:
```
python3 -m http.server 8000
# open http://localhost:8000/R%26D%20Pipeline%20OS%20v3.html
```

No build step. Babel transpiles in-browser. The production build will obviously bundle.

---

**Contact:** Chesky for product/UX questions. The prototype shows intended behavior — when in doubt, the prototype wins over this doc.
