/* global React */
const { useState, useMemo, useEffect, useRef } = React;

// ----- Helpers -------------------------------------------------------------
function daysAgoLabel(d) {
  if (d == null) return "—";
  if (d < 1) return "today";
  if (d < 1.5) return "1d ago";
  if (d < 30) return `${Math.round(d)}d ago`;
  if (d < 60) return `${Math.round(d / 7)}w ago`;
  return `${Math.round(d / 30)}mo ago`;
}
function person(id) { return PIPELINE_DATA.PEOPLE.find(p => p.id === id); }
function stage(id)  { return PIPELINE_DATA.STAGES.find(s => s.id === id); }
function brand(id)  { return PIPELINE_DATA.BRANDS[id]; }
function type(id)   { return PIPELINE_DATA.TYPES[id]; }
function role(id)   { return PIPELINE_DATA.ROLES[id]; }
function lastVer(p, kind) {
  const arr = p.versions?.[kind];
  return arr && arr.length ? arr[arr.length - 1] : null;
}
function totalVersions(p) {
  return Object.values(p.versions || {}).reduce((a, arr) => a + (arr?.length || 0), 0);
}
function streamProgress(p) {
  // for build-stage products, returns avg progress across streams
  const s = p.streams;
  if (!s) return null;
  const keys = Object.keys(s);
  if (!keys.length) return null;
  const avg = keys.reduce((a, k) => a + (s[k]?.progress || 0), 0) / keys.length;
  return Math.round(avg);
}

// "You" — Chesky is the founder/overseer running this tool
const ME = "chesky";
function meId() { return ME; }
function me() { return person(ME); }

// Artifact family registry — labels + which streams own them
const ARTIFACT_FAMILIES = [
  { id: "niche",         label: "Niche analysis",  stream: "rd" },
  { id: "spec",          label: "Spec sheet",      stream: "rd" },
  { id: "label",         label: "Label",           stream: "design" },
  { id: "carton",        label: "Carton/Box",      stream: "design" },
  { id: "insert",        label: "Insert",          stream: "design" },
  { id: "listingCopy",   label: "Listing copy",    stream: "listing" },
  { id: "mainImage",     label: "Main image",      stream: "listing" },
  { id: "galleryImages", label: "Gallery images",  stream: "listing" },
  { id: "aPlus",         label: "A+ content",      stream: "listing" },
];

// ----- Atoms ---------------------------------------------------------------
function Avatar({ user, size = "" }) {
  if (!user) return null;
  return (
    <span className={`avatar ${size}`} style={{ background: user.color }} title={`${user.name} — ${user.title}`}>
      {user.avatar}
    </span>
  );
}

function StagePill({ stageId, withDot = true, short = false }) {
  const s = stage(stageId);
  if (!s) return null;
  return (
    <span className={`pill stage-${s.color}`}>
      {withDot && <span className="dot"></span>}
      {short ? s.shortLabel : s.label}
    </span>
  );
}

function HealthDot({ p }) {
  const cls = p.health || "ok";
  const tip = cls === "ok" ? "On track" : cls === "warn" ? "Attention" : "Stale";
  return <span className={`hd ${cls}`} title={tip}></span>;
}

// Mini progress bar for a single build stream
function StreamBar({ s, label, lead }) {
  if (!s) return null;
  const u = person(lead);
  const cls = s.progress >= 100 ? "done" : s.progress >= 50 ? "go" : "early";
  return (
    <div className="stream">
      <div className="sm-h">
        <span className="lbl">{label}</span>
        {u && <Avatar user={u} size="sm" />}
        <span className="pct mono">{s.progress}%</span>
      </div>
      <div className="sm-bar"><div className={`sm-fill ${cls}`} style={{ width: `${s.progress}%` }}></div></div>
    </div>
  );
}

