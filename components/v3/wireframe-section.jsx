/* global React, RD2, PIPELINE_DATA */
// ============================================================
// WireframeSection — top of Design tab.
// One artifact. Three views by role + status.
//
//   Malik view (status: pending-malik-review):
//     - PDS-generated HTML wireframe preview
//     - Upload tweaked version button
//     - Edit packaging rationale
//     - "Submit for Chesky review" CTA
//
//   Chesky view (status: pending-chesky-approval):
//     - Read-only wireframe preview + rationale
//     - "Approve & lock" / "Request changes" CTAs
//
//   Locked view (status: locked) — what Esty sees:
//     - Read-only HTML wireframe preview
//     - Packaging rationale from niche analysis (the WHY)
//     - Version history
//     - Then the asset upload boxes (label/box/insert) below it
//
// Status: not-started | pds-generating | pending-malik-review |
//         pending-chesky-approval | locked | revisions-requested
// ============================================================

const { useState: useWS } = React;

function WireframeSection({ p, currentUser, onDecide }) {
  const wf = p.wireframe;
  const isMalik   = RD2.can("is.malik", p, currentUser);   // Malik or admin
  const isChesky  = RD2.can("is.chesky", p, currentUser);  // Chesky or admin
  const [showUpload, setShowUpload] = useWS(false);
  const openUpload = () => setShowUpload(true);

  // Modal portal — rendered alongside whatever section view is active.
  const modal = showUpload ? (
    <WireframeUploadModal p={p} onClose={() => setShowUpload(false)} onDecide={onDecide} />
  ) : null;

  if (!wf || wf.status === "not-started") {
    return <>{modal}<WireframeNotStarted p={p} canStart={isMalik} onUpload={openUpload} /></>;
  }
  if (wf.status === "pending-malik-review") {
    return <>{modal}<WireframeMalikReview p={p} wf={wf} active={isMalik} onDecide={onDecide} onUpload={openUpload} /></>;
  }
  if (wf.status === "pending-chesky-approval") {
    return <WireframeCheskyReview p={p} wf={wf} active={isChesky} onDecide={onDecide} />;
  }
  if (wf.status === "revisions-requested") {
    return <>{modal}<WireframeRevisionsRequested p={p} wf={wf} active={isMalik} onDecide={onDecide} onUpload={openUpload} /></>;
  }
  // Locked — the read-only display every role sees.
  return <WireframeLocked p={p} wf={wf} currentUser={currentUser} />;
}

// ===== Empty state (Malik hasn't uploaded yet) =====
function WireframeNotStarted({ p, canStart, onUpload }) {
  return (
    <div className="wf-section wf-not-started">
      <div className="wf-section-h">
        <span className="wf-status-pill status-not-started">Not started</span>
        <h3>Wireframe</h3>
      </div>
      <div className="wf-empty-body">
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>
          No wireframe yet for this product.
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 14 }}>
          Upload an HTML wireframe file. Malik reviews, then routes to Chesky for approve / request-changes.
        </div>
        {canStart && (
          <button className="btn primary" onClick={onUpload}>
            <span style={{ marginRight: 4 }}>↑</span> Upload wireframe HTML
          </button>
        )}
        {!canStart && (
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5, fontStyle: "italic" }}>
            Waiting on Malik to upload.
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Malik's review state =====
function WireframeMalikReview({ p, wf, active, onDecide, onUpload }) {
  const latest = wf.versions[wf.versions.length - 1];
  const uploader = RD2.person(latest.by) || RD2.person("malik");
  return (
    <div className="wf-section">
      <div className="wf-section-h">
        <span className="wf-status-pill status-malik">Pending Malik's review</span>
        <h3>Wireframe</h3>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          v{latest.v} uploaded · {RD2.daysAgoLabel(latest.daysAgo)}
        </span>
      </div>

      {active ? (
        <div className="wf-action-bar">
          <div className="wf-action-msg">
            <b>Action needed</b> — review the wireframe, tweak copy/panels, then submit to Chesky for lock.
          </div>
          <div className="wf-action-links">
            <a href="#" onClick={(e) => { e.preventDefault(); onUpload && onUpload(); }}>↑ Re-upload</a>
          </div>
          <div className="wf-action-btns">
            <button className="btn primary" onClick={() => onDecide && onDecide("__wireframeSubmitToChesky")}>Submit to Chesky →</button>
          </div>
        </div>
      ) : (
        <div className="wf-action-bar">
          <div className="wf-action-msg">Waiting on <b>Malik</b> to review the wireframe and submit to Chesky.</div>
        </div>
      )}

      <div className="wf-preview-pane">
        <div className="wf-preview-h">
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{latest.filename}</span>
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
            <RD2.Avatar user={uploader} size="xs" /> Uploaded by {uploader?.name || "Malik"}
          </span>
        </div>
        <WireframeHTMLPreview p={p} wf={wf} />
      </div>

      <CollapsibleRationale wf={wf} editable={active} />
      <WireframeVersions wf={wf} />
    </div>
  );
}

