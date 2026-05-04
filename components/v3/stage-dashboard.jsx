/* global React, RD2, PIPELINE_DATA */
const { useMemo: useMSD } = React;

// Stage-specific dashboard — replaces the kanban-board view when clicking a stage in the left rail.
// Each stage gets a different layout that surfaces what matters AT THAT STAGE.
function StageDashboard({ stageId, products, onOpen }) {
  const stage = RD2.stage(stageId);
  const items = products.filter(p => p.stage === stageId);
  const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[stageId];

  // Buckets: over-target / on-pace
  const { over, onPace } = useMSD(() => {
    const o = []; const k = [];
    items.forEach(p => {
      const age = p.stageAge || 0;
      if (bench && age > bench.target) o.push(p); else k.push(p);
    });
    o.sort((a, b) => (b.stageAge || 0) - (a.stageAge || 0));
    k.sort((a, b) => (b.stageAge || 0) - (a.stageAge || 0));
    return { over: o, onPace: k };
  }, [items, bench]);

  return (
    <div className="stage-dash">
      <div className="stage-dash-head">
        <div className="stage-dash-title">
          <span className="stage-dash-pill" style={{
            background: `var(--stage-${stage.color})`,
            color: `var(--stage-${stage.color}-ink)`
          }}>·</span>
          <div>
            <div className="stage-dash-name">{stage.label}</div>
            <div className="stage-dash-desc">{stage.desc}</div>
          </div>
        </div>
        <div className="stage-dash-stats">
          <div className="stage-dash-stat"><div className="n">{items.length}</div><div className="l">In stage</div></div>
          {bench && <div className="stage-dash-stat"><div className="n">{bench.target}d</div><div className="l">Target</div></div>}
          {bench && over.length > 0 && (
            <div className="stage-dash-stat tone-warn"><div className="n">{over.length}</div><div className="l">Over target</div></div>
          )}
        </div>
      </div>

      {/* Stage-specific top sections */}
      {stageId === "approval" && <ApprovalDash items={items} onOpen={onOpen} />}
      {stageId === "build"    && <BuildDash items={items} onOpen={onOpen} />}
      {stageId === "production" && <BuildDash items={items} onOpen={onOpen} />}
      {stageId === "niche"    && <NicheDash items={items} onOpen={onOpen} />}
      {stageId === "idea"     && <IdeaDash items={items} onOpen={onOpen} />}
      {stageId === "launched" && <LaunchedDash items={items} onOpen={onOpen} />}
      {(stageId === "hold" || stageId === "killed") && <SimpleList items={items} onOpen={onOpen} />}

      {/* Generic over-target / on-pace fallback for stages without a custom view */}
      {!["approval","build","production","niche","idea","launched","hold","killed"].includes(stageId) && (
        <>
          {over.length > 0 && (
            <div className="stage-dash-section">
              <div className="stage-dash-section-h">⚠ Over target <span className="count">{over.length}</span></div>
              <DashList items={over} onOpen={onOpen} bench={bench} />
            </div>
          )}
          <div className="stage-dash-section">
            <div className="stage-dash-section-h">On pace <span className="count">{onPace.length}</span></div>
            <DashList items={onPace} onOpen={onOpen} bench={bench} />
          </div>
        </>
      )}

      {items.length === 0 && (
        <div className="stage-dash-empty">No products in {stage.label.toLowerCase()}.</div>
      )}
    </div>
  );
}

// ===== Niche stage =====
// Three buckets: researching / parsed / total. Show doc state, owner, days in.
function NicheDash({ items, onOpen }) {
  const researching = items.filter(p => p.nicheSubState === "researching");
  const parsed      = items.filter(p => p.nicheSubState === "parsed");
  return (
    <>
      {parsed.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h" style={{ color: "var(--ok)" }}>
            ✓ Doc parsed · ready to submit for review <span className="count">{parsed.length}</span>
          </div>
          <DashList items={parsed} onOpen={onOpen} kind="niche" />
        </div>
      )}
      <div className="stage-dash-section">
        <div className="stage-dash-section-h">⏱ Researching <span className="count">{researching.length}</span></div>
        <DashList items={researching} onOpen={onOpen} kind="niche" />
      </div>
    </>
  );
}

