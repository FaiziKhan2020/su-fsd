// ============================================================
// PURCHASE ORDERS PANEL — Production tab
//
// Per-ingredient PO lifecycle once a quote winner is picked:
//   1. quoting       → Ronel still collecting prices
//   2. picked        → Winner chosen, ready to send PO
//   3. po-sent       → PO sent to vendor, awaiting acceptance
//   4. po-approved   → Vendor confirmed, payment terms set
//   5. ordered       → Paid / in production at vendor
//   6. delivered     → At our warehouse OR shipped direct to mfg
//
// When all rows hit 'delivered' → banner unblocks "Start production" CTA.
// ============================================================

const { useState: usePO } = React;

const PO_STATES = [
  { id: "quoting",      label: "Quoting",      short: "QT", color: "var(--ink-3)" },
  { id: "picked",       label: "Picked",       short: "PK", color: "var(--accent, #2563eb)" },
  { id: "po-sent",      label: "PO sent",      short: "PS", color: "var(--accent, #2563eb)" },
  { id: "po-approved",  label: "PO approved",  short: "PA", color: "oklch(55% 0.16 270)" },
  { id: "ordered",      label: "Ordered",      short: "OR", color: "oklch(60% 0.14 60)" },
  { id: "delivered",    label: "Delivered",    short: "DL", color: "var(--ok)" },
];
const PO_STATE_INDEX = Object.fromEntries(PO_STATES.map((s, i) => [s.id, i]));

