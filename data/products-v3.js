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
  { id: "niche",      label: "Niche Research",  color: "purple", desc: "Malik writing the deep-dive analysis" },
  { id: "approval",   label: "Niche Review",    color: "amber",  desc: "Chesky + Joel decide go/no-go" },
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
      { code: "RM501", ingredient: "Marine collagen peptides", spec: "Hydrolyzed, fish-source, 1000mg/serving", kgNeeded: 21.0, soleSource: false, picked: "MarinePure", status: "Locked",
        rationale: "MarinePure beats Sigma on price + lead. Pacific Bio backup if MarinePure capacity slips.",
        quotes: [
          { vendor: "MarinePure",  contact: "sales@marinepure.com",   pricePerKg: 8.40,  moq: 25,  lead: "21d", inStock: true,  sample: "received", daysAgo: 4, note: "Best price + freshest sample" },
          { vendor: "Sigma Marine", contact: "ops@sigmamarine.com",    pricePerKg: 9.10,  moq: 50,  lead: "28d", inStock: true,  sample: "pending",  daysAgo: 5 },
          { vendor: "Pacific Bio",  contact: "sales@pacificbio.com",   pricePerKg: 8.90,  moq: 25,  lead: "30d", inStock: false, sample: "pending",  daysAgo: 6, note: "Out of stock until next month" },
        ] },
      { code: "RM119", ingredient: "Biotin (D-Biotin USP)", spec: "5000mcg/serving, USP grade", kgNeeded: 0.105, soleSource: false, picked: "BulkVitamins", status: "Locked",
        rationale: "Standard commodity, BulkVitamins fastest lead.",
        quotes: [
          { vendor: "BulkVitamins", contact: "orders@bulkvitamins.com", pricePerKg: 1100, moq: 0.1, lead: "10d", inStock: true, sample: "n/a", daysAgo: 6 },
          { vendor: "DSM Nutrition", contact: "sales@dsm.com",          pricePerKg: 1320, moq: 1.0, lead: "21d", inStock: true, sample: "n/a", daysAgo: 7 },
        ] },
      { code: "RM301", ingredient: "Vegetable glycerin", spec: "USP, organic, kosher", kgNeeded: 12.5, soleSource: false, picked: "Glycera", status: "Locked",
        rationale: "Glycera lock from previous SKU; pricing consistent.",
        quotes: [
          { vendor: "Glycera",      contact: "sales@glycera.com",       pricePerKg: 3.20,  moq: 10,  lead: "7d",  inStock: true, sample: "n/a", daysAgo: 6 },
          { vendor: "ADM Nutrition", contact: "orders@adm.com",         pricePerKg: 3.55,  moq: 25,  lead: "10d", inStock: true, sample: "n/a", daysAgo: 7 },
        ] },
      { code: "RM218", ingredient: "Natural berry flavor", spec: "Non-GMO, no sucralose, water-soluble", kgNeeded: 1.8, soleSource: false, picked: null, status: "Quoting",
        rationale: "",
        quotes: [
          { vendor: "Symrise",      contact: "sample@symrise.com",      pricePerKg: null,  moq: 5,   lead: "14d", inStock: true,  sample: "in transit", daysAgo: 2, note: "Sample shipped, ETA 3d" },
          { vendor: "Capella",      contact: "ops@capellaflavors.com",  pricePerKg: 78,    moq: 1,   lead: "7d",  inStock: true,  sample: "received",   daysAgo: 5 },
          { vendor: "TFA",          contact: "sales@tfa.com",           pricePerKg: 65,    moq: 5,   lead: "10d", inStock: true,  sample: "pending",    daysAgo: 4, note: "Need to taste-test" },
        ] },
      { code: "RM502", ingredient: "Citric acid", spec: "Anhydrous, food grade", kgNeeded: 6.0, soleSource: false, picked: "ADM", status: "Locked",
        rationale: "Cheapest and we have history.",
        quotes: [
          { vendor: "ADM",          contact: "orders@adm.com",          pricePerKg: 0.45,  moq: 50,  lead: "5d",  inStock: true, sample: "n/a", daysAgo: 8 },
          { vendor: "Cargill",      contact: "ops@cargill.com",         pricePerKg: 0.52,  moq: 100, lead: "7d",  inStock: true, sample: "n/a", daysAgo: 8 },
        ] },
      { code: "RM601", ingredient: "Potassium sorbate", spec: "Preservative, FCC grade", kgNeeded: 1.2, soleSource: false, picked: "Univar", status: "Locked",
        rationale: "Standard preservative, Univar one-stop.",
        quotes: [
          { vendor: "Univar",       contact: "orders@univar.com",       pricePerKg: 2.10,  moq: 10,  lead: "5d",  inStock: true, sample: "n/a", daysAgo: 8 },
          { vendor: "Brenntag",     contact: "sales@brenntag.com",      pricePerKg: 2.35,  moq: 25,  lead: "7d",  inStock: true, sample: "n/a", daysAgo: 8 },
        ] },
      { code: "RM119s", ingredient: "Stevia leaf extract", spec: "Reb-A 95%, organic", kgNeeded: 0.5, soleSource: false, picked: "PureCircle", status: "Locked",
        rationale: "PureCircle Reb-A 95% is the cleanest taste profile.",
        quotes: [
          { vendor: "PureCircle",   contact: "sales@purecircle.com",    pricePerKg: 48,    moq: 1,   lead: "14d", inStock: true, sample: "received", daysAgo: 6 },
          { vendor: "Sweet Green Fields", contact: "ops@sgf.com",       pricePerKg: 42,    moq: 5,   lead: "21d", inStock: true, sample: "received", daysAgo: 7, note: "Cheaper but slight aftertaste" },
        ] },
      { code: "RM100", ingredient: "Magnesium Bisglycinate Chelate (TRAACS™)", spec: "Albion-branded, USP", kgNeeded: 4.0, soleSource: true, picked: "Albion / Balchem", status: "Locked",
        rationale: "Sole source — Albion holds the TRAACS trademark. No comparison possible.",
        quotes: [
          { vendor: "Albion / Balchem", contact: "rharnish@balchem.com", pricePerKg: 22.71, moq: 25, lead: "21d", inStock: true, sample: "n/a", daysAgo: 9, note: "Trademarked form — sole source" },
        ] },
    ],
    specSheet: {
      // Each version is a snapshot of the BOM (ingredient + dose + supplier) at that point in time.
      // The newest is "current" — older are kept for audit + diff. AI summarizes deltas between versions.
      currentVersion: 5,
      lockedAt: null,  // not yet locked-and-sent
      sentToManufacturer: null,
      versions: [
        { v: 1, by: "malik", daysAgo: 14, note: "Initial AI extract from niche analysis", source: "Claude PDF parse",
          ingredients: [
            { name: "Marine collagen peptides", dose: "1000mg", supplier: "TBD" },
            { name: "Biotin (D-Biotin USP)", dose: "5000mcg", supplier: "TBD" },
            { name: "Vegetable glycerin", dose: "Q.S.", supplier: "TBD" },
            { name: "Natural berry flavor", dose: "Q.S.", supplier: "TBD" },
            { name: "Citric acid", dose: "Q.S.", supplier: "TBD" },
            { name: "Potassium sorbate", dose: "Q.S.", supplier: "TBD" },
            { name: "Stevia leaf extract", dose: "30mg", supplier: "TBD" },
          ] },
        { v: 2, by: "malik", daysAgo: 12, note: "Added magnesium bisglycinate per Joel's note on absorption story",
          ingredients: [
            { name: "Marine collagen peptides", dose: "1000mg", supplier: "TBD" },
            { name: "Biotin (D-Biotin USP)", dose: "5000mcg", supplier: "TBD" },
            { name: "Magnesium Bisglycinate Chelate (TRAACS™)", dose: "200mg", supplier: "Albion / Balchem (sole source)" },
            { name: "Vegetable glycerin", dose: "Q.S.", supplier: "TBD" },
            { name: "Natural berry flavor", dose: "Q.S.", supplier: "TBD" },
            { name: "Citric acid", dose: "Q.S.", supplier: "TBD" },
            { name: "Potassium sorbate", dose: "Q.S.", supplier: "TBD" },
            { name: "Stevia leaf extract", dose: "30mg", supplier: "TBD" },
          ] },
        { v: 3, by: "ronel", daysAgo: 9, note: "Locked suppliers after first quote round",
          ingredients: [
            { name: "Marine collagen peptides", dose: "1000mg", supplier: "Pacific Bio" },
            { name: "Biotin (D-Biotin USP)", dose: "5000mcg", supplier: "BulkVitamins" },
            { name: "Magnesium Bisglycinate Chelate (TRAACS™)", dose: "200mg", supplier: "Albion / Balchem" },
            { name: "Vegetable glycerin", dose: "Q.S.", supplier: "Glycera" },
            { name: "Natural berry flavor", dose: "Q.S.", supplier: "TBD" },
            { name: "Citric acid", dose: "Q.S.", supplier: "ADM" },
            { name: "Potassium sorbate", dose: "Q.S.", supplier: "Univar" },
            { name: "Stevia leaf extract", dose: "30mg", supplier: "PureCircle" },
          ] },
        { v: 4, by: "malik", daysAgo: 5, note: "Removed dandelion (compliance flag), bumped collagen dose for label claim",
          ingredients: [
            { name: "Marine collagen peptides", dose: "1500mg", supplier: "Pacific Bio" },
            { name: "Biotin (D-Biotin USP)", dose: "5000mcg", supplier: "BulkVitamins" },
            { name: "Magnesium Bisglycinate Chelate (TRAACS™)", dose: "200mg", supplier: "Albion / Balchem" },
            { name: "Vegetable glycerin", dose: "Q.S.", supplier: "Glycera" },
            { name: "Natural berry flavor", dose: "Q.S.", supplier: "TBD" },
            { name: "Citric acid", dose: "Q.S.", supplier: "ADM" },
            { name: "Potassium sorbate", dose: "Q.S.", supplier: "Univar" },
            { name: "Stevia leaf extract", dose: "30mg", supplier: "PureCircle" },
          ] },
        { v: 5, by: "ronel", daysAgo: 2, note: "Swapped Pacific Bio → MarinePure for collagen (better price + lead)",
          ingredients: [
            { name: "Marine collagen peptides", dose: "1500mg", supplier: "MarinePure" },
            { name: "Biotin (D-Biotin USP)", dose: "5000mcg", supplier: "BulkVitamins" },
            { name: "Magnesium Bisglycinate Chelate (TRAACS™)", dose: "200mg", supplier: "Albion / Balchem" },
            { name: "Vegetable glycerin", dose: "Q.S.", supplier: "Glycera" },
            { name: "Natural berry flavor", dose: "Q.S.", supplier: "TBD" },
            { name: "Citric acid", dose: "Q.S.", supplier: "ADM" },
            { name: "Potassium sorbate", dose: "Q.S.", supplier: "Univar" },
            { name: "Stevia leaf extract", dose: "30mg", supplier: "PureCircle" },
          ] },
      ],
    },
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
        mainBrief: "Bottle dead-center, white seamless, dropper visible, 2000×2000, no copy. Match L-022 lighting key.",
        gallery: [
          v(1, "qaiser", 3, "Lifestyle 1: morning routine"),
          v(1, "qaiser", 3, "Ingredient infographic"),
          v(1, "qaiser", 2, "Comparison vs capsule"),
        ],
        galleryBriefs: [
          "Lifestyle: morning routine, woman 25–34 holding dropper over coffee",
          "Infographic: 5000mcg biotin + 1000mg collagen, dose visualization",
          "Comparison: liquid drop vs horse-pill capsule, scale-to-show",
          "Texture: berry liquid swirl close-up, appetite appeal",
          "Lifestyle: bathroom counter, evening skincare context",
          "Trust badges: 3rd-party tested, made in USA, non-GMO row",
        ],
        aplus:   [v(1, "qaiser", 1, "A+ module 1 of 3 drafted")],
        aplusBriefs: [
          "Brand story: PN origin + clean-ingredient promise",
          "Hero claim block: 'liquid absorbs faster than capsules' + iconography",
          "Ingredient deep-dive: collagen + biotin science, 3rd-party tested mark",
        ],
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
  { id: "approval-stale",     on: "Approval pending >24h",       where: "any product",  notify: ["@chesky", "#rd-blockers"], label: "Bump Chesky on stalled go/no-go", enabled: true },
  { id: "stage-stuck",        on: "Stage age > target +3d",      where: "any stage",    notify: ["@chesky"],                  label: "Cycle-time slip", enabled: true },
  { id: "stream-backorder",   on: "Stream → Backorder/Stuck",    where: "build stage",  notify: ["@chesky", "@joel"],         label: "Cost/timeline blocker", enabled: true },
  { id: "version-published",  on: "New version uploaded",        where: "any product",  notify: ["#rd-pipeline"],             label: "Spec/listing/image change broadcast", enabled: true },
  { id: "idea-aged",          on: "Idea aged >5d w/o triage",    where: "idea inbox",   notify: ["@malik", "@chesky"],        label: "Inbox housekeeping", enabled: false },
  { id: "daily-digest",       on: "Daily digest 9am",            where: "all pipeline", notify: ["#rd-pipeline"],             label: "Morning push-queue summary", enabled: true },
];

