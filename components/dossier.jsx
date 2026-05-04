/* global React, RD */
const { useState: useStateX, useMemo: useMemoX } = React;

function Dossier({ p, onBack }) {
  const [tab, setTab] = useStateX("overview");
  const [specVer, setSpecVer] = useStateX(null);
  const [pkgVer, setPkgVer]  = useStateX(null);
  const [aiOpen, setAiOpen]  = useStateX(false);

  const a = RD.person(p.assignee);
  const t = RD.type(p.type);

  const specs = p.versions?.spec || [];
  const pkgs  = p.versions?.packaging || [];
  const currentSpec = specVer ?? specs[specs.length - 1]?.n;
  const currentPkg  = pkgVer  ?? pkgs[pkgs.length - 1]?.n;

  // Stage gate computation
  const gates = [
    { id: "spec",      label: "Spec sheet locked",       done: p.specStatus === "locked" },
    { id: "sampling",  label: "Sampling approved",       done: p.sampling === "Approved", warn: p.sampling === "Requested" },
    { id: "packaging", label: "Packaging approved",      done: p.packaging === "Approved" },
    { id: "asin",      label: "ASIN active",             done: !!p.asin && p.listing === "Approved", warn: p.listing === "Listed/Pending" },
    { id: "rec",       label: "R&D recommendation",      done: p.recommendation === "proceed", warn: p.recommendation === "changes" },
    { id: "purch",     label: "Purchasing started",      done: false },
  ];

  return (
    <div className="dossier" data-ai={aiOpen ? "1" : "0"}>
      {/* LEFT */}
      <aside className="dossier-left">
        <button className="btn sm" onClick={onBack} style={{ alignSelf: "flex-start" }}>← Pipeline</button>

        <div className="metafield">
          <div className="k">Stage</div>
          <div><RD.StagePill stageId={p.stage} /></div>
        </div>
        <div className="metafield">
          <div className="k">Health</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RD.HealthDot p={p} />
            <span>{p.health === "ok" ? "On track" : p.health === "warn" ? "Attention needed" : "Stale"}</span>
          </div>
        </div>
        <div className="metafield">
          <div className="k">Brand</div>
          <div><span className={`chip brand-${p.brand}`}>{p.brand}</span> {RD.brand(p.brand)?.label}</div>
        </div>
        <div className="metafield">
          <div className="k">Type</div>
          <div>{t?.glyph} {t?.label}</div>
        </div>
        <div className="metafield">
          <div className="k">Assignee</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {a && <RD.Avatar user={a} size="sm" />} {a?.name}
          </div>
        </div>
        <div className="metafield">
          <div className="k">ASIN</div>
          <div className="mono" style={{ fontSize: 12 }}>{p.asin || "—"}</div>
        </div>
        <div className="metafield">
          <div className="k">UPC</div>
          <div className="mono" style={{ fontSize: 12 }}>{p.upc || "—"}</div>
        </div>
        <div className="metafield">
          <div className="k">In stage</div>
          <div className="mono" style={{ fontSize: 12 }}>{p.stageEntered}d</div>
        </div>

        <div className="divider"></div>

        <div className="h-section" style={{ margin: 0 }}>Stage gates · soft</div>
        <div className="gates">
          {gates.map(g => (
            <div key={g.id} className={`gate ${g.done ? "done" : g.warn ? "warn" : "todo"}`}>
              <span className="check">{g.done ? "✓" : g.warn ? "!" : ""}</span>
              <span>{g.label}</span>
            </div>
          ))}
        </div>

        {(p.holdReason || p.parkReason || p.blockers?.length) && (
          <>
            <div className="divider"></div>
            <div className="h-section" style={{ margin: 0 }}>Notes</div>
            {p.holdReason && <div className="card" style={{ background: "var(--warn-bg)", borderColor: "var(--warn)", color: "var(--warn)" }}>{p.holdReason}</div>}
            {p.parkReason && <div className="card" style={{ background: "var(--err-bg)", borderColor: "var(--err)", color: "var(--err)" }}>{p.parkReason}</div>}
            {(p.blockers || []).map((b, i) => <div key={i} className="card" style={{ background: "var(--warn-bg)", borderColor: "transparent", fontSize: 12 }}>⚠ {b}</div>)}
          </>
        )}
      </aside>

      {/* CENTER */}
      <div className="dossier-center">
        <div className="dossier-header">
          <div className="crumbs"><span>Pipeline</span><span>/</span><span>{RD.stage(p.stage)?.label}</span></div>
          <h1>
            <span className="mono" style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500 }}>{p.id}</span>
            {p.name}
          </h1>
          <div className="sub">
            <RD.HealthDot p={p} />
            <span>Last activity {RD.daysAgoLabel(p.lastActivity)}</span>
            <span>·</span>
            <span>{RD.totalVersions(p)} versions across {Object.keys(p.versions || {}).length} artifacts</span>
            <span style={{ flex: 1 }}></span>
            <button className="btn sm" onClick={() => setAiOpen(v => !v)}>
              {aiOpen ? "Hide AI ›" : "✦ Ask AI"}
            </button>
            <button className="btn sm">Move stage…</button>
            <button className="btn sm primary">+ New version</button>
          </div>
        </div>
        <div className="dossier-tabs">
          {[
            ["overview",  "Overview"],
            ["spec",      `Spec ${specs.length ? `· ${specs.length}` : ""}`],
            ["packaging", `Packaging ${pkgs.length ? `· ${pkgs.length}` : ""}`],
            ["listing",   "Listing"],
            ["niche",     "Niche"],
            ["files",     "Files"],
            ["activity",  "Activity"],
          ].map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="dossier-body">
          {tab === "overview" && <OverviewTab p={p} setTab={setTab} />}
          {tab === "spec" && <SpecTab p={p} versions={specs} current={currentSpec} setCurrent={setSpecVer} />}
          {tab === "packaging" && <PackagingTab p={p} versions={pkgs} current={currentPkg} setCurrent={setPkgVer} />}
          {tab === "listing"  && <ListingTab p={p} />}
          {tab === "niche"    && <NicheTab p={p} />}
          {tab === "files"    && <FilesTab p={p} />}
          {tab === "activity" && <ActivityTab p={p} />}
        </div>
      </div>

      {/* RIGHT — collapsible AI rail */}
      {aiOpen && (
        <aside className="dossier-right">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="h-section" style={{ margin: 0 }}>Pipeline AI</div>
            <button className="btn sm" onClick={() => setAiOpen(false)} title="Close">×</button>
          </div>
          <RD.AIPanel p={p} />
          <div className="h-section" style={{ margin: 0 }}>Recent activity</div>
          <ProductActivity p={p} />
        </aside>
      )}
    </div>
  );
}

