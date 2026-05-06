/* global React, RD2, PIPELINE_DATA */
const { useState: useSRD, useMemo: useMRD } = React;

// ============================================================
// FORMULATION TAB — sampling iteration tracker
//   Two flavors based on rdGate.ownerKind:
//     • formulator (Talha) — liquid/powder: noise-formula, samples-to-Talha, sample-rounds
//     • mfg                — capsule etc.:  PDS-locked dose, mfg engagement table
// ============================================================

function RDTab({ p, setTab, onDecide }) {
  const g = p.rdGate;
  if (!g) {
    return (
      <div style={{ maxWidth: 720, margin: "24px auto", padding: 24, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>FORMULATION · gate not seeded</div>
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>This product reached Formulation before the gate model existed. Re-promote from Niche Review to seed it.</div>
      </div>
    );
  }
  const pdsLocked = !!g.pdsLocked;
  const cpDone = p.costPass?.status === "done";

  // Pre-PDS-lock: lead with the kickoff card — "1. Lock the PDS / 2. Engage mfgs".
  // (Brief-send is also gated, but the kickoff card is the better entry point.)
  if (!pdsLocked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 980 }}>
        <MfgEmptyKickoff p={p} g={g} onDecide={onDecide} />
      </div>
    );
  }

  // Cost pass moved out of Sampling — quotes live in the Sourcing tab now.
  // Sampling tab is purely about: ingredient sample shipped → mfg confirms capsule fit
  // → physical sample arrives → Chesky approves. No quotes here.
  const costPassCard = null;

  // Pre-flight: brief drafted but not yet sent. Chesky's queue.
  if (g.briefSent === false) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 980 }}>
        {costPassCard}
        <RDBriefPanel p={p} g={g} onDecide={onDecide} />
      </div>
    );
  }
  // Build stage + capsule manufacturer flow: show the slim parallel-stream UI.
  // Engagement table / sample rounds are Formulation-stage concerns; once we're in
  // Build a winner is locked and sampling is just a 4-step gate to Production.
  if (p.stage === "build" && g.ownerKind !== "formulator") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 980 }}>
        <BuildSamplingStream p={p} g={g} onDecide={onDecide} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 980 }}>
      {costPassCard}
      <RDHeader p={p} g={g} onDecide={onDecide} />
      {g.ownerKind === "formulator"
        ? <FormulatorRD p={p} g={g} setTab={setTab} onDecide={onDecide} />
        : <MfgRD p={p} g={g} setTab={setTab} onDecide={onDecide} />}
    </div>
  );
}

// ============================================================
// BUILD-STAGE SAMPLING STREAM — slim 4-step gate to Production
//   Used when p.stage === "build" for capsule/mfg-owned products.
//   Replaces engagement table + sample rounds with a focused checklist.
// ============================================================
function BuildSamplingStream({ p, g, onDecide }) {
  const winner = (g.mfgEngagement || []).find(e => e.status === "won");
  const mfg = winner && (PIPELINE_DATA.MANUFACTURERS || []).find(m => m.id === winner.mfgId);
  const mfgName = mfg?.name || "Manufacturer";

  // Derive step states from gate. Liberal defaults — read what's actually persisted,
  // fall back to reasonable inference. The shape is intentionally tolerant; this is
  // a design surface, not a state machine.
  const ship = g.sampleShipment || null;
  const fit = g.capsuleFitConfirmation || null;
  const arrival = g.physicalSample || null;
  const approval = g.sampleApproval || null;

  const stepDone = {
    ship:     !!ship?.shippedAt || !!ship?.delivered,
    fit:      !!fit?.confirmed,
    arrival:  !!arrival?.receivedAt,
    approval: approval?.decision === "approve",
  };
  const blockedReason = (key) => {
    if (key === "fit"      && !stepDone.ship) return "Waiting on raw shipment";
    if (key === "arrival"  && !stepDone.fit)  return "Mfg hasn't confirmed fit yet";
    if (key === "approval" && !stepDone.arrival) return "Sample hasn't arrived";
    return null;
  };

  const allDone = stepDone.ship && stepDone.fit && stepDone.arrival && stepDone.approval;

  return (
    <div className="rd-card">
      <div className="rd-card-h">
        <div>
          <div className="rd-head-eyebrow" style={{ marginBottom: 2 }}>BUILD · SAMPLING STREAM</div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Sample → physical confirm → approve</h3>
        </div>
        {allDone
          ? <span className="meta" style={{ background: "var(--ok-soft)", color: "var(--ok)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>READY FOR PRODUCTION</span>
          : <span className="meta">{Object.values(stepDone).filter(Boolean).length}/4 done</span>}
      </div>
      <div style={{ padding: "4px 0 8px" }}>
        <BuildStreamRow
          n={1} label="Ingredients shipped to mfg"
          done={stepDone.ship}
          owner="ronel"
          detail={ship?.shippedAt
            ? `Shipped ${RD2.daysAgoLabel(ship.daysAgo ?? 2)} · ${ship.itemCount || (g.samplesToTalha?.length || 0)} items`
            : "Awaiting Ronel pull from sample pantry"}
          to={mfgName}
        />
        <BuildStreamRow
          n={2} label={`${mfgName} confirms capsule fit`}
          done={stepDone.fit}
          owner={winner?.contact || "mimi"}
          detail={fit?.confirmed
            ? `${fit.fillPct ?? 88}% fill · size ${fit.size || "0E"} · ${fit.capsulesPerServing || 2}/serving`
            : "Mfg validates 80–90% target with our raws before pressing samples"}
          blocked={blockedReason("fit")}
        />
        <BuildStreamRow
          n={3} label="Physical sample at office"
          done={stepDone.arrival}
          owner="chesky"
          detail={arrival?.receivedAt
            ? `Arrived ${RD2.daysAgoLabel(arrival.daysAgo ?? 1)} · ${arrival.bottleCount || 3} bottles`
            : (arrival?.etaDays ? `ETA ${arrival.etaDays}d` : "Mfg ships once fit confirmed")}
          blocked={blockedReason("arrival")}
        />
        <BuildStreamRow
          n={4} label="Chesky approves sample"
          done={stepDone.approval}
          owner="chesky"
          detail={approval?.decision === "approve"
            ? `Approved · "${approval.note || "Looks good"}"`
            : (approval?.decision === "reject" ? `Rejected · "${approval.note || ""}"` : "Pending physical review")}
          blocked={blockedReason("approval")}
          last
        />
      </div>
      <div style={{ padding: "10px 18px 14px", borderTop: "1px dashed var(--line)", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
        Sampling runs in parallel with Sourcing · Design · Listing · Amazon-check.
        <strong style={{ color: "var(--ink-2)" }}> Production order is gated until all 4 land.</strong>
      </div>
    </div>
  );
}

function BuildStreamRow({ n, label, done, owner, detail, to, blocked, last }) {
  const u = owner ? RD2.person(owner) : null;
  const state = done ? "done" : (blocked ? "blocked" : "active");
  const dot = done ? "✓" : (blocked ? "○" : "◐");
  const dotColor = done ? "var(--ok)" : (blocked ? "var(--ink-4, var(--ink-3))" : "var(--accent, #2563eb)");
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "36px 1fr auto",
      alignItems: "center",
      gap: 12,
      padding: "12px 18px",
      borderBottom: last ? "none" : "1px solid var(--line)",
      opacity: blocked ? 0.62 : 1,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? "var(--ok-soft)" : (blocked ? "var(--bg-2)" : "var(--accent-soft, var(--bg-2))"),
        color: dotColor,
        fontSize: 14, fontWeight: 700,
        border: `1px solid ${done ? "var(--ok)" : "var(--line)"}`,
      }}>{dot}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{n}.</span>
          <span>{label}</span>
          {to && <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400 }}>→ {to}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: state === "blocked" ? "var(--ink-3)" : "var(--ink-2)", marginTop: 2, fontStyle: blocked ? "italic" : "normal" }}>
          {blocked || detail}
        </div>
      </div>
      {u && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-3)" }}>
          <RD2.Avatar user={u} size="sm" />
          <span>{u.name?.split(" ")[0]}</span>
        </div>
      )}
    </div>
  );
}

