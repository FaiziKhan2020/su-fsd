/* global window, React, RD2 */

// ============================================================
// PRODUCTION TAB v3 — single tab merging Formulation + Sourcing.
//
// Owner-banded sections in pipeline order:
//   1. Cost pass        → Joel    (when rdGate exists; embedded RDTab)
//   2. Sample / mfg     → Ronel + Chesky (handled by RDTab kickoff/sample logic)
//   3. Ingredients      → Ronel   (BOM with vendor quotes; hidden when mfg-supply)
//   4. Packaging        → Ronel   (always-on)
//
// We REUSE the existing RDTab and SourcingTab as the workhorses — but render
// them stacked, with section dividers and owner chips, on a single page.
//
// Empty-state precedence:
//   • No rdGate, no bom, no packaging → "Production not active yet" arc
//     (mirrors the old SourcingNotYet, but covers both old empty-states).
//   • rdGate but no spec → render RDTab (it shows the kickoff + cost-pass flow).
//   • rdGate + spec      → stack everything.
// ============================================================

const { useState: useProd } = React;

function ProductionTab({ p, setTab, onDecide }) {
  // No production state at all → arc-style empty state pointing back to spec sheet.
  if (!p.rdGate && !p.bom && !p.packaging) {
    return <ProductionNotYet p={p} setTab={setTab} />;
  }

  // Spec sheet exists?
  const hasSpec = !!(p.specSheetV2 || p.specSheet);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 980 }}>

      {/* Spec link strip — always visible at top */}
      <ProductionSpecStrip p={p} hasSpec={hasSpec} setTab={setTab} />

      {/* PO LADDER — only when BOM exists. This is the new heart of Production.
          If there's no BOM but a spec sheet has ingredients, derive a working
          BOM so ingredients carry over. */}
      {(() => {
        const derived = !p.bom && p.specSheetV2 && RD2.SourcingSampleTab
          ? (window.__bomFromSpec ? window.__bomFromSpec(p) : null)
          : null;
        const bom = (p.bom && p.bom.length > 0) ? p.bom : derived;
        if (!bom || bom.length === 0) return null;
        const productForPO = (p.bom && p.bom.length > 0) ? p : { ...p, bom };
        return <RD2.PurchaseOrdersPanel p={productForPO} setTab={setTab} onDecide={onDecide} />;
      })()}

      {/* SECTION 1+2 — Formulation flow (cost pass → mfg engagement → samples)
          Now lives in its own dedicated "Sampling" tab. We keep a stub link here
          so people who land on Production during Formulation stage can jump there. */}
      {p.rdGate && !(p.bom || p.packaging) && (
        <ProductionSection
          eyebrow="01 · COST · MFG · SAMPLES"
          title="Sampling moved → its own tab"
          owners={["joel", "ronel", "chesky"]}
          subtitle="Cost-pass, manufacturer engagement, and sample rounds now live in the Sampling tab."
          dim
        >
          <div style={{ padding: 12 }}>
            <button className="btn primary" onClick={() => setTab("sampling")}>Open Sampling tab →</button>
          </div>
        </ProductionSection>
      )}

      {/* SECTION 3+4 — Sourcing (BOM + packaging). Renders if real BOM exists,
          OR if a spec sheet can derive one (so H303-style fresh products show). */}
      {(p.bom || p.packaging || (p.specSheetV2 && window.__bomFromSpec)) && (
        <ProductionSection
          eyebrow="02 · INGREDIENTS · PACKAGING"
          title="Sourcing"
          owners={["ronel"]}
          subtitle="Vendor quotes per ingredient and packaging line. Locked rows feed Joel's margin model."
        >
          <RD2.SourcingTab p={p} setTab={setTab} onDecide={onDecide} />
        </ProductionSection>
      )}

      {/* If rdGate exists but Sourcing isn't seeded yet AND no spec, show inline placeholder */}
      {p.rdGate && !p.bom && !p.packaging && !p.specSheetV2 && (
        <ProductionSection
          eyebrow="02 · INGREDIENTS · PACKAGING"
          title="Sourcing"
          owners={["ronel"]}
          subtitle="Vendor quotes seed once the sample is approved and the manufacturer is locked."
          dim
        >
          <SourcingPlaceholder p={p} />
        </ProductionSection>
      )}
    </div>
  );
}

