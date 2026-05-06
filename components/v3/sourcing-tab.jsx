/* global React, RD2, PIPELINE_DATA */
const { useState: useSS, useMemo: useMSS } = React;

// ============================================================
// SOURCING TAB v3 — Ronel's vendor-quote workspace
//   • One card per ingredient
//   • Sole-source ingredients show locked single-vendor view
//   • Multi-source ingredients expand to a quote table
//   • Cost summary at top, spec sheet versions below
// ============================================================

// ============================================================
// SOURCING NOT-YET — empty state for products without bom/packaging.
// Mirrors the Formulation tab's "where you are in the process" pattern:
// shows the 3-step Sourcing arc, marks where this product is, and points
// forward (lock the PDS, run cost pass, mfg quote → THEN sourcing seeds).
// ============================================================

function SourcingNotYet({ p, setTab }) {
  // Where is the product?
  const g = p.rdGate || {};
  const pdsLocked = !!g.pdsLocked;
  const costPassDone = p.costPass?.status === "complete";
  const briefSent = !!g.briefSent;
  const sampleApproved = g.status === "approved";

  // Determine current arc step (1 → 4)
  let step = 1; // pre-PDS
  if (pdsLocked) step = 2; // cost-pass
  if (costPassDone) step = 3; // mfg quote / sample
  if (sampleApproved) step = 4; // sourcing imminent

  const arcSteps = [
    { n: 1, owner: "malik", label: "Lock the PDS",
      sub: "Malik finalizes ingredient list + doses in the spec sheet.",
      goTab: "spec" },
    { n: 2, owner: "joel", label: "Cost-pass clears margin",
      sub: "Joel runs $/bottle pass against the locked formula.",
      goTab: "production" },
    { n: 3, owner: "ronel", label: "Manufacturer quote + sample",
      sub: "Brief goes to mfg; quote and sample come back; Chesky approves.",
      goTab: "production" },
    { n: 4, owner: "ronel", label: "Sourcing seeds here",
      sub: "BOM + packaging materialize. Ronel quotes vendors for every line.",
      goTab: null },
  ];

  return (
    <div style={{ maxWidth: 760, padding: "8px 4px 40px" }}>
      {/* Headline */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", fontWeight: 600 }}>
          SOURCING · NOT YET ACTIVE
        </div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>
          {sampleApproved
            ? "About to begin — sample approved, BOM seeds shortly"
            : "Sourcing kicks in after the spec sheet locks and the manufacturer is briefed."}
        </h2>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
          Ronel doesn't quote vendors against a vague idea — he quotes against a <em>locked formula</em> that Malik wrote and Joel cost-passed. Until then, there's nothing to source.
        </div>
      </div>

      {/* Arc of 4 steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {arcSteps.map(s => {
          const isDone = s.n < step;
          const isCurrent = s.n === step;
          const isFuture = s.n > step;
          const owner = RD2.person(s.owner);
          return (
            <div
              key={s.n}
              style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "12px 14px",
                background: isCurrent ? "var(--accent-soft, oklch(96% 0.05 80))" : "var(--bg-card)",
                border: `1px solid ${isCurrent ? "var(--accent-line, oklch(85% 0.1 70))" : "var(--line)"}`,
                borderRadius: 10,
                opacity: isFuture ? 0.55 : 1,
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: isDone ? "var(--ok)" : isCurrent ? "var(--ink-1)" : "var(--bg-2)",
                color: isDone || isCurrent ? "white" : "var(--ink-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}>
                {isDone ? "✓" : s.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>{s.label}</div>
                  {owner && <RD2.Avatar user={owner} size="xs" />}
                  {owner && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{owner.name}</span>}
                  {isCurrent && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                      background: "var(--ink-1)", color: "white", letterSpacing: "0.06em"
                    }}>NOW</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>{s.sub}</div>
                {isCurrent && s.goTab && (
                  <button
                    className="btn sm"
                    style={{ marginTop: 10 }}
                    onClick={() => setTab && setTab(s.goTab)}
                  >
                    Open {s.goTab === "spec" ? "Spec Sheet" : "Production"} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* What sourcing will look like */}
      <div style={{
        padding: 14, border: "1px dashed var(--line)", borderRadius: 10,
        background: "var(--bg-2)",
      }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>
          WHEN SOURCING ACTIVATES
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.55 }}>
          Two tracks materialize: <strong>ingredients</strong> (sole-source vs. multi-vendor quote tables) and <strong>packaging</strong> (bottles, droppers, caps, labels, boxes, inserts). Ronel works each line until it's <span style={{ color: "var(--ok)", fontWeight: 600 }}>Locked</span>, and the running locked-cost total feeds Joel's margin model.
        </div>
      </div>
    </div>
  );
}

