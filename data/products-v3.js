/* eslint-disable */
// R&D Pipeline OS v2 — real data model
// Team: Chesky (overseer), Joel (purchasing+finance partner), Malik (R&D Lead),
// Ronel (Purchasing Lead), April (Catalog Lead), Esty (Designer),
// Paresh (Main image), Qaiser (Gallery + A+)

const PEOPLE = [
  // ---- Internal team ----
  { id: "chesky", name: "Chesky",  role: "Overseer",      initials: "CK", color: "#5B5BD6", external: false },
  { id: "joel",   name: "Joel",    role: "Finance",       initials: "JO", color: "#0E7C66", external: false },
  { id: "malik",  name: "Malik",   role: "Formulation Lead", initials: "MA", color: "#B45309", external: false },
  { id: "ronel",  name: "Ronel",   role: "Purchasing",    initials: "RO", color: "#7C2D12", external: false },
  { id: "april",  name: "April",   role: "Catalog Lead",  initials: "AP", color: "#9333EA", external: false },
  { id: "esty",   name: "Esty",    role: "Designer",      initials: "ES", color: "#0891B2", external: false },
  { id: "paresh", name: "Paresh",  role: "Main Image",    initials: "PA", color: "#BE185D", external: false },
  { id: "qaiser", name: "Qaiser",  role: "Gallery / A+",  initials: "QA", color: "#4F46E5", external: false },

  // ---- External: formulator ----
  { id: "talha",  name: "Talha",   role: "Formulator (External)", org: "Independent · also w/ BioCorp",
    initials: "TA", color: "#0F766E", external: true, kind: "formulator" },

  // ---- External: manufacturer contacts ----
  { id: "chris",  name: "Chris",   role: "Mfg Contact",   org: "BioCorp Nutrition Labs",
    initials: "CH", color: "#1E40AF", external: true, kind: "mfg" },
  { id: "mimi",   name: "Mimi",    role: "Mfg Contact",   org: "Herbally Yours, Inc.",
    initials: "MI", color: "#15803D", external: true, kind: "mfg" },
  { id: "connor", name: "Connor",  role: "Mfg Contact",   org: "Brand Nutra",
    initials: "CO", color: "#A16207", external: true, kind: "mfg" },
  { id: "kim",    name: "Kim",     role: "Mfg Contact",   org: "TS Food Packaging",
    initials: "KI", color: "#9D174D", external: true, kind: "mfg" },

  // ---- AI / system actors (show up in activity feed when AI does work) ----
  { id: "opus",   name: "Opus 4.7",        role: "AI Parser",      org: "Claude · niche-doc parse",
    initials: "AI", color: "#6E56CF", external: true, kind: "system" },
  { id: "pds",    name: "Claude PDS",      role: "AI Formulator",  org: "Product-Dev Specialist",
    initials: "PD", color: "#0EA5A8", external: true, kind: "system" },
];

// Manufacturer roster — referenced by product.manufacturerId
const MANUFACTURERS = [
  { id: "biocorp",     name: "BioCorp Nutrition Labs", contact: "chris",  address: "700B Broadhollow Rd, Farmingdale, NY 11735",
    capabilities: ["liquid", "capsule"], notes: "Talha is also a contractor here — strong relationship for liquids" },
  { id: "herballyours", name: "Herbally Yours, Inc.",   contact: "mimi",   address: "1504 W San Pedro Street, Gilbert, AZ 85233",
    capabilities: ["liquid", "capsule"] },
  { id: "brandnutra",  name: "Brand Nutra",             contact: "connor", address: "75 Price Parkway, Farmingdale, NY 11735",
    capabilities: ["capsule", "powder"] },
  { id: "tsfood",      name: "TS Food Packaging",       contact: "kim",    address: "171 Industrial Drive, Burlington, WI 53105",
    capabilities: ["powder"], notes: "TS does NOT sample. Talha samples in-house, then we ship them the spec sheet to execute." },
];