// ----- Sidebar -------------------------------------------------------------
function Sidebar({ view, setView, products, typeFilter, setTypeFilter, ownerFilter, setOwnerFilter }) {
  const counts = useMemo(() => {
    const out = { all: products.length };
    PIPELINE_DATA.STAGES.forEach(s => { out[s.id] = products.filter(p => p.stage === s.id).length; });
    return out;
  }, [products]);

  const typeCounts = useMemo(() => {
    const out = {};
    Object.keys(PIPELINE_DATA.TYPES).forEach(t => { out[t] = products.filter(p => p.type === t).length; });
    return out;
  }, [products]);

  const ownerCounts = useMemo(() => {
    const out = {};
    PIPELINE_DATA.PEOPLE.forEach(u => { out[u.id] = products.filter(p => p.owner === u.id).length; });
    return out;
  }, [products]);

  const navItem = (id, label, count, icon) => (
    <button className={`nav-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
      <span className="icon">{icon}</span>
      <span>{label}</span>
      {count != null && <span className="count mono">{count}</span>}
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"></div>
        <div>R&D Pipeline</div>
      </div>

      <div className="nav-section">Workspace</div>
      {navItem("home",      "Home",          null, "◉")}
      {navItem("board",     "Pipeline",      counts.all, "▦")}
      {navItem("table",     "All products",  counts.all, "≡")}
      {navItem("dashboard", "Dashboard",     null, "◐")}
      {navItem("activity",  "Activity",      null, "↻")}

      <div className="nav-section">By stage</div>
      {PIPELINE_DATA.STAGES.map(s => (
        <button
          key={s.id}
          className={`nav-item ${view === `stage:${s.id}` ? "active" : ""}`}
          onClick={() => setView(`stage:${s.id}`)}
        >
          <span className="icon" style={{ color: `var(--stage-${s.color}-ink)` }}>●</span>
          <span>{s.label}</span>
          <span className="count mono">{counts[s.id] || 0}</span>
        </button>
      ))}

      <div className="nav-section">By format</div>
      <button
        className={`nav-item ${!typeFilter ? "active" : ""}`}
        onClick={() => setTypeFilter(null)}
      >
        <span className="icon">∗</span>
        <span>All formats</span>
        <span className="count mono">{products.length}</span>
      </button>
      {Object.entries(PIPELINE_DATA.TYPES).map(([id, t]) => (
        typeCounts[id] > 0 && (
          <button
            key={id}
            className={`nav-item ${typeFilter === id ? "active" : ""}`}
            onClick={() => setTypeFilter(id)}
          >
            <span className="icon">{t.glyph}</span>
            <span>{t.label}s</span>
            <span className="count mono">{typeCounts[id]}</span>
          </button>
        )
      ))}

      <div className="nav-section">By owner</div>
      <button
        className={`nav-item ${!ownerFilter ? "active" : ""}`}
        onClick={() => setOwnerFilter(null)}
      >
        <span className="icon">∗</span>
        <span>All owners</span>
        <span className="count mono">{products.length}</span>
      </button>
      {PIPELINE_DATA.PEOPLE.filter(u => ownerCounts[u.id] > 0).map(u => (
        <button
          key={u.id}
          className={`nav-item ${ownerFilter === u.id ? "active" : ""}`}
          onClick={() => setOwnerFilter(u.id)}
        >
          <span className="icon"><Avatar user={u} size="sm" /></span>
          <span>{u.name}</span>
          <span className="count mono">{ownerCounts[u.id]}</span>
        </button>
      ))}

      <div className="nav-section">Automation</div>
      {navItem("rules", "Rules",        PIPELINE_DATA.rules.filter(r => r.enabled).length, "⚡")}
      {navItem("slack", "Slack feed",   null, "#")}
      {navItem("ai",    "AI assistant", null, "✦")}

      <div style={{ flex: 1 }}></div>
      <div className="nav-section">You</div>
      <div className="nav-item" style={{ cursor: "default" }}>
        <Avatar user={me()} size="sm" />
        <span>{me()?.name}</span>
        <span className="count mono" style={{ fontSize: 9.5, textTransform: "uppercase" }}>founder</span>
      </div>
    </aside>
  );
}

// ----- Top bar -------------------------------------------------------------
function TopBar({ crumbs, primaryAction }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="spacer"></div>
      <div className="search">
        <span>⌕</span>
        <input placeholder="Search products, ASINs, ingredients…" />
        <span className="kbd">⌘K</span>
      </div>
      <button className="pill-btn">Filter</button>
      <button className="pill-btn">Group</button>
      {primaryAction || <button className="pill-btn primary">+ New idea</button>}
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, {
  Avatar, StagePill, HealthDot, StreamBar, Sidebar, TopBar,
  daysAgoLabel, person, stage, brand, type, role, lastVer, totalVersions, streamProgress,
  ME, me, meId, ARTIFACT_FAMILIES,
});
