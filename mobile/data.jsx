/* global React */
// Mobile shared atoms — schema unified with desktop (PIPELINE_DATA shape).
// Mobile data is a curated subset of desktop products + role-aware inbox builders.

// ─────────────────────────────────────────────────────────────
// Sharper color tokens — match the desktop refresh
// ─────────────────────────────────────────────────────────────
const M_TOKENS = {
  ink: "#0A0B14",
  ink2: "#3A3D4A",
  ink3: "#6F7180",
  ink4: "#B0B2BD",
  line: "#E4E5EA",
  line2: "#EFEFF3",
  bg: "#F9FAFC",
  bg2: "#F1F2F6",
  panel: "#FFFFFF",

  // Sharper accent — saturated indigo
  accent: "#1A4FE5",
  accentBg: "#E5EBFD",

  // Semantic — punchier
  ok: "#0A8A4A",
  okBg: "#E0F1E8",
  warn: "#C26410",
  warnBg: "#FAEBD7",
  err: "#D21F1F",
  errBg: "#FCE2E2",
  info: "#1567B8",
  infoBg: "#E0EDF8",

  // Brand colors — more confident
  brandDON: "#9B4D1A",
  brandPN:  "#5C2EBE",
};

// ─────────────────────────────────────────────────────────────
// People — extended to match desktop
// ─────────────────────────────────────────────────────────────
const PEOPLE = {
  chesky: { id: "chesky", name: "Chesky", initials: "CH", color: "#1A4FE5", role: "Overseer" },
  joel:   { id: "joel",   name: "Joel",   initials: "JO", color: "#0A8A4A", role: "Finance / Approvals" },
  malik:  { id: "malik",  name: "Malik",  initials: "ML", color: "#C26410", role: "Niche & Research" },
  ronel:  { id: "ronel",  name: "Ronel",  initials: "RO", color: "#5C2EBE", role: "Sourcing / Cost Pass" },
  esty:   { id: "esty",   name: "Esty",   initials: "ES", color: "#D21F1F", role: "Designer" },
  april:  { id: "april",  name: "April",  initials: "AP", color: "#0B7A8E", role: "Listings" },
  talha:  { id: "talha",  name: "Talha",  initials: "TA", color: "#876C0F", role: "Formulation" },
  paresh: { id: "paresh", name: "Paresh", initials: "PA", color: "#7A6A2D", role: "Main Image" },
  qaiser: { id: "qaiser", name: "Qaiser", initials: "QA", color: "#3D5A2D", role: "Gallery + A+" },
  pds:    { id: "pds",    name: "Claude PDS", initials: "PD", color: "#0F0F11", role: "AI · Wireframe" },
  opus:   { id: "opus",   name: "Opus 4.7",   initials: "OP", color: "#0F0F11", role: "AI · Doc parser" },
};