function PurchaseOrdersPanel({ p, setTab, onDecide }) {
  const bom = p.bom || [];
  if (bom.length === 0) return null;

  const allDelivered = bom.every(b => b.poStatus === "delivered");
  const anyOrdered = bom.some(b => ["ordered", "delivered"].includes(b.poStatus));

  // Production-start state — derived from product field, but we also infer
  // "ready to start" when all delivered.
  const productionStarted = p.productionStartedAt || p.productionStatus === "started";

  // Compute the FULL production-release gate. Ingredients delivered is necessary
  // but not sufficient — we also want sample approved + label/box/insert approved
  // + listing live. Surface each unmet gate so the user can jump to it.
  const gates = computeProductionGates(p);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ---------- All-delivered banner / Start production CTA ---------- */}
      <PoStartProductionBanner
        p={p}
        allDelivered={allDelivered}
        anyOrdered={anyOrdered}
        productionStarted={productionStarted}
        gates={gates}
        setTab={setTab}
        onDecide={onDecide}
      />

      {/* ---------- Per-ingredient ladder ---------- */}
      <div className="rd-card" style={{ padding: 0 }}>
        <div className="rd-card-h">
          <div>
            <div className="rd-head-eyebrow" style={{ marginBottom: 2 }}>PRODUCTION · PURCHASE ORDERS</div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ingredient PO tracker</h3>
          </div>
          <span className="meta">{bom.filter(b => b.poStatus === "delivered").length}/{bom.length} delivered</span>
        </div>
        <div>
          {bom.map((line, i) => (
            <PoLadderRow key={line.code || i} line={line} p={p} onDecide={onDecide} last={i === bom.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Production gates — the full set of conditions for releasing the batch.
// We don't just check ingredient delivery; we also require sample approval,
// label/box/insert approved, listing approved, and capsule fit confirmed.
// Each gate surfaces in the banner with a deep-link to its tab.
// ============================================================
function computeProductionGates(p) {
  const bom = p.bom || [];
  const ingredientsDelivered = bom.length > 0 && bom.every(b => b.poStatus === "delivered");

  // Sample approved (Formulation gate already required to pass into Build,
  // but we double-check; admin override during Formulation could push through).
  const sampleApproved = p.rdGate?.status === "approved";

  // Capsule-fit confirmation (capsule SKUs only; non-gating during Sourcing,
  // but we surface it as a release-quality check).
  const isCapsule = p.type === "capsule";
  const capFitConfirmed = !isCapsule || !!p.rdGate?.capsuleFitConfirmation?.confirmed;

  // Streams: design covers label/box/insert; listing covers Amazon copy approval.
  const designStatus = p.streams?.design?.status || "Not started";
  const designApproved = ["Approved", "Locked", "Done"].includes(designStatus);

  const listingStatus = p.streams?.listing?.status || "Not started";
  const listingApproved = ["Approved", "Submitted", "Live"].includes(listingStatus);

  return [
    { id: "ingredients", label: "All ingredients delivered", ok: ingredientsDelivered, tab: "production",
      detail: ingredientsDelivered ? `${bom.length}/${bom.length} at mfg` : `${bom.filter(b => b.poStatus === "delivered").length}/${bom.length} delivered` },
    { id: "sample", label: "Sample approved", ok: sampleApproved, tab: "sampling",
      detail: sampleApproved ? "Chesky signed off" : "Awaiting sign-off in Sampling" },
    isCapsule && { id: "capfit", label: "Capsule fit confirmed", ok: capFitConfirmed, tab: "sampling",
      detail: capFitConfirmed ? "Mfg verified fill %" : "Mfg hasn't confirmed fill %" },
    { id: "design", label: "Label / box / insert approved", ok: designApproved, tab: "design",
      detail: designApproved ? "All artwork locked" : `Design stream: ${designStatus}` },
    { id: "listing", label: "Listing approved", ok: listingApproved, tab: "listing",
      detail: listingApproved ? "Amazon copy approved" : `Listing stream: ${listingStatus}` },
  ].filter(Boolean);
}

// ============================================================
// Banner — top-line state & primary CTA
// Three modes:
//   • productionStarted → green "running" banner
//   • all gates green   → green "ready to release" banner with primary CTA
//   • some gates red    → grey banner enumerating what's blocking
// ============================================================
function PoStartProductionBanner({ p, allDelivered, anyOrdered, productionStarted, gates, setTab, onDecide }) {
  if (productionStarted) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "var(--ok-soft)",
        border: "1px solid var(--ok)",
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 18 }}>▶</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ok)", fontWeight: 600 }}>PRODUCTION RUNNING</div>
          <div style={{ fontSize: 13, color: "var(--ink-1)", marginTop: 2 }}>Manufacturer is pressing. Track timeline below.</div>
        </div>
      </div>
    );
  }

  const blocking = gates.filter(g => !g.ok);
  const allGreen = blocking.length === 0;

  if (allGreen) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "14px 16px",
        background: "var(--ok-soft)",
        border: "1px solid var(--ok)",
        borderRadius: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22 }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ok)", fontWeight: 600 }}>READY TO RELEASE FULL BATCH</div>
            <div style={{ fontSize: 13.5, color: "var(--ink-1)", marginTop: 2 }}>All {gates.length} release gates green. Push the button to kick off production.</div>
          </div>
          <RD2.GatedAction product={p}>
            <button className="btn primary" onClick={() => RD2.toast("Production kick-off message sent to manufacturer", "ok")}>
              Start production →
            </button>
          </RD2.GatedAction>
        </div>
        <ProductionGateGrid gates={gates} setTab={setTab} />
      </div>
    );
  }

  // Some gate is red — block the CTA and itemize what's missing.
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      padding: "14px 16px",
      background: "var(--bg-2)",
      border: "1px solid var(--line)",
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 18, color: "var(--ink-3)" }}>◐</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>FULL BATCH · BLOCKED</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
            {blocking.length} of {gates.length} release gates still open. Resolve these before the manufacturer presses the full run.
          </div>
        </div>
        <button className="btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          Start production →
        </button>
      </div>
      <ProductionGateGrid gates={gates} setTab={setTab} />
    </div>
  );
}

