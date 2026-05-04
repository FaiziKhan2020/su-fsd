/* global React, RD */
const { useState: useStateZ, useMemo: useMemoZ } = React;

// ===========================================================================
// Idea Inbox — dense list view for the noisy top of funnel
// (Malik drops 10 ideas/week here; Chesky/Malik triage)
// ===========================================================================
function IdeaInbox({ products, onOpen }) {
  const ideas = products.filter(p => p.stage === "idea")
    .sort((a, b) => a.lastActivity - b.lastActivity);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-h">
          <h3>Idea inbox</h3>
          <span className="meta">{ideas.length} pending · ~10/week target</span>
          <button className="btn sm primary" style={{ marginLeft: "auto" }}>+ New idea</button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          Malik drops new ideas here. Promote to <b>Niche Analysis</b> when ready, or reject. Roughly 1 in 10 makes it through.
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="ideas-table">
          <thead>
            <tr>
              <th></th><th>Code</th><th>Name</th><th>Brand</th><th>Type</th><th>Why</th><th>Source</th><th>Added</th><th></th>
            </tr>
          </thead>
          <tbody>
            {ideas.map(p => {
              const t = RD.type(p.type);
              const o = RD.person(p.owner);
              return (
                <tr key={p.id}>
                  <td>{o && <RD.Avatar user={o} size="sm" />}</td>
                  <td className="mono">{p.id}</td>
                  <td><b style={{ cursor: "pointer" }} onClick={() => onOpen(p.id)}>{p.name}</b></td>
                  <td><span className={`chip brand-${p.brand}`}>{p.brand}</span></td>
                  <td>{t?.glyph} {t?.label}</td>
                  <td className="why-cell">{p.synopsis || "—"}</td>
                  <td style={{ color: "var(--ink-3)", fontSize: 11.5 }}>{p.signalSource || "—"}</td>
                  <td className="mono" style={{ color: "var(--ink-3)" }}>{RD.daysAgoLabel(p.lastActivity)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button className="btn sm primary">Promote</button>
                      <button className="btn sm">Reject</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===========================================================================
// Dashboard — operational view (deeper than Home)
// ===========================================================================
function Dashboard({ products, onOpen }) {
  const counts = PIPELINE_DATA.STAGES.map(s => ({ s, n: products.filter(p => p.stage === s.id).length }));
  const max = Math.max(1, ...counts.map(c => c.n));

  // Throughput sparkline (mocked but plausible)
  const weekly = [3, 4, 2, 5, 4, 6, 3, 5];

  // By type breakdown
  const types = Object.entries(PIPELINE_DATA.TYPES).map(([id, t]) => ({
    id, t, n: products.filter(p => p.type === id).length,
  })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);

  // By brand
  const brands = Object.entries(PIPELINE_DATA.BRANDS).map(([id, b]) => ({
    id, b, n: products.filter(p => p.brand === id).length,
  }));

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: 1320, margin: "0 auto" }}>
      <div className="home-grid-2">
        <div className="card">
          <div className="card-h"><h3>Pipeline funnel</h3><span className="meta">Idea → Live</span></div>
          <div className="funnel">
            {counts.map(({ s, n }) => (
              <div className="funnel-row" key={s.id}>
                <div className="name"><RD.StagePill stageId={s.id} /></div>
                <div className="bar">
                  <div className="fill" style={{ width: `${(n / max) * 100}%`, background: `var(--stage-${s.color}-ink)`, opacity: 0.75 }}></div>
                </div>
                <div className="ct">{n}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Weekly throughput</h3><span className="meta">products advanced / week</span></div>
          <div className="spark">
            {weekly.map((v, i) => (
              <div key={i} className="spark-bar" style={{ height: `${(v / 6) * 100}%` }} title={`Week -${weekly.length - i}: ${v}`}></div>
            ))}
          </div>
          <div className="spark-stats">
            <div><b>{weekly[weekly.length - 1]}</b> this week</div>
            <div style={{ color: "var(--ink-3)" }}>{Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length * 10) / 10} avg</div>
          </div>
        </div>
      </div>

      <div className="home-grid-2">
        <div className="card">
          <div className="card-h"><h3>By format</h3></div>
          <div className="bar-list">
            {types.map(({ id, t, n }) => (
              <div className="bar-row" key={id}>
                <div className="lab">{t.glyph} {t.label}</div>
                <div className="bar"><div className="fill" style={{ width: `${(n / Math.max(...types.map(x => x.n))) * 100}%`, background: `var(--ink-3)`, opacity: 0.6 }}></div></div>
                <div className="ct">{n}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>By brand</h3></div>
          <div className="bar-list">
            {brands.map(({ id, b, n }) => (
              <div className="bar-row" key={id}>
                <div className="lab"><span className={`chip brand-${id}`}>{id}</span> {b.label}</div>
                <div className="bar"><div className="fill" style={{ width: `${(n / Math.max(1, ...brands.map(x => x.n))) * 100}%`, background: `var(--ink-3)`, opacity: 0.6 }}></div></div>
                <div className="ct">{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Activity feed
// ===========================================================================
function ActivityView({ products, onOpen }) {
  const events = (PIPELINE_DATA.activity || []).slice().sort((a, b) => a.ts - b.ts);
  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <div className="card">
        <div className="card-h"><h3>Activity feed</h3><span className="meta">{events.length} events · last 30 days</span></div>
        <div className="feed-big">
          {events.map((e, i) => {
            const u = RD.person(e.user);
            const p = products.find(x => x.id === e.productId);
            const iconCh = ({version: "⤴", stage: "→", comment: "✎", approval: "✓", po: "🛒", listing: "📦", rfq: "💬", quote: "💵"})[e.type] || "•";
            return (
              <div className="feed-row" key={i}>
                <span className="when mono">{RD.daysAgoLabel(e.ts)}</span>
                <span className="icon" data-type={e.type}>{iconCh}</span>
                <div className="body">
                  {u && <RD.Avatar user={u} size="sm" />}
                  {u && <span className="actor">{u.name}</span>}{" "}
                  <span style={{ color: "var(--ink-2)" }}>{e.text}</span>
                  {p && <button className="pid-link mono" onClick={() => onOpen(e.productId)}> · {e.productId} {p.name}</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// People — workload + clickable queues
// ===========================================================================
function PeoplePage({ products, onOpen, setOwnerFilter, setView }) {
  const everyone = ["chesky", "joel", "malik", "ronel", "april", "esty", "paresh", "qaiser"]
    .map(id => RD.person(id)).filter(Boolean);

  return (
    <div style={{ padding: 16, maxWidth: 1320, margin: "0 auto" }}>
      <div className="people-grid">
        {everyone.map(u => {
          const onProduct = products.filter(p => RD.personIsOnProduct(p, u.id));
          const stuckCt = onProduct.filter(p => p.health === "stale" || p.health === "warn").length;
          const waiting = onProduct.filter(p => RD.waitingOn(p) === u.id);
          const recent = (PIPELINE_DATA.activity || []).filter(e => e.user === u.id).slice(0, 3);

          return (
            <div className="card person-card" key={u.id}>
              <div className="pc-h">
                <RD.Avatar user={u} size="lg" />
                <div>
                  <div className="pc-name">{u.name}</div>
                  <div className="pc-role">{u.role}</div>
                </div>
              </div>
              <div className="pc-stats">
                <div className="pc-stat"><div className="n mono">{onProduct.length}</div><div className="l">Active</div></div>
                <div className={`pc-stat ${stuckCt > 0 ? "warn" : ""}`}><div className="n mono">{stuckCt}</div><div className="l">Stuck</div></div>
                <div className={`pc-stat ${waiting.length > 0 ? "info" : ""}`}><div className="n mono">{waiting.length}</div><div className="l">Waiting on</div></div>
              </div>

              {waiting.length > 0 && (
                <div className="pc-section">
                  <div className="pc-sec-h">Waiting on {u.name.split(" ")[0]}</div>
                  {waiting.slice(0, 4).map(p => (
                    <button key={p.id} className="pc-row" onClick={() => onOpen(p.id)}>
                      <span className="mono">{p.id}</span>
                      <span className="pc-row-name">{p.name}</span>
                      <RD.StagePill stageId={p.stage} />
                    </button>
                  ))}
                </div>
              )}

              {recent.length > 0 && (
                <div className="pc-section">
                  <div className="pc-sec-h">Recent activity</div>
                  {recent.map((e, i) => (
                    <div key={i} className="pc-act">
                      <span style={{ color: "var(--ink-3)", fontSize: 11.5 }}>{RD.daysAgoLabel(e.ts)}</span>
                      <span style={{ fontSize: 12 }}>{e.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                      onClick={() => { setOwnerFilter(u.id); setView("table"); }}>
                Open {u.name.split(" ")[0]}'s queue →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// Notification rules
// ===========================================================================
function RulesView() {
  const rules = PIPELINE_DATA.rules || [];
  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-h">
          <h3>Notification rules</h3>
          <button className="btn sm primary" style={{ marginLeft: "auto" }}>+ New rule</button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          Define WHEN something happens, WHERE it applies, and WHO gets pinged.
          Rules fire across Slack DMs, channels, and email.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((r, i) => (
          <div className="card rule-card" key={i}>
            <div className="rc-top">
              <span className={`rule-toggle ${r.on ? "on" : "off"}`}>{r.on ? "ON" : "OFF"}</span>
              <h4>{r.title}</h4>
              <span className="meta" style={{ marginLeft: "auto" }}>{r.owner || "Workspace"}</span>
            </div>
            <div className="rc-rule">
              <span className="kw">WHEN</span> <span className="ev">{r.when}</span>
              {r.where && <><span className="kw">WHERE</span> <span className="ev">{r.where}</span></>}
              <span className="kw">→</span>
              <span className="ev">notify {(r.notify || []).join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Mock Slack feed
// ===========================================================================
function SlackView() {
  const msgs = PIPELINE_DATA.slack || [];
  const channels = [...new Set(msgs.map(m => m.channel))];
  const [active, setActive] = useStateZ(channels[0] || "#rd-pipeline");
  const visible = msgs.filter(m => m.channel === active);

  return (
    <div className="slack-wrap">
      <aside className="slack-side">
        <div className="ss-h">Channels</div>
        {channels.filter(c => c.startsWith("#")).map(c => (
          <button key={c} className={`ss-row ${active === c ? "active" : ""}`} onClick={() => setActive(c)}>{c}</button>
        ))}
        <div className="ss-h" style={{ marginTop: 12 }}>Direct messages</div>
        {channels.filter(c => !c.startsWith("#")).map(c => (
          <button key={c} className={`ss-row ${active === c ? "active" : ""}`} onClick={() => setActive(c)}>{c}</button>
        ))}
      </aside>
      <div className="slack-main">
        <div className="sm-h">
          <h3>{active}</h3>
          <span className="meta">{visible.length} messages</span>
        </div>
        <div className="sm-feed">
          {visible.map((m, i) => {
            const u = RD.person(m.user);
            return (
              <div className="slack-msg" key={i}>
                <RD.Avatar user={u || { name: "Bot", initials: "🤖", color: "neutral" }} size="md" />
                <div className="sm-body">
                  <div className="sm-meta">
                    <b>{u?.name || "Pipeline Bot"}</b>
                    <span className="when">{RD.daysAgoLabel(m.ts)}</span>
                    {m.bot && <span className="bot-tag">APP</span>}
                  </div>
                  <div className="sm-text" dangerouslySetInnerHTML={{ __html: m.text }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, { IdeaInbox, Dashboard, ActivityView, PeoplePage, RulesView, SlackView });
