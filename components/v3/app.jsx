/* global React, ReactDOM, RD2, PIPELINE_DATA */
const { useState: useSA, useMemo: useMA, useEffect: useEA } = React;

// Tiny global toast — call RD2.toast("Saved v3") from anywhere.
window.RD2 = Object.assign(window.RD2 || {}, {
  toast: (msg, kind) => window.dispatchEvent(new CustomEvent("rd2-toast", { detail: { msg, kind: kind || "info" } })),

  // Live mirror of the current user — set every render by AppV3.
  // Lets non-React helpers + utility components ask "can this user act?"
  // without having to thread `currentUser` through 8 layers of props.
  

  // Admin override — Joel and Chesky see/use every action, regardless of ownership.
  // Anyone else: only when they own the product OR the waiting-on flag points to them.
  ADMIN_USERS: ["joel", "chesky"],
  isAdmin(user) {
    const u = user || window.RD2.__currentUser;
    return window.RD2.ADMIN_USERS.includes(u);
  },
  // canAct(product, [user]) — should this user see action buttons on this product?
  canAct(product, user) {
    const u = user || window.RD2.__currentUser;
    if (!product) return false;
    if (window.RD2.isAdmin(u)) return true;
    if (product.owner === u) return true;
    if (product.waitingOn === u) return true;
    return false;
  },

  // can(action, product, [user]) — single source of truth for role-gated actions.
  // Returns boolean. Admins (chesky, joel) always pass. Add new gates here, not inline.
  //
  // Actions:
  //   "spec.edit"      — edit spec sheet inline (Malik or admin)
  //   "spec.lock"      — lock the PDS (Chesky or admin)
  //   "niche.edit"     — edit parsed Niche Analysis fields
  //                      (Malik any time the doc exists; Chesky once stage === "approval")
  //   "niche.send"     — send Niche brief to formulation (Malik or Chesky)
  //   "build.advance"  — advance Approval → Formulation → Build (Chesky only)
  //   "wf.viewLocked"  — see "your wireframe is locked, start designing" CTA (Esty)
  //   "amazon.edit"    — edit Amazon Check verdict (April, Malik, or admin)
  //   "product.delete" — destructive delete (admin only)
  //   "act"            — generic "can take any action on this product"
  //                      (admin OR owner OR waitingOn — same as canAct)
  can(action, product, user) {
    const u = user || window.RD2.__currentUser;
    const isAdmin = window.RD2.isAdmin(u);
    if (isAdmin && action !== "wf.viewLocked") return true;

    switch (action) {
      case "spec.edit":      return u === "malik";
      case "spec.lock":      return u === "chesky";
      case "niche.edit":
        // Malik edits during niche-research stage; Chesky also gets edit during approval review.
        if (!product) return false;
        if (product.stage === "niche") return u === "malik";
        if (product.stage === "approval") return u === "malik" || u === "chesky";
        return false;
      case "niche.send":     return u === "malik" || u === "chesky";
      case "build.advance":  return u === "chesky";
      case "wf.viewLocked":  return u === "esty";
      case "amazon.edit":    return ["april", "malik"].includes(u);
      case "product.delete": return false; // admin-only, handled above
      case "act":            return window.RD2.canAct(product, u);
      // Pass-through role gates (admin always passes via early return above)
      case "is.malik":       return u === "malik";
      case "is.chesky":      return u === "chesky";
      case "is.esty":        return u === "esty";
      default:
        if (typeof console !== "undefined") console.warn(`[RD2.can] unknown action: ${action}`);
        return false;
    }
  },
});

// ===== Additive migration =====
// Saved products may be missing fields the schema has since added. Merge each
// saved product onto its seed counterpart by id: saved values win for keys both
// have; seed fills in keys saved is missing. Plain objects deep-merge; arrays
// and primitives replace wholesale (saved is authoritative). Saved-only products
// (e.g. ones the user added) pass through; seed-only products are appended so
// fresh seed entries appear automatically.
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}
function deepMergeWithSeed(saved, seed) {
  if (!isPlainObject(seed) || !isPlainObject(saved)) return saved;
  const out = { ...seed };
  for (const k of Object.keys(saved)) {
    out[k] = isPlainObject(saved[k]) && isPlainObject(seed[k])
      ? deepMergeWithSeed(saved[k], seed[k])
      : saved[k];
  }
  return out;
}
function mergeProductsWithSeed(saved, seedList) {
  const seedById = new Map(seedList.map(s => [s.id, s]));
  return saved.map(s => {
    const seed = seedById.get(s.id);
    return seed ? deepMergeWithSeed(s, seed) : s;
  });
  // Note: we deliberately do NOT append seed-only products. If the user has
  // deleted a product, resurrecting it on next load would be a worse bug than
  // a new seed product missing until they wipe data.
}

// One-shot in-place backfill — recompute kgNeeded for any persisted BOM row
// that looks suspect (zero, NaN, or absurdly large), pulling dose from the
// matching spec-sheet ingredient. Mutates products in place.
//
// Why this exists: an earlier build used naive parseFloat on dose strings,
// which dropped units. "1500 mcg" became 1500 mg — micronutrients sourced at
// 1000× the real number, producing 37M kg quotes for B-vitamins. The fix
// landed in bomFromSpec/gramsForBatch, but rows already materialized in
// p.bom had the bad value frozen. This heals them on load.
function backfillBomKgNeeded(products) {
  const calc = window.CostPassCalc;
  if (!calc?.doseToMg) return; // helper not loaded yet — no-op, will run next time
  for (const p of products) {
    if (!Array.isArray(p.bom) || p.bom.length === 0) continue;
    const ss = p.specSheetV2;
    const latest = ss?.versions?.length
      ? (ss.versions.find(v => v.v === ss.currentVersion) || ss.versions[ss.versions.length - 1])
      : null;
    const doseByName = new Map();
    (latest?.formula?.sections || []).forEach(sec => {
      (sec.rows || []).forEach(r => {
        if (r?.name) doseByName.set(r.name.toLowerCase().trim(), r.dose);
      });
    });
    const srv = calc.servingsPerUnit?.(p) || 30;
    const yieldDec = calc.resolveYield?.(p) || 1;
    const batchRaw = p.costPass?.assumptions?.batch;
    const batch = typeof batchRaw === "number"
      ? batchRaw
      : (() => {
          const m = String(batchRaw || "5000").match(/[\d,]+/);
          return m ? (parseFloat(m[0].replace(/,/g, "")) || 5000) : 5000;
        })();
    p.bom = p.bom.map(row => {
      const dose = row.dose || doseByName.get(String(row.ingredient || "").toLowerCase().trim());
      if (!dose) return row;
      const mg = calc.doseToMg(dose);
      if (mg == null || mg <= 0) return row;
      const correctKg = (mg * srv * batch) / 1e6 / yieldDec;
      const stored = Number(row.kgNeeded) || 0;
      // Heal if stored is missing, zero, or off by >5% from the correct number.
      const off = stored === 0 ? Infinity : Math.abs(stored - correctKg) / correctKg;
      if (off > 0.05) {
        return { ...row, kgNeeded: +correctKg.toFixed(2), dose };
      }
      return row;
    });
  }
}