// Default manufacturer-pick rules per product type:
//   liquid  → BioCorp auto-locked (Talha bias). We ship raws to them — they blend.
//   capsule → quote BOTH Herbally Yours + Brand Nutra; pick cheaper. NEVER quote BioCorp (too expensive for capsules).
//   powder  → TS Food auto-locked (food/beverage powder default)
//   softgel/cream/gummy → no default, manufacturer TBD
const MFG_DEFAULTS = {
  liquid:  { mode: "auto-lock",   manufacturers: ["biocorp"] },
  capsule: { mode: "competitive", manufacturers: ["herballyours", "brandnutra"] },
  powder:  { mode: "auto-lock",   manufacturers: ["tsfood"] },
  softgel: { mode: "tbd",         manufacturers: [] },
  cream:   { mode: "tbd",         manufacturers: [] },
  gummy:   { mode: "tbd",         manufacturers: [] },
  tea:     { mode: "tbd",         manufacturers: [] },
  topical: { mode: "tbd",         manufacturers: [] },
  food:    { mode: "tbd",         manufacturers: [] },
};

// R&D ownership rules per type — who runs the formulation/sampling gate?
//   liquid  → Talha (external formulator). Iterates on flavor + blend strategy. Doses are HIS call.
//   capsule → Manufacturer (Mimi or Connor). Reviews proposed formula, may push back, ships physical capsule samples.
//   powder  → Talha samples in-house (TS doesn't sample). Then we ship spec sheet to TS to execute.
//   softgel/cream/gummy → TBD
const RD_OWNERSHIP = {
  liquid:  { ownerKind: "formulator", ownerId: "talha",  formulaSource: "talha-decides",       hasFlavor: true,  notes: "Talha proposes blend strategy + flavor; iterates samples until approved." },
  capsule: { ownerKind: "mfg",        ownerId: null,     formulaSource: "malik-pds-external",  hasFlavor: false, notes: "Malik + PDS lock doses outside system. Manufacturer (Mimi/Connor) reviews + samples." },
  powder:  { ownerKind: "formulator", ownerId: "talha",  formulaSource: "malik-pds-external",  hasFlavor: true,  notes: "Doses from Malik+PDS. Talha samples in-house. TS executes from final spec sheet." },
  softgel: { ownerKind: "tbd",        ownerId: null,     formulaSource: "tbd",                 hasFlavor: false },
  cream:   { ownerKind: "tbd",        ownerId: null,     formulaSource: "tbd",                 hasFlavor: false },
  gummy:   { ownerKind: "tbd",        ownerId: null,     formulaSource: "tbd",                 hasFlavor: true  },
};

// Sourcing mode by product type — who buys raw ingredients?
// Per-type sourcing model (post Bio-Corp policy change, late 2024):
//   ALWAYS we-supply: capsule, powder, softgel, **liquid** (Ronel quotes & ships every raw to BioCorp)
//   ALWAYS mfg-supply: tea  (Metro Tea ships finished blend; we never touch raws)
//   DYNAMIC: gummy, cream — varies per product; falls back to per-product `ingredientsSourcing` flag
// Packaging is ALWAYS our job no matter what (bottles, droppers, caps, labels, boxes, inserts).
const SOURCING_MODEL = {
  liquid:  { ingredients: "we-supply",  packaging: "we-supply" },
  capsule: { ingredients: "we-supply",  packaging: "we-supply" },
  powder:  { ingredients: "we-supply",  packaging: "we-supply" },
  softgel: { ingredients: "we-supply",  packaging: "we-supply" },
  cream:   { ingredients: "dynamic",    packaging: "we-supply" },
  gummy:   { ingredients: "dynamic",    packaging: "we-supply" },
  tea:     { ingredients: "mfg-supply", packaging: "we-supply" },
};

// Locked packaging vendors — Ronel doesn't shop these around, they're SOLE-SOURCE
const PACKAGING_VENDORS = {
  label:  { vendor: "Starrk",            contact: "orders@starrk.com",          notes: "All labels — every product, every type" },
  box:    { vendor: "Insta Print Pack",  contact: "Viraj Patel · viraj@instaprintpack.com", notes: "All folding cartons & shipper boxes" },
  insert: { vendor: "Deluxe Printing",   contact: "sales@deluxeprinting.com",   notes: "Usage guides, inserts, hangtags" },
  // bottle/dropper/cap go through Berlin Packaging or similar; not locked yet
  // shrinkband + desiccant are bundled into encapsulating/tolling cost on cost-pass
};

