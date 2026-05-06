/* global React, RD2, PIPELINE_DATA */
// ============================================================
// Process extras — additions for hold/killed views, vendor scorecard,
// and cost-pass diff. These slot into existing screens via RD2 namespace.
// ============================================================

const { useState: usePE, useMemo: usePEM } = React;

// ===== Hold dashboard — replaces SimpleList for stage:hold =====
function HoldDash({ items, onOpen }) {
  if (!items?.length) return <div className="stage-dash-empty">Nothing on hold.</div>;
  return (
    <div className="stage-dash-section">
      <div className="stage-dash-section-h">Paused — needs re-trigger <span className="count">{items.length}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 16px" }}>
        {items.map(p => <HoldRow key={p.id} p={p} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function HoldRow({ p, onOpen }) {
  const h = p.hold || {};
  const pausedBy = RD2.person(h.pausedBy);
  const stageWhenPaused = h.stageWhenPaused ? RD2.stage(h.stageWhenPaused) : null;
  return (
    <button onClick={() => onOpen(p.id)} style={{
      textAlign: "left", background: "var(--bg)", border: "1px solid var(--line)",
      borderLeft: "3px solid var(--stage-yellow, #F59E0B)", borderRadius: 8,
      padding: "12px 14px", cursor: "pointer", display: "grid",
      gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start"
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
          <RD2.BrandChip b={p.brand} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
          {stageWhenPaused && (
            <span style={{ fontSize: 10.5, color: "var(--ink-3)", padding: "1px 6px", background: "var(--bg-2)", borderRadius: 3 }}>
              paused at {stageWhenPaused.label}
            </span>
          )}
        </div>
        {h.reason && (
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45, marginBottom: 6 }}>
            {h.reason}
          </div>
        )}
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap" }}>
          {pausedBy && <span>Paused by <b style={{ color: "var(--ink-2)" }}>{pausedBy.name}</b> · {h.pausedDaysAgo}d ago</span>}
          {h.reTriggerDate && <span>↻ Re-trigger: <b style={{ color: "var(--accent)" }}>{h.reTriggerDate}</b></span>}
        </div>
        {h.reTriggerCondition && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, fontStyle: "italic" }}>
            Condition: {h.reTriggerCondition}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <button onClick={(e) => { e.stopPropagation(); RD2.toast(`${p.code} resumed → ${stageWhenPaused?.label || "previous stage"}`, "ok"); }}
          style={{ background: "var(--ok-bg)", color: "var(--ok)", border: 0, padding: "5px 10px",
            borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>↻ Resume</button>
        <button onClick={(e) => { e.stopPropagation(); RD2.toast(`${p.code} killed permanently`, "warn"); }}
          style={{ background: "transparent", color: "var(--ink-3)", border: "1px solid var(--line)", padding: "5px 10px",
            borderRadius: 5, fontSize: 11.5, cursor: "pointer" }}>Kill</button>
      </div>
    </button>
  );
}

// ===== Killed/Archive dashboard with search =====
function KilledDash({ items, onOpen }) {
  const [q, setQ] = usePE("");
  const [cat, setCat] = usePE("all");
  const cats = usePEM(() => {
    const set = new Set(items.map(p => p.rejection?.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [items]);
  const filtered = usePEM(() => {
    return items.filter(p => {
      if (cat !== "all" && p.rejection?.category !== cat) return false;
      if (!q.trim()) return true;
      const hay = `${p.code} ${p.name} ${p.brand} ${p.synopsis} ${p.rejection?.reason || ""}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [items, q, cat]);
  return (
    <>
      <div style={{ padding: "0 16px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search archived products — why didn't this ship?"
          style={{ flex: "1 1 320px", padding: "8px 12px", borderRadius: 6,
            border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit", background: "var(--bg)", color: "var(--ink)" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "6px 11px", borderRadius: 5, fontSize: 11.5, fontWeight: 500, fontFamily: "inherit",
              border: "1px solid var(--line)", cursor: "pointer",
              background: cat === c ? "var(--ink)" : "var(--bg)",
              color: cat === c ? "white" : "var(--ink-2)",
              textTransform: c === "all" ? "none" : "capitalize"
            }}>{c}</button>
          ))}
        </div>
      </div>
      <div className="stage-dash-section">
        <div className="stage-dash-section-h">
          {q.trim() || cat !== "all" ? "Matching archived" : "All archived"} <span className="count">{filtered.length}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="stage-dash-empty" style={{ padding: 24 }}>No matches. Try a different keyword.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
            {filtered.map(p => <KilledRow key={p.id} p={p} onOpen={onOpen} />)}
          </div>
        )}
      </div>
    </>
  );
}

function KilledRow({ p, onOpen }) {
  const r = p.rejection || {};
  const by = RD2.person(r.by);
  const stage = r.stageWhenKilled ? RD2.stage(r.stageWhenKilled) : null;
  const catColors = {
    margin:     { bg: "#FEE7E0", color: "#A23E1A" },
    compliance: { bg: "#FEF3CC", color: "#8C6B0A" },
    platform:   { bg: "#E7E1FA", color: "#4F2EC0" },
    niche:      { bg: "#FEE7E0", color: "#A23E1A" },
  };
  const cat = catColors[r.category] || { bg: "var(--bg-2)", color: "var(--ink-3)" };
  return (
    <button onClick={() => onOpen(p.id)} style={{
      textAlign: "left", background: "var(--bg)", border: "1px solid var(--line)",
      borderRadius: 7, padding: "10px 12px", cursor: "pointer",
      display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start", opacity: 0.85
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
          <RD2.BrandChip b={p.brand} />
          <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", textDecoration: "line-through", textDecorationColor: "var(--ink-4)" }}>{p.name}</span>
          {r.category && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, background: cat.bg, color: cat.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {r.category}
            </span>
          )}
          {stage && (
            <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>killed at {stage.label}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45 }}>{r.reason || p.synopsis}</div>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textAlign: "right", whiteSpace: "nowrap" }}>
        {by?.name && <div>by {by.name}</div>}
        <div>{r.daysAgo}d ago</div>
      </div>
    </button>
  );
}

// ===== Vendor scorecard — sits inside People view =====
function VendorScorecard() {
  const vendors = PIPELINE_DATA.VENDOR_SCORECARD || [];
  const [sort, setSort] = usePE("rating");
  const sorted = usePEM(() => {
    const arr = [...vendors];
    if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    if (sort === "onTime") arr.sort((a, b) => b.onTimeRate - a.onTimeRate);
    if (sort === "qc")     arr.sort((a, b) => b.qcPassRate - a.qcPassRate);
    if (sort === "lead")   arr.sort((a, b) => a.avgLead - b.avgLead);
    if (sort === "recent") arr.sort((a, b) => a.lastOrder - b.lastOrder);
    return arr;
  }, [vendors, sort]);
  const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
  const trendColor = (t) => t === "up" ? "var(--err)" : t === "down" ? "var(--ok)" : "var(--ink-3)";
  const pct = (v) => Math.round(v * 100) + "%";
  const pctColor = (v) => v >= 0.9 ? "var(--ok)" : v >= 0.8 ? "var(--warn)" : "var(--err)";
  const sortBtn = (key, label) => (
    <button onClick={() => setSort(key)} style={{
      padding: "5px 10px", borderRadius: 4, fontSize: 11.5, fontWeight: 500, fontFamily: "inherit",
      border: "1px solid var(--line)", cursor: "pointer",
      background: sort === key ? "var(--ink)" : "var(--bg)",
      color: sort === key ? "white" : "var(--ink-2)",
    }}>{label}</button>
  );
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Vendor scorecard</h2>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", alignSelf: "center", marginRight: 4 }}>Sort:</span>
          {sortBtn("rating", "Rating")}
          {sortBtn("onTime", "On-time")}
          {sortBtn("qc", "QC pass")}
          {sortBtn("lead", "Lead time")}
          {sortBtn("recent", "Most recent")}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-2)", color: "var(--ink-3)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Vendor</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Category</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Quotes / picked</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>On-time</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>QC pass</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Avg lead</th>
              <th style={{ padding: "10px 12px", textAlign: "center" }}>Price</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Rating</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Last order</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(v => (
              <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "11px 12px" }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{v.name}</div>
                  {v.notes && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{v.notes}</div>}
                </td>
                <td style={{ padding: "11px 12px", color: "var(--ink-2)", fontSize: 12 }}>{v.category}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  <span style={{ color: "var(--ink-2)" }}>{v.picked}/{v.quotes}</span>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.round(v.picked / v.quotes * 100)}% win</div>
                </td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: pctColor(v.onTimeRate) }}>{pct(v.onTimeRate)}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: pctColor(v.qcPassRate) }}>{pct(v.qcPassRate)}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--ink-2)" }}>{v.avgLead}d</td>
                <td style={{ padding: "11px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 600, color: trendColor(v.priceTrend) }}>{trendIcon(v.priceTrend)}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--ink)" }}>{v.rating.toFixed(1)}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 11, color: "var(--ink-3)" }}>{v.lastOrder}d ago</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Cost-pass diff — used inside CostTab and CostPassDash =====
function CostPassDiff({ revisions }) {
  if (!revisions || revisions.length < 2) return null;
  const [from, to] = [revisions[revisions.length - 2], revisions[revisions.length - 1]];
  const delta = to.summary.allInPerBottle - from.summary.allInPerBottle;
  const deltaPct = (delta / from.summary.allInPerBottle) * 100;
  const tone = delta > 0 ? "err" : delta < 0 ? "ok" : "muted";
  const toneColor = tone === "err" ? "var(--err)" : tone === "ok" ? "var(--ok)" : "var(--ink-3)";
  const toneBg = tone === "err" ? "var(--err-bg, #FEE7E0)" : tone === "ok" ? "var(--ok-bg)" : "var(--bg-2)";
  return (
    <div style={{ marginTop: 16, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
          Cost-pass diff · v{from.v} → v{to.v}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: toneColor }}>
          {delta > 0 ? "+" : ""}${delta.toFixed(2)} / bottle ({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
        </div>
      </div>
      <div style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>
        <b style={{ color: "var(--ink-2)" }}>Why re-run:</b> {to.reason}
      </div>
      {to.changes && to.changes.length > 0 && (
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", color: "var(--ink-3)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>Line</th>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>Before</th>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>After</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {to.changes.map((c, i) => {
              const isHeader = c.line === "All-in";
              return (
                <tr key={i} style={{
                  borderTop: "1px solid var(--line)",
                  background: isHeader ? toneBg : "transparent",
                  fontWeight: isHeader ? 700 : 500
                }}>
                  <td style={{ padding: "8px 12px", color: "var(--ink)" }}>{c.line}</td>
                  <td style={{ padding: "8px 12px", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{c.before}</td>
                  <td style={{ padding: "8px 12px", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{c.after}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: c.impact.startsWith("+") ? "var(--err)" : c.impact === "$0" ? "var(--ink-3)" : "var(--ok)" }}>{c.impact}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ padding: "8px 14px", fontSize: 10.5, color: "var(--ink-3)", background: "var(--bg-2)", borderTop: "1px solid var(--line)" }}>
        v{from.v} by {RD2.person(from.by)?.name} {from.daysAgo}d ago · v{to.v} by {RD2.person(to.by)?.name} {to.daysAgo}d ago
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { HoldDash, KilledDash, VendorScorecard, CostPassDiff });
