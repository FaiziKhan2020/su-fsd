/* global React, RD2, PIPELINE_DATA */
const { useState: useS2, useMemo: useM2 } = React;

// ===== Atoms =====
function Avatar({ user, size = "md", title }) {
  if (!user) return null;
  const px = size === "xs" ? 16 : size === "sm" ? 20 : size === "lg" ? 40 : 26;
  return (
    <span className="person-av" title={title || user.name} style={{ width: px, height: px, fontSize: Math.max(8, px*0.4), background: user.color }}>
      {user.initials}
    </span>
  );
}
function StagePill({ stageId }) {
  const s = RD2.stage(stageId);
  if (!s) return null;
  return <span className={`pill stage-${s.color}`} style={{
    background: `var(--stage-${s.color})`, color: `var(--stage-${s.color}-ink)`,
    padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500
  }}>{s.label}</span>;
}
function HealthDot({ p }) {
  const c = p.health === "ok" ? "var(--ok)" : p.health === "warn" ? "var(--warn)" : "var(--err)";
  return <span style={{ width: 7, height: 7, borderRadius: 99, background: c, display: "inline-block" }}></span>;
}
function BrandChip({ b }) {
  return <span className={`chip brand-${b}`} style={{
    fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
    background: b === "DON" ? "oklch(92% 0.04 30)" : "oklch(92% 0.04 295)",
    color: b === "DON" ? "oklch(35% 0.12 30)" : "oklch(35% 0.12 295)",
  }}>{b}</span>;
}

// Cycle-time band: shows "Xd in stage / target Yd" with a fill that turns warn/err past target
function CycleBand({ p, dense = false }) {
  const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
  if (!bench) return null;
  const age = p.stageAge ?? 0;
  const ratio = Math.min(2, age / Math.max(1, bench.target));
  const tone = ratio >= 1.5 ? "err" : ratio >= 1 ? "warn" : "ok";
  const fillColor = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : "var(--err)";
  const pct = Math.min(100, (age / bench.target) * 100);
  return (
    <div className={`cycle-band tone-${tone}`} title={`${bench.label}: ${age}d (target ${bench.target}d)`}>
      <div className="cycle-track"><div className="cycle-fill" style={{ width: pct + "%", background: fillColor }}></div></div>
      <div className="cycle-meta mono">
        <span>{age}d</span>
        <span className="muted">/ {bench.target}d</span>
      </div>
    </div>
  );
}

// ===== Sidebar =====
function Sidebar({ view, setView, products }) {
  const counts = useM2(() => {
    const o = {};
    PIPELINE_DATA.STAGES.forEach(s => { o[s.id] = products.filter(p => p.stage === s.id).length; });
    return o;
  }, [products]);
  const item = (id, label, icon, count) => (
    <button className={`nav-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
      <span className="icon">{icon}</span><span>{label}</span>
      {count != null && <span className="count mono">{count}</span>}
    </button>
  );
  return (
    <aside className="sidebar">
      <div className="brand"><div className="logo"></div><div>R&D Pipeline</div></div>
      <div className="nav-section">Workspace</div>
      {item("home",      "Home",       "◉")}
      {item("inbox",     "Idea Inbox", "✦", counts.idea)}
      {item("pipeline",  "Pipeline",   "▦", products.length)}
      {item("people",    "People",     "◐")}
      {item("watchlist", "Watchlist",  "◎")}
      {item("activity",  "Activity",   "↻")}
      {item("rules",     "Rules",      "⚙")}
      <div className="nav-section">Stage</div>
      {PIPELINE_DATA.STAGES.map(s =>
        <button key={s.id} className={`nav-item ${view === "stage:"+s.id ? "active" : ""}`} onClick={() => setView("stage:"+s.id)}>
          <span className="icon" style={{ background: `var(--stage-${s.color})`, color: `var(--stage-${s.color}-ink)`, width: 14, height: 14, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>·</span>
          <span>{s.label}</span><span className="count mono">{counts[s.id] || 0}</span>
        </button>
      )}
    </aside>
  );
}

// ===== TopBar =====
function TopBar({ crumbs, onNewIdea }) {
  return (
    <div className="topbar">
      <div className="crumbs-bar">{crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: "var(--ink-4)" }}>/</span>}
          <span style={{ color: i === crumbs.length-1 ? "var(--ink)" : "var(--ink-3)" }}>{c}</span>
        </React.Fragment>
      ))}</div>
      <div style={{ flex: 1 }}></div>
      <button className="btn primary new-idea-btn" onClick={onNewIdea}>
        <span style={{ fontSize: 15, lineHeight: 1, marginRight: 2 }}>+</span> New idea
      </button>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { Avatar, StagePill, HealthDot, BrandChip, CycleBand, Sidebar, TopBar });