// ===== Spec strip — sticky link to Spec sheet =====
function ProductionSpecStrip({ p, hasSpec, setTab }) {
  const ss = p.specSheetV2 || p.specSheet;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      background: hasSpec ? "var(--ok-soft, oklch(96% 0.05 145))" : "var(--warn-soft, oklch(96% 0.05 80))",
      border: `1px solid ${hasSpec ? "var(--ok-line, oklch(85% 0.1 145))" : "var(--warn-line, oklch(85% 0.1 80))"}`,
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 18, lineHeight: 1 }}>§</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>
          THE CONTRACT
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-1)", marginTop: 2 }}>
          {hasSpec ? (
            <>Spec sheet <span className="mono">v{ss?.currentVersion || 1}</span> {ss?.lockedAt ? "🔒 locked" : "— working draft"}. Production work below executes against this spec.</>
          ) : (
            <>No spec sheet yet — production sections below are running on placeholder data. Attach a spec to populate.</>
          )}
        </div>
      </div>
      <button className="btn sm" onClick={() => setTab && setTab("spec")}>
        Open Spec sheet →
      </button>
    </div>
  );
}

// ===== Section wrapper — owner-banded =====
function ProductionSection({ eyebrow, title, owners, subtitle, children, dim }) {
  return (
    <div style={{ opacity: dim ? 0.7 : 1 }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        paddingBottom: 12, marginBottom: 16,
        borderBottom: "2px solid var(--ink-1)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-3)", fontWeight: 600 }}>
            {eyebrow}
          </div>
          <h2 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em" }}>
            {title}
          </h2>
          {subtitle && (
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 720 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", fontWeight: 600 }}>
            OWNERS
          </div>
          <div style={{ display: "flex", gap: -2 }}>
            {owners.map((id, i) => {
              const u = RD2.person(id);
              if (!u) return null;
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "3px 8px 3px 4px",
                  marginLeft: i > 0 ? 6 : 0,
                  background: "var(--bg-2)", borderRadius: 99, border: "1px solid var(--line)",
                }}>
                  <RD2.Avatar user={u} size="xs" />
                  <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{u.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ===== Placeholder for Sourcing when rdGate exists but BOM hasn't seeded =====
function SourcingPlaceholder({ p }) {
  const g = p.rdGate || {};
  const sampleApproved = g.status === "approved";
  return (
    <div style={{
      padding: "20px 18px", background: "var(--bg-2)",
      border: "1px dashed var(--line)", borderRadius: 10,
    }}>
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
        {sampleApproved
          ? "Sample approved — BOM and packaging will seed shortly."
          : "Once the sample is approved and the manufacturer is locked, Ronel's vendor work seeds here automatically: ingredient quotes (3 per line), packaging quotes (bottles, droppers, caps, labels, boxes), and the running locked-cost total that feeds Joel's margin model."}
      </div>
    </div>
  );
}

// ===== Empty state — production not yet active =====
function ProductionNotYet({ p, setTab }) {
  // Has spec but no rdGate? That means spec was attached on an idea before niche.
  // Otherwise: walk the standard arc.
  const hasSpec = !!(p.specSheetV2 || p.specSheet);

  if (hasSpec) {
    return (
      <div style={{ maxWidth: 720, padding: "16px 4px 40px" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", fontWeight: 600 }}>
          PRODUCTION · ON DECK
        </div>
        <h2 style={{ margin: "6px 0 10px", fontSize: 22, fontWeight: 600 }}>Spec is locked. Production opens once Niche Review approves.</h2>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
          Cost pass, manufacturer brief, sample rounds, and vendor quotes all happen here — but only after both Joel and Chesky approve at the Niche stage.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, padding: "16px 4px 40px" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", fontWeight: 600 }}>
        PRODUCTION · NOT YET ACTIVE
      </div>
      <h2 style={{ margin: "6px 0 10px", fontSize: 22, fontWeight: 600 }}>Production work hasn't started — there's no spec yet.</h2>
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 22 }}>
        Production needs a locked spec sheet to execute against. Until Malik attaches a PDS in the Spec sheet tab, there's nothing to cost-pass, brief, sample, or quote.
      </div>
      <button className="btn primary" onClick={() => setTab && setTab("spec")}>
        ↑ Attach a spec sheet →
      </button>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { ProductionTab });
