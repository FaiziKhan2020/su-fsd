/* global React, RD2, PIPELINE_DATA */
const { useState: useSN, useEffect: useEN, useRef: useRN } = React;

// =============================================================================
// NICHE PARSING — REAL CLAUDE FLOW
// =============================================================================
// Production note: in this prototype we parse pasted doc text + dropped image
// screenshots using window.claude.complete (vision-enabled). In production the
// flow is the same shape but the inputs come from the Google Docs API instead
// of clipboard / drag-drop. See DEV-NOTES.md (root) for the production wiring.
// =============================================================================

const NICHE_SCHEMA_DESCRIPTION = `
Return ONLY a JSON object with this exact shape (no prose, no markdown fences):
{
  "overview": {
    "productName": string,
    "concept": string,                    // 1-2 sentence pitch
    "format": string,                     // e.g. "Capsule, 60ct, 30-day supply"
    "signal": string,                     // why this niche, what surfaced it
    "market": {
      "sv": string,                       // search volume, e.g. "186K/mo"
      "revenue": string,                  // top-30 monthly revenue
      "trend": string,                    // YoY % or direction
      "cvr": string,                      // category CVR
      "dominantFormat": string,           // capsule | gummy | liquid | powder
      "tiktok": string                    // hashtag views or "—"
    }
  },
  "competitors": [                        // 3-6 rows
    { "asin": string, "brand": string, "title": string, "price": string,
      "sales": string, "revenue": string, "rating": number, "reviews": number,
      "strength": string }
  ],
  "differentiation": { "angle": string, "whitespace": string },
  "formula": [                            // ingredient rows
    { "ingredient": string, "dose": string, "rationale": string }
  ],
  "packagingDirection": string,
  "verdict": {
    "recommendation": "PROCEED" | "HOLD" | "PASS",
    "rationale": string
  }
}
If a field is genuinely absent in the source, use "—" for strings, [] for arrays,
0 for numbers. Do NOT invent data.`;

async function callClaudeParse(docText) {
  if (!window.claude?.complete) throw new Error("Claude not available in this environment.");
  const prompt = `You are parsing a niche-research Google Doc into a structured product record.
${NICHE_SCHEMA_DESCRIPTION}

SOURCE DOC:
"""
${docText}
"""

Output the JSON object only.`;
  const raw = await window.claude.complete(prompt);
  // Strip code fences if Claude wraps the JSON
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to find the first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Claude returned non-JSON: " + raw.slice(0, 200));
  }
}

async function callClaudeVision(imageDataUrl, sectionHint) {
  // In this prototype window.claude.complete is text-only; we describe the image
  // path-style to keep the prototype honest. Production: pass the image as a
  // content block to the vision model. See DEV-NOTES.md.
  if (!window.claude?.complete) return { extracted: {}, caption: "(vision unavailable)" };
  const prompt = `A screenshot was attached under section "${sectionHint}" of a niche-research doc.
Common screenshot types: Helium 10 search-volume chart, Amazon competitor listing, TikTok hashtag stats, Reddit thread.
For this image, return ONLY this JSON shape:
{
  "kind": "helium10" | "amazon-listing" | "tiktok" | "reddit" | "other",
  "caption": string,                          // 1-line description for the user
  "extracted": object                          // structured values lifted from the image
}
If you cannot read the image (vision not available in this run), return:
{"kind":"other","caption":"Screenshot attached — vision parse pending","extracted":{}}`;
  try {
    const raw = await window.claude.complete(prompt);
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const m = cleaned.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { kind: "other", caption: "Screenshot attached", extracted: {} };
  } catch {
    return { kind: "other", caption: "Screenshot attached", extracted: {} };
  }
}

