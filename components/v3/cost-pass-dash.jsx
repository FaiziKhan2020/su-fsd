// ============================================================
// Cost Pass dashboard — Ronel's stage view.
//
// Two modes:
//  • per-active — capsule, powder, raw-liquid: each ingredient has a
//    quote row. Ronel enters $/kg (default — auto-derives $/bottle via
//    dose × yield) OR $/bottle directly via a row toggle.
//  • flat — gummy, softgel, patch, tea, BioCorp liquids: single
//    "$/finished unit" field; mfg supplies the actives.
//
// Liquid products show a top-of-card mode toggle since they go both ways.
// ============================================================

const { useState: useCPState, useMemo: useCPMemo } = React;

function CostPassDash({ items, onOpen, onDecide }) {
  if (!items?.length) {
    return (
      <div className="stage-dash-empty" style={{ padding: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>No cost passes in flight.</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
          Products land here automatically once Niche Analysis is parsed. Ronel runs a $/bottle pass before the niche-review meeting.
        </div>
      </div>
    );
  }
  return (
    <div className="cost-pass-dash">
      {items.map(p => <CostPassCard key={p.id} p={p} onOpen={onOpen} onDecide={onDecide} />)}
    </div>
  );
}

function CostPassCard({ p, onOpen, onDecide, defaultExpanded = false }) {
  const [expanded, setExpanded] = useCPState(defaultExpanded);
  const [showAi, setShowAi] = useCPState(false);
  const cp = p.costPass || { status: "not-started", ingredients: [], assumptions: {}, summary: {} };
  const mode = window.CostPassCalc.resolveMode({ ...p, costPass: cp });
  const canToggle = window.CostPassCalc.MODE_TOGGLEABLE[p.type];
  const unitNoun = window.CostPassCalc.unitNoun(p);

  // ── derive completeness + totals based on mode ────────────────────
  const ingredients = cp.ingredients || [];
  const flat = cp.flatPrice;
  const allQuoted = mode === "flat"
    ? (flat?.pricePerUnit != null && flat.pricePerUnit > 0)
    : (ingredients.length > 0 && ingredients.every(i => i.status === "quoted" && i.costPerBottle != null));
  const ingTotal = mode === "flat"
    ? (flat?.pricePerUnit || 0)
    : ingredients.reduce((s, i) => s + (i.costPerBottle || 0), 0);
  const pkgTotal = cp.summary?.packagingTotal || 0;
  const encapCost = cp.summary?.encapsulatingCost || 0;
  const allIn = ingTotal + pkgTotal + encapCost;
  const owner = RD2.person(cp.runBy || "ronel");
  const quotedCount = ingredients.filter(i => i.status === "quoted").length;

  return (
    <div className={`cp-card ${expanded ? "expanded" : "collapsed"}`}>
      <div className="cp-card-head" onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", width: 14, display: "inline-block", flexShrink: 0, transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
              <RD2.BrandChip b={p.brand} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              <span style={{ fontSize: 10.5, padding: "2px 7px", background: mode === "flat" ? "oklch(94% 0.06 270)" : "oklch(94% 0.06 145)", color: mode === "flat" ? "oklch(40% 0.15 270)" : "oklch(40% 0.15 145)", border: `1px solid ${mode === "flat" ? "oklch(85% 0.1 270)" : "oklch(85% 0.1 145)"}`, borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                {mode === "flat" ? `Flat $/${unitNoun}` : "Per active"}
              </span>
            </div>
            {!expanded && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 12, color: "var(--ink-2)" }}>
                {mode === "flat" ? (
                  <span>{flat?.pricePerUnit ? `Quoted ${flat.supplier || "supplier"} @ $${flat.pricePerUnit.toFixed(2)}/${unitNoun}` : "No quote yet"}</span>
                ) : (
                  <span><span className="mono" style={{ color: allQuoted ? "var(--ok)" : "var(--ink-2)" }}>{quotedCount}/{ingredients.length}</span> quoted</span>
                )}
                <span style={{ color: "var(--ink-4)" }}>·</span>
                <span>All-in <span className="mono" style={{ fontWeight: 600, color: allQuoted ? "var(--ink)" : "var(--ink-3)" }}>{allQuoted ? `$${allIn.toFixed(2)}` : "pending"}</span></span>
                <span style={{ color: "var(--ink-4)" }}>·</span>
                <span style={{ color: "var(--ink-3)" }}>{cp.status === "in-progress" ? `started ${RD2.daysAgoLabel(cp.startedDaysAgo || 0)}` : cp.status === "done" ? `done ${RD2.daysAgoLabel(cp.completedDaysAgo || 0)}` : "not started"}</span>
              </div>
            )}
            {expanded && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{p.synopsis}</div>}
          </div>
        </div>
        {!defaultExpanded && (
          <div className="cp-card-actions" onClick={e => e.stopPropagation()}>
            <button className="btn sm" onClick={() => onOpen(p.id, "tab:overview")}>Open dossier →</button>
          </div>
        )}
      </div>

      {expanded && (
        <>
          {/* Mode toggle (liquids only) — bridges the BioCorp-vs-raw decision */}
          {canToggle && (
            <div style={{ padding: "10px 18px", background: "var(--bg-2)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 500 }}>Sourcing model:</div>
              <ModeToggle mode={mode} onChange={(m) => onDecide("__costPassSetMode", m)} unitNoun={unitNoun} />
              <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>
                {mode === "flat"
                  ? "Legacy mode — BioCorp supplies all ingredients (rare; we now ship raws)."
                  : "We ship raw ingredients to BioCorp. Each active gets its own quote."}
              </span>
            </div>
          )}

          <div className="cp-card-body">
            {mode === "flat"
              ? <FlatModeBody p={p} cp={cp} onDecide={onDecide} unitNoun={unitNoun} />
              : <PerActiveBody p={p} cp={cp} onDecide={onDecide} onOpenAi={() => setShowAi(true)} />}

            {/* Right: summary card + actions (shared) */}
            <div className="cp-summary">
              <div className="cp-side-h"><span>$/{unitNoun}</span></div>
              <div className="cp-summary-block">
                <div className="cp-summary-row">
                  <span>{mode === "flat" ? "Mfg charge" : "Ingredients"}</span>
                  <span className="mono">{allQuoted || ingTotal > 0 ? `$${ingTotal.toFixed(2)}` : <span style={{ color: "var(--ink-3)" }}>—</span>}</span>
                </div>
                <div className="cp-summary-row">
                  <span>Packaging</span>
                  <span className="mono">${pkgTotal.toFixed(2)}</span>
                </div>
                <EncapCostRow p={p} encapCost={encapCost} onDecide={onDecide} />
                <div className="cp-summary-row total">
                  <span>All-in</span>
                  <span className="mono">{allQuoted ? `$${allIn.toFixed(2)}` : <span style={{ color: "var(--ink-3)" }}>pending</span>}</span>
                </div>
              </div>
              <div className="cp-assumptions">
                <div className="cp-assumptions-h">Held constant</div>
                {Object.entries(cp.assumptions || {}).map(([k, v]) => (
                  <div key={k} className="cp-assumption-row">
                    <span style={{ textTransform: "capitalize" }}>{k}</span>
                    <span className="mono">{v}</span>
                  </div>
                ))}
              </div>
              <div className="cp-summary-actions">
                <RD2.GatedAction product={p}>
                  <button className="btn sm primary" disabled={!allQuoted} title={allQuoted ? "Mark cost pass complete and advance to manufacturer brief" : "Need a complete quote first"}
                    onClick={() => allQuoted && onDecide && onDecide("__costPassComplete", null)}>
                    {allQuoted ? "Mark complete →" : "Run cost pass"}
                  </button>
                </RD2.GatedAction>
              </div>
            </div>
          </div>

          <div className="cp-card-foot">
            <RD2.Avatar user={owner} size="xs" />
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              Run by {owner?.name} · {cp.status === "in-progress" ? `started ${RD2.daysAgoLabel(cp.startedDaysAgo || 0)}` : cp.status === "done" ? `completed ${RD2.daysAgoLabel(cp.completedDaysAgo || 0)}` : "not started"}
            </span>
            <span style={{ flex: 1 }}></span>
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Required before niche review</span>
          </div>

          {/* Cost-pass diff — shows the most recent before/after when revisions exist */}
          {cp?.history?.length >= 2 && RD2.CostPassDiff && (
            <div style={{ padding: "0 16px 14px" }}>
              <RD2.CostPassDiff revisions={cp.history} />
            </div>
          )}
        </>
      )}

      {showAi && <AiInvoiceModal p={p} onClose={() => setShowAi(false)} onDecide={onDecide} />}
    </div>
  );
}

// ── Sourcing-mode segmented toggle ─────────────────────────────────
function ModeToggle({ mode, onChange, unitNoun }) {
  const opt = (key, label) => (
    <button onClick={() => onChange(key)}
      style={{
        padding: "5px 11px", fontSize: 11.5, fontWeight: 500,
        background: mode === key ? "var(--panel)" : "transparent",
        color: mode === key ? "var(--ink)" : "var(--ink-3)",
        border: "1px solid",
        borderColor: mode === key ? "var(--line-2)" : "transparent",
        borderRadius: 5, cursor: "pointer", flex: "0 0 auto",
        boxShadow: mode === key ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
      }}>{label}</button>
  );
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 2, background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 7 }}>
      {opt("per-active", "Per active (we buy raw)")}
      {opt("flat", `Flat $/${unitNoun} (mfg buys)`)}
    </div>
  );
}

