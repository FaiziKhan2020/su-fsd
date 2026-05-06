/* global window */
// =============================================================================
// REAL SPEC SHEET FIXTURES
// Parsed from real Word docs in uploads/:
//   HC498-DON-LiverDetox-SPEC-v6.docx       → matched to product HC304
//   HL432-DON-LymphaticDrops-SPEC-v3.docx   → matched to product HL432
//   HP190-PELLA-SLIM-COFFEE-SPEC-v3.docx    → matched to product HP206
//
// Used by the Spec Sheet drop-zone in the Formulation tab — when the user
// "drops" a doc, the parser stub returns the matching real spec for these
// three products (otherwise a generic placeholder).
// =============================================================================

window.SPEC_SHEETS_REAL = {

  // ============================================================
  // HC304 · DON · 11-in-1 Liver Support Capsules
  // From: HC498-DON-LiverDetox-SPEC-v6.docx
  // ============================================================
  HC304: {
    sourceFile: "HC498-DON-LiverDetox-SPEC-v6.docx",
    spec: {
      currentVersion: 1,
      lockedAt: { daysAgo: 0, by: "malik" },
      sentToManufacturer: null,
      versions: [{
        v: 1, by: "malik", daysAgo: 0, status: "confirmed",
        note: "Parsed from HC498-DON-LiverDetox-SPEC-v6.docx — confirmed by Mimi at Herbally Yours",
        identity: {
          format: "Capsule (Size 00 Elongated, HPMC vegetarian)",
          servingSize: "2 capsules",
          servingsPerContainer: 30,
          capsuleSize: "Size 00 Elongated (00E)",
          capsuleCount: "60ct",
          bottleSpec: "250cc HDPE amber",
          launchQty: "3,334 bottles (200,040 capsules)",
          brandedIngredients: "ThistleMarin™, Hydromeric®, HPLC-Gingerols™ (all JiaHerb)",
        },
        formula: {
          sections: [
            { label: "VITAMINS (listed separately — have %DV)", subtotal: "35.5mg",
              rows: [
                { name: "Vitamin B1", form: "Thiamine HCl", dose: "25mg", dv: "2,083%" },
                { name: "Vitamin B6", form: "Pyridoxine HCl", dose: "10mg", dv: "588%" },
                { name: "Vitamin B12", form: "Methylcobalamin", dose: "500mcg", dv: "20,833%" },
              ]},
            { label: "HEROES — outside blend, clinical doses", subtotal: "800mg",
              rows: [
                { name: "Milk Thistle (ThistleMarin™)", form: "80% Silymarin HPLC, USP", dose: "300mg", dv: "†" },
                { name: "DHM (Dihydromyricetin)", form: "98% HPLC", dose: "200mg", dv: "†" },
                { name: "NAC (N-Acetyl Cysteine)", form: "99% HPLC, POWDER only", dose: "200mg", dv: "†" },
                { name: "Dandelion Root Extract", form: "4:1 TLC", dose: "100mg", dv: "†" },
              ]},
            { label: "LIVER SUPPORT BLEND", subtotal: "100mg",
              rows: [
                { name: "Turmeric (Hydromeric®)", form: "Water-soluble, 10% Curcuminoids HPLC", dose: "25mg", dv: "†" },
                { name: "Beet Root Extract", form: "4:1 TLC", dose: "25mg", dv: "†" },
                { name: "Ginger (HPLC-Gingerols™)", form: "5% Gingerols HPLC", dose: "25mg", dv: "†" },
                { name: "Artichoke Extract", form: "5% Cynarine UV", dose: "25mg", dv: "†" },
              ]},
          ],
          otherIngredients: "Vegetarian Capsule (HPMC), Rice Flour, Magnesium Stearate (vegetable source).",
        },
        formatMath: { kind: "capsule-fit",
          totalFillPerServing: "935.5mg", fillPerCapsule: "468mg",
          capsule: "Size 00 Elongated (00E)", maxFill: "600mg @ 0.6g/ml",
          utilization: "78%", utilizationStatus: "ok",
          notes: "78% leaves headroom for NAC moisture absorption (NAC is hygroscopic).",
        },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "individual", name: "Thiamine HCl (B1)", dose: "25mg" },
            { kind: "individual", name: "Pyridoxine HCl (B6)", dose: "10mg" },
            { kind: "individual", name: "Methylcobalamin (B12)", dose: "500mcg" },
            { kind: "individual", name: "Milk Thistle (ThistleMarin™)", dose: "300mg" },
            { kind: "individual", name: "DHM (Dihydromyricetin)", dose: "200mg" },
            { kind: "individual", name: "NAC", dose: "200mg" },
            { kind: "individual", name: "Dandelion Root 4:1", dose: "100mg" },
            { kind: "blend", name: "Liver Support Blend", dose: "100mg",
              items: ["Turmeric (Hydromeric®) 25mg", "Beet Root 4:1 25mg", "Ginger (HPLC-Gingerols™) 25mg", "Artichoke 25mg"] },
          ],
          brandedIngredients: [
            { mark: "ThistleMarin™", owner: "JiaHerb, Inc." },
            { mark: "Hydromeric®", owner: "JiaHerb, Inc." },
            { mark: "HPLC-Gingerols™", owner: "JiaHerb, Inc." },
          ],
        },
        mfgNotes: {
          manufacturer: "Mimi · Herbally Yours",
          leadTime: "8–12 weeks",
          moq: "200,000 capsules (= 3,334 bottles)",
          confirmations: [
            "Mimi confirmed 00E capsule fit at 78% utilization",
            "NAC must be POWDER form (Craig at JiaHerb confirmed powder available — not granular)",
            "B vitamins sourced separately (vendor MOQs)",
          ],
          warnings: [
            "NAC is hygroscopic — keep utilization under 85% to leave moisture headroom",
            "Ginger + Artichoke samples requested — must ship to Mimi for R&D confirmation",
          ],
        },
        requiredStatements: ["GLUTEN-FREE", "NON-GMO", "VEGAN", "MADE IN USA", "GMP-CERTIFIED"],
      }],
    },
  },

  // ============================================================
  // HL432 · DON · 10-in-1 Lymphatic Drainage Drops (liquid)
  // From: HL432-DON-LymphaticDrops-SPEC-v3.docx
  // ============================================================
  HL432: {
    sourceFile: "HL432-DON-LymphaticDrops-SPEC-v3.docx",
    spec: {
      currentVersion: 1,
      lockedAt: { daysAgo: 0, by: "malik" },
      sentToManufacturer: null,
      versions: [{
        v: 1, by: "malik", daysAgo: 0, status: "confirmed",
        note: "Parsed from HL432-DON-LymphaticDrops-SPEC-v3.docx — March 2026, R&D approved",
        identity: {
          format: "Liquid extract drops",
          servingSize: "2ml (≈1 dropper)",
          servingsPerContainer: 30,
          bottleSize: "2 fl oz (60ml) amber glass + dropper",
          dropperSize: "2ml dropper",
          base: "Vegetable Glycerin + Purified Water",
          alcohol: "Alcohol-Free",
          flavor: "Natural Strawberry + Lemon Lime",
          launchQty: "3,000 units · 63/case (15×12×5)",
        },
        formula: {
          sections: [
            { label: "INDIVIDUAL HEROES", subtotal: "266mg",
              rows: [
                { name: "Dandelion Root Extract", form: "10:1", dose: "100mg", dv: "†" },
                { name: "Burdock Root Extract", form: "4:1", dose: "100mg", dv: "†" },
                { name: "Cleavers Herb", form: "Powder", dose: "66mg", dv: "†" },
              ]},
            { label: "PROPRIETARY HERBAL BLEND (7 herbs, equal weight)", subtotal: "100mg",
              rows: [
                { name: "Ginger Root Extract", form: "5% Gingerols", dose: "≈14mg", dv: "†" },
                { name: "Echinacea Root Extract", form: "4:1", dose: "≈14mg", dv: "†" },
                { name: "Elderberry Extract", form: "Extract", dose: "≈14mg", dv: "†" },
                { name: "Mullein Leaf Extract", form: "4:1", dose: "≈14mg", dv: "†" },
                { name: "Calendula Flower", form: "Powder", dose: "≈14mg", dv: "†" },
                { name: "Green Tea Extract", form: "50% Polyphenols", dose: "≈14mg", dv: "†" },
                { name: "Soursop Leaf Extract", form: "Extract", dose: "≈14mg", dv: "†" },
              ]},
          ],
          otherIngredients: "Vegetable Glycerin, Purified Water, Potassium Sorbate, Citric Acid, Natural Strawberry Flavor, Natural Lemon Lime Flavor.",
        },
        formatMath: { kind: "none" },
        labelStructure: {
          panelType: "SFP",
          structure: [
            { kind: "individual", name: "Dandelion Root Extract (10:1)", dose: "100mg" },
            { kind: "individual", name: "Burdock Root Extract (4:1)", dose: "100mg" },
            { kind: "individual", name: "Cleavers Herb Powder", dose: "66mg" },
            { kind: "blend", name: "Proprietary Herbal Blend (7 herbs)", dose: "100mg",
              items: ["Ginger 5% Gingerols", "Echinacea Root 4:1", "Elderberry Extract", "Mullein Leaf 4:1", "Calendula Flower", "Green Tea 50% Polyphenols", "Soursop Leaf Extract"] },
          ],
        },
        mfgNotes: {
          manufacturer: "TBD — quoting",
          confirmations: ["Hybrid SFP (3 individual + 1 blend) approved", "Dual flavor approved by Chesky"],
          warnings: ["Potassium Sorbate preservative required — confirm with mfg lab"],
        },
        requiredStatements: ["GLUTEN-FREE", "NON-GMO", "VEGAN", "ALCOHOL-FREE", "NO ARTIFICIAL COLORS/FLAVORS", "NO ARTIFICIAL PRESERVATIVES", "MADE IN USA", "GMP-CERTIFIED"],
        dualPositioning: {
          bottle: "10-in-1 LYMPHATIC DRAINAGE DROPS · Dandelion · Burdock · Cleavers",
          boxFront: "10-IN-1 LYMPHATIC SUPPORT FORMULA · Hero: Dandelion + Burdock · botanical illus., trust badges, dual flavor callout",
          boxBack: "DRAIN. DETOX. DEBLOAT.† · Lymphatic Drainage & Detox Support · Bloating & Water Retention Relief · 10 Active Herbs · Lifestyle illus + value story (What You're Holding → How It Works → Why It's Different → Close)",
        },
      }],
    },
  },

  // ============================================================
  // HP206 · PN · Slim Mushroom Coffee+ (food / powder)
  // From: HP190-PELLA-SLIM-COFFEE-SPEC-v3-FINAL.docx
  // ============================================================
  HP206: {
    sourceFile: "HP190-PELLA-SLIM-COFFEE-SPEC-v3-FINAL.docx",
    spec: {
      currentVersion: 1,
      lockedAt: { daysAgo: 0, by: "malik" },
      sentToManufacturer: null,
      versions: [{
        v: 1, by: "malik", daysAgo: 0, status: "draft",
        note: "Parsed from HP190-PELLA-SLIM-COFFEE-SPEC-v3-FINAL.docx — pending Luis sampling",
        identity: {
          format: "Food / coffee powder (NFP — not supplement)",
          servingSize: "1 scoop (4g) · 7.5cc spoon",
          servingsPerContainer: 30,
          bagSize: '7" × 7.5" SUP, zipper + tear notch',
          scoopSize: "7.5cc (4g)",
          netWeight: "120g (4.2 oz)",
          totalRunWeight: "360 kg (3,000 × 120g)",
          launchQty: "3,000 bags",
        },
        formula: {
          sections: [
            { label: "BASE", subtotal: "3,500mg",
              rows: [
                { name: "Arabica Instant Coffee", form: "Instant", dose: "3,500mg", dv: "—" },
              ]},
            { label: "5-MUSHROOM BLEND (fruiting body)", subtotal: "150mg",
              rows: [
                { name: "Turkey Tail Extract", form: "Fruiting body", dose: "30mg", dv: "—" },
                { name: "Lion's Mane Extract", form: "Fruiting body", dose: "30mg", dv: "—" },
                { name: "Cordyceps Extract", form: "Fruiting body", dose: "30mg", dv: "—" },
                { name: "Shiitake Extract", form: "Fruiting body", dose: "30mg", dv: "—" },
                { name: "Chaga Extract", form: "Fruiting body", dose: "30mg", dv: "—" },
              ]},
            { label: "METABOLISM BLEND", subtotal: "350mg",
              rows: [
                { name: "L-Theanine", form: "98% purity", dose: "100mg", dv: "—" },
                { name: "Green Tea Extract", form: "50% EGCG", dose: "40mg", dv: "—" },
                { name: "Yerba Mate Extract", form: "4:1", dose: "40mg", dv: "—" },
                { name: "Ceylon Cinnamon Extract", form: "4:1 (Cinnamomum verum)", dose: "40mg", dv: "—" },
                { name: "Apple Cider Vinegar Powder", form: "Powder", dose: "20mg", dv: "—" },
                { name: "Inulin (Prebiotic Fiber)", form: "90%", dose: "75mg", dv: "—" },
                { name: "Bacillus Coagulans", form: "Probiotic, shelf-stable spore", dose: "35mg", dv: "—" },
              ]},
          ],
          otherIngredients: "—",
        },
        formatMath: { kind: "blend-math",
          scoopWeight: "4g (7.5cc spoon)",
          bagWeight: "120g",
          servingsCalculation: "30 servings × 4g = 120g · checks out",
        },
        labelStructure: {
          panelType: "NFP",
          structure: [
            { kind: "individual", name: "Arabica Instant Coffee", dose: "3,500mg" },
            { kind: "blend", name: "5-Mushroom Blend (fruiting body)", dose: "150mg",
              items: ["Turkey Tail 30mg", "Lion's Mane 30mg", "Cordyceps 30mg", "Shiitake 30mg", "Chaga 30mg"] },
            { kind: "blend", name: "Metabolism Blend", dose: "350mg",
              items: ["L-Theanine 100mg", "Green Tea 50% EGCG 40mg", "Yerba Mate 40mg", "Ceylon Cinnamon 40mg", "ACV Powder 20mg", "Inulin 75mg", "Bacillus Coagulans 35mg"] },
          ],
        },
        mfgNotes: {
          manufacturer: "TS Food Packaging (Luis)",
          leadTime: "TBD (pending quote — blending + filling, 3,000 units)",
          moq: "3,000 bags",
          confirmations: [
            "We supply ALL ingredients + pouches; TS handles blending + filling only",
            "All ingredients in stock at TS warehouse",
            "Bacillus Coagulans is shelf-stable (spore-forming) — store under 70°F",
          ],
          warnings: [
            "Doses are TARGETS — pending Luis sampling confirmation",
            "Ceylon Cinnamon must be Cinnamomum verum (NOT cassia)",
            "LOT + EXP stamped by TS at production",
          ],
        },
        requiredStatements: ["GLUTEN-FREE", "VEGAN", "CONTAINS ~80MG CAFFEINE/CUP", "MADE IN USA", "STORE UNDER 70°F"],
      }],
    },
  },

};
