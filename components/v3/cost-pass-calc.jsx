// ============================================================
// Cost-Pass calculator helpers — pure functions, no React.
// Two modes Ronel works in:
//
//  1. PER-ACTIVE (capsule, powder, sometimes liquid):
//     Each active has a dose (mg). Ronel enters EITHER:
//       a) $/kg of the raw ingredient → we derive $/bottle, OR
//       b) $/bottle directly (legacy / locked-in vendor quotes)
//
//  2. FLAT $/UNIT (gummy, softgel, patch, tea, BioCorp liquids):
//     Manufacturer supplies all ingredients and bills us a single
//     locked price per finished unit (bottle / bag / box). One field:
//     pricePerUnit. Optional MOQ note.
//
// Yield = wastage in encapsulation / packing. 95% capsule, 92% powder.
// We don't apply yield in flat mode because the mfg already priced it in.
// ============================================================

(function (W) {
  // Auto-derive default mode from product type. Liquids now use OUR raws
  // by default — BioCorp blends with ingredients we ship (no longer flat fee).
  // The "flat" mode is still toggleable for legacy / mfg-supplied liquid runs.
  const MODE_DEFAULTS = {
    capsule: "per-active",
    powder:  "per-active",
    liquid:  "per-active",   // we ship raws to BioCorp; flat mode is legacy
    gummy:   "flat",
    softgel: "flat",
    patch:   "flat",
    tea:     "flat",
    cream:   "flat",         // mfg always supplies for cream
  };

  // Yield (decimal) — % of raw ingredient that survives manufacturing.
  // The rest is in-process loss (encapsulation, blending, transfer).
  const YIELD = {
    capsule: 0.95,
    powder:  0.92,
    liquid:  0.97, // raw-ingredient liquid path; flat-mode liquid bypasses yield
  };

  // Whether Ronel can flip the mode toggle for this product.
  // Liquid is the only ambiguous case (sometimes raw, sometimes BioCorp flat).
  // Capsule + powder are always per-active. Gummies/softgels/etc. always flat.
  const MODE_TOGGLEABLE = {
    capsule: false,
    powder:  false,
    liquid:  true,
    gummy:   false,
    softgel: false,
    patch:   false,
    tea:     false,
    cream:   false,
  };

  // Parse a dose string like "600mg", "1g", "1500 mg", "200mcg" → mg as a Number.
  // Anything we can't parse returns null (the row will require manual $/bottle).
  function doseToMg(doseStr) {
    if (!doseStr) return null;
    const s = String(doseStr).toLowerCase().trim();
    const m = s.match(/^([\d.,]+)\s*(mcg|ug|µg|mg|g|kg)?/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(n)) return null;
    const unit = m[2] || "mg";
    if (unit === "mcg" || unit === "ug" || unit === "µg") return n / 1000;
    if (unit === "mg") return n;
    if (unit === "g")  return n * 1000;
    if (unit === "kg") return n * 1000 * 1000;
    return n;
  }

  // Servings per finished unit. Capsules: typically 30 (1cap/serving) or 60 (2cap).
  // We default to 30 if unspecified. Stored on costPass.assumptions.servings as
  // either a number ("30") or a phrase ("30/bottle") — be lenient.
  function servingsPerUnit(p) {
    const a = p?.costPass?.assumptions?.servings;
    if (typeof a === "number") return a;
    const m = String(a || "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 30;
  }

  // Core calc: $/bottle for a per-active row entered as $/kg.
  // doseInMg is per serving; servings × dose = total mg per bottle.
  // Convert to kg: ÷ 1,000,000. Multiply by $/kg. Divide by yield (waste).
  function costPerBottleFromKg({ doseStr, pricePerKg, servings, yieldDec }) {
    const mg = doseToMg(doseStr);
    if (mg == null || !isFinite(pricePerKg) || pricePerKg <= 0) return null;
    const totalMgPerBottle = mg * (servings || 30);
    const totalKg = totalMgPerBottle / 1000 / 1000;
    const raw = totalKg * pricePerKg;
    return raw / (yieldDec || 1);
  }

  // Resolve current mode for a product. Falls back to type default.
  function resolveMode(p) {
    if (p?.costPass?.mode) return p.costPass.mode;
    return MODE_DEFAULTS[p?.type] || "per-active";
  }

  // Yield for a product (used in per-active mode only).
  function resolveYield(p) {
    return YIELD[p?.type] || 1;
  }

  // Unit noun for the "$/X" label — bottle / bag / box / pouch.
  function unitNoun(p) {
    const t = p?.type;
    if (t === "powder") return "bag";
    if (t === "tea") return "box";
    if (t === "gummy") return "bottle";
    if (t === "softgel") return "bottle";
    if (t === "patch") return "box";
    if (t === "cream") return "tube";
    return "bottle";
  }

  // Recompute summary totals after any quote update. Pure: takes a costPass
  // shape, returns a new one with summary refreshed. Caller decides where to
  // assign it on the product.
  function recomputeSummary(cp) {
    if (!cp) return cp;
    const pkg = cp.summary?.packagingTotal || 0;
    // Encapsulating / tolling cost — bundles desiccant, shrinkband, and the
    // mfg's per-unit run charge. Optional. Defaults to 0 so legacy seed data
    // (where it's already baked into ingredientTotal) doesn't double-count.
    const encap = cp.summary?.encapsulatingCost || 0;
    if (cp.mode === "flat") {
      const flat = cp.flatPrice?.pricePerUnit;
      const allIn = (flat || 0) + pkg + encap;
      return {
        ...cp,
        summary: {
          ...(cp.summary || {}),
          packagingTotal: pkg,
          encapsulatingCost: encap,
          ingredientTotal: flat || null, // for flat mode, "ingredients" = mfg charge
          allInPerBottle: flat != null ? allIn : null,
          completePct: flat != null ? 100 : 0,
        },
      };
    }
    // per-active
    const ings = cp.ingredients || [];
    const quoted = ings.filter(i => i.status === "quoted" && i.costPerBottle != null);
    const ingTotal = quoted.reduce((s, i) => s + (i.costPerBottle || 0), 0);
    const allDone = ings.length > 0 && quoted.length === ings.length;
    return {
      ...cp,
      summary: {
        ...(cp.summary || {}),
        packagingTotal: pkg,
        encapsulatingCost: encap,
        ingredientTotal: allDone ? ingTotal : null,
        allInPerBottle: allDone ? ingTotal + pkg + encap : null,
        completePct: ings.length === 0 ? 0 : Math.round((quoted.length / ings.length) * 100),
      },
    };
  }

  W.CostPassCalc = {
    MODE_DEFAULTS, YIELD, MODE_TOGGLEABLE,
    doseToMg, servingsPerUnit, costPerBottleFromKg,
    resolveMode, resolveYield, unitNoun, recomputeSummary,
  };
})(window);
