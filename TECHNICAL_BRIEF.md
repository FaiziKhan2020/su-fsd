# R&D Pipeline OS — Technical Brief for Engineering

**Audience:** Bill (lead engineer)
**Status:** Design-locked, ready to scope
**Last updated:** 2026-05-03

---

## TL;DR

We're building an **internal R&D operations app** for Homeious. It moves a supplement product from "idea" → "niche analysis" → "approval" → "build" → "production" → "live", coordinating four functional owners (Malik, Ronel, Esty, April) with two approvers (Joel, Chesky) and an AI assistant that summarizes diffs, parses PDFs, and surfaces what's stuck.

This is **not** a marketplace, not a public product. ~10 internal users. Read-heavy with bursty writes around approvals + spec changes.

**Stack you already use is right:** Next.js + Vercel. Add Supabase (Postgres + Storage + Auth), Anthropic SDK (server-side), Resend, Slack Web API. ~$120–270/mo all-in once running.

---

## 1. The People (Hard-coded Roles)

These are the only roles in the system. Every record in the DB references one of these IDs. Hardcode them — don't build a generic role system.

| User ID | Name | Role | What they do | Approval power? |
|---|---|---|---|---|
| `chesky` | Chesky | Overseer | Triages everything, approves niche analyses, keeps things moving | **YES** — required on niche approval |
| `joel` | Joel | Finance / Co-Owner | Approves margin + cost rationale | **YES** — required on niche approval |
| `malik` | Malik | R&D Lead | Generates niche analyses (with Claude PDF parsing), proposes ideas | No |
| `ronel` | Ronel | Sourcing | Quotes vendors, locks suppliers, writes spec sheets | No (writes specs, doesn't approve products) |
| `esty` | Esty | Designer | Label, box, insert design across versions | No |
| `april` | April | Listing | Amazon copy + listing submission, briefs to Paresh/Qaiser | No |
| `paresh` | Paresh | Photographer | Main hero image (1 per product) | No |
| `qaiser` | Qaiser | Visual designer | Gallery (6 slots) + A+ Content (3 modules) | No |

**Approval rule:** Niche analyses require **BOTH** Chesky AND Joel to approve before the product moves from `niche-review` → `build`. This is hard-wired, not configurable.

---

## 2. Stages (The Pipeline)

A product moves through these stages in order. Stage changes are events that trigger notifications, AI nudges, and Slack pings.

| Stage | Owner | What happens | Exit trigger |
|---|---|---|---|
| `idea` | Malik (or anyone, via Idea Inbox) | Pure capture. Name, brand, type, why-now blurb. | Malik picks it up → assigns niche analysis |
| `niche-research` | Malik | Malik researches and writes the niche analysis (mostly outside the app) | Malik uploads a PDF → AI parses → enters `niche-review` |
| `niche-review` | Chesky + Joel | Both must approve, reject, or request changes | Both approve → `build`. Either rejects → `archived`. Either requests changes → kicked back to Malik |
| `build` | Ronel + Esty + April (3 parallel streams) | Sourcing, Design, Listing run concurrently | All three streams hit "Approved" → `production` |
| `production` | Manufacturer (external) | PO is sent, manufacturer makes the product | Goods received → `live` |
| `live` | April (post-launch) | ASIN is up, sales tracked | (post-launch state, no further stage) |
| `archived` | — | Rejected niches, killed products | (terminal) |

**Sub-state inside `niche-research`:**
- `researching` — Malik is working, no doc yet
- `parsed` — PDF uploaded, AI extracted structured data, awaiting Malik's "Send to review"

---

## 3. The Three Build Streams (Run Concurrently)

When a product enters `build`, three streams kick off simultaneously. **Each has its own owner, its own status, its own progress %**. The product can't move to `production` until all three are `Approved`.

| Stream | Owner | Status values | Versioned artifacts |
|---|---|---|---|
| `sourcing` | Ronel | `Quoting` → `Locked` → `Ordered` → `Backorder` (problem state) → `Approved` | **Spec sheet versions** (full BOM snapshots, used for AI diff) |
| `design` | Esty | `Drafting` → `In review` → `Changes requested` → `Approved` | Label, box, insert — each independently versioned |
| `listing` | April | `Drafting` → `Submitted` → `Approved` (by Amazon) → `Live` | Title/bullets/keywords copy versions, plus per-slot image deliveries |

**Key insight: streams are independent but block at the gate.** Esty can be done a week before Ronel — that's fine. Design status `Approved` just means Esty is done. Production gate only opens when all three say Approved.

---

## 4. Triggers — What Causes What

This is the most important section. **Every action in the app should fire a deterministic side effect.** Don't make these configurable; they are the workflow.

### 4.1 Approval triggers

| When this happens | …this happens automatically |
|---|---|
| Malik uploads a niche analysis PDF | (a) Server saves PDF to Supabase Storage. (b) Server calls Claude to extract structured fields (ingredients, dose, competitors, retail price, margin). (c) Product moves to `niche-research / parsed` sub-state. (d) Slack DM to Malik: "AI parsed your niche, review and send to Chesky/Joel" |
| Malik clicks "Send to review" | (a) Stage moves to `niche-review`. (b) Slack ping to **both** Chesky and Joel: "Niche review needed — {product name}" with a deep-link. (c) Both their mobile inboxes show the item. |
| Chesky approves on mobile | (a) Approval recorded. (b) **If Joel already approved**, stage moves to `build`, all 3 streams initialize at 0%, Slack pings Ronel/Esty/April. (c) **If Joel hasn't approved**, just record + post status to Joel: "Chesky approved {product}, you're next". |
| Either Chesky or Joel rejects | (a) Reason is **required** (modal blocks empty submit). (b) Stage moves to `archived`. (c) Slack DM to Malik with the reason. (d) Idea is searchable from Watchlist > Killed for future re-evaluation. |
| Either requests changes | (a) Reason required. (b) Stage stays in `niche-review` but `waitingOn` flips to `malik`. (c) Slack DM to Malik with the change request. |

### 4.2 Build-stream triggers

| When this happens | …this happens |
|---|---|
| Ronel saves a new spec sheet version | (a) Snapshot stored. (b) `currentVersion` pointer advances. (c) AI diff job queued (compare new vs previous). (d) Slack ping to Esty + April if formula or doses changed. (e) **If Ronel locks a version**, manufacturer email is generated as a draft (NOT sent automatically — Ronel must click "Send"). |
| Esty uploads a new label version | (a) File to Supabase Storage. (b) Version row created. (c) Slack ping to Chesky: "New label v{n} for {product}". (d) Stream status auto-advances `Drafting` → `In review`. |
| Chesky approves a label | Stream status → `Approved`. Check if all 3 streams approved → if yes, move to `production`. |
| April adds a copy version | New copy snapshot. Pre-flight scorecard recalculated. |
| April clicks "Submit to Amazon" | (a) Listing status → `Submitted`. (b) ~Asynchronously, Amazon API or manual update flips status to `Approved` then `Live`. (For v1, this is manual — April toggles it.) |
| Paresh or Qaiser delivers an image | Slot fills, version stamp recorded, brief shown alongside delivery. April gets a Slack ping. |

### 4.3 Aging / stuck triggers (cron-driven)

| Condition | Action |
|---|---|
| Niche review pending > 3 days | (a) AI nudge appears in Chesky's home rail: "Niche {product} aging in your queue, decide today?" (b) Slack DM. |
| Stream status unchanged > 5 days | (a) AI nudge to product owner: "{Stream} stuck for {n} days — ping {ownerName}?" (b) Mobile inbox surfaces it as `Stuck` item. |
| Spec sheet locked but no PO follow-up > 2 days | AI nudge to Ronel. |
| Product live but margin below thesis | (Live tab) — flag in red, AI nudge to Joel. |

These run as a **single hourly Vercel Cron job** (`/api/cron/aging-check`). Output is written to an `ai_nudges` table; UI reads from there.

### 4.4 Slack rules (configurable, for Notifications & Rules screen)

These are user-editable:
- "Notify #rd-launches when a product goes live"
- "DM Chesky when label v{n} is awaiting his sign-off"
- "Notify #sourcing when a vendor is dropped"

Stored in a `slack_rules` table. Each row: `{trigger_event, channel_or_user, message_template, active}`. The Activity table gets a tag for which rule fired so we can show "this would have fired" in the demo.

---

## 5. AI / Claude Integration — Where, How, How Much

**This is currently mocked in the prototype.** Every AI string in the UI is hardcoded JSON. In production, here's how each AI surface should be wired.

### 5.1 Pattern (apply to every AI call)

```
1. User action on frontend
2. Frontend → POST /api/ai/{surface} with context payload
3. Backend assembles full context from DB
4. Backend → Anthropic API (server-side, using ANTHROPIC_API_KEY env var)
5. Response stored in `ai_outputs` table with input hash, prompt version, cost
6. Frontend reads from `ai_outputs` (not Anthropic directly)
7. Subsequent identical requests hit cache, not Claude
```

**Three rules — non-negotiable:**

1. **Always cache.** Hash the input, store the output. Re-renders never re-call Claude. Saves money + gives audit trail.
2. **Force structured outputs.** For PDF parsing, spec diff, niche extraction — use Claude's tool-use mode to get JSON, not free-form text. Easier to render, no prompt injection.
3. **Always show "AI" badge.** Every AI block has a ✦ icon, "Pipeline AI" label, regenerate button, and "verify before acting" tooltip. Never let AI output look like ground truth.

### 5.2 The five AI surfaces

#### A. Niche analysis PDF parser
**Trigger:** Malik uploads PDF in niche-research stage.
**Model:** `claude-sonnet-4-5` (needs accuracy on numerical extraction)
**Prompt:** Extract structured fields from a supplement niche analysis. Return JSON via tool use.
**Output schema:**
```json
{
  "verdict": "PROCEED | PASS | EXPLORE",
  "thesis": "string, 1-2 sentences",
  "targetCustomer": "string",
  "ingredients": [{ "name": "string", "dose": "string", "rationale": "string" }],
  "competitors": [{ "name": "string", "asin": "string", "price": "$X.XX", "rating": 4.3, "reviews": 1234 }],
  "retailPrice": "$X.XX",
  "expectedMargin": "XX%",
  "complianceFlags": ["string"]
}
```
**Cost:** ~$0.05 per PDF (most are 2–6 pages)
**Storage:** Save the raw extraction in `niche_analyses.parsed_data` JSONB column.

#### B. Spec sheet diff summary
**Trigger:** When viewing two spec sheet versions side-by-side, OR when Ronel saves a new version (pre-compute against previous).
**Model:** `claude-haiku-4-5` (fast, cheap, this is summarization)
**Prompt:** "Given two spec sheet versions, summarize what changed in plain English in 2 sentences. Flag if manufacturer notification is required (yes/no + why)."
**Input:** Both ingredient arrays.
**Output:** `{ summary: string, manufacturerNotify: boolean, reason: string }`
**Cost:** ~$0.001 per diff
**Cache key:** `hash(left.id + right.id)` — same comparison never re-calls.

#### C. Aging-item nudges (cron)
**Trigger:** Hourly Vercel Cron: `/api/cron/aging-check`
**Model:** `claude-haiku-4-5`
**Prompt:** "Given this list of products and their stuck states, for each one suggest the next action and who should be pinged. Be terse."
**Input:** Filter products where `now() - last_status_change > threshold`.
**Output:** Array of `{ productId, suggestedAction, suggestedTarget, urgency, message }`
**Storage:** Wipe & rewrite `ai_nudges` table each run (it's ephemeral).
**Cost:** ~$0.10/day total at our pipeline size.

#### D. Comment thread suggestions (optional, v2)
**Trigger:** User opens comments on a product, Pipeline AI offers a draft suggestion based on the thread.
**Model:** `claude-haiku-4-5`
**Prompt:** Last 10 comments + product status → suggest a next reply or @mention.
**Cost:** ~$0.001/open
**Note:** This is a polish feature, not v1 critical.

#### E. Listing copy scoring (v2 candidate)
**Trigger:** April clicks "Score this draft".
**Model:** `claude-sonnet-4-5`
**Prompt:** Score title/bullets/keywords against Amazon best practices + brand voice. Return per-line suggestions.
**Cost:** ~$0.02/score.

### 5.3 Token budget guardrails

- Set per-user daily Anthropic spend cap (e.g. $5/user/day) — hit cap → fall back to "AI temporarily unavailable" instead of charging
- Log every call with `userId, surface, inputTokens, outputTokens, costUsd`
- Weekly Slack report to Chesky: total spend + breakdown

### 5.4 What is NOT AI (don't be tempted)

- The pre-flight scorecard on listings — it's pure rules (char counts, byte limits, slot counts)
- The dual approval logic — it's hard rules
- The aging thresholds — fixed numbers, not learned
- The pipeline stage transitions — deterministic state machine

Keep AI to summarization, extraction, and suggestion. Don't put it on the critical path of state changes.

---

## 6. Stack Recommendation (Fully Specified)

You're already using Next.js + Vercel. Here's the full picture:

### 6.1 Confirmed stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend framework** | **Next.js 15+ (App Router)** | You're already on it. Server Components keep the dossier load fast. |
| **Hosting** | **Vercel** | You're already on it. Cron Jobs come built-in. |
| **Database** | **Supabase Postgres** | Heavily relational data (products → streams → versions → comments). Postgres + Supabase row-level security gets us auth-aware queries for free. |
| **File storage** | **Supabase Storage** | PDFs, label files, image deliveries, spec sheet attachments. Same vendor as DB = no extra account. |
| **Auth** | **Supabase Auth** (or Clerk if you prefer) | 10 users, magic-link email. Free tier covers us. Use SSO with Google Workspace if Homeious has one. |
| **AI** | **Anthropic SDK** (server-side only, never expose key to browser) | Direct calls. No LangChain — it's overkill for our 5 use cases and obscures debugging. |
| **Background jobs** | **Vercel Cron** | One hourly job for aging checks. Built into Vercel Pro. |
| **Notifications** | **Slack Web API** + **Resend** (email) | Direct Slack bot for in-channel + DM. Resend for the rare email (spec sheet to manufacturer, weekly digest). |
| **Realtime** (defer to v1.1) | **Supabase Realtime** | When Ronel saves a quote, April sees it without refresh. Skip until users complain. |

### 6.2 Libraries inside Next.js

| Need | Library |
|---|---|
| Forms | **React Hook Form + Zod** |
| Tables (the big sourcing/listing tables) | **TanStack Table** |
| Date handling | **date-fns** |
| Diff visualization (spec sheet compare) | **Custom — keep simple** (we have it working with plain JSX in the prototype) |
| File upload UI | **react-dropzone** |
| Markdown rendering (niche analysis pasted as markdown) | **react-markdown** |
| Avatars | Custom component (we have it — initials + tinted bg) |

### 6.3 What NOT to add

- ❌ **Redux / Zustand** — server components + URL state + React Query is enough. No global store needed for our scale.
- ❌ **MongoDB / Firebase** — wrong shape for relational data.
- ❌ **LangChain / LlamaIndex** — direct Anthropic SDK is simpler.
- ❌ **Custom auth** — never. Use Supabase Auth or Clerk.
- ❌ **Microservices** — this is one app. One Next.js project, one Postgres, done.
- ❌ **GraphQL** — REST + Server Actions. We have ~10 endpoints total.

### 6.4 Cost estimate (steady state, ~10 users)

| Service | Plan | Monthly |
|---|---|---|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| Anthropic | Pay-as-you-go | $50–200 (mostly cron + PDF parses) |
| Resend | Free tier | $0 |
| Slack API | Free | $0 |
| Domain + TLS | Built into Vercel | $0 |
| **Total** | | **$95–245/mo** |

Add ~$25 if you go with Clerk over Supabase Auth.

---

## 7. Database Schema (First Pass)

Use Supabase migrations. This is the seed schema; refine during implementation. **Use UUIDs for all IDs except for hardcoded user IDs (which match the role table above).**

```sql
-- Hardcoded users (seeded once, not user-creatable in v1)
CREATE TABLE users (
  id text PRIMARY KEY,                      -- 'chesky', 'joel', 'malik', etc.
  name text NOT NULL,
  role text NOT NULL,
  email text UNIQUE NOT NULL,
  slack_user_id text,
  avatar_color text                          -- for tinted-bg avatars
);

-- Products (the central entity)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,                 -- e.g. 'DON-LymphDrops'
  name text NOT NULL,
  brand text NOT NULL,                       -- 'DON' or 'PN'
  type text NOT NULL,                        -- liquid / capsule / powder / tea
  stage text NOT NULL CHECK (stage IN
    ('idea','niche-research','niche-review','build','production','live','archived')),
  niche_sub_state text,                      -- 'researching' | 'parsed' | NULL
  owner_id text REFERENCES users(id),
  created_by_id text REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  thesis_json jsonb,                          -- { synopsis, target_customer, why_now }
  health text DEFAULT 'ok',                   -- 'ok' | 'warn' | 'block'
  -- post-launch fields, only populated when stage = 'live':
  asin text,
  list_price numeric,
  unit_cost numeric,
  margin_pct numeric
);

-- Niche analyses (one product can have multiple, but only one 'current')
CREATE TABLE niche_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  version int NOT NULL,
  uploaded_by_id text REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now(),
  source_pdf_path text,                       -- supabase storage path
  parsed_data jsonb,                          -- the Claude extraction
  is_current boolean DEFAULT false
);

-- Approvals (one row per approver per niche review cycle)
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  approver_id text REFERENCES users(id),
  decision text CHECK (decision IN ('approve','reject','changes')),
  note text,                                  -- required for reject/changes
  decided_at timestamptz DEFAULT now()
);

-- Streams (initialized on entry to 'build')
CREATE TABLE streams (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  kind text CHECK (kind IN ('sourcing','design','listing')),
  owner_id text REFERENCES users(id),
  status text NOT NULL,
  pct int DEFAULT 0,
  last_note text,
  last_updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, kind)
);

-- Spec sheet versions (sourcing stream's versioned artifact)
CREATE TABLE spec_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  version int NOT NULL,
  saved_by_id text REFERENCES users(id),
  saved_at timestamptz DEFAULT now(),
  note text,                                   -- "Swapped JHD → Albion for collagen"
  ingredients jsonb NOT NULL,                  -- full BOM snapshot
  source text,                                 -- 'Claude PDF parse' | 'Ronel manual' | etc.
  ai_diff_summary text,                        -- pre-computed against previous version
  ai_manufacturer_notify boolean,              -- AI flag
  is_current boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  locked_at timestamptz,
  sent_to_manufacturer_at timestamptz,
  UNIQUE (product_id, version)
);

-- BOM rows (Ronel's sourcing detail per ingredient)
CREATE TABLE bom_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  code text NOT NULL,                          -- 'RM119'
  ingredient text NOT NULL,
  spec text,
  kg_needed numeric,
  is_sole_source boolean DEFAULT false,
  picked_vendor text,                          -- locked vendor name
  status text,                                 -- 'Quoting' | 'Locked' | 'Backorder'
  rationale text,                              -- Ronel's pick reason
  UNIQUE (product_id, code)
);

-- Vendor quotes (one BOM row → many quotes)
CREATE TABLE vendor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_row_id uuid REFERENCES bom_rows(id) ON DELETE CASCADE,
  vendor text NOT NULL,
  contact text,                                -- email
  price_per_kg numeric,
  moq numeric,
  lead_time text,                              -- '14d', '21d' (free text — wide variation in real data)
  in_stock boolean,
  sample_status text,                          -- 'pending' | 'received' | 'n/a'
  note text,
  quoted_at timestamptz DEFAULT now()
);

-- Design artifacts (label, box, insert) — each independently versioned
CREATE TABLE design_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  artifact text CHECK (artifact IN ('label','box','insert')),
  version int NOT NULL,
  uploaded_by_id text REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now(),
  file_path text,                              -- supabase storage
  note text,
  status text                                  -- 'Draft' | 'In review' | 'Approved'
);

-- Listing draft (one per product, mutates over time; copy is versioned separately)
CREATE TABLE listings (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  title text,
  bullets text[],
  keywords text,
  keyword_bytes int,
  created_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  live_at timestamptz
);

-- Listing copy versions (April's iteration history)
CREATE TABLE listing_copy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  version int NOT NULL,
  saved_by_id text REFERENCES users(id),
  saved_at timestamptz DEFAULT now(),
  note text,
  title text,
  bullets text[],
  keywords text,
  keyword_bytes int
);

-- Image deliveries (Paresh + Qaiser)
CREATE TABLE listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  slot text CHECK (slot IN ('main','gallery','aplus')),
  slot_index int,                              -- 0..5 for gallery, 0..2 for aplus, 0 for main
  brief text,                                  -- April's brief for this slot
  delivered_by_id text REFERENCES users(id),
  delivered_at timestamptz,
  file_path text,
  version int,
  note text
);

-- Comments (unified across topics)
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  author_id text REFERENCES users(id),
  topic text,                                  -- 'sourcing' | 'design' | 'listing' | 'niche' | NULL
  body text,
  mentions text[],                             -- array of user ids
  created_at timestamptz DEFAULT now()
);

-- Activity log (every state change)
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  actor_id text REFERENCES users(id),
  kind text NOT NULL,                          -- 'stage_change' | 'spec_save' | 'approval' | 'comment' | etc.
  detail jsonb,
  occurred_at timestamptz DEFAULT now()
);

-- AI nudges (rewritten by hourly cron)
CREATE TABLE ai_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id text REFERENCES users(id),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  message text,
  suggested_action text,
  suggested_target_id text REFERENCES users(id),
  urgency text,                                -- 'high' | 'med' | 'low'
  generated_at timestamptz DEFAULT now()
);

-- AI output cache (audit + cost control)
CREATE TABLE ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL,                       -- 'spec_diff' | 'niche_parse' | 'aging' | etc.
  input_hash text NOT NULL,
  input_payload jsonb,
  output_payload jsonb,
  prompt_version text,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  generated_at timestamptz DEFAULT now(),
  UNIQUE (surface, input_hash, prompt_version)
);

-- Slack rules (configurable from Notifications & Rules screen)
CREATE TABLE slack_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  trigger_event text NOT NULL,                 -- 'stage_change:build' | 'spec_locked' | etc.
  channel text,                                -- '#rd-launches' or '@chesky'
  message_template text,                       -- with {{variables}}
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Watchlist
CREATE TABLE watchlist_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text,
  name text,
  brand text,
  notes text,
  added_by_id text REFERENCES users(id),
  added_at timestamptz DEFAULT now()
);
CREATE TABLE watchlist_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient text,
  notes text,
  added_by_id text REFERENCES users(id),
  added_at timestamptz DEFAULT now()
);
CREATE TABLE watchlist_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text,
  notes text,
  added_by_id text REFERENCES users(id),
  added_at timestamptz DEFAULT now()
);
```

Indexes worth adding from day 1:
- `products(stage)`, `products(owner_id)`, `products(last_activity_at DESC)`
- `comments(product_id, created_at DESC)`
- `activities(product_id, occurred_at DESC)`
- `spec_versions(product_id, version DESC)`
- `ai_outputs(surface, input_hash)` (already covered by UNIQUE)

---

## 8. API Routes (Next.js Server Actions + Route Handlers)

Use **Server Actions** for mutations, **Route Handlers** for cron + webhooks. Keep it small.

### 8.1 Server Actions (form submits)

| Action | What it does |
|---|---|
| `createIdea(formData)` | Inserts into products with stage='idea' |
| `uploadNicheAnalysis(productId, file)` | Saves PDF, calls Claude parser, sets stage='niche-research', sub='parsed' |
| `sendForReview(productId)` | stage='niche-review', Slack pings approvers |
| `decideApproval(productId, decision, note)` | Records approval, fires triggers |
| `saveSpecVersion(productId, ingredients, note)` | New spec version, queues AI diff |
| `lockSpecSheet(productId, versionId)` | Sets is_locked=true, generates manufacturer email draft |
| `saveListingCopyVersion(productId, content)` | New copy version |
| `submitListing(productId)` | listing.submitted_at = now(), Slack ping to Chesky |
| `postComment(productId, body, mentions)` | Inserts comment, parses @mentions, Slack pings the mentioned users |
| `addToWatchlist(kind, data)` | Adds to one of the 3 watchlist tables |

### 8.2 Route Handlers

| Endpoint | Purpose |
|---|---|
| `POST /api/ai/parse-niche` | Server-side Claude call for PDF parse (called from `uploadNicheAnalysis`) |
| `POST /api/ai/spec-diff` | Compare two spec versions |
| `GET /api/cron/aging-check` | Hourly Vercel cron — generates AI nudges (protect with `CRON_SECRET` header) |
| `POST /api/slack/event` | Slack interactive payloads (button clicks in Slack messages) |

### 8.3 Static reads

For everything else, use **server components** that query Supabase directly. No GET endpoints needed.

---

## 9. Mobile App

The mobile app is the **same Next.js codebase**, served as a responsive PWA. It is NOT a separate React Native app for v1.

**Two breakpoints:** `< 768px` = mobile layout, `≥ 768px` = desktop layout. The current desktop and mobile prototypes are the design references for each side.

**Mobile is approval-focused:**
- Inbox-first home (mentions, niche reviews, stuck items)
- Approval flow with reject-reason modal (just shipped — see prototype)
- Comment composer with @mentions
- Read-only on sourcing/listing/design (no editing on mobile)

**Mobile NOT shown:**
- Vendor quote tables (Ronel's view)
- Listing pre-flight scorecard (April's view)
- Spec sheet versioning + AI diff (decision support)

These are desktop-only on purpose — those workflows need a real screen.

**PWA:** Add `manifest.json` and a service worker so Chesky can install it on his iPhone home screen and get push notifications via Web Push (or just open Slack — both work).

---

## 10. Build Order (Suggested 6-week plan)

### Week 1 — Foundations
- Next.js + Supabase + Auth scaffolded
- Hardcoded users seeded
- Products table + basic CRUD
- Idea Inbox screen (capture form)
- Pipeline board (read-only, stage columns)

### Week 2 — Niche flow
- PDF upload + storage
- Claude parsing endpoint (real, not mock)
- Niche analysis structured doc renderer
- Send-for-review action
- Slack ping integration

### Week 3 — Approvals
- Dual approval screen + actions
- Reject reason modal
- Mobile approval inbox
- Activity log

### Week 4 — Build streams
- Streams init on stage transition
- Sourcing tab: BOM + vendor quote tables
- Design tab: artifact upload + versioning
- Listing tab: copy editor + pre-flight + image briefs

### Week 5 — Spec sheet versioning + AI diff
- Spec version timeline
- Compare-2 view
- AI diff endpoint (real Claude calls, cached)
- Lock & generate manufacturer email

### Week 6 — Polish + AI nudges + Slack rules
- Hourly cron for aging
- AI nudges in home rail
- Slack rules CRUD
- Watchlist
- Live tab (post-launch outcomes)

---

## 11. Open Questions to Resolve Before Coding

1. **Slack workspace:** Confirm Homeious has a Slack workspace + we have admin to install a bot.
2. **Amazon API:** Does April want auto-sync of listing status from Seller Central? Or manual flip for v1?
3. **Manufacturer email:** Lock-and-send generates a draft — do we send via Resend with Ronel CC'd, or just open in his mail client?
4. **PDF source:** Are niche analyses always PDFs, or sometimes Google Docs / Notion? Affects parsing strategy.
5. **Existing data:** Is there a CSV or DB of existing in-flight products to migrate, or do we start clean?
6. **Permissions:** Can anyone view anything, or are some products gated to certain people? (Prototype assumes all-visible.)
7. **Audit retention:** How long do we keep activity logs + AI outputs? 1 year? Forever?

---

## 12. Reference: Prototype File Map

The HTML prototype is the single source of truth for design. When in doubt about behavior, check the prototype first.

| Prototype area | File(s) |
|---|---|
| Desktop entry | `R&D Pipeline OS v3.html` |
| Mobile entry | `R&D Pipeline Mobile.html` |
| Desktop components | `components/v3/*.jsx` |
| Mobile components | `mobile/*.jsx` |
| Design tokens | `styles/app-v3.css` (top of file) |
| Mock data | `data/products-v3.js` and `mobile/data.jsx` |

The prototype renders ~25 products across all stages so behavior with real data is exercised.

---

## 13. Contacts

- **Product owner:** Chesky
- **Finance approver:** Joel
- **R&D:** Malik
- **Engineering:** Bill
- **Design (this doc):** [Designer]

For questions on intent or design rationale, ping Chesky. For questions on user flows for a specific role, ping that role directly.

---

*End of brief. Estimated read time: 25 minutes.*
