// ============================================================
// Run Order — the BATCH that points at a SpecSheet version.
//
// Spec sheet = the recipe (versioned, immutable per-version).
// Run order = "we're buying THIS many bottles of v6 right now".
//
// One product has one active run + a history of past runs.
// Run drives:
//   - Cost pass batch size (was hardcoded 5,000)
//   - Packaging tab line-item quantities (was hardcoded 5,000)
//   - MOQ shortfall flag (capsule total vs mfgNotes.moq)
//
// Constraints encoded:
//   FLOOR    = mfg MOQ (parsed from spec.mfgNotes.moq)
//   CEILING  = 3,500 bottles on first run (Malik's risk tolerance —
//              "even if a serving is 3 capsules I would not buy more
//              than 3,500 bottles on a first run")
//
// Suggested count = ceil(FLOOR / 100) * 100, capped at CEILING.
// If FLOOR > CEILING, we suggest CEILING and flag the MOQ shortfall.
// ============================================================

(function (W) {
  const FIRST_RUN_CEILING = 3500;

  // Parse "200,000 capsules" / "5,000 bottles" / "3,000 bags" → {count, unit}
  function parseMoq(moqStr) {
    if (!moqStr) return null;
    const s = String(moqStr).replace(/,/g, "").toLowerCase();
    const m = s.match(/(\d+(?:\.\d+)?)\s*(capsule|cap|bottle|bag|pouch|box|unit)s?\b/);
    if (!m) {
      // Bare number? assume bottles
      const n = s.match(/(\d+(?:\.\d+)?)/);
      return n ? { count: parseFloat(n[1]), unit: "bottle" } : null;
    }
    let unit = m[2];
    if (unit === "cap") unit = "capsule";
    if (unit === "pouch") unit = "bag";
    return { count: parseFloat(m[1]), unit };
  }

  // Parse "60ct" / "30 capsules" / "60" → integer caps-per-bottle
  function parseCapsCount(countStr) {
    if (!countStr) return null;
    const m = String(countStr).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  // Identify the "form factor" the spec sheet describes — capsule, powder bag, etc.
  function specForm(spec) {
    const id = spec?.identity || {};
    const fmt = (id.format || "").toLowerCase();
    if (fmt.includes("capsule") || fmt.includes("softgel") || id.capsuleSize) return "capsule";
    if (fmt.includes("powder") || fmt.includes("bag") || fmt.includes("pouch")) return "bag";
    if (fmt.includes("liquid") || fmt.includes("drop") || fmt.includes("tincture")) return "bottle";
    return "bottle";
  }

  // Given a spec sheet version, suggest a sensible run count.
  // Returns { bottles, derivedCount, derivedUnit, moq, ceiling, status, reason }
  //   status: "ok" | "moq-short" | "ceiling-cap"
  function suggestRunCount(spec) {
    if (!spec) return null;
    const form = specForm(spec);
    const moq = parseMoq(spec?.mfgNotes?.moq);
    const ceiling = FIRST_RUN_CEILING;
    const capsPerBottle = parseCapsCount(spec?.identity?.capsuleCount) || 60;

    // Convert MOQ floor → bottles
    let floorBottles = 0;
    if (moq) {
      if (moq.unit === "capsule" && form === "capsule") {
        floorBottles = Math.ceil(moq.count / capsPerBottle);
      } else {
        floorBottles = moq.count;
      }
    }

    // Round MOQ floor up to nearest 100 for tidy numbers
    const tidyFloor = Math.ceil(floorBottles / 100) * 100;

    // Suggest: max(floor, 0), capped at ceiling
    let suggested;
    let status;
    let reason;
    if (tidyFloor > ceiling) {
      suggested = ceiling;
      status = "moq-short";
      reason = `MOQ requires ${tidyFloor.toLocaleString()} bottles but first-run ceiling is ${ceiling.toLocaleString()}. Need to negotiate.`;
    } else if (tidyFloor > 0) {
      suggested = tidyFloor;
      status = "ok";
      reason = `Just clears MOQ (${moq.count.toLocaleString()} ${moq.unit}s).`;
    } else {
      suggested = Math.min(2000, ceiling);
      status = "ok";
      reason = `No MOQ specified — defaulting to ${suggested.toLocaleString()}.`;
    }

    return {
      bottles: suggested,
      capsPerBottle,
      derivedCount: form === "capsule" ? suggested * capsPerBottle : suggested,
      derivedUnit: form === "capsule" ? "capsules" : "bottles",
      moq,
      moqFloorBottles: floorBottles,
      ceiling,
      status,
      reason,
      form,
    };
  }

  // Re-check MOQ for a manually-set bottle count.
  function checkRun(spec, bottles) {
    const sug = suggestRunCount(spec);
    if (!sug || !bottles) return null;
    const derivedCount = sug.form === "capsule" ? bottles * sug.capsPerBottle : bottles;

    let status, reason;
    if (sug.moq) {
      const haveCount = sug.moq.unit === "capsule" ? derivedCount : bottles;
      if (haveCount < sug.moq.count) {
        status = "moq-short";
        const shortBy = sug.moq.count - haveCount;
        reason = `${shortBy.toLocaleString()} ${sug.moq.unit}${shortBy === 1 ? "" : "s"} short of MOQ.`;
      } else {
        const overPct = ((haveCount - sug.moq.count) / sug.moq.count) * 100;
        status = "ok";
        reason = `${overPct.toFixed(0)}% over MOQ (${sug.moq.count.toLocaleString()} ${sug.moq.unit}s).`;
      }
    } else {
      status = "ok";
      reason = "No MOQ specified.";
    }

    let ceilingFlag = null;
    if (bottles > sug.ceiling) {
      ceilingFlag = `Above first-run ceiling (${sug.ceiling.toLocaleString()}).`;
    } else if (bottles === sug.ceiling) {
      ceilingFlag = `At first-run ceiling.`;
    }

    return {
      bottles,
      capsPerBottle: sug.capsPerBottle,
      derivedCount,
      derivedUnit: sug.derivedUnit,
      moq: sug.moq,
      ceiling: sug.ceiling,
      status,
      reason,
      ceilingFlag,
      form: sug.form,
    };
  }

  W.RunOrder = {
    FIRST_RUN_CEILING,
    parseMoq,
    parseCapsCount,
    specForm,
    suggestRunCount,
    checkRun,
  };
})(window);
