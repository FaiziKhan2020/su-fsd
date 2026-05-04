/* global React, RD2, PIPELINE_DATA */
const { useState: useSI, useMemo: useMI } = React;

// ===== Idea Inbox =====
function IdeaInbox({ products, onOpen, onPromote, onReject }) {
  const ideas = products.filter(p => p.stage === "idea")
    .sort((a, b) => a.createdDaysAgo - b.createdDaysAgo);
  return (
    <div style={{ padding: 0 }}>
      <div style={{ padding: "16px 20px 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>Idea Inbox</h1>
        <div style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 4 }}>
          {ideas.length} ideas pending review · ~10/wk inflow · 1 in 10 makes it through. Promote what's worth a deep niche analysis.
        </div>
      </div>
      <div>
        {ideas.map(p => {
          const u = RD2.person(p.createdBy);
          return (
            <div key={p.id} className="idea-row">
              <div className="who"><RD2.Avatar user={u} size="sm" /></div>
              <div onClick={() => onOpen(p.id)} style={{ cursor: "pointer", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.code}</span>
                  <RD2.BrandChip b={p.brand} />
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{RD2.type(p.type)?.glyph} {RD2.type(p.type)?.label}</span>
                </div>
                <div className="name" style={{ marginTop: 2 }}>{p.name}</div>
                <div className="syn">{p.synopsis}</div>
                <div className="meta-line">{u?.name} · {RD2.daysAgoLabel(p.createdDaysAgo)}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>
                {p.createdDaysAgo}d in inbox
              </div>
              <div className="actions">
                <button className="btn sm reject" onClick={() => onReject(p.id)}>Reject</button>
                <button className="btn sm promote" onClick={() => onPromote(p.id)}>Promote →</button>
              </div>
            </div>
          );
        })}
        {!ideas.length && <div style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>Inbox zero. Nice.</div>}
      </div>
    </div>
  );
}

// ===== Reject Idea Modal =====
function RejectIdeaModal({ product, onClose, onConfirm }) {
  const [reason, setReason] = useSI("");
  const [category, setCategory] = useSI("market");
  const reasons = [
    { id: "market",     label: "No clear market gap" },
    { id: "sourcing",   label: "Sourcing too risky / costly" },
    { id: "compliance", label: "Compliance / Amazon policy issue" },
    { id: "duplicate",  label: "Duplicate of existing SKU" },
    { id: "timing",     label: "Wrong timing — revisit later" },
    { id: "other",      label: "Other" },
  ];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
        <h2>Reject idea</h2>
        <div className="sub">{product.code} · {product.name}</div>
        <label style={{ marginTop: 14 }}>Reason category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {reasons.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <label>Note (required) — what specifically killed it?</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Search volume flat for 18mo; cortisol-PM angle already saturated by Moon Juice + 4 dupes."
          autoFocus
        />
        <div className="actions">
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button
            className="btn sm reject"
            disabled={!reason.trim()}
            onClick={() => { onConfirm({ category, reason: reason.trim() }); onClose(); }}
          >Reject idea</button>
        </div>
      </div>
    </div>
  );
}

// ===== New Idea Modal =====
function NewIdeaModal({ onClose, onCreate }) {
  const [f, setF] = useSI({ name: "", code: "", brand: "DON", type: "capsule", synopsis: "" });
  const upd = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>New idea</h2>
        <div className="sub">Quick capture from Malik. Lock it down later — names will rebrand to Kata SKU at niche approval.</div>
        <label>Working name</label>
        <input value={f.name} onChange={e => upd("name", e.target.value)} placeholder="Lymphatic Drainage Tea" autoFocus />
        <div className="row">
          <div>
            <label>Internal code</label>
            <input value={f.code} onChange={e => upd("code", e.target.value)} placeholder="DON-LymphTea" />
          </div>
          <div>
            <label>Brand</label>
            <select value={f.brand} onChange={e => upd("brand", e.target.value)}>
              <option>DON</option><option>PN</option>
            </select>
          </div>
        </div>
        <label>Format</label>
        <select value={f.type} onChange={e => upd("type", e.target.value)}>
          {Object.entries(PIPELINE_DATA.TYPES).map(([k, t]) => <option key={k} value={k}>{t.glyph} {t.label}</option>)}
        </select>
        <label>Why? (1-2 lines)</label>
        <textarea value={f.synopsis} onChange={e => upd("synopsis", e.target.value)} placeholder="Search volume signal, gap in market, customer DM, etc." />
        <div className="actions">
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn sm primary" onClick={() => { onCreate(f); onClose(); }} disabled={!f.name}>Create idea</button>
        </div>
      </div>
    </div>
  );
}

