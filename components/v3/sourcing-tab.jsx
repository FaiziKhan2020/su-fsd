/* global React, RD2, PIPELINE_DATA */
const { useState: useSS, useMemo: useMSS } = React;

// ============================================================
// SOURCING TAB v3 — Ronel's vendor-quote workspace
//   • One card per ingredient
//   • Sole-source ingredients show locked single-vendor view
//   • Multi-source ingredients expand to a quote table
//   • Cost summary at top, spec sheet versions below
// ============================================================

function SourcingTab({ p }) {
  if (!p.bom) {
    return (
      <div className="empty" style={{ padding: 30 }}>
        <div style={{ fontSize: 13 }}>No BOM yet. Sourcing kicks in after Niche Approval.</div>
      </div>
    );
  }

  const ronel = RD2.person("ronel");
  const totalKg = p.bom.reduce((sum, b) => sum + (b.kgNeeded || 0), 0);
  const lockedCount = p.bom.filter(b => b.status === "Locked").length;
  const quotingCount = p.bom.filter(b => b.status === "Quoting").length;

  // Total locked-in cost (sum of pickedQuote * kgNeeded)
  const totalLocked = p.bom.reduce((sum, b) => {
    if (b.status !== "Locked" || !b.picked) return sum;
    const q = b.quotes.find(x => x.vendor === b.picked);
    if (!q || q.pricePerKg == null) return sum;
    return sum + (q.pricePerKg * b.kgNeeded);
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>

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
          <div className="src-stat"><div className="n">{p.bom.length}</div><div className="l">Ingredients</div></div>
          <div className="src-stat"><div className="n" style={{ color: "var(--ok)" }}>{lockedCount}</div><div className="l">Locked</div></div>
          {quotingCount > 0 && <div className="src-stat"><div className="n" style={{ color: "var(--warn)" }}>{quotingCount}</div><div className="l">Quoting</div></div>}
          <div className="src-stat"><div className="n">${totalLocked.toFixed(0)}</div><div className="l">Locked cost</div></div>
        </div>
      </div>

      {/* ---------- Ingredients ---------- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {p.bom.map((b, i) => <IngredientCard key={i} b={b} />)}
      </div>

      {/* ---------- Spec Sheet versioning ---------- */}
      {p.specSheet && <SpecSheetSection specSheet={p.specSheet} bom={p.bom} />}
    </div>
  );
}

// ===== One ingredient card =====
function IngredientCard({ b }) {
  const [open, setOpen] = useSS(b.status === "Quoting"); // auto-open if still quoting
  const pickedQuote = b.quotes.find(q => q.vendor === b.picked);
  const cheapestQuote = [...b.quotes].filter(q => q.pricePerKg != null).sort((a, b) => a.pricePerKg - b.pricePerKg)[0];

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
                <th>Contact</th>
                <th>$/kg</th>
                <th>MOQ</th>
                <th>Lead</th>
                <th>Stock</th>
                <th>Sample</th>
                <th>{b.status === "Locked" ? "Decision" : "Pick"}</th>
              </tr>
            </thead>
            <tbody>
              {b.quotes.map((q, i) => {
                const isPicked = q.vendor === b.picked;
                const isCheapest = cheapestQuote && q.vendor === cheapestQuote.vendor && b.quotes.length > 1 && !b.soleSource;
                return (
                  <tr key={i} className={isPicked ? "picked" : ""}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.vendor}</div>
                      {q.note && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{q.note}</div>}
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{q.contact || "—"}</td>
                    <td className="mono">{q.pricePerKg != null ? `$${q.pricePerKg.toFixed(2)}` : "—"}{isCheapest && <span style={{ fontSize: 9.5, color: "var(--ok)", marginLeft: 4 }}>↓</span>}</td>
                    <td className="mono">{q.moq}</td>
                    <td className="mono">{q.lead}</td>
                    <td>{q.inStock ? <span style={{ color: "var(--ok)" }}>✓</span> : <span style={{ color: "var(--warn)" }}>○</span>}</td>
                    <td style={{ fontSize: 11, textTransform: "capitalize", color: "var(--ink-2)" }}>{q.sample}</td>
                    <td>
                      {b.soleSource ? <span style={{ fontSize: 11, color: "var(--ink-3)" }}>only option</span>
                       : isPicked ? <span className="ing-pick going">● GOING WITH</span>
                       : b.status === "Locked" ? <span className="ing-pick passed">○ pass</span>
                       : <button className="btn sm" style={{ fontSize: 10.5, padding: "2px 7px" }}>Pick</button>}
                    </td>
                  </tr>
                );
              })}
              {b.status === "Quoting" && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 8 }}>
                  <button className="btn sm" style={{ fontSize: 11 }}>+ Add quote</button>
                </td></tr>
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
          <button className="btn sm">+ Upload new version</button>
          {!specSheet.lockedAt && <button className="btn sm primary">🔒 Lock & send to mfr</button>}
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

window.RD2 = Object.assign(window.RD2 || {}, { SourcingTab });
