/* global React */
// Mobile shared atoms — used across all 3 directions

const M_TOKENS = {
  ink: "#0F0F11",
  ink2: "#3D3F47",
  ink3: "#787A85",
  ink4: "#B5B6BE",
  line: "#E7E7EB",
  line2: "#F1F1F4",
  bg: "#FAFAFB",
  bg2: "#F4F4F6",
  panel: "#FFFFFF",
  accent: "#1F66F5",
  accentBg: "#EAF1FE",
  ok: "#0E8B4F",
  okBg: "#E5F3EC",
  warn: "#B86A12",
  warnBg: "#FBF1E2",
  err: "#C12D2D",
  errBg: "#FBE9E9",
  brandDON: "#9C5226",
  brandPN: "#6C3DBE",
};

const PEOPLE = {
  chesky: { id: "chesky", name: "Chesky", initials: "CH", color: "#1F66F5", role: "Overseer" },
  joel:   { id: "joel",   name: "Joel",   initials: "JO", color: "#0E8B4F", role: "Finance / Purchasing" },
  malik:  { id: "malik",  name: "Malik",  initials: "ML", color: "#B86A12", role: "Niche & Research" },
  ronel:  { id: "ronel",  name: "Ronel",  initials: "RO", color: "#6C3DBE", role: "Purchasing" },
  esty:   { id: "esty",   name: "Esty",   initials: "ES", color: "#C12D2D", role: "Designer" },
  april:  { id: "april",  name: "April",  initials: "AP", color: "#0B7A8E", role: "Catalog Lead" },
  paresh: { id: "paresh", name: "Paresh", initials: "PA", color: "#7A6A2D", role: "Main Image" },
  qaiser: { id: "qaiser", name: "Qaiser", initials: "QA", color: "#3D5A2D", role: "Gallery + A+" },
};

// Curated mobile product set — items most relevant for "what's waiting on Chesky"
const M_PRODUCTS = [
  // Approval queue — these need YOU
  { id: "A-150", code: "DON-MoringaMix", name: "Moringa + Soursop Greens", brand: "DON", type: "powder",
    stage: "approval", owner: "malik", waitingOn: "chesky", lastActivity: 4, urgency: "high",
    synopsis: "Premium greens drink. Niche analysis complete; recommend Proceed.",
    nicheVerdict: "PROCEED", recommendation: "Premium positioning, $24 list, ~58% margin at MOQ",
    approvals: { chesky: null, joel: { decision: "approve", at: 2, note: "Margin checks out at $24 list. Approve." } },
    market: { sv: "8.4K/mo", revenue: "$340K/mo", trend: "+18% YoY", cvr: "11.4%" } },
  { id: "A-151", code: "PN-IronWoman", name: "Iron + Folate Drops (Women)", brand: "PN", type: "liquid",
    stage: "approval", owner: "malik", waitingOn: "chesky", lastActivity: 2, urgency: "high",
    synopsis: "Iron deficiency is mainstream now. Liquid format, low-nausea.",
    nicheVerdict: "PROCEED", recommendation: "Strong DTC fit. $32 list, ~62% margin.",
    approvals: { chesky: null, joel: null },
    market: { sv: "12.1K/mo", revenue: "$520K/mo", trend: "+24% YoY", cvr: "9.2%" } },

  // Build with blockers — Chesky needs to push someone
  { id: "B-301", code: "DON-MagGly", name: "Magnesium Glycinate Sleep", brand: "DON", type: "capsule",
    stage: "build", owner: "joel", lastActivity: 1, urgency: "med",
    streams: {
      sourcing: { owner: "ronel", status: "Approved",   pct: 100, lastNote: "PO sent to NutriSource" },
      design:   { owner: "esty",  status: "In review", pct: 75,  lastNote: "Label v3, awaiting your sign-off" },
      listing:  { owner: "april", status: "Drafting",  pct: 40,  lastNote: "Title done, bullets WIP" },
    },
    blocker: { stream: "design", reason: "Label v3 awaiting your approval", days: 3 } },
  { id: "B-302", code: "PN-CollagenPlus", name: "Collagen Peptides+", brand: "PN", type: "powder",
    stage: "build", owner: "joel", lastActivity: 0.5, urgency: "low",
    streams: {
      sourcing: { owner: "ronel", status: "Quoting",   pct: 60, lastNote: "Waiting on Wuxi quote" },
      design:   { owner: "esty",  status: "Drafting", pct: 30, lastNote: "Carton sketch in progress" },
      listing:  { owner: "april", status: "Not started", pct: 0, lastNote: "Awaiting hero image" },
    } },
  { id: "B-303", code: "DON-AshwaSleep", name: "Ashwagandha Night", brand: "DON", type: "capsule",
    stage: "build", owner: "joel", lastActivity: 9, urgency: "high",
    streams: {
      sourcing: { owner: "ronel", status: "Backorder", pct: 80, lastNote: "Vendor delay 3wks" },
      design:   { owner: "esty",  status: "Approved",  pct: 100, lastNote: "Final files locked" },
      listing:  { owner: "april", status: "Live",      pct: 100, lastNote: "ASIN B0CDXXX live" },
    },
    blocker: { stream: "sourcing", reason: "Vendor backorder — need new sourcing", days: 9 } },

  // Niche — researching / parsed
  { id: "N-201", code: "PN-HairCalm", name: "Hair Growth + Calm Capsules", brand: "PN", type: "capsule",
    stage: "niche", owner: "malik", lastActivity: 1, urgency: "low",
    nicheSubState: "parsed", docUploadedDaysAgo: 1,
    synopsis: "Hair growth + adaptogenic calm — only stack pairing both stories." },
  { id: "N-202", code: "DON-LiverDrops", name: "Beef Liver Drops", brand: "DON", type: "liquid",
    stage: "niche", owner: "malik", lastActivity: 3, urgency: "low",
    nicheSubState: "researching", researchingDaysAgo: 4,
    synopsis: "Liquid-format liver. Ancestral crowd hates capsules; gap at premium." },
  { id: "N-203", code: "PN-Glow", name: "Glow Skin Drops", brand: "PN", type: "liquid",
    stage: "niche", owner: "malik", lastActivity: 6, urgency: "low",
    nicheSubState: "researching", researchingDaysAgo: 6,
    synopsis: "Liquid glutathione + vitamin C + collagen. Korean beauty halo." },

  // Idea inbox
  { id: "I-310", code: "DON-LymphTea", name: "Lymphatic Drainage Tea", brand: "DON", type: "tea",
    stage: "idea", owner: "malik", createdBy: "malik", lastActivity: 0.2,
    synopsis: "TikTok bloating-cure search up 280%. No premium tea brand owns this." },
  { id: "I-311", code: "PN-DreamMag", name: "Dream Mag Drink", brand: "PN", type: "powder",
    stage: "idea", owner: "malik", createdBy: "malik", lastActivity: 0.5,
    synopsis: "Sleep drink, not capsule. Magnesium L-threonate + glycinate + tart cherry." },
  { id: "I-312", code: "DON-BFastShake", name: "Beef Liver Breakfast Shake", brand: "DON", type: "powder",
    stage: "idea", owner: "malik", createdBy: "malik", lastActivity: 1.1,
    synopsis: "Beef liver + collagen + electrolytes. Carnivore-adjacent breakfast replacement." },

  // Production
  { id: "P-401", code: "PN-Lions", name: "Lion's Mane Focus", brand: "PN", type: "capsule",
    stage: "production", owner: "ronel", lastActivity: 2, urgency: "low",
    poStatus: "In transit", eta: 12 },
  { id: "P-402", code: "DON-SeaMoss", name: "Sea Moss Gel", brand: "DON", type: "powder",
    stage: "production", owner: "ronel", lastActivity: 5, urgency: "low",
    poStatus: "At customs", eta: 5 },
];

