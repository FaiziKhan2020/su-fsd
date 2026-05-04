/* eslint-disable */
// R&D Pipeline OS v2 — real data model
// Team: Chesky (overseer), Joel (purchasing+finance partner), Malik (R&D Lead),
// Ronel (Purchasing Lead), April (Catalog Lead), Esty (Designer),
// Paresh (Main image), Qaiser (Gallery + A+)

const PEOPLE = [
  { id: "chesky", name: "Chesky",  role: "Overseer",      initials: "CK", color: "#5B5BD6" },
  { id: "joel",   name: "Joel",    role: "Finance",       initials: "JO", color: "#0E7C66" },
  { id: "malik",  name: "Malik",   role: "R&D Lead",      initials: "MA", color: "#B45309" },
  { id: "ronel",  name: "Ronel",   role: "Purchasing",    initials: "RO", color: "#7C2D12" },
  { id: "april",  name: "April",   role: "Catalog Lead",  initials: "AP", color: "#9333EA" },
  { id: "esty",   name: "Esty",    role: "Designer",      initials: "ES", color: "#0891B2" },
  { id: "paresh", name: "Paresh",  role: "Main Image",    initials: "PA", color: "#BE185D" },
  { id: "qaiser", name: "Qaiser",  role: "Gallery / A+",  initials: "QA", color: "#4F46E5" },
];

const STAGES = [
  { id: "idea",       label: "Idea",            color: "slate",  desc: "Captured concept; needs evaluation" },
  { id: "niche",      label: "Niche Analysis",  color: "purple", desc: "Malik writing the deep-dive" },
  { id: "approval",   label: "Niche Review",    color: "amber",  desc: "Awaiting Chesky's go/no-go" },
  { id: "build",      label: "In Build",        color: "blue",   desc: "Sourcing ∥ Design ∥ Listing in parallel" },
  { id: "production", label: "In Production",   color: "green",  desc: "Manufacturing started" },
  { id: "launched",   label: "Launched",        color: "teal",   desc: "Live on Amazon" },
  { id: "hold",       label: "On Hold",         color: "yellow", desc: "Paused, will revisit" },
  { id: "killed",     label: "Killed",          color: "red",    desc: "Rejected at niche review" },
];

const TYPES = {
  capsule:  { label: "Capsule",   glyph: "◉" },
  liquid:   { label: "Liquid",    glyph: "◈" },
  gummy:    { label: "Gummy",     glyph: "◍" },
  powder:   { label: "Powder",    glyph: "◎" },
  topical:  { label: "Topical",   glyph: "◐" },
  food:     { label: "Food",      glyph: "◇" },
  softgel:  { label: "Softgel",   glyph: "●" },
  tea:      { label: "Tea",       glyph: "✿" },
  cream:    { label: "Cream",     glyph: "◑" },
};

// Helper: fake "days ago" + version generator
const v = (n, by, daysAgo, note, body) => ({ n, by, daysAgo, note, body });

// Niche analysis sections (matches the real 6-tab Google Sheet)
const nicheTemplate = {
  overview: {
    productName: "",
    concept: "",
    format: "",
    signal: "",
    market: { sv: "", revenue: "", trend: "", cvr: "", dominantFormat: "", tiktok: "" },
  },
  competitors: [], // [{asin, brand, title, price, sales, revenue, rating, reviews, fulfillment, strength}]
  differentiation: { angle: "", whitespace: "" },
  formula: [], // [{ingredient, dose, rationale}]
  packagingDirection: "",
  verdict: { recommendation: "", rationale: "" },
};

// ---------- Products ----------
// Each carries: streams (sourcing/design/listing) only when in build/production/launched.
// "owner" = product owner (defaults to Chesky for overseer-tracked items)
// Edits log to a per-product activity[] array.