// ---------- v3 additions: cycle-time benchmarks (median days a product sits in each stage) ----------
const CYCLE_BENCHMARKS = {
  idea:       { target: 7,   label: "Triage in" },
  niche:      { target: 14,  label: "Analyze in" },
  approval:   { target: 3,   label: "Decide in" },
  build:      { target: 30,  label: "Build in" },
  production: { target: 35,  label: "Manufacture in" },
};

// Days each currently in-stage product has spent in its current stage
const STAGE_AGE = {
  "I-301": 1,  "I-302": 2,  "I-303": 3,  "I-304": 4,
  "I-305": 5,  "I-306": 6,  "I-307": 7,  "I-308": 8,
  "N-201": 14, "N-202": 11, "N-203": 6,
  "A-150": 4,  "A-151": 2,
  "B-101": 18, "B-102": 28, "B-103": 22,
  "P-051": 5,  "P-052": 3,
  "L-022": 86, "L-023": 38,
  "H-040": 41, "K-019": 28,
};

// ---------- v3: AI proactive nudges (what would Slack/AI surface?) ----------
const AI_NUDGES = [
  { id: "n1", productId: "B-103", severity: "high",   icon: "⚠",
    headline: "B-103 Pre-Workout has been stuck 12d",
    detail: "Caffeine backorder is the only blocker. Ronel last touched it 12d ago. Two alternatives in your saved-vendors list haven't been pinged.",
    actions: [
      { label: "Ping Ronel in Slack",   kind: "primary" },
      { label: "Email alt vendors",     kind: "ghost" },
      { label: "Move to Hold",          kind: "ghost" },
    ],
  },
  { id: "n2", productId: "A-150", severity: "med", icon: "⚖",
    headline: "DON-MoringaMix has been awaiting your call for 4d",
    detail: "Joel approved 2d ago. Niche-review SLA is 3d — you're 1d over. Recommend reviewing or punting.",
    actions: [
      { label: "Open niche doc",  kind: "primary" },
      { label: "Approve",         kind: "promote" },
      { label: "Snooze 24h",      kind: "ghost" },
    ],
  },
  { id: "n3", productId: "B-101", severity: "low", icon: "✦",
    headline: "B-101 Biotin+Collagen — sourcing 71% quoted",
    detail: "Two ingredients still pending: natural berry flavor (Symrise sample inbound) and stevia confirmation. Cost lock estimated end of week.",
    actions: [
      { label: "Open BOM",        kind: "primary" },
      { label: "Approve cost",    kind: "ghost" },
    ],
  },
  { id: "n4", productId: "I-306", severity: "low", icon: "✦",
    headline: "Tongkat Ali idea — sourcing risk before niche",
    detail: "Tongkat is one of 3 ingredients flagged in your moat-watchlist as supply-constrained. Worth a 10-min sourcing pre-check before sinking 14d into niche analysis.",
    actions: [
      { label: "Ask Ronel for vendor scan", kind: "primary" },
      { label: "Skip — promote to niche",   kind: "ghost" },
    ],
  },
  { id: "n5", productId: "L-022", severity: "low", icon: "📈",
    headline: "DON-MagneCalm pacing 18% above thesis",
    detail: "Forecasted 7,500/mo at launch; pacing 8,840/mo. Stock-out risk in 6wk if no reorder triggered.",
    actions: [
      { label: "Trigger reorder",   kind: "primary" },
      { label: "Open Live tab",     kind: "ghost" },
    ],
  },
];