// Packaging components ALWAYS sourced by us, varies a bit by product type
// Note: shrinkband + desiccant are NOT separate line items — they're rolled into
// the encapsulating/tolling cost on the cost-pass card.
const PACKAGING_DEFAULTS = {
  liquid:  ["bottle", "dropper", "cap", "label", "box", "insert"],
  capsule: ["bottle", "cap", "label", "box", "insert"],
  powder:  ["pouch", "label", "box", "insert", "scoop"],
  softgel: ["bottle", "cap", "label", "box", "insert"],
  cream:   ["jar", "cap", "label", "box", "insert"],
  gummy:   ["bottle", "cap", "label", "box", "insert"],
};

// =====================================================================================
// CAPSULE SIZE REFERENCE  — hardcoded physics constants from DropperBottles.com chart.
// Used by cost-pass card (capsule products) to derive max fill per cap, recommended
// fill (80-90% of max), bottle yield, and capsule-size sanity checks on spec sheets.
//
// Capacity = grid of (capsule size × bulk density) → mg per capsule.
// Pull mg = CAPSULE_CAPACITY_MG[size][densityKey]; multiply by capsCount for serving wt.
// =====================================================================================
const CAPSULE_SIZES = [
  { id: "000", label: "Size 000", closedLengthMm: 26.1, closedLengthIn: 1.029 },
  { id: "00E", label: "Size 00E", closedLengthMm: 25.3, closedLengthIn: 0.906 },
  { id: "00",  label: "Size 00",  closedLengthMm: 23.4, closedLengthIn: 0.921 },
  { id: "0E",  label: "Size 0E",  closedLengthMm: 23.5, closedLengthIn: 0.909 },
  { id: "0",   label: "Size 0",   closedLengthMm: 21.6, closedLengthIn: 0.850 },
  { id: "1",   label: "Size 1",   closedLengthMm: 19.4, closedLengthIn: 0.764 },
];

// Density rows (g/ml) → mg fill capacity per capsule size.
// Lookup: CAPSULE_CAPACITY_MG[densityKey][sizeId]
const CAPSULE_CAPACITY_MG = {
  "0.6": { "000": 822,  "00E": 600,  "00": 540,  "0E": 468, "0": 408, "1": 288 },
  "0.8": { "000": 1096, "00E": 800,  "00": 720,  "0E": 624, "0": 544, "1": 384 },
  "1.0": { "000": 1370, "00E": 1000, "00": 900,  "0E": 780, "0": 680, "1": 480 },
  "1.2": { "000": 1644, "00E": 1200, "00": 1080, "0E": 936, "0": 816, "1": 576 },
};

// Typical bulk densities by ingredient profile — dropdown options for the cost-pass card.
// Ronel picks the closest match; the helper looks up capacity from CAPSULE_CAPACITY_MG.
const FORMULA_DENSITY_PRESETS = [
  { id: "root-leaf",      label: "Root/leaf powders",        gPerMl: 0.45, note: "Lightest — turmeric root, ashwagandha root powder" },
  { id: "probiotic",      label: "Probiotic blends",         gPerMl: 0.50, note: "0.40–0.55 typical" },
  { id: "botanical-mix",  label: "Mixed botanical blends",   gPerMl: 0.60, note: "Default for capsule SKUs (0.50–0.65)" },
  { id: "std-extract",    label: "Standardized extracts",    gPerMl: 0.60, note: "4:1, 10:1 extracts" },
  { id: "vitamins",       label: "Vitamins (B, C complex)",  gPerMl: 0.60, note: "0.50–0.70" },
  { id: "amino-acids",    label: "Amino acids (NAC, theanine)", gPerMl: 0.70, note: "0.60–0.80" },
  { id: "minerals",       label: "Minerals (Mg, Zn, Ca)",    gPerMl: 0.85, note: "Densest — chelates, oxides" },
];

// Capsule fill safety target — % of max capacity to actually plan for.
// Above 95% risks fill problems on the production line; 80-90% is the comfort zone.
const CAPSULE_FILL_TARGET = { min: 0.80, recommended: 0.85, max: 0.90 };

// Helper: given size + density, return max mg per capsule. Snaps density to nearest row.
//   capsuleCapacityMg("0", 0.6)  → 408
//   capsuleCapacityMg("00", 0.7) → 720 (snaps to 0.8 row, conservative)
function capsuleCapacityMg(sizeId, gPerMl) {
  const rows = ["0.6", "0.8", "1.0", "1.2"];
  const target = Number(gPerMl) || 0.6;
  // Snap UP to next density row — conservative (smaller capacity).
  const row = rows.find(r => parseFloat(r) >= target) || rows[rows.length - 1];
  return CAPSULE_CAPACITY_MG[row]?.[sizeId] ?? 0;
}