// ===== Pre-flight brief panel — Chesky reviews & sends =====
function RDBriefPanel({ p, g, onDecide }) {
  const [body, setBody] = useSRD(g.briefDraft?.body || "");
  const [recipients, setRecipients] = useSRD(() => g.briefDraft?.recipients || []);
  const allCandidates = useMRD(() => {
    if (g.kickoff === "talha-sample") return [{ id: "talha", role: "Formulator" }];
    if (g.kickoff === "capsule-mfg") return [
      { id: "mimi", role: "Mimi · Herbally Yours" },
      { id: "connor", role: "Connor · Brand Nutra" },
    ];
    // ready-sample (softgel/gummy/tea/cream/patch) — same mfg pool, single pick
    return [
      { id: "mimi", role: "Mimi · Herbally Yours" },
      { id: "connor", role: "Connor · Brand Nutra" },
    ];
  }, [g.kickoff]);
  const toggleRecipient = (id) => {
    if (g.kickoff === "ready-sample") {
      setRecipients([id]); // single pick for ready samples
    } else {
      setRecipients(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id]);
    }
  };
  const send = () => {
    if (recipients.length === 0) { RD2.toast("Pick at least one recipient", "warn"); return; }
    onDecide && onDecide("__rdSendBrief", "send", { recipients, body });
    RD2.toast(`Brief sent to ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}`, "ok");
  };
  const kickoffLabel = {
    "talha-sample": "Talha builds the sample (liquid/powder)",
    "capsule-mfg": "Mimi + Connor quote in parallel (capsule)",
    "ready-sample": "Order ready-made sample from mfg",
  }[g.kickoff] || "Brief";
  const helpText = {
    "talha-sample": "Talha drafts a noise formula and tells Ronel which ingredients he needs sample-sized of. Ronel ships them; Talha makes round 1.",
    "capsule-mfg": "Mimi and Connor quote head-to-head. Whichever confirms first gets sample-size ingredients shipped from Ronel; they make a capsule sample for our review.",
    "ready-sample": "Mfg sources their own ingredients and ships a ready-made sample. No Ronel shipment needed.",
  }[g.kickoff];

  return (
    <div className="rd-card">
      <div className="rd-card-h">
        <div>
          <div className="rd-head-eyebrow" style={{ marginBottom: 2 }}>FORMULATION · AWAITING KICKOFF</div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Review &amp; send the Formulation brief</h3>
        </div>
        <span className="meta" style={{ background: "var(--warn-soft)", color: "var(--warn)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>YOUR MOVE</span>
      </div>
      <div style={{ padding: "14px 18px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--ink-1)" }}>{kickoffLabel}.</strong> {helpText}
        </div>

        {/* Recipients */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 8 }}>
            {g.kickoff === "ready-sample" ? "Pick a manufacturer" : "Recipients"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allCandidates.map(c => {
              const u = RD2.person(c.id);
              const checked = recipients.includes(c.id);
              return (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: checked ? "var(--accent-soft, var(--bg-2))" : "var(--bg-2)", border: `1px solid ${checked ? "var(--accent, var(--ink-2))" : "var(--line)"}`, borderRadius: 6, cursor: "pointer" }}>
                  <input
                    type={g.kickoff === "ready-sample" ? "radio" : "checkbox"}
                    name="rd-recipients"
                    checked={checked}
                    onChange={() => toggleRecipient(c.id)}
                    style={{ accentColor: "var(--accent, #2563eb)" }}
                  />
                  {u && <RD2.Avatar user={u} size="sm" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u?.name || c.id}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.role}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Brief body */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Brief (auto-drafted from niche doc)</span>
            <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "var(--ink-3)" }}>editable</span>
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            style={{ width: "100%", padding: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", lineHeight: 1.55, color: "var(--ink-1)", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => RD2.toast("Saved as draft", "ok")}>Save draft</button>
          <RD2.GatedAction product={p}>
            <button className="btn primary" onClick={send}>
              Send brief →
            </button>
          </RD2.GatedAction>
        </div>
      </div>
    </div>
  );
}

// ===== Header — owner, status, advance CTA =====
function RDHeader({ p, g, onDecide }) {
  const owner = g.ownerId ? RD2.person(g.ownerId) : null;
  const ronel = RD2.person("ronel");
  const totalRounds = g.sampleRounds?.length || 0;
  const lastRound = g.sampleRounds?.[totalRounds - 1];

  return (
    <div className="rd-head">
      <div>
        <div className="rd-head-eyebrow">FORMULATION · SAMPLING</div>
        <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>
          {g.ownerKind === "formulator" ? "Talha is formulating" : "Manufacturer is sampling"}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, fontSize: 12.5, color: "var(--ink-2)", flexWrap: "wrap" }}>
          {owner && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--ink-3)" }}>Owner:</span>
              <RD2.Avatar user={owner} size="sm" /> {owner.name}
            </span>
          )}
          {ronel && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--ink-3)" }}>Coordinated by:</span>
              <RD2.Avatar user={ronel} size="sm" /> {ronel.name}
            </span>
          )}
          {p.manufacturerId && <ManufacturerChip id={p.manufacturerId} />}
        </div>
      </div>
      <div className="rd-head-stats">
        <div className="rd-head-stat">
          <div className="n">{totalRounds}</div><div className="l">Round{totalRounds === 1 ? "" : "s"}</div>
        </div>
        <RDStatusPill status={g.status} lastVerdict={lastRound?.verdict} />
      </div>
      {g.status === "approved" && (
        <ApprovalGate p={p} g={g} onDecide={onDecide} />
      )}
    </div>
  );
}

