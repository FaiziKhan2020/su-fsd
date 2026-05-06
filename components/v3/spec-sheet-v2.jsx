/* global React, RD2, PIPELINE_DATA */
const { useState: useSPS, useMemo: useMPS } = React;

// ===== Spec Sheet — structured 7-section production-ready view =====
//
// Each version carries the full structured spec. Sections shown depend on
// the product format (capsule vs liquid vs powder vs cream/gummy). Renders
// as an A4-ish document with section headers, mimicking the real PDS PDFs
// teams already produce in Word/Docs.
//
// Sections:
//   1. Identity & Format card     (format-aware: capsule size, bottle ml, bag size…)
//   2. Formula table              (%DV grouped into sub-blocks)
//   3. Format math                (capsule fit utilization, blend math, drops calc)
//   4. Label structure (SFP/NFP)  (individual vs prop blend, branded ™ attributions)
//   5. Manufacturer notes         (lead time, MOQ, confirmations, warnings)
//   6. Required statements        (directions, warnings, FDA disclaimer)
//   7. Dual positioning           (bottle hook / box-front story / box-back sell)
//
// At the top: a version pill + version drawer + drop-zone. Below the pill,
// a status pill (DRAFT / REVIEW / CONFIRMED) and the source chip
// ("parsed from HC498-…-v6.docx · 12d ago by Malik").

function SpecSheetTabV2({ p, onDecide }) {
  // Prefer specSheetV2 (rich schema with identity/formula/labelStructure/etc).
  // Fall back to legacy specSheet (just {versions: [{ingredients[]}]}) — renders as identity-only.
  const ss = p.specSheetV2 || p.specSheet;
  const [openV, setOpenV] = useSPS(ss?.currentVersion ?? null);
  const [showDropzone, setShowDropzone] = useSPS(false);
  const [compareMode, setCompareMode] = useSPS(false);

  // Edit mode: when truthy, holds a working draft of `ver` that the user is editing.
  const [editDraft, setEditDraft] = useSPS(null);
  const editing = editDraft != null;

  if (!ss) {
    return <>
      <SpecSheetEmpty p={p} onUpload={() => setShowDropzone(true)} />
      {showDropzone && <SpecSheetDropZone p={p} ss={ss} onClose={() => setShowDropzone(false)} onDecide={onDecide} />}
    </>;
  }

  const current = ss.versions.find(v => v.v === ss.currentVersion) || ss.versions[ss.versions.length - 1];
  const viewing = ss.versions.find(v => v.v === openV) || current;
  const isViewingCurrent = viewing.v === ss.currentVersion;

  // Edit handlers — mutate working copy of editDraft.
  const startEdit = () => setEditDraft(JSON.parse(JSON.stringify(viewing)));
  const cancelEdit = () => setEditDraft(null);
  const saveEdit = (note) => {
    if (!editDraft || !onDecide) {
      RD2.toast("No save hook", "warn");
      return;
    }
    const nextV = (ss.versions[ss.versions.length - 1]?.v || 0) + 1;
    const newVer = {
      ...editDraft,
      v: nextV,
      daysAgo: 0,
      status: "draft",
      note: note || `Inline edit by ${RD2.person(RD2.__currentUser)?.name || "user"}`,
      by: RD2.__currentUser || "malik",
    };
    // Build a minimal SpecSheetV2 envelope; the app handler will append it as a new version.
    const updatedSpec = {
      ...ss,
      currentVersion: nextV,
      source: { kind: "manual", at: 0, by: RD2.__currentUser || "malik" },
      // Provide just the new version as versions[0]; handler appends.
      versions: [newVer],
    };
    onDecide("__rdAttachSpec", "spec-edit", { specSheetV2: updatedSpec });
    setEditDraft(null);
    setOpenV(nextV);
    RD2.toast(`Saved as v${nextV}`, "ok");
  };

  return (
    <div className="ps-tab">
      <SpecSheetHeader
        p={p}
        ss={ss}
        viewing={editing ? editDraft : viewing}
        isViewingCurrent={isViewingCurrent}
        onPick={setOpenV}
        onUpload={() => setShowDropzone(true)}
        onCompare={() => setCompareMode(c => !c)}
        compareMode={compareMode}
        editing={editing}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onDecide={onDecide}
      />
      {compareMode ? (
        <SpecSheetCompareV2 ss={ss} />
      ) : editing ? (
        <SpecSheetDocument ver={editDraft} format={p.type} editing={true} setDraft={setEditDraft} locked={!!ss.lockedAt} />
      ) : (
        <>
          <RunOrderPanel p={p} spec={viewing} onDecide={onDecide} />
          <SpecSheetDocument ver={viewing} format={p.type} locked={!!ss.lockedAt} />
        </>
      )}
      {showDropzone && <SpecSheetDropZone p={p} ss={ss} onClose={() => setShowDropzone(false)} onDecide={onDecide} />}
    </div>
  );
}

