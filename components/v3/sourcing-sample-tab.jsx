// ============================================================
// SOURCING & SAMPLE TAB — Formulation/Build stage capsule flow
//
// Real-world flow once niche is approved:
//   • Ronel hits all vendors for quotes immediately (parallel)
//   • Ronel ships sample-sized raws to Mimi for capsule-fit check
//   • Mimi confirms size + fill % — ONE CHECKBOX, not a gate
//   • Ronel keeps quoting; quote winners feed back into spec sheet
//
// We don't wait for Mimi to confirm before purchasing. Sampling is a
// parallel sanity check, not a sequential dependency.
//
// This tab COMBINES the old Sampling (capsule-fit) + Sourcing BOM (quotes).
// Production tab handles the post-pick PO ladder (po-sent → delivered).
// ============================================================

const { useState: useSS, useMemo: useMSS } = React;

// Derive BOM rows from the latest spec sheet formula. Used when product has a
// spec but BOM hasn't been seeded — so ingredients carry over automatically.
function bomFromSpec(p) {
  const ss = p.specSheetV2;
  if (!ss?.versions?.length) return null;
  const latest = ss.versions.find(v => v.v === ss.currentVersion) || ss.versions[ss.versions.length - 1];
  const sections = latest?.formula?.sections || [];
  const rows = [];
  let i = 1;
  // Compute kg-needed from dose × servings/bottle × batch_size, with yield loss applied.
  // Falls back to 0 if dose unparseable. Ronel can override per row if needed.
  const calc = window.CostPassCalc;
  const srv = calc?.servingsPerUnit?.(p) || 30;
  const yieldDec = calc?.resolveYield?.(p) || 1;
  const batchRaw = p.costPass?.assumptions?.batch;
  // Pull just the FIRST number from the batch string. "4,000 bottles (240,000 caps)"
  // must parse to 4000, not 4000240000 — naive non-digit-strip concatenates everything.
  const batch = typeof batchRaw === "number"
    ? batchRaw
    : (() => {
        const m = String(batchRaw || "5000").match(/[\d,]+/);
        return m ? (parseFloat(m[0].replace(/,/g, "")) || 5000) : 5000;
      })();
  sections.forEach(sec => {
    (sec.rows || []).forEach(r => {
      if (!r.name?.trim()) return;
      // Use unit-aware parser so "1500mcg" → 1.5mg, not 1500mg. Without this,
      // micronutrients (B1, B12, biotin, vitamin D) come out 1000× too high.
      const mg = calc?.doseToMg?.(r.dose) ?? 0;
      const kgNeeded = mg > 0 ? (mg * srv * batch) / 1e6 / yieldDec : 0;
      rows.push({
        code: `B${String(i).padStart(2, "0")}`,
        ingredient: r.name,
        spec: r.form || sec.label || "",
        kgNeeded: +kgNeeded.toFixed(2),
        status: "Quoting",
        poStatus: "quoting",
        quotes: [],
        derivedFromSpec: true,
        dose: r.dose,
      });
      i++;
    });
  });
  return rows.length > 0 ? rows : null;
}

function SourcingSampleTab({ p, setTab, onDecide }) {
  const g = p.rdGate || {};
  const fit = g.capsuleFitConfirmation || null;
  const winner = (g.mfgEngagement || []).find(e => e.status === "won");
  const mfg = winner && (PIPELINE_DATA.MANUFACTURERS || []).find(m => m.id === winner.mfgId);
  const mfgName = mfg?.name || "Manufacturer";
  const mfgContact = winner ? RD2.person(winner.contact) : RD2.person("mimi");

  // If BOM is missing, derive a working one from the spec sheet so ingredients
  // carry over. This keeps the spec sheet as source of truth: edit there, see
  // it reflected here. If a real BOM exists, we use that (it has quotes etc).
  const derived = useMSS(() => bomFromSpec(p), [p.specSheetV2]);
  const bomToShow = (p.bom && p.bom.length > 0) ? p.bom : derived;
  const usingDerived = bomToShow === derived && bomToShow != null;
  // Inject derived BOM into a shadow product so SourcingTab's BOM section renders.
  const productForSourcing = usingDerived ? { ...p, bom: bomToShow } : p;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 980 }}>

      {/* ---------- Capsule-fit checkmark row ---------- */}
      <CapsuleFitRow p={p} fit={fit} mfgName={mfgName} mfgContact={mfgContact} onDecide={onDecide} />

      {/* ---------- Carry-over banner ---------- */}
      {usingDerived && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: "var(--bg-2)",
          border: "1px dashed var(--line)",
          borderRadius: 8,
          fontSize: 12.5, color: "var(--ink-2)",
        }}>
          <span style={{ color: "var(--ink-3)" }}>↘</span>
          <span><strong style={{ color: "var(--ink-1)" }}>{bomToShow.length} ingredients</strong> pulled from Spec sheet v{p.specSheetV2?.currentVersion}. Quote winners and PO state save here; the spec stays the source of truth.</span>
          <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => setTab && setTab("spec")}>Open Spec sheet →</button>
        </div>
      )}

      {/* ---------- Quote tracker (reuses BOM rendering from SourcingTab) ---------- */}
      {bomToShow
        ? <RD2.SourcingTab p={productForSourcing} setTab={setTab} onDecide={onDecide} />
        : <NoBomYet p={p} setTab={setTab} />}
    </div>
  );
}