// ===== Pipeline Board =====
function Board({ products, onOpen }) {
  const cols = PIPELINE_DATA.STAGES.filter(s => s.id !== "idea");
  return (
    <div style={{ display: "flex", gap: 10, padding: 16, overflowX: "auto", height: "100%" }}>
      {cols.map(col => {
        const items = products.filter(p => p.stage === col.id);
        return (
          <div key={col.id} className="board-col" style={{
            flex: "0 0 286px", display: "flex", flexDirection: "column",
            background: `var(--stage-${col.color})`, borderRadius: 10,
            padding: 10, gap: 8, maxHeight: "100%", overflow: "hidden"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
              <span style={{
                fontSize: 12, fontWeight: 600, letterSpacing: "-0.005em",
                color: `var(--stage-${col.color}-ink)`
              }}>{col.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{items.length}</span>
            </div>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
              {items.map(p => <ProductCard key={p.id} p={p} onOpen={onOpen} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ p, onOpen }) {
  const owner = RD2.person(p.owner);
  const waiting = p.waitingOn && RD2.person(p.waitingOn);
  const minimal = p.stage === "launched" || p.stage === "hold" || p.stage === "killed";

  return (
    <button onClick={() => onOpen(p.id)} className="product-card"
      style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{p.code}</span>
        <RD2.BrandChip b={p.brand} />
        <RD2.HealthDot p={p} />
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-3)" }}>{RD2.daysAgoLabel(p.lastActivity)}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em", marginTop: 4, lineHeight: 1.3 }}>{p.name}</div>

      {/* Cycle-time band — only on in-flight stages */}
      {!minimal && <RD2.CycleBand p={p} />}

      {p.stage === "niche" && p.nicheSubState === "researching" && (
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <span>⏱</span><span>Researching · {p.researchingDaysAgo}d</span>
        </div>
      )}
      {p.stage === "niche" && p.nicheSubState === "parsed" && (
        <div style={{ fontSize: 11, color: "var(--ok)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <span>✓</span><span>Doc parsed · ready to submit</span>
        </div>
      )}
      {p.stage === "approval" && p.approvals && (
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: p.approvals.chesky?.decision === "approve" ? "var(--ok)" : "var(--ink-4)" }}>{p.approvals.chesky?.decision === "approve" ? "✓" : "○"} Chesky</span>
          <span style={{ color: p.approvals.joel?.decision === "approve" ? "var(--ok)" : "var(--ink-4)" }}>{p.approvals.joel?.decision === "approve" ? "✓" : "○"} Joel</span>
        </div>
      )}
      {waiting && p.stage !== "approval" && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 6 }}>⏳ Waiting on {waiting.name}</div>}

      {/* Stream-owner avatars + progress for build/production */}
      {p.streams && (
        <div className="streams streams-v3">
          {["sourcing","design","listing"].map(k => {
            const s = p.streams[k]; if (!s) return null;
            const u = RD2.person(s.owner);
            const tone = s.status === "Approved" || s.status === "Ordered" ? "ok"
                       : s.status === "Backorder" ? "err"
                       : s.status === "Not started" ? "idle" : "active";
            return (
              <div key={k} className={`stream-row-v3 tone-${tone}`}>
                {u ? <RD2.Avatar user={u} size="xs" /> : <span className="av-placeholder"></span>}
                <span className="lbl-v3">{k.charAt(0).toUpperCase()+k.slice(1)}</span>
                <div className="track-v3"><div className="fill-v3" style={{ width: s.pct+"%" }}></div></div>
                <span className="pct-v3 mono">{s.pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {minimal && p.live && (
        <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--ok)" }}>● Live</span>
          <span className="mono" style={{ color: "var(--ink-3)" }}>{p.live.actualRevenue}</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: p.live.actualVerdict.startsWith("BEAT") ? "var(--ok)" : p.live.actualVerdict.startsWith("MISS") ? "var(--err)" : "var(--ink-3)" }}>
            {p.live.actualVerdict.split(" ")[0]}
          </span>
        </div>
      )}

      {owner && !p.streams && !minimal && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, color: "var(--ink-3)" }}>
          <RD2.Avatar user={owner} size="sm" /> {owner.name}
        </div>
      )}
    </button>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { IdeaInbox, NewIdeaModal, RejectIdeaModal, Board, ProductCard });