// Helper: recommended fill at 85% target for sanity-checking spec sheets.
function capsuleRecommendedFillMg(sizeId, gPerMl) {
  return Math.round(capsuleCapacityMg(sizeId, gPerMl) * CAPSULE_FILL_TARGET.recommended);
}

// Ingredient-sample sources (what Ronel uses to ship samples to Talha during R&D)
// Ronel's regular ingredient suppliers (the rolodex he calls when sourcing samples + bulk)
const INGREDIENT_SUPPLIERS = [
  { id: "jiaherb",  name: "JiaHerb",         specialty: "Botanical extracts (broad)", offersFreeSamples: true },
  { id: "jhd",      name: "JHD",             specialty: "Botanical extracts — JiaHerb competitor, sometimes cheaper on same ingredient", offersFreeSamples: true },
  { id: "stauber",  name: "Stauber",         specialty: "Broad-line ingredient distributor (vitamins, minerals, herbs)", offersFreeSamples: true },
  { id: "albion",   name: "Albion / Balchem", specialty: "Branded chelated minerals (sole-source)", offersFreeSamples: false, soleSource: true },
  { id: "ksm66",    name: "Ixoreal (KSM-66)", specialty: "KSM-66 ashwagandha (sole-source branded)", offersFreeSamples: true, soleSource: true },
  { id: "aditya",   name: "Aditya Chemicals", specialty: "Broad-line ingredient supplier", offersFreeSamples: true },
  { id: "nbnutrition", name: "NB Nutrition", specialty: "Trademarked / branded ingredients (GlucoVantage, etc.)", offersFreeSamples: true },
  { id: "probiway", name: "ProbiWay (Sheehy)", specialty: "Probiotic strains (sole-source for our probiotic SKUs)", offersFreeSamples: true, soleSource: true },
  { id: "greenjeeva", name: "Green Jeeva",   specialty: "Botanical extracts, vitamins, broad-line", offersFreeSamples: true },
  // Brand-holders for trademarked ingredients (referenced by TRADEMARKED_INGREDIENTS below).
  { id: "effepharm",     name: "EffePharm",         specialty: "Trademarked NMN, NR, urolithin (sole-source brand-holder)", offersFreeSamples: true, soleSource: true },
  { id: "nnbnutrition",  name: "NNB Nutrition",     specialty: "Trademarked metabolic ingredients — GlucoVantage, CaloriBurn (sole-source)", offersFreeSamples: true, soleSource: true },
  { id: "bergstrom",     name: "Bergstrom Nutrition", specialty: "OptiMSM (sole-source branded MSM)", offersFreeSamples: true, soleSource: true },
];

// Trademarked / branded ingredients we source by name. Ronel can't substitute "any NMN" for
// "Uthever NMN" — the brand is the spec. The dev sees the shape via this small sample;
// the real DB will be ~150+ entries imported from supplier catalogs.
//
// TODO(prod): import full catalog from supplier master list (Excel from Ronel) and add a
// "+ Add custom ingredient" path in the UI for anything not yet in the catalog.
const TRADEMARKED_INGREDIENTS = [
  // Sole-source from brand-holder (no authorized resellers in our rolodex yet)
  { id: "uthever-nmn",     name: "Uthever NMN",          brandHolder: "effepharm",    soleSource: true,  authorizedResellers: [],                  category: "longevity",  note: "EffePharm trademarked NMN" },
  { id: "glucovantage",    name: "GlucoVantage (DHB)",   brandHolder: "nnbnutrition", soleSource: true,  authorizedResellers: [],                  category: "metabolism", note: "Dihydroberberine — NNB trademark" },
  { id: "optimsm",         name: "OptiMSM",              brandHolder: "bergstrom",    soleSource: true,  authorizedResellers: ["stauber"],         category: "joint",      note: "Branded MSM, distillation-purified" },
  // Sole-source brand but resold through our regular suppliers (Ronel can quote either)
  { id: "ksm66",           name: "KSM-66 Ashwagandha",   brandHolder: "ksm66",        soleSource: true,  authorizedResellers: ["jiaherb", "stauber"], category: "stress",   note: "Ixoreal trademark; some authorized resellers" },
  { id: "albion-magnesium",name: "Albion Magnesium Bisglycinate", brandHolder: "albion", soleSource: true, authorizedResellers: ["stauber", "aditya"], category: "minerals", note: "Albion chelate — many authorized distributors" },
  // Branded but commodity-equivalent exists (treat as preference, not lock)
  { id: "sensoril",        name: "Sensoril Ashwagandha", brandHolder: "ksm66",        soleSource: false, authorizedResellers: ["jiaherb", "stauber", "greenjeeva"], category: "stress", note: "Generic ashwagandha is acceptable substitute if Sensoril unavailable" },
];

