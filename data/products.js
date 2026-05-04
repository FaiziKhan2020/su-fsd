// =============================================================================
// R&D Pipeline OS — data model
// Real workflow:
//   Idea → Niche Analysis → Niche Approval → [Sourcing ∥ Design ∥ Listing] → Production
// =============================================================================
window.PIPELINE_DATA = (() => {

  // ---- Stages ----------------------------------------------------------------
  const STAGES = [
    { id: "idea",        label: "Idea",            color: "slate",   shortLabel: "Idea" },
    { id: "niche",       label: "Niche Analysis",  color: "violet",  shortLabel: "Niche" },
    { id: "approval",    label: "Niche Approval",  color: "amber",   shortLabel: "Approval" },
    { id: "build",       label: "In Build",        color: "sky",     shortLabel: "Build",
      sublabel: "Sourcing · Design · Listing run in parallel" },
    { id: "production",  label: "Production",      color: "emerald", shortLabel: "Production" },
    { id: "launched",    label: "Launched",        color: "teal",    shortLabel: "Live" },
    { id: "hold",        label: "Hold",            color: "rose",    shortLabel: "Hold" },
    { id: "parked",      label: "Parked",          color: "stone",   shortLabel: "Parked" },
  ];

  // ---- Types & Brands --------------------------------------------------------
  const TYPES = {
    capsule: { label: "Capsule", glyph: "◐" },
    liquid:  { label: "Liquid",  glyph: "◯" },
    gummy:   { label: "Gummy",   glyph: "◆" },
    powder:  { label: "Powder",  glyph: "▦" },
    food:    { label: "Food",    glyph: "▲" },
    topical: { label: "Topical", glyph: "□" },
    softgel: { label: "Softgel", glyph: "●" },
  };

  const BRANDS = {
    DON: { label: "Drops of Nature", short: "DON" },
    PN:  { label: "Pure Nutrients",  short: "PN"  },
  };

  // ---- People ----------------------------------------------------------------
  // Roles: leadership, rd, purchasing, design, image, listing
  const PEOPLE = [
    { id: "chesky", name: "Chesky",  role: "leadership", title: "Founder · Overseer",          avatar: "C", color: "oklch(70% 0.13 260)" },
    { id: "joel",   name: "Joel",    role: "leadership", title: "Partner · Purchasing & Finance", avatar: "J", color: "oklch(70% 0.13 285)" },
    { id: "malik",  name: "Malik",   role: "rd",         title: "R&D Lead",                    avatar: "M", color: "oklch(70% 0.13 30)"  },
    { id: "ronel",  name: "Ronel",   role: "purchasing", title: "Purchasing Lead",             avatar: "R", color: "oklch(70% 0.13 150)" },
    { id: "april",  name: "April",   role: "listing",    title: "Head of Catalog",             avatar: "A", color: "oklch(70% 0.13 200)" },
    { id: "esty",   name: "Esty",    role: "design",     title: "Designer · Label / Box / Insert", avatar: "E", color: "oklch(70% 0.13 320)" },
    { id: "paresh", name: "Paresh",  role: "image",      title: "Main Image Designer",         avatar: "P", color: "oklch(70% 0.13 60)"  },
    { id: "qaiser", name: "Qaiser",  role: "image",      title: "Gallery + A+ Designer",       avatar: "Q", color: "oklch(70% 0.13 100)" },
  ];

  const ROLES = {
    leadership: { label: "Leadership", color: "oklch(70% 0.13 260)" },
    rd:         { label: "R&D",        color: "oklch(70% 0.13 30)"  },
    purchasing: { label: "Purchasing", color: "oklch(70% 0.13 150)" },
    design:     { label: "Design",     color: "oklch(70% 0.13 320)" },
    image:      { label: "Imagery",    color: "oklch(70% 0.13 60)"  },
    listing:    { label: "Listing",    color: "oklch(70% 0.13 200)" },
  };

  // ---- Helpers ---------------------------------------------------------------
  const v = (n, by, daysAgo, note, payload) => ({ n, by, daysAgo, note, payload });

  // ---- Niche Analysis structure (mirrors the Google Sheet template) ----------
  // Sections: overview, market, competitors, differentiation, formula, packaging, verdict, keywords
  const HC304_NICHE = {
    concept: "Liver detox capsule positioned for cortisol/GLP-1 era — combines milk thistle, NAC, and dandelion at full clinical doses, hero ingredient front-and-center on label.",
    format: "Capsule",
    signal: "R&D Recommendation",
    market: {
      svMonthly: "1.2M+",
      revMonthly: "$22M",
      trend: "Rising",
      growth: '⬆ "liver detox" +42%',
      cvr: "7.20%",
      dominantFormat: "Capsules & Drops",
      tiktok: "High — top seller $180k/mo",
    },
    barrier: {
      summary: "Low-Medium",
      detail: "8 sellers >$50k/mo with <700 reviews. $25 sweet spot. Top brand 31% share but $300M+ market — plenty of room.",
    },
    differentiation: {
      angle: "Hero dandelion + clinical-dose milk thistle (most competitors pixie-dust). Pulls glutathione (poor oral bioavailability story).",
      whitespace: "No competitor positions on cortisol/GLP-1 era. We can own that copy.",
    },
    formula: [
      { ing: "Milk Thistle (80% silymarin)", dose: "300mg", rationale: "Clinical dose; competitors at 100mg" },
      { ing: "NAC", dose: "600mg", rationale: "Glutathione precursor — replaces direct glutathione" },
      { ing: "Dandelion Root", dose: "200mg", rationale: "Hero ingredient — front-of-label" },
      { ing: "Artichoke Extract", dose: "150mg", rationale: "Bile flow support" },
      { ing: "Turmeric (95% curcuminoids)", dose: "100mg", rationale: "Anti-inflammatory" },
    ],
    packaging: "Amber bottle, dandelion illustration hero, clinical-but-warm typography",
    verdict: { recommendation: "Proceed", confidence: "High",
      summary: "Strong market signal, differentiation defensible, formula competitive at $28-32 retail. Approved for build." },
    keywords: [
      { kw: "liver detox", sv: 89000, cpc: "$2.41" },
      { kw: "milk thistle supplement", sv: 67000, cpc: "$1.92" },
      { kw: "liver cleanse pills", sv: 41000, cpc: "$3.12" },
      { kw: "dandelion root capsules", sv: 18500, cpc: "$1.65" },
      { kw: "nac supplement", sv: 134000, cpc: "$2.89" },
    ],
  };

  const HCAPS_HAIR_NICHE = {
    concept: "Hair growth supplement that pairs the standard growth stack (Biotin, Collagen, Saw Palmetto) with stress-reducing adaptogens (Ashwagandha, Rhodiola) — cortisol-driven hair thinning is a top complaint and nobody is connecting the stress-to-hair-loss mechanism in their positioning.",
    format: "Capsules",
    signal: "R&D Recommendation",
    market: {
      svMonthly: "1.5M+",
      revMonthly: "$30.5M",
      trend: "Rising",
      growth: '⬆ "hair skin and nails vitamins" +65.56%; "hair growth supplements" +56.50%',
      cvr: "8.50%",
      dominantFormat: "Capsules & Gummies",
      tiktok: "High — top seller $246k/mo, top videos 2.5M+ views",
    },
    barrier: {
      summary: "Low-Medium",
      detail: "5 competitors >$50k/mo with <700 reviews. 4 new entrants (<12mo) doing $50k+. Top-heavy (Nutrafol 43%) but $300M+ available. $30 sweet pricing spot, no price wars. Main barrier is review velocity (5K-36K reviews on top sellers).",
    },
    differentiation: {
      angle: "'Hair Growth + Calm' — the only product positioning on the cortisol→hair-loss mechanism. Stress/relaxation keyword pools are completely unindexed by hair competitors.",
      whitespace: "Adaptogen + hair vertical is wide open. Capsule format avoids 9-12 month gummy dev cycle.",
    },
    formula: [
      { ing: "Biotin", dose: "5000mcg", rationale: "Standard hair growth foundation" },
      { ing: "Marine Collagen", dose: "500mg", rationale: "Type I collagen for hair shaft" },
      { ing: "Saw Palmetto", dose: "320mg", rationale: "DHT blocker — hits 'dht blocker' KW pool" },
      { ing: "Ashwagandha (KSM-66)", dose: "600mg", rationale: "Cortisol reduction — DIFFERENTIATOR" },
      { ing: "Rhodiola Rosea", dose: "200mg", rationale: "Adaptogen stack — DIFFERENTIATOR" },
      { ing: "Pumpkin Seed Oil", dose: "500mg", rationale: "Hits 'pumpkin seed oil + saw palmetto' KW (116k SV)" },
      { ing: "Zinc + Iron + Vitamin D3", dose: "blend",  rationale: "Supporting micros" },
    ],
    packaging: "Calm-meets-clinical: dusty-rose label with botanical illustration, ashwagandha + biotin called out as hero ingredients, 'Calm Stack' callout badge",
    verdict: { recommendation: "Proceed", confidence: "High",
      summary: "Massive market ($30.5M/mo), defensible angle (cortisol/hair mechanism completely uncontested), validated capsule format. PPC strategy critical for first 6 months to close review-velocity gap. Approved for build." },
    keywords: [
      { kw: "hair growth", sv: 280589, cpc: "$2.33" },
      { kw: "hair skin and nails vitamins", sv: 183885, cpc: "$2.83" },
      { kw: "hair growth supplements", sv: 117942, cpc: "$3.81" },
      { kw: "biotin for hair growth women", sv: 106097, cpc: "$12.58" },
      { kw: "biotin 10000mcg", sv: 81461, cpc: "$2.97" },
      { kw: "hair vitamins", sv: 66731, cpc: "$2.61" },
      { kw: "saw palmetto for women", sv: 41481, cpc: "$7.23" },
      { kw: "dht blocker for women hair growth", sv: 30807, cpc: "$2.99" },
      { kw: "hair vitamins for women", sv: 36928, cpc: "$12.58" },
    ],
  };

  // ---- BOM / Sourcing samples ------------------------------------------------
  const BOM = (rows) => rows.map((r, i) => ({ id: `bom-${i+1}`, ...r }));

  // Standard packaging line items
  const PKG_BOM = (label = "Label") => ([
    { name: `${label} (printed)`, kind: "packaging", vendor: "Forefront Print", status: "ordered", costPerUnit: 0.18, leadDays: 14, qty: 5000, total: 900, note: "" },
    { name: "Bottle (200cc HDPE amber)", kind: "packaging", vendor: "Berlin Packaging", status: "ordered", costPerUnit: 0.42, leadDays: 21, qty: 5000, total: 2100, note: "" },
    { name: "Cap (38-400 white CRC)", kind: "packaging", vendor: "Berlin Packaging", status: "ordered", costPerUnit: 0.08, leadDays: 21, qty: 5000, total: 400, note: "" },
    { name: "Carton (printed, 4-color)", kind: "packaging", vendor: "Forefront Print", status: "quoted", costPerUnit: 0.55, leadDays: 18, qty: 5000, total: 2750, note: "Awaiting label finalization" },
    { name: "Insert (folded leaflet)", kind: "packaging", vendor: "Forefront Print", status: "quoted", costPerUnit: 0.06, leadDays: 14, qty: 5000, total: 300, note: "" },
  ]);

  // ---- Listing content samples -----------------------------------------------
  const LISTING_HC304 = {
    title: "Premium Liver Detox & Cleanse Supplement — Milk Thistle, NAC, Dandelion Root, Artichoke — Liver Health Support for Adults — 60 Capsules",
    bullets: [
      "CLINICAL DOSE MILK THISTLE — 300mg of 80% silymarin extract per serving (most competitors at 100mg or less).",
      "DANDELION ROOT HERO — 200mg of full-spectrum dandelion root, traditional liver tonic, front and center.",
      "GLUTATHIONE PRECURSOR — 600mg NAC delivers what oral glutathione cannot. Backed by clinical evidence.",
      "BILE FLOW & DETOX SUPPORT — Artichoke extract + turmeric work synergistically with the liver blend.",
      "NON-GMO, GLUTEN-FREE, MADE IN USA — Third-party tested. cGMP facility. 60 vegetable capsules per bottle.",
    ],
    description: "Your liver processes everything you eat, drink, and breathe. Modern life — chronic stress, ultra-processed foods, environmental toxins — puts that organ under sustained pressure. Premium Liver Detox is built around what actually works: clinical-dose milk thistle (300mg of 80% silymarin), NAC for glutathione production, and hero dandelion root at 200mg.",
    keywords: ["liver detox", "milk thistle supplement", "liver cleanse pills", "dandelion root capsules", "nac supplement", "liver health", "silymarin", "artichoke extract", "detox supplement adults", "liver support"].join(", "),
    category: "Health & Household > Vitamins, Minerals & Supplements > Herbal > Milk Thistle",
    images: [
      { slot: "main",    designer: "paresh", status: "approved", note: "Hero shot, white BG" },
      { slot: "gallery1", designer: "qaiser", status: "approved", note: "Ingredient breakdown" },
      { slot: "gallery2", designer: "qaiser", status: "approved", note: "Lifestyle — morning routine" },
      { slot: "gallery3", designer: "qaiser", status: "draft", note: "Comparison chart vs Nutrafol" },
      { slot: "gallery4", designer: "qaiser", status: "draft", note: "Doctor / clinical credibility" },
      { slot: "gallery5", designer: "qaiser", status: "missing", note: "" },
      { slot: "aplus",   designer: "qaiser", status: "draft", note: "A+ module 1 of 4" },
    ],
    track: {
      created:    { done: true,  date: "2025-04-12", by: "april", note: "Listing built in Seller Central" },
      approved:   { done: true,  date: "2025-04-15", by: "april", note: "Amazon approved on resubmit (image dim fix)" },
      live:       { done: false, date: null, by: null, note: "" },
    },
  };

  // ---- Sample comments thread -----------------------------------------------
  const COMMENTS_HC304 = [
    { id: "c1", by: "malik",  daysAgo: 9.0, text: "Pulling the glutathione — bioavailability story is too weak. Replacing with NAC at 600mg.", thread: "product" },
    { id: "c2", by: "chesky", daysAgo: 8.5, text: "Agreed. Make sure April updates the listing copy when locked.", thread: "product" },
    { id: "c3", by: "april",  daysAgo: 7.2, text: "Updated copy v2 — KW 'glutathione' replaced with 'nac'. Ready for review.", thread: "product" },
    { id: "c4", by: "ronel",  daysAgo: 5.0, text: "NAC quote in from Bulk Supplements — $42/kg, 14d lead. Pulling trigger on 25kg.", thread: "product" },
    { id: "c5", by: "esty",   daysAgo: 3.1, text: "Updated label — dandelion is now hero. Box dieline being updated to match.", thread: "product" },
  ];

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  const products = [
    // ---------------- IDEAS (newest, top of pipeline) -------------------------
    { id: "IDEA-91", name: "Berberine + Cinnamon Capsules", brand: "DON", type: "capsule",
      stage: "idea", stageEntered: 1, lastActivity: 1, owner: "malik",
      synopsis: "GLP-1 era is creating massive search volume around 'natural ozempic' — berberine + cinnamon is the cleanest play.",
      health: "ok", versions: {} },
    { id: "IDEA-90", name: "Mouth Tape with Aromatherapy", brand: "PN", type: "topical",
      stage: "idea", stageEntered: 2, lastActivity: 2, owner: "malik",
      synopsis: "Mouth tape category is growing 80% YoY. Adding lavender/eucalyptus scent strip is uncontested whitespace.",
      health: "ok", versions: {} },
    { id: "IDEA-89", name: "Magnesium Threonate Sleep Drops", brand: "DON", type: "liquid",
      stage: "idea", stageEntered: 3, lastActivity: 3, owner: "malik",
      synopsis: "Magnesium threonate is the only mag form that crosses BBB. Liquid format = our format. No drops on Amazon yet.",
      health: "ok", versions: {} },
    { id: "IDEA-88", name: "Beef Tallow Body Butter", brand: "PN", type: "topical",
      stage: "idea", stageEntered: 4, lastActivity: 4, owner: "malik",
      synopsis: "Tallow trend is exploding on TikTok. Premium positioning, low formulation complexity.",
      health: "ok", versions: {} },
    { id: "IDEA-87", name: "Allulose Coffee Sweetener", brand: "PN", type: "food",
      stage: "idea", stageEntered: 5, lastActivity: 5, owner: "malik",
      synopsis: "Sugar-free sweetener category — allulose is the only one without aftertaste complaints. Stick packs for travel.",
      health: "ok", versions: {} },
    { id: "IDEA-86", name: "Castor Oil Eye Drops", brand: "DON", type: "liquid",
      stage: "idea", stageEntered: 6, lastActivity: 6, owner: "malik",
      synopsis: "Trad use claim for dry eyes. FDA classification is the question — needs vetting before niche analysis.",
      health: "warn", versions: {} },
    { id: "IDEA-85", name: "Tongue Scraper + Probiotic Kit", brand: "PN", type: "topical",
      stage: "idea", stageEntered: 8, lastActivity: 8, owner: "malik",
      synopsis: "Oral health category is heating up. Bundle play — probiotic mints + copper scraper.",
      health: "ok", versions: {} },
    { id: "IDEA-84", name: "Beef Liver Energy Chews", brand: "DON", type: "gummy",
      stage: "idea", stageEntered: 11, lastActivity: 11, owner: "malik",
      synopsis: "Carnivore-adjacent. Liver pills are big; chewable format is a moat.",
      health: "warn", versions: {} },

    // ---------------- NICHE ANALYSIS IN PROGRESS ------------------------------
    {
      id: "HCAPS-HAIR", name: "Hair Growth + Calm Capsules", brand: "DON", type: "capsule",
      stage: "niche", stageEntered: 6, lastActivity: 1, owner: "malik",
      synopsis: "Pair the standard hair growth stack (biotin/collagen/saw palmetto) with adaptogens (ashwagandha/rhodiola) — cortisol→hair-loss is the unclaimed angle.",
      health: "ok",
      streams: {},
      versions: {
        niche: [v(1, "malik", 5, "Initial draft — overview + market", { doc: HCAPS_HAIR_NICHE })],
      },
      nicheDoc: HCAPS_HAIR_NICHE,
    },
    {
      id: "HC742", name: "GLP-1 Nutritional Support", brand: "DON", type: "capsule",
      stage: "niche", stageEntered: 6, lastActivity: 4, owner: "malik",
      synopsis: "Multi-vitamin specifically for GLP-1 users — nutrient deficiencies on Ozempic/Wegovy are well documented.",
      health: "ok",
      versions: {
        niche: [v(1, "malik", 6, "GLP-1 deficiency profile + sizing")],
      },
    },
    {
      id: "HL107", name: "Oil of Oregano + Black Seed Oil", brand: "DON", type: "liquid",
      stage: "niche", stageEntered: 11, lastActivity: 3, owner: "malik",
      synopsis: "Combo product — oregano + black seed oil category is fragmented, no leader pairs them.",
      health: "warn",
      versions: { niche: [v(1, "malik", 10, "Differentiation analysis A vs B")] },
    },
    {
      id: "HG135", name: "Calm Hair, Skin & Nail Gummies", brand: "DON", type: "gummy",
      stage: "niche", stageEntered: 35, lastActivity: 18, owner: "malik",
      synopsis: "Gummy format follow-up to HCAPS-HAIR if validated. Same 'calm' angle.",
      health: "stale",
      versions: { niche: [v(1, "malik", 35)] },
    },

    // ---------------- AWAITING APPROVAL --------------------------------------
    {
      id: "HC369", name: "Joint Support for Women", brand: "DON", type: "capsule",
      stage: "approval", stageEntered: 3, lastActivity: 1, owner: "malik",
      synopsis: "Women-specific joint formula — most joint products are unisex/male-coded. Pink-collar opportunity.",
      health: "ok",
      versions: { niche: [v(1, "malik", 8, "Final draft — recommendation: Proceed")] },
    },
    {
      id: "HC1745", name: "Joint Support for Men", brand: "DON", type: "capsule",
      stage: "approval", stageEntered: 5, lastActivity: 5, owner: "malik",
      synopsis: "Male-coded joint formula for the lifting/active 35+ demo. Distinct from HC369.",
      health: "warn",
      versions: { niche: [v(1, "malik", 14)] },
    },

    // ---------------- IN BUILD (parallel streams) ----------------------------
    {
      id: "HC304", name: "Liver Detox Capsules", brand: "DON", type: "capsule",
      stage: "build", stageEntered: 22, lastActivity: 0.5, owner: "chesky",
      kataSku: "HC304-LIVERDTX",
      synopsis: "Liver detox capsule with milk thistle / NAC / dandelion at clinical doses.",
      health: "warn",
      asin: "B0GCN5B7DQ", upc: "850076186548",
      streams: {
        sourcing: { lead: "ronel", progress: 60, status: "Quoting remaining ingredients" },
        design:   { lead: "esty",  progress: 75, status: "Box dieline pending label finalization" },
        listing:  { lead: "april", progress: 90, status: "Approved by Amazon — awaiting go-live" },
      },
      blockers: ["R&D requested formula tweak: pull glutathione, hero dandelion at 200mg"],
      nicheDoc: HC304_NICHE,
      versions: {
        niche: [v(1, "malik", 60, "Initial"), v(2, "malik", 22, "Final — recommendation: Proceed", { doc: HC304_NICHE })],
        spec:  [v(1, "malik", 50, "Initial draft"), v(2, "malik", 35, "Reduced liver blend"), v(3, "malik", 8, "Pulled glutathione, NAC 600mg, dandelion hero")],
        label:    [v(1, "esty", 18, "Concept A — dandelion hero"), v(2, "esty", 12, "Concept B"), v(3, "esty", 4, "Print-ready iteration")],
        carton:   [v(1, "esty", 14, "Dieline v1"), v(2, "esty", 5, "Dieline v2 — matched to label v3")],
        insert:   [v(1, "esty", 10, "Folded leaflet — supplement facts + dosing")],
        listingCopy: [v(1, "april", 14, "Initial PDP"), v(2, "april", 5, "KW pass — replaced 'glutathione' with 'nac'")],
        mainImage:    [v(1, "paresh", 9, "White-BG hero")],
        galleryImages:[v(1, "qaiser", 7, "Gallery 1-3 + ingredient breakdown")],
        aPlus:        [v(1, "qaiser", 5, "Module 1 of 4")],
      },
      bom: BOM([
        { name: "Milk Thistle Extract (80% silymarin)", kind: "ingredient", vendor: "NutraScience Labs", status: "ordered", costPerUnit: 38.50, costUnit: "$/kg", leadDays: 21, qty: 50, total: 1925, note: "" },
        { name: "NAC (N-Acetyl Cysteine)",              kind: "ingredient", vendor: "Bulk Supplements", status: "ordered", costPerUnit: 42.00, costUnit: "$/kg", leadDays: 14, qty: 25, total: 1050, note: "Pulling trigger" },
        { name: "Dandelion Root Powder",                kind: "ingredient", vendor: "Starwest Botanicals", status: "approved", costPerUnit: 18.00, costUnit: "$/kg", leadDays: 10, qty: 30, total: 540, note: "" },
        { name: "Artichoke Extract (5:1)",              kind: "ingredient", vendor: "NutraScience Labs", status: "quoted", costPerUnit: 52.00, costUnit: "$/kg", leadDays: 21, qty: 15, total: 780, note: "Awaiting cost approval" },
        { name: "Turmeric (95% curcuminoids)",          kind: "ingredient", vendor: "NutraScience Labs", status: "quoted", costPerUnit: 65.00, costUnit: "$/kg", leadDays: 21, qty: 10, total: 650, note: "" },
        { name: "Vegetable Capsules (Size 0)",          kind: "ingredient", vendor: "Capsugel",          status: "ordered", costPerUnit: 12.50, costUnit: "$/k", leadDays: 14, qty: 60, total: 750, note: "60k count" },
        ...PKG_BOM("Liver Detox Label"),
      ]),
      pos: [
        { id: "PO-2401", vendor: "NutraScience Labs", items: ["Milk Thistle Extract"], total: 1925, status: "shipped", sentDays: 12, expectedDays: -2 },
        { id: "PO-2402", vendor: "Bulk Supplements", items: ["NAC"], total: 1050, status: "confirmed", sentDays: 4, expectedDays: 10 },
        { id: "PO-2403", vendor: "Starwest Botanicals", items: ["Dandelion Root"], total: 540, status: "draft", sentDays: 0, expectedDays: 10 },
        { id: "PO-2404", vendor: "Berlin Packaging", items: ["Bottles", "Caps"], total: 2500, status: "shipped", sentDays: 18, expectedDays: 3 },
      ],
      listing: LISTING_HC304,
      comments: COMMENTS_HC304,
    },
    {
      id: "HC303", name: "GLP-1 Probiotic w/ Akkermansia", brand: "DON", type: "capsule",
      stage: "build", stageEntered: 18, lastActivity: 4, owner: "chesky",
      kataSku: "HC303-GLP1AKK",
      synopsis: "Akkermansia muciniphila + 9-strain probiotic — gut microbiome support specifically for GLP-1 users.",
      health: "ok",
      asin: "B0GFPT1QM6", upc: "850076186630",
      streams: {
        sourcing: { lead: "ronel", progress: 100, status: "All ingredients received" },
        design:   { lead: "esty",  progress: 100, status: "All approved" },
        listing:  { lead: "april", progress: 100, status: "Live" },
      },
      versions: {
        niche: [v(1, "malik", 120, "GLP-1 trend +3x last quarter"), v(2, "malik", 60, "Final")],
        spec:  [v(1, "malik", 100), v(2, "malik", 70), v(3, "malik", 40, "Locked")],
        label: [v(1, "esty", 50), v(2, "esty", 20, "Print-ready")],
        carton:[v(1, "esty", 18)],
        insert:[v(1, "esty", 18)],
        listingCopy: [v(1, "april", 12)],
        mainImage: [v(1, "paresh", 10)],
        galleryImages: [v(1, "qaiser", 8)],
        aPlus: [v(1, "qaiser", 7)],
      },
    },
    {
      id: "HL657", name: "Biotin + Collagen Drops", brand: "DON", type: "liquid",
      stage: "build", stageEntered: 14, lastActivity: 1, owner: "chesky",
      kataSku: "HL657-BIOCOLL",
      synopsis: "Liquid biotin + marine collagen — drops format for absorption story, citrus flavor.",
      health: "ok",
      asin: "B0GTS1Q886", upc: "850076186807",
      streams: {
        sourcing: { lead: "ronel", progress: 85, status: "Final 2 ingredients confirmed" },
        design:   { lead: "esty",  progress: 100, status: "Label print-ready" },
        listing:  { lead: "april", progress: 70, status: "Awaiting Amazon clearance" },
      },
      blockers: ["ASIN inactive — waiting on Amazon to clear"],
      versions: {
        niche: [v(1, "malik", 70)],
        spec:  [v(1, "malik", 62), v(2, "malik", 48), v(3, "malik", 30), v(4, "malik", 14, "Final lock")],
        label:    [v(1, "esty", 40), v(2, "esty", 28), v(3, "esty", 18), v(4, "esty", 6, "Print-ready")],
        carton:   [v(1, "esty", 16)],
        insert:   [v(1, "esty", 12)],
        listingCopy: [v(1, "april", 24), v(2, "april", 10, "KW pass")],
        mainImage: [v(1, "paresh", 16)],
        galleryImages: [v(1, "qaiser", 12)],
      },
    },
    {
      id: "HL432", name: "Lymphatic Drainage Drops", brand: "DON", type: "liquid",
      stage: "build", stageEntered: 22, lastActivity: 2, owner: "chesky",
      kataSku: "HL432-LYMPHDR",
      synopsis: "Cleavers + black radish + dandelion drops — lymphatic drainage tincture, 'morning routine' positioning.",
      health: "ok",
      asin: "B0GMSK7ZHQ", upc: "850076186746",
      streams: {
        sourcing: { lead: "ronel", progress: 100, status: "Received" },
        design:   { lead: "esty",  progress: 100, status: "Approved" },
        listing:  { lead: "april", progress: 100, status: "Live" },
      },
      versions: {
        niche: [v(1, "malik", 95)],
        spec:  [v(1, "malik", 80), v(2, "malik", 60), v(3, "malik", 40)],
        label: [v(1, "esty", 55), v(2, "esty", 35), v(3, "esty", 18)],
        carton:[v(1, "esty", 18)],
        listingCopy: [v(1, "april", 12)],
        mainImage:[v(1, "paresh", 10)],
        galleryImages:[v(1, "qaiser", 8)],
      },
    },
    {
      id: "HL111", name: "Mullein Drops w/ Soursop & Moringa", brand: "DON", type: "liquid",
      stage: "build", stageEntered: 12, lastActivity: 1, owner: "chesky",
      kataSku: "HL111-MULSOUR",
      synopsis: "Mullein lung-support drops with differentiator botanicals (soursop, moringa, chlorophyll).",
      health: "warn",
      asin: "B0GTS17PKB", upc: "850076186760",
      streams: {
        sourcing: { lead: "ronel", progress: 70, status: "Soursop sourcing — 3 vendors quoted" },
        design:   { lead: "esty",  progress: 60, status: "Label v2 in review" },
        listing:  { lead: "april", progress: 40, status: "Draft" },
      },
      blockers: ["Switched to water/glycerin base — servings dropped 120→30"],
      versions: {
        niche: [v(1, "malik", 75)],
        spec:  [v(1, "malik", 60), v(2, "malik", 40), v(3, "malik", 18), v(4, "malik", 5, "Lock")],
        label: [v(1, "esty", 30), v(2, "esty", 10)],
      },
    },
    {
      id: "HC307", name: "Magnesium Complex for Women", brand: "DON", type: "capsule",
      stage: "build", stageEntered: 20, lastActivity: 6, owner: "chesky",
      kataSku: "HC307-MAGW",
      synopsis: "Mag glycinate + threonate + taurate blend with B6 — women-specific framing.",
      health: "warn",
      asin: "B0GJTY59BZ", upc: "850076186531",
      streams: {
        sourcing: { lead: "ronel", progress: 90, status: "Final POs out" },
        design:   { lead: "esty",  progress: 80, status: "Insert needed" },
        listing:  { lead: "april", progress: 60, status: "Amazon flagged for image dim" },
      },
      blockers: ["Amazon flagged main image — Paresh re-rendering"],
      versions: {
        niche: [v(1, "malik", 100)],
        spec:  [v(1, "malik", 90), v(2, "malik", 60)],
        label: [v(1, "esty", 45), v(2, "esty", 20)],
        carton:[v(1, "esty", 22)],
      },
    },
    {
      id: "HP206", name: "Mushroom Focus Coffee", brand: "PN", type: "food",
      stage: "build", stageEntered: 25, lastActivity: 4, owner: "chesky",
      kataSku: "HP206-MUSHFOC",
      synopsis: "Lion's mane + cordyceps + colombian dark roast. Pour-over format.",
      health: "ok",
      asin: "B0GGKQSK38", upc: "850076186647",
      streams: {
        sourcing: { lead: "ronel", progress: 100, status: "Received" },
        design:   { lead: "esty",  progress: 100, status: "Approved" },
        listing:  { lead: "april", progress: 100, status: "Live" },
      },
      versions: {
        niche: [v(1, "malik", 90)], spec: [v(1, "malik", 80)], label: [v(1, "esty", 60), v(2, "esty", 30)], carton: [v(1, "esty", 30)],
      },
    },

    // ---------------- LAUNCHED ----------------------------------------------
    {
      id: "HT501", name: "Lungs Detox Herbal Tea", brand: "PN", type: "food",
      stage: "launched", stageEntered: 90, lastActivity: 14, owner: "chesky",
      kataSku: "HT501-LUNGTEA",
      synopsis: "Mullein + plantain leaf + marshmallow root — bagged tea for lung support.",
      health: "ok",
      asin: "B0G7LDJZVC", upc: "850076186463",
      versions: { spec: [v(1, "malik", 100), v(2, "malik", 90)], label: [v(1, "esty", 95)], carton: [v(1, "esty", 95)] },
    },
    {
      id: "MBG", name: "Mushroom Beauty Gummy", brand: "DON", type: "gummy",
      stage: "launched", stageEntered: 120, lastActivity: 30, owner: "chesky",
      kataSku: "MBG-BEAUTY",
      synopsis: "Tremella + biotin + mushroom blend — beauty positioning, vegan gummy format.",
      health: "ok",
      asin: "B0GGCR64KP", upc: "850076186623",
      versions: { spec: [v(1, "malik", 140)], label: [v(1, "esty", 130)] },
    },

    // ---------------- HOLD ---------------------------------------------------
    {
      id: "H4218", name: "Liposomal NAD+ Cellular Renewal", brand: "DON", type: "liquid",
      stage: "hold", stageEntered: 45, lastActivity: 38, owner: "chesky",
      synopsis: "NAD+ liposomal drops — held for market re-evaluation.",
      health: "stale",
      holdReason: "Awaiting market re-evaluation post-NMN regulatory review",
      versions: {},
    },
    {
      id: "H540", name: "Kids Sleep Gummies", brand: "DON", type: "gummy",
      stage: "hold", stageEntered: 60, lastActivity: 42, owner: "chesky",
      synopsis: "Melatonin-free kids sleep — magnesium glycinate + L-theanine + chamomile.",
      health: "stale",
      holdReason: "Pending pediatric compliance review with regulatory consultant",
      versions: { spec: [v(1, "malik", 60)] },
    },
    {
      id: "HP208", name: "Glow Mushroom Coffee", brand: "PN", type: "food",
      stage: "hold", stageEntered: 32, lastActivity: 12, owner: "chesky",
      synopsis: "Beauty mushroom coffee — tremella + chaga + colombian.",
      health: "warn",
      holdReason: "Insufficient coffee inventory; packaging already printed — Joel evaluating buy",
      versions: { spec: [v(1, "malik", 60)], label: [v(1, "esty", 40)] },
    },

    // ---------------- PARKED -------------------------------------------------
    {
      id: "H280", name: "Magnesium Gummy", brand: "DON", type: "gummy",
      stage: "parked", stageEntered: 50, lastActivity: 50, owner: "malik",
      synopsis: "Magnesium gummy — incompatible mag forms blocked development.",
      health: "stale",
      parkReason: "Magnesium forms incompatible with spray-coating; sulphate is laxative, citrate not GRAS for food",
      versions: {},
    },
    {
      id: "KALMWAVE", name: "KALMWAVE Cortisol Calm Drops", brand: "DON", type: "liquid",
      stage: "parked", stageEntered: 70, lastActivity: 70, owner: "malik",
      synopsis: "Kava-based cortisol drops — parked, kava demand RTD-driven.",
      health: "stale",
      parkReason: "Kava demand is RTD-driven, not supplement format",
      versions: {},
    },
  ];

  // ============================================================================
  // ACTIVITY (richer, real workflow events)
  // ============================================================================
  const activity = [
    { ts: 0.1, type: "field",      productId: "HC304",    user: "april",  text: "changed Listing status: Pending → Approved · 'Amazon cleared on resubmit'" },
    { ts: 0.4, type: "version",    productId: "HC304",    user: "esty",   text: "uploaded Label v3 — Print-ready iteration" },
    { ts: 0.5, type: "comment",    productId: "HC304",    user: "ronel",  text: "noted: \"NAC quote in — pulling trigger on 25kg\"" },
    { ts: 1.0, type: "stage",      productId: "HCAPS-HAIR", user: "malik", text: "promoted from Idea → Niche Analysis" },
    { ts: 1.2, type: "stage",      productId: "HL432",    user: "ronel",  text: "moved to Production" },
    { ts: 1.5, type: "po",         productId: "HC304",    user: "ronel",  text: "issued PO-2402 to Bulk Supplements ($1,050)" },
    { ts: 2.1, type: "version",    productId: "HL657",    user: "esty",   text: "uploaded Label v4 — Print-ready" },
    { ts: 2.8, type: "version",    productId: "HL111",    user: "malik",  text: "uploaded Spec v4 — switched to water/glycerin base" },
    { ts: 3.4, type: "approval",   productId: "HC303",    user: "april",  text: "approved Listing copy v2 — went live" },
    { ts: 4.0, type: "field",      productId: "HC304",    user: "chesky", text: "changed Recommendation: Pending → Changes Required · 'Pull glutathione'" },
    { ts: 5.2, type: "version",    productId: "HC742",    user: "malik",  text: "uploaded Niche analysis v1" },
    { ts: 6.1, type: "alert",      productId: "HG135",    user: null,     text: "stuck — 18 days without activity (avg for Niche is 9)" },
    { ts: 7.0, type: "comment",    productId: "HCAPS-HAIR", user: "malik", text: "starting niche analysis — main angle: cortisol→hair-loss mechanism" },
    { ts: 7.3, type: "alert",      productId: "H540",     user: null,     text: "Hold for 42 days — re-evaluate?" },
    { ts: 9.0, type: "version",    productId: "HC1745",   user: "malik",  text: "uploaded Niche analysis v1" },
    { ts: 12.0, type: "comment",   productId: "HP208",    user: "ronel",  text: "noted: \"Packaging printed — need to source coffee inventory before unblocking\"" },
    { ts: 14.0, type: "stage",     productId: "HL657",    user: "ronel",  text: "moved to In Build" },
  ];

  // ============================================================================
  // RULES
  // ============================================================================
  const rules = [
    { id: "r1", on: "version.uploaded", where: "type=spec",  notify: ["#rd-pipeline"], enabled: true,
      label: "New spec uploaded → #rd-pipeline" },
    { id: "r2", on: "stage.changed", where: "to=build",  notify: ["@ronel","@esty","@april"], enabled: true,
      label: "Niche approved → kick off Sourcing/Design/Listing" },
    { id: "r3", on: "recommendation.changed", where: "to=changes", notify: ["@owner"], enabled: true,
      label: "R&D Changes Required → DM owner" },
    { id: "r4", on: "stale", where: "days>14 AND stage IN (niche,build)", notify: ["@owner","#rd-pipeline"], enabled: true,
      label: "Stuck > 14 days → ping" },
    { id: "r5", on: "comment.added", where: "mentions=true", notify: ["@mentioned"], enabled: true,
      label: "@mentioned in comment → DM" },
    { id: "r6", on: "digest", where: "cron=daily 9am", notify: ["#rd-pipeline"], enabled: true,
      label: "Daily 9am pipeline digest" },
    { id: "r7", on: "stage.changed", where: "to=launched", notify: ["#announcements","#leadership"], enabled: true,
      label: "Product Launched → announce" },
    { id: "r8", on: "po.issued", where: "*", notify: ["#purchasing","@owner"], enabled: true,
      label: "PO issued → notify purchasing + owner" },
    { id: "r9", on: "listing.flagged", where: "*", notify: ["@april","@owner"], enabled: true,
      label: "Amazon flagged listing → April + owner" },
    { id: "r10", on: "image.missing", where: "stage=build", notify: ["@paresh","@qaiser"], enabled: true,
      label: "Image slot empty → image team" },
  ];

  return { STAGES, TYPES, BRANDS, PEOPLE, ROLES, products, activity, rules };
})();