// ===== Chesky's approval state =====
function WireframeCheskyReview({ p, wf, active, onDecide }) {
  const latest = wf.versions[wf.versions.length - 1];
  return (
    <div className="wf-section">
      <div className="wf-section-h">
        <span className="wf-status-pill status-chesky">Pending Chesky's approval</span>
        <h3>Wireframe</h3>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          Submitted by Malik · {RD2.daysAgoLabel(wf.malikSubmittedDaysAgo || latest.daysAgo)}
        </span>
      </div>

      {active ? (
        <div className="wf-action-bar">
          <div className="wf-action-msg">
            <b>Action needed</b> — review wireframe + packaging rationale. Approving locks it and unblocks Esty's design work.
          </div>
          <div className="wf-action-btns">
            <button className="btn" onClick={() => {
              const note = prompt("Notes for Malik (what to change):");
              if (note != null) onDecide && onDecide("__wireframeRequestChanges", null, note);
            }}>Request changes</button>
            <button className="btn promote" onClick={() => onDecide && onDecide("__wireframeApprove")}>✓ Approve & lock</button>
          </div>
        </div>
      ) : (
        <div className="wf-action-bar">
          <div className="wf-action-msg">Waiting on <b>Chesky</b> to approve. Esty's design work is blocked until lock.</div>
        </div>
      )}

      <div className="wf-preview-pane">
        <div className="wf-preview-h">
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{latest.filename}</span>
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>v{latest.v} · {RD2.person(latest.by)?.name}</span>
        </div>
        <WireframeHTMLPreview p={p} wf={wf} />
      </div>

      <CollapsibleRationale wf={wf} />
      <WireframeVersions wf={wf} />
    </div>
  );
}

// ===== Locked state — Esty's view (and everyone else's after lock) =====
function WireframeLocked({ p, wf, currentUser }) {
  const latest = wf.versions[wf.versions.length - 1];
  const isEsty = RD2.can("wf.viewLocked", p, currentUser);
  return (
    <div className="wf-section wf-locked">
      {/* Approval ribbon — extra prominent for Esty */}
      <div style={{
        background: "oklch(96% 0.06 150)", border: "1px solid oklch(80% 0.12 150)",
        borderRadius: 8, padding: "10px 14px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 12
      }}>
        <span style={{ fontSize: 18, color: "oklch(45% 0.18 150)" }}>✓</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "oklch(35% 0.16 150)" }}>
            {isEsty ? "Wireframe approved — ready to design" : "Wireframe locked"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
            Approved by Chesky · {RD2.daysAgoLabel(wf.cheskyApprovedDaysAgo || 0)}{isEsty ? " · Upload your label, box, and insert designs below." : ""}
          </div>
        </div>
        <span className="wf-status-pill status-locked" style={{ flexShrink: 0 }}>✓ Locked</span>
      </div>
      <div className="wf-section-h">
        <h3>Wireframe</h3>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          v{latest.v} · final
        </span>
      </div>
      <div className="wf-preview-pane">
        <div className="wf-preview-h">
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{latest.filename}</span>
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>v{latest.v} · final</span>
        </div>
        <WireframeHTMLPreview p={p} wf={wf} />
      </div>
      <CollapsibleRationale wf={wf} />
      <WireframeVersions wf={wf} />
    </div>
  );
}

