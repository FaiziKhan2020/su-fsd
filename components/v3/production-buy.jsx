// Production Buy view — appears at top of Sourcing tab when stage is build/production
// Answers: "How many are we making? What does it cost? What's ordered vs not?"

function ProductionBuySection({ p, onMarkOrdered }) {
  const run = p.productionRun;

  // Empty state — qty not yet locked
  if (!run || run.status === "pre-confirm") {
    return <ProductionBuyEmpty p={p} />;
  }

  const units = run.unitsToProduce;

  // Combine ingredients (per-kg) + packaging (per-unit) into one purchase list
  const ingredientLines = (p.bom || [])
    .filter(b => b.status === "Locked" && b.picked)
    .map(b => {
      const q = b.quotes.find(q => q.vendor === b.picked);
      const kgTotal = b.kgNeeded;
      const total = q?.pricePerKg != null ? q.pricePerKg * kgTotal : null;
      return {
        kind: "ing", code: b.code, name: b.ingredient,
        qty: kgTotal, qtyUnit: "kg",
        vendor: b.picked, contact: q?.contact, lead: q?.lead, soleSource: !!b.soleSource,
        unitPrice: q?.pricePerKg, unitPriceLabel: "/kg",
        total,
        ordered: !!b.ordered, orderedDaysAgo: b.orderedDaysAgo,
        ref: b,
      };
    });

  const packagingLines = (p.packaging || [])
    .filter(b => b.status === "Locked" && b.picked)
    .map(b => {
      const q = b.quotes.find(q => q.vendor === b.picked);
      const total = q?.pricePerUnit != null ? q.pricePerUnit * b.qty : null;
      return {
        kind: "pkg", code: b.code, name: b.component, spec: b.spec,
        qty: b.qty, qtyUnit: "ea",
        vendor: b.picked, contact: q?.contact, lead: q?.lead, soleSource: !!b.soleSource,
        unitPrice: q?.pricePerUnit, unitPriceLabel: "/ea",
        total,
        ordered: !!b.ordered, orderedDaysAgo: b.orderedDaysAgo,
        artworkApproved: b.artworkApproved,
        ref: b,
      };
    });

  const allLines = [...ingredientLines, ...packagingLines];
  const orderedCount = allLines.filter(l => l.ordered).length;
  const totalCount = allLines.length;
  const grandTotal = allLines.reduce((s, l) => s + (l.total || 0), 0);
  const orderedTotal = allLines.filter(l => l.ordered).reduce((s, l) => s + (l.total || 0), 0);
  const remainingTotal = grandTotal - orderedTotal;
  const costPerUnit = grandTotal / units;

  // Longest lead among unordered = critical path
  const unorderedLeads = allLines.filter(l => !l.ordered && l.lead).map(l => parseInt(l.lead) || 0);
  const longestLead = unorderedLeads.length > 0 ? Math.max(...unorderedLeads) : 0;

  const allDone = orderedCount === totalCount;
  const blockedByArtwork = packagingLines.filter(l => !l.ordered && l.artworkApproved === false);

  return (
    <div className="prod-buy">
      {/* HEADER */}
      <div className="prod-buy-h">
        <div className="prod-buy-hgrid">
          <div>
            <div className="lbl">Production run</div>
            <div className="val mono">{units.toLocaleString()} <span className="unit">units</span></div>
            <div className="sub">Confirmed {run.runConfirmedDaysAgo}d ago · target ship {run.targetShipDate}</div>
          </div>
          <div>
            <div className="lbl">Total spend</div>
            <div className="val mono">${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="sub mono">${costPerUnit.toFixed(2)} per unit</div>
          </div>
          <div>
            <div className="lbl">Ordered</div>
            <div className="val">
              <span className="mono" style={{ color: allDone ? "var(--ok)" : "var(--ink)" }}>{orderedCount}</span>
              <span className="unit"> / {totalCount}</span>
            </div>
            <div className="sub mono" style={{ color: allDone ? "var(--ok)" : "var(--ink-3)" }}>
              ${orderedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} placed · ${remainingTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go
            </div>
          </div>
          <div>
            <div className="lbl">Critical lead</div>
            <div className="val mono" style={{ color: longestLead > 21 ? "var(--warn)" : "var(--ink)" }}>
              {longestLead > 0 ? `${longestLead}d` : "—"}
            </div>
            <div className="sub">{longestLead > 0 ? "longest unordered" : "all ordered"}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="prod-buy-progress">
          <div className="bar">
            <div className="fill" style={{ width: `${(orderedCount / totalCount) * 100}%` }}></div>
          </div>
          <div className="actions">
            {!allDone && (
              <button className="btn primary sm" disabled={blockedByArtwork.length > 0}
                onClick={() => RD2.toast(`Ordering ${totalCount - orderedCount} items · $${remainingTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "ok")}>
                {blockedByArtwork.length > 0
                  ? `⚠ ${blockedByArtwork.length} blocked on artwork`
                  : `Order all remaining (${totalCount - orderedCount} items, $${remainingTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})`}
              </button>
            )}
            {allDone && <span style={{ fontSize: 12, color: "var(--ok)", fontWeight: 600 }}>✓ All purchase orders placed</span>}
          </div>
        </div>
      </div>

      {/* LINES TABLE */}
      <div className="prod-buy-table-wrap">
        <table className="prod-buy-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Item</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>$/unit</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th>Vendor</th>
              <th style={{ width: 60, textAlign: "center" }}>Lead</th>
              <th style={{ width: 200 }}>Order status</th>
            </tr>
          </thead>
          <tbody>
            {ingredientLines.length > 0 && (
              <tr className="prod-buy-section">
                <td colSpan={8}>INGREDIENTS · {ingredientLines.length} items · ${ingredientLines.reduce((s, l) => s + (l.total || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            )}
            {ingredientLines.map((l, i) => <ProductionBuyRow key={"i" + i} line={l} />)}
            {packagingLines.length > 0 && (
              <tr className="prod-buy-section">
                <td colSpan={8}>PACKAGING · {packagingLines.length} items · ${packagingLines.reduce((s, l) => s + (l.total || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            )}
            {packagingLines.map((l, i) => <ProductionBuyRow key={"p" + i} line={l} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductionBuyRow({ line }) {
  const l = line;
  const blockedByArt = l.kind === "pkg" && !l.ordered && l.artworkApproved === false;
  return (
    <tr className={l.ordered ? "ordered" : ""}>
      <td className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{l.code}</td>
      <td>
        <div style={{ fontWeight: 600, fontSize: 12.5, textTransform: l.kind === "pkg" ? "capitalize" : "none" }}>{l.name}</div>
        {l.spec && <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>{l.spec}</div>}
      </td>
      <td className="mono" style={{ textAlign: "right", fontSize: 12 }}>{l.qty.toLocaleString()} {l.qtyUnit}</td>
      <td className="mono" style={{ textAlign: "right", fontSize: 11.5, color: "var(--ink-2)" }}>
        {l.unitPrice != null ? `$${l.unitPrice.toFixed(2)}` : "—"}
      </td>
      <td className="mono" style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>
        {l.total != null ? `$${l.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
      </td>
      <td style={{ fontSize: 11.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {l.soleSource && <span style={{ fontSize: 10 }}>🔒</span>}
          <span>{l.vendor}</span>
        </div>
      </td>
      <td className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--ink-2)" }}>{l.lead || "—"}</td>
      <td>
        {l.ordered ? (
          <span className="prod-buy-pill ordered">📦 Ordered {l.orderedDaysAgo === 0 ? "today" : `${l.orderedDaysAgo}d ago`}</span>
        ) : blockedByArt ? (
          <span className="prod-buy-pill warn">⚠ Awaiting artwork</span>
        ) : (
          <button className="btn sm primary" style={{ fontSize: 10.5, padding: "3px 9px" }}
            onClick={() => RD2.toast(`Marked ${l.name} ordered`, "ok")}>
            Mark ordered
          </button>
        )}
      </td>
    </tr>
  );
}

function ProductionBuyEmpty({ p }) {
  const [units, setUnits] = React.useState(5000);
  return (
    <div className="prod-buy-empty">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 26, lineHeight: 1 }}>🛒</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Ready to start production buy</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
            Spec + vendors are locked. Confirm the run quantity to generate purchase orders.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6 }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Production runs are confirmed in your external PO system</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
            This OS is read-only on POs — once Joel kicks off the run for {p.bom?.filter(b => b.status === "Locked").length || 0} ingredients and {p.packaging?.filter(b => b.status === "Locked").length || 0} packaging items elsewhere, status flows back here.
          </div>
        </div>
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { ProductionBuySection });