// =============================================================================
// Upload + AI Parse Modal — real text + image flow
// =============================================================================
function NicheUploadModal({ productId, onClose, onComplete }) {
  const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === productId);
  const [phase, setPhase] = useSN("idle");      // idle | parsing | done | error
  const [url, setUrl] = useSN("");
  const [docText, setDocText] = useSN("");
  const [images, setImages] = useSN([]);         // [{ id, dataUrl, section, status, evidence }]
  const [parsed, setParsed] = useSN(null);
  const [errMsg, setErrMsg] = useSN("");
  const fileRef = useRN(null);

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
    arr.forEach(f => {
      const r = new FileReader();
      r.onload = e => {
        const id = "img-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        setImages(prev => [...prev, { id, dataUrl: e.target.result, section: "overview", status: "pending", evidence: null, name: f.name }]);
      };
      r.readAsDataURL(f);
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (id) => setImages(prev => prev.filter(i => i.id !== id));
  const setSection = (id, section) => setImages(prev => prev.map(i => i.id === id ? { ...i, section } : i));

  const handleParse = async () => {
    if (!docText.trim() && images.length === 0) {
      setErrMsg("Paste the doc text or drop a screenshot first.");
      return;
    }
    setErrMsg("");
    setPhase("parsing");
    try {
      // 1) Parse text → structured JSON
      let next;
      if (docText.trim()) {
        next = await callClaudeParse(docText);
      } else {
        // Image-only: seed an empty skeleton, let vision fill it
        next = {
          overview: { productName: p.name, concept: "—", format: "—", signal: "—",
            market: { sv: "—", revenue: "—", trend: "—", cvr: "—", dominantFormat: "—", tiktok: "—" } },
          competitors: [], differentiation: { angle: "—", whitespace: "—" },
          formula: [], packagingDirection: "—",
          verdict: { recommendation: "HOLD", rationale: "Awaiting evidence" }
        };
      }

      // 2) Parse each image with vision (per section), attach as evidence
      const evidenceBySection = {};
      for (const img of images) {
        const v = await callClaudeVision(img.dataUrl, img.section);
        const ev = { id: img.id, dataUrl: img.dataUrl, kind: v.kind, caption: v.caption, extracted: v.extracted };
        evidenceBySection[img.section] = evidenceBySection[img.section] || [];
        evidenceBySection[img.section].push(ev);
      }
      next.evidence = evidenceBySection;

      setParsed(next);
      setPhase("done");
    } catch (e) {
      console.error(e);
      setErrMsg(e.message || "Parse failed.");
      setPhase("error");
    }
  };

  const accept = () => {
    onComplete({ url, parsed, autoSubmit: true });
    onClose();
  };

  const SECTIONS = [
    { key: "overview", label: "Overview / Market" },
    { key: "competitors", label: "Competitors" },
    { key: "differentiation", label: "Differentiation" },
    { key: "formula", label: "Formula" },
    { key: "packaging", label: "Packaging" },
  ];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640, maxHeight: "90vh", overflow: "auto" }}>
        <h2>Upload niche analysis</h2>
        <div className="sub">
          {p.code} · {p.name}<br/>
          Paste the doc text and/or drop screenshots. Claude parses both into the structured 6-section view.
        </div>

        {phase === "idle" && (
          <>
            <label style={{ marginTop: 14 }}>Google Doc URL <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(reference only)</span></label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="docs.google.com/d/..." />

            <label style={{ marginTop: 12 }}>Paste doc text</label>
            <textarea value={docText} onChange={e => setDocText(e.target.value)}
              placeholder="Paste the full body of Malik's niche doc here. AI extracts overview, competitors, formula, verdict — everything."
              style={{ width: "100%", minHeight: 140, padding: 10, border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 12.5, background: "var(--panel)", resize: "vertical" }} />

            <label style={{ marginTop: 12 }}>Screenshots <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(Helium 10, competitor listings, TikTok stats — vision-parsed)</span></label>
            <div onDrop={onDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{ padding: 16, background: "var(--bg-2)", borderRadius: 6, fontSize: 12, color: "var(--ink-3)", border: "1px dashed var(--line-2)", textAlign: "center", cursor: "pointer" }}>
              📎 Drag & drop images here, or click to pick. {images.length > 0 && <strong>{images.length} attached</strong>}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }}
              onChange={e => handleFiles(e.target.files)} />

            {images.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {images.map(img => (
                  <div key={img.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line)" }}>
                    <img src={img.dataUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                      <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{img.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Attach to:&nbsp;
                        <select value={img.section} onChange={e => setSection(img.id, e.target.value)}
                          style={{ font: "inherit", fontSize: 11, padding: "1px 4px" }}>
                          {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button className="btn xs" onClick={() => removeImage(img.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {errMsg && <div style={{ marginTop: 10, padding: 8, background: "var(--err-bg, #fde7e7)", border: "1px solid var(--err, #c44)", borderRadius: 6, fontSize: 12, color: "var(--err, #c44)" }}>{errMsg}</div>}

            <div className="actions">
              <button className="btn sm" onClick={onClose}>Cancel</button>
              <button className="btn sm primary" onClick={handleParse} disabled={!docText.trim() && images.length === 0}>
                Parse with Claude →
              </button>
            </div>
          </>
        )}

        {phase === "parsing" && (
          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 14px" }}></div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Claude is parsing…</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>
              {docText.trim() ? "Extracting 6 sections from doc text" : "Waiting on text"}
              {images.length > 0 && ` · ${images.length} screenshot${images.length > 1 ? "s" : ""} via vision`}
            </div>
          </div>
        )}

        {phase === "error" && (
          <div style={{ padding: 14 }}>
            <div style={{ padding: 12, background: "var(--err-bg, #fde7e7)", border: "1px solid var(--err, #c44)", borderRadius: 6, fontSize: 12.5, color: "var(--err, #c44)" }}>
              <strong>Parse failed.</strong><br/>{errMsg}
            </div>
            <div className="actions">
              <button className="btn sm" onClick={onClose}>Cancel</button>
              <button className="btn sm" onClick={() => setPhase("idle")}>Try again</button>
            </div>
          </div>
        )}

        {phase === "done" && parsed && (
          <div style={{ padding: "10px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--ok-bg)", borderRadius: 8, border: "1px solid var(--ok)", marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ok)" }}>Doc parsed by Claude</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                  {parsed.competitors?.length || 0} competitors · {parsed.formula?.length || 0} formula rows
                  {images.length > 0 && ` · ${images.length} screenshot${images.length > 1 ? "s" : ""} attached as evidence`}
                </div>
              </div>
            </div>
            <div style={{ background: "var(--bg-2)", padding: 10, borderRadius: 6, fontSize: 12.5, lineHeight: 1.5, maxHeight: 200, overflow: "auto" }}>
              <strong>{parsed.overview?.productName}</strong><br/>
              <span style={{ color: "var(--ink-2)" }}>{parsed.overview?.concept}</span><br/>
              <span style={{ marginTop: 6, display: "inline-block", padding: "1px 6px", background: "var(--ok)", color: "white", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>{parsed.verdict?.recommendation}</span>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ink-3)" }}>You'll be able to edit any field on the Niche tab before approval.</div>
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

// =============================================================================
// DualApproval — unchanged from prior; keeps Open-source-doc button
// =============================================================================
function DualApproval({ p, onDecide, currentUser }) {
  const [showReason, setShowReason] = useSN(null);
  const [note, setNote] = useSN("");
  const [flagOpen, setFlagOpen] = useSN(false);
  const [flagText, setFlagText] = useSN("");
  const me = currentUser || "chesky";
  const ap = p.approvals || { chesky: null };
  const dec = ap.chesky;
  const chesky = RD2.person("chesky");
  const isCheskyMe = me === "chesky";

  const submit = (decision) => {
    onDecide("chesky", decision, note);
    setShowReason(null);
    setNote("");
  };

  const malikAdvisory = p.malikAdvisory || {
    lean: "proceed",
    note: "Niche checks out. Format gap is real, formula is buildable. My main concern is the BulkSupp magnesium spec — push for the Albion brand if margin allows.",
  };
  const malik = RD2.person("malik");

  const joelFlag = p.joelCostFlag || null;
  const joel = RD2.person("joel");
  const isJoelMe = me === "joel";

  const submitFlag = () => {
    if (!flagText.trim()) return;
    onDecide("__joelCostFlag", "set", flagText.trim());
    setFlagOpen(false);
    setFlagText("");
  };
  const clearFlag = () => onDecide("__joelCostFlag", "clear", "");

  return (
    <div className="card approval-card">
      <div className="card-h">
        <h3>Niche Review · Chesky decides go/no-go</h3>
        <span className="meta">Strategy gate. Real cost pass runs at Formulation, after PDS lock.</span>
        {(p.niche?.docUrl || p.docUrl) && (
          <a
            href={p.niche?.docUrl || p.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn sm"
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none", color: "var(--ink-1)", background: "var(--bg-2)", border: "1px solid var(--line)", padding: "5px 10px", borderRadius: 6 }}
            title={p.niche?.docUrl || p.docUrl}
          >
            <span style={{ fontSize: 13 }}>📄</span>
            <span>Open source doc</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>↗</span>
          </a>
        )}
      </div>

      <div className={`approval-slot ${dec ? "decided " + dec.decision : "pending"} ${isCheskyMe ? "me" : ""}`}>
        <div className="approval-head">
          <RD2.Avatar user={chesky} size="sm" />
          <div>
            <div className="name">{chesky.name}</div>
            <div className="role">Overseer · niche go/no-go</div>
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
        {!dec && isCheskyMe && !showReason && (
          <div className="approval-actions">
            <button className="btn sm reject" onClick={() => setShowReason("reject")}>Reject</button>
            <button className="btn sm" onClick={() => setShowReason("changes")}>Send back to niche</button>
            <button className="btn sm promote" onClick={() => submit("approve")}>Approve →</button>
          </div>
        )}
        {!dec && !isCheskyMe && <div className="approval-note muted">Waiting on {chesky.name}…</div>}
        {showReason && (
          <div style={{ marginTop: 10 }}>
            <textarea autoFocus value={note} onChange={e => setNote(e.target.value)}
              placeholder={showReason === "reject" ? "Why are you rejecting?" : "What needs to change in the niche analysis? (Malik will see this)"}
              style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 12.5, background: "var(--panel)", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6, alignItems: "center" }}>
              {showReason === "changes" && !note.trim() && (
                <span style={{ fontSize: 11, color: "var(--ink-3)", marginRight: "auto" }}>Reason required</span>
              )}
              <button className="btn sm" onClick={() => { setShowReason(null); setNote(""); }}>Cancel</button>
              <button className="btn sm reject"
                disabled={showReason === "changes" && !note.trim()}
                onClick={() => submit(showReason === "reject" ? "reject" : "changes")}>
                {showReason === "changes" ? "Send back to Malik" : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="malik-advisory">
        <div className="malik-advisory-head">
          <RD2.Avatar user={malik} size="sm" />
          <div>
            <div className="malik-advisory-name">{malik?.name} · Formulation Lead</div>
            <div className="malik-advisory-role">Advisory · doesn't block; informs Chesky</div>
          </div>
          <span className={`malik-advisory-lean lean-${malikAdvisory.lean}`}>
            {malikAdvisory.lean === "proceed" ? "Lean: proceed" : malikAdvisory.lean === "concern" ? "Lean: concern" : "Lean: cautious"}
          </span>
        </div>
        <div className="malik-advisory-note">"{malikAdvisory.note}"</div>
      </div>

      <div className="malik-advisory" style={{ marginTop: 10 }}>
        <div className="malik-advisory-head">
          <RD2.Avatar user={joel} size="sm" />
          <div>
            <div className="malik-advisory-name">{joel?.name} · Finance</div>
            <div className="malik-advisory-role">Advisory · flag costly raws early; real cost pass runs at Formulation</div>
          </div>
          {joelFlag
            ? <span className="malik-advisory-lean lean-concern">🚩 Cost flag</span>
            : <span className="malik-advisory-lean lean-proceed">No flag</span>}
        </div>
        {joelFlag && (
          <div className="malik-advisory-note" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ flex: 1 }}>"{joelFlag.note}"</span>
            {isJoelMe && <button className="btn sm" onClick={clearFlag}>Clear</button>}
          </div>
        )}
        {!joelFlag && isJoelMe && !flagOpen && (
          <div style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => setFlagOpen(true)}>🚩 Add cost flag</button>
          </div>
        )}
        {flagOpen && (
          <div style={{ marginTop: 8 }}>
            <textarea autoFocus value={flagText} onChange={e => setFlagText(e.target.value)}
              placeholder="What worries you about cost? e.g. 'Saffron > $8/kg makes this tight on margin'"
              style={{ width: "100%", minHeight: 56, padding: 8, border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 12.5, background: "var(--panel)", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn sm" onClick={() => { setFlagOpen(false); setFlagText(""); }}>Cancel</button>
              <button className="btn sm primary" disabled={!flagText.trim()} onClick={submitFlag}>Post flag</button>
            </div>
          </div>
        )}
      </div>

      {dec?.decision === "approve" && (
        <div className="approval-promote">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Approved ✓</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
              Hands off to Malik for Formulation. He'll build the PDS, Joel runs the real cost pass against the locked PDS, and only then do mfgs get briefed.
            </div>
          </div>
          <RD2.GatedAction product={p}>
            <button className="btn sm primary" onClick={() => onDecide("__promote", "rd")}>Promote to Formulation →</button>
          </RD2.GatedAction>
        </div>
      )}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { NicheUploadModal, DualApproval });