function ApprovalGate({ p, g, onDecide }) {
  const sign = g.signOff || {};
  const cheskyOk = !!sign.chesky;
  const joelOk = !!sign.joel;
  const bothOk = cheskyOk && joelOk;
  const me = (RD2 && RD2.__currentUser) || "chesky";
  const canSign = me === "chesky" || me === "joel";
  const myKey = me;
  const myDone = !!sign[myKey];

  return (
    <div className="rd-advance-banner" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sample approved — internal sign-off required</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
            Both Chesky and Joel must sign off before advancing to Build.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["chesky", "joel"].map(uid => {
          const u = RD2.person(uid);
          const signed = !!sign[uid];
          const isMine = uid === myKey;
          return (
            <div key={uid} style={{
              flex: "1 1 220px", padding: "10px 12px", borderRadius: 6,
              background: signed ? "var(--ok-soft, oklch(95% 0.05 145))" : "var(--bg)",
              border: `1px solid ${signed ? "var(--ok, oklch(60% 0.15 145))" : "var(--line)"}`,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <RD2.Avatar user={u} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{u?.name}</div>
                <div style={{ fontSize: 11, color: signed ? "var(--ok, oklch(45% 0.15 145))" : "var(--ink-3)" }}>
                  {signed ? `✓ Signed ${sign[uid].atDaysAgo ? RD2.daysAgoLabel(sign[uid].atDaysAgo) : "just now"}` : "Awaiting sign-off"}
                </div>
              </div>
              {!signed && isMine && canSign && (
                <button className="btn sm primary" onClick={() => RD2.toast(`${u?.name} signed off`, "ok")}>Sign</button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <RD2.GatedAction product={p}>
          <button
            className="btn primary"
            disabled={!bothOk}
            style={!bothOk ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            title={bothOk ? "Lock spec and advance to Build" : "Both Chesky and Joel must sign off first"}
            onClick={() => bothOk && RD2.toast("Spec locked → advancing to Build", "ok")}>
            {bothOk ? "Lock spec & advance →" : "Awaiting sign-off"}
          </button>
        </RD2.GatedAction>
      </div>
    </div>
  );
}

function ManufacturerChip({ id }) {
  const m = (PIPELINE_DATA.MANUFACTURERS || []).find(x => x.id === id);
  if (!m) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 99, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11.5 }}>
      <span style={{ color: "var(--ink-3)" }}>Mfg:</span>
      <span style={{ fontWeight: 600 }}>{m.name}</span>
    </span>
  );
}

function RDStatusPill({ status, lastVerdict }) {
  const map = {
    "approved":                 { label: "✓ APPROVED",        tone: "ok" },
    "iterating":                { label: "ITERATING",         tone: "active" },
    "sample-en-route":          { label: "SAMPLE EN ROUTE",   tone: "active" },
    "samples-en-route":         { label: "SAMPLES EN ROUTE",  tone: "active" },
    "samples-shipped-to-talha": { label: "INGREDIENTS SHIPPED", tone: "active" },
    "engaged":                  { label: "MFG ENGAGED",       tone: "active" },
    "not-yet-engaged":          { label: "NOT YET ENGAGED",   tone: "warn" },
    "kickoff":                  { label: "KICKOFF",           tone: "warn" },
    "pds-locked":               { label: "PDS LOCKED",        tone: "active" },
    "cost-pass":                { label: "COST PASS",         tone: "active" },
    "approved-pending-signoff": { label: "PENDING SIGN-OFF",  tone: "warn" },
    "rejected":                 { label: "REJECTED",          tone: "err" },
  };
  const safeStatus = status ?? "kickoff";
  const m = map[safeStatus] || { label: String(safeStatus).toUpperCase(), tone: "active" };
  return <span className={`rd-status-pill tone-${m.tone}`}>{m.label}</span>;
}

// ============================================================
// FORMULATOR-OWNED (Talha) — liquid + powder
// ============================================================
function FormulatorRD({ p, g, setTab }) {
  const ronel = RD2.person("ronel");
  const talha = RD2.person("talha");
  const hasAnyContent = g.flavorRecommended || (g.noiseFormula?.length > 0) || (g.samplesToTalha?.length > 0) || (g.sampleRounds?.length > 0) || g.finalSpecLocked;

  return (
    <>
      {/* Empty state — gate just seeded, Talha hasn't started yet. */}
      {!hasAnyContent && (
        <div className="rd-card">
          <div className="rd-card-h">
            <h3>Briefed — Talha kicking off sampling</h3>
            <span className="meta">no rounds yet</span>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              First step: Talha builds a noise formula (rough blend hypothesis) and tells Ronel which ingredients he needs sample-sized of. Ronel ships them; Talha makes round 1.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
              {[
                { n: 1, label: "Noise formula", body: "Talha drafts the blend hypothesis." },
                { n: 2, label: "Sample sourcing", body: "Ronel ships sample-size ingredients." },
                { n: 3, label: "Round 1 → ∞", body: "Iterate until Talha approves." },
              ].map(s => (
                <div key={s.n} style={{ padding: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>{s.n}. {s.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.body}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", marginTop: 4 }}>
              Demo data — Talha's brief intake + sample-shipment flow live elsewhere in the prototype.
            </div>
          </div>
        </div>
      )}

      {/* Flavor recommendation */}
      {g.flavorRecommended && (
        <div className="rd-card">
          <div className="rd-card-h">
            <h3>Talha's flavor recommendation</h3>
            {g.flavorAlternatives?.length > 0 && (
              <span className="meta">+ {g.flavorAlternatives.length} alts</span>
            )}
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{g.flavorRecommended}</div>
            {g.flavorAlternatives?.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
                Alternatives: {g.flavorAlternatives.join(" · ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Noise-formula: ingredient list with Talha's blend strategy */}
      {g.noiseFormula?.length > 0 && (
        <div className="rd-card">
          <div className="rd-card-h">
            <h3>Talha's blend strategy</h3>
            <span className="meta">{g.noiseFormula.length} ingredients · NOT yet a locked spec</span>
          </div>
          <table className="rd-table">
            <thead><tr><th>Ingredient</th><th>Role</th><th>Talha's placement</th></tr></thead>
            <tbody>
              {g.noiseFormula.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{row.ingredient}</td>
                  <td><span className={`rd-role role-${row.role}`}>{row.role}</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{row.talhaPlacement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sample sourcing — Ronel's view of what Talha has, needs, and where it's coming from */}
      {g.samplesToTalha?.length > 0 && (
        <SampleSourcingCard items={g.samplesToTalha} />
      )}

      {/* Sample rounds — the iteration loop */}
      <SampleRounds product={p} rounds={g.sampleRounds} talha={talha} ronel={ronel} status={g.status} />

      {/* Final spec lock */}
      {g.finalSpecLocked && (
        <div className="rd-locked-banner">
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>FORMULA LOCKED</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              Locked {RD2.daysAgoLabel(g.lockedDaysAgo)} — Talha approved final blend
            </div>
          </div>
          <button className="btn sm" onClick={() => setTab && setTab("spec")}>View spec sheet →</button>
        </div>
      )}
    </>
  );
}

// ============================================================
// MFG-OWNED (Mimi/Connor for capsules)
// ============================================================
function MfgRD({ p, g, setTab, onDecide }) {
  // Capsules / powders / softgels: WE supply raws, even though mfg formulates the cap.
  // Show the same pantry view here — Ronel ships sample-sized bottles to the manufacturer.
  const weSupplyRaws = RD2.ingredientsSourcing(p) === "we-supply";
  const hasAnyContent = g.pdsLocked || (g.mfgEngagement?.length > 0) || (g.samplesToTalha?.length > 0) || (g.sampleRounds?.length > 0);
  return (
    <>
      {/* Empty state — gate just seeded, no PDS lock, no mfgs engaged yet.
          Without this card the tab would show only the header. */}
      {!hasAnyContent && (
        <MfgEmptyKickoff p={p} g={g} onDecide={onDecide} />
      )}

      {/* PDS-locked dose */}
      {g.pdsLocked && (
        <div className="rd-card">
          <div className="rd-card-h">
            <h3>Dose & formula — locked outside system</h3>
            <span className="meta">via Malik + PDS · {RD2.daysAgoLabel(g.pdsLocked.daysAgo)}</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 8 }}>
              For capsules, Malik works with PDS to lock dose math before manufacturer engagement. The result becomes our spec.
            </div>
            {g.proposedFormula && (
              <table className="rd-table" style={{ marginTop: 6 }}>
                <thead><tr><th>Ingredient</th><th>Dose</th></tr></thead>
                <tbody>
                  {g.proposedFormula.map((f, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td className="mono">{f.dose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* PDS locked but no manufacturers engaged yet — surface the next CTA */}
      {g.pdsLocked && !(g.mfgEngagement?.length > 0) && (
        <EngageMfgPrompt p={p} g={g} onDecide={onDecide} />
      )}

      {/* Manufacturer engagement table — Mimi vs Connor head-to-head */}
      {g.mfgEngagement?.length > 0 && (
        <div className="rd-card">
          <div className="rd-card-h">
            <h3>Manufacturer engagement</h3>
            <span className="meta">{g.mfgEngagement.length} candidate{g.mfgEngagement.length === 1 ? "" : "s"} · pick one to advance</span>
          </div>
          <MfgComparison p={p} engagements={g.mfgEngagement} onDecide={onDecide} />
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {g.mfgEngagement.map((eng, i) => <MfgEngagementCard key={i} eng={eng} p={p} onDecide={onDecide} />)}
          </div>
        </div>
      )}

      {/* Sample sourcing pantry — when WE supply raws (capsules/powders, dynamic-we-supply liquid/etc) */}
      {weSupplyRaws && g.samplesToTalha?.length > 0 && (
        <SampleSourcingCard items={g.samplesToTalha} mfgMode mfgName={(PIPELINE_DATA.MANUFACTURERS || []).find(m => m.id === p.manufacturerId)?.name} />
      )}

      {/* Sample rounds (only once they start arriving) */}
      {g.sampleRounds?.length > 0 && (
        <SampleRounds product={p} rounds={g.sampleRounds} mfg status={g.status} />
      )}
    </>
  );
}

function MfgComparison({ p, engagements, onDecide }) {
  // Only show comparison when there's a winner OR 2+ engagements with quotes to actually compare
  const winner = engagements.find(e => e.status === "won");
  const quoting = engagements.filter(e => e.quotePerCap != null);
  if (!winner && quoting.length < 2) return null;

  if (winner) {
    const m = (PIPELINE_DATA.MANUFACTURERS || []).find(x => x.id === winner.mfgId);
    return (
      <div style={{ margin: "0 12px 12px", padding: "10px 14px", background: "var(--ok-soft, oklch(95% 0.05 145))", border: "1px solid var(--ok, oklch(60% 0.15 145))", borderRadius: 6, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>✓</span>
        <div style={{ flex: 1, fontSize: 13 }}>
          <strong>{m?.name || winner.mfgId}</strong> picked as production partner
          {winner.quotePerCap != null && <span style={{ color: "var(--ink-2)", marginLeft: 6 }}>· ${winner.quotePerCap.toFixed(2)}/cap locked</span>}
        </div>
      </div>
    );
  }

  // 2+ quoted — compare side-by-side
  const cheapest = quoting.reduce((min, e) => (e.quotePerCap < min.quotePerCap ? e : min), quoting[0]);
  const fastest = quoting
    .filter(e => e.sampleETADays != null)
    .reduce((min, e) => (!min || e.sampleETADays < min.sampleETADays ? e : min), null);
  return (
    <div style={{ margin: "0 12px 12px", padding: "10px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Head-to-head</div>
      <div style={{ display: "flex", gap: 18, fontSize: 12.5, flexWrap: "wrap" }}>
        <div>💰 <strong>Cheapest:</strong> {nameOf(cheapest)} <span className="mono" style={{ color: "var(--ink-2)" }}>${cheapest.quotePerCap.toFixed(2)}/cap</span></div>
        {fastest && (
          <div>⚡ <strong>Fastest sample:</strong> {nameOf(fastest)} <span className="mono" style={{ color: "var(--ink-2)" }}>{fastest.sampleETADays}d</span></div>
        )}
      </div>
    </div>
  );
}

function nameOf(e) {
  const m = (PIPELINE_DATA.MANUFACTURERS || []).find(x => x.id === e.mfgId);
  return m?.name || e.mfgId;
}

function MfgEngagementCard({ eng, p, onDecide }) {
  const m = (PIPELINE_DATA.MANUFACTURERS || []).find(x => x.id === eng.mfgId);
  const contact = RD2.person(eng.contact);
  const toneByStatus = {
    "sampling":  "active",
    "pushback":  "warn",
    "won":       "ok",
    "lost":      "idle",
    "engaged":   "active",
    "not-yet":   "idle",
  };
  const tone = toneByStatus[eng.status] || "active";
  return (
    <div className={`rd-mfg-card tone-${tone}`}>
      <div className="rd-mfg-head">
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{m?.name || eng.mfgId}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 12, color: "var(--ink-3)" }}>
            {contact && <RD2.Avatar user={contact} size="sm" />}
            <span>{contact?.name}</span>
          </div>
        </div>
        <span className={`rd-mfg-status tone-${tone}`}>{eng.status.toUpperCase()}</span>
      </div>
      <div className="rd-mfg-grid">
        {eng.quotePerCap != null && (
          <div><div className="lbl">Quote</div><div className="v mono">${eng.quotePerCap.toFixed(2)}/cap</div></div>
        )}
        {eng.sampleETADays != null
          ? <div><div className="lbl">Sample ETA</div><div className="v mono">{eng.sampleETADays}d</div></div>
          : <div><div className="lbl">Sample</div><div className="v" style={{ color: "var(--warn)" }}>not committed</div></div>}
      </div>
      {eng.notes && (
        <div className="rd-mfg-notes">"{eng.notes}"</div>
      )}
      {/* Pick-winner CTA — only when this mfg has quoted and isn't already lost/won */}
      {p && eng.quotePerCap != null && !["won", "lost"].includes(eng.status) && (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
          <RD2.GatedAction product={p}>
            <button className="btn sm" onClick={() => RD2.toast(`${m?.name} marked as 'lost'`, "warn")}>Pass on this</button>
          </RD2.GatedAction>
          <RD2.GatedAction product={p}>
            <button className="btn sm primary" onClick={() => RD2.toast(`${m?.name} picked → production partner locked`, "ok")}>Pick {m?.name?.split(" ")[0] || "winner"} →</button>
          </RD2.GatedAction>
        </div>
      )}
      {eng.status === "won" && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--ok, oklch(60% 0.15 145))", fontSize: 11.5, color: "var(--ok, oklch(45% 0.15 145))", fontWeight: 600 }}>
          ✓ Production partner — quote locked
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sample rounds — shared timeline
// ============================================================
function SampleRounds({ product, rounds, talha, ronel, mfg, status }) {
  if (!rounds?.length) {
    const isFreshBrief = status === "not-yet-engaged";
    return (
      <div className="rd-card">
        <div className="rd-card-h">
          <h3>Sample rounds</h3>
          <span className="meta">none yet</span>
        </div>
        {isFreshBrief ? (
          <div style={{ padding: "20px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 14px", background: "oklch(96% 0.04 60)", border: "1px dashed oklch(75% 0.12 60)", borderRadius: 6 }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>📋</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "oklch(35% 0.1 60)" }}>Brief just sent — Talha hasn't started yet</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>
                  {mfg ? "Manufacturer needs raws shipped before they can sample."
                    : "Talha needs sample-sized raws before he can blend round 1. Source them from the pantry below."}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic" }}>
                  Round 1 won't appear here until Talha ships back his first blend.
                </div>
              </div>
            </div>
            <div className="rd-round-skeleton">
              <div className="rd-round-num placeholder">
                <div className="num">1</div>
                <div className="lbl">ROUND</div>
              </div>
              <div className="rd-round-skeleton-body">
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>Awaiting first blend from Talha…</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty" style={{ padding: 20, fontSize: 12 }}>No samples sent yet.</div>
        )}
      </div>
    );
  }
  return (
    <div className="rd-card">
      <div className="rd-card-h">
        <h3>Sample rounds</h3>
        <span className="meta">{rounds.length} round{rounds.length === 1 ? "" : "s"}</span>
      </div>
      <div className="rd-rounds">
        {rounds.map((r, i) => <RoundRow key={i} r={r} product={product} isLatest={i === rounds.length - 1} />)}
      </div>
    </div>
  );
}

function RoundRow({ r, product, isLatest }) {
  const verdictTone = r.verdict === "approved" ? "ok"
                    : r.verdict === "iterate"  ? "warn"
                    : r.verdict === "rejected" ? "err"
                    : "idle";
  const panel = r.tastedByPanel || (r.tastedBy ? [r.tastedBy] : []);
  const perTaster = r.panelFeedback || [];
  const ronel = RD2.person("ronel");

  return (
    <div className={`rd-round verdict-${verdictTone} ${isLatest ? "latest" : ""}`}>
      <div className="rd-round-num">
        <div className="num">{r.round}</div>
        <div className="lbl">ROUND</div>
      </div>
      <div className="rd-round-body">
        <div className="rd-round-head">
          <div>
            {r.flavor && <div style={{ fontSize: 14, fontWeight: 600 }}>{r.flavor}</div>}
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              {r.shippedFromTalha ? `Shipped ${RD2.daysAgoLabel(r.shippedDaysAgo)}` : null}
              {r.receivedDaysAgo != null && r.shippedFromTalha && " · "}
              {r.receivedDaysAgo != null ? `Received ${RD2.daysAgoLabel(r.receivedDaysAgo)}` : (r.shippedFromTalha ? "in transit" : null)}
            </div>
          </div>
          <span className={`rd-round-verdict tone-${verdictTone}`}>
            {r.verdict === "approved" ? "✓ APPROVED"
              : r.verdict === "iterate" ? "↻ ITERATE"
              : r.verdict === "rejected" ? "✕ REJECTED"
              : "⏱ PENDING"}
          </span>
        </div>

        {/* Taste panel — Chesky + Joel only */}
        {panel.length > 0 && (
          <div className="rd-taste-panel">
            <div className="lbl">
              <span>Taste panel</span>
              <span style={{ color: "var(--ink-4)", fontWeight: 400, fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>
                · Chesky + Joel only
              </span>
            </div>
            <div className="taste-grid">
              {perTaster.length > 0 ? perTaster.map((f, i) => {
                const u = RD2.person(f.who);
                if (!u) return null;
                return (
                  <div key={i} className="taste-card">
                    <div className="who">
                      <RD2.Avatar user={u} size="sm" /> {u.name}
                      {f.rating != null && <span className="rating mono">{f.rating}/10</span>}
                    </div>
                    <div className="note">"{f.note}"</div>
                  </div>
                );
              }) : panel.map((id, i) => {
                const u = RD2.person(id);
                return u ? (
                  <div key={i} className="taste-card pending">
                    <div className="who"><RD2.Avatar user={u} size="sm" /> {u.name}</div>
                    <div className="note" style={{ color: "var(--ink-3)" }}>Awaiting feedback…</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {r.verdict === "pending" && isLatest && panel.length === 0 && (
          <div className="rd-taste-cta">
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
              Sample en route. {ronel?.name} hands off to <strong>Chesky</strong> + <strong>Joel</strong> on arrival.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <RD2.GatedAction product={product}>
                <button className="btn sm primary" onClick={() => RD2.toast("Sample marked received", "ok")}>Mark received → notify panel</button>
              </RD2.GatedAction>
            </div>
          </div>
        )}

        {/* Consensus / next-step from feedback */}
        {r.feedback && (
          <div className="rd-round-fb">
            <div className="lbl">Consensus →</div>
            <div className="body">"{r.feedback}"</div>
          </div>
        )}
        {r.talhaResponse && (
          <div className="rd-round-fb response">
            <div className="lbl">Talha response</div>
            <div className="body">"{r.talhaResponse}"</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sample sourcing — Ronel's pantry view of Talha's stock
// ============================================================
const SAMPLE_STATUS_META = {
  "not-yet-sourced":         { label: "Not sourced",       tone: "err",    icon: "○", group: "todo" },
  "talha-needs-more":        { label: "Talha needs more",  tone: "err",    icon: "↻", group: "todo" },
  "requested-from-supplier": { label: "Requested from supplier", tone: "active", icon: "✉", group: "in-flight" },
  "ordered-from-bulk":       { label: "Ordered (BulkSupp/0Box)",  tone: "active", icon: "$", group: "in-flight" },
  "received-by-ronel":       { label: "Received by Ronel", tone: "active", icon: "▣", group: "in-flight" },
  "shipped-to-talha":        { label: "Shipped to Talha",  tone: "active", icon: "→", group: "in-flight" },
  "in-talha-stock":          { label: "In Talha's stock",  tone: "ok",     icon: "✓", group: "ok" },
};

function SampleSourcingCard({ items, mfgMode, mfgName }) {
  const [composeFor, setComposeFor] = React.useState(null);
  const supplierMap = Object.fromEntries((PIPELINE_DATA.INGREDIENT_SUPPLIERS || []).map(s => [s.id, s]));
  const sourceMap   = Object.fromEntries((PIPELINE_DATA.SAMPLE_SOURCES || []).map(s => [s.id, s]));

  // Group items by status group: todo first (Ronel's action items), then in-flight, then ok
  const todo     = items.filter(i => SAMPLE_STATUS_META[i.status]?.group === "todo");
  const inFlight = items.filter(i => SAMPLE_STATUS_META[i.status]?.group === "in-flight");
  const ok       = items.filter(i => SAMPLE_STATUS_META[i.status]?.group === "ok");

  const todoCount = todo.length;
  const inFlightCount = inFlight.length;
  const recipientLabel = mfgMode ? (mfgName || "Manufacturer") : "Talha";

  return (
    <div className="rd-card">
      <div className="rd-card-h">
        <h3>Sample sourcing — {recipientLabel}'s pantry</h3>
        <span className="meta">
          {todoCount > 0 && <span style={{ color: "var(--err)", fontWeight: 600 }}>{todoCount} need{todoCount === 1 ? "s" : ""} action · </span>}
          {inFlightCount} in flight · {ok.length} stocked
        </span>
      </div>
      <div style={{ padding: "10px 12px 4px", fontSize: 11, color: "var(--ink-3)", borderBottom: "1px solid var(--line)", lineHeight: 1.5 }}>
        {mfgMode
          ? <>For capsules, the manufacturer formulates but Ronel still ships sample-sized raws ({recipientLabel} can't easily source 100g qty). {recipientLabel}'s contact pings via email when running low.</>
          : <>Talha needs sample-sized qty (50–500g) to make blends. Ronel asks our regular suppliers first; falls back to BulkSupplements / 0BoxNutra if no sample. Talha pings via WhatsApp / email when running low.</>}
      </div>
      <table className="rd-pantry">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Regular supplier</th>
            <th>Sample from</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Last from Talha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[...todo, ...inFlight, ...ok].map((s, i) => {
            const meta = SAMPLE_STATUS_META[s.status] || { label: s.status, tone: "idle", icon: "·" };
            const sup  = supplierMap[s.regularSupplier];
            const src  = sourceMap[s.sampleSource];
            return (
              <tr key={i} className={`pantry-row group-${meta.group}`}>
                <td style={{ fontWeight: 500 }}>{s.ingredient}</td>
                <td>
                  {sup ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{sup.name}</span>
                      {sup.soleSource && <span className="rd-pantry-pill sole">SOLE</span>}
                    </span>
                  ) : <span style={{ color: "var(--ink-4)" }}>—</span>}
                </td>
                <td>
                  {src ? (
                    <span className={`rd-pantry-source src-${s.sampleSource}`}>{src.name}</span>
                  ) : <span style={{ color: "var(--ink-4)" }}>—</span>}
                </td>
                <td className="mono" style={{ fontSize: 11.5 }}>{s.qtyNeeded || "—"}</td>
                <td>
                  <span className={`rd-pantry-status tone-${meta.tone}`}>
                    <span className="ico">{meta.icon}</span>{meta.label}
                  </span>
                  {s.lastShippedDaysAgo != null && meta.group !== "todo" && (
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 3 }}>
                      shipped {RD2.daysAgoLabel(s.lastShippedDaysAgo)}
                    </div>
                  )}
                </td>
                <td className="rd-pantry-msg">
                  {s.talhaMsg ? <span title={s.talhaMsg}>"{s.talhaMsg.length > 60 ? s.talhaMsg.slice(0, 58) + "…" : s.talhaMsg}"</span>
                    : s.notes ? <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>{s.notes}</span>
                    : <span style={{ color: "var(--ink-4)" }}>—</span>}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {meta.group === "todo" ? <button className="btn sm" style={{ fontSize: 10.5, padding: "2px 8px" }} onClick={() => setComposeFor(s)}>Compose msg</button>
                    : meta.group === "ok" ? <button className="btn sm" style={{ fontSize: 10.5, padding: "2px 8px" }}>Mark low</button>
                    : <button className="btn sm" style={{ fontSize: 10.5, padding: "2px 8px" }} onClick={() => setComposeFor(s)}>Update</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {composeFor && <ComposeMessageModal item={composeFor} supplierMap={supplierMap} onClose={() => setComposeFor(null)} />}
    </div>
  );
}

function ComposeMessageModal({ item, supplierMap, onClose }) {
  const supplier = supplierMap[item.supplierId];
  const ingredient = item.ingredient;
  const isUrgent = item.status === "out" || item.status === "low";
  const defaultBody = supplier
    ? `Hi ${supplier.contact?.split(" ")[0] || "there"},\n\nWe're running ${item.status === "out" ? "out" : "low"} on ${ingredient}. Could you ship a sample-sized qty (${item.sampleQty || "100–250g"}) to our R&D address ASAP?\n\nThanks,\nRonel`
    : `Need to source ${ingredient} (${item.sampleQty || "100–250g"} sample qty) — no current supplier on file. Please advise.`;
  const [body, setBody] = React.useState(defaultBody);

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={e => e.stopPropagation()}>
        <div className="rd-modal-h">
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Compose message {isUrgent && <span style={{ color: "var(--err)", marginLeft: 4 }}>· {item.status.toUpperCase()}</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{ingredient}</div>
          </div>
          <button className="btn sm" onClick={onClose}>✕</button>
        </div>
        <div className="rd-modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12, marginBottom: 12 }}>
            <span style={{ color: "var(--ink-3)" }}>To:</span>
            <span><strong>{supplier?.name || "—"}</strong> {supplier?.contact && <>· {supplier.contact}</>}</span>
            <span style={{ color: "var(--ink-3)" }}>Sample qty:</span>
            <span>{item.sampleQty || "100–250g"}</span>
            <span style={{ color: "var(--ink-3)" }}>Ship to:</span>
            <span>Formulation — Brooklyn warehouse</span>
          </div>
          <textarea className="rd-modal-textarea" value={body} onChange={e => setBody(e.target.value)} rows={9} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn sm" onClick={onClose}>Cancel</button>
            <button className="btn sm primary" onClick={onClose}>Send → mark as requested</button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { RDTab });

// ============================================================
// MFG EMPTY-STATE KICKOFF (live)
//   Shows two real CTAs when an mfg-led product reaches Formulation
//   with nothing seeded yet:
//     1. Lock the PDS  → modal where Malik pastes spec lines + dose-form notes
//     2. Engage manufacturers → modal where the brief is sent to Mimi/Connor
//   Both call __rdLockPDS / __rdEngageMfg and patch rdGate live.
// ============================================================
function MfgEmptyKickoff({ p, g, onDecide }) {
  const [showLock, setShowLock] = useSRD(false);
  const [showEngage, setShowEngage] = useSRD(false);
  const malik = RD2.person("malik");
  const ronel = RD2.person("ronel");
  const pdsLocked = !!g.pdsLocked;
  return (
    <div className="rd-card">
      <div className="rd-card-h">
        <h3>Next steps · pick where to start</h3>
        <span className="meta">{pdsLocked ? "PDS locked · ready to engage mfgs" : "PDS not locked yet"}</span>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
          For mfg-led products, Malik locks the dose math with PDS first, then Ronel sends the locked spec to manufacturers (Mimi at Herbally Yours, Connor at Brand Nutra) for parallel quotes & samples.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
          {/* 1. Lock the PDS */}
          <div style={{ padding: 12, background: pdsLocked ? "var(--ok-soft)" : "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              {pdsLocked && <span style={{ color: "var(--ok)" }}>✓</span>}
              1. Lock the PDS
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8, flex: 1 }}>
              {pdsLocked
                ? `Locked by ${malik?.name} · ${(g.proposedFormula || []).length} ingredients`
                : `${malik?.name} works the dose-form math externally and pastes the locked spec here.`}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <RD2.GatedAction product={p}>
                <button className="btn sm" onClick={() => setShowLock(true)}>
                  {pdsLocked ? "Edit spec" : "Paste locked spec…"}
                </button>
              </RD2.GatedAction>
            </div>
          </div>
          {/* 2. Engage manufacturers */}
          <div style={{ padding: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>2. Engage manufacturers</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8, flex: 1 }}>
              Send the locked brief to Mimi / Connor for quote + capsule sample.
            </div>
            <RD2.GatedAction product={p}>
              <button
                className="btn sm primary"
                disabled={!pdsLocked}
                style={!pdsLocked ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={() => setShowEngage(true)}
              >
                {pdsLocked ? "Send brief…" : "Lock PDS first"}
              </button>
            </RD2.GatedAction>
          </div>
        </div>
      </div>
      {showLock && <LockPdsModal p={p} g={g} onClose={() => setShowLock(false)} onDecide={onDecide} />}
      {showEngage && <EngageMfgModal p={p} g={g} onClose={() => setShowEngage(false)} onDecide={onDecide} />}
    </div>
  );
}

// CTA that appears once PDS is locked but no mfg has been engaged yet.
function EngageMfgPrompt({ p, g, onDecide }) {
  const [showEngage, setShowEngage] = useSRD(false);
  return (
    <div className="rd-card" style={{ background: "var(--accent-bg)", borderColor: "var(--accent)" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", fontWeight: 600, marginBottom: 2 }}>NEXT</div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Spec is locked — engage manufacturers</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>Send the brief to Mimi and/or Connor for parallel quote + capsule sample.</div>
        </div>
        <RD2.GatedAction product={p}>
          <button className="btn sm primary" onClick={() => setShowEngage(true)}>Send brief…</button>
        </RD2.GatedAction>
      </div>
      {showEngage && <EngageMfgModal p={p} g={g} onClose={() => setShowEngage(false)} onDecide={onDecide} />}
    </div>
  );
}

// ----- Modal: paste a locked PDS spec -----
function LockPdsModal({ p, g, onClose, onDecide }) {
  const seeded = (g.proposedFormula || []).map(r => `${r.name}\t${r.dose}`).join("\n");
  const [raw, setRaw] = useSRD(seeded);
  const [notes, setNotes] = useSRD(g.pdsLocked?.notes || "");
  const parsed = useMRD(() => {
    return raw.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      // accept tab, comma, or 2+ spaces as separator
      const m = line.split(/\t|,\s*|\s{2,}|\s+-\s+|\s+:\s+/);
      const name = (m[0] || "").trim();
      const dose = (m.slice(1).join(" ") || "").trim();
      return { name, dose };
    }).filter(r => r.name);
  }, [raw]);
  const save = () => {
    if (parsed.length === 0) { RD2.toast("Paste at least one ingredient row", "warn"); return; }
    onDecide && onDecide("__rdLockPDS", "lock", { ingredients: parsed, doseFormNotes: notes });
    onClose();
  };
  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="rd-modal-h">
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>LOCK PDS · {p.code}</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 16 }}>Paste the locked formula spec</h3>
          </div>
          <button className="btn sm" onClick={onClose}>×</button>
        </div>
        <div className="rd-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="rd-modal-label">Ingredients · one per line · {"name  dose"}  (tab, comma, or 2+ spaces between)</label>
            <textarea
              className="rd-modal-textarea mono"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={9}
              placeholder={"Sea Moss extract\t500mg\nBladderwrack\t200mg\nBurdock root\t150mg"}
              style={{ fontSize: 12.5 }}
            />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
              {parsed.length} row{parsed.length === 1 ? "" : "s"} parsed
            </div>
          </div>
          {parsed.length > 0 && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
              <table className="rd-table">
                <thead><tr><th>Ingredient</th><th>Dose</th></tr></thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i}><td style={{ fontWeight: 500 }}>{r.name}</td><td className="mono">{r.dose || <span style={{ color: "var(--warn)" }}>missing</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <label className="rd-modal-label">Dose-form notes (optional)</label>
            <textarea
              className="rd-modal-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Capsule size 0, vegetable. Bottle 60ct, 30-day supply at 2/day."
            />
          </div>
        </div>
        <div className="rd-modal-foot">
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn sm primary" onClick={save}>Lock spec</button>
        </div>
      </div>
    </div>
  );
}

// ----- Modal: engage manufacturers -----
function EngageMfgModal({ p, g, onClose, onDecide }) {
  const candidates = [
    { id: "mimi", label: "Mimi · Herbally Yours" },
    { id: "connor", label: "Connor · Brand Nutra" },
  ];
  const [picked, setPicked] = useSRD(() => candidates.map(c => c.id));
  const ingredientList = (g.proposedFormula || []).map(f => `  • ${f.name} — ${f.dose}`).join("\n");
  const defaultBody = `Hi —\n\n${p.name} (${p.code}) — locked spec below. Looking for a quote + a capsule sample for our review.\n\n${ingredientList}\n\nTarget: 60ct bottle, 30-day supply. Please confirm sample ETA + per-cap quote.\n\nThanks,\nRonel`;
  const [body, setBody] = useSRD(defaultBody);
  const toggle = (id) => setPicked(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  const send = () => {
    if (picked.length === 0) { RD2.toast("Pick at least one manufacturer", "warn"); return; }
    onDecide && onDecide("__rdEngageMfg", "send", { recipients: picked, body });
    onClose();
  };
  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="rd-modal-h">
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>ENGAGE MFGS · {p.code}</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 16 }}>Send the locked brief</h3>
          </div>
          <button className="btn sm" onClick={onClose}>×</button>
        </div>
        <div className="rd-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="rd-modal-label">Recipients</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {candidates.map(c => {
                const active = picked.includes(c.id);
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: active ? "var(--accent-bg)" : "var(--panel)" }}>
                    <input type="checkbox" checked={active} onChange={() => toggle(c.id)} />
                    <span style={{ fontSize: 13 }}>{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="rd-modal-label">Message body</label>
            <textarea
              className="rd-modal-textarea mono"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={11}
              style={{ fontSize: 12 }}
            />
          </div>
        </div>
        <div className="rd-modal-foot">
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn sm primary" onClick={send}>Send to {picked.length} mfg{picked.length === 1 ? "" : "s"}</button>
        </div>
      </div>
    </div>
  );
}
