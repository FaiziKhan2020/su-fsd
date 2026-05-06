# DEV NOTES — Niche Doc Parsing (production wiring)

The prototype's "Upload niche analysis" flow uses `window.claude.complete` to
parse pasted doc text and dropped image screenshots into structured JSON. In
production the flow is the same shape — same JSON schema, same Niche Review
card, same inline editing — but the inputs come from the **Google Docs API**
rather than clipboard / drag-drop.

---

## What you're replacing

In `components/v3/niche-flow.jsx`:

- `callClaudeParse(docText)` — text → structured JSON via Claude
- `callClaudeVision(imageDataUrl, sectionHint)` — image → extracted values via vision
- `NicheUploadModal` — UI that collects text + images and calls the two above

In production you keep `callClaudeParse` and `callClaudeVision` essentially
intact. You replace the **input collection** step (clipboard paste, drag-drop)
with a Google Docs API fetch that returns both the text body and the
embedded image bytes in section order.

---

## Google Docs API — getting the doc

### Auth
- OAuth 2.0, scope: `https://www.googleapis.com/auth/documents.readonly`
- Your team already authenticates with Google Workspace; add this scope to
  your existing OAuth client.

### Fetch
```
GET https://docs.googleapis.com/v1/documents/{documentId}
```

`documentId` is the segment between `/d/` and `/edit` in the URL Malik pastes.

The response contains:
- `body.content[]` — an ordered list of `StructuralElement` items (paragraphs,
  tables, etc.). Walk these in order to reconstruct the doc.
- `inlineObjects` — a map of `{ objectId → InlineObject }`, each with an
  `imageProperties.contentUri` you can download as a PNG/JPEG.
- A paragraph element references an image via
  `paragraph.elements[i].inlineObjectElement.inlineObjectId`. So when you walk
  the body in order, you know exactly which paragraph each image follows —
  use that to assign the image to a section heading.

### Section assignment
Walk `body.content` top-to-bottom. Track the current heading text:
- A paragraph with `paragraphStyle.namedStyleType` like `HEADING_1` or
  `HEADING_2` updates the current section.
- Each image you encounter inherits the current section.
- Map heading text → schema key with a tolerant matcher (e.g. anything
  containing "competitor" → `competitors`, "formula" or "ingredients" →
  `formula`, etc.). Ship a heading-alias config so you can adjust without
  redeploying.

### Image download
The `contentUri` from `inlineObjects` is an authenticated URL — fetch with
the same OAuth token (or use the `accessToken` query param for service-side
fetches). Save bytes; you'll feed them to the vision model.

### Caching
The `documents.get` response includes `revisionId`. Cache on
`(documentId, revisionId)` so re-uploads of the same doc revision don't
re-bill Claude.

---

## Calling Claude — text + images in one shot

The prototype calls `window.claude.complete` (text-only) with a prompt that
includes the doc body. In production you'll use the Anthropic Messages API
directly so you can pass images as content blocks alongside the doc text:

```
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 4096,
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "<schema + instructions>" },
      { "type": "text", "text": "<doc body>" },

      // For each image, include section context inline:
      { "type": "text", "text": "Image attached under section: Competitors" },
      { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "<b64>" } },

      { "type": "text", "text": "Image attached under section: Market" },
      { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "<b64>" } }
    ]
  }]
}
```

This is **strictly better** than the prototype's two-pass approach (text first,
then per-image vision) because:
1. The model sees the doc text and images together — it can reconcile a
   number Malik typed against the same number visible in a Helium 10
   screenshot.
2. One API call, not N+1.
3. The model can flag mismatches in the verdict rationale ("typed SV says
   200K, screenshot shows 186K — using 186K from primary source").

Prototype keeps them separate only because `window.claude.complete` is
text-only.

### Schema — keep it identical to prototype
The schema in `NICHE_SCHEMA_DESCRIPTION` (niche-flow.jsx) is the contract.
The Niche Review card renders against this exact shape. **Don't change the
schema without also updating `NicheDoc` and `niche.current` consumers**
(`p.nicheSummary`, `RD2.AI`, mobile niche viewer, etc.).

### Evidence object shape
After you parse, attach the source images so the Niche Review card can
render them inline. The prototype expects:

```ts
niche.current.evidence = {
  overview: [
    { id: string, dataUrl: string, kind: string, caption: string, extracted: object }
  ],
  competitors: [...],
  differentiation: [...],
  formula: [...],
  packaging: [...],
}
```

In production:
- `dataUrl` becomes a CDN URL (or signed URL into your blob store) — not a
  base64 data URL. The card renders with `<img src>` regardless.
- `kind` is whatever Claude returned ("helium10", "amazon-listing", "tiktok",
  "reddit", "other"). Keep this enum stable; the card uses it for the chip
  label.
- `extracted` is the structured values Claude lifted from the image. Show
  it raw in the lightbox for now; later you can render type-specific cards
  per `kind`.

---

## Reconciling text + image extractions

Two real-world cases to handle:

1. **Text says one thing, image says another.** Show both. Flag the
   mismatch. Let Malik confirm which to keep before niche-review locks.
2. **Image has data, text doesn't.** Promote the image's extracted values
   into the structured field, mark the field with a "source: screenshot"
   indicator so Chesky knows the provenance.

The Niche Review card already supports inline editing — those mismatches
become editable cells with the conflicting value as a hint, not a hard error.

---

## Standardize the screenshot vocabulary

Vision parsing is dramatically more reliable when the same screenshot type
shows up in the same shape every time. Push Malik to standardize on:

- **Helium 10 / Cerebro pull** — search volume, monthly revenue, CPC
- **Top-3 Amazon listing screenshots** — price, BSR, rating, review count, A+ presence
- **TikTok hashtag stat** — view count, top creator handles
- **Reddit thread** — subreddit, post title, comment count

Once those four types are the convention, you can build per-`kind` vision
prompts that extract the same fields each time and the parser becomes
near-deterministic.

---

## Webhook on doc edit (nice-to-have)

Subscribe to Google Drive's `changes.watch` API for the docs folder. When
Malik edits a parsed doc, fire a re-parse automatically and show "doc
changed since last parse — re-run Claude?" on the Niche Review card. Don't
auto-replace; Chesky may have already started reviewing the previous parse.

---

## Failure modes to handle

- **OAuth expired** — refresh token, retry once, then surface a clean
  re-auth prompt.
- **Doc not shared with the parser's service account** — show a clear
  "ask Malik to share the doc with `pipeline-parser@..." error.
- **Doc has no recognizable headings** — fall back to passing the entire
  body as a single block; the model still produces something usable.
- **Vision model can't read the screenshot** (low res, foreign chart) —
  store the image as evidence with `kind: "other"` and let Malik fill the
  text fields manually.
- **Claude returns invalid JSON** — the prototype's `callClaudeParse` already
  retries by extracting the first `{...}` block. Production should add a
  schema validator (Zod / JSON Schema) and log validation failures so you
  can refine the prompt over time.

---

## File map for the engineer

- `components/v3/niche-flow.jsx` — modal + Claude calls. Replace
  `callClaudeParse` and `callClaudeVision` to use the Anthropic Messages
  API directly. Replace the modal's text/image collection with a single
  "Paste doc URL → fetch → parse" flow.
- `components/v3/dossier-parts.jsx` — `NicheDoc` renders the parsed JSON
  with inline editing and `EvidenceStrip`. No changes needed if you keep
  the schema stable.
- `components/v3/app.jsx` — `uploadNiche` and `updateNiche` are the only
  persistence hooks. Wire these to your backend; the rest of the prototype
  reads from `niche.current` automatically.