// ─────────────────────────────────────────────────────────────
// Curated mobile products — uses desktop schema fields
// (nicheSummary, costPass, niche.current, streams, rdGate, etc.)
// ─────────────────────────────────────────────────────────────
const M_PRODUCTS = [
  // ── IDEA INBOX (Malik's queue) ──────────────────────────
  { id: "I-310", code: "DON-LymphTea", name: "Lymphatic Drainage Tea", brand: "DON", type: "tea",
    stage: "idea", owner: "malik", createdBy: "malik", lastActivity: 0.2,
    synopsis: "TikTok bloating-cure search up 280%. No premium tea brand owns this." },
  { id: "I-311", code: "PN-DreamMag", name: "Dream Mag Drink", brand: "PN", type: "powder",
    stage: "idea", owner: "malik", createdBy: "malik", lastActivity: 0.5,
    synopsis: "Sleep drink, not capsule. Magnesium L-threonate + glycinate + tart cherry." },
  { id: "I-312", code: "DON-BFastShake", name: "Beef Liver Breakfast Shake", brand: "DON", type: "powder",
    stage: "idea", owner: "malik", createdBy: "malik", lastActivity: 1.1,
    synopsis: "Beef liver + collagen + electrolytes. Carnivore-adjacent breakfast replacement." },

  // ── NICHE ANALYSIS (Malik authoring) ────────────────────
  { id: "N-201", code: "PN-HairCalm", name: "Hair Growth + Calm Capsules", brand: "PN", type: "capsule",
    stage: "niche", owner: "malik", lastActivity: 1, urgency: "low",
    nicheSubState: "parsed", docUploadedDaysAgo: 1,
    synopsis: "Hair growth + adaptogenic calm — only stack pairing both stories.",
    nicheSummary: { tam: "$30.5M/mo", competitors: 12, gap: "Cortisol/hair mechanism uncontested. Calm-meets-clinical positioning.", verdict: "PROCEED" } },
  { id: "N-202", code: "DON-LiverDrops", name: "Beef Liver Drops", brand: "DON", type: "liquid",
    stage: "niche", owner: "malik", lastActivity: 3, urgency: "low",
    nicheSubState: "researching", researchingDaysAgo: 4,
    synopsis: "Liquid-format liver. Ancestral crowd hates capsules; gap at premium." },
  { id: "N-203", code: "PN-Glow", name: "Glow Skin Drops", brand: "PN", type: "liquid",
    stage: "niche", owner: "malik", lastActivity: 6, urgency: "low",
    nicheSubState: "researching", researchingDaysAgo: 6,
    synopsis: "Liquid glutathione + vitamin C + collagen. Korean beauty halo." },

  // ── COST PASS (Ronel's queue) ───────────────────────────
  { id: "C-101", code: "DON-AshwaSleep", name: "Ashwagandha Sleep Capsules", brand: "DON", type: "capsule",
    stage: "rd", formulationSubState: "cost-pass", owner: "ronel", waitingOn: "ronel", lastActivity: 0.5, urgency: "med",
    synopsis: "Niche review passed. Ronel is running the $/bottle pass before the manufacturer brief goes out.",
    nicheSummary: { tam: "$48M", competitors: 9, gap: "Liquid format in adrenal — most are capsules.", verdict: "PROCEED" },
    costPass: { status: "in-progress", runBy: "ronel", startedDaysAgo: 1,
      summary: { ingredientTotal: 2.41, packagingTotal: 0.62, allInPerBottle: 3.03, completePct: 71 } } },

  // ── APPROVAL / NICHE REVIEW (waiting on Chesky + Joel) ──
  { id: "A-150", code: "DON-MoringaMix", name: "Moringa + Soursop Greens", brand: "DON", type: "powder",
    stage: "approval", owner: "malik", waitingOn: "chesky", lastActivity: 4, urgency: "high",
    synopsis: "Premium greens drink. Niche analysis complete; recommend Proceed.",
    nicheSummary: { tam: "$340K/mo", competitors: 11, gap: "Premium positioning, $24 list, ~58% margin at MOQ.", verdict: "PROCEED" },
    costPass: { status: "done", runBy: "ronel", completedDaysAgo: 2,
      summary: { ingredientTotal: 4.10, packagingTotal: 0.85, allInPerBottle: 4.95, completePct: 100 } },
    approvals: { chesky: null, joel: { decision: "approve", at: 2, note: "Margin checks out at $24 list. Approve." } } },
  { id: "A-151", code: "PN-IronWoman", name: "Iron + Folate Drops (Women)", brand: "PN", type: "liquid",
    stage: "approval", owner: "malik", waitingOn: "chesky", lastActivity: 2, urgency: "high",
    synopsis: "Iron deficiency is mainstream now. Liquid format, low-nausea.",
    nicheSummary: { tam: "$520K/mo", competitors: 7, gap: "Strong DTC fit. $32 list, ~62% margin.", verdict: "PROCEED" },
    costPass: { status: "done", runBy: "ronel", completedDaysAgo: 1,
      summary: { ingredientTotal: 3.85, packagingTotal: 0.72, allInPerBottle: 4.57, completePct: 100 } },
    approvals: { chesky: null, joel: null } },

  // ── R&D (Talha / manufacturer sampling) ─────────────────
  { id: "R-201", code: "DON-CortisolCalm", name: "Cortisol Calm Drops", brand: "DON", type: "liquid",
    stage: "rd", owner: "talha", lastActivity: 1.5, urgency: "med",
    synopsis: "Approved. Sample iteration v2 in flight — taste needs work.",
    rdGate: { round: 2, status: "Sampling", lastNote: "Talha tweaking sweetener; v2 sample arriving Tue" } },

  // ── BUILD (4 parallel streams now: sourcing/design/listing/amazon) ─
  { id: "B-101", code: "PN-BiotinCollagen", name: "Biotin + Collagen Drops", brand: "PN", type: "liquid",
    stage: "build", owner: "chesky", lastActivity: 1, urgency: "med",
    nicheSummary: { tam: "$88M", competitors: 14, gap: "Liquid biotin+collagen — most are powders.", verdict: "PROCEED" },
    costPass: { status: "done", summary: { allInPerBottle: 4.18, completePct: 100 } },
    streams: {
      sourcing: { owner: "ronel", status: "Quoting",   pct: 71, lastNote: "5 of 7 ingredients quoted, awaiting Symrise sample" },
      design:   { owner: "esty",  status: "In review", pct: 70, lastNote: "Label v3 with Chesky for sign-off" },
      listing:  { owner: "april", status: "Drafting",  pct: 40, lastNote: "Title done, bullets WIP" },
      amazon:   { owner: "april", status: "Pending",   pct: 0,  lastNote: "Will check on Amazon-side after listing" },
    },
    blocker: { stream: "design", reason: "Label v3 awaiting your approval", days: 3 } },
  { id: "B-301", code: "DON-MagGly", name: "Magnesium Glycinate Sleep", brand: "DON", type: "capsule",
    stage: "build", owner: "joel", lastActivity: 1, urgency: "med",
    streams: {
      sourcing: { owner: "ronel", status: "Approved",  pct: 100, lastNote: "PO sent to NutriSource" },
      design:   { owner: "esty",  status: "In review", pct: 75,  lastNote: "Label v3, awaiting your sign-off" },
      listing:  { owner: "april", status: "Drafting",  pct: 40,  lastNote: "Title done, bullets WIP" },
      amazon:   { owner: "april", status: "Pending",   pct: 0,   lastNote: "" },
    },
    blocker: { stream: "design", reason: "Label v3 awaiting your approval", days: 3 } },
  { id: "B-303", code: "DON-AshwaNight", name: "Ashwagandha Night", brand: "DON", type: "capsule",
    stage: "build", owner: "joel", lastActivity: 9, urgency: "high",
    streams: {
      sourcing: { owner: "ronel", status: "Backorder", pct: 80, lastNote: "Vendor delay 3wks" },
      design:   { owner: "esty",  status: "Approved",  pct: 100, lastNote: "Final files locked" },
      listing:  { owner: "april", status: "Live",      pct: 100, lastNote: "ASIN B0CDXXX live" },
      amazon:   { owner: "april", status: "Approved",  pct: 100, lastNote: "Amazon allowed listing" },
    },
    blocker: { stream: "sourcing", reason: "Vendor backorder — need new sourcing", days: 9 } },

  // ── PRODUCTION ──────────────────────────────────────────
  { id: "P-401", code: "PN-Lions", name: "Lion's Mane Focus", brand: "PN", type: "capsule",
    stage: "production", owner: "ronel", lastActivity: 2, urgency: "low",
    poStatus: "In transit", eta: 12 },
  { id: "P-402", code: "DON-SeaMoss", name: "Sea Moss Gel", brand: "DON", type: "powder",
    stage: "production", owner: "ronel", lastActivity: 5, urgency: "low",
    poStatus: "At customs", eta: 5 },

  // ── HOLD ────────────────────────────────────────────────
  { id: "H-501", code: "PN-NMN", name: "NMN Anti-aging", brand: "PN", type: "capsule",
    stage: "hold", owner: "malik", lastActivity: 30, urgency: "low",
    holdReason: "FDA gray area on NMN — revisit in Q3",
    revisitInDays: 60,
    synopsis: "Promising but compliance risk. Re-evaluate in 2mo." },
];