// ---------- v3: launched-product outcomes (thesis vs actual) ----------
const LIVE_OUTCOMES = {
  "L-022": {
    thesisRevenue: "$165K/mo",   actualRevenue:   "$197K/mo",
    thesisUnits:   "7,500/mo",   actualUnits:     "8,840/mo",
    thesisRating:  "4.4★ target", actualRating:   "4.6★",
    thesisCpc:     "$0.85 target",actualCpc:     "$0.72",
    thesisVerdict: "Top-3 in subcategory",
    actualVerdict: "BEAT — pacing 18% over thesis",
    keywordRank: [
      { kw: "magnesium drops liquid",       target: "Top 10",  actual: "#3"   },
      { kw: "magnesium calm liquid",        target: "Top 10",  actual: "#1"   },
      { kw: "liquid magnesium for sleep",   target: "Top 20",  actual: "#7"   },
      { kw: "magnesium glycinate liquid",   target: "Top 20",  actual: "#11"  },
    ],
    notes: "Stress-shed angle in A+ outperformed; 38% of buyers from non-magnesium queries.",
  },
  "L-023": {
    thesisRevenue: "$82K/mo",    actualRevenue:   "$71K/mo",
    thesisUnits:   "3,200/mo",   actualUnits:     "2,810/mo",
    thesisRating:  "4.5★ target",actualRating:    "4.4★",
    thesisCpc:     "$1.10 target",actualCpc:     "$1.34",
    thesisVerdict: "Trending in postpartum subcategory",
    actualVerdict: "MISS — 13% below thesis on units, CPC 22% high",
    keywordRank: [
      { kw: "postpartum iron supplement",   target: "Top 10",  actual: "#6"   },
      { kw: "iron folate postpartum",       target: "Top 20",  actual: "#22"  },
      { kw: "best iron for nursing moms",   target: "Top 20",  actual: "#34"  },
    ],
    notes: "Rating dipped on metallic taste reviews — reformulation candidate.",
  },
};

