/* global React, RD2, PIPELINE_DATA */
const { useState: useSH } = React;

// ===== Home — Chesky's morning view =====
function Home({ onOpen, setView }) {
  const products = PIPELINE_DATA.products || PIPELINE_DATA.PRODUCTS;
  const me = RD2.person("chesky");

  // What's actually waiting on Chesky
  const needsMe = products.filter(p => p.waitingOn === "chesky");
  const ideas = products.filter(p => p.stage === "idea");
  const inFlight = products.filter(p => ["niche","build","production"].includes(p.stage));
  const stuck = products.filter(p => p.health === "stale" || (p.health === "warn" && p.lastActivity > 7));
  const stuckByOwner = stuck.reduce((acc, p) => {
    (acc[p.owner] = acc[p.owner] || []).push(p);
    return acc;
  }, {});

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 1320, margin: "0 auto" }}>
      <div className="home-hero">
        <div>
          <div className="home-eyebrow mono">{dayName.toUpperCase()} · {dateStr.toUpperCase()}</div>
          <h1 className="home-h1">Good morning, Chesky.</h1>
          <p className="home-brief">
            {needsMe.length} {needsMe.length === 1 ? "item" : "items"} waiting on you · {ideas.length} new ideas in inbox · {inFlight.length} active in pipeline · {stuck.length} stuck.
          </p>
        </div>
        <div className="home-pulse">
          <div className="pulse-stat warn"><div className="n">{needsMe.length}</div><div className="l">Waiting on you</div></div>
          <div className="pulse-stat"><div className="n">{ideas.length}</div><div className="l">Inbox</div></div>
          <div className="pulse-stat"><div className="n">{inFlight.length}</div><div className="l">Active</div></div>
          <div className="pulse-stat err"><div className="n">{stuck.length}</div><div className="l">Stuck</div></div>
        </div>
      </div>

      <div className="triage-grid">
        {/* Waiting on you */}
        <div className="card triage">
          <div className="card-h">
            <h3><span className="dot-warn"></span>Waiting on you</h3>
            <span className="meta">{needsMe.length}</span>
          </div>
          {needsMe.length === 0 ? <div className="empty" style={{ padding: 20, fontSize: 12 }}>You're caught up. ✓</div> : (
            <div className="triage-list">
              {needsMe.map(p => (
                <button key={p.id} className="triage-row" onClick={() => onOpen(p.id)}>
                  <div className="tr-top">
                    <span className="mono pid-strong">{p.code}</span>
                    <RD2.BrandChip b={p.brand} />
                    <RD2.StagePill stageId={p.stage} />
                  </div>
                  <div className="tr-name">{p.name}</div>
                  <div className="tr-reason">
                    <span className="reason-tag warn">
                      {p.stage === "approval" ? "⚖ Niche analysis ready — go/no-go decision" : "⏳ Awaiting your sign-off"}
                    </span>
                  </div>
                  <div className="tr-cta">Review →</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Idea inbox preview */}
        <div className="card triage">
          <div className="card-h">
            <h3><span className="dot-info"></span>Idea Inbox</h3>
            <span className="meta">{ideas.length} new · Malik</span>
          </div>
          <div className="triage-list slim">
            {ideas.slice(0, 6).map(p => (
              <button key={p.id} onClick={() => onOpen(p.id)}
                style={{ background: "transparent", border: 0, textAlign: "left", padding: "8px 0", borderBottom: "1px dashed var(--line)", cursor: "pointer", display: "block", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" }}>
                  <span className="mono">{p.code}</span><RD2.BrandChip b={p.brand} />
                  <span style={{ marginLeft: "auto" }}>{RD2.daysAgoLabel(p.createdDaysAgo)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.synopsis}</div>
              </button>
            ))}
          </div>
          <button className="btn sm" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => setView("inbox")}>Open inbox →</button>
        </div>

        {/* Stuck by person — who do I push */}
        <div className="card triage">
          <div className="card-h">
            <h3><span className="dot-err"></span>Push who</h3>
            <span className="meta">stuck by owner</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(stuckByOwner).map(([uid, arr]) => {
              const u = RD2.person(uid);
              return (
                <div key={uid} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: "1px dashed var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {u && <RD2.Avatar user={u} size="sm" />}
                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{u?.name || uid}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{u?.role}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--err)" }}>{arr.length} stuck</span>
                  </div>
                  {arr.map(p => (
                    <button key={p.id} onClick={() => onOpen(p.id)} style={{ background: "transparent", border: 0, textAlign: "left", padding: "2px 0 2px 28px", cursor: "pointer", fontSize: 12 }}>
                      <span className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{p.code}</span>
                      <span style={{ marginLeft: 6 }}>{p.name}</span>
                      <span style={{ marginLeft: 6, color: "var(--err)", fontSize: 11 }}>{p.lastActivity}d</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {Object.keys(stuckByOwner).length === 0 && <div className="empty" style={{ padding: 20, fontSize: 12 }}>Nothing stuck. 🟢</div>}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-h"><h3>Last 24 hours</h3><span className="meta">across pipeline</span></div>
        <div className="feed">
          {PIPELINE_DATA.ACTIVITY.filter(e => e.ts < 1.5).map((e, i) => {
            const u = RD2.person(e.user);
            const p = (PIPELINE_DATA.PRODUCTS).find(x => x.id === e.productId);
            return (
              <div className="feed-row" key={i}>
                <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
                <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "approval" ? "✓" : e.type === "alert" ? "!" : "✎"}</span>
                <div className="body">
                  {u && <RD2.Avatar user={u} size="sm" />} <span className="actor" style={{ fontWeight: 500 }}>{u?.name}</span>
                  <span style={{ color: "var(--ink-2)" }}> {e.text} on </span>
                  <span className="pid" onClick={() => onOpen(e.productId)} style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>{p?.code || e.productId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== People page =====
function People({ onPersonClick }) {
  const products = PIPELINE_DATA.PRODUCTS;
  return (
    <div className="people-grid">
      {PIPELINE_DATA.PEOPLE.map(u => {
        // Compute their queue
        const owned = products.filter(p =>
          p.owner === u.id || p.createdBy === u.id ||
          (p.streams && Object.values(p.streams).some(s => s?.owner === u.id))
        );
        const stale = owned.filter(p => p.health === "stale" || (p.health === "warn" && p.lastActivity > 7));
        const waitingOn = products.filter(p => p.waitingOn === u.id);

        return (
          <button key={u.id} className="person-card" onClick={() => onPersonClick(u.id)}>
            <div className="person-head">
              <RD2.Avatar user={u} size="lg" />
              <div>
                <div className="person-name">{u.name}</div>
                <div className="person-role">{u.role}</div>
              </div>
            </div>
            <div className="person-stats">
              <div className="person-stat"><div className="n">{owned.length}</div><div className="l">Active</div></div>
              <div className={`person-stat ${stale.length ? "err" : "ok"}`}><div className="n">{stale.length}</div><div className="l">Stale</div></div>
              <div className={`person-stat ${waitingOn.length ? "warn" : ""}`}><div className="n">{waitingOn.length}</div><div className="l">Waiting</div></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ===== Person Queue (drill-down) =====
function PersonQueue({ personId, onOpen, onBack }) {
  const u = RD2.person(personId);
  const products = PIPELINE_DATA.PRODUCTS;
  const queue = products.filter(p =>
    p.owner === personId || p.createdBy === personId ||
    (p.streams && Object.values(p.streams).some(s => s?.owner === personId))
  ).sort((a, b) => b.lastActivity - a.lastActivity);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <button className="btn sm" onClick={onBack} style={{ marginBottom: 14 }}>← People</button>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <RD2.Avatar user={u} size="lg" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>{u.name}</div>
          <div style={{ color: "var(--ink-3)", fontSize: 13 }}>{u.role} · {queue.length} active</div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h3>Queue</h3><span className="meta">stalest first</span></div>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ textAlign: "left", padding: "8px 6px" }}>Product</th>
              <th style={{ textAlign: "left", padding: "8px 6px" }}>Stage</th>
              <th style={{ textAlign: "left", padding: "8px 6px" }}>Role here</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>Last</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>Health</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(p => {
              let role = "Owner";
              if (p.createdBy === personId) role = "Created idea";
              if (p.streams) {
                Object.entries(p.streams).forEach(([k, s]) => { if (s?.owner === personId) role = k.charAt(0).toUpperCase()+k.slice(1); });
              }
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
                      <RD2.BrandChip b={p.brand} />
                    </div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>{p.name}</div>
                  </td>
                  <td style={{ padding: "10px 6px" }}><RD2.StagePill stageId={p.stage} /></td>
                  <td style={{ padding: "10px 6px", color: "var(--ink-2)" }}>{role}</td>
                  <td style={{ padding: "10px 6px", textAlign: "right", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}>{RD2.daysAgoLabel(p.lastActivity)}</td>
                  <td style={{ padding: "10px 6px", textAlign: "right" }}><RD2.HealthDot p={p} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { Home, People, PersonQueue });
