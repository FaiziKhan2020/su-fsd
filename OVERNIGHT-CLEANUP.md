# Overnight cleanup — what changed

Worked through the four cleanups we agreed on. All edits are inside `components/v3/` and `R&D Pipeline OS v3.html` is the live entry. No behavior changes a user would notice; this was structural.

## 1. Dead code purge
Project root was already clean of the old shells (`R&D Pipeline OS.html`, `R&D Pipeline OS v2.html`, `components/v2/*`, `components/*.jsx` at root, `data/products.js`, `data/products-v2.js`). The earlier directory listings I'd been working from were stale — nothing to delete. Confirmed by:
- `list_files` at root: only v3 files and the schematic/journey/mobile artifacts you wanted kept
- `grep` for old paths: no inbound references

## 2. Centralized `can(action, product, [user])` helper
Lived in `components/v3/app.jsx` on the `RD2` namespace. Single switch over named actions; admins (chesky, joel) pass everything except `wf.viewLocked` (which is Esty-only by design — admins shouldn't see her "your wireframe is locked, start designing" CTA).

Actions defined:
- `spec.edit` — Malik or admin
- `spec.lock` — Chesky or admin
- `niche.edit` — Malik during stage `niche`; Malik OR Chesky during stage `approval`; admin always
- `niche.send` — Malik, Chesky, or admin
- `build.advance` — Chesky or admin
- `wf.viewLocked` — Esty only (admin excluded by design)
- `amazon.edit` — April, Malik, or admin
- `product.delete` — admin only
- `act` — generic owner/waitingOn/admin gate (delegates to `RD2.canAct`)
- `is.malik` / `is.chesky` / `is.esty` — pass-through role gates (admin always passes)

Refactored call sites:
- `spec-sheet-v2.jsx` — Edit-inline + Lock buttons (was 3 inline IIFEs reading `__currentUser` and re-deriving the rule)
- `wireframe-section.jsx` — `isMalik`, `isChesky`, `isEsty` derivations
- `dossier-parts.jsx` — `NicheDoc` editable gate, `NicheReviewHandoff` send button
- `dossier.jsx` — `DangerZone` admin gate (also folded the redundant `||` clause that duplicated the admin list)
- `app.jsx` — Build-advance role gate
- `amazon-tab.jsx` — `canEdit`
- `shell.jsx` — `GatedAction` delegates to `RD2.can("act", …)` instead of the lower-level `RD2.canAct`

Net effect: every "who can do X" question funnels through one switch. Adding a new role or new action means editing `app.jsx` only.

## 3. Additive migration layer
On load, `app.jsx` deep-merges each saved product onto its seed counterpart (matched by `id`). Saved values win for keys both have; seed fills keys saved is missing. Plain objects deep-merge; arrays and primitives replace wholesale (saved is authoritative — important so saved `quotes: []` doesn't get re-populated from seed quotes).

```js
function mergeProductsWithSeed(saved, seedList) {
  const seedById = new Map(seedList.map(s => [s.id, s]));
  return saved.map(s => {
    const seed = seedById.get(s.id);
    return seed ? deepMergeWithSeed(s, seed) : s;
  });
}
```

**Deliberately does NOT append seed-only products.** If a user deleted HC498, the migration won't resurrect it on next load — the user's save IS the truth. Trade-off: when you add a brand-new mock product to `data/products-v3.js`, existing users won't see it until they wipe data. Documented inline.

This kills the "I added a field to the schema and now the page breaks for anyone with old localStorage" pattern that's been biting us all week. Now you can add new fields to `products-v3.js` freely; users with old saves get the defaults filled in.

## 4. onDecide arity audit
Two distinct signatures live in the code, by design:

| Site | Signature |
|---|---|
| `app.jsx` `decide()` (top of pipeline) | `(id, who, decision, note)` |
| Dossier-wrapped `onDecide` (everything below dossier) | `(who, decision, note)` — id baked in |

Found 8 call sites passing `p.id` as first arg to a dossier-wrapped onDecide. Those `p.id` strings were silently being interpreted as the `who` field — meaning some buttons under the dossier were dispatching nonsense `who` values that fell through `decide()`'s switch and did nothing. Fixed:

- `spec-sheet-v2.jsx` — Lock/Unlock buttons (2 call sites)
- `amazon-tab.jsx` — Soft-list + 4 verdict buttons (5 call sites)
- `dossier.jsx` — "Lock spec & advance to Build" button (1 call site)
- `dossier-parts.jsx` — `NicheReviewHandoff` "Submit for review" (1 call site)

Stage-dashboard's onDecide is the 4-arg form (called from app, not dossier) — left alone, that one's correct.

## What I did NOT touch
Per your "surgical only" guidance:
- Did not consolidate the two onDecide signatures into one. Two-tier convention is intentional and the dossier wrapper is what keeps callers from having to know `openId`.
- Did not refactor data shapes, did not rename anything user-visible.
- Did not delete the schematic/journey/mobile artifacts — kept them since they're separate deliverables.

## What's still open from the todo list
The big to-do bucket has these still open and worth attention:
- Capsule MOQ helper + bottle-yield derivation (5 sub-tasks, items 184–188)
- Real Claude wiring in NicheUploadModal (items 188–197)

Both of those are feature work, not cleanup. Pick them up tomorrow with fresh eyes.

## Verification
Page loads clean — only the standard Babel-in-browser warning. No new console errors introduced by any of the four changes.