// ── Per-active body: ingredient rows w/ $/kg or $/bottle entry ─────
function PerActiveBody({ p, cp, onDecide, onOpenAi }) {
  const [editing, setEditing] = useCPState(null); // ingredient name
  const ingredients = cp.ingredients || [];
  return (
    <div className="cp-side">
      <div className="cp-side-h">
        <span>Ingredient quotes</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onOpenAi}
            style={{ fontSize: 11, padding: "3px 8px", background: "transparent", border: "1px dashed var(--line-2)", borderRadius: 5, color: "var(--ink-2)", cursor: "pointer" }}>
            ✨ Paste invoice
          </button>
          <span className="cp-side-meta mono">{ingredients.filter(i => i.status === "quoted").length}/{ingredients.length} quoted</span>
        </div>
      </div>
      <div className="cp-ingredient-list">
        {ingredients.map((i, idx) => (
          <RD2.MultiQuoteIngredientRow key={idx} p={p} ing={i} onDecide={onDecide} />
        ))}
        {ingredients.length === 0 && (
          <div style={{ padding: 16, color: "var(--ink-3)", fontSize: 12, fontStyle: "italic" }}>No ingredients pulled yet — open dossier to start.</div>
        )}
      </div>
      {ingredients.length > 0 && ingredients.some(i => i.status !== "quoted") && (
        <div className="cp-side-foot">
          <span style={{ fontSize: 11, color: "var(--warn)" }}>{ingredients.filter(i => i.status !== "quoted").length} ingredient{ingredients.filter(i => i.status !== "quoted").length === 1 ? "" : "s"} still need a picked vendor.</span>
        </div>
      )}
    </div>
  );
}