function SourcingTab({ p, setTab, onDecide }) {

  // Derive BOM if not materialized yet — keeps Sourcing in sync with the spec sheet
  // before any quote has been added. The handlers in app.jsx materialize on first write.
  const bom = (p.bom && p.bom.length > 0)
    ? p.bom
    : (p.specSheetV2 && window.__bomFromSpec ? (window.__bomFromSpec(p) || []) : []);

  if (bom.length === 0 && !p.packaging) {
    return <SourcingNotYet p={p} setTab={setTab} />;
  }

  const ronel = RD2.person("ronel");
  const ingMode = RD2.ingredientsSourcing(p);  // resolved: "we-supply" | "mfg-supply"
  const isDynamic = RD2.ingredientsSourcingIsDynamic(p);
  const mfg = p.manufacturerId ? (PIPELINE_DATA.MANUFACTURERS || []).find(m => m.id === p.manufacturerId) : null;

  // Locked / quoting counts (ingredients only)
  const lockedCount = bom.filter(b => b.status === "Locked").length;
  const quotingCount = bom.filter(b => b.status === "Quoting").length;
  const totalLocked = bom.reduce((sum, b) => {
    if (b.status !== "Locked" || !b.picked) return sum;
    const q = b.quotes.find(x => x.vendor === b.picked);
    if (!q || q.pricePerKg == null) return sum;
    return sum + (q.pricePerKg * b.kgNeeded);
  }, 0);

  // Packaging counts
  const pkgLocked = (p.packaging || []).filter(b => b.status === "Locked").length;
  const pkgQuoting = (p.packaging || []).filter(b => b.status === "Quoting").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>

      {/* ---------- Production Buy section (only on build/production stage) ---------- */}
      {(p.stage === "build" || p.stage === "production") && (
        <RD2.ProductionBuySection p={p} />
      )}

      {/* ---------- Header ---------- */}
      <div className="src-head">
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Sourcing</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12.5, color: "var(--ink-2)" }}>
            <span>Owner:</span>
            <RD2.Avatar user={ronel} size="sm" />
            <span>{ronel?.name}</span>
          </div>
        </div>
        <div className="src-stats">
          {ingMode === "we-supply" && bom.length > 0 && (
            <>
              <div className="src-stat"><div className="n">{bom.length}</div><div className="l">Ingredients</div></div>
              <div className="src-stat"><div className="n" style={{ color: "var(--ok)" }}>{lockedCount}</div><div className="l">Locked</div></div>
              {quotingCount > 0 && <div className="src-stat"><div className="n" style={{ color: "var(--warn)" }}>{quotingCount}</div><div className="l">Quoting</div></div>}
              <div className="src-stat"><div className="n">${totalLocked.toFixed(0)}</div><div className="l">Locked cost</div></div>
            </>
          )}
          {p.packaging && (
            <>
              <div className="src-stat"><div className="n">{p.packaging.length}</div><div className="l">Packaging</div></div>
              <div className="src-stat"><div className="n" style={{ color: "var(--ok)" }}>{pkgLocked}</div><div className="l">Pkg locked</div></div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Mode banner ---------- */}
      <div className={`src-mode-banner mode-${ingMode}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="src-mode-eyebrow">
              SOURCING MODE
              {isDynamic && <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 99, background: "oklch(94% 0.06 70)", color: "oklch(40% 0.15 70)", letterSpacing: "0.04em" }}>DYNAMIC · PER-PRODUCT</span>}
            </div>
            {ingMode === "we-supply" ? (
              <>
                <div className="src-mode-headline">We supply ingredients</div>
                <div className="src-mode-detail">
                  Ronel quotes &amp; ships every raw material directly to {mfg?.name || "the manufacturer"}, who executes against the locked spec sheet. {isDynamic && <span style={{ color: "var(--ink-3)" }}>For {RD2.type(p.type)?.label?.toLowerCase()} this varies per product — toggle to flip.</span>}
                </div>
              </>
            ) : (
              <>
                <div className="src-mode-headline">Manufacturer supplies ingredients</div>
                <div className="src-mode-detail">
                  {p.type === "tea"
                    ? <>For tea, Metro Tea ships the finished pre-blended tea — we never touch raw herbs. Our job here is packaging only.</>
                    : <>{mfg?.name || "The manufacturer"} sources raws against the locked spec sheet. We don't quote raw materials — only packaging. {isDynamic && <span style={{ color: "var(--ink-3)" }}>This was a per-product call — toggle to flip.</span>}</>
                  }
                </div>
              </>
            )}
          </div>
          {isDynamic && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
              <div style={{ fontSize: 9.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, textAlign: "right" }}>This product</div>
              <div className="src-mode-toggle">
                <button className={ingMode === "we-supply" ? "on" : ""} onClick={() => RD2.toast(`Sourcing mode → ${ingMode === "we-supply" ? "already we-supply" : "we-supply (demo)"}`)}>We supply</button>
                <button className={ingMode === "mfg-supply" ? "on" : ""} onClick={() => RD2.toast(`Sourcing mode → ${ingMode === "mfg-supply" ? "already mfg-supply" : "mfg-supply (demo)"}`)}>Mfg supplies</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Ingredients (only in we-supply mode) ---------- */}
      {ingMode === "we-supply" && bom.length > 0 && (
        <div>
          <div className="src-section-h">Ingredients <span className="count">{bom.length}</span>{!p.bom && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)", fontWeight: 400 }}>(from spec sheet)</span>}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bom.map((b, i) => <IngredientCard key={i} b={b} onDecide={onDecide} />)}
          </div>
        </div>
      )}

      {/* ---------- Mfg-supply note ---------- */}
      {ingMode === "mfg-supply" && (
        <div className="src-mfg-note">
          <div className="src-mfg-note-icon">⛁</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ingredients handled by {mfg?.name || "manufacturer"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>
              The locked spec sheet is the contract. Ronel doesn't track per-ingredient quotes for this product type — the manufacturer owns ingredient sourcing &amp; cost. Our job here is packaging only.
            </div>
            {p.specSheet && (
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setTab && setTab("spec")}>Open Spec Sheet →</button>
            )}
          </div>
        </div>
      )}

      {/* ---------- Packaging (always-on) ---------- */}
      {p.packaging?.length > 0 && (
        <div>
          <div className="src-section-h">
            Packaging <span className="count">{p.packaging.length}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>Always our job — bottles, droppers, caps, labels, boxes, inserts.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {p.packaging.map((b, i) => <PackagingCard key={i} b={b} onDecide={onDecide} />)}
          </div>
        </div>
      )}

      {/* Spec sheet pointer */}
      {p.specSheet && (
        <div className="src-spec-link">
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Spec Sheet · v{p.specSheet.currentVersion}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              The locked formula sent to the manufacturer. {p.specSheet.lockedAt ? "🔒 Locked" : "Working draft—not yet locked"}.
            </div>
          </div>
          <button className="btn sm" onClick={() => setTab && setTab("spec")}>Open Spec Sheet →</button>
        </div>
      )}
    </div>
  );
}

// ===== Packaging card =====
function PackagingCard({ b, onDecide }) {
  const [ordered, setOrdered]                 = React.useState(!!b.ordered);
  const [orderedDaysAgo, setOrderedDaysAgo]   = React.useState(b.orderedDaysAgo ?? null);
  const [open, setOpen]                       = useSS(!ordered && (b.status === "Quoting" || b.status === "Not started"));
  const [addingQuote, setAddingQuote]         = React.useState(false);
  const quotes = b.quotes || [];
  const pickedQuote = quotes?.find(q => q.vendor === b.picked);
  const isSoleSource = !!b.soleSource;
  const blockedByArt = isSoleSource && b.artworkApproved === false;

  // Sync local ordered state when prop changes (e.g. after onDecide round-trip)
  React.useEffect(() => {
    setOrdered(!!b.ordered);
    setOrderedDaysAgo(b.orderedDaysAgo ?? null);
  }, [b.ordered, b.orderedDaysAgo]);

  const handleToggleOrdered = (e) => {
    e.stopPropagation();
    if (!ordered) {
      if (blockedByArt) return; // can't order until artwork approved
      setOrdered(true);
      setOrderedDaysAgo(0); // "today"
      onDecide && onDecide("__sourcingMarkOrdered", `pkg:${b.code}`, true);
    } else {
      // unmark (mistake recovery)
      if (window.confirm(`Unmark ${b.component} as ordered?`)) {
        setOrdered(false);
        setOrderedDaysAgo(null);
        onDecide && onDecide("__sourcingMarkOrdered", `pkg:${b.code}`, false);
      }
    }
  };

  return (
    <div className={`ing-card ${ordered ? "ordered" : ""} ${b.status === "Quoting" ? "quoting" : ""}`}>
      <div className="ing-head" onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>{b.code}</span>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em", textTransform: "capitalize" }}>{b.component}</span>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{b.spec}</span>
          {isSoleSource && (
            <span className="ing-pill sole" title={`Locked vendor: ${b.picked}`}>🔒 {b.picked}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{b.qty?.toLocaleString()} ea</span>
          {b.status === "Locked" && pickedQuote?.pricePerUnit != null && (
            <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>${pickedQuote.pricePerUnit.toFixed(2)}/ea</span>
          )}
          {/* ORDER STATUS — the new one-click toggle Ronel asked for */}
          {ordered ? (
            <span className="ing-status s-ordered" title={`Ordered ${orderedDaysAgo === 0 ? "today" : orderedDaysAgo + "d ago"}`}>
              📦 ORDERED {orderedDaysAgo === 0 ? "today" : orderedDaysAgo + "d ago"}
            </span>
          ) : isSoleSource ? (
            <button
              className={`btn sm ${blockedByArt ? "" : "primary"}`}
              style={{ fontSize: 10.5, padding: "3px 9px" }}
              onClick={handleToggleOrdered}
              disabled={blockedByArt}
              title={blockedByArt ? "Artwork must be approved before ordering" : `Send PO to ${b.picked}`}
            >
              {blockedByArt ? "⚠ Awaiting artwork" : "Mark ordered"}
            </button>
          ) : (
            <span className={`ing-status s-${b.status.toLowerCase().replace(/\s/g, "-")}`}>
              {b.status === "Locked" ? "✓ LOCKED"
                : b.status === "Quoting" ? "⏱ QUOTING"
                : "○ NOT STARTED"}
            </span>
          )}
          <span style={{ fontSize: 14, color: "var(--ink-3)", width: 12, textAlign: "center" }}>{open ? "▾" : "▸"}</span>
        </div>
      </div>
      {open && (
        <div className="ing-body">
          {/* Sole-source vendors get a compact lockup, not a comparison table */}
          {isSoleSource ? (
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Locked vendor</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{b.picked}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{pickedQuote?.contact}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>$/unit</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>${pickedQuote?.pricePerUnit?.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Lead</div>
                <div className="mono" style={{ fontSize: 13, marginTop: 2 }}>{pickedQuote?.lead}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Artwork</div>
                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2, color: b.artworkApproved ? "var(--ok)" : "var(--warn)" }}>
                  {b.artworkApproved ? "✓ Approved" : "⏱ In review"}
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {ordered ? (
                  <>
                    <button className="btn sm" style={{ fontSize: 11 }} onClick={() => RD2.toast(`Opening PO for ${pkg.code}`)}>View PO</button>
                    <button className="btn sm" style={{ fontSize: 11 }} onClick={handleToggleOrdered}>Unmark</button>
                  </>
                ) : (
                  <button className="btn sm" style={{ fontSize: 11 }} onClick={() => RD2.toast(`RFQ sent to ${pkg.code} vendors`, "ok")}>Send to vendor</button>
                )}
              </div>
            </div>
          ) : quotes?.length > 0 ? (
            <table className="ing-quotes">
              <thead>
                <tr><th>Vendor</th><th>Contact</th><th>$/unit</th><th>MOQ</th><th>Lead</th><th>Stock</th><th>{b.status === "Locked" ? "Decision" : "Pick"}</th></tr>
              </thead>
              <tbody>
                {quotes.map((q, i) => {
                  const isPicked = q.vendor === b.picked;
                  return (
                    <tr key={i} className={isPicked ? "picked" : ""}>
                      <td><div style={{ fontWeight: 600 }}>{q.vendor}</div></td>
                      <td className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{q.contact || "—"}</td>
                      <td className="mono">{q.pricePerUnit != null ? `$${q.pricePerUnit.toFixed(2)}` : "—"}</td>
                      <td className="mono">{q.moq?.toLocaleString()}</td>
                      <td className="mono">{q.lead}</td>
                      <td>{q.inStock ? <span style={{ color: "var(--ok)" }}>✓</span> : <span style={{ color: "var(--warn)" }}>○</span>}</td>
                      <td>
                        {isPicked ? <span className="ing-pick going">● GOING WITH</span>
                         : b.status === "Locked" ? <span className="ing-pick passed">○ pass</span>
                         : <button className="btn sm" style={{ fontSize: 10.5, padding: "2px 7px" }} onClick={() => {
                            onDecide && onDecide("__sourcingPickQuote", `pkg:${b.code}`, q.vendor);
                            RD2.toast(`Picked ${q.vendor} for ${b.component || b.code}`, "ok");
                          }}>Pick</button>}
                      </td>
                    </tr>
                  );
                })}
                {b.status !== "Locked" && (
                  addingQuote ? (
                    <AddQuoteFormRow
                      colSpan={7}
                      mode="unit"
                      onCancel={() => setAddingQuote(false)}
                      onSave={(q) => {
                        onDecide && onDecide("__sourcingAddQuote", `pkg:${b.code}`, q);
                        setAddingQuote(false);
                        RD2.toast(`Added quote from ${q.vendor}`, "ok");
                      }}
                    />
                  ) : (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 8 }}>
                      <button className="btn sm" style={{ fontSize: 11 }} onClick={() => setAddingQuote(true)}>+ Add quote</button>
                    </td></tr>
                  )
                )}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 20, fontSize: 12 }}>
              {addingQuote ? (
                <table className="ing-quotes"><tbody>
                  <AddQuoteFormRow
                    colSpan={7}
                    mode="unit"
                    onCancel={() => setAddingQuote(false)}
                    onSave={(q) => {
                      onDecide && onDecide("__sourcingAddQuote", `pkg:${b.code}`, q);
                      setAddingQuote(false);
                      RD2.toast(`Added quote from ${q.vendor}`, "ok");
                    }}
                  />
                </tbody></table>
              ) : (
                <>No quotes yet. <button className="btn sm" style={{ fontSize: 11, marginLeft: 8 }} onClick={() => setAddingQuote(true)}>+ Add first quote</button></>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== One ingredient card =====
function IngredientCard({ b, onDecide }) {
  const [open, setOpen] = useSS(b.status === "Quoting"); // auto-open if still quoting
  const [addingQuote, setAddingQuote] = React.useState(false);
  const quotes = b.quotes || [];
  const pickedQuote = quotes.find(q => q.vendor === b.picked);
  const cheapestQuote = [...quotes].filter(q => q.pricePerKg != null).sort((a, b) => a.pricePerKg - b.pricePerKg)[0];

  return (
    <div className={`ing-card ${b.soleSource ? "sole" : ""} ${b.status === "Quoting" ? "quoting" : ""}`}>

      {/* header row */}
      <div className="ing-head" onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>{b.code}</span>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em" }}>{b.ingredient}</span>
          {b.soleSource && <span className="ing-pill sole">🔒 SOLE SOURCE</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{b.kgNeeded} kg</span>
          {b.status === "Locked" && pickedQuote && (
            <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>${pickedQuote.pricePerKg.toFixed(2)}/kg</span>
          )}
          <span className={`ing-status s-${b.status.toLowerCase()}`}>{b.status === "Locked" ? "✓ LOCKED" : "⏱ QUOTING"}</span>
          <span style={{ fontSize: 14, color: "var(--ink-3)", width: 12, textAlign: "center" }}>{open ? "▾" : "▸"}</span>
        </div>
      </div>

      {/* body when open */}
      {open && (
        <div className="ing-body">
          <div className="ing-spec">
            <span style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Spec</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{b.spec}</span>
          </div>

          {/* quotes table */}
          <table className="ing-quotes">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>$/kg</th>
                <th>MOQ</th>
                <th>Lead</th>
                <th>Stock</th>
                <th>Sample</th>
                <th>{b.status === "Locked" ? "Decision" : "Pick"}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => {
                const isPicked = q.vendor === b.picked;
                const isCheapest = cheapestQuote && q.vendor === cheapestQuote.vendor && quotes.length > 1 && !b.soleSource;
                return (
                  <tr key={i} className={isPicked ? "picked" : ""}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.vendor}</div>
                      {q.note && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{q.note}</div>}
                    </td>
                    <td className="mono">{q.pricePerKg != null ? `$${q.pricePerKg.toFixed(2)}` : "—"}{isCheapest && <span style={{ fontSize: 9.5, color: "var(--ok)", marginLeft: 4 }}>↓</span>}</td>
                    <td className="mono">{q.moq}</td>
                    <td className="mono">{q.lead}</td>
                    <td>{q.inStock ? <span style={{ color: "var(--ok)" }}>✓</span> : <span style={{ color: "var(--warn)" }}>○</span>}</td>
                    <td style={{ fontSize: 11, textTransform: "capitalize", color: "var(--ink-2)" }}>{q.sample}</td>
                    <td>
                      {b.soleSource ? <span style={{ fontSize: 11, color: "var(--ink-3)" }}>only option</span>
                       : isPicked ? <span className="ing-pick going">● GOING WITH</span>
                       : b.status === "Locked" ? <span className="ing-pick passed">○ pass</span>
                       : <button className="btn sm" style={{ fontSize: 10.5, padding: "2px 7px" }} onClick={() => {
                            onDecide && onDecide("__sourcingPickQuote", `bom:${b.code}`, q.vendor);
                            RD2.toast(`Picked ${q.vendor} for ${b.ingredient || b.code}`, "ok");
                          }}>Pick</button>}
                    </td>
                  </tr>
                );
              })}
              {b.status !== "Locked" && (
                addingQuote ? (
                  <AddQuoteFormRow
                    colSpan={7}
                    mode="kg"
                    ingredientName={b.ingredient}
                    onCancel={() => setAddingQuote(false)}
                    onSave={(q) => {
                      onDecide && onDecide("__sourcingAddQuote", `bom:${b.code}`, q);
                      setAddingQuote(false);
                      RD2.toast(`Added quote from ${q.vendor}`, "ok");
                    }}
                  />
                ) : (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 8 }}>
                    <button className="btn sm" style={{ fontSize: 11 }} onClick={() => setAddingQuote(true)}>+ Add quote</button>
                  </td></tr>
                )
              )}
            </tbody>
          </table>

          {/* rationale */}
          {b.rationale && (
            <div className="ing-rationale">
              <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)", fontWeight: 600 }}>Ronel's note</span>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, fontStyle: "italic" }}>"{b.rationale}"</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Spec Sheet TAB (now its own top-level tab) =====
function SpecSheetTab({ p }) {
  if (!p.specSheet) {
    return (
      <div className="empty" style={{ padding: 30 }}>
        <div style={{ fontSize: 13 }}>No spec sheet yet. The first version is created when niche analysis is approved.</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 }}>
      <SpecSheetSection specSheet={p.specSheet} bom={p.bom} />
    </div>
  );
}

// ===== Spec Sheet versioning =====
function SpecSheetSection({ specSheet, bom }) {
  const [openVersion, setOpenVersion] = useSS(specSheet.currentVersion);
  const [compareMode, setCompareMode] = useSS(false);
  const [compareLeft, setCompareLeft] = useSS(specSheet.currentVersion - 1);
  const [compareRight, setCompareRight] = useSS(specSheet.currentVersion);

  const versions = [...specSheet.versions].sort((a, b) => b.v - a.v);

  return (
    <div className="spec-section">
      <div className="spec-head">
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Spec Sheet</h3>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
            {versions.length} versions · {specSheet.lockedAt
              ? <>🔒 Locked & sent to manufacturer</>
              : <>Working draft — not yet locked</>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn sm ${compareMode ? "primary" : ""}`} onClick={() => setCompareMode(c => !c)}>
            {compareMode ? "Exit compare" : "Compare versions"}
          </button>
          <button className="btn sm" onClick={() => RD2.toast(`Spec v${(specSheet.versions?.length || 0) + 1} uploaded`, "ok")}>+ Upload new version</button>
          {!specSheet.lockedAt && <button className="btn sm primary" onClick={() => RD2.toast("Spec locked & sent to manufacturer", "ok")}>🔒 Lock & send to mfr</button>}
        </div>
      </div>

      {/* version timeline */}
      <div className="spec-timeline">
        {versions.map(ver => {
          const author = RD2.person(ver.by);
          const isCurrent = ver.v === specSheet.currentVersion;
          const isOpen = ver.v === openVersion;
          return (
            <button
              key={ver.v}
              className={`spec-ver-row ${isCurrent ? "current" : ""} ${isOpen ? "active" : ""}`}
              onClick={() => { setOpenVersion(ver.v); setCompareMode(false); }}
            >
              <span className={`spec-ver-dot ${isCurrent ? "current" : ""}`}>{isCurrent ? "●" : "○"}</span>
              <span className="mono" style={{ fontWeight: 600, width: 28 }}>v{ver.v}</span>
              {isCurrent && <span className="spec-ver-badge">CURRENT</span>}
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ver.note}</span>
              {author && <RD2.Avatar user={author} size="sm" />}
              <span style={{ fontSize: 11, color: "var(--ink-3)", width: 60, textAlign: "right" }}>{RD2.daysAgoLabel(ver.daysAgo)}</span>
            </button>
          );
        })}
      </div>

      {/* version body — single OR compare */}
      {compareMode ? (
        <SpecSheetCompare left={specSheet.versions.find(v => v.v === compareLeft)} right={specSheet.versions.find(v => v.v === compareRight)}
          onChangeLeft={setCompareLeft} onChangeRight={setCompareRight} versions={specSheet.versions} />
      ) : (
        <SpecSheetView ver={specSheet.versions.find(v => v.v === openVersion)} isCurrent={openVersion === specSheet.currentVersion} />
      )}
    </div>
  );
}

