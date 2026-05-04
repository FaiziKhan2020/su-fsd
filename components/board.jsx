/* global React, RD */
const { useState: useStateB } = React;

// ===========================================================================
// Pipeline board — kanban with stage-aware cards
// ===========================================================================
function Board({ products, onOpen }) {
  const stages = PIPELINE_DATA.STAGES;
  return (
    <div style={{ overflowX: "auto", height: "100%" }}>
      <div className="board">
        {stages.map(s => {
          const items = products.filter(p => p.stage === s.id);
          return (
            <div className="column" key={s.id}>
              <div className="column-h">
                <span className="swatch" style={{ background: `var(--stage-${s.color}-ink)` }}></span>
                <span className="title">{s.label}</span>
                <span className="count">{items.length}</span>
                <button className="add" title="Add">+</button>
              </div>
              {s.sublabel && <div className="column-sub">{s.sublabel}</div>}
              <div className="column-body">
                {items.map(p => <ProductCard key={p.id} p={p} onClick={() => onOpen(p.id)} />)}
                {items.length === 0 && (
                  <div style={{ padding: 14, fontSize: 11.5, color: "var(--ink-4)", textAlign: "center", fontStyle: "italic" }}>Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({ p, onClick }) {
  const t = RD.type(p.type);
  const owner = RD.person(p.owner);

  if (p.stage === "idea") {
    return (
      <button className="product-card idea" onClick={onClick}>
        <div className="top">
          <span className="mono">{p.id}</span>
          <span className={`chip brand-${p.brand}`}>{p.brand}</span>
          <span style={{ color: "var(--ink-4)" }} title={t?.label}>{t?.glyph}</span>
        </div>
        <div className="name">{p.name}</div>
        {p.synopsis && <div className="synopsis">{p.synopsis}</div>}
        <div className="meta">
          {owner && <RD.Avatar user={owner} size="sm" />}
          <span style={{ color: "var(--ink-3)" }}>{owner?.name || "—"}</span>
          <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{RD.daysAgoLabel(p.lastActivity)}</span>
        </div>
      </button>
    );
  }

  if (p.stage === "niche" || p.stage === "approval") {
    const niche = RD.lastVer(p, "niche");
    return (
      <button className="product-card niche-card" onClick={onClick}>
        <div className="top">
          <span className="mono">{p.id}</span>
          <span className={`chip brand-${p.brand}`}>{p.brand}</span>
          <span style={{ color: "var(--ink-4)" }} title={t?.label}>{t?.glyph}</span>
          <span className={`hd ${p.health || "ok"}`} style={{ marginLeft: "auto" }}></span>
        </div>
        <div className="name">{p.name}</div>
        <div className="niche-status">
          <span className="ns-badge">📊 Niche {niche ? `v${niche.n}` : "draft"}</span>
          {p.nicheDoc && <span className="ns-badge full">✓ Full doc</span>}
          {p.stage === "approval" && <span className="ns-badge approval">⏳ Awaiting Chesky</span>}
        </div>
        <div className="meta">
          {owner && <><RD.Avatar user={owner} size="sm" /><span style={{ color: "var(--ink-3)" }}>{owner.name}</span></>}
          <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{RD.daysAgoLabel(p.lastActivity)}</span>
        </div>
      </button>
    );
  }

  if (p.stage === "build") {
    const streams = p.streams || {};
    return (
      <button className="product-card build" onClick={onClick}>
        <div className="top">
          <span className="mono">{p.id}</span>
          <span className={`chip brand-${p.brand}`}>{p.brand}</span>
          <span style={{ color: "var(--ink-4)" }} title={t?.label}>{t?.glyph}</span>
          <span className={`hd ${p.health || "ok"}`} style={{ marginLeft: "auto" }}></span>
        </div>
        <div className="name">{p.name}</div>
        <div className="streams">
          <RD.StreamBar stream={streams.sourcing} label="Sourcing" />
          <RD.StreamBar stream={streams.design}   label="Design" />
          <RD.StreamBar stream={streams.listing}  label="Listing" />
        </div>
        {p.blockers?.[0] && <div className="card-blocker">⚠ {p.blockers[0]}</div>}
        <div className="meta">
          <span style={{ color: "var(--ink-3)" }}>{RD.totalVersions(p)} versions</span>
          <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{RD.daysAgoLabel(p.lastActivity)}</span>
        </div>
      </button>
    );
  }

  if (p.stage === "production" || p.stage === "launched") {
    return (
      <button className="product-card live" onClick={onClick}>
        <div className="top">
          <span className="mono">{p.id}</span>
          <span className={`chip brand-${p.brand}`}>{p.brand}</span>
          <span style={{ color: "var(--ink-4)" }} title={t?.label}>{t?.glyph}</span>
          {p.stage === "launched" && <span className="live-dot" title="Live"></span>}
        </div>
        <div className="name">{p.name}</div>
        {p.asin && <div className="asin-row mono">ASIN {p.asin}</div>}
        <div className="meta">
          <span style={{ color: "var(--ink-3)" }}>{p.stage === "launched" ? "Live" : "In production"}</span>
          <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{RD.daysAgoLabel(p.lastActivity)}</span>
        </div>
      </button>
    );
  }

  // hold / parked
  const reason = p.holdReason || p.parkReason;
  return (
    <button className="product-card paused" onClick={onClick}>
      <div className="top">
        <span className="mono">{p.id}</span>
        <span className={`chip brand-${p.brand}`}>{p.brand}</span>
        <span style={{ color: "var(--ink-4)" }} title={t?.label}>{t?.glyph}</span>
      </div>
      <div className="name">{p.name}</div>
      {reason && <div className="paused-reason">{reason}</div>}
      <div className="meta">
        <span style={{ color: "var(--ink-3)" }}>{p.stage === "hold" ? "On hold" : "Parked"}</span>
        <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{p.lastActivity}d</span>
      </div>
    </button>
  );
}

// ===========================================================================
// Products table
// ===========================================================================
function ProductsTable({ products, onOpen }) {
  const [sort, setSort] = useStateB({ key: "lastActivity", dir: "asc" });
  const sorted = [...products].sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    if (av == null) return 1; if (bv == null) return -1;
    return (av > bv ? 1 : -1) * (sort.dir === "asc" ? 1 : -1);
  });
  const th = (key, label) => (
    <th onClick={() => setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))} style={{ cursor: "pointer" }}>
      {label}{sort.key === key && (sort.dir === "asc" ? " ↑" : " ↓")}
    </th>
  );
  return (
    <div style={{ padding: 16 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="products-table">
          <thead>
            <tr>
              <th></th>{th("id", "ID")}{th("name", "Product")}{th("brand", "Brand")}{th("type", "Type")}{th("stage", "Stage")}<th>Owner</th><th>Versions</th>{th("lastActivity", "Last activity")}<th>Health</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => {
              const t = RD.type(p.type);
              const o = RD.person(p.owner);
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)} style={{ cursor: "pointer" }}>
                  <td><span className={`hd ${p.health || "ok"}`}></span></td>
                  <td className="mono">{p.id}</td>
                  <td><b>{p.name}</b></td>
                  <td><span className={`chip brand-${p.brand}`}>{p.brand}</span></td>
                  <td>{t?.glyph} {t?.label}</td>
                  <td><RD.StagePill stageId={p.stage} /></td>
                  <td>{o && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RD.Avatar user={o} size="sm" />{o.name}</span>}</td>
                  <td className="mono">{RD.totalVersions(p)}</td>
                  <td className="mono" style={{ color: "var(--ink-3)" }}>{RD.daysAgoLabel(p.lastActivity)}</td>
                  <td>{p.health === "ok" ? "On track" : p.health === "warn" ? "Attention" : p.health === "stale" ? "Stale" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, { Board, ProductCard, ProductsTable });
