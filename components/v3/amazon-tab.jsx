// ============================================================
// amazon-tab.jsx — Amazon-check workstream tab
// ----------------------------------------------------------
// Owner: April. ~12h verdict cycle.
// Soft-list product → read Amazon's automated category response →
// route by verdict (allowed / GMP-required / testing-required / hard-pull).
// ============================================================

const { useState: useAT } = React;

function VerdictCard({ icon, color, title, body, active, faded }) {
  return (
    <div className={`amz-verdict-card ${active ? "active" : ""} ${faded ? "faded" : ""}`} style={{ borderColor: active ? color : undefined }}>
      <div className="amz-verdict-icon" style={{ color }}>{icon}</div>
      <div className="amz-verdict-body">
        <div className="amz-verdict-title" style={{ color: active ? color : undefined }}>{title}</div>
        <div className="amz-verdict-text">{body}</div>
      </div>
      {active && <div className="amz-verdict-pin" style={{ background: color }}>← Current</div>}
    </div>
  );
}

function AmazonCheckTab({ p, currentUser, onDecide }) {
  const s = p.streams?.amazon;
  if (!s) {
    return (
      <div className="empty" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
        Amazon-check kicks off once Build starts.
      </div>
    );
  }
  const u = RD2.person(s.owner);
  const canEdit = RD2.can("amazon.edit", p, currentUser);

  const verdict = s.verdict; // null | "allowed" | "gmp" | "testing" | "hardpull"
  const verdictMeta = {
    allowed:  { icon: "✓", color: "var(--ok)",   label: "Allowed — clean",         line: "No verification required. Production can proceed.", route: "→ Production" },
    gmp:      { icon: "⚠", color: "var(--warn)", label: "Allowed · GMP required",  line: "Mfg must provide GMP cert. Adds a few days; usually no extra cost.", route: "→ Production (after cert lands)" },
    testing:  { icon: "⚠", color: "var(--warn)", label: "Allowed · testing required", line: "Independent lab testing needed. Joel + Chesky decide if added cost is worth it.", route: "→ Pause for cost decision" },
    hardpull: { icon: "🛑", color: "var(--err)", label: "Hard pull — not allowed", line: "Amazon won't list it. Routes to Killed (or escalated to a different channel).", route: "→ Killed" },
  };

  return (
    <div className="amz-tab">
      {/* ---------- HEAD ---------- */}
      <div className="amz-head">
        <div className="amz-head-l">
          <div className="amz-head-eyebrow">AMAZON-CHECK · {p.code}</div>
          <h2 className="amz-head-title">{verdict ? verdictMeta[verdict].label : "Awaiting verdict"}</h2>
          <div className="amz-head-sub">{s.lastNote}</div>
        </div>
        <div className="amz-head-r">
          <div className="amz-head-stat">
            <div className="amz-head-stat-lbl">Lead</div>
            <div className="amz-head-stat-val">
              {u && <RD2.Avatar user={u} size="sm" />} {u?.name || "—"}
            </div>
          </div>
          <div className="amz-head-stat">
            <div className="amz-head-stat-lbl">Soft-listed</div>
            <div className="amz-head-stat-val mono">{s.softListedDaysAgo == null ? "Not yet" : RD2.daysAgoLabel(s.softListedDaysAgo)}</div>
          </div>
          <div className="amz-head-stat">
            <div className="amz-head-stat-lbl">Status</div>
            <div className="amz-head-stat-val mono">{s.pct}% · {s.status}</div>
          </div>
        </div>
      </div>

      {/* ---------- TIMELINE ---------- */}
      <div className="card amz-card">
        <div className="card-h"><h3>How Amazon-check runs</h3><span className="meta">~12h verdict cycle</span></div>
        <div className="amz-steps">
          <div className={`amz-step ${s.softListedDaysAgo != null ? "done" : ""}`}>
            <div className="amz-step-num">01</div>
            <div className="amz-step-body">
              <div className="amz-step-title">Soft-list to test</div>
              <div className="amz-step-text">April lists the product (staged or low-key) to surface Amazon's automated category response.</div>
            </div>
          </div>
          <div className={`amz-step ${verdict ? "done" : s.softListedDaysAgo != null ? "active" : ""}`}>
            <div className="amz-step-num">02</div>
            <div className="amz-step-body">
              <div className="amz-step-title">Read the verdict (within 12h)</div>
              <div className="amz-step-text">One of four outcomes lands and routes the product downstream:</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- ENTRY ACTIONS (April / overseers) ---------- */}
      {canEdit && !verdict && (
        <div className="card amz-card amz-action-card">
          <div className="card-h">
            <h3>{s.softListedDaysAgo == null ? "Step 01 — Soft-list to Amazon" : "Step 02 — Amazon's response"}</h3>
            <span className="meta">You · {RD2.person(currentUser)?.name || currentUser}</span>
          </div>
          {s.softListedDaysAgo == null ? (
            <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 520 }}>
                Stage the listing low-key on Seller Central. Amazon's automated category screener
                will respond within ~12h with one of four verdicts.
              </div>
              <button className="btn primary" onClick={() => onDecide && onDecide("__amazonSoftList")}>
                Mark soft-listed →
              </button>
            </div>
          ) : (
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>
                Soft-listed {RD2.daysAgoLabel(s.softListedDaysAgo)}. Pick the verdict Amazon returned —
                this routes the product downstream.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="amz-verdict-btn ok" onClick={() => onDecide && onDecide("__amazonVerdict", "allowed")}>
                  <span className="amz-verdict-btn-icon">✓</span>
                  <div>
                    <div className="amz-verdict-btn-title">Allowed — clean</div>
                    <div className="amz-verdict-btn-sub">→ Production</div>
                  </div>
                </button>
                <button className="amz-verdict-btn warn" onClick={() => onDecide && onDecide("__amazonVerdict", "gmp")}>
                  <span className="amz-verdict-btn-icon">⚠</span>
                  <div>
                    <div className="amz-verdict-btn-title">Allowed · GMP cert</div>
                    <div className="amz-verdict-btn-sub">→ Production after cert</div>
                  </div>
                </button>
                <button className="amz-verdict-btn warn" onClick={() => onDecide && onDecide("__amazonVerdict", "testing")}>
                  <span className="amz-verdict-btn-icon">⚠</span>
                  <div>
                    <div className="amz-verdict-btn-title">Allowed · testing required</div>
                    <div className="amz-verdict-btn-sub">→ Pause for cost decision</div>
                  </div>
                </button>
                <button className="amz-verdict-btn err" onClick={() => {
                  if (confirm(`Record HARD PULL for ${p.code}?\n\nAmazon won't list it. Product routes to Killed.`)) {
                    onDecide && onDecide("__amazonVerdict", "hardpull");
                  }
                }}>
                  <span className="amz-verdict-btn-icon">🛑</span>
                  <div>
                    <div className="amz-verdict-btn-title">Hard pull — not allowed</div>
                    <div className="amz-verdict-btn-sub">→ Killed</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- VERDICTS (only post-decision — legend showing which outcome landed) ---------- */}
      {verdict && (
      <div className="card amz-card">
        <div className="card-h">
          <h3>Verdict</h3>
          <span className="meta">{verdictMeta[verdict].route}</span>
        </div>
        <div className="amz-verdict-list">
          <VerdictCard icon="✓" color="oklch(58% 0.16 150)" title="Allowed — clean"
            body="No verification required. Production can proceed."
            active={verdict === "allowed"} faded={verdict && verdict !== "allowed"} />
          <VerdictCard icon="⚠" color="oklch(72% 0.15 75)" title="Allowed · GMP cert required"
            body="Mfg must provide GMP cert. Adds a few days; usually no extra cost."
            active={verdict === "gmp"} faded={verdict && verdict !== "gmp"} />
          <VerdictCard icon="⚠" color="oklch(72% 0.15 75)" title="Allowed · product testing required"
            body="Independent lab testing needed. More expensive — Joel + Chesky decide if it's worth it before Production."
            active={verdict === "testing"} faded={verdict && verdict !== "testing"} />
          <VerdictCard icon="🛑" color="oklch(60% 0.18 25)" title="Hard pull — not allowed"
            body="Amazon won't list it. Routes to Killed (or escalated to a different channel)."
            active={verdict === "hardpull"} faded={verdict && verdict !== "hardpull"} />
        </div>
      </div>
      )}

      {/* ---------- GATE NOTE ---------- */}
      <div className="amz-gate-note">
        <span className="amz-gate-pill">Build gate</span>
        ALL FOUR streams complete + Amazon-check ≠ hard pull → product flips to <b>In Production</b>.
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { AmazonCheckTab });