// Where Ronel goes for sample-sized quantities when our regular supplier can't / won't sample
const SAMPLE_SOURCES = [
  { id: "supplier-free",  name: "Free sample from regular supplier", note: "First choice — JiaHerb, Stauber, etc. will ship 1-100g free" },
  { id: "supplier-paid",  name: "Paid small qty from regular supplier", note: "When supplier won't free-sample but will sell <1kg" },
  { id: "bulksupp",       name: "BulkSupplements",             note: "Small paid bags ($5-15 each); fast Amazon ship" },
  { id: "0boxnutra",      name: "0BoxNutra",                   note: "Small paid bags; alternative when BulkSupp doesn't carry" },
];

const STAGES = [
  { id: "idea",       label: "Idea",            color: "slate",  desc: "Captured concept; needs evaluation" },
  { id: "niche",      label: "Niche Analysis",  color: "purple", desc: "Malik authors the analysis; Opus 4.7 parses on upload" },
  { id: "approval",   label: "Niche Review",    color: "amber",  desc: "Joel + Chesky decide go/no-go (Malik advises)" },
  { id: "rd",         label: "Formulation",     color: "cyan",   desc: "PDS spec → cost pass → internal approval → mfg quotes → samples. Everything locks here before parallel build." },
  { id: "build",      label: "Production",      color: "blue",   desc: "Sourcing ∥ Design ∥ Listing ∥ Amazon-check in parallel — everything outside the manufacturing run itself" },
  { id: "production", label: "Manufacturing",   color: "green",  desc: "Manufacturing run in progress at the contract mfg" },
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
  // ===== TEST SEED — 7 products, all Idea stage, one per format =====
  // Walk H303 through the full pipeline first (Idea → Niche → Formulation → Build → Listing).
  // Iterate at every step. Then move H464 (liquid) and see what's different. Etc.

  // ===== H303 — fresh idea, brand=DON, capsule. Walk this one through the entire pipeline. =====
  {
    id: "H303", code: "H303", name: "Ashwagandha + L-Theanine Sleep Stack",
    brand: "DON", type: "capsule", stage: "idea", owner: "malik",
    synopsis: "Sleep-stack capsule pairing KSM-66 ashwagandha with Suntheanine L-theanine. Clean-label premium tier — most incumbents under-dose ashwagandha. Reddit r/Supplements pulls 8K upvotes/mo on this combo.",
    createdBy: "chesky", createdDaysAgo: 0, lastActivity: 0, health: "ok",
    streams: null,
  },
  {
    id: "H464", code: "H464", name: "Adaptogen Adrenal Support Tincture",
    brand: null, type: "liquid", stage: "idea", owner: "malik",
    synopsis: "Liquid tincture: ashwagandha + rhodiola + holy basil + licorice + schisandra. Glycerite base (alcohol-free). Targets the cortisol-cocktail crowd; Talha already prototyping in-house.",
    createdBy: "joel", createdDaysAgo: 2, lastActivity: 2, health: "ok",
    streams: null,
  },
  {
    id: "H565", code: "H565", name: "Caffeine-Free Pre-Workout Powder",
    brand: null, type: "powder", stage: "idea", owner: "malik",
    synopsis: "Beta-alanine + citrulline malate + creatine — no stimulants. Underserved in the pre-workout aisle; afternoon-lifter and pregnant-athlete audience asking for it.",
    createdBy: "chesky", createdDaysAgo: 3, lastActivity: 3, health: "ok",
    streams: null,
  },
  {
    id: "H612", code: "H612", name: "Omega-3 + Astaxanthin Skin Softgel",
    brand: null, type: "softgel", stage: "idea", owner: "malik",
    synopsis: "EPA/DHA fish oil + 4mg astaxanthin in a softgel — beauty-from-within positioning. Astaxanthin is the differentiator vs every commodity fish oil on Amazon.",
    createdBy: "joel", createdDaysAgo: 4, lastActivity: 4, health: "ok",
    streams: null,
  },
  {
    id: "H788", code: "H788", name: "Chamomile + Passionflower Calm Tea",
    brand: null, type: "tea", stage: "idea", owner: "malik",
    synopsis: "Loose-leaf wellness tea: chamomile, passionflower, lemon balm, lavender. Pyramid sachets. Tea is a new format for us — tests whether our brand stretches beyond capsules/liquids.",
    createdBy: "chesky", createdDaysAgo: 5, lastActivity: 5, health: "ok",
    streams: null,
  },
  {
    id: "H821", code: "H821", name: "Magnesium + Arnica Recovery Balm",
    brand: null, type: "cream", stage: "idea", owner: "malik",
    synopsis: "Topical balm: magnesium chloride + arnica + menthol for muscle recovery. New format — opens up topicals as a category. Beauty/wellness crossover audience.",
    createdBy: "joel", createdDaysAgo: 6, lastActivity: 6, health: "ok",
    streams: null,
  },
  {
    id: "H904", code: "H904", name: "Melatonin Transdermal Sleep Patch",
    brand: null, type: "patch", stage: "idea", owner: "malik",
    synopsis: "Wearable melatonin patch — alternative to gummies/capsules for adults who don't want to swallow at bedtime. Stretch format; mfg sourcing is the unknown.",
    createdBy: "chesky", createdDaysAgo: 7, lastActivity: 7, health: "ok",
    streams: null,
  },

];