// ---------- v3: Watchlist — competitors, ASINs, ingredient supply, trend keywords ----------
const WATCHLIST = {
  competitors: [
    { brand: "Nutrafol",     watching: "Hair growth — vs PN-HairCalm", asin: "B0CX8Y7K12", price: "$88",
      delta: "—", note: "Stable. Premium anchor.",
      lastChange: 3 },
    { brand: "Olly",         watching: "Hair gummies — competing format", asin: "B0BLQ8VV7P", price: "$15",
      delta: "+$2", note: "Raised price 14d ago, room for our $22 PN entry.",
      lastChange: 14 },
    { brand: "Bloom Greens", watching: "Greens powder — DON-Moringa overlap", asin: "B09K4KK17R", price: "$39",
      delta: "—", note: "TikTok-driven; out of stock 3x in 30d.",
      lastChange: 7 },
    { brand: "Heart & Soil",  watching: "Beef organ — DON-OrganMeats overlap", asin: "B08RZB1NCC", price: "$45",
      delta: "+$5", note: "Raised price last week. We can hold $39 list.",
      lastChange: 8 },
  ],
  ingredients: [
    { name: "Tongkat Ali (Eurycoma)",      status: "Constrained",   note: "Indonesian harvest restrictions", touchedDays: 5 },
    { name: "Caffeine anhydrous",          status: "Backorder",     note: "PW-Energy blocker — Ronel chasing alts", touchedDays: 12 },
    { name: "Marine collagen (hydrolyzed)",status: "Healthy",       note: "MarinePure quote $8.40/kg, dropped from $9.10", touchedDays: 4 },
    { name: "Lion's Mane extract",         status: "Watch",         note: "Supplier consolidation in Q1; price up 8%", touchedDays: 9 },
  ],
  trendKeywords: [
    { kw: "lymphatic drainage tea",      sv: "39K/mo",  trend: "+340% YoY", action: "Idea I-301 covers"    },
    { kw: "cortisol cocktail",           sv: "84K/mo",  trend: "+220% YoY", action: "Idea I-302 covers"    },
    { kw: "tongkat ali for women",       sv: "14K/mo",  trend: "+180% YoY", action: "Whitespace — no idea" },
    { kw: "berberine alternatives",      sv: "31K/mo",  trend: "+95% YoY",  action: "Whitespace — no idea" },
  ],
};

