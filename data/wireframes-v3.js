/* global PIPELINE_DATA */
// ============================================================
// Wireframe data augmentation
// ----------------------------------------------------------------
// Why this lives in a separate file: products-v3.js is ~1500 lines
// of hand-authored fixtures. Rather than thread a new object through
// every build-stage product, we attach realistic wireframe data
// here at module-load time.
//
// Status lifecycle:
//   not-started → pds-generating → pending-malik-review →
//   pending-chesky-approval → locked  (or → revisions-requested)
//
// A wireframe is a SINGLE artifact that covers all of label / box /
// insert for one product. It lives next to specSheet on the product,
// because — like the spec — it's a locked source-of-truth Esty
// works from. Versions are HTML files (PDS output, then Malik tweaks).
// ============================================================
(function attachWireframes() {
  if (!window.PIPELINE_DATA) return;

  // Augment products by id. If id not found, skip silently — keeps this
  // resilient to data edits.
  const wireframes = {
    "B-101": {
      status: "locked",
      pdsGeneratedDaysAgo: 16,
      submittedToMalikDaysAgo: 16,
      malikSubmittedDaysAgo: 14,
      cheskyApprovedDaysAgo: 13,
      currentVersion: 3,
      versions: [
        { v: 1, by: "pds",   daysAgo: 16, note: "Initial PDS HTML wireframe — covers label, box, insert", source: "pds-output-B-101-v1.html", filename: "PN-BiotinCollagen-wireframe-v1.html" },
        { v: 2, by: "malik", daysAgo: 15, note: "Tweaked hero claim wording, swapped 'biotin' → 'biotin + collagen' on front panel", filename: "PN-BiotinCollagen-wireframe-v2.html" },
        { v: 3, by: "malik", daysAgo: 14, note: "Final — submitted to Chesky for approval", filename: "PN-BiotinCollagen-wireframe-v3.html" },
      ],
      packagingRationale: {
        // This block lives in the niche analysis doc and is excerpted here.
        // Esty reads it to understand WHY the wireframe says what it says.
        sourceDoc: "PN-BiotinCollagen-niche-v3 (§4 Packaging strategy)",
        format: "Wraparound bottle label + tuck-end carton + tri-fold usage card",
        whyFormat: "Liquid drops in 2oz amber dropper bottle. Wraparound label maximizes legible Supplement Facts surface. Tuck-end carton matches the rest of the PN line for shelf cohesion.",
        heroPositioning: "\"Skin from within\" angle, not \"hair growth\" — niche analysis showed hair-growth claims are saturated and trigger ad scrutiny. Skin/glow framing is a white-space play.",
        keyClaims: [
          "1000mg marine collagen + 5000mcg biotin per serving",
          "Liquid for 2× absorption vs capsules",
          "Berry flavor, no chalky aftertaste",
          "Made in USA · Third-party tested",
        ],
        copyDecisions: [
          { panel: "Front (hero)", decision: "Lead with 'GLOW' wordmark — single word + product name. No claim copy on hero, claim moves to back panel.", reason: "PN brand voice = restraint. Front panel is brand-first, not claim-first." },
          { panel: "Back (Supplement Facts)", decision: "Standard FDA-required panel + structure-function claim block + directions.", reason: "FDA boilerplate." },
          { panel: "Insert: tri-fold", decision: "Panel 1: how to use. Panel 2: stacks well with Iron Drops + Vitamin D. Panel 3: results timeline (4-8 weeks) + warnings.", reason: "Cross-sell to other PN SKUs is a deliberate retention play." },
        ],
        warnings: "Standard FDA disclaimer. No allergens (fish-source collagen disclosed in ingredients).",
      },
    },

    // ===== B-102 DON-LymphDrops — wireframe locked, all design approved =====
    "B-102": {
      status: "locked",
      pdsGeneratedDaysAgo: 28,
      submittedToMalikDaysAgo: 28,
      malikSubmittedDaysAgo: 26,
      cheskyApprovedDaysAgo: 25,
      currentVersion: 2,
      versions: [
        { v: 1, by: "pds",   daysAgo: 28, note: "PDS HTML wireframe", filename: "DON-LymphDrops-wireframe-v1.html" },
        { v: 2, by: "malik", daysAgo: 26, note: "Final — DON brand voice tweaks, sent to Chesky", filename: "DON-LymphDrops-wireframe-v2.html" },
      ],
      packagingRationale: {
        sourceDoc: "DON-LymphDrops-niche-v4 (§5 Packaging)",
        format: "Wraparound bottle label + tuck-end carton + tri-fold card",
        whyFormat: "Same dieline family as DON line for consistency on Amazon.",
        heroPositioning: "Lymphatic drainage is the search hook. Lead with that, then 'morning ritual' framing per DON's editorial tone.",
        keyClaims: [
          "Manual lymphatic drainage in liquid form",
          "Cleavers, burdock, red clover · traditional herbs",
          "Morning ritual · 30 drops under tongue",
          "Made in USA",
        ],
        copyDecisions: [
          { panel: "Front (hero)", decision: "DON wordmark top, product name center, 'Lymphatic' as kicker. No claims on front.", reason: "DON aesthetic — premium, restrained." },
          { panel: "Insert", decision: "Front: ritual instructions. Back: 'why lymph matters' editorial block.", reason: "Editorial tone reinforces DON brand position." },
        ],
        warnings: "Standard FDA disclaimer + pregnancy warning (red clover phytoestrogens).",
      },
    },

    // ===== B-103 PN-EnergyMix — wireframe in Chesky's queue =====
    "B-103": {
      status: "pending-chesky-approval",
      pdsGeneratedDaysAgo: 9,
      submittedToMalikDaysAgo: 9,
      malikSubmittedDaysAgo: 3,
      currentVersion: 2,
      versions: [
        { v: 1, by: "pds",   daysAgo: 9, note: "PDS HTML wireframe — pouch front/back + insert", filename: "PN-EnergyMix-wireframe-v1.html" },
        { v: 2, by: "malik", daysAgo: 3, note: "Tweaked dose graphic on back panel, submitted for Chesky review", filename: "PN-EnergyMix-wireframe-v2.html" },
      ],
      packagingRationale: {
        sourceDoc: "PN-EnergyMix-niche-v2 (§4 Packaging)",
        format: "Stand-up pouch (front + back) + single-sheet insert",
        whyFormat: "Pre-workout category convention — pouches outperform jars on first-impression / 'feels like product'. Pouch is also cheaper at this volume.",
        heroPositioning: "Caffeine + L-citrulline + beta-alanine — every word matters. Lead with the stack on hero, not a flavor name.",
        keyClaims: [
          "200mg caffeine · 6g L-citrulline · 2.5g beta-alanine",
          "Citrus berry · sugar-free",
          "30 servings · clinical doses",
          "Third-party tested · Made in USA",
        ],
        copyDecisions: [
          { panel: "Pouch front", decision: "Stack-as-hero: '200 / 6 / 2.5' big numerals + ingredient under each.", reason: "Pre-workout buyers shop on doses — show them upfront." },
          { panel: "Pouch back", decision: "Full Supplement Facts + scoop/mix directions + flavor name.", reason: "Standard." },
          { panel: "Insert", decision: "Front: how to mix (water amount, scoop count). Back: when to take it (15-30 min pre-workout).", reason: "Reduces customer-service questions." },
        ],
        warnings: "Caffeine warning. Not for under 18. Pregnancy/nursing warning. Beta-alanine tingle warning.",
      },
    },

    // ===== B-104 DON-StressRelief — wireframe pending Malik review (PDS just dropped it) =====
    "B-104": {
      status: "pending-malik-review",
      pdsGeneratedDaysAgo: 1,
      submittedToMalikDaysAgo: 1,
      currentVersion: 1,
      versions: [
        { v: 1, by: "pds", daysAgo: 1, note: "Initial PDS HTML wireframe — review and tweak before submitting to Chesky", filename: "DON-StressRelief-wireframe-v1.html" },
      ],
      packagingRationale: {
        sourceDoc: "DON-StressRelief-niche-v2 (§5 Packaging)",
        format: "Wraparound bottle label + tuck-end carton + tri-fold card",
        whyFormat: "Matches DON liquid-drops template (LymphDrops, etc.) for shelf cohesion.",
        heroPositioning: "Adaptogen-forward but human language: 'Take the edge off' rather than 'cortisol modulation'.",
        keyClaims: [
          "Ashwagandha + L-theanine + magnesium glycinate",
          "Non-drowsy daily formula",
          "30 drops, morning or before bed",
          "Made in USA",
        ],
        copyDecisions: [
          { panel: "Front (hero)", decision: "DON wordmark + 'CALM' kicker + product name. Three-ingredient stack listed on front below name.", reason: "DON line treats main ingredient stack like a wordmark." },
          { panel: "Insert", decision: "Front: when/how to use. Back: stacks well with DON Sleep Drops + DON Lymph Drops.", reason: "Cross-sell within DON line." },
        ],
        warnings: "Standard. Pregnancy warning (ashwagandha).",
      },
    },

    // ===== P-051 DON-OrganMeats — wireframe locked (production stage, all approved) =====
    "P-051": {
      status: "locked",
      pdsGeneratedDaysAgo: 78,
      malikSubmittedDaysAgo: 76,
      cheskyApprovedDaysAgo: 75,
      currentVersion: 2,
      versions: [
        { v: 1, by: "pds",   daysAgo: 78, note: "PDS wireframe", filename: "DON-OrganMeats-wireframe-v1.html" },
        { v: 2, by: "malik", daysAgo: 76, note: "Final", filename: "DON-OrganMeats-wireframe-v2.html" },
      ],
      packagingRationale: {
        sourceDoc: "DON-OrganMeats-niche-v3 (§5 Packaging)",
        format: "Front + back jar label + tuck-end carton + bi-fold insert",
        whyFormat: "Capsule jar. DON capsule line standard.",
        heroPositioning: "Grass-fed, pasture-raised messaging is table stakes — must be on front.",
        keyClaims: ["Beef liver + heart + kidney", "Grass-fed, pasture-raised", "180 capsules · 30-day supply", "Freeze-dried"],
        copyDecisions: [
          { panel: "Front", decision: "DON wordmark + 'ORGAN' kicker + 3-ingredient list as hero copy.", reason: "Category convention." },
        ],
        warnings: "Standard.",
      },
    },

    // ===== P-052 PN-NightCream — wireframe locked =====
    "P-052": {
      status: "locked",
      pdsGeneratedDaysAgo: 95,
      malikSubmittedDaysAgo: 92,
      cheskyApprovedDaysAgo: 90,
      currentVersion: 3,
      versions: [
        { v: 1, by: "pds",   daysAgo: 95, note: "PDS wireframe", filename: "PN-NightCream-wireframe-v1.html" },
        { v: 2, by: "malik", daysAgo: 93, note: "Tube sizing + carton dieline tweaks", filename: "PN-NightCream-wireframe-v2.html" },
        { v: 3, by: "malik", daysAgo: 92, note: "Final", filename: "PN-NightCream-wireframe-v3.html" },
      ],
      packagingRationale: {
        sourceDoc: "PN-NightCream-niche-v4 (§5 Packaging)",
        format: "Tube + tuck-end carton + single-sheet card",
        whyFormat: "First PN topical — borrow from skincare-category conventions (tube + carton), not supplement conventions.",
        heroPositioning: "Bakuchiol = retinol alternative. Lead on that comparison.",
        keyClaims: ["Bakuchiol (plant-based retinol alternative)", "Niacinamide + ceramides", "1.7oz · 60-night supply", "Vegan · cruelty-free"],
        copyDecisions: [
          { panel: "Tube front", decision: "PN wordmark vertical + 'NIGHT' + 'Bakuchiol Retinol Alternative' kicker.", reason: "Category-standard tube layout." },
          { panel: "Carton", decision: "Editorial back-of-carton — short paragraph on bakuchiol science.", reason: "PN tone — clinical-clean." },
        ],
        warnings: "External use only. Discontinue if irritation occurs.",
      },
    },
  };

  PIPELINE_DATA.PRODUCTS.forEach(p => {
    if (wireframes[p.id]) p.wireframe = wireframes[p.id];
  });

  // For build/production products without explicit wireframe data, attach a "not-started"
  // placeholder so the UI can show the right empty state instead of treating wireframe as missing.
  PIPELINE_DATA.PRODUCTS.forEach(p => {
    if (["build", "production"].includes(p.stage) && !p.wireframe) {
      p.wireframe = { status: "not-started", versions: [], packagingRationale: null };
    }
  });
})();