// Activity feed — last 24h
const M_ACTIVITY = [
  { id: 1, ts: 0.05, user: "joel",   productId: "A-150", type: "approval", text: "approved niche review" },
  { id: 2, ts: 0.2,  user: "esty",   productId: "B-301", type: "version",  text: "uploaded label v3" },
  { id: 3, ts: 0.4,  user: "ronel",  productId: "B-303", type: "alert",    text: "flagged vendor backorder" },
  { id: 4, ts: 0.8,  user: "malik",  productId: "I-310", type: "create",   text: "captured new idea" },
  { id: 5, ts: 1.0,  user: "april",  productId: "B-301", type: "version",  text: "drafted listing title" },
  { id: 6, ts: 1.4,  user: "malik",  productId: "N-201", type: "version",  text: "parsed niche doc v3" },
  { id: 7, ts: 1.8,  user: "ronel",  productId: "P-401", type: "stage",    text: "marked in transit" },
];

// Mock Slack mentions / comment threads waiting on Chesky
const M_MENTIONS = [
  { productId: "B-301", from: "esty", at: 0.3, text: "@chesky label v3 ready for your eyes — main change is brand mark scale on the front panel." },
  { productId: "B-303", from: "ronel", at: 0.5, text: "@chesky NutriSource pushed back 3wks. Want me to rfq Wuxi as backup?" },
  { productId: "A-150", from: "malik", at: 1.2, text: "@chesky niche doc parsed. Joel already approved. Recommend proceed." },
];

const RM = {
  TOKENS: M_TOKENS,
  PEOPLE,
  PRODUCTS: M_PRODUCTS,
  ACTIVITY: M_ACTIVITY,
  MENTIONS: M_MENTIONS,
  person(id) { return PEOPLE[id]; },
  ago(d) {
    if (d == null) return "—";
    if (d < 0.05) return "just now";
    if (d < 1) return Math.round(d * 24) + "h";
    if (d < 30) return Math.round(d) + "d";
    return Math.round(d / 30) + "mo";
  },
  brandColor(b) { return b === "DON" ? "#9C5226" : "#6C3DBE"; },
  brandBg(b)    { return b === "DON" ? "#F4ECE5" : "#EFEAF6"; },
  stageInfo(s) {
    return ({
      idea:       { label: "Idea",       color: "#787A85", bg: "#F1F1F4" },
      niche:      { label: "Niche",      color: "#B86A12", bg: "#FBF1E2" },
      approval:   { label: "Review",     color: "#1F66F5", bg: "#EAF1FE" },
      build:      { label: "Build",      color: "#0E8B4F", bg: "#E5F3EC" },
      production: { label: "Production", color: "#6C3DBE", bg: "#EFEAF6" },
    })[s] || { label: s, color: "#787A85", bg: "#F1F1F4" };
  },
};

window.RM = RM;