// ===== Approval stage =====
// Group by who's holding it: waiting on Chesky, waiting on Joel, both decided.
function ApprovalDash({ items, onOpen }) {
  const waitingChesky = items.filter(p => p.waitingOn === "chesky");
  const waitingJoel   = items.filter(p => p.waitingOn === "joel");
  const other         = items.filter(p => p.waitingOn !== "chesky" && p.waitingOn !== "joel");
  return (
    <>
      {waitingChesky.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h">Waiting on Chesky <span className="count">{waitingChesky.length}</span></div>
          <DashList items={waitingChesky} onOpen={onOpen} kind="approval" />
        </div>
      )}
      {waitingJoel.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h">Waiting on Joel <span className="count">{waitingJoel.length}</span></div>
          <DashList items={waitingJoel} onOpen={onOpen} kind="approval" />
        </div>
      )}
      {other.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h">Other <span className="count">{other.length}</span></div>
          <DashList items={other} onOpen={onOpen} kind="approval" />
        </div>
      )}
    </>
  );
}

// ===== Build / Production stage =====
// Health-driven: stuck / lagging / on-track. Shows stream % at-a-glance.
function BuildDash({ items, onOpen }) {
  const stuck = items.filter(p => {
    if (!p.streams) return false;
    return Object.values(p.streams).some(s => s && (s.status === "Backorder" || s.status === "Stuck"));
  });
  const lagging = items.filter(p => {
    if (stuck.includes(p)) return false;
    const bench = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
    return bench && (p.stageAge || 0) > bench.target;
  });
  const onTrack = items.filter(p => !stuck.includes(p) && !lagging.includes(p));
  return (
    <>
      {stuck.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h" style={{ color: "var(--err)" }}>⚠ Stuck — vendor or supplier blocker <span className="count">{stuck.length}</span></div>
          <DashList items={stuck} onOpen={onOpen} kind="build" />
        </div>
      )}
      {lagging.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h" style={{ color: "var(--warn)" }}>Over target <span className="count">{lagging.length}</span></div>
          <DashList items={lagging} onOpen={onOpen} kind="build" />
        </div>
      )}
      <div className="stage-dash-section">
        <div className="stage-dash-section-h">On track <span className="count">{onTrack.length}</span></div>
        <DashList items={onTrack} onOpen={onOpen} kind="build" />
      </div>
    </>
  );
}

// ===== Idea stage =====
function IdeaDash({ items, onOpen }) {
  const aged = items.filter(p => p.createdDaysAgo >= 5);
  const fresh = items.filter(p => p.createdDaysAgo < 5);
  return (
    <>
      {aged.length > 0 && (
        <div className="stage-dash-section">
          <div className="stage-dash-section-h" style={{ color: "var(--warn)" }}>Aged in inbox &gt;5d <span className="count">{aged.length}</span></div>
          <DashList items={aged} onOpen={onOpen} kind="idea" />
        </div>
      )}
      <div className="stage-dash-section">
        <div className="stage-dash-section-h">Fresh <span className="count">{fresh.length}</span></div>
        <DashList items={fresh} onOpen={onOpen} kind="idea" />
      </div>
    </>
  );
}

// ===== Launched =====
function LaunchedDash({ items, onOpen }) {
  return (
    <div className="stage-dash-section">
      <div className="stage-dash-section-h">Live on Amazon <span className="count">{items.length}</span></div>
      <DashList items={items} onOpen={onOpen} kind="launched" />
    </div>
  );
}

function SimpleList({ items, onOpen }) {
  return <div className="stage-dash-section"><DashList items={items} onOpen={onOpen} /></div>;
}