const PRODUCTS = [
  // ===== IDEAS (10/wk inflow — show ~8 here) =====
  {
    id: "I-301", code: "DON-LymphTea", name: "Lymphatic Drainage Tea",
    brand: "DON", type: "tea", stage: "idea", owner: "malik",
    synopsis: "Tea-format extension of our top liquid SKU. Search volume on 'lymph tea' up 340% YoY; gap in clean-label space.",
    createdBy: "malik", createdDaysAgo: 1, lastActivity: 1, health: "ok",
    streams: null,
  },
  {
    id: "I-302", code: "DON-CortisolPM", name: "Cortisol PM Drops",
    brand: "DON", type: "liquid", stage: "idea", owner: "malik",
    synopsis: "Evening adaptogen blend. Riding the cortisol-cocktail TikTok trend; complements morning energy SKUs.",
    createdBy: "malik", createdDaysAgo: 2, lastActivity: 2, health: "ok",
  },
  {
    id: "I-303", code: "PN-MagGlycinate", name: "Magnesium Glycinate Gummies",
    brand: "PN", type: "gummy", stage: "idea", owner: "malik",
    synopsis: "Gummy version of our top capsule. Customers DMing for kid-friendly form factor.",
    createdBy: "malik", createdDaysAgo: 3, lastActivity: 3, health: "ok",
  },
  {
    id: "I-304", code: "DON-SeaMoss", name: "Sea Moss + Bladderwrack Capsules",
    brand: "DON", type: "capsule", stage: "idea", owner: "malik",
    synopsis: "Trending mineral source. Crowded but fragmented — no clear leader at premium tier.",
    createdBy: "malik", createdDaysAgo: 4, lastActivity: 4, health: "ok",
  },
  {
    id: "I-305", code: "PN-PMR", name: "Postnatal Recovery Drops",
    brand: "PN", type: "liquid", stage: "idea", owner: "malik",
    synopsis: "Underserved postpartum segment; mom-network demand is loud. Iron + B-complex + collagen.",
    createdBy: "malik", createdDaysAgo: 5, lastActivity: 5, health: "ok",
  },
  {
    id: "I-306", code: "DON-Tongkat", name: "Tongkat Ali Capsules",
    brand: "DON", type: "capsule", stage: "idea", owner: "malik",
    synopsis: "Joe Rogan halo, peak interest. Sourcing is the moat.",
    createdBy: "malik", createdDaysAgo: 6, lastActivity: 6, health: "warn",
  },
  {
    id: "I-307", code: "PN-Beauty", name: "Beauty Boost Powder",
    brand: "PN", type: "powder", stage: "idea", owner: "malik",
    synopsis: "Collagen + biotin + silica drink mix. Gen Z demo gap in our portfolio.",
    createdBy: "malik", createdDaysAgo: 7, lastActivity: 7, health: "warn",
  },
  {
    id: "I-308", code: "DON-Mush", name: "Lion's Mane + Cordyceps",
    brand: "DON", type: "capsule", stage: "idea", owner: "malik",
    synopsis: "Functional mushroom stack. Nootropic-curious crowd.",
    createdBy: "malik", createdDaysAgo: 8, lastActivity: 8, health: "warn",
  },

  // ===== NICHE ANALYSIS (in flight) =====
  {
    id: "N-201", code: "PN-HairCalm", name: "Hair Growth + Calm Capsules",
    brand: "PN", type: "capsule", stage: "niche", owner: "malik",
    synopsis: "Hair growth + adaptogenic calm — the only stack pairing both stories. White space.",
    createdBy: "malik", createdDaysAgo: 14, lastActivity: 1, health: "ok",
    nicheSubState: "parsed", // researching | parsed
    docUrl: "docs.google.com/d/1aB...PN-HairCalm-niche-v3",
    docUploadedDaysAgo: 1,
    niche: {
      versions: [
        v(1, "malik", 9, "First draft of overview + competitors"),
        v(2, "malik", 4, "Added formula + packaging direction"),
        v(3, "malik", 1, "Final verdict, ready for Chesky"),
      ],
      current: {
        overview: {
          productName: "Hair Growth + Calm Supplement",
          concept: "Hair growth supplement pairing the standard growth stack (Biotin, Collagen, Saw Palmetto) with adaptogenic calm (Ashwagandha, L-Theanine).",
          format: "60-count capsule, 30-day supply",
          signal: "Reddit + TikTok: women linking hair loss to stress; no Amazon SKU addresses both axes.",
          market: { sv: "287K/mo", revenue: "$11.2M/mo (Top 30)", trend: "+34% YoY", cvr: "12.4%", dominantFormat: "Capsule (78%)", tiktok: "4.2M views #hairgrowthcalm" },
        },
        competitors: [
          { asin: "B0CX8Y7K12", brand: "Nutrafol",     title: "Women's Hair Growth Capsules",   price: "$88",  sales: "8400/mo", revenue: "$739K", rating: 4.4, reviews: 28400, fulfillment: "FBA", strength: "Brand authority, derm-recommended" },
          { asin: "B07J9KH5MQ", brand: "Viviscal",     title: "Hair Growth Supplement",          price: "$50",  sales: "5200/mo", revenue: "$260K", rating: 4.3, reviews: 41200, fulfillment: "FBA", strength: "Legacy, clinical claims" },
          { asin: "B09YR2KXX1", brand: "SugarBearHair", title: "Hair Vitamins",                 price: "$30",  sales: "12000/mo",revenue: "$360K", rating: 4.0, reviews: 18900, fulfillment: "FBA", strength: "Influencer reach" },
          { asin: "B0BLQ8VV7P", brand: "Olly",          title: "Heavenly Hair Gummies",         price: "$15",  sales: "9100/mo", revenue: "$137K", rating: 4.5, reviews: 6700,  fulfillment: "FBA", strength: "Walmart shelf, retail moat" },
        ],
        differentiation: {
          angle: "We're the only growth stack that names the stress-shedding link out loud. Calm + Grow is the bundle most stress-shedders are already self-assembling.",
          whitespace: "Premium-tier, clean-label, dual-mechanism. No incumbent owns this story.",
        },
        formula: [
          { ingredient: "Biotin", dose: "5000mcg", rationale: "Standard hair-growth co-factor; expected by category" },
          { ingredient: "Marine collagen", dose: "1000mg", rationale: "Hero ingredient; supports follicle structure" },
          { ingredient: "Saw palmetto", dose: "320mg", rationale: "DHT modulation, especially for hormonal shedding" },
          { ingredient: "Ashwagandha (KSM-66)", dose: "300mg", rationale: "Cortisol reduction → stress-shed defense" },
          { ingredient: "L-Theanine", dose: "100mg", rationale: "Calm without sedation; daytime-compatible" },
          { ingredient: "Zinc bisglycinate", dose: "15mg", rationale: "Hair tissue repair" },
          { ingredient: "Vitamin D3", dose: "2000 IU", rationale: "Follicle cycling support" },
        ],
        packagingDirection: "PN line consistent — soft-touch matte amber bottle, label-only branding (no carton), insert with cycle-tracking guide.",
        verdict: {
          recommendation: "PROCEED",
          rationale: "Unique angle in a $11M/mo niche, our existing PN brand voice fits, formula is sourceable, no IP blockers.",
        },
      },
    },
  },
  {
    id: "N-202", code: "DON-LiverDrops", name: "Beef Liver Drops",
    brand: "DON", type: "liquid", stage: "niche", owner: "malik",
    synopsis: "Liquid-format liver. Ancestral crowd hates capsules; gap at premium.",
    createdBy: "malik", createdDaysAgo: 11, lastActivity: 3, health: "ok",
    nicheSubState: "researching",
    researchingDaysAgo: 4,
  },
  {
    id: "N-203", code: "PN-Glow", name: "Glow Skin Drops",
    brand: "PN", type: "liquid", stage: "niche", owner: "malik",
    synopsis: "Liquid glutathione + vitamin C + collagen. Korean beauty halo, gap in liquid format.",
    createdBy: "malik", createdDaysAgo: 6, lastActivity: 6, health: "ok",
    nicheSubState: "researching",
    researchingDaysAgo: 6,
  },

  // ===== AWAITING NICHE APPROVAL (Chesky's queue) =====
  {
    id: "A-150", code: "DON-MoringaMix", name: "Moringa + Soursop Greens",
    brand: "DON", type: "powder", stage: "approval", owner: "malik",
    synopsis: "Premium greens drink. Niche analysis complete; Malik recommends Proceed.",
    createdBy: "malik", createdDaysAgo: 21, lastActivity: 4, health: "warn",
    waitingOn: "chesky",
    nicheSubState: "parsed",
    docUrl: "docs.google.com/d/1xY...DON-MoringaMix-niche-v3",
    docUploadedDaysAgo: 4,
    approvals: { chesky: null, joel: { decision: "approve", at: 2, note: "Margin checks out at $24 list. Approve." } },
    niche: { versions: [v(3, "malik", 4, "Final — recommend proceed")], current: null },
  },
  {
    id: "A-151", code: "PN-IronWoman", name: "Iron + Folate Drops (Women)",
    brand: "PN", type: "liquid", stage: "approval", owner: "malik",
    synopsis: "Iron deficiency is mainstream now. Liquid format, low-nausea.",
    createdBy: "malik", createdDaysAgo: 18, lastActivity: 2, health: "ok",
    waitingOn: "chesky",
    nicheSubState: "parsed",
    docUrl: "docs.google.com/d/1zQ...PN-IronWoman-niche-v2",
    docUploadedDaysAgo: 2,
    approvals: { chesky: null, joel: null },
    niche: { versions: [v(2, "malik", 2, "Final, ready for review")], current: null },
  },

  // ===== IN BUILD (parallel streams) =====
  {
    id: "B-101", code: "PN-BiotinCollagen", name: "Biotin + Collagen Drops",
    brand: "PN", type: "liquid", stage: "build", owner: "chesky",
    synopsis: "Liquid hair/skin combo. Approved 18d ago, all three streams live.",
    createdBy: "malik", createdDaysAgo: 38, lastActivity: 1, health: "ok",
    streams: {
      sourcing: { owner: "ronel", status: "Quoting",  pct: 45, lastNote: "3 of 7 ingredients quoted, awaiting collagen spec" },
      design:   { owner: "esty",  status: "In review", pct: 70, lastNote: "Label v3 with Chesky for sign-off" },
      listing:  { owner: "april", status: "Drafting",  pct: 35, lastNote: "Title + bullets v1 in workspace" },
    },
    bom: [
      { ingredient: "Marine collagen peptides", spec: "Hydrolyzed, fish-source", status: "Quoted",     vendor: "MarinePure",   cost: "$8.40/kg", lead: "21d", by: "ronel", daysAgo: 4, note: "$8.40 vs prev quote $9.10" },
      { ingredient: "Biotin (D-Biotin USP)",    spec: "5000mcg/serving",          status: "Quoted",     vendor: "BulkVitamins",  cost: "$1.10/g",  lead: "10d", by: "ronel", daysAgo: 6 },
      { ingredient: "Vegetable glycerin",       spec: "USP, organic",             status: "Quoted",     vendor: "Glycera",       cost: "$3.20/L",  lead: "7d",  by: "ronel", daysAgo: 6 },
      { ingredient: "Natural berry flavor",     spec: "Non-GMO, no sucralose",    status: "Quoting",    vendor: "—",             cost: "—",        lead: "—",   by: "ronel", daysAgo: 2, note: "Awaiting Symrise sample" },
      { ingredient: "Citric acid",              spec: "Anhydrous, food grade",    status: "Approved",   vendor: "ADM",           cost: "$0.45/kg", lead: "5d",  by: "ronel", daysAgo: 8 },
      { ingredient: "Potassium sorbate",        spec: "Preservative, FCC",        status: "Approved",   vendor: "Univar",        cost: "$2.10/kg", lead: "5d",  by: "ronel", daysAgo: 8 },
      { ingredient: "Stevia leaf extract",      spec: "Reb-A 95%",                status: "Quoted",     vendor: "PureCircle",    cost: "$48/kg",   lead: "14d", by: "ronel", daysAgo: 6 },
    ],
    pos: [
      { id: "PO-2401", vendor: "ADM",          items: ["Citric acid 50kg", "Potassium sorbate 10kg"], total: "$ 22.50 + 21.00", status: "Sent",     created: 8 },
    ],
    costEst: { unit: "$3.18", cogsAtMOQ: "$15,900", marginAtList: "62%", quotedPct: 71 },
    label: {
      versions: [v(1, "esty", 12, "Initial concept"), v(2, "esty", 6, "Type fixes, FDA disclaimer"), v(3, "esty", 2, "Color refinement, awaiting Chesky")],
      status: "In review",
    },
    box:    { versions: [], status: "N/A" },
    insert: { versions: [v(1, "esty", 5, "Cycle-tracking guide draft")], status: "Draft" },
    listing: {
      created: { done: true,  by: "april", daysAgo: 9, note: "Listing skeleton built in Seller Central" },
      approved: { done: false, note: "Submitted, awaiting Amazon" },
      live:     { done: false },
      content: {
        title: "PN Biotin + Collagen Drops — Hair, Skin & Nail Liquid Supplement, 5000mcg Biotin + 1000mg Marine Collagen, Berry Flavor, 60 Servings",
        bullets: [
          "DUAL-ACTION HAIR SUPPORT — 5000mcg biotin and 1000mg hydrolyzed marine collagen in every serving",
          "FAST ABSORPTION — Liquid format absorbs faster than capsules; no horse-pill swallowing",
          "NATURALLY SWEETENED — Real berry flavor with stevia leaf; zero sucralose, zero added sugar",
          "CLEAN INGREDIENTS — Non-GMO, gluten-free, third-party tested, made in USA",
          "60-DAY GUARANTEE — Love it or get your money back, no questions asked",
        ],
        keywords: "biotin liquid drops, marine collagen liquid, hair growth supplement women, biotin and collagen, liquid hair vitamins, hair skin nails liquid, fast absorbing biotin, no pill biotin",
        keywordBytes: 178,
      },
      images: {
        main:    [v(1, "paresh", 4, "Hero shot, white bg")],
        gallery: [v(1, "qaiser", 3, "Lifestyle 1: morning routine"), v(1, "qaiser", 3, "Ingredient infographic"), v(1, "qaiser", 2, "Comparison vs capsule")],
        aplus:   [v(1, "qaiser", 1, "A+ module 1 of 3 drafted")],
      },
    },
  },
  {
    id: "B-102", code: "DON-LymphDrops", name: "Lymphatic Drainage Drops",
    brand: "DON", type: "liquid", stage: "build", owner: "chesky",
    synopsis: "Top mover. Listing went live this week, sourcing wrapping up.",
    createdBy: "malik", createdDaysAgo: 51, lastActivity: 0, health: "ok",
    streams: {
      sourcing: { owner: "ronel", status: "Ordered",   pct: 90, lastNote: "PO-2398 confirmed, lands in 9d" },
      design:   { owner: "esty",  status: "Approved",  pct: 100, lastNote: "Label + insert locked" },
      listing:  { owner: "april", status: "Approved",  pct: 90, lastNote: "Amazon approved, going live tomorrow" },
    },
    label:  { versions: [v(1, "esty", 22, "v1"), v(2, "esty", 14, "v2"), v(3, "esty", 7, "Final, locked")], status: "Approved" },
    box:    { versions: [v(1, "esty", 20, "Carton dieline"), v(2, "esty", 8, "Final dieline + 3D")], status: "Approved" },
    insert: { versions: [v(1, "esty", 9, "Final insert with usage guide")], status: "Approved" },
  },
  {
    id: "B-103", code: "PN-EnergyMix", name: "Pre-Workout Energy Mix",
    brand: "PN", type: "powder", stage: "build", owner: "chesky",
    synopsis: "Caffeine + L-citrulline + beta-alanine. Sourcing stuck on caffeine vendor.",
    createdBy: "malik", createdDaysAgo: 44, lastActivity: 12, health: "stale",
    streams: {
      sourcing: { owner: "ronel", status: "Backorder", pct: 30, lastNote: "Caffeine anhydrous backordered, 4wk delay" },
      design:   { owner: "esty",  status: "Drafting",  pct: 50, lastNote: "Pouch design v2 in review" },
      listing:  { owner: "april", status: "Not started", pct: 0,  lastNote: "Waiting on final formula lock" },
    },
  },

  // ===== IN PRODUCTION =====
  {
    id: "P-051", code: "DON-OrganMeats", name: "Beef Organ Capsules",
    brand: "DON", type: "capsule", stage: "production", owner: "chesky",
    synopsis: "Reformulated. Production started 5d ago, on track for next month launch.",
    createdBy: "malik", createdDaysAgo: 86, lastActivity: 5, health: "ok",
  },
  {
    id: "P-052", code: "PN-NightCream", name: "Bakuchiol Night Cream",
    brand: "PN", type: "cream", stage: "production", owner: "chesky",
    synopsis: "Topical extension of PN line; first non-ingestible.",
    createdBy: "malik", createdDaysAgo: 102, lastActivity: 3, health: "ok",
  },

  // ===== LAUNCHED =====
  {
    id: "L-022", code: "DON-MagneCalm", name: "Magnesium Calm Drops",
    brand: "DON", type: "liquid", stage: "launched", owner: "chesky",
    synopsis: "Live since Mar; 4.6★, 312 reviews, top-3 in subcategory.",
    createdBy: "malik", createdDaysAgo: 156, lastActivity: 22, health: "ok",
    asin: "B0DXK4LZQ2",
  },
  {
    id: "L-023", code: "PN-Postpartum", name: "Postpartum Iron + Folate",
    brand: "PN", type: "capsule", stage: "launched", owner: "chesky",
    synopsis: "Launched 5wk ago; trending in postpartum subcategory.",
    createdBy: "malik", createdDaysAgo: 134, lastActivity: 8, health: "ok",
    asin: "B0CR9KQ8MN",
  },

  // ===== HOLD / KILLED =====
  {
    id: "H-040", code: "DON-Cordy", name: "Cordyceps Energy Powder",
    brand: "DON", type: "powder", stage: "hold", owner: "chesky",
    synopsis: "Paused — sourcing prices doubled in Q1, revisit after harvest.",
    createdBy: "malik", createdDaysAgo: 61, lastActivity: 41, health: "stale",
  },
  {
    id: "K-019", code: "PN-Detox", name: "Detox Cleanse Capsules",
    brand: "PN", type: "capsule", stage: "killed", owner: "chesky",
    synopsis: "Killed at niche review — Amazon detox keyword restrictions, no clean angle.",
    createdBy: "malik", createdDaysAgo: 31, lastActivity: 28, health: "ok",
  },
];