// ===== Collapsible rationale strip — replaces old side-pane PackagingRationale slot =====
function CollapsibleRationale({ wf, editable }) {
  const [open, setOpen] = useWS(false);
  if (!wf.packagingRationale) return null;
  return (
    <div className="wf-rationale-strip">
      <button className={`wf-rationale-toggle ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        <span className="chev">▶</span>
        <span>Packaging rationale</span>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
          From <span className="mono">{wf.packagingRationale.sourceDoc}</span>
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <PackagingRationale wf={wf} editable={editable} />
        </div>
      )}
    </div>
  );
}

// ===== Revisions requested =====
function WireframeRevisionsRequested({ p, wf, active, onDecide, onUpload }) {
  return (
    <div className="wf-section">
      <div className="wf-section-h">
        <span className="wf-status-pill status-revisions">Revisions requested</span>
        <h3>Wireframe</h3>
      </div>
      <div className="wf-empty-body">
        <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Chesky sent v{wf.currentVersion} back with notes.</p>
        {wf.changeNotes && (
          <div style={{ marginTop: 10, padding: 12, background: "var(--bg-2)", borderRadius: 6, fontSize: 12.5, color: "var(--ink)", borderLeft: "3px solid var(--warn)" }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Chesky's notes</div>
            {wf.changeNotes}
          </div>
        )}
        {active && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn primary" onClick={onUpload}>
              <span style={{ marginRight: 4 }}>↑</span> Upload new version
            </button>
            <button className="btn" onClick={() => onDecide && onDecide("__wireframeSubmitToChesky")}>Resubmit current version</button>
          </div>
        )}
      </div>
      <WireframeVersions wf={wf} />
    </div>
  );
}

// ===== Packaging rationale (from niche analysis §Packaging) =====
function PackagingRationale({ wf, editable }) {
  const r = wf.packagingRationale;
  if (!r) return null;
  return (
    <div className="wf-side-block">
      <div className="wf-side-h">
        <span>Packaging rationale</span>
        {editable && <button className="btn xs" onClick={() => RD2.toast("Rationale editor (demo)")}>Edit</button>}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginBottom: 10 }}>
        From <span className="mono">{r.sourceDoc}</span>
      </div>
      <div className="wf-rat-row">
        <div className="wf-rat-k">Format</div>
        <div className="wf-rat-v">{r.format}</div>
      </div>
      <div className="wf-rat-row">
        <div className="wf-rat-k">Why this format</div>
        <div className="wf-rat-v">{r.whyFormat}</div>
      </div>
      <div className="wf-rat-row">
        <div className="wf-rat-k">Hero positioning</div>
        <div className="wf-rat-v">{r.heroPositioning}</div>
      </div>
      <div className="wf-rat-row">
        <div className="wf-rat-k">Key claims</div>
        <div className="wf-rat-v">
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: "var(--ink-2)" }}>
            {r.keyClaims.map((c, i) => <li key={i} style={{ marginBottom: 2 }}>{c}</li>)}
          </ul>
        </div>
      </div>
      <div className="wf-rat-row">
        <div className="wf-rat-k">Copy decisions</div>
        <div className="wf-rat-v">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {r.copyDecisions.map((d, i) => (
              <div key={i} style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{d.panel}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)", margin: "2px 0" }}>{d.decision}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>Why: {d.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="wf-rat-row">
        <div className="wf-rat-k">Warnings</div>
        <div className="wf-rat-v">{r.warnings}</div>
      </div>
    </div>
  );
}

// ===== Version history with revision context =====
// Each version row shows: who generated/edited it, and (for v2+) what triggered
// the new version — i.e. the changeNotes from when Chesky last sent it back.
// "Compare" opens a side-by-side iframe diff against the previous version.
function WireframeVersions({ wf }) {
  if (!wf.versions?.length) return null;
  const [compareV, setCompareV] = useWS(null); // version number being compared against its predecessor
  const versions = [...wf.versions].reverse();
  const hasMultiple = wf.versions.length >= 2;

  return (
    <>
      <div className="wf-versions">
        <div className="wf-versions-h">
          <span>Version history</span>
          {hasMultiple && (
            <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              {wf.versions.length} versions · click <b>Compare</b> on any v2+ to see what changed
            </span>
          )}
        </div>
        <div className="wf-versions-list">
          {versions.map((v, idx) => {
            const u = RD2.person(v.by);
            const prev = wf.versions.find(x => x.v === v.v - 1);
            // Find the "send-back" event that prompted this version, if any.
            // wf.changeNotes is overwritten each time Chesky sends back, so we
            // attach it to the version that was created in response.
            const triggeredBy = (idx === 0 && wf.changeNotes && v.v > 1) ? wf.changeNotes : v.triggerNotes;
            return (
              <div key={v.v} className="wf-version-row">
                <span className="mono" style={{ fontWeight: 600, fontSize: 11.5, width: 28, flexShrink: 0 }}>v{v.v}</span>
                <RD2.Avatar user={u} size="xs" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.note}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                    {u?.name} · {RD2.daysAgoLabel(v.daysAgo)} · <span className="mono">{v.filename}</span>
                  </div>
                  {triggeredBy && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--ink-2)", padding: "4px 8px", borderLeft: "2px solid var(--warn)", background: "var(--bg-2)", borderRadius: "0 4px 4px 0" }}>
                      <span style={{ fontWeight: 600, color: "var(--ink-3)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Triggered by send-back: </span>
                      "{triggeredBy}"
                    </div>
                  )}
                </div>
                {prev && (
                  <button className="btn xs" onClick={() => setCompareV(v.v)}>Compare with v{prev.v}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {compareV != null && (
        <WireframeCompareModal wf={wf} newV={compareV} onClose={() => setCompareV(null)} />
      )}
    </>
  );
}

// ===== Side-by-side wireframe compare modal =====
function WireframeCompareModal({ wf, newV, onClose }) {
  const newVer = wf.versions.find(v => v.v === newV);
  const oldVer = wf.versions.find(v => v.v === newV - 1);
  if (!newVer || !oldVer) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box wf-compare-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Compare wireframe versions</h3>
          <button className="btn xs" onClick={onClose}>✕</button>
        </div>
        <div className="wf-compare-grid">
          <div className="wf-compare-pane">
            <div className="wf-compare-pane-h">
              <span className="mono" style={{ fontWeight: 600 }}>v{oldVer.v}</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{RD2.person(oldVer.by)?.name} · {RD2.daysAgoLabel(oldVer.daysAgo)}</span>
            </div>
            <div className="wf-compare-frame">
              {oldVer.srcPath
                ? <iframe src={oldVer.srcPath} style={{ width: "100%", height: "100%", border: 0 }} title={`v${oldVer.v}`} />
                : <div className="wf-compare-stub">v{oldVer.v} preview<br /><span className="mono" style={{ fontSize: 10 }}>{oldVer.filename}</span></div>
              }
            </div>
            <div className="wf-compare-note">{oldVer.note}</div>
          </div>
          <div className="wf-compare-pane">
            <div className="wf-compare-pane-h">
              <span className="mono" style={{ fontWeight: 600 }}>v{newVer.v} <span style={{ color: "var(--ok)", fontSize: 10, marginLeft: 4 }}>NEW</span></span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{RD2.person(newVer.by)?.name} · {RD2.daysAgoLabel(newVer.daysAgo)}</span>
            </div>
            <div className="wf-compare-frame">
              {newVer.srcPath
                ? <iframe src={newVer.srcPath} style={{ width: "100%", height: "100%", border: 0 }} title={`v${newVer.v}`} />
                : <div className="wf-compare-stub">v{newVer.v} preview<br /><span className="mono" style={{ fontSize: 10 }}>{newVer.filename}</span></div>
              }
            </div>
            <div className="wf-compare-note">{newVer.note}</div>
          </div>
        </div>
        {(newVer.triggerNotes || (newV === wf.currentVersion && wf.changeNotes)) && (
          <div className="wf-compare-trigger">
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>What was requested between v{oldVer.v} and v{newVer.v}</div>
            <div style={{ fontSize: 13, color: "var(--ink)" }}>"{newVer.triggerNotes || wf.changeNotes}"</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== HTML wireframe preview (mock — renders the auto-generated brief inside a "browser frame") =====
// In the real app this is an <iframe srcdoc=...> with the actual PDS HTML.
function WireframeHTMLPreview({ p, wf }) {
  const latestVersion = wf?.versions?.[wf.versions.length - 1];
  const realSrc = latestVersion?.srcPath;

  // ===== Real-HTML path — when the version has a srcPath, iframe the actual file. =====
  // This is the production behavior. Falls back to the synthetic preview below
  // for products whose wireframe data is brief-only.
  if (realSrc) {
    return (
      <div className="wf-html-preview">
        <div className="wf-html-chrome">
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "#ff5f57" }}></span>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "#febc2e" }}></span>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "#28c840" }}></span>
          </div>
          <span className="mono" style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--ink-3)" }}>
            {latestVersion.filename}
          </span>
          <button className="btn xs" onClick={() => window.open(realSrc, "_blank")}>↗ Open in new tab</button>
        </div>
        <iframe
          src={realSrc}
          title={latestVersion.filename}
          style={{ width: "100%", height: 720, border: "none", background: "#fff", display: "block" }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    );
  }

  // ===== Synthetic-brief path — for products without a real HTML file =====
  const brief = React.useMemo(() => {
    return {
      label:  RD2.buildWireframe(p, "label"),
      box:    RD2.buildWireframe(p, "box"),
      insert: RD2.buildWireframe(p, "insert"),
    };
  }, [p]);
  const [active, setActive] = useWS("label");
  const sections = [
    ["label",  "Label"],
    ["box",    "Box / Carton"],
    ["insert", "Insert"],
  ].filter(([k]) => brief[k]);

  return (
    <div className="wf-html-preview">
      <div className="wf-html-chrome">
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#ff5f57" }}></span>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#febc2e" }}></span>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#28c840" }}></span>
        </div>
        <span className="mono" style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--ink-3)" }}>
          {wf.versions[wf.versions.length - 1].filename}
        </span>
        <button className="btn xs" onClick={() => RD2.toast("Opening in new tab")}>↗ Open</button>
      </div>
      <div className="wf-html-tabs">
        {sections.map(([k, label]) => (
          <button key={k} className={`wf-html-tab ${active === k ? "active" : ""}`} onClick={() => setActive(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="wf-html-body">
        <RD2.WireframePreview p={p} kind={active} compact />
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { WireframeSection });

// ===== Wireframe upload modal — drop-zone for an existing wireframe HTML file =====
// Real-world flow: Esty/Malik already have a hand-built wireframe HTML and want to attach it
// instead of generating one with PDS. They drop the file (or paste a path), give it a note,
// and we create a v1 entry pointing at it. After upload, the wireframe lands in
// 'pending-malik-review' so the normal review/lock flow kicks in.
function WireframeUploadModal({ p, onClose, onDecide }) {
  const [filename, setFilename] = useWS("");
  const [srcPath, setSrcPath]   = useWS("");
  const [note, setNote]         = useWS("");
  const [busy, setBusy]         = useWS(false);

  const submit = () => {
    if (!filename) { RD2.toast("Need a filename", "warn"); return; }
    setBusy(true);
    setTimeout(() => {
      onDecide && onDecide("__wireframeUpload", "wireframe-upload", {
        filename,
        srcPath: srcPath || null,
        note: note || "Uploaded existing wireframe",
      });
      setBusy(false);
      onClose();
    }, 220);
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="wf-upload-modal" onClick={e => e.stopPropagation()}>
        <div className="wf-upload-h">
          <div>
            <div className="wf-upload-title">Upload existing wireframe</div>
            <div className="wf-upload-sub mono">{p.code} · {p.name}</div>
          </div>
          <button className="wf-upload-x" onClick={onClose}>×</button>
        </div>

        <div className="wf-upload-body">
          {/* Drop zone (visual only — file picking happens via path field below) */}
          <div className="wf-drop-zone">
            <div className="wf-drop-icon">📄</div>
            <div className="wf-drop-line">Drop your wireframe HTML here</div>
            <div className="wf-drop-line-sub">or paste a path below</div>
          </div>

          <div className="wf-upload-form">
            <label className="wf-upload-field">
              <span className="wf-upload-l">Filename</span>
              <input className="wf-upload-i mono" placeholder={`${p.code}-WFM-v1.html`} value={filename} onChange={e => setFilename(e.target.value)} />
            </label>
            <label className="wf-upload-field">
              <span className="wf-upload-l">Source path <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional — for live iframe preview)</span></span>
              <input className="wf-upload-i mono" placeholder="wireframes/MY-PRODUCT-WFM-v1.html" value={srcPath} onChange={e => setSrcPath(e.target.value)} />
            </label>
            <label className="wf-upload-field">
              <span className="wf-upload-l">Notes</span>
              <input className="wf-upload-i" placeholder="What's special about this wireframe?" value={note} onChange={e => setNote(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="wf-upload-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy || !filename}>
            {busy ? "Attaching…" : "Attach as v1 — sends to Malik for review"}
          </button>
        </div>
      </div>
    </div>
  );
}