// ---------- Vendor scorecard ----------
// Aggregated across all sourcing activity. Used in People view.
const VENDOR_SCORECARD = [
  { id: "marinepure",   name: "MarinePure",        category: "Marine collagen, fish oil",      quotes: 8,  picked: 6, onTimeRate: 0.94, qcPassRate: 0.98, avgLead: 18, priceTrend: "flat",  rating: 4.7, lastOrder: 4,  notes: "Reliable. Rep: Sergio." },
  { id: "herbally",     name: "Herbally Yours",    category: "Capsule manufacturing",          quotes: 12, picked: 9, onTimeRate: 0.88, qcPassRate: 0.92, avgLead: 28, priceTrend: "up",    rating: 4.4, lastOrder: 7,  notes: "Capsule cap raised 12%. Rep: Mimi." },
  { id: "brandnutra",   name: "Brand Nutra",       category: "Capsule manufacturing",          quotes: 7,  picked: 2, onTimeRate: 0.81, qcPassRate: 0.95, avgLead: 32, priceTrend: "flat",  rating: 4.0, lastOrder: 22, notes: "Pricier but flexible MOQ. Rep: Connor." },
  { id: "labelpros",    name: "Label Pros",        category: "Labels, inserts",                 quotes: 15, picked: 14,onTimeRate: 0.97, qcPassRate: 0.99, avgLead: 9,  priceTrend: "flat",  rating: 4.9, lastOrder: 2,  notes: "Default. Cheskey-trusted." },
  { id: "boxworks",     name: "Box Works",         category: "Cartons, secondary packaging",    quotes: 9,  picked: 7, onTimeRate: 0.92, qcPassRate: 0.96, avgLead: 14, priceTrend: "down",  rating: 4.6, lastOrder: 5,  notes: "Tuck-end specialty." },
  { id: "amberbottles", name: "Amber Bottles Co",  category: "Glass dropper bottles",           quotes: 6,  picked: 5, onTimeRate: 0.85, qcPassRate: 0.94, avgLead: 22, priceTrend: "up",    rating: 4.3, lastOrder: 9,  notes: "China lead times slipped." },
  { id: "caffeineco",   name: "PureCaff Inc",      category: "Caffeine anhydrous",              quotes: 4,  picked: 1, onTimeRate: 0.62, qcPassRate: 0.88, avgLead: 35, priceTrend: "up",    rating: 3.4, lastOrder: 15, notes: "⚠ Active backorder on B-103." },
  { id: "mushgrown",    name: "MushGrown Farms",   category: "Functional mushrooms",            quotes: 5,  picked: 3, onTimeRate: 0.90, qcPassRate: 0.97, avgLead: 21, priceTrend: "down",  rating: 4.5, lastOrder: 12, notes: "Lion's mane, cordyceps, reishi." },
];