function SpecSheetView({ ver, isCurrent }) {
  if (!ver) return null;
  return (
    <div className="spec-body">
      <div className="spec-body-head">
        <div>
          <span className="mono" style={{ fontWeight: 600, fontSize: 14 }}>v{ver.v}</span>
          {isCurrent && <span className="spec-ver-badge" style={{ marginLeft: 8 }}>CURRENT</span>}
          <span style={{ marginLeft: 12, fontSize: 12, color: "var(--ink-3)" }}>{ver.note}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{ver.source || ""}</div>
      </div>
      <table className="spec-table">
        <thead><tr><th>Ingredient</th><th>Dose</th><th>Supplier</th></tr></thead>
        <tbody>
          {ver.ingredients.map((ing, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{ing.name}</td>
              <td className="mono">{ing.dose}</td>
              <td style={{ color: ing.supplier === "TBD" ? "var(--warn)" : "var(--ink-2)", fontSize: 12.5 }}>{ing.supplier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpecSheetCompare({ left, right, onChangeLeft, onChangeRight, versions }) {
  if (!left || !right) return null;
  const diff = useMSS(() => computeDiff(left, right), [left.v, right.v]);
  return (
    <div className="spec-compare">
      <div className="spec-compare-head">
        <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Compare</span>
        <select className="spec-ver-select" value={left.v} onChange={e => onChangeLeft(parseInt(e.target.value))}>
          {versions.map(v => <option key={v.v} value={v.v}>v{v.v} — {v.note.slice(0, 40)}</option>)}
        </select>
        <span style={{ color: "var(--ink-3)", fontSize: 14 }}>→</span>
        <select className="spec-ver-select" value={right.v} onChange={e => onChangeRight(parseInt(e.target.value))}>
          {versions.map(v => <option key={v.v} value={v.v}>v{v.v} — {v.note.slice(0, 40)}</option>)}
        </select>
      </div>

      {/* AI summary */}
      <div className="spec-ai">
        <div className="spec-ai-head">
          <span style={{ fontSize: 13 }}>✦</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pipeline AI · plain-English diff</span>
        </div>
        <div className="spec-ai-body">{aiSummary(left, right, diff)}</div>
        {(diff.added.length > 0 || diff.removed.length > 0 || diff.changed.some(c => c.field === "supplier")) && (
          <div className="spec-ai-flag">⚠ Manufacturer notification likely required — formula or supplier change</div>
        )}
      </div>

      {/* structured diff */}
      <div className="spec-diff-grid">
        {diff.added.length > 0 && (
          <div className="spec-diff-block added">
            <div className="spec-diff-h">+ ADDED ({diff.added.length})</div>
            {diff.added.map((ing, i) => (
              <div key={i} className="spec-diff-row">
                <strong>{ing.name}</strong> · {ing.dose} · <span style={{ color: "var(--ink-3)" }}>{ing.supplier}</span>
              </div>
            ))}
          </div>
        )}
        {diff.removed.length > 0 && (
          <div className="spec-diff-block removed">
            <div className="spec-diff-h">– REMOVED ({diff.removed.length})</div>
            {diff.removed.map((ing, i) => (
              <div key={i} className="spec-diff-row">
                <strong>{ing.name}</strong> · {ing.dose} · <span style={{ color: "var(--ink-3)" }}>{ing.supplier}</span>
              </div>
            ))}
          </div>
        )}
        {diff.changed.length > 0 && (
          <div className="spec-diff-block changed">
            <div className="spec-diff-h">~ CHANGED ({diff.changed.length})</div>
            {diff.changed.map((c, i) => (
              <div key={i} className="spec-diff-row">
                <strong>{c.name}</strong> · {c.field}: <span style={{ textDecoration: "line-through", color: "var(--ink-3)" }}>{c.from}</span> → <span style={{ color: "var(--ink)", fontWeight: 600 }}>{c.to}</span>
              </div>
            ))}
          </div>
        )}
        {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", textAlign: "center", padding: 24 }}>No differences between v{left.v} and v{right.v}.</div>
        )}
      </div>
    </div>
  );
}

// ===== Diff helpers =====
function computeDiff(left, right) {
  const leftMap = Object.fromEntries(left.ingredients.map(i => [i.name, i]));
  const rightMap = Object.fromEntries(right.ingredients.map(i => [i.name, i]));
  const added = right.ingredients.filter(i => !leftMap[i.name]);
  const removed = left.ingredients.filter(i => !rightMap[i.name]);
  const changed = [];
  for (const name in rightMap) {
    if (!leftMap[name]) continue;
    const a = leftMap[name], b = rightMap[name];
    if (a.dose !== b.dose) changed.push({ name, field: "dose", from: a.dose, to: b.dose });
    if (a.supplier !== b.supplier) changed.push({ name, field: "supplier", from: a.supplier, to: b.supplier });
  }
  return { added, removed, changed };
}

function aiSummary(left, right, diff) {
  const parts = [];
  if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
    return `v${left.v} and v${right.v} are identical — likely a no-op version bump or note-only change.`;
  }
  if (diff.added.length > 0) {
    parts.push(`Added ${diff.added.length} ingredient${diff.added.length > 1 ? "s" : ""} (${diff.added.map(a => a.name).join(", ")})`);
  }
  if (diff.removed.length > 0) {
    parts.push(`removed ${diff.removed.length} ingredient${diff.removed.length > 1 ? "s" : ""} (${diff.removed.map(r => r.name).join(", ")})`);
  }
  const supplierSwaps = diff.changed.filter(c => c.field === "supplier");
  const doseChanges = diff.changed.filter(c => c.field === "dose");
  if (supplierSwaps.length > 0) {
    parts.push(`swapped suppliers on ${supplierSwaps.length} (${supplierSwaps.map(s => s.name).join(", ")})`);
  }
  if (doseChanges.length > 0) {
    parts.push(`adjusted ${doseChanges.length} dose${doseChanges.length > 1 ? "s" : ""}`);
  }
  let summary = `v${left.v} → v${right.v}: ` + parts.join(", ") + ".";

  // Heuristic verdict
  const formulaChange = diff.added.length > 0 || diff.removed.length > 0 || doseChanges.length > 0;
  const supplierOnly = !formulaChange && supplierSwaps.length > 0;
  if (formulaChange) {
    summary += " This is a formula change — re-notify manufacturer and update label claims if dose changed.";
  } else if (supplierOnly) {
    summary += " Supplier-only change. Cost may shift; manufacturer should be notified but no formula impact.";
  }
  return summary;
}

// ===== Inline "+ Add quote" form row =====
// Used by both IngredientCard ($/kg) and PackagingCard ($/unit).
// mode: "kg" → 8 columns (vendor, contact, $/kg, MOQ, lead, stock, sample, action)
// mode: "unit" → 7 columns (vendor, contact, $/unit, MOQ, lead, stock, action)
function AddQuoteFormRow({ colSpan, mode, onSave, onCancel, ingredientName = "" }) {
  // Trademark lookup — same data + rules as the cost-pass MultiQuoteRow.
  // Locked sole-source ingredients (KSM-66, Sensoril, Uthever NMN, etc.) restrict
  // vendor to brand-holder + authorized resellers. Otherwise free text with
  // datalist autocomplete from INGREDIENT_SUPPLIERS.
  const PD = window.PIPELINE_DATA || {};
  const trademark = React.useMemo(() => {
    const tms = PD.TRADEMARKED_INGREDIENTS || [];
    const n = (ingredientName || "").toLowerCase();
    if (!n) return null;
    return tms.find(t => {
      const matches = [t.name, t.tradeName, ...(t.aliases || [])].filter(Boolean);
      return matches.some(m => n.includes(m.toLowerCase()));
    }) || null;
  }, [ingredientName]);
  const isLocked = !!(trademark && trademark.soleSource);
  const authorizedVendors = React.useMemo(() => {
    if (!isLocked) return null;
    const suppliers = PD.INGREDIENT_SUPPLIERS || [];
    const ids = [trademark.brandHolder, ...(trademark.authorizedResellers || [])].filter(Boolean);
    return ids.map(id => {
      const s = suppliers.find(x => x.id === id);
      return s ? { id: s.id, name: s.name } : { id, name: id };
    });
  }, [isLocked, trademark]);

  const [vendor, setVendor]     = React.useState("");
  const [contact, setContact]   = React.useState("");
  const [price, setPrice]       = React.useState("");
  const [moq, setMoq]           = React.useState("");
  const [lead, setLead]         = React.useState("");
  const [inStock, setInStock]   = React.useState(true);
  const vendorRef = React.useRef(null);

  React.useEffect(() => { vendorRef.current?.focus(); }, []);

  const canSave = vendor.trim().length > 0 && price.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const priceNum = parseFloat(price);
    const q = {
      vendor: vendor.trim(),
      contact: contact.trim() || "",
      moq: moq.trim() || (mode === "kg" ? "—" : 0),
      lead: lead.trim() || "TBD",
      inStock,
      sample: "pending",
      ...(mode === "kg"
        ? { pricePerKg: isNaN(priceNum) ? null : priceNum }
        : { pricePerUnit: isNaN(priceNum) ? null : priceNum }),
    };
    onSave(q);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  };

  const inputStyle = {
    width: "100%",
    padding: "4px 6px",
    border: "1px solid var(--line-2, #d6d3cd)",
    borderRadius: 4,
    fontSize: 11.5,
    background: "var(--paper, #fff)",
    color: "var(--ink-1)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const inputMono = { ...inputStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

  return (
    <tr style={{ background: "var(--accent-tint, #fff8ee)" }}>
      <td>
        {isLocked ? (
          authorizedVendors && authorizedVendors.length === 1 ? (
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 4, background: "var(--bg-2)", color: "var(--ink-2)" }} title="Sole-source — only one authorized vendor">
              <span style={{ color: "var(--warn)" }}>🔒</span>
              <span>{(vendor || authorizedVendors[0].name)}</span>
              {!vendor && (() => { setTimeout(() => setVendor(authorizedVendors[0].name), 0); return null; })()}
            </div>
          ) : (
            <select ref={vendorRef} style={inputStyle} value={vendor} onChange={e => setVendor(e.target.value)} onKeyDown={handleKey}>
              <option value="">— authorized only —</option>
              {(authorizedVendors || []).map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          )
        ) : (
          <>
            <input ref={vendorRef} style={inputStyle} placeholder="Vendor name" value={vendor} onChange={e => setVendor(e.target.value)} onKeyDown={handleKey} list="sourcing-suppliers" autoComplete="off" />
            <datalist id="sourcing-suppliers">
              {(PD.INGREDIENT_SUPPLIERS || []).map(s => <option key={s.id} value={s.name} />)}
            </datalist>
          </>
        )}
      </td>
      {mode === "unit" && (
        <td><input style={inputStyle} placeholder="contact" value={contact} onChange={e => setContact(e.target.value)} onKeyDown={handleKey} /></td>
      )}
      <td><input style={inputMono} placeholder={mode === "kg" ? "$/kg" : "$/ea"} value={price} onChange={e => setPrice(e.target.value)} onKeyDown={handleKey} inputMode="decimal" /></td>
      <td><input style={inputMono} placeholder="MOQ" value={moq} onChange={e => setMoq(e.target.value)} onKeyDown={handleKey} /></td>
      <td><input style={inputMono} placeholder="lead" value={lead} onChange={e => setLead(e.target.value)} onKeyDown={handleKey} /></td>
      <td>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
          <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} style={{ margin: 0 }} />
          stock
        </label>
      </td>
      {mode === "kg" && (
        <td style={{ fontSize: 11, color: "var(--ink-3)" }}>pending</td>
      )}
      <td>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn sm primary"
            style={{ fontSize: 10.5, padding: "2px 7px", opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }}
            onClick={handleSave}
            disabled={!canSave}
            title="Save (Enter)"
          >Save</button>
          <button
            className="btn sm"
            style={{ fontSize: 10.5, padding: "2px 7px" }}
            onClick={onCancel}
            title="Cancel (Esc)"
          >✕</button>
        </div>
      </td>
    </tr>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { SourcingTab, SpecSheetTab });
