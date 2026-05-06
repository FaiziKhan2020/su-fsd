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

// ===== Sent-back banner =====
// Shown at top of niche stage when Joel/Chesky bounced the product back
// from review. Tells Malik who sent it back, why, and how long ago.
function SentBackBanner({ sentBack }) {
  const u = RD2.person(sentBack.by);
  return (
    <div style={{
      margin: "0 0 14px",
      padding: "12px 14px",
      background: "oklch(96% 0.04 30)",
      border: "1px solid oklch(80% 0.12 30)",
      borderRadius: 10,
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }}>
      <div style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>↩</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "oklch(45% 0.15 30)" }}>
            Sent back from niche review
          </span>
          {u && <RD2.Avatar user={u} size="xs" />}
          <span style={{ fontSize: 12, fontWeight: 600 }}>{u?.name}</span>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>· {sentBack.daysAgo === 0 ? "just now" : `${sentBack.daysAgo}d ago`}</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>"{sentBack.reason}"</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 6 }}>
          Address the note above, then re-submit for niche review.
        </div>
      </div>
    </div>
  );
}

// ===== Send-back menu — moves a product to any earlier stage =====
// Placed in dossier header so it's available on any product. Generic demote
// flow: pick target stage + reason → emits __sendBackStage decision.
const STAGE_BACKWARDS = [
  { id: "idea", label: "Idea" },
  { id: "niche", label: "Niche Analysis" },
  { id: "approval", label: "Niche Review" },
  { id: "rd", label: "Formulation" },
  { id: "build", label: "Production" },
  { id: "production", label: "Manufacturing" },
];
function SendBackMenu({ p, onDecide }) {  const [open, setOpen] = useSDS(false);
  const [target, setTarget] = useSDS(null);
  const [reason, setReason] = useSDS("");
  const currentIdx = STAGE_BACKWARDS.findIndex(s => s.id === p.stage);
  const earlier = STAGE_BACKWARDS.slice(0, Math.max(currentIdx, 0));
  if (earlier.length === 0) return null; // nothing earlier to bounce to (idea or unknown)
  const submit = () => {
    if (!target) { RD2.toast("Pick a stage to send back to", "warn"); return; }
    onDecide && onDecide("__sendBackStage", "send-back", { toStage: target, reason });
    RD2.toast(`Sent back to ${STAGE_BACKWARDS.find(s => s.id === target)?.label}`, "ok");
    setOpen(false); setTarget(null); setReason("");
  };
  return (
    <>
      <button
        className="btn sm"
        onClick={() => setOpen(true)}
        title="Send this product back to an earlier stage"
        style={{ marginLeft: 8, fontSize: 11, opacity: 0.85 }}
      >
        ↩ Send back
      </button>
      {open && (
        <div className="dossier-overlay" onClick={() => setOpen(false)} style={{ zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, maxWidth: 460, width: "92vw", padding: 22, margin: "10vh auto", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Send back · {p.code}</div>
            <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 600 }}>Move to an earlier stage</h3>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>
              Currently in <strong style={{ color: "var(--ink-1)" }}>{RD2.stage(p.stage)?.label || p.stage}</strong>. Pick where to send it back to. Forward-stage state (Formulation gate, streams, approvals, cost pass) is wiped — re-promotion starts fresh.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {earlier.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: target === s.id ? "var(--accent-soft, var(--bg-2))" : "var(--bg-2)", border: `1px solid ${target === s.id ? "var(--accent, var(--ink-2))" : "var(--line)"}`, borderRadius: 6, cursor: "pointer" }}>
                  <input type="radio" name="sb-target" checked={target === s.id} onChange={() => setTarget(s.id)} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Reason (optional)</div>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why is this going back? (shown to the next owner as a banner)"
                rows={3}
                style={{ width: "100%", padding: 10, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", color: "var(--ink-1)", resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={submit}>Send back →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Delete product menu (admin-only, available from any stage) =====
function DeleteMenu({ p, onDelete, onClose }) {
  const [open, setOpen] = useSDS(false);
  const [confirm, setConfirm] = useSDS("");
  const isAdmin = RD2.isAdmin && RD2.isAdmin();
  if (!isAdmin) return null;
  const matches = confirm.trim().toUpperCase() === (p.code || "").toUpperCase();
  const submit = () => {
    if (!matches) { RD2.toast(`Type "${p.code}" to confirm`, "warn"); return; }
    onDelete && onDelete(p.id);
    RD2.toast(`Deleted ${p.code}`, "ok");
    setOpen(false); setConfirm("");
    onClose && onClose();
  };
  return (
    <>
      <button
        className="btn sm"
        onClick={() => setOpen(true)}
        title="Permanently delete this product"
        style={{ marginLeft: 4, fontSize: 11, opacity: 0.7, color: "var(--err, #c62828)" }}
      >
        🗑 Delete
      </button>
      {open && (
        <div className="dossier-overlay" onClick={() => setOpen(false)} style={{ zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--panel)", border: "1px solid var(--err, #c62828)", borderRadius: 10, maxWidth: 460, width: "92vw", padding: 22, margin: "10vh auto", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 11, color: "var(--err, #c62828)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Delete · {p.code}</div>
            <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 600 }}>Permanently delete this product?</h3>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
              This removes <strong style={{ color: "var(--ink-1)" }}>{p.name}</strong> ({p.code}) from every stage, queue, and view. Versions, comments, and history go with it. <strong>This cannot be undone.</strong>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>
              Type <code style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>{p.code}</code> to confirm:
            </div>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={p.code}
              autoFocus
              style={{ width: "100%", padding: 10, background: "var(--bg-2)", border: `1px solid ${matches ? "var(--err, #c62828)" : "var(--line)"}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", color: "var(--ink-1)" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</button>
              <button
                className="btn"
                onClick={submit}
                disabled={!matches}
                style={{ background: matches ? "var(--err, #c62828)" : "var(--bg-2)", color: matches ? "#fff" : "var(--ink-3)", borderColor: matches ? "var(--err, #c62828)" : "var(--line)" }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Overview tab =====
function Overview({ p, onDecide, setTab, onUpload, onPromote, onReject, onSubmitForReview, currentUser }) {
  // Dual approval lives here for stage === "approval"
  if (p.stage === "approval") return <RD2.DualApproval p={p} onDecide={onDecide} currentUser={currentUser} />;

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
          <RD2.GatedAction product={p}>
            <button className="btn primary promote" onClick={() => onPromote && onPromote(p.id)}>Promote to Niche →</button>
          </RD2.GatedAction>
          <RD2.GatedAction product={p}>
            <button className="btn reject" onClick={() => onReject && onReject(p.id)}>Reject</button>
          </RD2.GatedAction>
        </div>
      </div>
    );
  }

  // Niche stage — Researching → Upload CTA, Parsed → Submit for review
  if (p.stage === "niche") {
    if (p.nicheSubState === "researching") {
      return (
        <div>
          {p.sentBack && <SentBackBanner sentBack={p.sentBack} />}
          <div className="stage-hero researching">
            <div className="stage-hero-eyebrow">⏱ NICHE ANALYSIS — RESEARCHING</div>
            <h2>Niche doc not parsed yet</h2>
            <p>Malik is {p.researchingDaysAgo}d in. Once the deep-dive Google Sheet is uploaded, AI parses it into structured fields and you can review.</p>
            <div className="stage-hero-actions">
              <button className="btn primary" onClick={onUpload}>Upload niche doc</button>
              <button className="btn" onClick={() => setTab("niche")}>View template</button>
            </div>
          </div>
        </div>
      );
    }
    if (p.nicheSubState === "parsed") {
      return (
        <div>
          {p.sentBack && <SentBackBanner sentBack={p.sentBack} />}
          <div className="stage-hero parsed">
            <div className="stage-hero-eyebrow">{p.sentBack ? "↩ REVISIONS REQUESTED" : "✓ DOC PARSED · READY TO SUBMIT"}</div>
            <h2>{p.sentBack ? "Address the revisions, then re-submit" : "Niche analysis complete"}</h2>
            <p>Next step: submit for niche review — Chesky decides go/no-go.</p>
            <div className="stage-hero-actions">
              <button className="btn primary" onClick={() => onSubmitForReview && onSubmitForReview()}>Submit for niche review →</button>
              <button className="btn" onClick={() => setTab("niche")}>Open analysis</button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Formulation stage — send straight to Formulation tab to avoid an empty cockpit
  if (p.stage === "rd") {
    const owner = p.rdGate?.ownerKind === "formulator"
      ? RD2.person(p.rdGate.ownerId)
      : null;
    const ownerLabel = p.rdGate?.ownerKind === "formulator"
      ? `${owner?.name || "Talha"} is formulating`
      : "Manufacturer is sampling";
    const lastRound = p.rdGate?.sampleRounds?.[p.rdGate.sampleRounds.length - 1];
    const isMfg = p.rdGate?.ownerKind !== "formulator";
    const mfgEng = p.rdGate?.mfgEngagement || [];
    const subline = p.rdGate?.status === "approved"
      ? "✓ Sample approved — ready to advance to Build"
      : lastRound?.verdict === "pending"
        ? `Round ${lastRound.round} en route · ${lastRound.flavor || "awaiting taste-test"}`
        : lastRound
          ? `Round ${lastRound.round} feedback: ${lastRound.feedback || "—"}`
          : isMfg
            ? (mfgEng.length === 0
                ? "Briefed — quoting mfgs (no responses yet)"
                : `${mfgEng.length} mfg${mfgEng.length === 1 ? "" : "s"} engaged · awaiting samples`)
            : (p.rdGate?.samplesToTalha?.length
                ? `${p.rdGate.samplesToTalha.filter(s => s.shipped).length}/${p.rdGate.samplesToTalha.length} ingredients shipped to Talha`
                : "Briefed — Talha selecting noise formula");

    // Gate readiness — compute what's missing so Chesky can see at a glance.
    // SAMPLING IS NO LONGER A BUILD GATE — it's a parallel stream that runs inside Build.
    // Build can advance once spec is locked + cost pass is complete; design/listing/amazon
    // proceed in parallel while Mimi/Connor confirm capsule fit + ship physical samples.
    // Sample approval becomes a Production gate (blocks the full batch order).
    const sampleOk = p.rdGate?.status === "approved"; // still tracked for the post-Build Production gate
    const specOk = !!(p.specSheet || p.specSheetV2);
    const cp = p.costPass;
    const cpItems = cp?.ingredients || [];
    const cpDone = cpItems.length > 0
      ? cpItems.every(i => i.status === "quoted")
      : !!cp?.flatPrice?.pricePerUnit;
    const allOk = specOk && cpDone; // sampleOk dropped from gate
    const isAdmin = currentUser === "chesky" || currentUser === "joel";
    return (
      <div className="stage-hero researching">
        <div className="stage-hero-eyebrow">✍ FORMULATION · SAMPLING</div>
        <h2>{ownerLabel}</h2>
        <p>{subline}</p>

        {/* Readiness checklist — visible to all, actionable only by Chesky */}
        <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, maxWidth: 520 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>Build readiness</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: specOk ? "var(--ink)" : "var(--ink-3)" }}>
            <span style={{ width: 14 }}>{specOk ? "✓" : "○"}</span>
            <span>Spec drafted by Malik</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: cpDone ? "var(--ink)" : "var(--ink-3)" }}>
            <span style={{ width: 14 }}>{cpDone ? "✓" : "○"}</span>
            <span>
              Cost pass complete
              {cpItems.length > 0 && !cpDone && (
                <span style={{ color: "var(--ink-3)", marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  ({cpItems.filter(i => i.status === "quoted").length}/{cpItems.length} quoted)
                </span>
              )}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-3)", fontSize: 11.5, fontStyle: "italic", marginTop: 2, paddingTop: 6, borderTop: "1px dashed var(--line)" }}>
            <span style={{ width: 14 }}>↻</span>
            <span>Sampling continues in parallel inside Build (gates Production, not Design/Listing).</span>
          </div>
        </div>

        <div className="stage-hero-actions">
          <button className="btn primary" onClick={() => setTab("spec")}>Open Spec sheet →</button>
          {(() => {
            // Build the missing-checklist string for the override confirm.
            const missing = [];
            if (!specOk) missing.push("Spec sheet");
            if (!cpDone) {
              const quoted = cpItems.filter(i => i.status === "quoted").length;
              missing.push(cpItems.length > 0
                ? `Cost pass (${quoted}/${cpItems.length} ingredients quoted)`
                : "Cost pass");
            }
            const advance = (override) => {
              if (override) {
                const reason = window.prompt(
                  `Override: advance to Build despite incomplete readiness?\n\nMissing: ${missing.join(", ")}\n\nEnter a short reason for the audit log:`,
                  ""
                );
                if (reason === null) return; // cancelled
                onDecide && onDecide("__rdAdvanceToBuild", "override", reason.trim() || "(no reason given)");
              } else {
                onDecide && onDecide("__rdAdvanceToBuild");
              }
            };
            if (allOk) {
              return (
                <button
                  className="btn"
                  disabled={!isAdmin}
                  title={!isAdmin ? "Only Chesky can lock spec & advance to Build" : "Lock spec sheet and kick off Sourcing, Design, and Listing"}
                  style={!isAdmin ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  onClick={() => isAdmin && advance(false)}
                >Lock spec & advance to Build →</button>
              );
            }
            // Not all ready → admin sees an "Override & advance" button; everyone else sees disabled state.
            if (!isAdmin) {
              return (
                <button className="btn" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}
                  title="Awaiting readiness — Chesky will advance once the checklist is complete">
                  Awaiting readiness
                </button>
              );
            }
            return (
              <button
                className="btn"
                style={{ borderColor: "var(--warn)", color: "var(--warn)" }}
                title={`Force advance despite incomplete readiness. Missing: ${missing.join(", ")}`}
                onClick={() => advance(true)}
              >⚡ Override & advance to Build →</button>
            );
          })()}
        </div>
      </div>
    );
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
            <button className="btn primary" onClick={() => RD2.toast(`${p.code} revived → Build`, "ok")}>Revive — move to Build</button>
            <button className="btn" onClick={() => RD2.toast(`${p.code} moved to Killed`, "warn")}>Move to Killed</button>
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
              : p.stage === "production" ? `Manufacturing · ${stageAge}d in stage`
              : p.stage === "build" ? `Production · ${stageAge}d in stage`
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
          {/* Owner row removed — product has no single owner; stream owners cover real routing. */}
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
            {["sourcing", "design", "listing", "amazon"].map(k => {
              const s = p.streams[k]; if (!s) return null;
              const u = RD2.person(s.owner);
              const tone = s.status === "Backorder" || s.status === "Stuck" || s.status === "Hard pull" ? "err"
                : s.status === "Approved" || s.status === "Ordered" || s.status === "Allowed — clean" ? "ok"
                : s.status === "GMP required" || s.status === "Testing required" ? "warn"
                : s.status === "Not started" ? "idle"
                : "active";
              const lbl = k === "amazon" ? "Listing live-check" : k.charAt(0).toUpperCase() + k.slice(1);
              return (
                <button key={k} className={`cockpit-stream tone-${tone}`} onClick={() => setTab(k === "amazon" ? "listing" : k)}>
                  <div className="cockpit-stream-head">
                    <span className="cockpit-stream-name">{lbl}</span>
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
  if (p.specSheet) {
    tiles.push({ id: "spec", label: "Spec sheet", glyph: "§",
      meta: `v${p.specSheet.currentVersion} · ${p.specSheet.lockedAt ? "locked" : "draft"}` });
  }
  if (p.label || p.box || p.insert) {
    const total = (p.label?.versions?.length || 0) + (p.box?.versions?.length || 0) + (p.insert?.versions?.length || 0);
    tiles.push({ id: "design", label: "Packaging", glyph: "◧", meta: `${total} versions across label/box/insert` });
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
function Dossier({ productId, onClose, onDecide, onUploadNiche, onUpdateNiche, onPromote, onReject, onDelete, focus, currentUser }) {
  const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === productId);
  const [tab, setTab] = useSDS("overview");
  const [showUpload, setShowUpload] = useSDS(false);
  const [showSubmit, setShowSubmit] = useSDS(false);
  const [topicFilter, setTopicFilter] = useSDS(null);
  const [aiCollapsed, setAiCollapsed] = useSDS(true);
  const [seedDraft, setSeedDraft] = useSDS("");

  // Apply focus on first open / when focus changes
  const [designKind, setDesignKind] = useSDS("label");
  React.useEffect(() => {
    if (!focus || !p) return;
    if (focus === "approval") setTab("overview");
    else if (focus === "live") setTab("live");
    else if (focus === "niche") setTab("niche");
    else if (focus.startsWith("tab:design:")) {
      setTab("design");
      setDesignKind(focus.slice("tab:design:".length));
      setTopicFilter("design");
    }
    else if (focus.startsWith("tab:")) {
      setTab(focus.slice(4));
    }
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
    (p.rdGate || p.specSheet || p.specSheetV2) && { id: "spec", label: "Spec sheet" },
    // Sampling tab — visible in Formulation stage and onward (any time rdGate exists).
    // Capsule SKUs: manufacturer confirms sample size (no taste round).
    // Liquid/powder: Talha iterates rounds with feedback.
    p.rdGate && { id: "sampling", label: p.type === "capsule" ? "Sourcing & Sample" : "Sampling" },
    (p.rdGate || p.bom || p.packaging || p.streams) && { id: "production", label: "Production" },
    p.streams && { id: "design", label: "Packaging" },
    (p.listing || p.streams) && { id: "listing", label: "Listing" },
    { id: "comments", label: "Comments" },
    { id: "activity", label: "Activity" },
  ].filter(Boolean);

  const onTabChange = (t) => {
    setTab(t);
    if (["production", "design", "listing", "niche", "sampling"].includes(t)) {
      setTopicFilter(t === "design" ? "label" : t === "production" ? "sourcing" : t === "sampling" ? "rd" : t);
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
            <SendBackMenu p={p} onDecide={onDecide} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn sm" onClick={() => setAiCollapsed(c => !c)} title="Toggle AI rail" style={{ marginLeft: 8 }}>
              {aiCollapsed ? "✦ Show Pipeline AI" : "Hide AI"}
            </button>
            <DeleteMenu p={p} onDelete={onDelete} onClose={onClose} />
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
          {tab === "overview" && <Overview p={p} onDecide={onDecide} setTab={onTabChange} onUpload={() => setShowUpload(true)} onPromote={onPromote} onReject={onReject} onSubmitForReview={() => setShowSubmit(true)} currentUser={currentUser} />}
          {tab === "live" && <LiveTab p={p} />}
          {tab === "niche" && <RD2.NicheDoc p={p} setTab={onTabChange} currentUser={currentUser} onDecide={onDecide} onUpdateNiche={onUpdateNiche} onUpload={() => setShowUpload(true)} />}
          {tab === "spec" && <RD2.SpecSheetTabV2 p={p} onDecide={onDecide} />}
          {tab === "sampling" && (
            p.type === "capsule"
              ? <RD2.SourcingSampleTab p={p} setTab={onTabChange} onDecide={onDecide} />
              : <RD2.RDTab p={p} setTab={onTabChange} onDecide={onDecide} />
          )}
          {tab === "production" && <RD2.ProductionTab p={p} setTab={onTabChange} onDecide={onDecide} />}
          {tab === "design" && <RD2.DesignTab p={p} initialKind={designKind} currentUser={currentUser} onDecide={onDecide} />}
          {tab === "listing" && <RD2.ListingTab p={p} onDecide={onDecide} />}
          {tab === "amazon" && <RD2.AmazonCheckTab p={p} currentUser={currentUser} onDecide={onDecide} />}
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
          onComplete={(data) => {
            onUploadNiche(p.id, data);
            setShowUpload(false);
            if (data.autoSubmit) {
              // Fire submit-for-review in the same gesture; user already chose to submit
              setTimeout(() => onDecide("__submitForReview", "review"), 50);
              RD2.toast?.("Submitted for niche review", "ok");
            }
          }} />
      )}
      {showSubmit && (
        <SubmitForReviewModal p={p} onClose={() => setShowSubmit(false)}
          onSubmit={(decision) => { onDecide("__submitForReview", decision); setShowSubmit(false); }} />
      )}
    </div>
  );
}

// ===== Submit-for-review confirm modal =====
// Niche → Niche Review. Chesky decides go/no-go (no cost pass at this stage —
// real cost pass runs at Formulation, after Malik locks the PDS).
function SubmitForReviewModal({ p, onClose, onSubmit }) {
  const malik = RD2.person("malik");
  const joel = RD2.person("joel");
  const chesky = RD2.person("chesky");
  const verdict = p.niche?.current?.verdict || p.nicheSummary;
  return (
    <div className="dossier-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg)", borderRadius: 14, width: 540, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden"
      }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Submit niche for review</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.code}</span>
            <RD2.BrandChip b={p.brand} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
          </div>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div style={{ background: "var(--bg-2)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 6, fontWeight: 500 }}>Niche doc summary</div>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{p.synopsis}</div>
            {verdict?.recommendation && (
              <div style={{ marginTop: 8 }}>
                <span style={{ display: "inline-block", padding: "2px 8px", background: "var(--ok)", color: "white", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  {verdict.recommendation}
                </span>
              </div>
            )}
          </div>

          {/* Flow diagram */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6, opacity: 0.6 }}>
              <RD2.Avatar user={malik} size="xs" /><span>Niche</span>
            </div>
            <span style={{ color: "var(--ink-3)" }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "oklch(96% 0.05 80)", border: "1px solid oklch(85% 0.1 70)", borderRadius: 6, fontWeight: 600 }}>
              <RD2.Avatar user={chesky} size="xs" />
              <span>Niche review</span>
            </div>
            <span style={{ color: "var(--ink-3)" }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6, opacity: 0.6 }}>
              <span>Formulation</span>
            </div>
          </div>

          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 4 }}>
            Chesky decides go/no-go on the niche. If approved, Malik locks the PDS in Formulation and Joel runs the $/bottle pass against the locked formula before the manufacturer brief goes out.
          </div>
        </div>

        <div style={{ padding: "14px 22px", background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSubmit("review")}>Submit for review →</button>
        </div>
      </div>
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
