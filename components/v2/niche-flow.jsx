/* global React, RD2, PIPELINE_DATA */
const { useState: useSN, useEffect: useEN } = React;

// ===== Upload + AI Parse Modal =====
// Stages: idle → uploading → parsing → done
function NicheUploadModal({ productId, onClose, onComplete }) {
  const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === productId);
  const [phase, setPhase] = useSN("idle");
  const [url, setUrl] = useSN("");
  const [parsed, setParsed] = useSN(null);

  const handleUpload = () => {
    if (!url.trim()) return;
    setPhase("uploading");
    setTimeout(() => {
      setPhase("parsing");
      setTimeout(() => {
        // Use the existing PN-HairCalm parsed data as the demo "parsed result"
        const demoCurrent = PIPELINE_DATA.PRODUCTS.find(x => x.id === "N-201")?.niche?.current;
        setParsed(demoCurrent);
        setPhase("done");
      }, 2200);
    }, 900);
  };

  const accept = () => {
    onComplete({ url, parsed });
    onClose();
  };

  const sections = [
    { key: "overview",        label: "Niche Overview",       found: "Concept · Format · Signal · Market data" },
    { key: "competitors",     label: "Competitor Analysis",  found: "4 ASINs with sales/rev/ratings" },
    { key: "differentiation", label: "Differentiation",      found: "Angle + white space identified" },
    { key: "formula",         label: "Proposed Formula",     found: "7 ingredients with doses + rationale" },
    { key: "packaging",       label: "Packaging Direction",  found: "Bottle + insert spec" },
    { key: "verdict",         label: "Verdict",              found: "PROCEED — rationale captured" },
  ];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
        <h2>Upload niche analysis</h2>
        <div className="sub">
          {p.code} · {p.name}<br/>
          Drop the Google Doc URL. AI parses it into the structured 6-section view. You can't move to Niche Review without a parsed doc.
        </div>

        {phase === "idle" && (
          <>
            <label>Google Doc URL or upload file</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="docs.google.com/d/..." autoFocus />
            <div style={{ marginTop: 10, padding: 10, background: "var(--bg-2)", borderRadius: 6, fontSize: 12, color: "var(--ink-3)", border: "1px dashed var(--line-2)" }}>
              <span style={{ marginRight: 6 }}>📎</span>or drag & drop a PDF/XLSX here
            </div>
            <div className="actions">
              <button className="btn sm" onClick={onClose}>Cancel</button>
              <button className="btn sm primary" onClick={handleUpload} disabled={!url.trim()}>Upload & Parse →</button>
            </div>
          </>
        )}

        {phase === "uploading" && (
          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 14px" }}></div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Uploading…</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{url.slice(0, 50)}…</div>
          </div>
        )}

        {phase === "parsing" && (
          <div style={{ padding: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="spinner sm"></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>AI is parsing your doc</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Extracting sections, tables, and structured data…</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sections.map((s, i) => (
                <div key={s.key} className="parse-row" style={{ animationDelay: (i * 280) + "ms" }}>
                  <span className="check">✓</span>
                  <span className="lbl">{s.label}</span>
                  <span className="found">{s.found}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div style={{ padding: "10px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--ok-bg)", borderRadius: 8, border: "1px solid var(--ok)", marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ok)" }}>Doc parsed successfully</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>6 sections, 4 competitors, 7 formula lines extracted</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>Preview — switch to the Niche tab to review the full structured doc.</div>
            <div style={{ background: "var(--bg-2)", padding: 10, borderRadius: 6, fontSize: 12.5, lineHeight: 1.5, maxHeight: 140, overflow: "auto" }}>
              <strong>{parsed?.overview?.productName}</strong><br/>
              <span style={{ color: "var(--ink-2)" }}>{parsed?.overview?.concept}</span><br/>
              <span style={{ marginTop: 6, display: "inline-block", padding: "1px 6px", background: "var(--ok)", color: "white", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>{parsed?.verdict?.recommendation}</span>
            </div>
            <div className="actions">
              <button className="btn sm" onClick={onClose}>Save as draft</button>
              <button className="btn sm primary" onClick={accept}>Submit to Niche Review →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Dual approval card (shown in Overview when stage === approval) =====
function DualApproval({ p, onDecide }) {
  const [showReason, setShowReason] = useSN(null); // 'approve' | 'reject' | null
  const [note, setNote] = useSN("");
  const me = "chesky"; // viewing as Chesky
  const ap = p.approvals || { chesky: null, joel: null };

  const submit = (who, decision) => {
    onDecide(who, decision, note);
    setShowReason(null);
    setNote("");
  };

  const Slot = ({ who, label, role }) => {
    const u = RD2.person(who);
    const dec = ap[who];
    const isMe = who === me;
    return (
      <div className={`approval-slot ${dec ? "decided " + dec.decision : "pending"} ${isMe ? "me" : ""}`}>
        <div className="approval-head">
          <RD2.Avatar user={u} size="sm" />
          <div>
            <div className="name">{u.name}</div>
            <div className="role">{role}</div>
          </div>
          {dec && <span className={`approval-pill ${dec.decision}`}>{dec.decision === "approve" ? "✓ Approved" : "✕ Rejected"}</span>}
          {!dec && <span className="approval-pill pending">Pending</span>}
        </div>
        {dec && (
          <div className="approval-note">
            <span className="when">{RD2.daysAgoLabel(dec.at)}</span>
            {dec.note && <span className="text">"{dec.note}"</span>}
          </div>
        )}
        {!dec && isMe && showReason !== who && (
          <div className="approval-actions">
            <button className="btn sm reject" onClick={() => setShowReason(who + ":reject")}>Reject</button>
            <button className="btn sm" onClick={() => setShowReason(who + ":changes")}>Request changes</button>
            <button className="btn sm promote" onClick={() => submit(who, "approve")}>Approve</button>
          </div>
        )}
        {!dec && !isMe && <div className="approval-note muted">Waiting on {u.name}…</div>}
        {showReason?.startsWith(who) && (
          <div style={{ marginTop: 10 }}>
            <textarea autoFocus value={note} onChange={e => setNote(e.target.value)}
              placeholder={showReason.endsWith("reject") ? "Why are you rejecting?" : "What needs to change?"}
              style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 12.5, background: "var(--panel)", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn sm" onClick={() => { setShowReason(null); setNote(""); }}>Cancel</button>
              <button className="btn sm reject" onClick={() => submit(who, showReason.endsWith("reject") ? "reject" : "changes")}>Submit</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const bothApproved = ap.chesky?.decision === "approve" && ap.joel?.decision === "approve";

  return (
    <div className="card approval-card">
      <div className="card-h">
        <h3>Niche Review · Dual approval required</h3>
        <span className="meta">Both Chesky and Joel must approve before Build</span>
      </div>
      <div className="approval-grid">
        <Slot who="chesky" label="Approve" role="Overseer · go/no-go" />
        <Slot who="joel"   label="Approve" role="Finance · margin & cost" />
      </div>
      {bothApproved && (
        <div className="approval-promote">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Both approved ✓</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Promoting kicks off all three streams: Sourcing → Ronel, Design → Esty, Listing → April</div>
          </div>
          <button className="btn sm primary" onClick={() => onDecide("__promote", "build")}>Promote to Build →</button>
        </div>
      )}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { NicheUploadModal, DualApproval });
