/* global React, RD2, PIPELINE_DATA */
const { useState: useSDS, useMemo: useMDS } = React;

// ===== Dossier (right rail full screen) =====
function Dossier({ productId, onClose, onDecide, onUploadNiche }) {
  const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === productId);
  const [tab, setTab] = useSDS("overview");
  const [showUpload, setShowUpload] = useSDS(false);
  if (!p) return null;
  const owner = RD2.person(p.owner);

  const tabs = [
    { id: "overview", label: "Overview" },
    p.niche && { id: "niche", label: "Niche analysis" },
    p.streams && { id: "sourcing", label: "Sourcing" },
    p.streams && { id: "design", label: "Design" },
    p.streams && { id: "listing", label: "Listing" },
    { id: "activity", label: "Activity" },
  ].filter(Boolean);

  return (
    <div className="dossier-overlay" onClick={onClose}>
      <div className="dossier" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dossier-head">
          <button className="btn sm" onClick={onClose}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.code}</span>
            <RD2.BrandChip b={p.brand} />
            <RD2.StagePill stageId={p.stage} />
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{RD2.type(p.type)?.glyph} {RD2.type(p.type)?.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Owner</span>
            {owner && <RD2.Avatar user={owner} size="sm" />}
            <span style={{ fontSize: 12 }}>{owner?.name}</span>
          </div>
        </div>

        <div className="dossier-title">
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>{p.name}</h1>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{p.synopsis}</p>
        </div>

        {/* Tabs */}
        <div className="dossier-tabs">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="dossier-body">
          {tab === "overview" && <Overview p={p} onDecide={onDecide} setTab={setTab} onUpload={() => setShowUpload(true)} />}
          {tab === "niche" && <RD2.NicheDoc p={p} onUpload={() => setShowUpload(true)} />}
          {tab === "sourcing" && <RD2.SourcingTab p={p} />}
          {tab === "design" && <RD2.DesignTab p={p} />}
          {tab === "listing" && <RD2.ListingTab p={p} />}
          {tab === "activity" && <ActivityTab p={p} />}
        </div>

        {/* Right rail: comments */}
        <div className="dossier-rail">
          <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", margin: "0 0 12px" }}>Discussion</h3>
          <RD2.Comments productId={p.id} />
        </div>
      </div>
      {showUpload && <RD2.NicheUploadModal productId={p.id} onClose={() => setShowUpload(false)}
        onComplete={(payload) => onUploadNiche?.(p.id, payload)} />}
    </div>
  );
}

function Overview({ p, onDecide, setTab, onUpload }) {
  const owner = RD2.person(p.owner);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      {/* Stage-specific hero */}
      {p.stage === "idea" && (
        <div className="card stage-hero idea">
          <div className="hero-eyebrow">Idea · captured by {RD2.person(p.createdBy)?.name} · {RD2.daysAgoLabel(p.createdDaysAgo)}</div>
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: "8px 0 14px" }}>{p.synopsis}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm reject">Reject</button>
            <button className="btn sm promote">Promote → Niche Analysis</button>
          </div>
        </div>
      )}
      {p.stage === "niche" && p.nicheSubState === "researching" && (
        <div className="card stage-hero researching">
          <div className="hero-eyebrow">Niche Analysis · Researching</div>
          <h2 style={{ margin: "6px 0", fontSize: 20, fontWeight: 600 }}>⏱ Research in flight · {p.researchingDaysAgo}d</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)", margin: "0 0 14px" }}>
            {RD2.person(p.owner)?.name} is doing the deep-dive in Google Docs.
            Cannot move to Niche Review until the doc is uploaded and parsed.
          </p>
          <button className="btn sm primary" onClick={onUpload}>Upload niche analysis doc →</button>
        </div>
      )}
      {p.stage === "niche" && p.nicheSubState === "parsed" && (
        <div className="card stage-hero parsed">
          <div className="hero-eyebrow">Niche Analysis · Parsed</div>
          <h2 style={{ margin: "6px 0", fontSize: 20, fontWeight: 600, color: "var(--ok)" }}>✓ Doc parsed — ready to submit</h2>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 4px" }}>
            <a href="#" style={{ color: "var(--accent)" }}>{p.docUrl}</a> · uploaded {RD2.daysAgoLabel(p.docUploadedDaysAgo)} · 6 sections extracted
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn sm" onClick={() => setTab("niche")}>Open structured doc →</button>
            <button className="btn sm primary" onClick={() => onDecide?.("__submitForReview")}>Submit for Niche Review →</button>
          </div>
        </div>
      )}
      {p.stage === "approval" && p.approvals && (
        <RD2.DualApproval p={p} onDecide={onDecide} />
      )}
      {p.stage === "build" && p.streams && (
        <div className="card">
          <div className="card-h"><h3>Parallel streams</h3><span className="meta">live since niche approval</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {Object.entries(p.streams).map(([k, s]) => {
              const u = RD2.person(s.owner);
              return (
                <div key={k} style={{ background: "var(--bg-2)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 500 }}>{k}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <RD2.Avatar user={u} size="sm" />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{u?.name}</span>
                  </div>
                  <div style={{ marginTop: 8, height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: s.pct + "%", background: s.status === "Approved" || s.status === "Ordered" ? "var(--ok)" : s.status === "Backorder" ? "var(--err)" : "var(--accent)" }}></div>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: "var(--ink-3)" }}>{s.status} · {s.pct}%</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: "var(--ink-2)", fontStyle: "italic" }}>"{s.lastNote}"</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-h"><h3>Details</h3></div>
        <table style={{ width: "100%", fontSize: 13 }}>
          <tbody>
            <tr><td style={{ color: "var(--ink-3)", padding: "6px 0", width: 140 }}>Owner</td><td>{owner?.name} · {owner?.role}</td></tr>
            <tr><td style={{ color: "var(--ink-3)", padding: "6px 0" }}>Created by</td><td>{RD2.person(p.createdBy)?.name} · {RD2.daysAgoLabel(p.createdDaysAgo)}</td></tr>
            <tr><td style={{ color: "var(--ink-3)", padding: "6px 0" }}>Brand</td><td>{p.brand}</td></tr>
            <tr><td style={{ color: "var(--ink-3)", padding: "6px 0" }}>Format</td><td>{RD2.type(p.type)?.label}</td></tr>
            {p.asin && <tr><td style={{ color: "var(--ink-3)", padding: "6px 0" }}>ASIN</td><td className="mono">{p.asin}</td></tr>}
            <tr><td style={{ color: "var(--ink-3)", padding: "6px 0" }}>Last activity</td><td>{RD2.daysAgoLabel(p.lastActivity)}</td></tr>
            <tr><td style={{ color: "var(--ink-3)", padding: "6px 0" }}>Total versions</td><td className="mono">{RD2.totalVersions(p)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTab({ p }) {
  const events = PIPELINE_DATA.ACTIVITY.filter(e => e.productId === p.id).sort((a,b) => a.ts - b.ts);
  return (
    <div className="feed" style={{ maxWidth: 700 }}>
      {events.length === 0 && <div className="empty" style={{ padding: 30 }}>No activity yet.</div>}
      {events.map((e, i) => {
        const u = RD2.person(e.user);
        return (
          <div className="feed-row" key={i}>
            <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
            <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "alert" ? "!" : e.type === "approval" ? "✓" : "✎"}</span>
            <div className="body">
              {u && <RD2.Avatar user={u} size="sm" />} <span style={{ fontWeight: 500 }}>{u?.name}</span>
              <span style={{ color: "var(--ink-2)" }}> {e.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { Dossier });
