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
      <div className="brand"><div className="logo"></div><div>Pipeline OS</div></div>
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
function TopBar({ crumbs, onNewIdea, currentUser, onSwitchUser, products, onOpenProduct }) {
  const [open, setOpen] = useS2(false);
  const me = RD2.person(currentUser);
  // Surface only the people who have a real "home" — internal team members.
  const switchable = PIPELINE_DATA.PEOPLE.filter(p => !p.external);
  return (
    <div className="topbar">
      <div className="crumbs-bar">{crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: "var(--ink-4)" }}>/</span>}
          <span style={{ color: i === crumbs.length-1 ? "var(--ink)" : "var(--ink-3)" }}>{c}</span>
        </React.Fragment>
      ))}</div>
      {products && onOpenProduct && (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px", maxWidth: 560 }}>
          <RD2.ProductSearch products={products} onOpen={onOpenProduct} />
        </div>
      )}
      <div style={{ flex: 1 }}></div>
      {me && (
        <div style={{ position: "relative", marginRight: 10 }}>
          <button onClick={() => setOpen(!open)} className="role-switcher-btn">
            <span style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Viewing as</span>
            <Avatar user={me} size="sm" />
            <span style={{ fontWeight: 500, fontSize: 12.5 }}>{me.name}</span>
            {RD2.isAdmin && RD2.isAdmin(currentUser) && (
              <span title="Overseer — sees the full pipeline and can act on any product"
                style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 5px", borderRadius: 3, background: "var(--ink-1)", color: "var(--bg)", letterSpacing: "0.04em" }}>
                OVERSEER
              </span>
            )}
            <span style={{ fontSize: 9, color: "var(--ink-3)" }}>▾</span>
          </button>
          {open && (
            <>
              <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }}></div>
              <div className="role-switcher-menu">
                <div style={{ padding: "8px 12px 4px", fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Switch role</div>
                {switchable.map(p => (
                  <button key={p.id} className={`role-switcher-item ${p.id === currentUser ? "active" : ""}`}
                    onClick={() => { onSwitchUser(p.id); setOpen(false); }}>
                    <Avatar user={p} size="sm" />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 500, fontSize: 12.5 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.role}</div>
                    </div>
                    {p.id === currentUser && <span style={{ fontSize: 11, color: "var(--accent)" }}>✓</span>}
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }}></div>
                <button className="role-switcher-item" style={{ color: "var(--ink-3)" }}
                  onClick={() => {
                    if (confirm("Reset all in-memory edits back to the seed data? Your uploads, pushes, and decisions will be cleared.")) {
                      try { localStorage.removeItem("rd-products"); } catch (e) {}
                      location.reload();
                    }
                  }}>
                  <span style={{ width: 24, textAlign: "center", fontSize: 13 }}>↺</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 500, fontSize: 12.5 }}>Reset to seed data</div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)" }}>Clears all your edits</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button className="btn primary new-idea-btn" onClick={onNewIdea}>
        <span style={{ fontSize: 15, lineHeight: 1, marginRight: 2 }}>+</span> New idea
      </button>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { Avatar, StagePill, HealthDot, BrandChip, CycleBand, Sidebar, TopBar, GatedAction });

// ===== GatedAction =====
// Wraps a primary action so it disables for users who shouldn't act on
// this product. Joel & Chesky (overseers) always pass; we don't tag their
// actions as "overrides" — overseeing the pipeline IS their lane.
//   <GatedAction product={p}>
//     <button className="btn primary" onClick={...}>Send brief →</button>
//   </GatedAction>
function GatedAction({ product, children, ownerOnly, hideWhenLocked }) {
  const u = (RD2 && RD2.__currentUser) || "chesky";
  const can = RD2.can("act", product, u);

  if (hideWhenLocked && !can) return null;
  if (!can) {
    return React.cloneElement(children, {
      disabled: true,
      title: `Only ${product?.owner || "the owner"} can take this action. Switch role from the topbar to act.`,
      style: { ...(children.props.style || {}), opacity: 0.45, cursor: "not-allowed" },
    });
  }
  return children;
}