// ── Single ingredient row with $/kg ↔ $/bottle toggle ─────────────
function IngredientRow({ p, ing, isEditing, onStartEdit, onCancel, onCommit }) {
  // Default to $/kg input — that's how Ronel actually receives prices.
  const [inputMode, setInputMode] = useCPState(ing.inputMode || "kg");
  const [priceDraft, setPriceDraft] = useCPState("");
  const [supplierDraft, setSupplierDraft] = useCPState(ing.supplier || "");

  React.useEffect(() => {
    if (isEditing) {
      setInputMode(ing.inputMode || "kg");
      setPriceDraft(
        ing.inputMode === "kg" && ing.pricePerKg ? String(ing.pricePerKg) :
        ing.costPerBottle ? ing.costPerBottle.toFixed(2) : ""
      );
      setSupplierDraft(ing.supplier || "");
    }
  }, [isEditing]);

  // Live-derive what $/bottle would be at the current $/kg price.
  const liveCpb = useCPMemo(() => {
    if (inputMode !== "kg") return null;
    const v = parseFloat(priceDraft);
    if (!isFinite(v) || v <= 0) return null;
    return window.CostPassCalc.costPerBottleFromKg({
      doseStr: ing.dose,
      pricePerKg: v,
      servings: window.CostPassCalc.servingsPerUnit(p),
      yieldDec: window.CostPassCalc.resolveYield(p),
    });
  }, [priceDraft, inputMode, ing.dose, p]);

  const priceValid = priceDraft && parseFloat(priceDraft) > 0;
  const commit = () => {
    if (!priceValid) return;
    if (inputMode === "kg") {
      onCommit(`kg|${priceDraft}|${supplierDraft}`);
    } else {
      onCommit(`${priceDraft}|${supplierDraft}`);
    }
  };

  return (
    <div className="cp-ing-row" style={{ alignItems: isEditing ? "flex-start" : "center" }}>
      <div className="cp-ing-name">
        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{ing.name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{ing.dose}</div>
      </div>
      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {/* Mode toggle */}
          <div style={{ display: "inline-flex", gap: 1, padding: 2, background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 5 }}>
            {["kg", "bottle"].map(m => (
              <button key={m} onClick={(e) => { e.stopPropagation(); setInputMode(m); setPriceDraft(""); }}
                style={{
                  padding: "3px 8px", fontSize: 10.5, fontWeight: 500,
                  background: inputMode === m ? "var(--panel)" : "transparent",
                  color: inputMode === m ? "var(--ink)" : "var(--ink-3)",
                  border: "none", borderRadius: 3, cursor: "pointer",
                }}>{m === "kg" ? "$/kg" : "$/bottle"}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="text"
              list={`suppliers-${ing.name?.replace(/\s+/g, "-") || "ing"}`}
              value={supplierDraft}
              onChange={e => setSupplierDraft(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === "Enter" && priceDraft) commit();
                if (e.key === "Escape") onCancel();
              }}
              placeholder="supplier"
              style={{ width: 110, padding: "3px 6px", fontSize: 11, border: "1px solid var(--accent)", borderRadius: 3, background: "var(--panel)", color: "var(--ink)" }}
            />
            <datalist id={`suppliers-${ing.name?.replace(/\s+/g, "-") || "ing"}`}>
              {(window.PIPELINE_DATA?.INGREDIENT_SUPPLIERS || []).map(s => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>$</span>
            <input type="number" step="0.01" autoFocus
              placeholder={inputMode === "kg" ? "/kg" : "/bottle"}
              value={priceDraft}
              onChange={e => setPriceDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && priceDraft) commit();
                if (e.key === "Escape") onCancel();
              }}
              onClick={e => e.stopPropagation()}
              style={{ width: 64, padding: "3px 4px", fontSize: 12, fontFamily: "var(--font-mono)", border: "1px solid var(--accent)", borderRadius: 3 }}
            />
            <button className="btn xs primary" disabled={!priceValid}
              style={{ opacity: priceValid ? 1 : 0.4, cursor: priceValid ? "pointer" : "not-allowed" }}
              onClick={(e) => { e.stopPropagation(); commit(); }}>↵</button>
            <button className="btn xs" onClick={(e) => { e.stopPropagation(); onCancel(); }}>×</button>
          </div>
          {/* Live derivation hint when in $/kg mode */}
          {inputMode === "kg" && liveCpb != null && (
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              → ${liveCpb.toFixed(3)}/bottle (dose {ing.dose} × {window.CostPassCalc.servingsPerUnit(p)}srv ÷ yield {Math.round(window.CostPassCalc.resolveYield(p) * 100)}%)
            </div>
          )}
        </div>
      ) : ing.status === "quoted" ? (
        <div className="cp-ing-cost mono" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {ing.supplier && (
            <span style={{ fontSize: 11.5, padding: "3px 8px", background: "var(--accent-tint, var(--bg-2))", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--accent)", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
              {ing.supplier}
            </span>
          )}
          <div style={{ textAlign: "right", lineHeight: 1.2 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>${(ing.costPerBottle || 0).toFixed(3)}<span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 400 }}>/bottle</span></div>
            {ing.inputMode === "kg" && ing.pricePerKg && (
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500 }}>
                @ ${ing.pricePerKg}/kg
              </div>
            )}
          </div>
          <button className="cp-edit-btn" title="Re-quote" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>✎</button>
        </div>
      ) : (
        <div className="cp-ing-cost">
          <button className="btn xs primary" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>+ Quote</button>
        </div>
      )}
    </div>
  );
}