// ─────────────────────────────────────────────────────────────
// Activity feed — last 24h
// ─────────────────────────────────────────────────────────────
const M_ACTIVITY = [
  { id: 1, ts: 0.05, user: "joel",   productId: "A-150", type: "approval", text: "approved niche review" },
  { id: 2, ts: 0.2,  user: "esty",   productId: "B-101", type: "version",  text: "uploaded label v3" },
  { id: 3, ts: 0.4,  user: "ronel",  productId: "B-303", type: "alert",    text: "flagged vendor backorder" },
  { id: 4, ts: 0.6,  user: "ronel",  productId: "C-101", type: "edit",     text: "logged 5 of 7 quotes for cost pass" },
  { id: 5, ts: 0.8,  user: "malik",  productId: "I-310", type: "create",   text: "captured new idea" },
  { id: 6, ts: 1.0,  user: "april",  productId: "B-101", type: "version",  text: "drafted listing title" },
  { id: 7, ts: 1.2,  user: "opus",   productId: "N-201", type: "system",   text: "parsed niche doc into 6 sections" },
  { id: 8, ts: 1.4,  user: "pds",    productId: "B-101", type: "system",   text: "drafted wireframe v1 from niche analysis" },
  { id: 9, ts: 1.8,  user: "ronel",  productId: "P-401", type: "stage",    text: "marked in transit" },
];