// ---------- Activity feed (cross-product) ----------
const ACTIVITY = [
  { ts: 0.2, productId: "B-102", user: "april", type: "approval", text: "marked Listing → Amazon Approved" },
  { ts: 0.4, productId: "B-101", user: "esty",  type: "version",  text: "uploaded Label v3" },
  { ts: 0.5, productId: "B-101", user: "ronel", type: "version",  text: "logged quote: Marine collagen $8.40/kg from MarinePure" },
  { ts: 1.0, productId: "N-201", user: "malik", type: "version",  text: "uploaded Niche Analysis v3 (final)" },
  { ts: 1.3, productId: "B-101", user: "april", type: "edit",     text: "drafted listing title + 5 bullets" },
  { ts: 2.1, productId: "B-101", user: "paresh",type: "version",  text: "uploaded Main Image v1" },
  { ts: 2.4, productId: "I-301", user: "malik", type: "edit",     text: "added new idea: Lymphatic Drainage Tea" },
  { ts: 3.0, productId: "B-101", user: "qaiser",type: "version",  text: "uploaded Gallery 1 + 2 + 3" },
  { ts: 4.0, productId: "A-150", user: "malik", type: "stage",    text: "moved → Niche Review (waiting on Chesky)" },
  { ts: 5.0, productId: "B-101", user: "esty",  type: "version",  text: "uploaded Insert v1" },
  { ts: 7.0, productId: "B-103", user: "ronel", type: "alert",    text: "flagged backorder: Caffeine anhydrous 4wk delay" },
  { ts: 9.0, productId: "B-102", user: "ronel", type: "version",  text: "PO-2398 confirmed by vendor" },
  { ts: 12.0,productId: "B-103", user: "ronel", type: "comment",  text: "no movement — chasing alt vendor" },
  { ts: 22.0,productId: "L-022", user: "april", type: "stage",    text: "launched — went live on Amazon" },
];