function ToastHost() {
  const [toasts, setToasts] = useSA([]);
  useEA(() => {
    const onToast = (e) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts(t => [...t, { id, msg: e.detail.msg, kind: e.detail.kind }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
    };
    window.addEventListener("rd2-toast", onToast);
    return () => window.removeEventListener("rd2-toast", onToast);
  }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10000, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.kind === "ok" ? "var(--ok)" : t.kind === "warn" ? "var(--warn)" : "var(--ink-1)",
          color: "white", fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)", letterSpacing: "-0.005em",
          animation: "rd2-toast-in 180ms ease-out",
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

function AppV3() {
  const [view, setView] = useSA("home");
  const [openId, setOpenId] = useSA(null);
  const [openFocus, setOpenFocus] = useSA(null);
  const [showNew, setShowNew] = useSA(false);
  const [rejectingId, setRejectingId] = useSA(null);
  const [activePerson, setActivePerson] = useSA(null);
  const [selectedTypes, setSelectedTypes] = useSA(() => {
    try {
      const saved = localStorage.getItem("rd-typeFilter");
      if (!saved) return null;
      const arr = JSON.parse(saved);
      return Array.isArray(arr) && arr.length ? new Set(arr) : null;
    } catch (e) { return null; }
  });
  useEA(() => {
    try {
      if (!selectedTypes || selectedTypes.size === 0) localStorage.removeItem("rd-typeFilter");
      else localStorage.setItem("rd-typeFilter", JSON.stringify([...selectedTypes]));
    } catch (e) {}
  }, [selectedTypes]);
  const [currentUser, setCurrentUser] = useSA(() => {
    try { return localStorage.getItem("rd-currentUser") || "chesky"; } catch (e) { return "chesky"; }
  });
  const switchUser = (id) => {
    setCurrentUser(id);
    try { localStorage.setItem("rd-currentUser", id); } catch (e) {}
    window.RD2.__currentUser = id;
    setView("home");
    setActivePerson(null);
  };
  const [products, setProducts] = useSA(() => {
    try {
      // Cache key bumped: h9 → h10 (HC247 wipe + H303 reset to fresh idea).
      // Clean up old keys to avoid orphaned state.
      try {
        localStorage.removeItem("rd-products-h9");
        localStorage.removeItem("rd-products-h8");
      } catch (e) {}
      const saved = localStorage.getItem("rd-products-h10");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Additive migration: merge each saved product onto its seed counterpart so
          // fields added to the schema after the user's last visit appear with default
          // values. Saved data wins; seed only fills gaps.
          const migrated = mergeProductsWithSeed(parsed, PIPELINE_DATA.PRODUCTS);
          // One-shot kgNeeded backfill — earlier builds wrote raw mg-stripped
          // numbers into BOM rows, producing absurd quantities (37M kg of milk
          // thistle) for any micronutrient (mcg/IU). Re-derive from spec when we
          // can, so existing carts get healed without a manual reset.
          backfillBomKgNeeded(migrated);
          // Sync into the global PIPELINE_DATA so other modules see the restored state
          PIPELINE_DATA.PRODUCTS.length = 0;
          PIPELINE_DATA.PRODUCTS.push(...migrated);
          return migrated;
        }
      }
    } catch (e) {}
    return PIPELINE_DATA.PRODUCTS;
  });

  // Persist on every change
  useEA(() => {
    try { localStorage.setItem("rd-products-h10", JSON.stringify(products)); } catch (e) {}
  }, [products]);

  // Mirror currentUser into RD2 namespace so non-prop-threaded helpers (RD2.canAct, RD2.isAdmin) stay in sync.
  useEA(() => { window.RD2.__currentUser = currentUser; }, [currentUser]);

  const openProduct = (id, focus = null) => { setOpenId(id); setOpenFocus(focus); };

  const upd = (id, fn) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? fn(p) : p);
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };
  const promote  = (id) => upd(id, p => ({ ...p, stage: "niche", nicheSubState: "researching", researchingDaysAgo: 0, lastActivity: 0, stageAge: 0 }));
  const reject   = (id) => setRejectingId(id);
  const deleteProduct = (id) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };
  const confirmReject = (id, { category, reason }) => upd(id, p => ({
    ...p, stage: "killed", lastActivity: 0, stageAge: 0,
    rejection: { category, reason, by: "chesky", daysAgo: 0 }
  }));
  const uploadNiche = (id, { url, parsed }) => upd(id, p => {
    // Real flow: `parsed` is the JSON Claude produced from the doc text + image
    // vision in NicheUploadModal. We trust the model output and persist it
    // verbatim — the Niche tab shows it and lets Malik/Chesky edit any field
    // before niche review locks it.
    const next = parsed || p.niche?.current || null;
    return {
      ...p, nicheSubState: "parsed", docUrl: url, docUploadedDaysAgo: 0, lastActivity: 0,
      niche: {
        ...(p.niche || { versions: [] }),
        docUrl: url,
        parsedDaysAgo: 0,
        current: next,
      }
    };
  });
  // Inline edit persistence — called from NicheDoc when a user edits any field.
  // Receives a (mutated) full niche.current object; we just swap it in.
  const updateNiche = (id, nextCurrent) => upd(id, p => ({
    ...p,
    niche: { ...(p.niche || { versions: [] }), current: nextCurrent }
  }));
  const decide = (id, who, decision, note) => {
    if (who === "__submitForReview") {
      // Niche → Niche Review (cost pass moved into Formulation, no longer a stage).
      upd(id, p => ({
        ...p,
        stage: "approval",
        waitingOn: "chesky",
        approvals: { chesky: null, joel: null },
        lastActivity: 0,
        stageAge: 0,
        sentBack: null, // clear any prior bounce
      }));
      return;
    }
    if (who === "__sendBackStage") {
      // Generic demote: move product to an earlier stage. note.toStage = target.
      // note.reason = optional explanation. Stamps a sentBack banner so the
      // recipient knows it bounced and why.
      const STAGE_ORDER = ["idea", "niche", "approval", "rd", "build", "production", "launched"];
      upd(id, p => {
        const toStage = note?.toStage;
        if (!toStage) return p;
        const fromIdx = STAGE_ORDER.indexOf(p.stage);
        const toIdx = STAGE_ORDER.indexOf(toStage);
        if (toIdx < 0 || toIdx >= fromIdx) return p; // only backwards
        // Reset stage-specific state when bouncing back
        const reset = { ...p, stage: toStage, lastActivity: 0, stageAge: 0,
          waitingOn: toStage === "niche" ? "malik" : null,
          sentBack: { by: currentUser, fromStage: p.stage, reason: String(note?.reason || "").trim() || "(no reason given)", daysAgo: 0 },
        };
        // Wipe forward-stage state so re-promote starts clean
        if (toStage === "niche" || toStage === "approval") reset.approvals = { chesky: null, joel: null };
        if (toStage === "niche") reset.costPass = null;
        if (toIdx <= STAGE_ORDER.indexOf("approval")) reset.rdGate = null;
        if (toIdx <= STAGE_ORDER.indexOf("rd")) reset.streams = null;
        return reset;
      });
      return;
    }
    if (who === "__sendBackToNiche") {
      // Joel or Chesky bounces back from Niche Review. Wipe cost pass entirely
      // (formula may change) and stamp a banner with who/why so Malik sees it
      // when the dossier opens.
      upd(id, p => ({
        ...p,
        stage: "niche",
        waitingOn: "malik",
        lastActivity: 0,
        stageAge: 0,
        approvals: { chesky: null, joel: null },
        costPass: null,
        sentBack: {
          by: currentUser,
          reason: String(note || "").trim() || "(no reason given)",
          daysAgo: 0,
        }
      }));
      return;
    }
    if (who === "__costPassComplete") {
      // Joel finished cost pass against the locked PDS. Mark done; mfg engagement
      // is now unblocked. Stay in "kickoff" — Chesky picks up to send the brief.
      upd(id, p => ({
        ...p,
        formulationSubState: "kickoff",
        waitingOn: "chesky",
        lastActivity: 0,
        costPass: { ...(p.costPass || {}), status: "done", completedDaysAgo: 0, runBy: "joel" }
      }));
      return;
    }
    if (who === "__costPassAddQuote") {
      // Ronel adds a quote to an ingredient's quote list.
      // decision = ingredient name, note = JSON quote object.
      upd(id, p => {
        const q = JSON.parse(note);
        const ings = (p.costPass?.ingredients || []).map(i => {
          if (i.name !== decision) return i;
          const quotes = [...(i.quotes || []), q];
          // Auto-pick if first quote on this ingredient
          const isFirst = quotes.length === 1;
          if (isFirst) {
            const cpb = window.CostPassCalc.costPerBottleFromKg({
              doseStr: i.dose,
              pricePerKg: q.pricePerKg,
              servings: window.CostPassCalc.servingsPerUnit(p),
              yieldDec: window.CostPassCalc.resolveYield(p),
            });
            return { ...i, quotes, pickedQuoteId: q.id, status: "quoted", inputMode: "kg", pricePerKg: q.pricePerKg, supplier: q.vendor, costPerBottle: cpb };
          }
          return { ...i, quotes };
        });
        const cpNext = window.CostPassCalc.recomputeSummary({ ...p.costPass, ingredients: ings });
        return { ...p, lastActivity: 0, costPass: cpNext };
      });
      return;
    }
    if (who === "__costPassPickQuote") {
      // Pick a winning quote for an ingredient — drives the cost math.
      // decision = ingredient name, note = quote id.
      upd(id, p => {
        const ings = (p.costPass?.ingredients || []).map(i => {
          if (i.name !== decision) return i;
          const q = (i.quotes || []).find(x => x.id === note);
          if (!q) return i;
          const cpb = window.CostPassCalc.costPerBottleFromKg({
            doseStr: i.dose,
            pricePerKg: q.pricePerKg,
            servings: window.CostPassCalc.servingsPerUnit(p),
            yieldDec: window.CostPassCalc.resolveYield(p),
          });
          return { ...i, pickedQuoteId: q.id, status: "quoted", inputMode: "kg", pricePerKg: q.pricePerKg, supplier: q.vendor, costPerBottle: cpb };
        });
        const cpNext = window.CostPassCalc.recomputeSummary({ ...p.costPass, ingredients: ings });
        return { ...p, lastActivity: 0, costPass: cpNext };
      });
      return;
    }
    if (who === "__costPassRemoveQuote") {
      // Remove a quote. decision = ingredient name, note = quote id.
      upd(id, p => {
        const ings = (p.costPass?.ingredients || []).map(i => {
          if (i.name !== decision) return i;
          const quotes = (i.quotes || []).filter(q => q.id !== note);
          // If we just removed the picked one, clear and unpick
          if (i.pickedQuoteId === note) {
            // Auto-pick next quote (if any) so the row stays priced
            if (quotes.length > 0) {
              const q = quotes[0];
              const cpb = window.CostPassCalc.costPerBottleFromKg({
                doseStr: i.dose,
                pricePerKg: q.pricePerKg,
                servings: window.CostPassCalc.servingsPerUnit(p),
                yieldDec: window.CostPassCalc.resolveYield(p),
              });
              return { ...i, quotes, pickedQuoteId: q.id, status: "quoted", inputMode: "kg", pricePerKg: q.pricePerKg, supplier: q.vendor, costPerBottle: cpb };
            }
            return { ...i, quotes, pickedQuoteId: null, status: "open", supplier: null, pricePerKg: null, costPerBottle: null };
          }
          return { ...i, quotes };
        });
        const cpNext = window.CostPassCalc.recomputeSummary({ ...p.costPass, ingredients: ings });
        return { ...p, lastActivity: 0, costPass: cpNext };
      });
      return;
    }
    if (who === "__costPassQuote") {
      // note format depends on input mode:
      //   "bottle"   — note = "price|supplier"           (legacy: $/bottle directly)
      //   "kg"       — note = "kg|pricePerKg|supplier"   ($/kg → derive $/bottle via dose+yield)
      upd(id, p => {
        const parts = String(note || "").split("|");
        const ings = (p.costPass?.ingredients || []).map(i => {
          if (i.name !== decision) return i;
          if (parts[0] === "kg") {
            // $/kg path — compute via shared helper.
            const pricePerKg = parseFloat(parts[1]);
            const supplier = parts[2] || i.supplier || null;
            const cpb = window.CostPassCalc.costPerBottleFromKg({
              doseStr: i.dose,
              pricePerKg,
              servings: window.CostPassCalc.servingsPerUnit(p),
              yieldDec: window.CostPassCalc.resolveYield(p),
            });
            return { ...i, status: "quoted", inputMode: "kg", pricePerKg, costPerBottle: cpb, supplier };
          }
          // legacy "bottle" path
          const price = parseFloat(parts[0]);
          const supplier = parts[1] || i.supplier || null;
          return { ...i, status: "quoted", inputMode: "bottle", costPerBottle: price, supplier };
        });
        const cpNext = window.CostPassCalc.recomputeSummary({ ...p.costPass, ingredients: ings });
        return { ...p, lastActivity: 0, costPass: cpNext };
      });
      return;
    }
    if (who === "__costPassAssumption") {
      // Edit a "held constant" value on the cost-pass card.
      // decision = key (e.g. "batch"), note = new value (string).
      upd(id, p => {
        const cp = p.costPass || { assumptions: {} };
        const nextAssumptions = { ...(cp.assumptions || {}), [decision]: note };
        const cpNext = window.CostPassCalc.recomputeSummary({ ...cp, assumptions: nextAssumptions });
        return { ...p, costPass: cpNext, lastActivity: 0 };
      });
      return;
    }
    if (who === "__costPassSetMode") {
      // Flip per-active ↔ flat (only legal for liquids in our setup).
      // decision = "per-active" | "flat". Reset the other mode's data so the
      // summary doesn't show stale numbers.
      upd(id, p => {
        const cp = p.costPass || {};
        const next = { ...cp, mode: decision };
        if (decision === "flat") {
          next.flatPrice = cp.flatPrice || { pricePerUnit: null, supplier: null, moqNote: "" };
        } else {
          next.flatPrice = null;
        }
        return { ...p, costPass: window.CostPassCalc.recomputeSummary(next), lastActivity: 0 };
      });
      return;
    }
    if (who === "__costPassFlat") {
      // Flat $/unit quote (BioCorp etc). note = "price|supplier|moq"
      upd(id, p => {
        const [priceStr, supplier, moq] = String(note || "").split("|");
        const price = parseFloat(priceStr);
        const cp = p.costPass || {};
        const next = {
          ...cp,
          mode: "flat",
          flatPrice: {
            pricePerUnit: isFinite(price) ? price : null,
            supplier: supplier || null,
            moqNote: moq || "",
            quotedDaysAgo: 0,
          },
        };
        return { ...p, costPass: window.CostPassCalc.recomputeSummary(next), lastActivity: 0 };
      });
      return;
    }
    if (who === "__costPassEncap") {
      // Encapsulating / tolling cost. note = price string (or "" to clear).
      upd(id, p => {
        const v = parseFloat(String(note || ""));
        const cp = p.costPass || {};
        const next = {
          ...cp,
          summary: {
            ...(cp.summary || {}),
            encapsulatingCost: isFinite(v) && v >= 0 ? v : 0,
          },
        };
        return { ...p, costPass: window.CostPassCalc.recomputeSummary(next), lastActivity: 0 };
      });
      return;
    }
    if (who === "__costPassAiExtract") {
      // AI invoice/quote extract — note = JSON array of {name, dose, pricePerKg, supplier}
      // Matches by ingredient name (case-insensitive); creates new rows for unknowns.
      upd(id, p => {
        let extracted;
        try { extracted = JSON.parse(note); } catch (e) { return p; }
        if (!Array.isArray(extracted)) return p;
        const servings = window.CostPassCalc.servingsPerUnit(p);
        const yieldDec = window.CostPassCalc.resolveYield(p);
        const existing = p.costPass?.ingredients || [];
        const byName = new Map(existing.map(i => [i.name.toLowerCase().trim(), i]));
        for (const row of extracted) {
          const key = String(row.name || "").toLowerCase().trim();
          if (!key) continue;
          const dose = byName.get(key)?.dose || row.dose || "";
          const cpb = window.CostPassCalc.costPerBottleFromKg({
            doseStr: dose, pricePerKg: parseFloat(row.pricePerKg), servings, yieldDec,
          });
          if (byName.has(key)) {
            byName.set(key, { ...byName.get(key), status: "quoted", inputMode: "kg",
              pricePerKg: parseFloat(row.pricePerKg), supplier: row.supplier || byName.get(key).supplier,
              costPerBottle: cpb });
          } else {
            byName.set(key, { name: row.name, dose, status: "quoted", inputMode: "kg",
              pricePerKg: parseFloat(row.pricePerKg), supplier: row.supplier || null,
              costPerBottle: cpb });
          }
        }
        const ings = Array.from(byName.values());
        const cpNext = window.CostPassCalc.recomputeSummary({ ...p.costPass, ingredients: ings });
        return { ...p, lastActivity: 0, costPass: cpNext };
      });
      return;
    }
    if (who === "__costPassRequote") {
      // POST-completion re-quote (e.g. Ronel found a better source). Logs history + flags margin recalc.
      // decision = ingredient name, note = "price|supplier" (pipe-separated).
      upd(id, p => {
        const oldIngs = p.costPass?.ingredients || [];
        const oldIng = oldIngs.find(i => i.name === decision);
        const oldPrice = oldIng?.costPerBottle || 0;
        const oldSupplier = oldIng?.supplier || null;
        const [priceStr, supplier] = String(note || "").split("|");
        const newPrice = parseFloat(priceStr);
        const newSupplier = supplier || oldSupplier;
        const oldAllIn = p.costPass?.summary?.allInPerBottle || 0;
        const ings = oldIngs.map(i =>
          i.name === decision ? { ...i, costPerBottle: newPrice, supplier: newSupplier } : i
        );
        const ingTotal = ings.reduce((s, i) => s + (i.costPerBottle || 0), 0);
        const pkg = p.costPass?.summary?.packagingTotal || 0;
        const newAllIn = ingTotal + pkg;
        const history = p.costPass?.history || [];
        return {
          ...p, lastActivity: 0,
          costPass: {
            ...p.costPass,
            ingredients: ings,
            basisUpdated: { daysAgo: 0, by: currentUser, oldAllIn, newAllIn, marginRecalcPending: true },
            history: [
              ...history,
              { ingredient: decision, oldPrice, newPrice, oldSupplier, newSupplier, by: currentUser, daysAgo: 0, oldAllIn, newAllIn }
            ],
            summary: {
              ...(p.costPass?.summary || {}),
              ingredientTotal: ingTotal,
              allInPerBottle: newAllIn,
            }
          }
        };
      });
      return;
    }
    if (who === "__rdAdvanceToBuild") {
      // Formulation → Build transition.
      // Normal path: gate on rdGate.status === "approved" + spec exists + cost pass complete.
      // Override path: decision === "override" + note = audit reason. Admin can bypass any
      // of the three gates; the reason is appended to ACTIVITY for traceability.
      // Role gate — only Chesky (or Joel as admin override) can advance.
      if (!RD2.can("build.advance", p, currentUser)) {
        RD2.toast("Only Chesky can advance to Build", "warn");
        return;
      }
      const isOverride = decision === "override";
      const overrideReason = isOverride ? String(note || "(no reason given)") : null;
      upd(id, p => {
        if (!isOverride) {
          // Sample approval is NOT a Build gate anymore — sampling becomes a parallel
          // stream inside Build. Spec + cost pass are the only hard requirements.
          if (!p.specSheet && !p.specSheetV2) {
            RD2.toast("Cannot advance — no spec sheet attached", "warn");
            return p;
          }
          const cp = p.costPass;
          if (cp && cp.ingredients?.length > 0) {
            const unquoted = cp.ingredients.filter(i => i.status !== "quoted").length;
            if (unquoted > 0) {
              RD2.toast(`Cannot advance — ${unquoted} ingredient${unquoted === 1 ? "" : "s"} still need quotes`, "warn");
              return p;
            }
          } else if (!cp || !cp.flatPrice?.pricePerUnit) {
            RD2.toast("Cannot advance — cost pass not yet run", "warn");
            return p;
          }
        }
        // Lock the spec on the way out (if not already)
        const ss = p.specSheetV2 || p.specSheet;
        const lockedSpec = ss && !ss.lockedAt
          ? (p.specSheetV2 ? { ...p.specSheetV2, lockedAt: 0, lockedBy: currentUser } : null)
          : null;
        const update = {
          ...p,
          stage: "build",
          waitingOn: null,
          lastActivity: 0, stageAge: 0,
          formulationSubState: null,
          // Seed parallel streams. If they already exist (re-entry), keep them.
          // Sampling now runs IN PARALLEL with the other streams — Mimi/Connor confirming
          // capsule fit + shipping a physical sample. Sample approval is a Production gate
          // (blocks ordering the full batch), not a Build-stage gate. Design/Listing/Amazon
          // can all progress while sampling is in flight.
          streams: p.streams || {
            sampling: { owner: "ronel", status: "in-progress", versions: [], lastNote: "Sample-size ingredients shipping → mfg confirms capsule fit" },
            sourcing: { owner: "ronel", status: "in-progress", versions: [] },
            design:   { owner: "esty",  status: "in-progress", versions: [] },
            label:    { owner: "esty",  status: "not-started", versions: [] },
            box:      { owner: "esty",  status: "not-started", versions: [] },
            insert:   { owner: "esty",  status: "not-started", versions: [] },
            listing:  { owner: "april", status: "not-started", versions: [] },
            amazon:   { owner: "lina",  status: "not-started", versions: [] },
          },
        };
        if (lockedSpec) update.specSheetV2 = lockedSpec;
        if (isOverride) {
          // Persist the override audit entry on the product so it shows up in
          // dossier/activity views even after reload.
          update.advanceOverride = {
            by: currentUser, at: 0, reason: overrideReason,
            // Snapshot what was missing at time of override (sampling no longer in this list)
            missing: [
              !(p.specSheet || p.specSheetV2) ? "spec" : null,
              (() => {
                const cp = p.costPass;
                if (cp?.ingredients?.length > 0) {
                  const u = cp.ingredients.filter(i => i.status !== "quoted").length;
                  return u > 0 ? `cost-pass(${u} unquoted)` : null;
                }
                return (!cp || !cp.flatPrice?.pricePerUnit) ? "cost-pass" : null;
              })(),
            ].filter(Boolean),
          };
        }
        return update;
      });
      RD2.toast(
        isOverride
          ? `⚡ Override: advanced to Build (${overrideReason})`
          : "Spec locked → advanced to Build. Sourcing, Design, Listing kicked off.",
        isOverride ? "warn" : "ok"
      );
      return;
    }
    if (who === "__sourcingAddQuote") {
      // Append a new quote to a BOM or packaging line.
      // decision = "bom:<code>" or "pkg:<code>", note = quote object (already shaped)
      //
      // BOM materialization: if the user is on a derived BOM (spec-sheet-only),
      // materialize before adding so the quote actually persists.
      upd(id, p => {
        const [kind, code] = String(decision || "").split(":");
        let arr;
        if (kind === "bom") {
          arr = (p.bom && p.bom.length > 0)
            ? p.bom
            : (window.__bomFromSpec ? (window.__bomFromSpec(p) || []) : []);
        } else {
          arr = p.packaging || [];
        }
        const next = arr.map(b => {
          if (b.code !== code) return b;
          return { ...b, quotes: [...(b.quotes || []), note] };
        });
        return kind === "bom"
          ? { ...p, bom: next, lastActivity: 0 }
          : { ...p, packaging: next, lastActivity: 0 };
      });
      return;
    }
    if (who === "__sourcingPickQuote") {
      // Pick a vendor for a BOM/packaging line and lock it.
      // decision = "bom:<code>" or "pkg:<code>", note = vendor name
      //
      // BOM materialization: if Sourcing & Sample is showing a *derived* BOM
      // (pulled from the spec sheet because p.bom doesn't exist yet), the first
      // pick has to materialize that derived list into p.bom so subsequent picks
      // and the Production tab's PO ladder both read from the same source.
      upd(id, p => {
        const [kind, code] = String(decision || "").split(":");
        let arr;
        if (kind === "bom") {
          arr = (p.bom && p.bom.length > 0)
            ? p.bom
            : (window.__bomFromSpec ? (window.__bomFromSpec(p) || []) : []);
        } else {
          arr = p.packaging || [];
        }
        const next = arr.map(b => {
          if (b.code !== code) return b;
          return { ...b, picked: note, status: "Locked", lockedDaysAgo: 0 };
        });
        return kind === "bom"
          ? { ...p, bom: next, lastActivity: 0 }
          : { ...p, packaging: next, lastActivity: 0 };
      });
      return;
    }
    if (who === "__sourcingMarkOrdered") {
      // Toggle ordered state on a packaging line.
      // decision = "pkg:<code>", note = boolean (true to mark ordered, false to unmark)
      upd(id, p => {
        const [, code] = String(decision || "").split(":");
        const next = (p.packaging || []).map(b => {
          if (b.code !== code) return b;
          return note
            ? { ...b, ordered: true, orderedDaysAgo: 0 }
            : { ...b, ordered: false, orderedDaysAgo: null };
        });
        return { ...p, packaging: next, lastActivity: 0 };
      });
      return;
    }
    if (who === "__costPassNotifyMargin") {
      // Clears the "margin recalc pending" flag (Joel acknowledged).
      upd(id, p => ({
        ...p, lastActivity: 0,
        costPass: { ...p.costPass, basisUpdated: { ...(p.costPass?.basisUpdated || {}), marginRecalcPending: false, notifiedDaysAgo: 0 } }
      }));
      return;
    }
    if (who === "__wireframeGenerate") {
      // Malik clicks "Generate with Claude PDS" — simulate PDS dropping v1.
      // Lands in pending-malik-review so Malik reviews → submits to Chesky → approves.
      // If this is a regen after Chesky's send-back, stamp the trigger notes onto
      // the new version so version history preserves "v2 was generated because…"
      upd(id, p => {
        const versions = p.wireframe?.versions || [];
        const nextV = versions.length + 1;
        const isRegen = nextV > 1 && p.wireframe?.changeNotes;
        const newV = {
          v: nextV, by: "pds", daysAgo: 0,
          filename: `${p.code}-WFM-v${nextV}.html`,
          note: isRegen ? `Regenerated by Claude PDS addressing Chesky's notes.` : "Generated by Claude PDS from spec sheet + niche brief.",
          ...(isRegen ? { triggerNotes: p.wireframe.changeNotes } : {}),
        };
        return {
          ...p,
          lastActivity: 0,
          wireframe: {
            ...(p.wireframe || {}),
            status: "pending-malik-review",
            currentVersion: nextV,
            versions: [...versions, newV],
            generatedDaysAgo: 0,
            // Clear changeNotes — they're now baked into the new version's triggerNotes.
            changeNotes: undefined,
          },
        };
      });
      RD2.toast("PDS generated wireframe v1 — review on this tab", "ok");
      return;
    }
    if (who === "__wireframeUpload") {
      // Esty/Malik attaches an existing wireframe HTML. Lands in pending-malik-review.
      // note = { filename, srcPath?, note }
      upd(id, p => {
        const versions = p.wireframe?.versions || [];
        const nextV = versions.length + 1;
        const newV = {
          v: nextV, by: "malik", daysAgo: 0,
          filename: note?.filename || `${p.code}-WFM-v${nextV}.html`,
          note: note?.note || "Uploaded existing wireframe",
        };
        if (note?.srcPath) newV.srcPath = note.srcPath;
        return {
          ...p,
          lastActivity: 0,
          wireframe: {
            ...(p.wireframe || {}),
            status: "pending-malik-review",
            currentVersion: nextV,
            versions: [...versions, newV],
            uploadedDaysAgo: 0,
          },
        };
      });
      RD2.toast("Wireframe uploaded — Malik to review", "ok");
      return;
    }
    if (who === "__wireframeSubmitToChesky") {
      upd(id, p => ({ ...p, lastActivity: 0,
        wireframe: { ...(p.wireframe || {}), status: "pending-chesky-approval", malikSubmittedDaysAgo: 0 }
      }));
      return;
    }
    if (who === "__wireframeApprove") {
      upd(id, p => ({ ...p, lastActivity: 0,
        wireframe: { ...(p.wireframe || {}), status: "locked", cheskyApprovedDaysAgo: 0 }
      }));
      return;
    }
    if (who === "__wireframeRequestChanges") {
      upd(id, p => ({ ...p, lastActivity: 0,
        wireframe: { ...(p.wireframe || {}), status: "revisions-requested", changeNotes: note || "" }
      }));
      return;
    }
    if (who === "__listingEditCopy") {
      // April edits title / bullets / keywords inline. note = patch object.
      upd(id, p => ({
        ...p,
        lastActivity: 0,
        listing: {
          ...(p.listing || {}),
          content: { ...(p.listing?.content || {}), ...(note || {}) },
        },
      }));
      return;
    }
    if (who === "__amazonSoftList") {
      upd(id, p => ({ ...p, lastActivity: 0,
        streams: { ...p.streams,
          amazon: { ...p.streams.amazon, softListedDaysAgo: 0, status: "Soft-listed", pct: 50, lastNote: "Listed — awaiting Amazon's automated response (~12h)" }
        }
      }));
      return;
    }
    if (who === "__amazonVerdict") {
      // decision = "allowed" | "gmp" | "testing" | "hardpull"
      const statusMap = { allowed: "Approved", gmp: "GMP required", testing: "Testing required", hardpull: "Hard pull" };
      upd(id, p => ({ ...p, lastActivity: 0,
        streams: { ...p.streams,
          amazon: { ...p.streams.amazon, verdict: decision, pct: 100, status: statusMap[decision] || "Verdict in", lastNote: note || `Verdict: ${statusMap[decision]}`, verdictDaysAgo: 0 }
        }
      }));
      return;
    }
    if (who === "__rdSendBrief") {
      // Chesky reviewed the auto-drafted brief and clicked Send.
      // Flips the gate from awaiting-kickoff → briefed; stamps recipients.
      upd(id, p => {
        if (!p.rdGate) return p;
        const recipients = note?.recipients || [];
        return {
          ...p,
          rdGate: {
            ...p.rdGate,
            briefSent: true,
            briefSentDaysAgo: 0,
            briefRecipients: recipients,
            status: p.rdGate.kickoff === "ready-sample" ? "sample-ordered" : "briefed",
          },
          lastActivity: 0,
        };
      });
      return;
    }
    if (who === "__rdEscalate") {
      // Escalation: Ping, Drop+swap, Mark approved, Mark rejected.
      // note.action describes what; note.target says who (e.g. "mimi").
      upd(id, p => {
        if (!p.rdGate) return p;
        const action = note?.action;
        const escalations = [...(p.rdGate.escalations || []), { action, target: note?.target, atDaysAgo: 0 }];
        let next = { ...p.rdGate, escalations };
        if (action === "approve-sample") next.status = "approved";
        if (action === "reject-sample") next.status = "iterating";
        if (action === "drop-mfg" && next.briefRecipients) {
          next.briefRecipients = next.briefRecipients.filter(r => r !== note.target);
        }
        return { ...p, rdGate: next, lastActivity: 0 };
      });
      return;
    }
    if (who === "__poAdvance") {
      // Advance an ingredient one step along the PO ladder.
      // note = { code, to }
      const code = note?.code;
      const toState = note?.to;
      if (!code || !toState) return;
      upd(id, p => {
        const bom = (p.bom || []).map(line => {
          if (line.code !== code) return line;
          return { ...line, poStatus: toState, poDaysAgo: 0 };
        });
        return { ...p, bom, lastActivity: 0 };
      });
      return;
    }
    if (who === "__rdConfirmFit") {
      // Mfg confirmed capsule fit. Stamp it on rdGate (non-gating).
      upd(id, p => {
        if (!p.rdGate) return p;
        const fit = { confirmed: true, daysAgo: 0, fillPct: 88, size: "0E", capsulesPerServing: 2, ...(note || {}) };
        return { ...p, rdGate: { ...p.rdGate, capsuleFitConfirmation: fit }, lastActivity: 0 };
      });
      return;
    }
    if (who === "__rdLockPDS") {
      // Malik pasted a locked spec from his external PDS work.
      // PDS lock now triggers Joel's cost pass against the locked formula —
      // brief-send to mfgs is gated on cost-pass = done.
      // note = { ingredients: [{name, dose}], doseFormNotes }
      upd(id, p => {
        if (!p.rdGate) return p;
        const lockedIngs = note?.ingredients || [];
        // Seed cost-pass with the locked PDS's ingredients (replace any old seed
        // from niche stage). Preserve any prior quotes that match by name.
        const oldByName = new Map(
          (p.costPass?.ingredients || []).map(i => [String(i.name).toLowerCase().trim(), i])
        );
        const seededIngs = lockedIngs.map(i => {
          const prev = oldByName.get(String(i.name).toLowerCase().trim());
          return prev
            ? { ...prev, name: i.name, dose: i.dose }
            : { name: i.name, dose: i.dose, status: "pending", costPerBottle: 0 };
        });
        const cpNext = {
          ...(p.costPass || {}),
          status: "in-progress",
          runBy: "joel",
          startedDaysAgo: 0,
          ingredients: seededIngs,
          assumptions: p.costPass?.assumptions || { batch: "5,000 bottles", servings: "30/bottle", margin: "70% target" },
          summary: p.costPass?.summary || { packagingTotal: 0.85, ingredientTotal: null, allInPerBottle: null, completePct: 0 },
        };
        return {
          ...p,
          rdGate: {
            ...p.rdGate,
            pdsLocked: { daysAgo: 0, by: "malik", notes: note?.doseFormNotes || "" },
            proposedFormula: lockedIngs,
          },
          costPass: window.CostPassCalc?.recomputeSummary
            ? window.CostPassCalc.recomputeSummary(cpNext)
            : cpNext,
          waitingOn: "joel",
          lastActivity: 0,
        };
      });
      RD2.toast("PDS locked — Joel runs the cost pass next", "ok");
      return;
    }
    if (who === "__rdAttachSpec") {
      // Spec Sheet drop-zone "Save as v1" → seed product.specSheetV2 with a
      // parsed spec, AND auto-populate Formulation (rdGate + cost-pass ingredients)
      // from the spec's formula sections. note = { specSheetV2 }
      const incomingSpec = note?.specSheetV2;
      if (!incomingSpec) {
        RD2.toast("No spec data to attach", "warn");
        return;
      }

      // Flatten formula sections → flat ingredient list for Formulation/cost-pass.
      // Note: spec sheets describe what's in the product; they don't carry sourcing.
      // Cost-pass starts each ingredient with no supplier — Ronel quotes from scratch.
      const ver = incomingSpec.versions?.[0];
      const flatIngredients = [];
      (ver?.formula?.sections || []).forEach(sec => {
        (sec.rows || []).forEach(r => {
          flatIngredients.push({
            name: r.name,
            dose: r.dose,
            form: r.form,
            function: r.function,
            section: sec.label,
          });
        });
      });

      upd(id, p => {
        // ----- Update specSheetV2 -----
        let nextSpec;
        if (p.specSheetV2 && p.specSheetV2.versions) {
          const nextV = (p.specSheetV2.versions.length || 0) + 1;
          const newVer = { ...incomingSpec.versions[0], v: nextV, daysAgo: 0, status: "draft" };
          nextSpec = {
            ...p.specSheetV2,
            currentVersion: nextV,
            versions: [...p.specSheetV2.versions, newVer],
          };
        } else {
          nextSpec = incomingSpec;
        }

        // ----- Auto-populate Formulation (rdGate) -----
        // If rdGate doesn't exist yet, seed a minimal one (PDS-locked, ready for cost pass).
        // If it exists, update its proposedFormula + flip pdsLocked.
        const baseGate = p.rdGate || {
          kickoff: p.type === "capsule" ? "capsule-mfg" : (p.type === "liquid" || p.type === "powder") ? "talha-sample" : "ready-sample",
          ownerKind: p.type === "capsule" ? "mfg" : (p.type === "liquid" || p.type === "powder") ? "formulator" : "mfg",
          briefSent: false,
          briefDraft: { recipients: [], body: "" },
          status: "awaiting-kickoff",
          createdDaysAgo: 0,
          escalations: [],
          mfgEngagement: [],
        };
        const nextRdGate = {
          ...baseGate,
          pdsLocked: { daysAgo: 0, by: "malik", notes: ver?.note || "" },
          proposedFormula: flatIngredients.map(i => ({ name: i.name, dose: i.dose })),
        };

        // ----- Auto-populate cost-pass -----
        // Seed ingredients from the flat list. Preserve any prior quotes that match by name.
        const oldByName = new Map(
          (p.costPass?.ingredients || []).map(i => [String(i.name).toLowerCase().trim(), i])
        );
        const seededIngs = flatIngredients.map(i => {
          const prev = oldByName.get(String(i.name).toLowerCase().trim());
          return prev
            ? { ...prev, name: i.name, dose: i.dose }
            : { name: i.name, dose: i.dose, status: "pending", costPerBottle: 0 };
        });
        const cpNext = {
          ...(p.costPass || {}),
          status: p.costPass?.status === "complete" ? "complete" : "in-progress",
          runBy: "joel",
          startedDaysAgo: p.costPass?.startedDaysAgo ?? 0,
          ingredients: seededIngs,
          assumptions: p.costPass?.assumptions || { batch: "5,000 bottles", servings: "30/bottle", margin: "70% target" },
          summary: p.costPass?.summary || { packagingTotal: 0.85, ingredientTotal: null, allInPerBottle: null, completePct: 0 },
        };

        // ----- Auto-seed packaging from spec format (only if no packaging yet) -----
        // Packaging is always our job (capsule, liquid, powder — all we-supply). Capsule
        // path is packaging-only (no separate BOM). We seed minimal stubs from
        // PACKAGING_DEFAULTS based on the format detected in identity.
        let nextPackaging = p.packaging;
        if (!p.packaging || p.packaging.length === 0) {
          const fmt = (ver?.identity?.format || p.type || "").toLowerCase();
          let typeKey = p.type;
          if (fmt.includes("liquid") || fmt.includes("drops") || fmt.includes("tincture")) typeKey = "liquid";
          else if (fmt.includes("capsule") || fmt.includes("softgel")) typeKey = "capsule";
          else if (fmt.includes("powder") || fmt.includes("food")) typeKey = "powder";
          const defaults = window.PIPELINE_DATA?.PACKAGING_DEFAULTS?.[typeKey] || ["bottle", "cap", "label", "box"];
          nextPackaging = defaults.map((comp) => {
            const code = `PKG-${comp.toUpperCase().slice(0, 4)}`;
            let spec = "—";
            if (comp === "bottle" && ver?.identity?.bottleSize) spec = ver.identity.bottleSize;
            else if (comp === "bottle" && ver?.identity?.bottleSpec) spec = ver.identity.bottleSpec;
            else if (comp === "dropper" && ver?.identity?.dropperSize) spec = ver.identity.dropperSize;
            return {
              code,
              component: comp,
              spec,
              qty: 5000,
              picked: null,
              status: "Brief",
              ordered: false,
              quotes: [],
              seededFromSpec: true,
            };
          });
        }

        // Auto-create listing skeleton so April's research workspace unlocks
        // the moment a spec exists — Phase 1 (research) is independent of Build.
        // Phase 2 (submission) stays gated on label artwork + mockup inside ListingTab.
        const nextListing = p.listing || {
          owner: "april",
          phase: "research",
          content: { title: "", bullets: [], keywordBytes: 0, description: "" },
          aplus: [],
          mockup: { front: null, back: null },
          images: { main: [], gallery: [], aplus: [] },
          created: null, approved: null, live: null,
        };

        return {
          ...p,
          specSheetV2: nextSpec,
          rdGate: nextRdGate,
          costPass: window.CostPassCalc?.recomputeSummary
            ? window.CostPassCalc.recomputeSummary(cpNext)
            : cpNext,
          packaging: nextPackaging,
          listing: nextListing,
          waitingOn: "joel",
          lastActivity: 0,
        };
      });
      RD2.toast(`Spec attached → ${flatIngredients.length} ingredients populated · April unlocked for listing research`, "ok");
      return;
    }
    if (who === "__setRun") {
      // Set the active run order. note = { bottleCount }.
      // Drives cost-pass batch label + packaging quantities + MOQ checks.
      upd(id, p => {
        const bottles = Number(note?.bottleCount);
        if (!isFinite(bottles) || bottles <= 0) return p;
        const spec = p.specSheetV2?.versions?.find(v => v.v === p.specSheetV2.currentVersion);
        const check = spec ? window.RunOrder.checkRun(spec, bottles) : null;
        // Derived batch label for assumptions display
        const batchLabel = check && check.form === "capsule"
          ? `${bottles.toLocaleString()} bottles (${check.derivedCount.toLocaleString()} caps)`
          : `${bottles.toLocaleString()} bottles`;
        // Update packaging qty
        let nextPackaging = p.packaging;
        if (Array.isArray(nextPackaging)) {
          nextPackaging = nextPackaging.map(item => ({ ...item, qty: bottles }));
        }
        // Update costPass assumptions
        let nextCp = p.costPass;
        if (nextCp) {
          nextCp = {
            ...nextCp,
            assumptions: { ...(nextCp.assumptions || {}), batch: batchLabel },
          };
        }
        return {
          ...p,
          run: { bottleCount: bottles, setAt: 0, by: RD2.__currentUser || "malik" },
          packaging: nextPackaging,
          costPass: nextCp,
          lastActivity: 0,
        };
      });
      return;
    }
    if (who === "__specLockToggle") {
      // Chesky locks/unlocks the spec sheet. decision = "lock" | "unlock".
      // When locked, Malik's inline-edit dropdowns trigger a confirm popup.
      upd(id, p => {
        if (!p.specSheetV2) return p;
        const next = decision === "lock"
          ? { ...p.specSheetV2, lockedAt: { daysAgo: 0, by: "chesky" } }
          : { ...p.specSheetV2, lockedAt: null };
        return { ...p, specSheetV2: next, lastActivity: 0 };
      });
      RD2.toast(decision === "lock" ? "Spec sheet locked by Chesky" : "Spec sheet unlocked", "ok");
      return;
    }
    if (who === "__rdEngageMfg") {
      // Ronel sends the locked PDS to one or more manufacturers for quote + sample.
      // note = { recipients: ["mimi", "connor"], body }
      upd(id, p => {
        if (!p.rdGate) return p;
        const recipients = note?.recipients || [];
        const mfgIdByContact = { mimi: "herballyours", connor: "brandnutra" };
        const newEngagements = recipients.map(contact => ({
          mfgId: mfgIdByContact[contact] || contact,
          contact,
          status: "sampling",
          quotePerCap: null,
          sampleETADays: null,
          notes: "Brief just sent — awaiting quote + sample ETA.",
        }));
        // Merge: keep existing engagements not in this batch, add new ones.
        const existing = p.rdGate.mfgEngagement || [];
        const existingContacts = new Set(existing.map(e => e.contact));
        const merged = [
          ...existing,
          ...newEngagements.filter(e => !existingContacts.has(e.contact)),
        ];
        return {
          ...p,
          rdGate: {
            ...p.rdGate,
            mfgEngagement: merged,
            briefSent: true,
            briefSentDaysAgo: 0,
            briefRecipients: recipients,
            status: "briefed",
          },
          lastActivity: 0,
        };
      });
      RD2.toast(`Brief sent to ${(note?.recipients || []).length} manufacturer${(note?.recipients || []).length === 1 ? "" : "s"}`, "ok");
      return;
    }
    if (who === "__promote") {
      // Both approvers said yes at niche review → advance to Formulation.
      // Seed an rdGate in the "awaiting-kickoff" state — Chesky still has to
      // review the auto-drafted brief and click Send. Routing depends on type:
      //   liquid / powder       → Talha (formulator) + Ronel ships sample raws
      //   capsule               → Mimi + Connor (parallel mfg quotes) + Ronel ships sample raws
      //   softgel/gummy/tea/cream/patch → order ready-made sample from mfg (mfg sources)
      upd(id, p => {
        const t = p.type;
        let kickoff, ownerKind, recipients, defaultBriefBody;
        if (t === "liquid" || t === "powder") {
          kickoff = "talha-sample";
          ownerKind = "formulator";
          recipients = ["talha"];
          defaultBriefBody = `Talha — please draft a noise formula for ${p.name} and tell Ronel which ingredients you need sample-sized of. Target: round 1 sample within 2 weeks.`;
        } else if (t === "capsule") {
          kickoff = "capsule-mfg";
          ownerKind = "mfg";
          recipients = ["mimi", "connor"];
          defaultBriefBody = `Mimi & Connor — quoting both of you in parallel for ${p.name}. Ronel will ship sample-size of the listed ingredients to whichever of you confirms first. Need a capsule sample + per-bottle quote within 3 weeks.`;
        } else {
          kickoff = "ready-sample";
          ownerKind = "mfg";
          recipients = []; // mfg TBD — Chesky picks at brief-send time
          defaultBriefBody = `Need a ready-made sample of ${p.name} (mfg sources their own ingredients). Quote + sample within 2 weeks.`;
        }
        const seededGate = {
          kickoff,
          ownerKind,
          briefSent: false,
          briefDraft: { recipients, body: defaultBriefBody },
          status: "awaiting-kickoff",
          createdDaysAgo: 0,
          escalations: [],
          // Per-flavor scaffolds the existing tab body still reads:
          ...(ownerKind === "formulator"
            ? { ownerId: "talha", sampleRounds: [], noiseFormula: null, flavorRecommended: null }
            : { ownerId: null, mfgEngagement: [], pds: { locked: false, doses: (p.niche?.current?.formula || []).map(f => ({ ingredient: f.ingredient, dose: f.dose })) } }),
        };
        // Promote always lands in "kickoff" so Malik can build the PDS.
        // Cost pass no longer runs before PDS — Joel runs it AFTER PDS lock,
        // and brief-send to mfgs is gated on cost-pass = done.
        const seededFormula = p.niche?.current?.formula || [];
        const seededCostPass = p.costPass || {
          status: "not-started",
          runBy: "joel",
          ingredients: seededFormula.length > 0
            ? seededFormula.map(f => ({ name: f.ingredient, dose: f.dose, status: "pending", costPerBottle: 0 }))
            : [],
          assumptions: { batch: "5,000 bottles", servings: "30/bottle", margin: "70% target" },
          summary: { packagingTotal: 0.85, ingredientTotal: null, allInPerBottle: null, completePct: 0 },
        };
        return {
          ...p,
          stage: "rd",
          formulationSubState: "kickoff",
          waitingOn: "malik",
          lastActivity: 0, stageAge: 0,
          costPass: seededCostPass,
          rdGate: p.rdGate || seededGate,
          streams: p.streams || {
            sourcing: { owner: "ronel", status: "Not started", pct: 0, lastNote: "Kicks off after Formulation approves a sample" },
            design:   { owner: "esty",  status: "Not started", pct: 0, lastNote: "Kicks off after Formulation approves a sample" },
            listing:  { owner: "april", status: "Not started", pct: 0, lastNote: "Kicks off after Formulation approves a sample" },
            amazon:   { owner: "april", status: "Not started", pct: 0, lastNote: "Soft-list once formula + design lock", verdict: null, softListedDaysAgo: null },
          }
        };
      });
      return;
    }
    upd(id, p => {
      // Joel's optional non-binding cost flag — set/clear
      if (who === "__joelCostFlag") {
        if (decision === "clear") return { ...p, joelCostFlag: null, lastActivity: 0 };
        return { ...p, joelCostFlag: { by: "joel", at: 0, note: String(note || "") }, lastActivity: 0 };
      }
      const next = { ...p, approvals: { ...(p.approvals || {}), [who]: { decision, at: 0, note } }, lastActivity: 0 };
      if (decision === "reject") return { ...next, stage: "niche", nicheSubState: "parsed", waitingOn: null };
      if (decision === "changes") {
        // "Send back to niche" — single approver can trigger; wipes cost pass
        // (formula may change) and stamps a banner for Malik in the dossier.
        return {
          ...next,
          stage: "niche",
          nicheSubState: "parsed",
          waitingOn: "malik",
          stageAge: 0,
          approvals: { chesky: null, joel: null },
          costPass: null,
          sentBack: { by: who, reason: String(note || "").trim() || "(no reason given)", daysAgo: 0 },
        };
      }
      return next;
    });
  };
  const createIdea = (form) => {
    const id = "I-" + (310 + products.filter(p => p.id.startsWith("I-")).length);
    const idea = {
      id, code: form.code || form.name.replace(/\s+/g, "").slice(0, 14),
      name: form.name, brand: form.brand, type: form.type, stage: "idea",
      owner: "malik", createdBy: "malik", synopsis: form.synopsis,
      createdDaysAgo: 0, lastActivity: 0, stageAge: 0, health: "ok",
    };
    setProducts(prev => {
      const next = [idea, ...prev];
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };

  const visibleProducts = useMA(() => {
    let list = products;
    if (view.startsWith("stage:")) {
      const sid = view.slice(6);
      list = list.filter(p => p.stage === sid);
    }
    return RD2.applyTypeFilter ? RD2.applyTypeFilter(list, selectedTypes) : list;
  }, [view, products, selectedTypes]);

  const filteredProducts = useMA(
    () => RD2.applyTypeFilter ? RD2.applyTypeFilter(products, selectedTypes) : products,
    [products, selectedTypes]
  );

  const crumbs = useMA(() => {
    if (view === "home") return ["Today"];
    if (view === "inbox") return ["Idea Inbox"];
    if (view === "pipeline") return ["Pipeline"];
    if (view === "people") return activePerson ? ["People", RD2.person(activePerson)?.name] : ["People"];
    if (view === "watchlist") return ["Watchlist"];
    if (view === "activity") return ["Activity"];
    if (view === "rules") return ["Rules"];
    if (view.startsWith("stage:")) return ["Pipeline", RD2.stage(view.slice(6))?.label];
    return ["Today"];
  }, [view, activePerson]);

  return (
    <div className="app">
      <RD2.Sidebar view={view} setView={(v) => { setView(v); setActivePerson(null); }} products={products} />
      <div className="main">
        <RD2.TopBar crumbs={crumbs} onNewIdea={() => setShowNew(true)} currentUser={currentUser} onSwitchUser={switchUser} products={products} onOpenProduct={openProduct} />
        {RD2.TypeFilterBar && (
          <RD2.TypeFilterBar products={products} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} />
        )}
        <div className="content">
          {view === "home" && <RD2.RoleHome currentUser={currentUser} onOpen={openProduct} setView={setView} />}
          {view === "inbox" && <RD2.IdeaInbox products={filteredProducts} onOpen={openProduct} onPromote={promote} onReject={reject} />}
          {view === "pipeline" && <RD2.Board products={filteredProducts.filter(p => p.stage !== "idea")} onOpen={openProduct} />}
          {view.startsWith("stage:") && view.slice(6) === "idea" && (
            <RD2.IdeaInbox products={filteredProducts} onOpen={openProduct} onPromote={promote} onReject={reject} />
          )}
          {view.startsWith("stage:") && view.slice(6) !== "idea" && (
            <RD2.StageDashboard stageId={view.slice(6)} products={filteredProducts} onOpen={openProduct} onDecide={decide} />
          )}
          {view === "people" && !activePerson && <RD2.People onPersonClick={setActivePerson} />}
          {view === "people" && activePerson && <RD2.PersonQueue personId={activePerson} onOpen={openProduct} onBack={() => setActivePerson(null)} />}
          {view === "watchlist" && <RD2.Watchlist />}
          {view === "activity" && <ActivityView onOpen={openProduct} />}
          {view === "rules" && <RulesView />}
        </div>
      </div>
      {openId && <RD2.Dossier productId={openId} onClose={() => { setOpenId(null); setOpenFocus(null); }}
        focus={openFocus}
        currentUser={currentUser}
        onUploadNiche={uploadNiche}
        onUpdateNiche={updateNiche}
        onPromote={(id) => { promote(id); setOpenId(null); setOpenFocus(null); }}
        onReject={(id) => { reject(id); /* opens reject modal; dossier stays mounted until confirm */ }}
        onDelete={(id) => { deleteProduct(id); setOpenId(null); setOpenFocus(null); }}
        onDecide={(who, decision, note) => decide(openId, who, decision, note)} />}
      {showNew && <RD2.NewIdeaModal onClose={() => setShowNew(false)} onCreate={createIdea} />}
      {rejectingId && (
        <RD2.RejectIdeaModal
          product={products.find(p => p.id === rejectingId)}
          onClose={() => setRejectingId(null)}
          onConfirm={(payload) => { confirmReject(rejectingId, payload); setRejectingId(null); setOpenId(null); setOpenFocus(null); }}
        />
      )}
      <ToastHost />
    </div>
  );
}