// ─────────────────────────────────────────────────────────────
// @-mentions waiting on Chesky
// ─────────────────────────────────────────────────────────────
const M_MENTIONS = [
  { productId: "B-101", from: "esty",  at: 0.3, text: "@chesky label v3 ready for your eyes — main change is brand mark scale on the front panel." },
  { productId: "B-303", from: "ronel", at: 0.5, text: "@chesky NutriSource pushed back 3wks. Want me to rfq Wuxi as backup?" },
  { productId: "A-150", from: "malik", at: 1.2, text: "@chesky niche doc parsed. Joel already approved. Recommend proceed." },
  { productId: "C-101", from: "ronel", at: 0.4, text: "@chesky cost pass at 71% — collagen vendor came in higher than thesis. Want to chat before the meeting?" },
];

// ─────────────────────────────────────────────────────────────
// Stage info — sharper, more confident colors
// ─────────────────────────────────────────────────────────────
const STAGE_INFO = {
  idea:       { label: "Idea",       color: "#6F7180", bg: "#EFEFF3" },
  niche:      { label: "Niche",      color: "#C26410", bg: "#FAEBD7" },
  approval:   { label: "Review",     color: "#1A4FE5", bg: "#E5EBFD" },
  rd:         { label: "Formulation", color: "#0B7A8E", bg: "#DCEEF2" },
  build:      { label: "Build",      color: "#0A8A4A", bg: "#E0F1E8" },
  production: { label: "Production", color: "#5C2EBE", bg: "#EBE5F8" },
  launched:   { label: "Live",       color: "#0A8A4A", bg: "#E0F1E8" },
  hold:       { label: "Hold",       color: "#876C0F", bg: "#F8EFD3" },
  archived:   { label: "Archived",   color: "#6F7180", bg: "#EFEFF3" },
  killed:     { label: "Killed",     color: "#D21F1F", bg: "#FCE2E2" },
};