// ---------- Activity feed (cross-product) ----------
const ACTIVITY = [];

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
  rd:         { target: 21,  label: "Formulate in" },
  build:      { target: 30,  label: "Parallel Build in" },
  production: { target: 35,  label: "Manufacture in" },
};

// Days each currently in-stage product has spent in its current stage
const STAGE_AGE = {
  "H303": 0, "H464": 2, "H565": 3, "H612": 4, "H788": 5, "H821": 6, "H904": 7,
};

// ---------- v3: AI proactive nudges (what would Slack/AI surface?) ----------
const AI_NUDGES = [];

// ---------- v3: launched-product outcomes (thesis vs actual) ----------
const LIVE_OUTCOMES = {};

// ---------- v3: Watchlist — competitors, ASINs, ingredient supply, trend keywords ----------
const WATCHLIST = { competitors: [], asins: [], ingredients: [], trends: [] };

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
const COMMENTS = {};

// ---------- Index helpers ----------
PRODUCTS.forEach(p => {
  p.stageAge = STAGE_AGE[p.id] ?? 0;
  p.thesis = THESES[p.id] || null;
  p.comments = COMMENTS[p.id] || [];
  p.live = LIVE_OUTCOMES[p.id] || null;
});

window.PIPELINE_DATA = {
  PEOPLE, STAGES, TYPES, PRODUCTS, ACTIVITY, RULES,
  CYCLE_BENCHMARKS, AI_NUDGES, WATCHLIST, VENDOR_SCORECARD,
  MANUFACTURERS, MFG_DEFAULTS, RD_OWNERSHIP, SOURCING_MODEL, PACKAGING_DEFAULTS, PACKAGING_VENDORS, SAMPLE_SOURCES, INGREDIENT_SUPPLIERS, TRADEMARKED_INGREDIENTS,
  CAPSULE_SIZES, CAPSULE_CAPACITY_MG, FORMULA_DENSITY_PRESETS, CAPSULE_FILL_TARGET, capsuleCapacityMg, capsuleRecommendedFillMg,
};

// ---------- Helpers (RD namespace v2) ----------
window.RD2 = {
  person: (id) => PEOPLE.find(p => p.id === id),
  stage:  (id) => STAGES.find(s => s.id === id),
  type:   (id) => TYPES[id],
  manufacturer: (id) => MANUFACTURERS.find(m => m.id === id),
  // Admin override — Chesky and Joel see every action button on every product,
  // bypassing ownership/waitingOn gating. They are the operators of record.
  isAdmin: (userId) => userId === "chesky" || userId === "joel",
  // Should `currentUser` see action controls on this product? Owner / waitingOn
  // user / admins all qualify.
  canAct: (currentUser, p) => {
    if (!currentUser || !p) return false;
    if (currentUser === "chesky" || currentUser === "joel") return true;
    return currentUser === p.owner || currentUser === p.waitingOn;
  },
  manufacturersForType: (typeId) => {
    const def = MFG_DEFAULTS[typeId];
    if (!def) return [];
    return def.manufacturers.map(mid => MANUFACTURERS.find(m => m.id === mid)).filter(Boolean);
  },
  rdOwnership: (typeId) => RD_OWNERSHIP[typeId] || { ownerKind: "tbd", ownerId: null, formulaSource: "tbd", hasFlavor: false },
  sourcingModel: (typeId) => SOURCING_MODEL[typeId] || { ingredients: "we-supply", packaging: "we-supply" },
  // Resolve actual ingredients-sourcing for a product, accounting for type defaults + per-product override
  ingredientsSourcing: (p) => {
    const m = SOURCING_MODEL[p.type];
    if (!m) return "we-supply";
    if (m.ingredients === "dynamic") return p.ingredientsSourcing || "we-supply"; // default to we-supply when unset
    return m.ingredients;
  },
  // Is this product's type one where the mode varies per product?
  ingredientsSourcingIsDynamic: (p) => (SOURCING_MODEL[p.type]?.ingredients === "dynamic"),
  packagingDefaults: (typeId) => PACKAGING_DEFAULTS[typeId] || ["bottle", "cap", "label", "box"],
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