// ----- Tabs -----
function OverviewTab({ p, setTab }) {
  const lastSpec = RD.lastVer(p, "spec");
  const lastPkg  = RD.lastVer(p, "packaging");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div className="card">
        <div className="card-h"><h3>Latest spec</h3><span className="meta">{lastSpec ? `v${lastSpec.n} · ${RD.daysAgoLabel(lastSpec.daysAgo)}` : "—"}</span></div>
        {lastSpec ? (
          <>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{lastSpec.note || "No note on this version."}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
              <button className="btn sm" onClick={() => setTab("spec")}>Open spec</button>
              <button className="btn sm">Compare with v1</button>
            </div>
          </>
        ) : <div style={{ color: "var(--ink-3)", fontSize: 13 }}>No spec uploaded yet.</div>}
      </div>

      <div className="card">
        <div className="card-h"><h3>Latest packaging</h3><span className="meta">{lastPkg ? `v${lastPkg.n} · ${RD.daysAgoLabel(lastPkg.daysAgo)}` : "—"}</span></div>
        {lastPkg ? (
          <>
            <div style={{ height: 160, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
              <RD.PackagingPreview p={p} version={lastPkg.n} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={() => setTab("packaging")}>Open full preview</button>
            </div>
          </>
        ) : <div style={{ color: "var(--ink-3)", fontSize: 13 }}>No packaging uploaded yet.</div>}
      </div>

      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div className="card-h"><h3>R&D Recommendation</h3>
          <span className={`pill ${p.recommendation === "proceed" ? "ok" : p.recommendation === "changes" ? "warn" : "muted"}`}>
            <span className="dot"></span>
            {p.recommendation === "proceed" ? "Proceed" : p.recommendation === "changes" ? "Changes Required" : "Pending"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
          {p.recommendation === "proceed" && "Formula and positioning are validated. Cleared for production."}
          {p.recommendation === "changes" && "Recent diff requires review before production handoff. See latest comments on the spec."}
          {!p.recommendation && "No recommendation logged yet."}
        </div>
      </div>
    </div>
  );
}

function SpecTab({ p, versions, current, setCurrent }) {
  if (!versions.length) {
    return <div className="empty">No spec versions yet. Drop a PDF, CSV, or paste content to start tracking.</div>;
  }
  const compareAgainst = current > 1 ? current - 1 : null;
  const left  = compareAgainst ? RD.getSpecLines(p.id, compareAgainst) : [];
  const right = RD.getSpecLines(p.id, current);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14 }}>
      <div className="card">
        <div className="card-h"><h3>Versions</h3><span className="meta">{versions.length}</span></div>
        <RD.VersionTimeline versions={versions} selected={current} onSelect={setCurrent} />
        <div className="divider"></div>
        <button className="btn sm" style={{ width: "100%", justifyContent: "center" }}>+ Upload new version</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <div className="card">
          <div className="card-h">
            <h3>{compareAgainst ? `Diff: v${compareAgainst} → v${current}` : `v${current} (initial)`}</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn sm">Restore</button>
              <button className="btn sm">Download</button>
              <button className="btn sm primary">Approve v{current}</button>
            </div>
          </div>
          {compareAgainst ? (
            <RD.DiffView left={left} right={right} lLabel={`v${compareAgainst}`} rLabel={`v${current} · current`} />
          ) : (
            <pre style={{ background: "var(--bg-2)", padding: 12, borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", margin: 0 }}>
              {right.join("\n")}
            </pre>
          )}
        </div>
        <RD.CommentThread productId={p.id} artifactKind="spec" version={current} />
      </div>
    </div>
  );
}

function PackagingTab({ p, versions, current, setCurrent }) {
  if (!versions.length) return <div className="empty">No packaging mockups uploaded.</div>;
  const v = versions.find(x => x.n === current) || versions[versions.length - 1];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14 }}>
      <div className="card">
        <div className="card-h"><h3>Versions</h3><span className="meta">{versions.length}</span></div>
        <RD.VersionTimeline versions={versions} selected={current} onSelect={setCurrent} />
        <div className="divider"></div>
        <button className="btn sm" style={{ width: "100%", justifyContent: "center" }}>+ Drop HTML wireframe</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <div className="html-preview">
          <div className="toolbar">
            <span style={{ color: "var(--ink-3)", fontSize: 11, letterSpacing: "0.04em" }}>WIREFRAME</span>
            <select value={current} onChange={e => setCurrent(Number(e.target.value))}>
              {versions.map(x => <option key={x.n} value={x.n}>v{x.n} · {RD.daysAgoLabel(x.daysAgo)}</option>)}
            </select>
            <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{v.note || ""}</span>
            <span style={{ flex: 1 }}></span>
            <button className="btn sm">Compare</button>
            <button className="btn sm">Open standalone</button>
            <button className="btn sm primary">Approve</button>
          </div>
          <RD.PackagingPreview p={p} version={current} />
        </div>
        <RD.CommentThread productId={p.id} artifactKind="packaging" version={current} />
      </div>
    </div>
  );
}