// ---------- v3: Per-product theses (the bet behind the product) ----------
const THESES = {
  "N-201": {
    statement: "Hair growth + adaptogenic calm — the only stack that names the stress-shedding link.",
    revenueTarget: "$140K/mo by m6",
    timelineTarget: "60d niche → launch",
    risk: "Crowded — Nutrafol owns brand authority; we win on price + dual-mechanism story.",
    successMetric: "Top-10 organic for 'hair stress shedding' within 90d.",
  },
  "B-101": {
    statement: "Liquid biotin+collagen for the 'no horse pill' crowd — fast-absorb story sells the format.",
    revenueTarget: "$120K/mo by m6",
    timelineTarget: "75d to launch",
    risk: "Liquid format spoilage shorter shelf life — preservation system must work.",
    successMetric: "Listing CVR > 11% (vs category 8.4%).",
  },
  "B-102": {
    statement: "Lymphatic drainage on the rising tide — capture search before the trend peaks.",
    revenueTarget: "$95K/mo by m6",
    timelineTarget: "Live in <60d",
    risk: "Trend may peak Q2; speed-to-market is the bet.",
    successMetric: "PO confirmed within 30d of niche approval.",
  },
  "B-103": {
    statement: "Pre-workout for the supplements-curious (not gym-bros) — clean-label angle.",
    revenueTarget: "$65K/mo by m6",
    timelineTarget: "75d to launch",
    risk: "Caffeine sourcing volatile — alt vendor must ladder.",
    successMetric: "Repeat-purchase rate > 22% by m4.",
  },
  "L-022": {
    statement: "Liquid magnesium for the sleep-can't-swallow-pills demo. Calm angle vs sleep-only competitors.",
    revenueTarget: "$165K/mo by m6",
    timelineTarget: "Already live",
    risk: "Magnesium category crowded; differentiation is liquid + calm story.",
    successMetric: "Top-3 in 'liquid magnesium' subcategory by m6.",
  },
  "L-023": {
    statement: "Postpartum iron — addressing the underserved nursing-mom segment with low-nausea capsules.",
    revenueTarget: "$82K/mo by m6",
    timelineTarget: "Launched 5wk ago",
    risk: "Niche, slow-growth segment.",
    successMetric: "Sustained 4.5★ rating with >100 reviews by m4.",
  },
};