// ============================================================
// Capsule-fit row — slim, non-gating, single line of state.
// States:
//   • not-shipped   → "Ship samples to {mfg}" CTA
//   • shipped       → "Awaiting {mfg}'s capsule-fit check"
//   • confirmed     → "✓ {mfg} confirmed: 88% fill, size 0E, 2/serving"
//   • flagged       → "⚠ {mfg} flagged: dose too high for 0E, recommend 00"
// ============================================================
function CapsuleFitRow({ p, fit, mfgName, mfgContact, onDecide }) {
  const ship = p.rdGate?.sampleShipment;
  const state = fit?.confirmed ? "confirmed"
    : fit?.flagged ? "flagged"
    : ship?.shippedAt ? "shipped"
    : "not-shipped";

  const palette = {
    "confirmed":    { bg: "var(--ok-soft)",  fg: "var(--ok)",  border: "var(--ok)",  icon: "✓" },
    "flagged":      { bg: "var(--warn-soft)", fg: "var(--warn)", border: "var(--warn)", icon: "⚠" },
    "shipped":      { bg: "var(--bg-2)", fg: "var(--ink-2)", border: "var(--line)", icon: "◐" },
    "not-shipped":  { bg: "var(--bg-2)", fg: "var(--ink-3)", border: "var(--line)", icon: "○" },
  }[state];

  const message = {
    "confirmed":    `${mfgName} confirmed: ${fit?.fillPct ?? 88}% fill, size ${fit?.size || "0E"}, ${fit?.capsulesPerServing || 2}/serving`,
    "flagged":      `${mfgName} flagged: ${fit?.note || "dose may not fit target capsule size"}`,
    "shipped":      `Samples in transit to ${mfgName} — awaiting capsule-fit check`,
    "not-shipped":  `Ship sample-sized raws to ${mfgName} to verify capsule fit`,
  }[state];

  const subtle = state === "confirmed" || state === "flagged"
    ? `${RD2.daysAgoLabel(fit?.daysAgo ?? 1)} · non-gating, runs parallel to quoting below`
    : "Non-gating — quoting below proceeds in parallel";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto auto",
      alignItems: "center",
      gap: 14,
      padding: "12px 16px",
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: state === "confirmed" ? "var(--ok)" : "var(--bg-1)",
        color: state === "confirmed" ? "white" : palette.fg,
        fontSize: 16, fontWeight: 700,
        border: `1px solid ${palette.border}`,
      }}>{palette.icon}</div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>
          CAPSULE FIT · {mfgName.toUpperCase()}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)", marginTop: 2 }}>
          {message}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, fontStyle: "italic" }}>
          {subtle}
        </div>
      </div>

      {mfgContact && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)" }}>
          <RD2.Avatar user={mfgContact} size="sm" />
          <span>{mfgContact.name?.split(" ")[0]}</span>
        </div>
      )}

      {state === "not-shipped" && (
        <RD2.GatedAction product={p}>
          <button className="btn sm primary" onClick={() => RD2.toast(`Sample shipment scheduled to ${mfgName}`, "ok")}>
            Ship samples →
          </button>
        </RD2.GatedAction>
      )}
      {state === "shipped" && (
        <button className="btn sm" onClick={() => {
          if (onDecide) onDecide("__rdConfirmFit", "confirm", {});
          RD2.toast(`${mfgName} marked capsule fit confirmed`, "ok");
        }}>
          Mark confirmed
        </button>
      )}
      {state === "confirmed" && (
        <span style={{ fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>LOCKED</span>
      )}
      {state === "flagged" && (
        <button className="btn sm" onClick={() => RD2.toast("Spec sheet opened for revision", "info")}>
          Revise spec
        </button>
      )}
    </div>
  );
}

function NoBomYet({ p, setTab }) {
  return (
    <div style={{ padding: "24px 18px", background: "var(--bg-2)", border: "1px dashed var(--line)", borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>
        No BOM seeded yet. Once Malik attaches a spec sheet, ingredients seed here automatically and Ronel can start quoting.
      </div>
      <button className="btn sm primary" onClick={() => setTab && setTab("spec")}>
        Open Spec sheet →
      </button>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { SourcingSampleTab });
window.__bomFromSpec = bomFromSpec;