function ActivityView({ onOpen }) {
  return (
    <div style={{ padding: 20, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 4px" }}>Activity</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>Everything that's happened, freshest first.</div>
      <div className="card">
        <div className="feed">
          {PIPELINE_DATA.ACTIVITY.sort((a, b) => a.ts - b.ts).map((e, i) => {
            const u = RD2.person(e.user);
            const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === e.productId);
            return (
              <div className="feed-row" key={i}>
                <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
                <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "alert" ? "!" : e.type === "approval" ? "✓" : "✎"}</span>
                <div className="body">
                  {u && <RD2.Avatar user={u} size="sm" />} <span style={{ fontWeight: 500 }}>{u?.name}</span>
                  <span style={{ color: "var(--ink-2)" }}> {e.text} on </span>
                  <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }} onClick={() => onOpen(e.productId)}>{p?.code || e.productId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RulesView() {
  const [rules, setRules] = useSA(PIPELINE_DATA.RULES);
  const toggle = (id) => setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));

  // Generate "would have fired" events per rule from product state + activity
  const triggers = useMA(() => {
    const out = [];
    rules.forEach(r => {
      if (r.id === "approval-stale") {
        PIPELINE_DATA.PRODUCTS.filter(p => p.waitingOn === "chesky" && p.lastActivity >= 1).forEach(p => {
          out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: p.lastActivity, message: `Approval pending ${p.lastActivity}d on ${p.code}`, channel: r.where, who: r.notify });
        });
      }
      if (r.id === "stage-stuck") {
        PIPELINE_DATA.PRODUCTS.forEach(p => {
          const b = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
          if (b && (p.stageAge || 0) > b.target + 3) {
            out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: 0, message: `${p.code} is ${p.stageAge - b.target}d over ${b.label}`, channel: r.where, who: r.notify });
          }
        });
      }
      if (r.id === "stream-backorder") {
        PIPELINE_DATA.PRODUCTS.filter(p => p.streams).forEach(p => {
          Object.entries(p.streams).forEach(([k, s]) => {
            if (s.status === "Backorder" || s.status === "Stuck") {
              out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: p.lastActivity, message: `${k} stream ${s.status} on ${p.code}: ${s.lastNote}`, channel: r.where, who: r.notify });
            }
          });
        });
      }
      if (r.id === "version-published") {
        PIPELINE_DATA.ACTIVITY.filter(e => e.type === "version" && e.ts < 5).forEach(e => {
          const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === e.productId);
          if (!p) return;
          out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: e.ts, message: `${e.text} on ${p.code}`, channel: r.where, who: r.notify });
        });
      }
      if (r.id === "idea-aged") {
        PIPELINE_DATA.PRODUCTS.filter(p => p.stage === "idea" && p.createdDaysAgo >= 5).forEach(p => {
          out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: 0, message: `Idea ${p.code} aged ${p.createdDaysAgo}d without triage`, channel: r.where, who: r.notify });
        });
      }
    });
    return out.sort((a, b) => a.daysAgo - b.daysAgo);
  }, [rules]);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 4px" }}>Notification rules</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>What pings Slack and who. The right side shows what would have fired in the last 7 days — flip rules on once they look right.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="card-h"><h3>Rules</h3><span className="meta">{rules.filter(r => r.enabled).length}/{rules.length} live</span></div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>Trigger</th>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>Where</th>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>Notify</th>
                <th style={{ textAlign: "right", padding: "10px 8px" }}>Fired</th>
                <th style={{ textAlign: "right", padding: "10px 8px" }}>On</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => {
                const count = triggers.filter(t => t.rule.id === r.id).length;
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 500 }}>{r.on}<div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{r.label}</div></td>
                    <td style={{ padding: "12px 8px", color: "var(--ink-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.where}</td>
                    <td style={{ padding: "12px 8px" }}>
                      {r.notify.map(n => (
                        <span key={n} style={{ display: "inline-block", padding: "2px 7px", marginRight: 4, marginBottom: 2, borderRadius: 4, fontSize: 11.5, fontFamily: "var(--font-mono)", background: n.startsWith("#") ? "var(--info-bg)" : "var(--accent-bg)", color: n.startsWith("#") ? "var(--info)" : "var(--accent)" }}>{n}</span>
                      ))}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: count > 0 ? (r.enabled ? "var(--ok)" : "var(--ink-2)") : "var(--ink-3)" }}>{count}×</td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <button onClick={() => toggle(r.id)} style={{
                        width: 36, height: 20, borderRadius: 10, border: 0, cursor: "pointer",
                        background: r.enabled ? "var(--ok)" : "var(--bg-3)", position: "relative"
                      }}>
                        <span style={{
                          position: "absolute", top: 2, left: r.enabled ? 18 : 2,
                          width: 16, height: 16, borderRadius: 8, background: "white",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                        }}></span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-h"><h3>What would have fired · last 7d</h3><span className="meta">{triggers.length} events</span></div>
          <div style={{ overflow: "auto", maxHeight: 580 }}>
            {triggers.length === 0 && <div className="empty" style={{ padding: 30, textAlign: "center" }}>Nothing — pipeline is calm.</div>}
            {triggers.map((t, i) => (
              <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", paddingTop: 2 }}>{RD2.daysAgoLabel(t.daysAgo)}</span>
                <div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    {t.who.map(n => (
                      <span key={n} style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10.5, fontFamily: "var(--font-mono)", background: n.startsWith("#") ? "var(--info-bg)" : "var(--accent-bg)", color: n.startsWith("#") ? "var(--info)" : "var(--accent)" }}>{n}</span>
                    ))}
                    {!t.rule.enabled && <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, background: "var(--bg-3)", color: "var(--ink-3)" }}>silent</span>}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink)" }}>{t.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppV3 />);