// ---------- v3: Unified comments per product (replaces threads scattered across tabs) ----------
const COMMENTS = {
  "B-101": [
    { id: "c1", user: "chesky", at: 1.5, topic: "label",   body: "Color is too pink — needs a peach pull. Esty, can you try v4 with the warmer tone we used on MagneCalm?", thread: [] },
    { id: "c2", user: "esty",   at: 1.0, topic: "label",   body: "On it — pulling the swatch from L-022 file.", thread: [] },
    { id: "c3", user: "ronel",  at: 0.5, topic: "sourcing",body: "Symrise berry flavor sample arrives Thursday. Will run the cost lock once tasted.", thread: [] },
    { id: "c4", user: "april",  at: 0.4, topic: "listing", body: "Bullet 4 currently leads with 'Non-GMO' — should it lead with 'Made in USA' for trust signal? @chesky", thread: [] },
    { id: "c5", user: "chesky", at: 0.2, topic: "listing", body: "Yes — Made in USA first. Then Non-GMO. Then 3rd-party tested.", thread: [] },
  ],
  "A-150": [
    { id: "c6", user: "joel",   at: 2.0, topic: "approval", body: "Margin works at $24 list. Approve from finance.", thread: [] },
    { id: "c7", user: "malik",  at: 1.0, topic: "niche",    body: "Bloom Greens out-of-stock 3x last month. Real signal we should move on this.", thread: [] },
  ],
  "B-103": [
    { id: "c8", user: "ronel",  at: 12, topic: "sourcing",  body: "Caffeine anhydrous backordered 4wk minimum. Reaching out to MyProtein supplier and BulkSupplements as alts.", thread: [] },
    { id: "c9", user: "chesky", at: 11, topic: "sourcing",  body: "Don't let this slip past 14d total. Move to Hold and revisit if alts are also constrained.", thread: [] },
  ],
};

// ---------- Index helpers ----------
PRODUCTS.forEach(p => {
  p.stageAge = STAGE_AGE[p.id] ?? 0;
  p.thesis = THESES[p.id] || null;
  p.comments = COMMENTS[p.id] || [];
  p.live = LIVE_OUTCOMES[p.id] || null;
});

window.PIPELINE_DATA = {
  PEOPLE, STAGES, TYPES, PRODUCTS, ACTIVITY, RULES,
  CYCLE_BENCHMARKS, AI_NUDGES, WATCHLIST,
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
