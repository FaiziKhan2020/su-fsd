/* global React, RD */
const { useState: useStateA } = React;

function AIPanel({ p }) {
  const [tab, setTab] = useStateA("brief");
  const niche = RD.lastVer(p, "niche");
  const totalCost = (p.bom || []).reduce((s, r) => s + (r.cost || 0) * (r.qty || 0), 0);

  return (
    <div className="ai-panel">
      <div className="ai-h">
        <span className="ai-mark">✦</span>
        <b>Pipeline AI</b>
        <span className="meta" style={{ marginLeft: "auto" }}>per product</span>
      </div>
      <div className="ai-tabs">
        {["brief", "risks", "ask"].map(id => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {id === "brief" ? "Brief" : id === "risks" ? "Risks" : "Ask"}
          </button>
        ))}
      </div>
      {tab === "brief" && (
        <div className="ai-body">
          <p>
            <b>{p.id} {p.name}</b> is in <b>{RD.stage(p.stage)?.label}</b>.
            {niche && ` Niche analysis v${niche.n} on file. `}
            {p.bom?.length > 0 && `BOM has ${p.bom.length} ingredients · est. unit cost $${totalCost.toFixed(2)}. `}
            {p.streams?.sourcing?.status && `Sourcing: ${p.streams.sourcing.status}. `}
            {p.streams?.design?.status && `Design: ${p.streams.design.status}. `}
            {p.streams?.listing?.status && `Listing: ${p.streams.listing.status}.`}
          </p>
          {p.blockers?.[0] && <div className="ai-callout warn">⚠ {p.blockers[0]}</div>}
        </div>
      )}
      {tab === "risks" && (
        <div className="ai-body">
          {p.lastActivity > 10 && <div className="ai-callout warn">Idle {p.lastActivity}d — 2× normal for this stage.</div>}
          {p.health === "warn" && <div className="ai-callout warn">Health warning logged.</div>}
          {!p.bom?.length && p.stage === "build" && <div className="ai-callout warn">No BOM yet — Ronel hasn't started sourcing.</div>}
          {(!p.lastActivity || p.lastActivity < 5) && p.health === "ok" && (
            <div className="ai-body" style={{ color: "var(--ink-3)", fontSize: 12 }}>No risks detected.</div>
          )}
        </div>
      )}
      {tab === "ask" && (
        <div className="ai-body">
          <textarea placeholder="Ask anything about this product..." className="ai-input"></textarea>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn sm">Summarize for Slack</button>
            <button className="btn sm">Draft email to vendor</button>
            <button className="btn sm">What's blocking?</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, { AIPanel });