// ─────────────────────────────────────────────────────────────
// Role-routed inbox builder — given currentUser, what's waiting?
// ─────────────────────────────────────────────────────────────
function buildInbox(currentUser, products = M_PRODUCTS) {
  const items = [];
  products.forEach(p => {
    // CHESKY / JOEL — niche reviews to approve
    if ((currentUser === "chesky" || currentUser === "joel") && p.stage === "approval") {
      const myDecision = p.approvals?.[currentUser];
      if (!myDecision) {
        items.push({
          id: "approve-" + p.id, productId: p.id, code: p.code, brand: p.brand,
          kind: "approval", priority: 1,
          title: "Niche review · " + p.name,
          preview: p.nicheSummary?.gap || p.synopsis,
          fromUser: p.owner, at: p.lastActivity,
          ctaLabel: "Decide →",
        });
      }
    }
    // RONEL — cost pass to run (Formulation sub-state, not a separate stage)
    if (currentUser === "ronel" && p.stage === "rd" && p.formulationSubState === "cost-pass") {
      items.push({
        id: "cost-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "cost-pass", priority: 1,
        title: "Cost pass · " + p.name,
        preview: `${p.costPass?.summary?.completePct || 0}% quoted · $${(p.costPass?.summary?.allInPerBottle || 0).toFixed(2)}/bottle so far`,
        fromUser: p.owner, at: p.lastActivity,
        ctaLabel: "Open quotes →",
      });
    }
    // RONEL — sourcing in build with backorders
    if (currentUser === "ronel" && p.stage === "build" && p.streams?.sourcing?.status === "Backorder") {
      items.push({
        id: "src-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "blocker", priority: 1,
        title: "Sourcing blocker · " + p.name,
        preview: p.streams.sourcing.lastNote,
        fromUser: "ronel", at: p.lastActivity,
        ctaLabel: "Re-quote →",
      });
    }
    // ESTY — wireframes / labels in design review
    if (currentUser === "esty" && p.stage === "build" && p.streams?.design?.status === "In review") {
      items.push({
        id: "des-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "design", priority: 2,
        title: "Design review · " + p.name,
        preview: p.streams.design.lastNote,
        fromUser: "esty", at: p.lastActivity,
        ctaLabel: "Open design →",
      });
    }
    // APRIL — listings drafting
    if (currentUser === "april" && p.stage === "build" && p.streams?.listing?.status === "Drafting") {
      items.push({
        id: "lst-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "listing", priority: 2,
        title: "Listing draft · " + p.name,
        preview: p.streams.listing.lastNote,
        fromUser: "april", at: p.lastActivity,
        ctaLabel: "Continue →",
      });
    }
    // MALIK — niche docs to author / aging ideas
    if (currentUser === "malik" && p.stage === "niche" && p.nicheSubState === "researching") {
      items.push({
        id: "niche-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "research", priority: 2,
        title: "Niche analysis · " + p.name,
        preview: `${p.researchingDaysAgo}d into research — upload doc when ready`,
        fromUser: "malik", at: p.lastActivity,
        ctaLabel: "Upload →",
      });
    }
    if (currentUser === "malik" && p.stage === "idea" && p.lastActivity >= 5) {
      items.push({
        id: "idea-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "idea-aged", priority: 3,
        title: "Triage idea · " + p.name,
        preview: p.synopsis,
        fromUser: "malik", at: p.lastActivity,
        ctaLabel: "Triage →",
      });
    }
  });
  // CHESKY — also gets @mentions
  if (currentUser === "chesky") {
    M_MENTIONS.forEach(m => {
      const p = products.find(x => x.id === m.productId);
      if (!p) return;
      items.push({
        id: "mention-" + p.id, productId: p.id, code: p.code, brand: p.brand,
        kind: "mention", priority: 2,
        title: "@chesky · " + p.name,
        preview: m.text.replace(/@chesky\s*/, ""),
        fromUser: m.from, at: m.at,
        ctaLabel: "Reply →",
      });
    });
  }
  return items.sort((a, b) => (a.priority - b.priority) || (a.at - b.at));
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
const RM = {
  TOKENS: M_TOKENS,
  PEOPLE,
  PRODUCTS: M_PRODUCTS,
  ACTIVITY: M_ACTIVITY,
  MENTIONS: M_MENTIONS,
  STAGE_INFO,
  buildInbox,
  person(id) { return PEOPLE[id]; },
  ago(d) {
    if (d == null) return "—";
    if (d < 0.05) return "just now";
    if (d < 1) return Math.round(d * 24) + "h";
    if (d < 30) return Math.round(d) + "d";
    return Math.round(d / 30) + "mo";
  },
  brandColor(b) { return b === "DON" ? M_TOKENS.brandDON : M_TOKENS.brandPN; },
  brandBg(b)    { return b === "DON" ? "#F4ECE5" : "#EFEAF6"; },
  stageInfo(s)  { return STAGE_INFO[s] || STAGE_INFO.archived; },
};

window.RM = RM;