// ── Flat $/unit body: single big input ─────────────────────────────
function FlatModeBody({ p, cp, onDecide, unitNoun }) {
  const flat = cp.flatPrice || {};
  const [editing, setEditing] = useCPState(!flat.pricePerUnit);
  const [price, setPrice] = useCPState(flat.pricePerUnit ? String(flat.pricePerUnit) : "");
  const [supplier, setSupplier] = useCPState(flat.supplier || "");
  const [moq, setMoq] = useCPState(flat.moqNote || "");

  const commit = () => {
    if (!price) return;
    onDecide("__costPassFlat", null, `${price}|${supplier}|${moq}`);
    setEditing(false);
  };

  // Show the formula's actives as ghost rows so the analyst can see what
  // the mfg is bundling into the flat charge — helps sanity-check pricing.
  const formula = p.niche?.current?.formula || [];

  return (
    <div className="cp-side">
      <div className="cp-side-h">
        <span>Manufacturer quote</span>
        <span className="cp-side-meta">flat $/{unitNoun} — incl. all ingredients</span>
      </div>

      {editing ? (
        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--ink-2)", width: 80 }}>Price</span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>$</span>
            <input type="number" step="0.01" autoFocus value={price} onChange={e => setPrice(e.target.value)}
              placeholder={`per ${unitNoun}`}
              style={{ flex: 1, padding: "6px 8px", fontSize: 13, fontFamily: "var(--font-mono)", border: "1px solid var(--accent)", borderRadius: 5 }} />
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>/ {unitNoun}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--ink-2)", width: 80 }}>Mfg / supplier</span>
            <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder="BioCorp, Vita-Tech, Carlsbad…"
              style={{ flex: 1, padding: "6px 8px", fontSize: 13, border: "1px solid var(--line-2)", borderRadius: 5 }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--ink-2)", width: 80 }}>MOQ note</span>
            <input type="text" value={moq} onChange={e => setMoq(e.target.value)}
              placeholder="Optional — e.g. min 5,000 units, FOB Shanghai"
              style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid var(--line-2)", borderRadius: 5 }} />
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
            {flat.pricePerUnit != null && <button className="btn sm" onClick={() => setEditing(false)}>Cancel</button>}
            <button className="btn sm primary" disabled={!price} onClick={commit}>Save quote</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "14px 14px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)" }}>${(flat.pricePerUnit || 0).toFixed(2)}</span>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>/ {unitNoun}</span>
            <button className="cp-edit-btn" style={{ marginLeft: "auto" }} onClick={() => setEditing(true)}>✎</button>
          </div>
          {flat.supplier && (
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
              <span style={{ fontSize: 10.5, padding: "2px 6px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4, marginRight: 6 }}>{flat.supplier}</span>
              quoted{flat.quotedDaysAgo === 0 ? " just now" : ` ${flat.quotedDaysAgo}d ago`}
            </div>
          )}
          {flat.moqNote && (
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{flat.moqNote}</div>
          )}
        </div>
      )}

      {/* Ghost rows so the formula is still visible — labelled clearly */}
      {formula.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "10px 14px 12px" }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 6 }}>
            Included in mfg price
          </div>
          {formula.map((f, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11.5, color: "var(--ink-2)" }}>
              <span>{f.ingredient}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}>{f.dose}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI invoice/quote extractor ─────────────────────────────────────