// ============================================================
// Gate grid — checklist of release conditions; click an unmet row to jump.
// ============================================================
function ProductionGateGrid({ gates, setTab }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 6,
      marginTop: 4,
    }}>
      {gates.map(g => (
        <button
          key={g.id}
          onClick={() => setTab && setTab(g.tab)}
          style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "8px 10px",
            background: g.ok ? "var(--bg-1)" : "var(--bg-1)",
            border: `1px solid ${g.ok ? "var(--ok)" : "var(--line)"}`,
            borderRadius: 6,
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
          }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 16, height: 16, borderRadius: "50%",
            background: g.ok ? "var(--ok)" : "transparent",
            border: g.ok ? "none" : "1.5px solid var(--ink-3)",
            color: "white", fontSize: 10, fontWeight: 700,
            flexShrink: 0, marginTop: 1,
          }}>{g.ok ? "✓" : ""}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: g.ok ? "var(--ink-1)" : "var(--ink-2)" }}>{g.label}</span>
            <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>{g.detail}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Per-row PO ladder
// ============================================================
function PoLadderRow({ line, p, onDecide, last }) {
  const currentIdx = PO_STATE_INDEX[line.poStatus] ?? 0;
  const winner = line.picked && (line.quotes || []).find(q => q.vendor === line.picked);
  const totalCost = winner?.pricePerKg && line.kgNeeded ? winner.pricePerKg * line.kgNeeded : null;

  const advance = () => {
    const next = PO_STATES[Math.min(currentIdx + 1, PO_STATES.length - 1)];
    if (onDecide) onDecide("__poAdvance", "advance", { code: line.code, to: next.id });
    RD2.toast(`${line.ingredient.split(" ")[0]} → ${next.label}`, "ok");
  };

  const nextLabel = currentIdx < PO_STATES.length - 1 ? PO_STATES[currentIdx + 1].label : null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 16,
      padding: "14px 18px",
      borderBottom: last ? "none" : "1px solid var(--line)",
      alignItems: "center",
    }}>
      <div style={{ minWidth: 0 }}>
        {/* Ingredient name + vendor + cost */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>{line.ingredient}</span>
          {line.picked
            ? <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>via {line.picked}</span>
            : <span style={{ fontSize: 11.5, color: "var(--warn)" }}>vendor not picked</span>}
          {totalCost && (
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>${totalCost.toFixed(0)} ({line.kgNeeded}kg × ${winner.pricePerKg}/kg)</span>
          )}
        </div>

        {/* 6-state ladder */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 10 }}>
          {PO_STATES.map((state, i) => {
            const passed = i < currentIdx;
            const current = i === currentIdx;
            const future = i > currentIdx;
            const dotColor = passed || current ? state.color : "var(--bg-2)";
            const textColor = passed ? "var(--ink-3)" : current ? state.color : "var(--ink-3)";
            return (
              <React.Fragment key={state.id}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: passed || current ? state.color : "var(--bg-1)",
                    border: `2px solid ${passed || current ? state.color : "var(--line)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 10, fontWeight: 700,
                  }}>
                    {passed ? "✓" : current ? state.short : ""}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: textColor,
                    fontWeight: current ? 700 : 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}>
                    {state.label}
                  </div>
                </div>
                {i < PO_STATES.length - 1 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: passed ? state.color : "var(--line)",
                    marginTop: 8, alignSelf: "flex-start",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Last action timestamp */}
        {line.poDaysAgo != null && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8, fontStyle: "italic" }}>
            Last update: {RD2.daysAgoLabel(line.poDaysAgo)}
          </div>
        )}
      </div>

      {/* Advance CTA */}
      {nextLabel && line.picked && (
        <RD2.GatedAction product={p}>
          <button className="btn sm" onClick={advance}>
            Mark {nextLabel} →
          </button>
        </RD2.GatedAction>
      )}
      {!line.picked && (
        <span style={{ fontSize: 11, color: "var(--warn)", fontStyle: "italic" }}>Pick vendor first</span>
      )}
      {line.poStatus === "delivered" && (
        <span style={{ fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>✓ DELIVERED</span>
      )}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { PurchaseOrdersPanel });