function ListingTab({ p }) {
  return (
    <div className="card">
      <div className="card-h"><h3>Amazon Listing</h3>
        {p.listing && <span className={`pill ${p.listing === "Approved" ? "ok" : "warn"}`}><span className="dot"></span>{p.listing}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
        <div>
          <div className="metafield"><div className="k">ASIN</div><div className="mono">{p.asin || "—"}</div></div>
          <div className="metafield" style={{ marginTop: 10 }}><div className="k">UPC</div><div className="mono">{p.upc || "—"}</div></div>
        </div>
        <div>
          <div className="metafield"><div className="k">PDP</div>
            <div>{p.asin ? <a href="#" style={{ color: "var(--accent)" }}>amazon.com/dp/{p.asin}</a> : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NicheTab({ p }) {
  const v = RD.lastVer(p, "niche");
  return (
    <div className="card">
      <div className="card-h"><h3>Niche analysis</h3><span className="meta">{v ? `v${v.n}` : "—"}</span></div>
      {v ? (
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
          {v.note || "(empty analysis)"}
        </div>
      ) : <div className="empty">No niche analysis on record.</div>}
    </div>
  );
}

function FilesTab({ p }) {
  const families = [
    ["spec", "Spec sheets"], ["packaging", "Packaging"],
    ["listingCopy", "Listing copy"], ["printFiles", "Print files"],
    ["niche", "Niche analyses"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {families.map(([k, label]) => {
        const arr = p.versions?.[k] || [];
        return (
          <div className="card" key={k}>
            <div className="card-h"><h3>{label}</h3><span className="meta">{arr.length} version{arr.length === 1 ? "" : "s"}</span></div>
            {arr.length === 0
              ? <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No files yet.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[...arr].reverse().map(v => {
                    const u = RD.person(v.by);
                    return (
                      <div key={v.n} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px dashed var(--line)", alignItems: "center", fontSize: 12.5 }}>
                        <span className="mono" style={{ color: "var(--ink-2)", width: 36 }}>v{v.n}</span>
                        <RD.Avatar user={u} size="sm" />
                        <span style={{ color: "var(--ink-2)" }}>{u?.name}</span>
                        <span style={{ color: "var(--ink-3)", flex: 1 }}>{v.note || ""}</span>
                        <span className="mono" style={{ color: "var(--ink-3)" }}>{RD.daysAgoLabel(v.daysAgo)}</span>
                      </div>
                    );
                  })}
                </div>}
          </div>
        );
      })}
    </div>
  );
}

function ActivityTab({ p }) { return <ProductActivity p={p} expanded /> ; }

function ProductActivity({ p, expanded }) {
  const events = PIPELINE_DATA.activity.filter(e => e.productId === p.id);
  if (!events.length) return <div className="empty" style={{ fontSize: 12 }}>No recent activity.</div>;
  return (
    <div className="feed">
      {events.map((e, i) => {
        const u = RD.person(e.user);
        const iconCh = e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "comment" ? "✎" : e.type === "approval" ? "✓" : "!";
        return (
          <div className="feed-row" key={i}>
            <span className="when mono">{RD.daysAgoLabel(e.ts)}</span>
            {expanded && <span className="icon">{iconCh}</span>}
            <div className="body">
              {u && <span className="actor">{u.name}</span>} <span style={{ color: "var(--ink-2)" }}>{e.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, { Dossier, ProductActivity });