// ===== Run Order panel — sits between header and spec doc =====
// Run = "this batch we're buying right now". Distinct from the spec sheet
// (which is the recipe). When the spec is locked but no run is set, suggest
// one based on MOQ + first-run ceiling. Once set, drives cost-pass batch
// size and packaging quantities.
function RunOrderPanel({ p, spec, onDecide }) {
  const [editing, setEditing] = useSPS(false);
  const [draft, setDraft] = useSPS(null);

  const run = p.run;
  const suggested = React.useMemo(() => window.RunOrder.suggestRunCount(spec), [spec]);
  if (!suggested) return null; // spec doesn't have enough info yet

  const activeBottles = run?.bottleCount ?? null;
  const check = activeBottles ? window.RunOrder.checkRun(spec, activeBottles) : null;

  const startEdit = () => {
    setDraft(String(activeBottles ?? suggested.bottles));
    setEditing(true);
  };
  const commit = () => {
    const n = parseInt(String(draft).replace(/,/g, ""), 10);
    if (!isFinite(n) || n <= 0) {
      RD2.toast("Enter a positive bottle count", "warn");
      return;
    }
    onDecide && onDecide("__setRun", "set", { bottleCount: n });
    setEditing(false);
    RD2.toast(`Run order set: ${n.toLocaleString()} bottles`, "ok");
  };

  // ── Empty state — no run set yet, show suggestion ────────────
  if (!run) {
    return (
      <div className="ps-run ps-run-empty">
        <div className="ps-run-row">
          <div className="ps-run-icon">▣</div>
          <div className="ps-run-body">
            <div className="ps-run-h">Run order not set</div>
            <div className="ps-run-sub">
              Suggested: <strong>{suggested.bottles.toLocaleString()} bottles</strong>
              {suggested.form === "capsule" && <span> · {suggested.derivedCount.toLocaleString()} capsules</span>}
              <span className="ps-run-reason"> — {suggested.reason}</span>
            </div>
          </div>
          <button className="btn sm primary" onClick={startEdit}>Set run order →</button>
        </div>
        {editing && (
          <RunOrderEditRow
            spec={spec}
            draft={draft}
            setDraft={setDraft}
            onCancel={() => setEditing(false)}
            onCommit={commit}
            suggested={suggested}
          />
        )}
      </div>
    );
  }

  // ── Set state — show summary with checks ────────────────────
  return (
    <div className={`ps-run ps-run-set ps-run-status-${check?.status || "ok"}`}>
      {!editing ? (
        <div className="ps-run-row">
          <div className="ps-run-icon">▣</div>
          <div className="ps-run-stats">
            <div className="ps-run-stat">
              <span className="ps-run-stat-k">RUN ORDER</span>
              <span className="ps-run-stat-v">{check.bottles.toLocaleString()} <span className="ps-run-stat-unit">bottles</span></span>
            </div>
            {check.form === "capsule" && (
              <div className="ps-run-stat">
                <span className="ps-run-stat-k">DERIVED</span>
                <span className="ps-run-stat-v mono">{check.derivedCount.toLocaleString()} <span className="ps-run-stat-unit">caps</span></span>
              </div>
            )}
            <div className="ps-run-stat">
              <span className="ps-run-stat-k">VS MOQ</span>
              <span className={`ps-run-stat-v ps-run-flag-${check.status}`}>
                {check.status === "ok" ? "✓" : "⚠"} {check.reason}
              </span>
            </div>
            {check.ceilingFlag && (
              <div className="ps-run-stat">
                <span className="ps-run-stat-k">CEILING</span>
                <span className="ps-run-stat-v ps-run-flag-warn">⚠ {check.ceilingFlag}</span>
              </div>
            )}
          </div>
          <button className="btn xs" onClick={startEdit}>Edit</button>
        </div>
      ) : (
        <RunOrderEditRow
          spec={spec}
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setEditing(false)}
          onCommit={commit}
          suggested={suggested}
        />
      )}
    </div>
  );
}

