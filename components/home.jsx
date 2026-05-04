/* global React, RD */

// ===========================================================================
// Home — practical "what's going on / what do I need to push" view
// Built around Chesky's role: overseer + final approver
// ===========================================================================
function HomeView({ onOpen, setView, setOwnerFilter }) {
  const me = RD.person("chesky");
  const products = PIPELINE_DATA.products;

  // ---- Triage buckets ----
  // Awaiting Chesky: things blocked on YOU specifically
  const awaitingMe = products.filter(p => {
    if (p.stage === "approval") return true;            // niche analysis pending approval
    if (p.gatesAwaitingChesky) return true;             // explicit flag
    return false;
  });

  // Stuck: anything red or stale-warn for too long, sorted by oldest
  const stuck = products
    .filter(p => p.health === "stale" || (p.health === "warn" && p.lastActivity > 7))
    .filter(p => !["launched", "parked"].includes(p.stage))
    .sort((a, b) => b.lastActivity - a.lastActivity);

  // What changed (last 5 days)
  const recentActivity = (PIPELINE_DATA.activity || []).filter(e => e.ts <= 5).slice(0, 12);

  // Per-person workload (where can I push?)
  const peopleQueues = ["malik", "ronel", "april", "esty", "paresh", "qaiser"].map(uid => {
    const u = RD.person(uid);
    const owned = products.filter(p => RD.personIsOnProduct(p, uid));
    const stuckCt = owned.filter(p => p.health === "stale" || p.health === "warn").length;
    const waitingOnThemCt = owned.filter(p => RD.waitingOn(p) === uid).length;
    return { u, count: owned.length, stuck: stuckCt, waiting: waitingOnThemCt };
  });

  // Funnel deltas (mocked but shaped right)
  const stageDeltas = { idea: +4, niche: +1, approval: +1, build: 0, production: -1, launched: +1, hold: 0, parked: 0 };

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="home-wrap">
      {/* Header */}
      <div className="home-hero">
        <div>
          <div className="home-eyebrow mono">{dayName.toUpperCase()} · {dateStr.toUpperCase()}</div>
          <h1 className="home-h1">Good morning, {me.name.split(" ")[0]}.</h1>
          <p className="home-brief">
            <b>{awaitingMe.length}</b> {awaitingMe.length === 1 ? "decision needs" : "decisions need"} you today.
            Malik logged <b>3 new ideas</b> overnight. Ronel has <b>2 quotes back</b> from vendors —{" "}
            <b>HC304</b> liver blend came in $0.42/unit higher than v2. April's listing for{" "}
            <b>HG140</b> went live yesterday. <b>HG135</b> has been parked in Niche for 18 days.
          </p>
        </div>
        <div className="home-pulse">
          <div className="pulse-stat warn"><div className="n">{awaitingMe.length}</div><div className="l">Need you</div></div>
          <div className="pulse-stat err"><div className="n">{stuck.length}</div><div className="l">Stuck</div></div>
          <div className="pulse-stat"><div className="n">{products.filter(p => p.stage === "build").length}</div><div className="l">In build</div></div>
          <div className="pulse-stat"><div className="n">{products.filter(p => p.stage === "idea").length}</div><div className="l">Ideas in</div></div>
          <div className="pulse-stat ok"><div className="n">{products.filter(p => p.stage === "launched").length}</div><div className="l">Live</div></div>
        </div>
      </div>

      {/* Top row: Awaiting you + What changed */}
      <div className="home-grid-2">
        <div className="card triage">
          <div className="card-h">
            <h3><span className="dot-warn"></span>Awaiting your decision</h3>
            <span className="meta">{awaitingMe.length}</span>
          </div>
          {awaitingMe.length === 0 ? (
            <div className="empty" style={{ padding: 24, fontSize: 12 }}>You're caught up. ✓</div>
          ) : (
            <div className="triage-list">
              {awaitingMe.map(p => (
                <button key={p.id} className="triage-row" onClick={() => onOpen(p.id)}>
                  <div className="tr-top">
                    <span className="mono pid-strong">{p.id}</span>
                    <span className={`chip brand-${p.brand}`}>{p.brand}</span>
                    <RD.StagePill stageId={p.stage} />
                  </div>
                  <div className="tr-name">{p.name}</div>
                  <div className="tr-reason">
                    {p.stage === "approval" && <span className="reason-tag warn">⏳ Niche analysis ready for go/no-go</span>}
                    {p.gatesAwaitingChesky && <span className="reason-tag warn">⏳ {p.gatesAwaitingChesky}</span>}
                  </div>
                  <div className="tr-cta">Review now <span className="arr">→</span></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card triage">
          <div className="card-h">
            <h3><span className="dot-info"></span>What changed</h3>
            <span className="meta">last 5d · {recentActivity.length} events</span>
          </div>
          <div className="triage-list slim">
            {recentActivity.map((e, i) => {
              const u = RD.person(e.user);
              const p = products.find(x => x.id === e.productId);
              const iconCh = ({version: "⤴", stage: "→", comment: "✎", approval: "✓", po: "🛒", listing: "📦", rfq: "💬"})[e.type] || "•";
              return (
                <div className="movement-row" key={i}>
                  <span className="mv-icon" data-type={e.type}>{iconCh}</span>
                  <div className="mv-body">
                    <div className="mv-line">
                      {u && <span className="mv-actor">{u.name}</span>} <span className="mv-text">{e.text}</span>
                    </div>
                    <div className="mv-sub">
                      <span className="pid-strong mono" onClick={(ev) => { ev.stopPropagation(); onOpen(e.productId); }}>{e.productId}</span>
                      {p && <span> · {p.name}</span>}
                      <span className="mv-when mono">{RD.daysAgoLabel(e.ts)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn sm" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => setView("activity")}>See full activity →</button>
        </div>
      </div>

      {/* Stuck row */}
      <div className="card triage">
        <div className="card-h">
          <h3><span className="dot-err"></span>Stuck &amp; aging — push these</h3>
          <span className="meta">{stuck.length}</span>
        </div>
        {stuck.length === 0 ? (
          <div className="empty" style={{ padding: 24, fontSize: 12 }}>Nothing aging. Nice.</div>
        ) : (
          <div className="stuck-grid">
            {stuck.slice(0, 6).map(p => {
              const sStage = RD.stage(p.stage);
              const blocker = RD.whyStuck(p);
              const blame = RD.person(RD.waitingOn(p));
              return (
                <div key={p.id} className="stuck-row">
                  <div className="st-bar" style={{ background: `var(--stage-${sStage?.color}-ink)` }}></div>
                  <button className="st-body" onClick={() => onOpen(p.id)}>
                    <div className="tr-top">
                      <span className="mono pid-strong">{p.id}</span>
                      <RD.StagePill stageId={p.stage} />
                      <span className="age mono">{p.lastActivity}d idle</span>
                    </div>
                    <div className="tr-name">{p.name}</div>
                    {blocker && <div className="stuck-why">{blocker}</div>}
                  </button>
                  <div className="stuck-actions">
                    {blame && <RD.Avatar user={blame} size="sm" title={`Waiting on ${blame.name}`} />}
                    <button className="btn sm" onClick={(e) => e.stopPropagation()} title="Send Slack nudge">↗ nudge</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* People + Funnel */}
      <div className="home-grid-2">
        <div className="card">
          <div className="card-h">
            <h3>By person — who's holding what?</h3>
            <button className="btn sm" onClick={() => setView("people")}>Open People →</button>
          </div>
          <div className="people-mini">
            {peopleQueues.map(({ u, count, stuck, waiting }) => (
              <button key={u.id} className="pm-row" onClick={() => { setOwnerFilter(u.id); setView("table"); }}>
                <RD.Avatar user={u} size="md" />
                <div className="pm-name">
                  <div>{u.name}</div>
                  <div className="pm-role">{u.role}</div>
                </div>
                <div className="pm-stats">
                  <span className="pm-stat"><span className="n mono">{count}</span><span className="l">active</span></span>
                  <span className={`pm-stat ${stuck > 0 ? "warn" : ""}`}><span className="n mono">{stuck}</span><span className="l">stuck</span></span>
                  <span className={`pm-stat ${waiting > 0 ? "info" : ""}`}><span className="n mono">{waiting}</span><span className="l">on them</span></span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Pipeline pulse</h3>
            <span className="meta">vs. last week</span>
          </div>
          <div className="funnel">
            {PIPELINE_DATA.STAGES.map(s => {
              const items = products.filter(p => p.stage === s.id);
              const max = Math.max(1, ...PIPELINE_DATA.STAGES.map(ss => products.filter(p => p.stage === ss.id).length));
              const delta = stageDeltas[s.id] || 0;
              return (
                <div className="funnel-row" key={s.id}>
                  <div className="name"><RD.StagePill stageId={s.id} /></div>
                  <div className="bar">
                    <div className="fill" style={{ width: `${(items.length / max) * 100}%`, background: `var(--stage-${s.color}-ink)`, opacity: 0.7 }}></div>
                  </div>
                  <div className="ct">{items.length}</div>
                  <div className={`delta-mini mono ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`}>
                    {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, { HomeView });
