// =============================================================================
// SPEC SHEETS V2 — rich, format-aware production specs
// =============================================================================
//
// Schema (per version):
//   identity:           { format, servingSize, servingsPerContainer, ...format-specific }
//   formula:            { sections: [{ label, subtotal, rows: [{name, form, dose, dv, function, source}] }],
//                         otherIngredients }
//   formatMath:         capsule-fit / blend-math / none — production constraint check
//   labelStructure:     { panelType, structure: [{kind, name, dose, items}], brandedIngredients }
//   mfgNotes:           { manufacturer, leadTime, moq, confirmations[], warnings[] }
//   requiredStatements: ["GLUTEN-FREE", "MADE IN USA", ...]
//   dualPositioning:    (liquid/box only) { bottle, boxFront, boxBack }
//
// Top level:
//   currentVersion, lockedAt, sentToManufacturer, versions[]
//
// Merged onto product[id] as `specSheetV2` at the end of this file.
// =============================================================================

const SPEC_SHEETS_V2 = {

  // ============================================================
  // C-101 · DON-AshwaSleep · Capsule · 600mg KSM-66 + theanine + magnesium
  // Cost-passing state. Spec is "draft / cost-iterating" — dose just bumped, no mfg yet.
  // ============================================================
  "C-101": {
    currentVersion: 3,
    lockedAt: null,
    sentToManufacturer: null,
    versions: [
      // ---- v1: initial PDS extract ----
      { v: 1, by: "malik", daysAgo: 8, status: "draft",
        note: "Initial PDS run — Malik + Claude PDS, dosing per niche analysis",
        source: "PDS run · DON-AshwaSleep-PDS-v1.docx",
        identity: {
          format: "Vegetable capsule",
          servingSize: "2 capsules",
          servingsPerContainer: 30,
          capsuleSize: "Size 0",
          capsuleCount: "60ct",
          bottleSpec: "150cc HDPE amber, white CRC + induction seal",
          launchQty: "5,000 bottles",
        },
        formula: {
          sections: [
            { label: "ACTIVES", rows: [
              { name: "Ashwagandha root extract (KSM-66)", form: "5% withanolides", dose: "600mg", dv: "†", function: "Adaptogen / cortisol modulation", source: "Ixoreal (sole-source)" },
              { name: "L-Theanine", form: "Suntheanine", dose: "200mg", dv: "†", function: "Calm focus / non-sedating", source: "Taiyo (branded)" },
              { name: "Magnesium glycinate", form: "TRAACS chelate", dose: "150mg elemental", dv: "36%", function: "Sleep / muscle relax", source: "Albion / Balchem (sole-source)" },
              { name: "Reishi mushroom", form: "8:1 fruiting body extract", dose: "200mg", dv: "†", function: "Adaptogen support", source: "Nammex" },
            ]},
          ],
          otherIngredients: "Vegetable cellulose (capsule), rice flour (filler), magnesium stearate (flow agent).",
        },
        formatMath: { kind: "capsule-fit",
          totalFillPerServing: "1,150mg", fillPerCapsule: "575mg",
          capsule: "Size 0 vegetable", maxFill: "600mg",
          utilization: "95.8%", utilizationStatus: "tight",
          notes: "Tight at Size 0. Consider Size 00 if dose grows, or trim reishi.",
        },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "individual", name: "Ashwagandha (KSM-66)", dose: "600mg" },
            { kind: "individual", name: "L-Theanine (Suntheanine)", dose: "200mg" },
            { kind: "individual", name: "Magnesium (as glycinate)", dose: "150mg" },
            { kind: "individual", name: "Reishi mushroom 8:1", dose: "200mg" },
          ],
          brandedIngredients: [
            { mark: "KSM-66®", owner: "Ixoreal Biomed Inc." },
            { mark: "Suntheanine®", owner: "Taiyo International" },
            { mark: "TRAACS®", owner: "Albion Laboratories / Balchem" },
          ],
        },
        mfgNotes: { manufacturer: "TBD", confirmations: [], warnings: ["Capsule fit at 95.8% — confirm with mfg before locking"] },
        requiredStatements: ["GLUTEN-FREE", "NON-GMO", "VEGAN", "MADE IN USA", "GMP-CERTIFIED FACILITY"],
      },

      // ---- v2: dose tweak after Joel's review ----
      { v: 2, by: "malik", daysAgo: 5, status: "draft",
        note: "Cut reishi to 100mg — Joel: 'crowded label, focus on sleep story'. Frees capsule headroom.",
        source: "PDS revision · MalikJoel review",
        identity: {
          format: "Vegetable capsule",
          servingSize: "2 capsules",
          servingsPerContainer: 30,
          capsuleSize: "Size 0",
          capsuleCount: "60ct",
          bottleSpec: "150cc HDPE amber, white CRC + induction seal",
          launchQty: "5,000 bottles",
        },
        formula: {
          sections: [
            { label: "ACTIVES", rows: [
              { name: "Ashwagandha root extract (KSM-66)", form: "5% withanolides", dose: "600mg", dv: "†", function: "Adaptogen / cortisol modulation", source: "Ixoreal (sole-source)" },
              { name: "L-Theanine", form: "Suntheanine", dose: "200mg", dv: "†", function: "Calm focus / non-sedating", source: "Taiyo (branded)" },
              { name: "Magnesium glycinate", form: "TRAACS chelate", dose: "150mg elemental", dv: "36%", function: "Sleep / muscle relax", source: "Albion / Balchem (sole-source)" },
              { name: "Reishi mushroom", form: "8:1 fruiting body extract", dose: "100mg", dv: "†", function: "Adaptogen support", source: "Nammex" },
            ]},
          ],
          otherIngredients: "Vegetable cellulose (capsule), rice flour (filler), magnesium stearate (flow agent).",
        },
        formatMath: { kind: "capsule-fit",
          totalFillPerServing: "1,050mg", fillPerCapsule: "525mg",
          capsule: "Size 0 vegetable", maxFill: "600mg",
          utilization: "87.5%", utilizationStatus: "ok",
          notes: "Healthy utilization — leaves room for binder + flow agent.",
        },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "individual", name: "Ashwagandha (KSM-66)", dose: "600mg" },
            { kind: "individual", name: "L-Theanine (Suntheanine)", dose: "200mg" },
            { kind: "individual", name: "Magnesium (as glycinate)", dose: "150mg" },
            { kind: "individual", name: "Reishi mushroom 8:1", dose: "100mg" },
          ],
          brandedIngredients: [
            { mark: "KSM-66®", owner: "Ixoreal Biomed Inc." },
            { mark: "Suntheanine®", owner: "Taiyo International" },
            { mark: "TRAACS®", owner: "Albion Laboratories / Balchem" },
          ],
        },
        mfgNotes: { manufacturer: "TBD", confirmations: [], warnings: [] },
        requiredStatements: ["GLUTEN-FREE", "NON-GMO", "VEGAN", "MADE IN USA", "GMP-CERTIFIED FACILITY"],
      },

      // ---- v3 (current): cost-pass-driven swap ----
      { v: 3, by: "ronel", daysAgo: 1, status: "draft",
        note: "Cost-pass: KSM-66 is sole-source $$. Held. Swapped reishi 8:1 → 4:1 (same effective dose, $0.18/btl saved). Spec ready for internal approval.",
        source: "Cost-pass revision",
        identity: {
          format: "Vegetable capsule",
          servingSize: "2 capsules",
          servingsPerContainer: 30,
          capsuleSize: "Size 0",
          capsuleCount: "60ct",
          bottleSpec: "150cc HDPE amber, white CRC + induction seal",
          launchQty: "5,000 bottles",
          brandedIngredients: "KSM-66® · Suntheanine® · TRAACS®",
        },
        formula: {
          sections: [
            { label: "ACTIVES", rows: [
              { name: "Ashwagandha root extract (KSM-66)", form: "5% withanolides", dose: "600mg", dv: "†", function: "Adaptogen / cortisol modulation", source: "Ixoreal (sole-source)" },
              { name: "L-Theanine", form: "Suntheanine", dose: "200mg", dv: "†", function: "Calm focus / non-sedating", source: "Taiyo (branded)" },
              { name: "Magnesium glycinate", form: "TRAACS chelate", dose: "150mg elemental", dv: "36%", function: "Sleep / muscle relax", source: "Albion / Balchem (sole-source)" },
              { name: "Reishi mushroom", form: "4:1 fruiting body extract", dose: "200mg", dv: "†", function: "Adaptogen support", source: "Nammex" },
            ]},
          ],
          otherIngredients: "Vegetable cellulose (capsule), rice flour (filler), magnesium stearate (flow agent).",
        },
        formatMath: { kind: "capsule-fit",
          totalFillPerServing: "1,150mg", fillPerCapsule: "575mg",
          capsule: "Size 0 vegetable", maxFill: "600mg",
          utilization: "95.8%", utilizationStatus: "tight",
          notes: "Back to tight — reishi 4:1 is denser. Confirm with mfg on first sample run.",
        },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "individual", name: "Ashwagandha (KSM-66)", dose: "600mg" },
            { kind: "individual", name: "L-Theanine (Suntheanine)", dose: "200mg" },
            { kind: "individual", name: "Magnesium (as glycinate)", dose: "150mg" },
            { kind: "individual", name: "Reishi mushroom 4:1", dose: "200mg" },
          ],
          brandedIngredients: [
            { mark: "KSM-66®", owner: "Ixoreal Biomed Inc." },
            { mark: "Suntheanine®", owner: "Taiyo International" },
            { mark: "TRAACS®", owner: "Albion Laboratories / Balchem" },
          ],
        },
        mfgNotes: {
          manufacturer: "TBD — Mimi (Herbally Yours) + Connor (Brand Nutra) on quote",
          confirmations: [],
          warnings: ["95.8% capsule utilization — needs mfg sign-off before lock", "Reishi 4:1 vs 8:1 swap — ensure mfg can source 4:1 grade"],
        },
        requiredStatements: ["GLUTEN-FREE", "NON-GMO", "VEGAN", "MADE IN USA", "GMP-CERTIFIED FACILITY"],
      },
    ],
  },

  // ============================================================
  // R-201 · DON-AdrenalDrops · Liquid · Talha-formulated
  // Sampling state. Talha proposes blends. Locked v2 currently.
  // ============================================================
  "R-201": {
    currentVersion: 2,
    lockedAt: 2,
    sentToManufacturer: "BioCorp Nutrition Labs",
    versions: [
      // v1
      { v: 1, by: "talha", daysAgo: 6, status: "draft",
        note: "Talha's first blend — adrenal cortex pattern, ashwa + rhodiola + holy basil. Holy basil is divisive on flavor.",
        source: "Talha sample R1 spec",
        identity: {
          format: "Liquid drops, alcohol-free glycerite",
          servingSize: "1 mL (≈ 30 drops)",
          servingsPerContainer: 60,
          bottleSize: "2 fl oz amber glass",
          dropperSize: "Glass dropper, 1 mL graduated",
          base: "Vegetable glycerin + spring water (60/40)",
          alcohol: "0% (glycerite)",
          flavor: "Honey-vanilla",
          launchQty: "5,000 bottles",
        },
        formula: {
          sections: [
            { label: "ADAPTOGEN BLEND", subtotal: "Total: 1,050mg / serving",
              rows: [
                { name: "Ashwagandha root extract", form: "1:2 fluid extract", dose: "400mg", dv: "†", function: "HPA-axis adaptogen", source: "Naturex" },
                { name: "Rhodiola rosea root", form: "3% rosavins", dose: "300mg", dv: "†", function: "Stress resilience", source: "Stauber" },
                { name: "Holy basil leaf", form: "1:2 fresh extract", dose: "250mg", dv: "†", function: "Cortisol modulation", source: "Mountain Rose" },
                { name: "Eleuthero root", form: "10:1 dry extract", dose: "100mg", dv: "†", function: "Energy / endurance", source: "Naturex" },
              ]},
          ],
          otherIngredients: "Vegetable glycerin, spring water, natural honey-vanilla flavor, citric acid, potassium sorbate.",
        },
        formatMath: { kind: "none" },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "blend", name: "Adrenal Support Blend", dose: "1,050mg",
              items: ["Ashwagandha 400mg", "Rhodiola 300mg", "Holy basil 250mg", "Eleuthero 100mg"] },
          ],
          brandedIngredients: [],
        },
        mfgNotes: { manufacturer: "BioCorp (Talha contracts here)", confirmations: ["Glycerite base compatible w/ BioCorp line"], warnings: ["Holy basil aroma — confirm with flavor house"] },
        requiredStatements: ["ALCOHOL-FREE", "VEGAN", "GLUTEN-FREE", "MADE IN USA"],
        dualPositioning: {
          bottle: "Adrenal Support Drops · Stress + Energy",
          boxFront: "Built for the burnout era. A 4-herb adaptogen blend Talha calls 'the calm engine'.",
          boxBack: "When mornings feel heavy and afternoons drag, your adrenals are running the show. Adrenal Drops blend four time-tested adaptogens in a glycerite base that absorbs in seconds — no capsule, no pill fatigue, just a clean lift.",
        },
      },

      // v2 (current)
      { v: 2, by: "talha", daysAgo: 2, status: "confirmed",
        note: "Approved sample. Holy basil 250 → 200mg (flavor balance). Added schisandra 50mg for the '5-element' story Joel wanted.",
        source: "Talha sample R2 — APPROVED by Chesky",
        identity: {
          format: "Liquid drops, alcohol-free glycerite",
          servingSize: "1 mL (≈ 30 drops)",
          servingsPerContainer: 60,
          bottleSize: "2 fl oz amber glass",
          dropperSize: "Glass dropper, 1 mL graduated",
          base: "Vegetable glycerin + spring water (60/40)",
          alcohol: "0% (glycerite)",
          flavor: "Honey-vanilla",
          launchQty: "5,000 bottles",
        },
        formula: {
          sections: [
            { label: "5-ADAPTOGEN BLEND", subtotal: "Total: 1,050mg / serving",
              rows: [
                { name: "Ashwagandha root extract", form: "1:2 fluid extract", dose: "400mg", dv: "†", function: "HPA-axis adaptogen", source: "Naturex" },
                { name: "Rhodiola rosea root", form: "3% rosavins", dose: "300mg", dv: "†", function: "Stress resilience", source: "Stauber" },
                { name: "Holy basil leaf", form: "1:2 fresh extract", dose: "200mg", dv: "†", function: "Cortisol modulation", source: "Mountain Rose" },
                { name: "Eleuthero root", form: "10:1 dry extract", dose: "100mg", dv: "†", function: "Energy / endurance", source: "Naturex" },
                { name: "Schisandra berry", form: "9:1 dry extract", dose: "50mg", dv: "†", function: "5-element completion", source: "Mountain Rose" },
              ]},
          ],
          otherIngredients: "Vegetable glycerin, spring water, natural honey-vanilla flavor, citric acid, potassium sorbate.",
        },
        formatMath: { kind: "none" },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "blend", name: "5-Adaptogen Blend", dose: "1,050mg",
              items: ["Ashwagandha 400mg", "Rhodiola 300mg", "Holy basil 200mg", "Eleuthero 100mg", "Schisandra 50mg"] },
          ],
          brandedIngredients: [],
        },
        mfgNotes: {
          manufacturer: "BioCorp Nutrition Labs (Chris)",
          leadTime: "45d post-PO",
          moq: "5,000 bottles",
          confirmations: ["Glycerite stability confirmed at 24mo", "Flavor approved by Chesky · sample R2", "All 5 actives in stock at BioCorp"],
          warnings: [],
        },
        requiredStatements: ["ALCOHOL-FREE", "VEGAN", "GLUTEN-FREE", "MADE IN USA", "GMP-CERTIFIED FACILITY"],
        dualPositioning: {
          bottle: "Adrenal Drops · 5 adaptogens, zero pill fatigue",
          boxFront: "The 5-element formula. Built by Talha for the burnout era — adaptogens that hit fast in a glycerite base.",
          boxBack: "When stress runs your day, your adrenals run the show. Adrenal Drops blend five time-tested adaptogens — ashwa, rhodiola, holy basil, eleuthero, schisandra — in a clean glycerite. Sublingual onset, no capsule fatigue, no alcohol burn. Built around the 5-element pattern that traditional herbalism has used for centuries; modernized with standardized potencies you can verify on the label.",
        },
      },
    ],
  },

  // ============================================================
  // B-103 · PN-EnergyMix · Powder · Pre-workout
  // Locked, in production. Talha sampled, TS Food Packaging executes.
  // ============================================================
  "B-103": {
    currentVersion: 4,
    lockedAt: 18,
    sentToManufacturer: "TS Food Packaging",
    versions: [
      // v3 — pre-flavor lock
      { v: 3, by: "talha", daysAgo: 22, status: "draft",
        note: "Pre-flavor lock — actives finalized. Flavor pending Chesky review.",
        source: "Talha sample R3",
        identity: {
          format: "Drink mix powder",
          servingSize: "1 scoop (12g)",
          servingsPerContainer: 30,
          bagSize: "Stand-up pouch, matte black, foil interior",
          scoopSize: "12g (included)",
          netWeight: "360g (12.7 oz)",
          totalRunWeight: "1,800kg",
          flavor: "Blue raspberry (pending)",
          launchQty: "5,000 bags",
        },
        formula: {
          sections: [
            { label: "ENERGY MATRIX",
              rows: [
                { name: "L-Citrulline malate", form: "2:1", dose: "6,000mg", dv: "†", function: "Pump / NO support", source: "Stauber" },
                { name: "Beta-alanine", form: "CarnoSyn", dose: "3,200mg", dv: "†", function: "Endurance / lactate buffer", source: "NAI (sole-source)" },
                { name: "Caffeine anhydrous", form: "USP", dose: "200mg", dv: "†", function: "Stimulant", source: "TBD — backorder" },
                { name: "L-Tyrosine", form: "Free-form", dose: "1,000mg", dv: "†", function: "Focus / mood", source: "Stauber" },
              ]},
            { label: "ELECTROLYTES",
              rows: [
                { name: "Sodium (Himalayan pink salt)", form: "—", dose: "180mg", dv: "8%", function: "Hydration", source: "Stauber" },
                { name: "Potassium citrate", form: "—", dose: "120mg", dv: "3%", function: "Hydration", source: "Albion" },
              ]},
          ],
          otherIngredients: "Natural & artificial flavor, citric acid, malic acid, sucralose, silicon dioxide, FD&C Blue #1.",
        },
        formatMath: { kind: "blend-math",
          scoopWeight: "12g", bagWeight: "360g",
          servingsCalculation: "30 servings × 12g = 360g · checks out",
        },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "blend", name: "Energy Matrix", dose: "10,400mg",
              items: ["L-Citrulline malate 6g", "Beta-alanine 3.2g", "Caffeine 200mg", "L-Tyrosine 1g"] },
            { kind: "blend", name: "Electrolyte Blend", dose: "300mg",
              items: ["Sodium 180mg", "Potassium 120mg"] },
          ],
          brandedIngredients: [
            { mark: "CarnoSyn®", owner: "Natural Alternatives International (NAI)" },
          ],
        },
        mfgNotes: { manufacturer: "TS Food Packaging (Kim) — Talha samples in-house first", confirmations: [], warnings: ["Caffeine vendor TBD — backorder situation"] },
        requiredStatements: ["GLUTEN-FREE", "MADE IN USA", "CONTAINS 200MG CAFFEINE/SERVING"],
      },

      // v4 (current)
      { v: 4, by: "ronel", daysAgo: 18, status: "confirmed",
        note: "Locked. Flavor approved (Blue Raspberry). Caffeine vendor pivoted Stauber → BulkSupplements (in stock). Sent to TS Food Packaging.",
        source: "Final spec sheet — sent to TS",
        identity: {
          format: "Drink mix powder",
          servingSize: "1 scoop (12g)",
          servingsPerContainer: 30,
          bagSize: "Stand-up pouch, matte black, foil interior",
          scoopSize: "12g (included)",
          netWeight: "360g (12.7 oz)",
          totalRunWeight: "1,800kg",
          flavor: "Blue Raspberry",
          launchQty: "5,000 bags",
          brandedIngredients: "CarnoSyn®",
        },
        formula: {
          sections: [
            { label: "ENERGY MATRIX",
              rows: [
                { name: "L-Citrulline malate", form: "2:1", dose: "6,000mg", dv: "†", function: "Pump / NO support", source: "Stauber" },
                { name: "Beta-alanine (CarnoSyn)", form: "Patented", dose: "3,200mg", dv: "†", function: "Endurance / lactate buffer", source: "NAI (sole-source)" },
                { name: "Caffeine anhydrous", form: "USP", dose: "200mg", dv: "†", function: "Stimulant", source: "BulkSupplements" },
                { name: "L-Tyrosine", form: "Free-form", dose: "1,000mg", dv: "†", function: "Focus / mood", source: "Stauber" },
              ]},
            { label: "ELECTROLYTES",
              rows: [
                { name: "Sodium (Himalayan pink salt)", form: "—", dose: "180mg", dv: "8%", function: "Hydration", source: "Stauber" },
                { name: "Potassium citrate", form: "—", dose: "120mg", dv: "3%", function: "Hydration", source: "Albion" },
              ]},
          ],
          otherIngredients: "Natural & artificial blue raspberry flavor, citric acid, malic acid, sucralose, silicon dioxide (anti-cake), FD&C Blue #1.",
        },
        formatMath: { kind: "blend-math",
          scoopWeight: "12g", bagWeight: "360g",
          servingsCalculation: "30 servings × 12g = 360g · checks out",
        },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "blend", name: "Energy Matrix", dose: "10,400mg",
              items: ["L-Citrulline malate 6g", "Beta-alanine 3.2g", "Caffeine 200mg", "L-Tyrosine 1g"] },
            { kind: "blend", name: "Electrolyte Blend", dose: "300mg",
              items: ["Sodium 180mg", "Potassium 120mg"] },
          ],
          brandedIngredients: [
            { mark: "CarnoSyn®", owner: "Natural Alternatives International (NAI)" },
          ],
        },
        mfgNotes: {
          manufacturer: "TS Food Packaging (Kim)",
          leadTime: "60d post-PO (1,800kg run + 5,000 pouches)",
          moq: "5,000 bags",
          confirmations: ["Talha sampled in-house — taste/mixability approved by Chesky", "All ingredients in stock at TS warehouse", "Pouch + scoop spec confirmed"],
          warnings: ["Beta-alanine tingles at this dose — flag on bottle ('PARESTHESIA NORMAL')"],
        },
        requiredStatements: ["GLUTEN-FREE", "MADE IN USA", "CONTAINS 200MG CAFFEINE/SERVING", "PARESTHESIA NORMAL — TINGLE FROM BETA-ALANINE"],
      },
    ],
  },
};

// ---------- Merge into PRODUCTS at runtime ----------
(function mergeSpecSheetsV2() {
  if (!window.PIPELINE_DATA?.PRODUCTS) return;
  for (const p of window.PIPELINE_DATA.PRODUCTS) {
    if (SPEC_SHEETS_V2[p.id]) {
      p.specSheetV2 = SPEC_SHEETS_V2[p.id];
    }
  }
})();