function RunOrderEditRow({ spec, draft, setDraft, onCancel, onCommit, suggested }) {
  const live = window.RunOrder.checkRun(spec, parseInt(String(draft).replace(/,/g, ""), 10) || 0);
  return (
    <div className="ps-run-edit">
      <div className="ps-run-edit-row">
        <label className="ps-run-edit-label">Bottles</label>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") onCommit();
            if (e.key === "Escape") onCancel();
          }}
          className="ps-run-edit-input mono"
        />
        <button className="btn xs" onClick={() => setDraft(String(suggested.bottles))}>
          Use suggestion ({suggested.bottles.toLocaleString()})
        </button>
        <div className="ps-run-edit-spacer"></div>
        <button className="btn sm" onClick={onCancel}>Cancel</button>
        <button className="btn sm primary" onClick={onCommit}>Save</button>
      </div>
      {live && (
        <div className={`ps-run-edit-preview ps-run-status-${live.status}`}>
          {live.form === "capsule" && (
            <span>{live.derivedCount.toLocaleString()} capsules</span>
          )}
          <span className={`ps-run-flag-${live.status}`}>
            {live.status === "ok" ? "✓" : "⚠"} {live.reason}
          </span>
          {live.ceilingFlag && (
            <span className="ps-run-flag-warn">⚠ {live.ceilingFlag}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Header — code + version pill + status + version drawer =====
function SpecSheetHeader({ p, ss, viewing, isViewingCurrent, onPick, onUpload, onCompare, compareMode, editing, onStartEdit, onCancelEdit, onSaveEdit, onDecide }) {
  const [drawerOpen, setDrawerOpen] = useSPS(false);
  const [savePromptOpen, setSavePromptOpen] = useSPS(false);
  const [saveNote, setSaveNote] = useSPS("");
  const status = (viewing.status || (ss.lockedAt ? "confirmed" : "draft")).toLowerCase();
  const author = RD2.person(viewing.by);

  return (
    <div className="ps-head">
      <div className="ps-head-row">
        <div className="ps-id">
          <div className="ps-code">{p.code}</div>
          <div className="ps-name">{p.name}</div>
        </div>
        <div className="ps-head-meta">
          <button className={`ps-version-pill status-${status}`} onClick={() => setDrawerOpen(o => !o)}
            title="Click to see all versions">
            <span className="ps-v-num">v{viewing.v}</span>
            <span className="ps-v-status">{status === "confirmed" ? "CONFIRMED" : status === "review" ? "IN REVIEW" : "DRAFT"}</span>
            <span className="ps-v-caret">{drawerOpen ? "▴" : "▾"}</span>
          </button>
          {!isViewingCurrent && (
            <span className="ps-viewing-old">viewing v{viewing.v} · <a onClick={() => onPick(ss.currentVersion)}>jump to current →</a></span>
          )}
        </div>
      </div>

      <div className="ps-head-row" style={{ marginTop: 8 }}>
        <div className="ps-source-chip">
          {ss.source?.kind === "parsed-docx" ? (
            <>📄 Parsed from <span className="mono">{ss.source.filename}</span> · {RD2.daysAgoLabel(ss.source.at)} {ss.source.by ? `by ${RD2.person(ss.source.by)?.name}` : ""}</>
          ) : ss.source?.kind === "manual" ? (
            <>✎ Manually entered · {RD2.daysAgoLabel(viewing.daysAgo)} {author ? `by ${author.name}` : ""}</>
          ) : (
            <>v{viewing.v} · {viewing.note || ""} · {RD2.daysAgoLabel(viewing.daysAgo)}</>
          )}
        </div>
        <div className="ps-head-actions">
          {editing ? (
            <>
              <span className="ps-edit-banner">Editing — saves as v{(ss.versions[ss.versions.length-1]?.v || 0) + 1}</span>
              <button className="btn sm" onClick={onCancelEdit}>Cancel</button>
              <button className="btn sm primary" onClick={() => setSavePromptOpen(true)}>✓ Save as v{(ss.versions[ss.versions.length-1]?.v || 0) + 1}</button>
            </>
          ) : (
            <>
              {ss.versions.length > 1 && (
                <button className="btn sm" onClick={onCompare}>{compareMode ? "Exit compare" : "Compare versions"}</button>
              )}
              <button
                className="btn sm"
                onClick={() => {
                  // Stamp the body so print CSS shows only the spec sheet, then trigger
                  // the browser's print dialog. User picks "Save as PDF" → emails to mfg.
                  document.body.classList.add("printing-spec");
                  // Defer so the class lands before the print dialog measures.
                  setTimeout(() => {
                    window.print();
                    document.body.classList.remove("printing-spec");
                  }, 50);
                }}
                title="Print or save as PDF — share with manufacturers"
              >⎙ Export PDF</button>
              <RD2.GatedAction product={p}>
                <button className="btn sm" onClick={onUpload}>↑ Drop new spec…</button>
              </RD2.GatedAction>
              {isViewingCurrent && (() => {
                const canEdit = window.RD2?.can?.("spec.edit", p);
                const u = window.RD2?.__currentUser;
                return (
                  <button className="btn sm" onClick={onStartEdit}
                    title={canEdit
                      ? "Edit the spec sheet inline. Saves as a new version."
                      : `Switch role to Malik (formula owner) or an admin to edit. Current: ${u}`}
                    disabled={!canEdit}
                    style={canEdit ? {} : { opacity: 0.45, cursor: "not-allowed" }}
                  >✎ Edit inline</button>
                );
              })()}
              {!ss.lockedAt && isViewingCurrent && (
                <RD2.GatedAction product={p}>
                  <button className="btn sm primary" onClick={() => RD2.toast(`Spec v${viewing.v} marked CONFIRMED`, "ok")}>
                    ✓ Mark confirmed
                  </button>
                </RD2.GatedAction>
              )}
              {/* Lock toggle — Chesky only (or admin). When locked, the 4 dropdown
                  fields below show a confirm popup before saving any change. */}
              {isViewingCurrent && (() => {
                if (!window.RD2?.can?.("spec.lock", p)) return null;
                return ss.lockedAt ? (
                  <button
                    className="btn sm"
                    onClick={() => onDecide && onDecide("__specLockToggle", "unlock")}
                    title="Unlock so Malik can edit dropdowns without a confirm popup"
                    style={{ background: "var(--bg-2)", color: "var(--ink-2)", borderColor: "var(--line)" }}
                  >🔒 Locked — unlock</button>
                ) : (
                  <button
                    className="btn sm primary"
                    onClick={() => onDecide && onDecide("__specLockToggle", "lock")}
                    title="Lock the spec — Malik will get a confirm popup if he tries to change capsule size, bottle size, count, or serving size"
                  >🔓 Lock spec</button>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {savePromptOpen && (
        <div className="ps-edit-save-row">
          <input className="ps-edit-save-note" placeholder="What changed? (optional, e.g. 'bumped Vit D to 1000IU per Joel')" value={saveNote} onChange={e => setSaveNote(e.target.value)} autoFocus />
          <button className="btn sm" onClick={() => { setSavePromptOpen(false); setSaveNote(""); }}>Cancel</button>
          <button className="btn sm primary" onClick={() => { onSaveEdit(saveNote); setSavePromptOpen(false); setSaveNote(""); }}>Save version</button>
        </div>
      )}

      {drawerOpen && (
        <SpecSheetVersionDrawer ss={ss} viewing={viewing} onPick={(v) => { onPick(v); setDrawerOpen(false); }} />
      )}
    </div>
  );
}

// ===== Version drawer =====
function SpecSheetVersionDrawer({ ss, viewing, onPick }) {
  const versions = [...ss.versions].sort((a, b) => b.v - a.v);
  return (
    <div className="ps-version-drawer">
      <div className="ps-vd-h">VERSION HISTORY</div>
      <div className="ps-vd-list">
        {versions.map(v => {
          const author = RD2.person(v.by);
          const isCurrent = v.v === ss.currentVersion;
          const isViewing = v.v === viewing.v;
          const status = (v.status || (ss.lockedAt && v.v === ss.currentVersion ? "confirmed" : "draft")).toLowerCase();
          return (
            <button key={v.v} className={`ps-vd-row ${isViewing ? "viewing" : ""}`} onClick={() => onPick(v.v)}>
              <span className={`ps-vd-num status-${status}`}>v{v.v}</span>
              <span className="ps-vd-status">{status === "confirmed" ? "✓ Confirmed" : status === "review" ? "⏳ In review" : "✎ Draft"}</span>
              <span className="ps-vd-note">{v.note || "—"}</span>
              <span className="ps-vd-meta">{author?.name || v.by} · {RD2.daysAgoLabel(v.daysAgo)}</span>
              {isCurrent && <span className="ps-vd-current">CURRENT</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Document body — renders the 7 structured sections =====
function SpecSheetDocument({ ver, format, editing, setDraft, locked }) {
  const i = ver.identity || {};
  const fm = ver.formula || {};
  const baseMath = ver.formatMath || {};
  // Derive a live capsule-fit when we have an identity-driven capsule spec.
  // Recomputes on every edit so changing capsuleSize / capsuleCount / servingSize
  // immediately updates the §3 Capsule Fit panel.
  const math = (() => {
    if (baseMath.kind !== "capsule-fit") return baseMath;
    const live = computeCapsuleFit(i, fm);
    if (!live) return baseMath;
    // Drop the stale notes/utilization-driven copy if our derived status differs
    // from what was originally stored (e.g. spec was locked at 78% ok, Malik
    // bumps to size 0 → now overfilled, the "leaves headroom" note is wrong).
    const noteStillRelevant = baseMath.utilizationStatus === live.utilizationStatus;
    return { ...baseMath, ...live, notes: noteStillRelevant ? baseMath.notes : null };
  })();
  const ls = ver.labelStructure || {};
  const mn = ver.mfgNotes || {};
  const rs = ver.requiredStatements || [];
  const dp = ver.dualPositioning;

  // Helpers — mutate the draft via setDraft.
  const updateIdentity = (field, value) => {
    setDraft(d => ({ ...d, identity: { ...(d.identity || {}), [field]: value } }));
  };
  const updateFormulaCell = (sectionIdx, rowIdx, field, value) => {
    setDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.formula = next.formula || { sections: [] };
      next.formula.sections[sectionIdx].rows[rowIdx][field] = value;
      return next;
    });
  };
  const addFormulaRow = (sectionIdx) => {
    setDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.formula.sections[sectionIdx].rows.push({ name: "New ingredient", form: "", dose: "", dv: "" });
      return next;
    });
  };
  const removeFormulaRow = (sectionIdx, rowIdx) => {
    setDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.formula.sections[sectionIdx].rows.splice(rowIdx, 1);
      return next;
    });
  };
  const addFormulaSection = () => {
    setDraft(d => {
      const next = JSON.parse(JSON.stringify(d));
      next.formula = next.formula || { sections: [] };
      next.formula.sections.push({ label: "New section", subtotal: "", rows: [{ name: "", form: "", dose: "", dv: "" }] });
      return next;
    });
  };

  return (
    <div className="ps-doc">
      {/* SECTION 1 — Identity & format card */}
      <SpecSection num="1" title="Identity & Format">
        <IdentityCard identity={i} format={format} editing={editing} onChange={updateIdentity} locked={locked} />
      </SpecSection>

      {/* SECTION 2 — Formula */}
      {(fm.sections && fm.sections.length > 0) || editing ? (
        <SpecSection num="2" title="Formula">
          <FormulaTable formula={fm} editing={editing}
            onCell={updateFormulaCell}
            onAddRow={addFormulaRow}
            onRemoveRow={removeFormulaRow}
            onAddSection={addFormulaSection}
          />
        </SpecSection>
      ) : null}

      {/* SECTION 3 — Format math (only if non-empty) */}
      {math.kind && math.kind !== "none" && (
        <SpecSection num="3" title={math.kind === "capsule-fit" ? "Capsule Fit" : math.kind === "blend-math" ? "Blend Math" : "Format Math"}>
          <FormatMathBlock math={math} />
        </SpecSection>
      )}

      {/* SECTION 4 — Label structure */}
      {(ls.structure || ls.brandedIngredients) && (
        <SpecSection num="4" title={`Label Structure (${ls.panelType || "SFP"})`}>
          <LabelStructureBlock ls={ls} />
        </SpecSection>
      )}

      {/* SECTION 5 — Manufacturer notes */}
      {(mn.manufacturer || mn.confirmations?.length) && (
        <SpecSection num="5" title="Manufacturer Notes">
          <MfgNotesBlock mn={mn} />
        </SpecSection>
      )}

      {/* SECTION 6 — Required statements */}
      {rs.length > 0 && (
        <SpecSection num="6" title="Required Statements">
          <RequiredStatementsBlock items={rs} />
        </SpecSection>
      )}

      {/* SECTION 7 — Dual positioning (liquid/box products) */}
      {dp && (
        <SpecSection num="7" title="Dual Positioning">
          <DualPositioningBlock dp={dp} />
        </SpecSection>
      )}
    </div>
  );
}

function SpecSection({ num, title, children }) {
  return (
    <section className="ps-section">
      <div className="ps-section-h">
        <span className="ps-section-num">{num}</span>
        <h3>{title}</h3>
      </div>
      <div className="ps-section-body">{children}</div>
    </section>
  );
}

// ===== Identity & Format card (format-aware) =====
// 4 fields use fixed-option dropdowns:
//   capsuleSize  — 0, 00, 0e, 00e, 000
//   bottleSize   — 150cc, 250cc
//   capsuleCount — 30, 60, 90, 120  (this is the "bottle count" — capsules per bottle)
//   servingSize  — 1, 2, 3, 4 caps
// When ss.lockedAt is set and the user changes one, a confirm popup appears first.
const SPEC_DROPDOWNS = {
  capsuleSize: ["0", "00", "0e", "00e", "000"],
  bottleSize:  ["150cc", "250cc"],
  capsuleCount: ["30", "60", "90", "120"],
  servingSize: ["1 cap", "2 caps", "3 caps", "4 caps"],
};
const SPEC_DROPDOWN_LABEL = {
  capsuleSize: "capsule size",
  bottleSize: "bottle size",
  capsuleCount: "bottle count",
  servingSize: "serving size",
};

function IdentityCard({ identity, format, editing, onChange, locked }) {
  const [confirmField, setConfirmField] = useSPS(null); // {key, value} or null
  const fmt = (identity.format || format || "").toLowerCase();
  // Build a list of [key, label, value] tuples so we can render editable inputs in edit mode.
  const fields = [];
  fields.push(["format", "Format", identity.format]);
  fields.push(["servingSize", "Serving size", identity.servingSize]);
  fields.push(["servingsPerContainer", "Servings", identity.servingsPerContainer]);
  if (fmt.includes("capsule") || fmt.includes("softgel") || editing) {
    fields.push(["capsuleSize", "Capsule", identity.capsuleSize]);
    fields.push(["capsuleCount", "Count", identity.capsuleCount]);
    fields.push(["bottleSpec", "Bottle", identity.bottleSpec]);
  }
  if (fmt.includes("liquid") || fmt.includes("drops") || editing) {
    fields.push(["bottleSize", "Bottle", identity.bottleSize]);
    fields.push(["dropperSize", "Dropper", identity.dropperSize]);
    fields.push(["base", "Base", identity.base]);
    fields.push(["alcohol", "Alcohol", identity.alcohol]);
    fields.push(["flavor", "Flavor", identity.flavor]);
  }
  if (fmt.includes("powder") || fmt.includes("food") || editing) {
    fields.push(["bagSize", "Bag", identity.bagSize]);
    fields.push(["scoopSize", "Scoop", identity.scoopSize]);
    fields.push(["netWeight", "Net wt", identity.netWeight]);
    fields.push(["totalRunWeight", "Total run", identity.totalRunWeight]);
  }
  fields.push(["launchQty", "Launch qty", identity.launchQty]);
  fields.push(["brandedIngredients", "Branded ings", identity.brandedIngredients]);

  // In view mode: only show fields with a value.
  const visible = editing ? fields : fields.filter(([k, _, v]) => v != null && v !== "");

  // Wrap onChange for the 4 dropdown fields: if locked, intercept and ask first.
  const handleChange = (key, value) => {
    if (locked && SPEC_DROPDOWNS[key]) {
      setConfirmField({ key, value });
      return;
    }
    onChange(key, value);
  };

  return (
    <div className="ps-id-grid">
      {visible.map(([key, label, value]) => {
        const isDropdown = !!SPEC_DROPDOWNS[key];
        return (
          <div key={key} className="ps-id-row">
            <span className="ps-id-k">{label}</span>
            {editing ? (
              isDropdown ? (
                <select
                  className="ps-id-input"
                  value={value == null ? "" : String(value)}
                  onChange={e => handleChange(key, e.target.value)}
                  style={{ paddingRight: 18, cursor: "pointer" }}
                >
                  <option value="">—</option>
                  {SPEC_DROPDOWNS[key].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input className="ps-id-input"
                  value={value == null ? "" : String(value)}
                  placeholder="—"
                  onChange={e => onChange(key, e.target.value)} />
              )
            ) : (
              <span className="ps-id-v">{String(value)}</span>
            )}
          </div>
        );
      })}

      {confirmField && (
        <SpecLockConfirmModal
          fieldKey={confirmField.key}
          fieldLabel={SPEC_DROPDOWN_LABEL[confirmField.key]}
          newValue={confirmField.value}
          oldValue={identity[confirmField.key]}
          onConfirm={() => {
            onChange(confirmField.key, confirmField.value);
            setConfirmField(null);
          }}
          onCancel={() => setConfirmField(null)}
        />
      )}
    </div>
  );
}

// ===== Blast radius — what re-runs / re-confirms when a locked dropdown changes =====
// Each dropdown ripples differently. We surface the actual streams + people who'll
// need to re-confirm, so Malik knows what he's about to disturb before clicking yes.
const BLAST_RADIUS = {
  capsuleSize: {
    headline: "Capsule size drives the fill math and the capsule vendor's quote.",
    impacts: [
      { label: "Capsule-fit math re-runs",      detail: "Mfg (Mimi/Connor) reconfirms 80–90% fill on the new size", who: "Mfg" },
      { label: "Capsule vendor quote re-quote", detail: "Active capsule SKU quotes are re-priced — winner may change",   who: "Ronel" },
      { label: "Label NFP layout shifts",       detail: "Capsule count per serving may change → Supplement Facts redraw", who: "Esty" },
    ],
  },
  bottleSize: {
    headline: "Bottle size touches three vendors and the label artwork.",
    impacts: [
      { label: "Bottle vendor re-quote",  detail: "Quotes for the old size are voided; Ronel re-quotes 150cc → 250cc",                    who: "Ronel" },
      { label: "Label dieline redraw",    detail: "Label dimensions change with bottle diameter — artwork must be re-laid out",            who: "Esty" },
      { label: "Box / insert dieline",    detail: "Carton & insert depths re-spec; box vendor re-quotes",                                  who: "Esty + Ronel" },
    ],
  },
  capsuleCount: {
    headline: "Bottle count changes the unit math, label NFP, and the production buy size.",
    impacts: [
      { label: "$/bottle & MOQ re-derive",   detail: "Cost-pass recomputes off the new yield — runway estimate shifts",     who: "Ronel" },
      { label: "Label NFP re-do",            detail: "Servings-per-container changes → Supplement Facts panel updated", who: "Esty" },
      { label: "Listing copy re-check",      detail: "Title / bullets reference count; April reviews before relist",       who: "April" },
    ],
  },
  servingSize: {
    headline: "Serving size cascades into capsule fit, the NFP, and listing claims.",
    impacts: [
      { label: "Capsule-fit math re-runs",  detail: "Caps/serving × dose may push past size limit — mfg reconfirms",      who: "Mfg" },
      { label: "%DV column re-calculates",  detail: "Per-serving doses change → all DV % values re-derive on the NFP",     who: "PDS" },
      { label: "Listing claims re-check",   detail: "'2 caps daily' phrasing in listing must match new serving",            who: "April" },
    ],
  },
};

// ===== Confirm modal — appears when Malik tries to change a locked dropdown =====
function SpecLockConfirmModal({ fieldKey, fieldLabel, newValue, oldValue, onConfirm, onCancel }) {
  const radius = BLAST_RADIUS[fieldKey];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,17,23,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10,
        width: 520, maxWidth: "92vw", boxShadow: "0 12px 40px rgba(0,0,0,0.32)",
      }}>
        <div style={{ padding: "16px 20px 4px" }}>
          <div style={{ fontSize: 11, color: "var(--warn)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 }}>🔒 Spec is locked</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
            Change {fieldLabel}?
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 8 }}>
            From <span className="mono" style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 3 }}>{oldValue || "—"}</span>
            {" → "}
            <span className="mono" style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 3 }}>{newValue || "—"}</span>
          </div>
        </div>

        {radius && (
          <div style={{ padding: "4px 20px 0" }}>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 12 }}>
              {radius.headline}
            </div>
            <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "6px 12px", background: "var(--bg-2)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)" }}>
                Blast radius — {radius.impacts.length} downstream effects
              </div>
              {radius.impacts.map((it, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  padding: "10px 12px",
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  alignItems: "start",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)" }}>{it.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.45 }}>{it.detail}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "var(--ink-2)",
                    background: "var(--bg-2)", padding: "3px 8px", borderRadius: 999,
                    border: "1px solid var(--line)", whiteSpace: "nowrap",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>{it.who}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "12px 20px", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Saves as a new version. Owners are pinged automatically — no quotes are voided yet, but flagged for re-confirm.
        </div>
        <div style={{ padding: "12px 20px", background: "var(--bg-2)", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--line)" }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onConfirm}>Yes, change it</button>
        </div>
      </div>
    </div>
  );
}

// ===== Formula table — grouped sections with %DV =====
function FormulaTable({ formula, editing, onCell, onAddRow, onRemoveRow, onAddSection }) {
  const sections = formula.sections || [];
  return (
    <div>
      <table className="ps-formula">
        <thead>
          <tr>
            <th style={{ width: editing ? "46%" : "50%" }}>Ingredient</th>
            <th style={{ width: "30%" }}>Form / Spec</th>
            <th style={{ width: "14%" }}>Dose/Srv</th>
            <th style={{ width: "10%" }}>%DV</th>
            {editing && <th style={{ width: "4%" }}></th>}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) => (
            <React.Fragment key={si}>
              <tr className="ps-formula-section">
                <td colSpan={editing ? 5 : 4}>
                  <span className="ps-formula-section-l">{sec.label}</span>
                  {sec.subtotal && <span className="ps-formula-subtotal">{sec.subtotal}</span>}
                </td>
              </tr>
              {sec.rows.map((r, ri) => (
                <tr key={ri} className={editing ? "ps-formula-edit-row" : ""}>
                  <td className="ps-formula-name">
                    {editing
                      ? <input className="ps-cell-input" value={r.name || ""} onChange={e => onCell(si, ri, "name", e.target.value)} />
                      : r.name}
                  </td>
                  <td>
                    {editing
                      ? <input className="ps-cell-input" value={r.form || ""} placeholder="—" onChange={e => onCell(si, ri, "form", e.target.value)} />
                      : (r.form || "—")}
                  </td>
                  <td className="mono">
                    {editing
                      ? <input className="ps-cell-input mono" value={r.dose || ""} onChange={e => onCell(si, ri, "dose", e.target.value)} />
                      : r.dose}
                  </td>
                  <td className="mono">
                    {editing
                      ? <input className="ps-cell-input mono" value={r.dv || ""} placeholder="†" onChange={e => onCell(si, ri, "dv", e.target.value)} />
                      : (r.dv || "†")}
                  </td>
                  {editing && (
                    <td className="ps-row-actions">
                      <button className="ps-row-x" title="Remove ingredient" onClick={() => onRemoveRow(si, ri)}>×</button>
                    </td>
                  )}
                </tr>
              ))}
              {editing && (
                <tr className="ps-formula-add-row">
                  <td colSpan={7}>
                    <button className="ps-add-btn" onClick={() => onAddRow(si)}>+ Add ingredient to "{sec.label}"</button>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {editing && (
            <tr className="ps-formula-add-row">
              <td colSpan={7}>
                <button className="ps-add-btn ps-add-section" onClick={onAddSection}>+ Add section</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {formula.otherIngredients && (
        <div className="ps-formula-other">
          <span className="ps-formula-other-h">Other ingredients:</span> {formula.otherIngredients}
        </div>
      )}
    </div>
  );
}

// ===== Capsule fit math (live-derived from identity + formula) =====
// Max-fill values are at typical bulk density (~0.6 g/ml) — what the contract
// manufacturers actually quote on. Real fit varies with ingredient density;
// this gives Malik a reliable first-pass check before the mfg confirms.
const CAPSULE_MAX_FILL_MG = {
  "0":   480,
  "0e":  540,
  "00":  600,
  "00e": 660,
  "000": 1000,
};

function parseMg(s) {
  if (s == null) return null;
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*mg/i);
  if (m) return parseFloat(m[1]);
  const g = String(s).replace(/,/g, "").match(/([\d.]+)\s*g\b/i);
  if (g) return parseFloat(g[1]) * 1000;
  return null;
}
function parseCount(s) {
  if (s == null) return null;
  const m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function computeCapsuleFit(identity, formula) {
  const sizeRaw = (identity.capsuleSize || "").toLowerCase().trim();
  if (!sizeRaw) return null;
  const max = CAPSULE_MAX_FILL_MG[sizeRaw];
  if (!max) return null;
  // Servings spec: how many capsules per serving (e.g. "2 caps")
  const capsPerServing = parseCount(identity.servingSize) || 2;
  // Sum the formula doses (mg) — only individual ingredient rows, skip blends header
  let totalMg = 0;
  (formula.sections || []).forEach(sec => {
    (sec.rows || []).forEach(r => {
      const mg = parseMg(r.dose);
      if (mg) totalMg += mg;
    });
  });
  // Fall back to existing math.totalFillPerServing if formula sums to 0 (no dose data)
  if (totalMg === 0) return null;

  const fillPerCap = totalMg / capsPerServing;
  const utilPct = (fillPerCap / max) * 100;
  const status = utilPct > 95 ? "over" : utilPct > 88 ? "tight" : "ok";

  // Pretty capsule label
  const sizeLabel = {
    "0":   "Size 0",
    "0e":  "Size 0 Elongated (0E)",
    "00":  "Size 00",
    "00e": "Size 00 Elongated (00E)",
    "000": "Size 000",
  }[sizeRaw] || `Size ${sizeRaw}`;

  return {
    totalFillPerServing: `${totalMg.toLocaleString(undefined, { maximumFractionDigits: 1 })}mg`,
    fillPerCapsule:      `${fillPerCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}mg`,
    capsule:             sizeLabel,
    maxFill:             `${max}mg @ 0.6g/ml`,
    utilization:         `${utilPct.toFixed(1)}%`,
    utilizationStatus:   status,
  };
}

// ===== Format math block =====
function FormatMathBlock({ math }) {
  if (math.kind === "capsule-fit") {
    const utilNum = parseFloat(math.utilization);
    const status = math.utilizationStatus || (utilNum > 88 ? "tight" : utilNum > 95 ? "over" : "ok");
    return (
      <div className="ps-math">
        <div className="ps-math-grid">
          <div className="ps-math-cell"><span className="k">Total fill / serving</span><span className="v mono">{math.totalFillPerServing}</span></div>
          <div className="ps-math-cell"><span className="k">Fill / capsule</span><span className="v mono">{math.fillPerCapsule}</span></div>
          <div className="ps-math-cell"><span className="k">Capsule</span><span className="v">{math.capsule}</span></div>
          <div className="ps-math-cell"><span className="k">Max fill</span><span className="v mono">{math.maxFill}</span></div>
        </div>
        <div className={`ps-math-util ps-math-util-${status}`}>
          <div className="ps-math-util-bar">
            <div className="ps-math-util-fill" style={{ width: `${Math.min(100, utilNum)}%` }}></div>
          </div>
          <div className="ps-math-util-label">
            <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{math.utilization}</span>
            <span style={{ marginLeft: 6 }}>utilization · {status === "ok" ? "✓ confirmed fit" : status === "tight" ? "⚠ tight fit" : "✕ overfilled"}</span>
          </div>
          {math.notes && <div className="ps-math-notes">{math.notes}</div>}
        </div>
      </div>
    );
  }
  if (math.kind === "blend-math") {
    return (
      <div className="ps-math">
        <div className="ps-math-grid">
          {math.scoopWeight && <div className="ps-math-cell"><span className="k">Scoop weight</span><span className="v mono">{math.scoopWeight}</span></div>}
          {math.bagWeight   && <div className="ps-math-cell"><span className="k">Bag weight</span><span className="v mono">{math.bagWeight}</span></div>}
          {math.servingsCalculation && <div className="ps-math-cell" style={{ gridColumn: "span 2" }}><span className="k">Calc check</span><span className="v mono">{math.servingsCalculation}</span></div>}
        </div>
      </div>
    );
  }
  return <div className="empty" style={{ padding: 12 }}>—</div>;
}

// ===== Label structure block =====
function LabelStructureBlock({ ls }) {
  const indiv = (ls.structure || []).filter(s => s.kind === "individual");
  const blends = (ls.structure || []).filter(s => s.kind === "blend");
  return (
    <div>
      <div className="ps-label-grid">
        {indiv.length > 0 && (
          <div className="ps-label-block">
            <div className="ps-label-h">Individual ingredients <span style={{ color: "var(--ink-3)" }}>({indiv.length})</span></div>
            <div className="ps-label-rows">
              {indiv.map((s, i) => (
                <div key={i} className="ps-label-row">
                  <span className="ps-label-row-name">{s.name}</span>
                  <span className="ps-label-row-dose mono">{s.dose}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {blends.length > 0 && (
          <div className="ps-label-block">
            <div className="ps-label-h">Proprietary blend{blends.length > 1 ? "s" : ""} <span style={{ color: "var(--ink-3)" }}>({blends.length})</span></div>
            <div className="ps-label-rows">
              {blends.map((s, i) => (
                <div key={i} className="ps-label-row">
                  <div style={{ flex: 1 }}>
                    <div className="ps-label-row-name">{s.name}</div>
                    {s.items && s.items.length > 0 && (
                      <div className="ps-label-row-items">{s.items.join(" · ")}</div>
                    )}
                  </div>
                  <span className="ps-label-row-dose mono">{s.dose}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {ls.brandedIngredients && ls.brandedIngredients.length > 0 && (
        <div className="ps-label-tm">
          <div className="ps-label-tm-h">Branded ingredient attributions</div>
          {ls.brandedIngredients.map((b, i) => (
            <div key={i} className="ps-label-tm-row">
              <span className="ps-label-tm-mark">{b.mark}</span>
              <span className="ps-label-tm-owner">— {b.owner}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Manufacturer notes block =====
function MfgNotesBlock({ mn }) {
  return (
    <div className="ps-mfg">
      <div className="ps-mfg-row">
        <span className="ps-mfg-k">Manufacturer</span>
        <span className="ps-mfg-v">{mn.manufacturer || "—"}</span>
      </div>
      {mn.leadTime && (
        <div className="ps-mfg-row">
          <span className="ps-mfg-k">Lead time</span>
          <span className="ps-mfg-v mono">{mn.leadTime}</span>
        </div>
      )}
      {mn.moq && (
        <div className="ps-mfg-row">
          <span className="ps-mfg-k">MOQ</span>
          <span className="ps-mfg-v mono">{mn.moq}</span>
        </div>
      )}
      {mn.confirmations && mn.confirmations.length > 0 && (
        <div className="ps-mfg-block">
          <div className="ps-mfg-block-h">✓ Confirmations</div>
          <ul className="ps-mfg-list">
            {mn.confirmations.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {mn.warnings && mn.warnings.length > 0 && (
        <div className="ps-mfg-block ps-mfg-warn">
          <div className="ps-mfg-block-h">⚠ Watch-outs</div>
          <ul className="ps-mfg-list">
            {mn.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ===== Required statements =====
function RequiredStatementsBlock({ items }) {
  return (
    <div className="ps-stmts">
      {items.map((s, i) => (
        <span key={i} className="ps-stmt-chip">{s}</span>
      ))}
    </div>
  );
}

// ===== Dual positioning (liquid/box products) =====
function DualPositioningBlock({ dp }) {
  const cells = [
    { k: "BOTTLE — The Hook",    v: dp.bottle },
    { k: "BOX FRONT — The Story", v: dp.boxFront },
    { k: "BOX BACK — The Sell",   v: dp.boxBack },
  ].filter(c => c.v);
  return (
    <div className="ps-dual">
      {cells.map((c, i) => (
        <div key={i} className="ps-dual-cell">
          <div className="ps-dual-h">{c.k}</div>
          <div className="ps-dual-body">{c.v}</div>
        </div>
      ))}
    </div>
  );
}

// ===== Empty state — no spec sheet yet =====
function SpecSheetEmpty({ p, onUpload }) {
  return (
    <div className="ps-empty">
      <div className="ps-empty-icon">§</div>
      <div className="ps-empty-h">No spec sheet yet</div>
      <div className="ps-empty-sub">
        The spec sheet is the production-ready document that captures format, formula, label structure, and manufacturer confirmations. It's the source of truth that Sourcing, Design, and Listing all read from once locked.
      </div>
      <button className="btn primary" onClick={onUpload} style={{ marginTop: 18 }}>
        ↑ Drop or paste spec doc…
      </button>
      <div className="ps-empty-fmt-hint">
        Accepted: <span className="mono">.docx</span> · <span className="mono">.pdf</span> · pasted text
      </div>
    </div>
  );
}

// ===== Drop-zone modal — drag/drop or paste a Word file =====
function SpecSheetDropZone({ p, ss, onClose, onDecide }) {
  // Smart match: if the product code matches a real spec we have, default to that.
  // Otherwise, let the user pick from the 3 demo specs (or "generic placeholder").
  const realSpecs = window.SPEC_SHEETS_REAL || {};
  const realKeys = Object.keys(realSpecs);
  const autoMatch = realSpecs[p.code] ? p.code : null;

  const [stage, setStage] = useSPS("idle"); // idle | parsing | review
  const [filename, setFilename] = useSPS(null);
  const [pickedKey, setPickedKey] = useSPS(autoMatch || realKeys[0] || null);
  const [pasteText, setPasteText] = useSPS("");

  const startParseFromKey = (key) => {
    const real = realSpecs[key];
    setFilename(real?.sourceFile || `${p.code}-SPEC-v${(ss?.versions?.length || 0) + 1}.docx`);
    setStage("parsing");
    setTimeout(() => setStage("review"), 1400);
  };

  const startParseFromPaste = () => {
    setFilename(`pasted-text-${Date.now()}.txt`);
    setStage("parsing");
    setTimeout(() => setStage("review"), 1400);
  };

  // Build the spec to attach. Prefer the real spec for the picked key; fall back
  // to a generic placeholder seeded with the product's name.
  const buildSpecToAttach = () => {
    const real = realSpecs[pickedKey];
    if (real?.spec) return real.spec;
    // Generic fallback
    return {
      currentVersion: 1,
      lockedAt: { daysAgo: 0, by: "malik" },
      sentToManufacturer: null,
      versions: [{
        v: 1, by: "malik", daysAgo: 0, status: "draft",
        note: pasteText ? "Pasted spec — manual parse" : "Drop-zone seed (placeholder)",
        source: filename || "manual",
        identity: {
          format: p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : "TBD",
          servingSize: "TBD",
          servingsPerContainer: 30,
          launchQty: "3,000 units",
        },
        formula: { sections: [], otherIngredients: "—" },
        formatMath: { kind: "none" },
        labelStructure: { panelType: p.type === "powder" ? "NFP" : "SFP", structure: [] },
        mfgNotes: { manufacturer: "TBD", confirmations: [], warnings: [] },
        requiredStatements: ["GLUTEN-FREE", "NON-GMO", "MADE IN USA"],
      }],
    };
  };

  const handleSave = () => {
    const spec = buildSpecToAttach();
    if (onDecide) {
      // Dossier wraps onDecide with openId already baked in — signature is (who, decision, note)
      onDecide("__rdAttachSpec", "spec-attach", { specSheetV2: spec });
    } else {
      RD2.toast("Spec saved (no persist hook)", "ok");
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ps-dropzone-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-h">
          <h3 style={{ margin: 0 }}>Attach spec sheet · {p.code}</h3>
          <button className="btn xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-b">
          {stage === "idle" && (
            <>
              {/* Real spec quick-pick (for the 3 demo products) */}
              {realKeys.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600, marginBottom: 8 }}>
                    Demo specs available
                    {autoMatch && (
                      <span style={{ marginLeft: 8, fontSize: 9.5, padding: "1px 6px", borderRadius: 99, background: "var(--ok)", color: "white", letterSpacing: "0.04em" }}>
                        AUTO-MATCHED TO {p.code}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {realKeys.map(k => {
                      const r = realSpecs[k];
                      const isPicked = pickedKey === k;
                      return (
                        <button key={k} onClick={() => setPickedKey(k)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                            padding: "10px 12px", borderRadius: 8,
                            border: `1px solid ${isPicked ? "var(--accent, #2563eb)" : "var(--line)"}`,
                            background: isPicked ? "var(--accent-soft, oklch(96% 0.05 260))" : "var(--bg-card)",
                            cursor: "pointer",
                          }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: "50%",
                            border: `2px solid ${isPicked ? "var(--accent, #2563eb)" : "var(--ink-3)"}`,
                            background: isPicked ? "var(--accent, #2563eb)" : "transparent",
                            flexShrink: 0,
                          }}></span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{r.sourceFile}</div>
                            <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 2 }}>
                              {k === "HC304" && "11-in-1 Liver Support · Capsules · 16 ingredients"}
                              {k === "HL432" && "Lymphatic Drainage Drops · Liquid · 10 herbs"}
                              {k === "HP206" && "Slim Mushroom Coffee+ · Powder · 13 ingredients"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drop / browse */}
              <div
                className="ps-dz"
                onClick={() => pickedKey && startParseFromKey(pickedKey)}
                style={{ cursor: pickedKey ? "pointer" : "not-allowed", opacity: pickedKey ? 1 : 0.5 }}
              >
                <div className="ps-dz-icon">⬇</div>
                <div className="ps-dz-h">Drop your PDS Word/PDF here</div>
                <div className="ps-dz-sub">or click to use the selected demo spec above</div>
                <div className="ps-dz-fmts">
                  <span>.docx</span><span>.pdf</span>
                </div>
              </div>

              {/* Paste alternative */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>
                  Or paste spec text
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste the full spec sheet text here (formula, doses, mfg notes, etc.)"
                  style={{
                    width: "100%", minHeight: 100, padding: 10, fontSize: 12.5,
                    border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="btn sm" onClick={startParseFromPaste} disabled={!pasteText.trim()}>
                    Parse pasted text →
                  </button>
                </div>
              </div>

              <div className="ps-dz-hint" style={{ marginTop: 14 }}>
                Pipeline AI parses the doc into structured fields (identity, formula, label structure, mfg notes). You'll review the parse before it locks as v{(ss?.versions?.length || 0) + 1}.
              </div>
            </>
          )}
          {stage === "parsing" && (
            <div className="ps-dz-parse">
              <div className="ps-dz-spinner"></div>
              <div className="ps-dz-parse-h">Parsing <span className="mono">{filename}</span>…</div>
              <div className="ps-dz-parse-steps">
                <ParseStep label="Reading document structure" delay={150} />
                <ParseStep label="Extracting identity & format card" delay={350} />
                <ParseStep label="Parsing formula table" delay={650} />
                <ParseStep label="Detecting label structure (SFP/NFP)" delay={900} />
                <ParseStep label="Extracting manufacturer notes" delay={1150} />
              </div>
            </div>
          )}
          {stage === "review" && (
            <div className="ps-dz-review">
              <div className="ps-dz-review-ok">✓ Parsed successfully</div>
              <div className="ps-dz-review-stats">
                <div><span className="mono">{filename}</span> parsed into 7 sections.</div>
                <div style={{ marginTop: 8, color: "var(--ink-3)", fontSize: 12 }}>
                  Identity card, formula, format math, label structure, mfg notes, required statements detected.
                </div>
              </div>
              <div className="ps-dz-review-actions">
                <button className="btn" onClick={onClose}>Cancel</button>
                <button className="btn primary" onClick={handleSave}>
                  Save as v{(ss?.versions?.length || 0) + 1}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParseStep({ label, delay }) {
  const [done, setDone] = useSPS(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDone(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className="ps-dz-step">
      <span className="ps-dz-step-icon">{done ? "✓" : "·"}</span>
      <span className={done ? "" : "ps-dz-step-label-pending"}>{label}</span>
    </div>
  );
}

// ===== Compare mode — uses old SpecSheetCompare style for now (delegates to existing) =====
function SpecSheetCompareV2({ ss }) {
  // Reuse the existing simpler diff for now — formula-only diff is what people actually care about
  const versions = [...ss.versions].sort((a, b) => b.v - a.v);
  const [leftV, setLeftV] = useSPS(ss.currentVersion - 1);
  const [rightV, setRightV] = useSPS(ss.currentVersion);
  const left = ss.versions.find(v => v.v === leftV);
  const right = ss.versions.find(v => v.v === rightV);
  if (!left || !right) {
    return <div className="empty" style={{ padding: 30 }}>Need at least 2 versions to compare.</div>;
  }
  return (
    <div className="ps-compare">
      <div className="ps-compare-controls">
        <select className="ps-ver-sel" value={leftV} onChange={e => setLeftV(parseInt(e.target.value))}>
          {versions.map(v => <option key={v.v} value={v.v}>v{v.v} · {v.note || ""}</option>)}
        </select>
        <span style={{ color: "var(--ink-3)" }}>→</span>
        <select className="ps-ver-sel" value={rightV} onChange={e => setRightV(parseInt(e.target.value))}>
          {versions.map(v => <option key={v.v} value={v.v}>v{v.v} · {v.note || ""}</option>)}
        </select>
      </div>
      <SpecDiffSummary left={left} right={right} />
    </div>
  );
}

function SpecDiffSummary({ left, right }) {
  // Compute a flat list of (ingredient → dose) from each side
  const flatten = (ver) => {
    const out = {};
    (ver.formula?.sections || []).forEach(sec => {
      (sec.rows || []).forEach(r => { out[r.name] = r; });
    });
    // Also fall back to legacy `ingredients` array
    (ver.ingredients || []).forEach(r => { out[r.name] = { name: r.name, dose: r.dose, form: r.form }; });
    return out;
  };
  const L = flatten(left), R = flatten(right);
  const added = Object.values(R).filter(r => !L[r.name]);
  const removed = Object.values(L).filter(r => !R[r.name]);
  const changed = [];
  for (const name in R) {
    if (!L[name]) continue;
    if (L[name].dose !== R[name].dose) changed.push({ name, field: "dose", from: L[name].dose, to: R[name].dose });
    if ((L[name].form || "") !== (R[name].form || ""))
      changed.push({ name, field: "form", from: L[name].form || "—", to: R[name].form || "—" });
  }
  return (
    <div className="ps-diff">
      {added.length === 0 && removed.length === 0 && changed.length === 0 && (
        <div className="empty" style={{ padding: 20 }}>v{left.v} and v{right.v} are identical (formula-wise).</div>
      )}
      {added.length > 0 && <DiffBlock title={`+ ADDED (${added.length})`} cls="add" rows={added.map(r => `${r.name} · ${r.dose}`)} />}
      {removed.length > 0 && <DiffBlock title={`– REMOVED (${removed.length})`} cls="rem" rows={removed.map(r => `${r.name} · ${r.dose}`)} />}
      {changed.length > 0 && <DiffBlock title={`~ CHANGED (${changed.length})`} cls="chg" rows={changed.map(c => `${c.name} · ${c.field}: ${c.from} → ${c.to}`)} />}
    </div>
  );
}

function DiffBlock({ title, cls, rows }) {
  return (
    <div className={`ps-diff-block ${cls}`}>
      <div className="ps-diff-h">{title}</div>
      {rows.map((r, i) => <div key={i} className="ps-diff-row">{r}</div>)}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { SpecSheetTabV2 });
