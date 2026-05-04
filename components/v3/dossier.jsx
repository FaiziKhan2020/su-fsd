/* global React, RD2, PIPELINE_DATA */
const { useState: useSDS, useMemo: useMDS } = React;

// ===== Thesis card — persistent across all tabs =====
function ThesisCard({ p }) {
  const t = p.thesis;
  if (!t) return null;
  return (
    <div className="thesis-card">
      <div className="thesis-eyebrow">
        <span>The bet</span>
        <span className="thesis-meta">{p.code}</span>
      </div>
      <p className="thesis-statement">{t.statement}</p>
      <div className="thesis-grid">
        <div><div className="l">Revenue target</div><div className="v">{t.revenueTarget}</div></div>
        <div><div className="l">Timeline</div><div className="v">{t.timelineTarget}</div></div>
        <div><div className="l">Success metric</div><div className="v">{t.successMetric}</div></div>
        <div><div className="l">Key risk</div><div className="v" style={{ color: "var(--warn)" }}>{t.risk}</div></div>
      </div>
    </div>
  );
}

// ===== Live tab — thesis vs actual =====
function LiveTab({ p }) {
  const live = p.live;
  if (!live) return <div className="empty" style={{ padding: 30 }}>No live data yet — this tab appears once the listing goes live on Amazon.</div>;
  const verdictTone = live.actualVerdict.startsWith("BEAT") ? "ok"
                    : live.actualVerdict.startsWith("MISS") ? "err" : "warn";
  const compare = [
    { label: "Revenue (m6)",   thesis: live.thesisRevenue, actual: live.actualRevenue },
    { label: "Units / month",  thesis: live.thesisUnits,   actual: live.actualUnits },
    { label: "Rating",         thesis: live.thesisRating,  actual: live.actualRating },
    { label: "CPC",            thesis: live.thesisCpc,     actual: live.actualCpc },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
      <div className={`live-verdict tone-${verdictTone}`}>
        <div className="live-verdict-eyebrow">Post-launch verdict · ASIN {p.asin}</div>
        <h2>{live.actualVerdict}</h2>
        <p>{live.notes}</p>
      </div>
      <div className="card">
        <div className="card-h"><h3>Thesis vs actual</h3><span className="meta">side-by-side</span></div>
        <table className="live-table">
          <thead><tr><th>Metric</th><th>Thesis (at niche)</th><th>Actual (today)</th></tr></thead>
          <tbody>
            {compare.map(r => (
              <tr key={r.label}>
                <td className="metric-cell">{r.label}</td>
                <td className="thesis-cell mono">{r.thesis}</td>
                <td className="actual-cell mono">{r.actual}</td>
              </tr>
            ))}
            <tr>
              <td className="metric-cell">Verdict (one-liner)</td>
              <td className="thesis-cell" style={{ color: "var(--ink-2)" }}>{live.thesisVerdict}</td>
              <td className="actual-cell" style={{ fontWeight: 500 }}>{live.actualVerdict}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-h"><h3>Keyword rank</h3><span className="meta">target vs actual organic</span></div>
        <table className="live-table">
          <thead><tr><th>Keyword</th><th>Target rank</th><th>Actual rank</th><th>Hit?</th></tr></thead>
          <tbody>
            {live.keywordRank.map((k, i) => {
              const targetRank = parseInt(k.target.replace(/\D/g, "")) || 999;
              const actualRank = parseInt(k.actual.replace(/\D/g, "")) || 999;
              const hit = actualRank <= targetRank;
              return (
                <tr key={i}>
                  <td>{k.kw}</td>
                  <td className="mono" style={{ color: "var(--ink-3)" }}>{k.target}</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{k.actual}</td>
                  <td><span className={hit ? "hit-chip ok" : "hit-chip err"}>{hit ? "✓ Hit" : "✗ Miss"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== AI rail — proactive nudges =====
function AIRail({ p, onAction }) {
  const productNudges = PIPELINE_DATA.AI_NUDGES.filter(n => n.productId === p.id);
  const generated = [];
  if (!productNudges.length) {
    const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
    if (bench && (p.stageAge || 0) > bench.target) {
      generated.push({
        id: "auto-" + p.id, severity: "med", icon: "⚠",
        headline: `${p.code} is ${(p.stageAge || 0) - bench.target}d over ${bench.label.toLowerCase()} target`,
        detail: `Target is ${bench.target}d in ${RD2.stage(p.stage).label}. Currently at ${p.stageAge}d.`,
        actions: [{ label: "Ping owner", kind: "primary" }, { label: "Move to Hold", kind: "ghost" }],
      });
    } else if (p.stage === "build" && p.streams) {
      const slowest = Object.entries(p.streams).sort((a, b) => a[1].pct - b[1].pct)[0];
      const u = RD2.person(slowest[1].owner);
      generated.push({
        id: "auto-" + p.id, severity: "low", icon: "✦",
        headline: `${slowest[0].charAt(0).toUpperCase() + slowest[0].slice(1)} is the lagging stream`,
        detail: `${slowest[1].lastNote}. ${u?.name || "Owner"} owns it.`,
        actions: [{ label: `Ping ${u?.name || "owner"}`, kind: "primary" }],
      });
    } else {
      generated.push({
        id: "auto-" + p.id, severity: "low", icon: "✓",
        headline: "On track",
        detail: "No blockers detected. AI will surface nudges as the situation changes.",
        actions: [],
      });
    }
  }
  const all = [...productNudges, ...generated];
  return (
    <div className="ai-rail-v3">
      <div className="ai-rail-head">
        <span className="ai-rail-eyebrow">PIPELINE AI</span>
        <span className="ai-rail-meta">{all.length} {all.length === 1 ? "nudge" : "nudges"}</span>
      </div>
      <div className="ai-nudges">
        {all.map(n => (
          <div key={n.id} className={`ai-nudge sev-${n.severity}`}>
            <div className="ai-nudge-head">
              <span className="ai-nudge-icon">{n.icon}</span>
              <span className="ai-nudge-headline">{n.headline}</span>
            </div>
            <p className="ai-nudge-detail">{n.detail}</p>
            {n.actions.length > 0 && (
              <div className="ai-nudge-actions">
                {n.actions.map((a, i) => (
                  <button key={i} className={`btn xs ${a.kind || "ghost"}`} onClick={() => onAction?.(p.id, a.label)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Overview tab =====
function Overview({ p, onDecide, setTab, onUpload, onPromote, onReject }) {
  // Dual approval lives here for stage === "approval"
  if (p.stage === "approval") return <RD2.DualApproval p={p} onDecide={onDecide} />;

  // Idea stage — Promote / Reject hero
  if (p.stage === "idea") {
    const submitter = RD2.person(p.owner);
    return (
      <div className="stage-hero researching">
        <div className="stage-hero-eyebrow">💡 IDEA · PENDING REVIEW</div>
        <h2>{p.name}</h2>
        <p style={{ marginBottom: 4 }}>{p.synopsis}</p>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <span>Submitted by</span>
          {submitter && <RD2.Avatar user={submitter} size="sm" />}
          <span>{submitter?.name}</span>
          <span>·</span>
          <span>{p.createdDaysAgo}d ago</span>
        </div>
        <div className="stage-hero-actions">
          <button className="btn primary promote" onClick={() => onPromote && onPromote(p.id)}>Promote to Niche →</button>
          <button className="btn reject" onClick={() => onReject && onReject(p.id)}>Reject</button>
        </div>
      </div>
    );
  }

  // Niche stage — Researching → Upload CTA, Parsed → Submit for review
  if (p.stage === "niche") {
    if (p.nicheSubState === "researching") {
      return (
        <div className="stage-hero researching">
          <div className="stage-hero-eyebrow">⏱ NICHE ANALYSIS — RESEARCHING</div>
          <h2>Niche doc not parsed yet</h2>
          <p>Malik is {p.researchingDaysAgo}d in. Once the deep-dive Google Sheet is uploaded, AI parses it into structured fields and you can review.</p>
          <div className="stage-hero-actions">
            <button className="btn primary" onClick={onUpload}>Upload niche doc</button>
            <button className="btn" onClick={() => setTab("niche")}>View template</button>
          </div>
        </div>
      );
    }
    if (p.nicheSubState === "parsed") {
      return (
        <div className="stage-hero parsed">
          <div className="stage-hero-eyebrow">✓ DOC PARSED · READY TO SUBMIT</div>
          <h2>Niche analysis complete</h2>
          <p>AI parsed the document into structured fields. Submit to send to Chesky + Joel for go/no-go.</p>
          <div className="stage-hero-actions">
            <button className="btn primary" onClick={() => onDecide("__submitForReview")}>Submit for niche review</button>
            <button className="btn" onClick={() => setTab("niche")}>Open analysis</button>
          </div>
        </div>
      );
    }
  }

  // Build / production / launched / hold / killed → cockpit
  return <ProductCockpit p={p} setTab={setTab} />;
}

// ===== Product cockpit (Overview becomes the product home page) =====
function ProductCockpit({ p, setTab }) {
  const owner = RD2.person(p.owner);
  // Recent activity for this product (sorted, top 5)
  const recent = useMDS(() => {
    const events = (PIPELINE_DATA.ACTIVITY || []).filter(e => e.productId === p.id);
    return [...events].sort((a, b) => a.ts - b.ts).slice(0, 5);
  }, [p.id]);
  const recentComments = useMDS(() => {
    const cs = (PIPELINE_DATA.COMMENTS || []).filter(c => c.productId === p.id);
    return [...cs].sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 3);
  }, [p.id]);

  // Bench / over-target check
  const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
  const stageAge = p.stageAge || 0;
  const overdue  = bench && stageAge > bench.target;
  const stageInfo = RD2.stage(p.stage);

  // Stream snapshot (for Build / Production)
  const hasStreams = !!p.streams;
  const slowest = hasStreams
    ? Object.entries(p.streams).filter(([,s]) => s).sort((a, b) => a[1].pct - b[1].pct)[0]
    : null;

  // Hold / killed → simple banner only
  if (p.stage === "hold") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
        <div className="stage-hero" style={{ background: "var(--warn-bg)" }}>
          <div className="stage-hero-eyebrow">⏸ ON HOLD</div>
          <h2>Paused — {stageAge}d in hold</h2>
          <p>{p.synopsis}</p>
          <div className="stage-hero-actions">
            <button className="btn primary">Revive — move to Build</button>
            <button className="btn">Move to Killed</button>
          </div>
        </div>
        <CockpitJumpGrid p={p} setTab={setTab} />
      </div>
    );
  }
  if (p.stage === "killed") {
    const r = p.rejection;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
        <div className="stage-hero" style={{ background: "var(--err-bg)" }}>
          <div className="stage-hero-eyebrow">✕ KILLED{r ? ` · ${r.daysAgo === 0 ? "today" : RD2.daysAgoLabel(r.daysAgo)}` : ""}</div>
          <h2>{r?.category === "market" ? "No clear market gap"
              : r?.category === "sourcing" ? "Sourcing too risky / costly"
              : r?.category === "compliance" ? "Compliance issue"
              : r?.category === "duplicate" ? "Duplicate of existing SKU"
              : r?.category === "timing" ? "Wrong timing"
              : "Rejected"}</h2>
          {r?.reason
            ? <p style={{ fontStyle: "italic", borderLeft: "3px solid var(--err)", paddingLeft: 12, marginLeft: 0 }}>"{r.reason}"</p>
            : <p>{p.synopsis}</p>}
          {r?.by && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>— {RD2.person(r.by)?.name || r.by}</div>}
        </div>
        <CockpitJumpGrid p={p} setTab={setTab} />
      </div>
    );
  }

  return (
    <div className="cockpit">
      {/* === Status strip — what's happening RIGHT NOW === */}
      <div className={`cockpit-status ${overdue ? "tone-warn" : "tone-ok"}`}>
        <div className="cockpit-status-main">
          <div className="cockpit-status-eyebrow">Status</div>
          <div className="cockpit-status-headline">
            {p.stage === "launched" ? "Live on Amazon"
              : p.stage === "production" ? `In production · ${stageAge}d in stage`
              : p.stage === "build" ? `In build · ${stageAge}d in stage`
              : `${stageInfo?.label || p.stage} · ${stageAge}d in stage`}
          </div>
          {bench && (
            <div className="cockpit-status-meta">
              {overdue
                ? <><span style={{ color: "var(--warn)", fontWeight: 600 }}>{stageAge - bench.target}d over target</span> · {bench.label.toLowerCase()} {bench.target}d</>
                : <>On pace · {bench.label.toLowerCase()} {bench.target}d (currently {stageAge}d)</>}
            </div>
          )}
        </div>
        <div className="cockpit-status-actors">
          <div className="cockpit-actor">
            <div className="lbl">Owner</div>
            <div className="cockpit-actor-row">{owner && <RD2.Avatar user={owner} size="sm" />}<span>{owner?.name}</span></div>
          </div>
          {p.waitingOn && (
            <div className="cockpit-actor">
              <div className="lbl">Waiting on</div>
              <div className="cockpit-actor-row">
                <RD2.Avatar user={RD2.person(p.waitingOn)} size="sm" />
                <span>{RD2.person(p.waitingOn)?.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === Streams snapshot (build/production) === */}
      {hasStreams && (
        <div className="card">
          <div className="card-h">
            <h3>Workstreams</h3>
            <span className="meta">{slowest && `${slowest[0]} is the lagging stream`}</span>
          </div>
          <div className="cockpit-streams">
            {["sourcing", "design", "listing"].map(k => {
              const s = p.streams[k]; if (!s) return null;
              const u = RD2.person(s.owner);
              const tone = s.status === "Backorder" || s.status === "Stuck" ? "err"
                : s.status === "Approved" || s.status === "Ordered" ? "ok"
                : s.status === "Not started" ? "idle"
                : "active";
              return (
                <button key={k} className={`cockpit-stream tone-${tone}`} onClick={() => setTab(k)}>
                  <div className="cockpit-stream-head">
                    <span className="cockpit-stream-name">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <span className="cockpit-stream-pct mono">{s.pct}%</span>
                  </div>
                  <div className="cockpit-stream-track"><div className="cockpit-stream-fill" style={{ width: s.pct + "%" }}></div></div>
                  <div className="cockpit-stream-status">
                    <span className={`stream-status status-${(s.status || "").toLowerCase().replace(/\s/g, "-")}`}>{s.status}</span>
                  </div>
                  <div className="cockpit-stream-note">{s.lastNote}</div>
                  <div className="cockpit-stream-foot">
                    {u && <RD2.Avatar user={u} size="xs" />}
                    <span>{u?.name}</span>
                    <span className="cockpit-stream-arrow">Open →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === Live snapshot === */}
      {p.live && (
        <div className="card">
          <div className="card-h">
            <h3>Live on Amazon</h3>
            <span className="meta mono">ASIN {p.asin}</span>
            <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => setTab("live")}>Open Live tab →</button>
          </div>
          <div className="cockpit-live">
            <div><div className="lbl">Revenue (m6)</div><div className="cockpit-live-v">{p.live.actualRevenue}</div></div>
            <div><div className="lbl">Units / mo</div><div className="cockpit-live-v">{p.live.actualUnits}</div></div>
            <div><div className="lbl">Rating</div><div className="cockpit-live-v">{p.live.actualRating}</div></div>
            <div><div className="lbl">CPC</div><div className="cockpit-live-v">{p.live.actualCpc}</div></div>
            <div className="cockpit-live-verdict">
              <div className="lbl">Verdict vs thesis</div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: p.live.actualVerdict.startsWith("BEAT") ? "var(--ok)"
                     : p.live.actualVerdict.startsWith("MISS") ? "var(--err)"
                     : "var(--warn)"
              }}>{p.live.actualVerdict}</div>
            </div>
          </div>
        </div>
      )}

      {/* === Jump grid === */}
      <CockpitJumpGrid p={p} setTab={setTab} />

      {/* === Recent activity + recent comments === */}
      <div className="cockpit-foot">
        <div className="card">
          <div className="card-h"><h3>Recent activity</h3>
            <button className="btn xs" style={{ marginLeft: "auto" }} onClick={() => setTab("activity")}>See all →</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty" style={{ padding: 20, fontSize: 12 }}>No activity yet.</div>
          ) : (
            <div className="feed" style={{ padding: "8px 0" }}>
              {recent.map((e, i) => {
                const u = RD2.person(e.user);
                return (
                  <div className="feed-row" key={i}>
                    <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
                    <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "alert" ? "!" : e.type === "approval" ? "✓" : "✎"}</span>
                    <div className="body">
                      {u && <RD2.Avatar user={u} size="sm" />}
                      <span style={{ fontWeight: 500 }}>{u?.name}</span>
                      <span style={{ color: "var(--ink-2)" }}> {e.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-h"><h3>Recent comments</h3>
            <button className="btn xs" style={{ marginLeft: "auto" }} onClick={() => setTab("comments")}>Open thread →</button>
          </div>
          {recentComments.length === 0 ? (
            <div className="empty" style={{ padding: 20, fontSize: 12 }}>No comments yet.</div>
          ) : (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              {recentComments.map((c, i) => {
                const u = RD2.person(c.user);
                return (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
                    {u && <RD2.Avatar user={u} size="sm" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>{u?.name}</span>
                        {c.topic && c.topic !== "all" && <span className="topic-chip">{c.topic}</span>}
                        <span style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 11 }}>{RD2.daysAgoLabel(c.daysAgo)}</span>
                      </div>
                      <div style={{ color: "var(--ink-2)", marginTop: 2, lineHeight: 1.45 }}>{c.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Jump grid — every "destination" for this product
function CockpitJumpGrid({ p, setTab }) {
  const tiles = [];
  if (p.niche) {
    tiles.push({ id: "niche", label: "Niche analysis", glyph: "✦",
      meta: p.niche.versions?.length ? `v${p.niche.versions.length} · ${RD2.daysAgoLabel(p.niche.versions[0].daysAgo)}` : "—" });
  }
  if (p.bom) {
    tiles.push({ id: "sourcing", label: "Sourcing", glyph: "⛁",
      meta: p.costEst ? `${p.costEst.quotedPct}% quoted · ${p.costEst.unit}/unit` : `${p.bom.length} ingredients` });
  }
  if (p.label || p.box || p.insert) {
    const total = (p.label?.versions?.length || 0) + (p.box?.versions?.length || 0) + (p.insert?.versions?.length || 0);
    tiles.push({ id: "design", label: "Design", glyph: "◧", meta: `${total} versions across label/box/insert` });
  }
  if (p.listing) {
    tiles.push({ id: "listing", label: "Listing", glyph: "≡",
      meta: p.listing.live?.done ? "Live" : p.listing.approved?.done ? "Approved" : p.listing.created?.done ? "Drafting" : "Skeleton" });
  }
  if (p.live) tiles.push({ id: "live", label: "Live performance", glyph: "◉", meta: p.live.actualRevenue + " · " + p.live.actualRating + "★" });
  tiles.push({ id: "comments", label: "Comments", glyph: "✎",
    meta: `${(PIPELINE_DATA.COMMENTS || []).filter(c => c.productId === p.id).length} threads` });
  tiles.push({ id: "activity", label: "Activity log", glyph: "↻",
    meta: `${(PIPELINE_DATA.ACTIVITY || []).filter(e => e.productId === p.id).length} events` });

  return (
    <div className="cockpit-jumps">
      {tiles.map(t => (
        <button key={t.id} className="cockpit-jump" onClick={() => setTab(t.id)}>
          <div className="cockpit-jump-glyph">{t.glyph}</div>
          <div className="cockpit-jump-body">
            <div className="cockpit-jump-label">{t.label}</div>
            <div className="cockpit-jump-meta">{t.meta}</div>
          </div>
          <div className="cockpit-jump-arrow">→</div>
        </button>
      ))}
    </div>
  );
}

// ===== Dossier (full-screen overlay) =====
function Dossier({ productId, onClose, onDecide, onUploadNiche, onPromote, onReject, focus }) {
  const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === productId);
  const [tab, setTab] = useSDS("overview");
  const [showUpload, setShowUpload] = useSDS(false);
  const [topicFilter, setTopicFilter] = useSDS(null);
  const [aiCollapsed, setAiCollapsed] = useSDS(true);
  const [seedDraft, setSeedDraft] = useSDS("");

  // Apply focus on first open / when focus changes
  React.useEffect(() => {
    if (!focus || !p) return;
    if (focus === "approval") setTab("overview");
    else if (focus === "live") setTab("live");
    else if (focus === "niche") setTab("niche");
    else if (focus.startsWith("stream:")) {
      const k = focus.slice(7); setTab(k); setTopicFilter(k);
    }
    else if (focus.startsWith("comments")) {
      setTab("comments");
      const t = focus.split(":")[1];
      if (t) setTopicFilter(t);
    }
  }, [focus, productId]);

  if (!p) return null;
  const owner = RD2.person(p.owner);

  const tabs = [
    { id: "overview", label: "Overview" },
    p.live && { id: "live", label: "Live" },
    p.niche && { id: "niche", label: "Niche analysis" },
    p.streams && { id: "sourcing", label: "Sourcing" },
    p.streams && { id: "design", label: "Design" },
    p.streams && { id: "listing", label: "Listing" },
    { id: "comments", label: "Comments" },
    { id: "activity", label: "Activity" },
  ].filter(Boolean);

  const onTabChange = (t) => {
    setTab(t);
    if (["sourcing", "design", "listing", "niche"].includes(t)) {
      setTopicFilter(t === "design" ? "label" : t);
    } else setTopicFilter(null);
  };

  const handleAIAction = (pid, label) => {
    // Wire common actions: Ping owner / Ping <Name> → switch to comments + seed draft
    if (/^Ping\b/i.test(label)) {
      // Try to extract a name; otherwise use product owner
      const nameMatch = label.match(/Ping\s+(.+)/i);
      let target = nameMatch ? nameMatch[1].trim().toLowerCase() : null;
      let person = null;
      if (target && target !== "owner") {
        person = PIPELINE_DATA.PEOPLE.find(u => u.name.toLowerCase() === target);
      }
      if (!person) person = RD2.person(p.owner);
      const handle = person?.id || "owner";
      setTab("comments");
      setTopicFilter("all");
      setSeedDraft(`@${handle} `);
      return;
    }
    if (/move to hold/i.test(label)) {
      // Visual cue only — doesn't actually move state in this prototype
      console.log("Would move to hold:", pid);
      return;
    }
    if (/dismiss/i.test(label)) return;
    console.log("AI action:", pid, label);
  };

  return (
    <div className="dossier-overlay" onClick={onClose}>
      <div className={`dossier ${aiCollapsed ? "ai-collapsed" : ""}`} onClick={e => e.stopPropagation()}>
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
            <button className="btn sm" onClick={() => setAiCollapsed(c => !c)} title="Toggle AI rail" style={{ marginLeft: 8 }}>
              {aiCollapsed ? "✦ Show Pipeline AI" : "Hide AI"}
            </button>
          </div>
        </div>

        <div className="dossier-title">
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>{p.name}</h1>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{p.synopsis}</p>
          <div style={{ marginTop: 14 }}><ThesisCard p={p} /></div>
        </div>

        <div className="dossier-tabs">
          {tabs.map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)} className={tab === t.id ? "active" : ""}>{t.label}</button>
          ))}
        </div>

        <div className="dossier-body">
          {tab === "overview" && <Overview p={p} onDecide={onDecide} setTab={onTabChange} onUpload={() => setShowUpload(true)} onPromote={onPromote} onReject={onReject} />}
          {tab === "live" && <LiveTab p={p} />}
          {tab === "niche" && <RD2.NicheDoc p={p} />}
          {tab === "sourcing" && <RD2.SourcingTab p={p} />}
          {tab === "design" && <RD2.DesignTab p={p} />}
          {tab === "listing" && <RD2.ListingTab p={p} />}
          {tab === "comments" && <RD2.Comments productId={p.id} topicFilter={topicFilter} setTopicFilter={setTopicFilter} seedDraft={seedDraft} />}
          {tab === "activity" && <ActivityList p={p} />}
        </div>

        {!aiCollapsed && (
          <div className="dossier-rail">
            <AIRail p={p} onAction={handleAIAction} />
            <div style={{ marginTop: 16 }}>
              <div className="rail-section-h">Latest comments</div>
              <RD2.Comments productId={p.id} topicFilter={topicFilter} setTopicFilter={setTopicFilter} />
            </div>
          </div>
        )}
      </div>

      {showUpload && (
        <RD2.NicheUploadModal productId={p.id} onClose={() => setShowUpload(false)}
          onComplete={(data) => { onUploadNiche(p.id, data); setShowUpload(false); }} />
      )}
    </div>
  );
}

function ActivityList({ p }) {
  const events = PIPELINE_DATA.ACTIVITY.filter(e => e.productId === p.id).sort((a, b) => a.ts - b.ts);
  if (!events.length) return <div className="empty" style={{ padding: 30 }}>No activity yet.</div>;
  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <div className="card-h"><h3>Activity</h3><span className="meta">{events.length} events</span></div>
      <div className="feed">
        {events.map((e, i) => {
          const u = RD2.person(e.user);
          return (
            <div className="feed-row" key={i}>
              <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
              <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "alert" ? "!" : e.type === "approval" ? "✓" : "✎"}</span>
              <div className="body">
                {u && <RD2.Avatar user={u} size="sm" />}
                <span style={{ fontWeight: 500 }}>{u?.name}</span>
                <span style={{ color: "var(--ink-2)" }}> {e.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { Dossier, ThesisCard, LiveTab, AIRail });