// ===== Generic dense list row =====
function DashList({ items, onOpen, bench, kind }) {
  if (!items?.length) return <div className="stage-dash-empty" style={{ padding: 16 }}>None.</div>;
  return (
    <div className="stage-dash-list">
      {items.map(p => <DashRow key={p.id} p={p} onOpen={onOpen} bench={bench || PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage]} kind={kind} />)}
    </div>
  );
}

function DashRow({ p, onOpen, bench, kind }) {
  const owner = RD2.person(p.owner);
  const age = p.stageAge || 0;
  const overdue = bench && age > bench.target;
  const ageTone = bench ? (age > bench.target * 1.5 ? "err" : age > bench.target ? "warn" : "") : "";

  // Per-stage tertiary line
  let line = null;
  if (kind === "niche") {
    if (p.nicheSubState === "researching") line = `Malik researching · ${p.researchingDaysAgo || 0}d in`;
    else if (p.nicheSubState === "parsed") line = `Doc parsed (${p.docUploadedDaysAgo || 0}d ago) · awaiting submit`;
  } else if (kind === "approval") {
    const c = p.approvals?.chesky?.decision;
    const j = p.approvals?.joel?.decision;
    line = `Chesky: ${c || "pending"} · Joel: ${j || "pending"}`;
  } else if (kind === "build") {
    if (p.streams) {
      const blocker = Object.entries(p.streams).find(([,s]) => s && (s.status === "Backorder" || s.status === "Stuck"));
      if (blocker) line = `${blocker[0]}: ${blocker[1].lastNote}`;
      else {
        const slowest = Object.entries(p.streams).filter(([,s]) => s).sort((a,b) => a[1].pct - b[1].pct)[0];
        if (slowest) line = `${slowest[0]} ${slowest[1].pct}% · ${slowest[1].lastNote}`;
      }
    }
  } else if (kind === "idea") {
    line = p.synopsis;
  } else if (kind === "launched") {
    if (p.live) line = `${p.live.actualRevenue} · ${p.live.actualRating}★ · ${p.live.actualVerdict}`;
  } else {
    line = p.synopsis;
  }

  // Per-stream dot row for build/production
  const streamDots = (kind === "build" && p.streams) && (
    <div className="stage-dash-row-streams" title="sourcing · design · listing">
      {["sourcing","design","listing"].map(k => {
        const s = p.streams[k]; if (!s) return <div key={k} className="stage-dash-row-stream-dot"></div>;
        const tone = s.status === "Backorder" || s.status === "Stuck" ? "err"
          : s.status === "Approved" || s.status === "Ordered" ? "ok" : "";
        return (
          <div key={k} className={`stage-dash-row-stream-dot ${tone}`} title={`${k}: ${s.pct}% ${s.status}`}>
            <div className="fill" style={{ right: `${100 - s.pct}%` }}></div>
          </div>
        );
      })}
    </div>
  );

  return (
    <button className="stage-dash-row" onClick={() => onOpen(p.id)}>
      <div className="stage-dash-row-main">
        <div className="stage-dash-row-meta1">
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
          <RD2.BrandChip b={p.brand} />
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{RD2.type(p.type)?.glyph} {RD2.type(p.type)?.label}</span>
          <RD2.HealthDot p={p} />
        </div>
        <div className="stage-dash-row-name">{p.name}</div>
        {line && <div className="stage-dash-row-line">{line}</div>}
      </div>
      {streamDots}
      <div className="stage-dash-row-owner">
        {owner && <RD2.Avatar user={owner} size="sm" />}
        <span>{owner?.name}</span>
      </div>
      <div className={`stage-dash-row-age ${ageTone}`}>
        {bench
          ? (overdue ? `${age}d · +${age - bench.target}d` : `${age}d / ${bench.target}d`)
          : `${age}d`}
      </div>
    </button>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { StageDashboard });
