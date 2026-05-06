/* global React, RD2, PIPELINE_DATA */
const { useState: useSH, useMemo: useMH } = React;

// ===== Home — "What to push today" =====
function Home({ onOpen, setView }) {
  const products = PIPELINE_DATA.PRODUCTS;
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  // Build prioritized "what to push" queue
  const queue = useMH(() => {
    const items = [];

    // 1. Things waiting on Chesky (highest priority)
    products.filter(p => p.waitingOn === "chesky").forEach(p => {
      items.push({
        type: "approval",
        priority: 1,
        productId: p.id,
        focus: "approval",
        product: p,
        action: "Decide go/no-go",
        why: p.stage === "approval" ? `Niche analysis ready · ${p.code}` : "Awaiting your sign-off",
        person: null,
        cta: "Review →",
        ageDays: p.lastActivity,
      });
    });

    // 2. Stuck items past stage cycle target — push the owner
    products.forEach(p => {
      const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
      if (!bench) return;
      const overdue = (p.stageAge || 0) - bench.target;
      if (overdue > 3) {
        items.push({
          type: "stuck",
          priority: 2,
          productId: p.id,
          focus: "comments:all",
          product: p,
          action: `Push ${RD2.person(p.owner)?.name || "owner"}`,
          why: `${overdue}d over ${bench.label.toLowerCase()} target · ${p.stageAge}d in ${RD2.stage(p.stage).label}`,
          person: RD2.person(p.owner),
          cta: "Open →",
          ageDays: p.lastActivity,
        });
      }
    });

    // 3. Build products with backorder / stuck stream
    products.filter(p => p.stage === "build" && p.streams).forEach(p => {
      Object.entries(p.streams).forEach(([k, s]) => {
        if (s.status === "Backorder") {
          items.push({
            type: "blocker",
            priority: 1,
            productId: p.id,
            focus: "stream:" + k,
            product: p,
            action: "Unblock " + k,
            why: `${s.lastNote}`,
            person: RD2.person(s.owner),
            cta: "Open →",
            ageDays: p.lastActivity,
          });
        }
      });
    });

    // 4. Launched products with thesis miss
    products.filter(p => p.live && p.live.actualVerdict.startsWith("MISS")).forEach(p => {
      items.push({
        type: "miss",
        priority: 3,
        productId: p.id,
        focus: "live",
        product: p,
        action: "Diagnose miss",
        why: p.live.actualVerdict,
        person: null,
        cta: "Open Live →",
        ageDays: 0,
      });
    });

    // 5. Idea inbox older than 5d
    products.filter(p => p.stage === "idea" && p.createdDaysAgo >= 5).forEach(p => {
      items.push({
        type: "idea",
        priority: 4,
        productId: p.id,
        focus: null,
        product: p,
        action: "Triage idea",
        why: `${p.createdDaysAgo}d old · Malik waiting`,
        person: RD2.person("malik"),
        cta: "Promote / reject →",
        ageDays: p.createdDaysAgo,
      });
    });

    return items.sort((a, b) => a.priority - b.priority || b.ageDays - a.ageDays);
  }, [products]);

  const counts = useMH(() => ({
    waiting: products.filter(p => p.waitingOn === "chesky").length,
    inbox: products.filter(p => p.stage === "idea").length,
    active: products.filter(p => ["niche","build","production"].includes(p.stage)).length,
    stuck: products.filter(p => {
      const b = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
      return b && (p.stageAge || 0) > b.target;
    }).length,
  }), [products]);

  const todayCount = queue.filter(q => q.priority <= 2).length;

  return (
    <div className="home-v3">
      <div className="home-hero-v3">
        <div>
          <div className="home-eyebrow mono">{dayName.toUpperCase()} · {dateStr.toUpperCase()}</div>
          <h1 className="home-h1-v3">What to push today.</h1>
          <p className="home-brief-v3">
            {todayCount === 0 ? "Inbox zero. Nice." : `${todayCount} ${todayCount === 1 ? "thing needs" : "things need"} you. Below in priority order — tap to dispatch.`}
          </p>
        </div>
        <div className="home-pulse-v3">
          <button className="pulse-stat-v3 warn" onClick={() => setView("inbox")}><div className="n">{counts.waiting}</div><div className="l">Waiting on you</div></button>
          <button className="pulse-stat-v3" onClick={() => setView("inbox")}><div className="n">{counts.inbox}</div><div className="l">Inbox</div></button>
          <button className="pulse-stat-v3" onClick={() => setView("pipeline")}><div className="n">{counts.active}</div><div className="l">Active</div></button>
          <button className="pulse-stat-v3 err" onClick={() => setView("pipeline")}><div className="n">{counts.stuck}</div><div className="l">Stuck</div></button>
        </div>
      </div>

      <div className="push-queue">
        <div className="push-queue-head">
          <h2>Push queue</h2>
          <span className="muted">Priority order · {queue.length} items</span>
        </div>
        {queue.length === 0 && (
          <div className="empty" style={{ padding: 50, textAlign: "center" }}>
            <div style={{ fontSize: 36 }}>✓</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>Nothing to push. Pipeline running clean.</div>
          </div>
        )}
        {queue.map((q, i) => (
          <button key={i} className={`push-row priority-${q.priority} type-${q.type}`} onClick={() => onOpen(q.productId, q.focus)}>
            <div className="push-priority-marker">{q.priority}</div>
            <div className="push-action-col">
              <div className="push-action">{q.action}</div>
              <div className="push-why">{q.why}</div>
            </div>
            <div className="push-product-col">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{q.product.code}</span>
                <RD2.BrandChip b={q.product.brand} />
                <RD2.StagePill stageId={q.product.stage} />
              </div>
              <div className="push-name">{q.product.name}</div>
            </div>
            <div className="push-person-col">
              {q.person && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <RD2.Avatar user={q.person} size="sm" />
                  <span style={{ color: "var(--ink-2)" }}>{q.person.name}</span>
                </div>
              )}
            </div>
            <div className="push-cta">{q.cta}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h"><h3>Last 24 hours</h3><span className="meta">across pipeline</span></div>
        <div className="feed">
          {PIPELINE_DATA.ACTIVITY.filter(e => e.ts < 1.5).map((e, i) => {
            const u = RD2.person(e.user);
            const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === e.productId);
            return (
              <div className="feed-row" key={i}>
                <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
                <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "approval" ? "✓" : e.type === "alert" ? "!" : "✎"}</span>
                <div className="body">
                  {u && <RD2.Avatar user={u} size="sm" />}
                  <span style={{ fontWeight: 500 }}>{u?.name}</span>
                  <span style={{ color: "var(--ink-2)" }}> {e.text} on </span>
                  <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }} onClick={() => onOpen(e.productId)}>{p?.code || e.productId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== People (load-aware) =====
function People({ onPersonClick }) {
  const products = PIPELINE_DATA.PRODUCTS;
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>People</h1>
        <div style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 4 }}>Load per person. Tap any face to see their queue.</div>
      </div>
      <div className="people-grid">
        {PIPELINE_DATA.PEOPLE.map(u => {
          const owned = products.filter(p =>
            p.owner === u.id || p.createdBy === u.id ||
            (p.streams && Object.values(p.streams).some(s => s?.owner === u.id))
          );
          const stuck = owned.filter(p => {
            const b = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
            return b && (p.stageAge || 0) > b.target;
          });
          const waitingOn = products.filter(p => p.waitingOn === u.id);
          const loadTone = owned.length >= 6 ? "err" : owned.length >= 4 ? "warn" : "ok";
          const loadPct = Math.min(100, owned.length * 14);

          return (
            <button key={u.id} className="person-card-v3" onClick={() => onPersonClick(u.id)}>
              <div className="person-head-v3">
                <RD2.Avatar user={u} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="person-name-v3">{u.name}</div>
                  <div className="person-role-v3">{u.role}</div>
                </div>
              </div>
              <div className={`person-load tone-${loadTone}`}>
                <div className="person-load-track"><div className="person-load-fill" style={{ width: loadPct + "%" }}></div></div>
                <div className="person-load-meta">
                  <span className="mono">{owned.length} active</span>
                  {stuck.length > 0 && <span className="stuck-chip">{stuck.length} stuck</span>}
                  {waitingOn.length > 0 && <span className="waiting-chip">{waitingOn.length} on you</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vendor scorecard — sits below team load, surfaces aggregate vendor performance */}
      {RD2.VendorScorecard && <div style={{ marginTop: 32 }}><RD2.VendorScorecard /></div>}
    </div>
  );
}

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
