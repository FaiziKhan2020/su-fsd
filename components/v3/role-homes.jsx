/* global React, RD2, PIPELINE_DATA */
const { useMemo: useMRH } = React;

// ===== Shared atoms for role homes =====
function HomeHero({ user, dayName, dateStr, headline, sub, stats }) {
  return (
    <div className="home-hero-v3">
      <div>
        <div className="home-eyebrow mono">
          {dayName.toUpperCase()} · {dateStr.toUpperCase()}
          {user && <> · MORNING, {user.name.toUpperCase()}</>}
        </div>
        <h1 className="home-h1-v3">{headline}</h1>
        <p className="home-brief-v3">{sub}</p>
      </div>
      {stats && (
        <div className="home-pulse-v3">
          {stats.map((s, i) => (
            <button key={i} className={`pulse-stat-v3 ${s.tone || ""}`} onClick={s.onClick}>
              <div className="n">{s.n}</div>
              <div className="l">{s.l}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({ priority, action, why, product, person, cta, onClick, kicker }) {
  return (
    <button className={`push-row priority-${priority || 2}`} onClick={onClick}>
      <div className="push-priority-marker">{priority || ""}</div>
      <div className="push-action-col">
        <div className="push-action">{action}</div>
        <div className="push-why">{why}</div>
      </div>
      <div className="push-product-col">
        {product ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{product.code}</span>
              <RD2.BrandChip b={product.brand} />
              <RD2.StagePill stageId={product.stage} />
            </div>
            <div className="push-name">{product.name}</div>
          </>
        ) : (
          <div className="push-name" style={{ color: "var(--ink-3)" }}>{kicker || ""}</div>
        )}
      </div>
      <div className="push-person-col">
        {person && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <RD2.Avatar user={person} size="sm" />
            <span style={{ color: "var(--ink-2)" }}>{person.name}</span>
          </div>
        )}
      </div>
      <div className="push-cta">{cta || "Open →"}</div>
    </button>
  );
}

function EmptyDay({ icon = "✓", text = "Inbox zero. Nice." }) {
  return (
    <div className="empty" style={{ padding: 50, textAlign: "center" }}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontSize: 14, marginTop: 6 }}>{text}</div>
    </div>
  );
}

// ===== Overseer Home (Malik / Joel / Chesky) =====
// This is the existing "What to push today" — the cross-pipeline cockpit.
function OverseerHome({ user, onOpen, setView }) {
  const products = PIPELINE_DATA.PRODUCTS;
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const queue = useMRH(() => {
    const items = [];

    // 1. Things waiting on Chesky / Joel (highest priority)
    if (user.id === "chesky" || user.id === "joel") {
      products.filter(p => p.waitingOn === user.id).forEach(p => {
        // Joel-specific: cost-pass-against-locked-PDS gets its own copy
        const isCostPass = user.id === "joel"
          && p.stage === "rd"
          && p.rdGate?.pdsLocked
          && p.costPass?.status !== "done";
        if (isCostPass) {
          items.push({
            type: "cost-pass", priority: 1, productId: p.id, focus: "tab:cost", product: p,
            action: "Run cost pass",
            why: `PDS locked · ${(p.costPass?.ingredients || []).length} ings to quote`,
            person: null, cta: "Open cost pass →", ageDays: p.lastActivity,
          });
          return;
        }
        items.push({
          type: "approval", priority: 1, productId: p.id, focus: "approval", product: p,
          action: "Decide go/no-go",
          why: p.stage === "approval" ? `Niche analysis ready · ${p.code}` : "Awaiting your sign-off",
          person: null, cta: "Review →", ageDays: p.lastActivity,
        });
      });
    }

    // For Malik specifically: ideas needing triage + niche docs in flight
    if (user.id === "malik") {
      products.filter(p => p.stage === "idea" && p.createdDaysAgo >= 3).forEach(p => {
        items.push({
          type: "idea", priority: 1, productId: p.id, focus: null, product: p,
          action: "Triage idea",
          why: `${p.createdDaysAgo}d old in inbox`,
          person: null, cta: "Promote / reject →", ageDays: p.createdDaysAgo,
        });
      });
      products.filter(p => p.stage === "niche" && p.nicheSubState === "researching" && p.lastActivity > 5).forEach(p => {
        items.push({
          type: "niche-stale", priority: 2, productId: p.id, focus: null, product: p,
          action: "Resume niche research",
          why: `Started ${p.researchingDaysAgo || p.lastActivity}d ago, no doc uploaded yet`,
          person: null, cta: "Open →", ageDays: p.lastActivity,
        });
      });
    }

    // 2. Stuck items past stage cycle target
    products.forEach(p => {
      const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
      if (!bench) return;
      const overdue = (p.stageAge || 0) - bench.target;
      if (overdue > 3) {
        items.push({
          type: "stuck", priority: 2, productId: p.id, focus: "comments:all", product: p,
          action: "Unstick",
          why: `${overdue}d over ${bench.label.toLowerCase()} target · ${p.stageAge}d in ${RD2.stage(p.stage).label}`,
          person: null, cta: "Open →", ageDays: p.lastActivity,
        });
      }
    });

    // 3. Build products with backorder / stuck stream
    products.filter(p => p.stage === "build" && p.streams).forEach(p => {
      Object.entries(p.streams).forEach(([k, s]) => {
        if (s.status === "Backorder" || s.status === "Stuck") {
          items.push({
            type: "blocker", priority: 1, productId: p.id, focus: "stream:" + k, product: p,
            action: "Unblock " + k,
            why: s.lastNote, person: RD2.person(s.owner), cta: "Open →", ageDays: p.lastActivity,
          });
        }
      });
    });

    // 4. Launched products with thesis miss
    products.filter(p => p.live && p.live.actualVerdict && p.live.actualVerdict.startsWith("MISS")).forEach(p => {
      items.push({
        type: "miss", priority: 3, productId: p.id, focus: "live", product: p,
        action: "Diagnose miss", why: p.live.actualVerdict, person: null,
        cta: "Open Live →", ageDays: 0,
      });
    });

    // dedupe by productId+type
    const seen = new Set();
    const out = [];
    items.sort((a, b) => a.priority - b.priority || b.ageDays - a.ageDays).forEach(it => {
      const k = it.productId + ":" + it.type;
      if (!seen.has(k)) { seen.add(k); out.push(it); }
    });
    return out;
  }, [products, user.id]);

  const counts = {
    waiting: products.filter(p => p.waitingOn === user.id).length,
    inbox: products.filter(p => p.stage === "idea").length,
    active: products.filter(p => ["niche","approval","rd","build","production"].includes(p.stage)).length,
    stuck: products.filter(p => {
      const b = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
      return b && (p.stageAge || 0) > b.target;
    }).length,
  };

  const todayCount = queue.filter(q => q.priority <= 2).length;
  const headline = todayCount === 0 ? "Pipeline running clean." : "What to push today.";
  const sub = todayCount === 0
    ? "Nothing on fire. Browse below if you want to look ahead."
    : `${todayCount} ${todayCount === 1 ? "thing needs" : "things need"} you. Below in priority order — tap to dispatch.`;

  return (
    <div className="home-v3">
      <HomeHero user={user} dayName={dayName} dateStr={dateStr} headline={headline} sub={sub}
        stats={[
          { n: counts.waiting, l: "Waiting on you", tone: counts.waiting ? "warn" : "", onClick: () => setView("inbox") },
          { n: counts.inbox,   l: "Inbox",          onClick: () => setView("inbox") },
          { n: counts.active,  l: "Active",         onClick: () => setView("pipeline") },
          { n: counts.stuck,   l: "Stuck",          tone: counts.stuck ? "err" : "", onClick: () => setView("pipeline") },
        ]} />

      <div className="push-queue">
        <div className="push-queue-head">
          <h2>Push queue</h2>
          <span className="muted">Priority order · {queue.length} items</span>
        </div>
        {queue.length === 0 && <EmptyDay />}
        {queue.map((q, i) => (
          <QueueRow key={i}
            priority={q.priority} action={q.action} why={q.why}
            product={q.product} person={q.person} cta={q.cta}
            onClick={() => onOpen(q.productId, q.focus)} />
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h"><h3>Last 24 hours</h3><span className="meta">across pipeline</span></div>
        <div className="feed">
          {PIPELINE_DATA.ACTIVITY.filter(e => e.ts < 1.5).slice(0, 10).map((e, i) => {
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

// ===== Sourcing Home (Ronel) =====
function SourcingHome({ user, onOpen, setView }) {
  const products = PIPELINE_DATA.PRODUCTS;
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  // Ronel's universe:
  //  1) Build-stage products with sourcing stream still in progress
  //  2) Backorders / blockers in his sourcing streams
  //  3) Production-stage POs to track
  const buckets = useMRH(() => {
    const sourcingActive = products.filter(p =>
      ["build", "production"].includes(p.stage) && p.streams?.sourcing?.owner === "ronel"
    );
    const blockers = sourcingActive.filter(p =>
      ["Backorder", "Stuck"].includes(p.streams.sourcing.status)
    );
    const quoting = sourcingActive.filter(p =>
      ["Quoting", "Drafting"].includes(p.streams.sourcing.status)
    );
    const ordered = sourcingActive.filter(p =>
      ["Ordered", "In transit"].includes(p.streams.sourcing.status)
    );
    return { blockers, quoting, ordered, sourcingActive };
  }, [products]);

  const todayCount = buckets.blockers.length;
  const headline = todayCount === 0 ? "Sourcing running clean." : `${todayCount} ${todayCount === 1 ? "thing" : "things"} on your plate.`;
  const sub = todayCount === 0
    ? "No blockers. Quoting work below."
    : "Blockers first — those move the pipeline.";

  return (
    <div className="home-v3">
      <HomeHero user={user} dayName={dayName} dateStr={dateStr} headline={headline} sub={sub}
        stats={[
          { n: buckets.blockers.length, l: "Blocked", tone: buckets.blockers.length ? "err" : "", onClick: () => setView("pipeline") },
          { n: buckets.quoting.length,  l: "Quoting" },
          { n: buckets.ordered.length,  l: "Ordered" },
          { n: buckets.sourcingActive.length, l: "Total active" },
        ]} />

      {buckets.blockers.length > 0 && (
        <div className="push-queue">
          <div className="push-queue-head">
            <h2>⚠ Blockers</h2>
            <span className="muted">Backorders + stuck sourcing</span>
          </div>
          {buckets.blockers.map(p => (
            <QueueRow key={p.id} priority={1}
              action={"Resolve " + p.streams.sourcing.status.toLowerCase()}
              why={p.streams.sourcing.lastNote}
              product={p}
              cta="Open sourcing →"
              onClick={() => onOpen(p.id, "stream:sourcing")} />
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h"><h3>Quote queue</h3><span className="meta">{buckets.quoting.length} active</span></div>
        {buckets.quoting.length === 0 && <EmptyDay icon="·" text="No active quoting." />}
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <tbody>
            {buckets.quoting.map(p => (
              <tr key={p.id} onClick={() => onOpen(p.id, "tab:sourcing")} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
                    <RD2.BrandChip b={p.brand} />
                  </div>
                  <div style={{ fontWeight: 500, marginTop: 2 }}>{p.name}</div>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ink-2)", fontSize: 12 }}>{p.streams.sourcing.lastNote}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", width: 90 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.streams.sourcing.pct}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {buckets.ordered.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h3>Ordered · tracking</h3><span className="meta">{buckets.ordered.length}</span></div>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <tbody>
              {buckets.ordered.map(p => (
                <tr key={p.id} onClick={() => onOpen(p.id, "tab:sourcing")} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
                    <span style={{ marginLeft: 6, fontWeight: 500 }}>{p.name}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--ink-2)", fontSize: 12 }}>{p.streams.sourcing.lastNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== Listing Home (April) =====
function ListingHome({ user, onOpen, setView }) {
  const products = PIPELINE_DATA.PRODUCTS;
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const buckets = useMRH(() => {
    // Listing universe is build/production — anywhere with a listing stream
    const all = products.filter(p =>
      ["build", "production", "launched"].includes(p.stage) && p.streams?.listing?.owner === "april"
    );
    const drafting = all.filter(p => ["Drafting", "Not started"].includes(p.streams.listing.status));
    const inReview = all.filter(p => ["In review", "Submitted"].includes(p.streams.listing.status));
    const approved = all.filter(p => p.streams.listing.status === "Approved");
    // Amazon checks pending — approximation (any "Submitted")
    const awaitingAmazon = all.filter(p => p.listing?.approved?.done === false && p.listing?.created?.done);
    return { all, drafting, inReview, approved, awaitingAmazon };
  }, [products]);

  const todayCount = buckets.drafting.length + buckets.inReview.length;
  const headline = todayCount === 0 ? "Listings caught up." : `${todayCount} listing${todayCount === 1 ? "" : "s"} need work.`;
  const sub = todayCount === 0
    ? "Nothing in draft. Approved + waiting-on-Amazon below."
    : "Drafts and reviews first — pipeline is waiting on you to push to Amazon.";

  return (
    <div className="home-v3">
      <HomeHero user={user} dayName={dayName} dateStr={dateStr} headline={headline} sub={sub}
        stats={[
          { n: buckets.drafting.length, l: "Drafting", tone: buckets.drafting.length ? "warn" : "", onClick: () => setView("pipeline") },
          { n: buckets.inReview.length, l: "In review" },
          { n: buckets.awaitingAmazon.length, l: "On Amazon" },
          { n: buckets.approved.length, l: "Approved" },
        ]} />

      {buckets.drafting.length > 0 && (
        <div className="push-queue">
          <div className="push-queue-head">
            <h2>Drafts to write</h2>
            <span className="muted">Title, bullets, A+ copy</span>
          </div>
          {buckets.drafting.map(p => (
            <QueueRow key={p.id} priority={1}
              action={p.streams.listing.status === "Not started" ? "Start listing" : "Continue draft"}
              why={p.streams.listing.lastNote}
              product={p}
              cta="Open listing →"
              onClick={() => onOpen(p.id, "tab:listing")} />
          ))}
        </div>
      )}

      {buckets.inReview.length > 0 && (
        <div className="push-queue" style={{ marginTop: 14 }}>
          <div className="push-queue-head">
            <h2>In review</h2>
            <span className="muted">Awaiting Chesky / Joel sign-off</span>
          </div>
          {buckets.inReview.map(p => (
            <QueueRow key={p.id} priority={2}
              action="Chase reviewer"
              why={p.streams.listing.lastNote}
              product={p}
              cta="Open →"
              onClick={() => onOpen(p.id, "tab:listing")} />
          ))}
        </div>
      )}

      {buckets.awaitingAmazon.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h3>Submitted to Amazon</h3><span className="meta">{buckets.awaitingAmazon.length} waiting</span></div>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <tbody>
              {buckets.awaitingAmazon.map(p => (
                <tr key={p.id} onClick={() => onOpen(p.id, "tab:listing")} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
                    <span style={{ marginLeft: 6, fontWeight: 500 }}>{p.name}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--ink-2)", fontSize: 12 }}>{p.listing?.approved?.note || "Awaiting Amazon verdict"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {buckets.all.length === 0 && <EmptyDay icon="·" text="No listings assigned yet." />}
    </div>
  );
}

// ===== Design Home (Esty) =====
// Esty receives a wireframe brief for every label/box/insert.
// She opens it, sees every detail, uploads her finished design.
// Two simple buckets: WORK ON YOU (no design uploaded yet) and WAITING ON REVIEW.
function DesignHome({ user, onOpen, setView }) {
  const products = PIPELINE_DATA.PRODUCTS;
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const buckets = useMRH(() => {
    const active = products.filter(p =>
      ["build", "production"].includes(p.stage) && p.streams?.design?.owner === "esty"
    );
    const work = []; // wireframe locked, design not yet uploaded
    const review = []; // uploaded, waiting on someone else
    const blocked = []; // wireframe not yet locked — blocking Esty
    active.forEach(p => {
      const wfLocked = p.wireframe?.status === "locked";
      if (!wfLocked) {
        // Roll up to one row per product (any blocking status)
        blocked.push({ product: p, wfStatus: p.wireframe?.status || "not-started" });
        return;
      }
      ["label", "box", "insert"].forEach(kind => {
        const a = p[kind];
        if (!a || a.status === "N/A") return;
        const wf = RD2.buildWireframe(p, kind);
        if (!wf) return; // type doesn't use this kind
        const vCount = a.versions?.length || 0;
        const item = { product: p, kind, status: a.status, vCount, wf };
        if (["Draft", "Drafting", "Not started"].includes(a.status)) work.push(item);
        else if (["In review", "Submitted"].includes(a.status)) review.push(item);
      });
    });
    return { active, work, review, blocked };
  }, [products]);

  const todayCount = buckets.work.length;
  const headline = todayCount === 0
    ? (buckets.blocked.length > 0 ? "Caught up on design — waiting on wireframes." : "Design caught up.")
    : `${todayCount} asset${todayCount === 1 ? "" : "s"} to design.`;
  const sub = todayCount === 0
    ? (buckets.blocked.length > 0 ? "All your unblocked work is shipped or in review." : "Nothing waiting on you.")
    : "Wireframe is locked. Upload your design.";

  return (
    <div className="home-v3">
      <HomeHero user={user} dayName={dayName} dateStr={dateStr} headline={headline} sub={sub}
        stats={[
          { n: buckets.work.length,    l: "To design", tone: buckets.work.length ? "warn" : "", onClick: () => setView("pipeline") },
          { n: buckets.review.length,  l: "In review" },
          { n: buckets.blocked.length, l: "Waiting on wireframe", tone: buckets.blocked.length ? "" : "" },
        ]} />

      {buckets.work.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="push-queue-head" style={{ marginBottom: 0 }}>
            <h2>Wireframes ready for you</h2>
            <span className="muted">Wireframe is locked. Tap to design and upload your file.</span>
          </div>
          {buckets.work.map((a, i) => (
            <EstyWireframeCard key={i} item={a} onOpen={onOpen} />
          ))}
        </div>
      )}

      {buckets.blocked.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <h3>Waiting on wireframe lock</h3>
            <span className="meta">Blocked — Malik or Chesky needs to act</span>
          </div>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <tbody>
              {buckets.blocked.map((b, i) => (
                <tr key={i} onClick={() => onOpen(b.product.id, "tab:design:label")} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{b.product.code}</span>
                    <span style={{ marginLeft: 6, fontWeight: 500 }}>{b.product.name}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--ink-2)" }}>
                    <span className={`wf-status-pill status-${b.wfStatus.replace(/[^a-z]/g, "-")}`}>
                      {b.wfStatus === "not-started" ? "Wireframe not started" :
                       b.wfStatus === "pending-malik-review" ? "PDS dropped — Malik reviewing" :
                       b.wfStatus === "pending-chesky-approval" ? "Awaiting Chesky approval" :
                       b.wfStatus === "revisions-requested" ? "Revisions requested" : b.wfStatus}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {buckets.review.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h"><h3>Uploaded — waiting on review</h3><span className="meta">Chesky / Joel sign-off</span></div>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <tbody>
              {buckets.review.map((a, i) => (
                <tr key={i} onClick={() => onOpen(a.product.id, "tab:design:" + a.kind)} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.product.code}</span>
                    <span style={{ marginLeft: 6, fontWeight: 500 }}>{a.product.name}</span>
                  </td>
                  <td style={{ padding: "10px 12px", textTransform: "capitalize", color: "var(--ink-2)" }}>{a.kind}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: "var(--info-bg)", color: "var(--info)" }}>{a.status}</span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>v{a.vCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {buckets.active.length === 0 && <EmptyDay icon="·" text="No design work assigned." />}
    </div>
  );
}

// ===== Esty wireframe card — the workhorse on her home =====
function EstyWireframeCard({ item, onOpen }) {
  const { product: p, kind, status, vCount, wf } = item;
  const action = vCount === 0 ? `Design ${kind} v1` : `Design ${kind} v${vCount + 1}`;
  return (
    <div className="esty-wf-card" onClick={() => onOpen(p.id, "tab:design:" + kind)}>
      <div className="esty-wf-card-head">
        <div className="esty-wf-card-titleblock">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
            <RD2.BrandChip b={p.brand} />
            <span className="esty-wf-card-name">{p.name}</span>
            <span className="esty-wf-kind-pill">{kind}</span>
          </div>
          <div className="esty-wf-card-action">{action}</div>
        </div>
        <button className="btn primary" onClick={(e) => { e.stopPropagation(); onOpen(p.id, "tab:design:" + kind); }}>
          Open wireframe →
        </button>
      </div>
      <RD2.WireframePreview p={p} kind={kind} compact />
      {status !== "Not started" && (
        <div className="esty-wf-card-foot">
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>You're on v{vCount} · status: <b style={{ color: "var(--ink-2)" }}>{status}</b></span>
        </div>
      )}
    </div>
  );
}

// ===== Image team Home (Paresh / Qaiser) =====
// Shorter version — they need to see image briefs from April.
function ImageHome({ user, onOpen, setView }) {
  const products = PIPELINE_DATA.PRODUCTS;
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  // Image briefs come from products in build/production
  const briefs = products.filter(p =>
    ["build", "production"].includes(p.stage) && p.streams?.listing
  );

  return (
    <div className="home-v3">
      <HomeHero user={user} dayName={dayName} dateStr={dateStr}
        headline={user.id === "paresh" ? "Main images today." : "Gallery + A+ today."}
        sub={`${briefs.length} brief${briefs.length === 1 ? "" : "s"} open from April.`}
        stats={[
          { n: briefs.length, l: "Briefs open", onClick: () => setView("pipeline") },
        ]} />

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h"><h3>Image briefs</h3><span className="meta">from April</span></div>
        {briefs.length === 0 && <EmptyDay icon="·" text="No briefs assigned." />}
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <tbody>
            {briefs.map(p => (
              <tr key={p.id} onClick={() => onOpen(p.id, "tab:listing")} style={{ cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
                    <RD2.BrandChip b={p.brand} />
                    <RD2.StagePill stageId={p.stage} />
                  </div>
                  <div style={{ fontWeight: 500, marginTop: 2 }}>{p.name}</div>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ink-2)", fontSize: 12 }}>{p.streams.listing.lastNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Router =====
function RoleHome({ currentUser, onOpen, setView }) {
  const user = RD2.person(currentUser) || RD2.person("chesky");
  const overseers = ["chesky", "joel", "malik"];
  if (overseers.includes(user.id))      return <OverseerHome user={user} onOpen={onOpen} setView={setView} />;
  if (user.id === "ronel")              return <SourcingHome user={user} onOpen={onOpen} setView={setView} />;
  if (user.id === "april")              return <ListingHome  user={user} onOpen={onOpen} setView={setView} />;
  if (user.id === "esty")               return <DesignHome   user={user} onOpen={onOpen} setView={setView} />;
  if (["paresh","qaiser"].includes(user.id)) return <ImageHome user={user} onOpen={onOpen} setView={setView} />;
  return <OverseerHome user={user} onOpen={onOpen} setView={setView} />;
}

window.RD2 = Object.assign(window.RD2 || {}, { RoleHome, OverseerHome, SourcingHome, ListingHome, DesignHome, ImageHome });