// ---------- Notification rules ----------
const RULES = [
  { id: "r1", on: "Niche Analysis uploaded",  where: "any product",    notify: ["#rd-pipeline", "@chesky"], label: "Chesky review trigger", enabled: true },
  { id: "r2", on: "Stage → Build",            where: "any product",    notify: ["@ronel", "@esty", "@april"], label: "Kick off parallel streams", enabled: true },
  { id: "r3", on: "BOM ingredient quoted",    where: "build stage",    notify: ["@chesky"], label: "Cost approval", enabled: true },
  { id: "r4", on: "Listing → Live",           where: "any product",    notify: ["#announcements", "#leadership"], label: "Launch announcement", enabled: true },
  { id: "r5", on: "Stuck > 7 days",           where: "any stage",      notify: ["@chesky"], label: "Stale alert", enabled: true },
  { id: "r6", on: "Daily digest 9am",         where: "all pipeline",   notify: ["#rd-pipeline"], label: "Morning digest", enabled: true },
  { id: "r7", on: "Backorder logged",         where: "sourcing",       notify: ["@chesky", "@joel"], label: "Cost/timeline impact", enabled: true },
  { id: "r8", on: "Image uploaded",           where: "build stage",    notify: ["@april"], label: "Listing image refresh", enabled: false },
];

window.PIPELINE_DATA = {
  PEOPLE, STAGES, TYPES, PRODUCTS, ACTIVITY, RULES,
};

// ---------- Helpers (RD namespace v2) ----------
window.RD2 = {
  person: (id) => PEOPLE.find(p => p.id === id),
  stage:  (id) => STAGES.find(s => s.id === id),
  type:   (id) => TYPES[id],
  daysAgoLabel: (d) => {
    if (d < 1) return Math.round(d * 24) + "h ago";
    if (d < 1.5) return "1d ago";
    if (d < 30) return Math.round(d) + "d ago";
    if (d < 60) return "1mo ago";
    return Math.round(d / 30) + "mo ago";
  },
  totalVersions: (p) => {
    let n = 0;
    if (p.niche?.versions) n += p.niche.versions.length;
    ["label","box","insert"].forEach(k => { if (p[k]?.versions) n += p[k].versions.length; });
    if (p.listing?.images) Object.values(p.listing.images).forEach(arr => n += arr.length);
    return n;
  },
};