// Ronel pastes raw text from a vendor email/invoice/PDF copy-paste.
// Claude Haiku parses it into {name, dose, pricePerKg, supplier} rows
// which get merged into the cost-pass on confirm.
function AiInvoiceModal({ p, onClose, onDecide }) {
  const [input, setInput] = useCPState("");
  const [busy, setBusy] = useCPState(false);
  const [parsed, setParsed] = useCPState(null);
  const [err, setErr] = useCPState(null);

  const parse = async () => {
    if (!input.trim()) return;
    setBusy(true); setErr(null); setParsed(null);
    const formulaList = (p.niche?.current?.formula || []).map(f => `- ${f.ingredient} (${f.dose})`).join("\n");
    const prompt = `Extract ingredient pricing from the supplier text below. Return ONLY a JSON array (no prose, no code fence) of objects: [{"name":"<ingredient>","dose":"<dose if present, else null>","pricePerKg":<number>,"supplier":"<supplier name if known, else null>"}]
The product's known formula is:
${formulaList || "(unknown — extract whatever you find)"}

Match extracted ingredients to the formula names where possible (case-insensitive). Convert prices to USD per kilogram when possible (if the source is $/g, multiply by 1000; if $/lb, divide by 2.2046).

SUPPLIER TEXT:
${input.trim()}`;
    try {
      const out = await window.claude.complete(prompt);
      // Strip code fences if Claude added them anyway
      const cleaned = out.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      const arr = JSON.parse(cleaned);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("No rows extracted");
      setParsed(arr);
    } catch (e) {
      setErr("Couldn't parse that. Try cleaner text — ingredient name, $/kg price, supplier per line.");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!parsed) return;
    onDecide("__costPassAiExtract", null, JSON.stringify(parsed));
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg)", borderRadius: 12, width: 620, maxWidth: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>✨ AI invoice extract</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Paste supplier quote or invoice text</div>
        </div>

        <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
          <textarea autoFocus value={input} onChange={e => setInput(e.target.value)}
            placeholder={`Paste anything — vendor email, invoice copy, JiaHerb price sheet…\n\ne.g.\nAshwagandha KSM-66    $42/kg    Ixoreal\nL-Theanine            $185/kg   Suntheanine\nMagnesium glycinate   $18/kg    Albion`}
            style={{ width: "100%", minHeight: 160, padding: 10, fontSize: 12.5, fontFamily: "var(--font-mono)", border: "1px solid var(--line-2)", borderRadius: 6, resize: "vertical", lineHeight: 1.5 }} />

          {err && <div style={{ marginTop: 10, padding: 10, background: "oklch(96% 0.05 30)", border: "1px solid oklch(85% 0.12 30)", borderRadius: 6, fontSize: 12, color: "oklch(40% 0.18 30)" }}>{err}</div>}

          {parsed && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 6 }}>
                Extracted {parsed.length} row{parsed.length === 1 ? "" : "s"}
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
                {parsed.map((row, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr", gap: 10, padding: "8px 12px", fontSize: 12, borderBottom: idx < parsed.length - 1 ? "1px solid var(--line)" : "none", alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>{row.name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{row.dose || "—"}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>${row.pricePerKg}/kg</span>
                    <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{row.supplier || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", background: "var(--bg-2)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          {!parsed && <button className="btn sm primary" disabled={!input.trim() || busy} onClick={parse}>{busy ? "Parsing…" : "Extract with AI"}</button>}
          {parsed && <button className="btn sm" onClick={() => setParsed(null)}>Re-extract</button>}
          {parsed && <button className="btn sm primary" onClick={apply}>Apply {parsed.length} row{parsed.length === 1 ? "" : "s"} →</button>}
        </div>
      </div>
    </div>
  );
}

// ── Encapsulating / tolling cost row (inline editable) ─────────────
// Bundles desiccant, shrinkband, and the mfg's per-unit run charge.
// Optional — defaults to 0 if Ronel hasn't entered one. Click ✎ to edit
// or "+ add" if not yet set. Persisted on costPass.summary.encapsulatingCost.
function EncapCostRow({ p, encapCost, onDecide }) {
  const [editing, setEditing] = useCPState(false);
  const [val, setVal] = useCPState(encapCost ? String(encapCost) : "");
  const isSet = encapCost > 0;
  const commit = () => {
    onDecide && onDecide("__costPassEncap", null, val || "0");
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="cp-summary-row" style={{ alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>Encapsulating</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>$</span>
          <input
            autoFocus
            type="number" step="0.01" min="0"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            style={{ width: 60, fontSize: 12, fontFamily: "var(--font-mono)", padding: "2px 4px", border: "1px solid var(--line-2)", borderRadius: 3, textAlign: "right" }}
          />
          <button className="btn xs primary" style={{ padding: "1px 6px", fontSize: 10 }} onClick={commit}>OK</button>
          <button className="btn xs" style={{ padding: "1px 6px", fontSize: 10 }} onClick={() => setEditing(false)}>×</button>
        </span>
      </div>
    );
  }
  return (
    <div className="cp-summary-row">
      <span title="Bundles desiccant, shrinkband, and the mfg's per-unit run charge.">
        Encapsulating
      </span>
      {isSet ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span className="mono">${encapCost.toFixed(2)}</span>
          <button className="cp-edit-btn" onClick={() => { setVal(String(encapCost)); setEditing(true); }} title="Edit">✎</button>
        </span>
      ) : (
        <button
          onClick={() => { setVal(""); setEditing(true); }}
          style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 11, cursor: "pointer", padding: 0, fontStyle: "italic" }}
          title="Bundles desiccant, shrinkband, and the mfg's per-unit run charge.">
          + add
        </button>
      )}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { CostPassDash, CostPassCard });