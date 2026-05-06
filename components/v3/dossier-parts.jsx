/* global React, RD2, PIPELINE_DATA */
const { useState: useSD, useMemo: useMD } = React;

// ===== Editable field =====
function EF({ value, onSave, type = "text", options }) {
  const [editing, setE] = useSD(false);
  const [v, setV] = useSD(value);
  if (!editing) return (
    <span className="ef" onClick={() => { setV(value); setE(true); }}>
      {value || <span style={{ color: "var(--ink-3)" }}>—</span>}
    </span>
  );
  if (type === "select") return (
    <select className="ef-input" autoFocus value={v} onChange={e => setV(e.target.value)}
      onBlur={() => { onSave(v); setE(false); }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return (
    <input className="ef-input" autoFocus value={v} onChange={e => setV(e.target.value)}
      onBlur={() => { onSave(v); setE(false); }}
      onKeyDown={e => { if (e.key === "Enter") { onSave(v); setE(false); } if (e.key === "Escape") setE(false); }} />
  );
}

// ===== Unified comments — one stream per product, filterable by topic =====
function Comments({ productId, topicFilter, setTopicFilter, seedDraft }) {
  const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === productId);
  const seed = (p?.comments || []).map(c => ({ who: c.user, t: c.body, ago: c.at, topic: c.topic }));
  const [list, setList] = useSD(seed);
  const [text, setText] = useSD(seedDraft || "");
  const [activeTopic, setActiveTopic] = useSD(topicFilter || "all");
  const taRef = React.useRef(null);

  // Sync external filter (e.g. when user clicks "Discuss" from a tab)
  React.useEffect(() => { if (topicFilter) setActiveTopic(topicFilter); }, [topicFilter]);
  // Seed a draft comment (e.g. AI rail "Ping owner")
  React.useEffect(() => {
    if (seedDraft) {
      setText(seedDraft);
      // focus + place cursor at end
      setTimeout(() => {
        if (taRef.current) {
          taRef.current.focus();
          taRef.current.setSelectionRange(seedDraft.length, seedDraft.length);
        }
      }, 50);
    }
  }, [seedDraft]);

  const topics = useMD(() => {
    const s = new Set(seed.map(c => c.topic).filter(Boolean));
    return ["all", ...Array.from(s)];
  }, [productId]);

  const filtered = list.filter(c => activeTopic === "all" || c.topic === activeTopic);
  const send = () => {
    if (!text.trim()) return;
    setList([{ who: "chesky", t: text, ago: 0, topic: activeTopic === "all" ? "general" : activeTopic }, ...list]);
    setText("");
  };

  return (
    <div>
      {topics.length > 1 && (
        <div className="topic-tabs">
          {topics.map(t => (
            <button key={t}
              className={"topic-tab" + (activeTopic === t ? " active" : "")}
              onClick={() => { setActiveTopic(t); setTopicFilter?.(t); }}>
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="mono"> {t === "all" ? list.length : list.filter(c => c.topic === t).length}</span>
            </button>
          ))}
        </div>
      )}
      <div className="comment-input" style={{ marginBottom: 12 }}>
        <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)}
          placeholder={`Comment on ${activeTopic === "all" ? "this product" : activeTopic} · @-mention to ping`} />
        <button onClick={send}>Post</button>
      </div>
      <div className="comment-thread">
        {filtered.length === 0 && <div className="empty" style={{ padding: 14, fontSize: 12 }}>No discussion yet on {activeTopic}.</div>}
        {filtered.map((c, i) => {
          const u = RD2.person(c.who);
          return (
            <div className="comment" key={i}>
              <RD2.Avatar user={u} size="sm" />
              <div className="body">
                <div className="head">
                  <span className="name">{u?.name}</span>
                  {c.topic && c.topic !== "general" && <span className="topic-chip">{c.topic}</span>}
                  <span className="when">{RD2.daysAgoLabel(c.ago)}</span>
                </div>
                <div className="text">{c.t}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Niche Analysis Doc =====
// Every field on the parsed doc is inline-editable. Edits persist via
// onUpdateNiche → app.jsx → niche.current. Each section can also show
// "evidence" strips — screenshots Malik attached at upload time, optionally
// captioned by Claude vision. See DEV-NOTES.md for the production wiring
// against Google Docs API.
function NicheDoc({ p, onUpload, setTab, currentUser, onDecide, onUpdateNiche }) {
  const c = p.niche?.current;
  const editable = !!onUpdateNiche && RD2.can("niche.edit", p, currentUser);

  // Patch helper — deep-merge a sparse partial into niche.current.
  const patch = (path, value) => {
    if (!onUpdateNiche || !c) return;
    const next = JSON.parse(JSON.stringify(c));
    let cur = next;
    for (let i = 0; i < path.length - 1; i++) {
      cur[path[i]] = cur[path[i]] ?? (typeof path[i + 1] === "number" ? [] : {});
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = value;
    onUpdateNiche(p.id, next);
  };
  const replaceArray = (key, arr) => {
    if (!onUpdateNiche || !c) return;
    onUpdateNiche(p.id, { ...c, [key]: arr });
  };

  if (!c) {
    let body;
    if (p.nicheSubState === "researching" || (!p.docUrl && p.stage === "niche")) {
      body = (
        <div className="empty" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏱</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Research in flight</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, maxWidth: 380, margin: "4px auto 0" }}>
            Deep-dive happening in Google Docs.
            Once the doc is uploaded, AI will parse it into the structured 6-section view below.
          </div>
          <button className="btn sm primary" style={{ marginTop: 16 }} onClick={onUpload}>Upload niche analysis →</button>
        </div>
      );
    } else if (p.niche?.parsed === true || p.niche?.docUrl) {
      body = (
        <div style={{ padding: 24, background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Niche analysis on file</div>
          <h2 style={{ margin: "6px 0 4px", fontSize: 16, fontWeight: 600 }}>Doc parsed {RD2.daysAgoLabel(p.niche.parsedDaysAgo || 0)}</h2>
          {p.nicheSummary && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div><div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>TAM</div><div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{p.nicheSummary.tam}</div></div>
              <div><div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Competitors</div><div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{p.nicheSummary.competitors}</div></div>
              <div><div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verdict</div><div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{p.nicheSummary.verdict}</div></div>
            </div>
          )}
          {p.nicheSummary?.gap && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Gap</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{p.nicheSummary.gap}</div>
            </div>
          )}
          {p.niche.docUrl && (
            <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--ink-3)" }}>
              Source: <span className="mono">{p.niche.docUrl}</span>
            </div>
          )}
        </div>
      );
    } else {
      body = (
        <div className="empty" style={{ padding: 30 }}>
          <div style={{ fontSize: 13 }}>No structured doc parsed yet.</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{p.niche?.versions?.length || 0} versions in history.</div>
          <button className="btn sm primary" style={{ marginTop: 12 }} onClick={onUpload}>+ Upload version</button>
        </div>
      );
    }
    return (
      <div className="niche-doc">
        {body}
        <NicheReviewHandoff p={p} setTab={setTab} currentUser={currentUser} onDecide={onDecide} />
      </div>
    );
  }
  return (
    <div className="niche-doc">
      {editable && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--accent-bg)", border: "1px solid var(--accent)", borderRadius: 6, marginBottom: 14, fontSize: 12, color: "var(--ink-2)" }}>
          <span>✏️</span>
          <span>Click any field to edit. Changes persist immediately. Source doc remains the audit trail.</span>
          {(p.niche?.docUrl || p.docUrl) && (
            <a href={p.niche?.docUrl || p.docUrl} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
              Open source doc ↗
            </a>
          )}
        </div>
      )}

      <section>
        <h2>1 · Niche Overview</h2>
        <h3><EditableText value={c.overview.productName} editable={editable} onSave={v => patch(["overview", "productName"], v)} /></h3>
        <p><EditableText value={c.overview.concept} editable={editable} multiline onSave={v => patch(["overview", "concept"], v)} /></p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Format</div>
            <div style={{ fontSize: 13 }}><EditableText value={c.overview.format} editable={editable} onSave={v => patch(["overview", "format"], v)} /></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Signal</div>
            <div style={{ fontSize: 13 }}><EditableText value={c.overview.signal} editable={editable} multiline onSave={v => patch(["overview", "signal"], v)} /></div>
          </div>
        </div>
        <div className="market-grid">
          {[
            ["Search vol", "sv"],
            ["Top-30 rev", "revenue"],
            ["YoY trend", "trend"],
            ["CVR", "cvr"],
            ["Format", "dominantFormat"],
            ["TikTok", "tiktok"],
          ].map(([l, k]) => (
            <div className="market-cell" key={k}>
              <div className="l">{l}</div>
              <div className="v"><EditableText value={c.overview.market?.[k] || "—"} editable={editable} onSave={v => patch(["overview", "market", k], v)} /></div>
            </div>
          ))}
        </div>
        <EvidenceStrip evidence={c.evidence?.overview} />
      </section>

      <section>
        <h2>2 · Competitor Analysis</h2>
        {(!c.competitors || c.competitors.length === 0) ? (
          <div className="empty" style={{ padding: 16, fontSize: 12.5 }}>
            No competitors extracted. {editable && <button className="btn xs" style={{ marginLeft: 8 }} onClick={() => replaceArray("competitors", [{ asin: "—", brand: "—", title: "—", price: "—", sales: "—", revenue: "—", rating: 0, reviews: 0, strength: "—" }])}>+ Add row</button>}
          </div>
        ) : (
          <table className="bom-table">
            <thead><tr>
              <th>ASIN</th><th>Brand</th><th>Title</th><th>Price</th><th>Sales/mo</th><th>Rev/mo</th><th>Rating</th><th>Reviews</th><th>Strength</th>{editable && <th></th>}
            </tr></thead>
            <tbody>
              {c.competitors.map((co, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 11 }}><EditableText value={co.asin} editable={editable} onSave={v => patch(["competitors", i, "asin"], v)} /></td>
                  <td style={{ fontWeight: 500 }}><EditableText value={co.brand} editable={editable} onSave={v => patch(["competitors", i, "brand"], v)} /></td>
                  <td style={{ color: "var(--ink-2)" }}><EditableText value={co.title} editable={editable} onSave={v => patch(["competitors", i, "title"], v)} /></td>
                  <td className="mono"><EditableText value={co.price} editable={editable} onSave={v => patch(["competitors", i, "price"], v)} /></td>
                  <td className="mono"><EditableText value={co.sales} editable={editable} onSave={v => patch(["competitors", i, "sales"], v)} /></td>
                  <td className="mono"><EditableText value={co.revenue} editable={editable} onSave={v => patch(["competitors", i, "revenue"], v)} /></td>
                  <td><EditableText value={String(co.rating)} editable={editable} onSave={v => patch(["competitors", i, "rating"], parseFloat(v) || 0)} />★</td>
                  <td className="mono" style={{ fontSize: 11 }}><EditableText value={String(co.reviews)} editable={editable} onSave={v => patch(["competitors", i, "reviews"], parseInt(v, 10) || 0)} /></td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}><EditableText value={co.strength} editable={editable} onSave={v => patch(["competitors", i, "strength"], v)} /></td>
                  {editable && (
                    <td><button className="btn xs" onClick={() => replaceArray("competitors", c.competitors.filter((_, j) => j !== i))} title="Remove row">✕</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {editable && c.competitors?.length > 0 && (
          <button className="btn xs" style={{ marginTop: 8 }} onClick={() => replaceArray("competitors", [...c.competitors, { asin: "—", brand: "—", title: "—", price: "—", sales: "—", revenue: "—", rating: 0, reviews: 0, strength: "—" }])}>+ Add competitor</button>
        )}
        <EvidenceStrip evidence={c.evidence?.competitors} />
      </section>

      <section>
        <h2>3 · Differentiation</h2>
        <h3>Angle</h3><p><EditableText value={c.differentiation?.angle || ""} editable={editable} multiline onSave={v => patch(["differentiation", "angle"], v)} /></p>
        <h3>White space</h3><p><EditableText value={c.differentiation?.whitespace || ""} editable={editable} multiline onSave={v => patch(["differentiation", "whitespace"], v)} /></p>
        <EvidenceStrip evidence={c.evidence?.differentiation} />
      </section>

      <section>
        <h2>4 · Proposed Formula</h2>
        {(!c.formula || c.formula.length === 0) ? (
          <div className="empty" style={{ padding: 16, fontSize: 12.5 }}>
            No formula extracted. {editable && <button className="btn xs" style={{ marginLeft: 8 }} onClick={() => replaceArray("formula", [{ ingredient: "—", dose: "—", rationale: "—" }])}>+ Add ingredient</button>}
          </div>
        ) : (
          <table className="bom-table">
            <thead><tr><th>Ingredient</th><th>Dose</th><th>Rationale</th>{editable && <th></th>}</tr></thead>
            <tbody>{c.formula.map((f, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}><EditableText value={f.ingredient} editable={editable} onSave={v => patch(["formula", i, "ingredient"], v)} /></td>
                <td className="mono"><EditableText value={f.dose} editable={editable} onSave={v => patch(["formula", i, "dose"], v)} /></td>
                <td style={{ color: "var(--ink-2)" }}><EditableText value={f.rationale} editable={editable} onSave={v => patch(["formula", i, "rationale"], v)} /></td>
                {editable && (
                  <td><button className="btn xs" onClick={() => replaceArray("formula", c.formula.filter((_, j) => j !== i))} title="Remove">✕</button></td>
                )}
              </tr>
            ))}</tbody>
          </table>
        )}
        {editable && c.formula?.length > 0 && (
          <button className="btn xs" style={{ marginTop: 8 }} onClick={() => replaceArray("formula", [...c.formula, { ingredient: "—", dose: "—", rationale: "—" }])}>+ Add ingredient</button>
        )}
        <EvidenceStrip evidence={c.evidence?.formula} />
      </section>

      <section>
        <h2>5 · Packaging Direction</h2>
        <p><EditableText value={c.packagingDirection || ""} editable={editable} multiline onSave={v => patch(["packagingDirection"], v)} /></p>
        <EvidenceStrip evidence={c.evidence?.packaging} />
      </section>

      <section>
        <h2>6 · Verdict</h2>
        <div className="verdict-card">
          <div className="label">Formulation Recommendation</div>
          <div className="rec">
            {editable ? (
              <select value={c.verdict?.recommendation || "PROCEED"} onChange={e => patch(["verdict", "recommendation"], e.target.value)}
                style={{ font: "inherit", fontSize: "inherit", fontWeight: "inherit", color: "inherit", background: "transparent", border: "1px dashed var(--line-2)", padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}>
                <option value="PROCEED">PROCEED</option>
                <option value="HOLD">HOLD</option>
                <option value="PASS">PASS</option>
              </select>
            ) : (c.verdict?.recommendation || "PROCEED")}
          </div>
          <div className="rationale"><EditableText value={c.verdict?.rationale || ""} editable={editable} multiline onSave={v => patch(["verdict", "rationale"], v)} /></div>
        </div>
      </section>

      <NicheReviewHandoff p={p} setTab={setTab} currentUser={currentUser} onDecide={onDecide} />
    </div>
  );
}

// ===== EditableText — click to edit, blur to save =====
function EditableText({ value, editable, multiline, onSave }) {
  const [editing, setEditing] = useSD(false);
  const [draft, setDraft] = useSD(value || "");
  React.useEffect(() => { setDraft(value || ""); }, [value]);
  if (!editable) return <span>{value || "—"}</span>;
  if (!editing) {
    return (
      <span onClick={() => setEditing(true)}
        style={{ cursor: "text", borderBottom: "1px dashed transparent", paddingBottom: 1, transition: "border-color 0.1s" }}
        onMouseEnter={e => e.currentTarget.style.borderBottomColor = "var(--line-2)"}
        onMouseLeave={e => e.currentTarget.style.borderBottomColor = "transparent"}
        title="Click to edit">
        {value || <em style={{ color: "var(--ink-3)" }}>—</em>}
      </span>
    );
  }
  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };
  const cancel = () => { setDraft(value || ""); setEditing(false); };
  if (multiline) {
    return (
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Escape") cancel(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit(); }}
        style={{ font: "inherit", fontSize: "inherit", color: "inherit", background: "var(--accent-bg)", border: "1px solid var(--accent)", borderRadius: 4, padding: "2px 4px", width: "100%", minHeight: 50, resize: "vertical" }} />
    );
  }
  return (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Escape") cancel(); if (e.key === "Enter") commit(); }}
      style={{ font: "inherit", fontSize: "inherit", color: "inherit", background: "var(--accent-bg)", border: "1px solid var(--accent)", borderRadius: 4, padding: "1px 4px", width: "100%", boxSizing: "border-box" }} />
  );
}

// ===== EvidenceStrip — screenshots Malik attached, with vision captions =====
function EvidenceStrip({ evidence }) {
  const [open, setOpen] = useSD(null);
  if (!evidence || evidence.length === 0) return null;
  return (
    <>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>
          Evidence · {evidence.length} screenshot{evidence.length > 1 ? "s" : ""} from source doc
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {evidence.map(ev => (
            <div key={ev.id} onClick={() => setOpen(ev)}
              style={{ width: 140, cursor: "zoom-in", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden", background: "var(--bg-2)" }}>
              <img src={ev.dataUrl} alt={ev.caption || ""} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "4px 6px", fontSize: 10.5, color: "var(--ink-2)", lineHeight: 1.3 }}>
                <div style={{ fontWeight: 600, color: "var(--ink-1)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 9.5 }}>{ev.kind || "screenshot"}</div>
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.caption || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {open && (
        <div onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", gap: 10 }}>
            <img src={open.dataUrl} alt="" style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8, background: "white" }} />
            <div style={{ background: "var(--panel)", padding: 12, borderRadius: 6, fontSize: 12.5, color: "var(--ink-1)" }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>{open.kind || "screenshot"}</div>
              <div>{open.caption || "—"}</div>
              {open.extracted && Object.keys(open.extracted).length > 0 && (
                <pre style={{ marginTop: 8, padding: 8, background: "var(--bg-2)", borderRadius: 4, fontSize: 11, overflow: "auto", maxHeight: 160 }}>{JSON.stringify(open.extracted, null, 2)}</pre>
              )}
            </div>
            <button className="btn sm" onClick={() => setOpen(null)} style={{ alignSelf: "center" }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Niche-review handoff CTA (lives at bottom of niche doc) =====
// After the niche doc is parsed, Malik or Chesky submits for niche-review.
// Chesky alone decides go/no-go at this stage; real cost pass runs at
// Formulation against the locked PDS.
function NicheReviewHandoff({ p, setTab, currentUser, onDecide }) {
  const hasNiche = !!(p.niche?.current || p.niche?.parsed || p.niche?.docUrl);
  if (!hasNiche) return null;
  // Only render this CTA while we're actually in the niche stage.
  // Past niche, this surface goes quiet (the Formulation tab has its own status).
  if (p.stage !== "niche") return null;

  const canSend = RD2.can("niche.send", p, currentUser);
  return (
    <section style={{ marginTop: 20, padding: 18, background: "var(--bg-2)", border: "1px dashed var(--line)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Next step</div>
          <h2 style={{ margin: "4px 0 6px", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Submit for niche review</h2>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>
            Chesky decides go/no-go on the niche. If approved, Malik builds the PDS in Formulation, Joel runs the cost pass against the locked formula, then mfgs get briefed.
          </p>
        </div>
        {canSend ? (
          <button className="btn primary" onClick={() => onDecide && onDecide("__submitForReview")}>
            Submit for review →
          </button>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontStyle: "italic", whiteSpace: "nowrap" }}>Waiting on Malik or Chesky</span>
        )}
      </div>
    </section>
  );
}

// ===== Cost tab — kept around for legacy compatibility; will be re-pointed inside Formulation =====
function CostTab({ p, currentUser, onDecide }) {
  if (!p.costPass) {
    return <div className="empty" style={{ padding: 40, textAlign: "center" }}>No cost pass on this product.</div>;
  }
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
        Cost pass for raw materials. Lives inside Formulation — Ronel runs this after Malik attaches the PDS spec, before the spec ships to Mimi/Connor.
      </div>
      <RD2.CostPassCard p={p} onOpen={() => {}} onDecide={onDecide} />
    </div>
  );
}

// ===== Sourcing Tab moved to sourcing-tab.jsx =====

// ===== Design Tab — Label / Box / Insert =====
// Esty's flow: pick which asset (label/box/insert), see the wireframe brief,
// upload her design. The brief is the source of truth — copy, dieline,
// regulatory requirements, files needed.
function DesignTab({ p, initialKind, currentUser, onDecide }) {
  // The wireframe IS the deliverable — versioning + approve + request-changes
  // happen inside WireframeSection. No separate asset uploads. Designers iterate
  // on the wireframe doc directly; once Chesky locks it, that is the spec.
  return (
    <div>
      <RD2.WireframeSection p={p} currentUser={currentUser} onDecide={onDecide} />
    </div>
  );
}

// (Old asset-upload block removed — superseded by versioned wireframe flow.)
function _DesignTab_legacy_unused({ p, initialKind, currentUser, onDecide }) {
  const [sub, setSub] = useSD(initialKind || "label");
  const variants = [
    ["label",  "Label",  p.label],
    ["box",    "Box / Carton", p.box],
    ["insert", "Insert", p.insert],
  ];
  const cur = variants.find(([k]) => k === sub);
  const data = cur?.[2];
  const wf = RD2.buildWireframe(p, sub);
  const wireframeLocked = p.wireframe?.status === "locked";

  return (
    <div>
      {/* ===== Wireframe section — gates everything else ===== */}
      <RD2.WireframeSection p={p} currentUser={currentUser} onDecide={onDecide} />

      {/* ===== Asset upload (label / box / insert) — only after wireframe locks ===== */}
      <div className="design-tab-asset-h">
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Asset uploads</h3>
        {!wireframeLocked && (
          <span className="wf-status-pill status-blocked" style={{ marginLeft: 10 }}>
            Blocked — waiting on wireframe lock
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--line)", opacity: wireframeLocked ? 1 : 0.5, pointerEvents: wireframeLocked ? "auto" : "none" }}>
        {variants.map(([k, label, d]) => {
          const has = RD2.buildWireframe(p, k);
          return (
            <button key={k} onClick={() => setSub(k)}
              disabled={!has}
              style={{ background: "transparent", border: 0, padding: "8px 14px", cursor: has ? "pointer" : "default", borderBottom: `2px solid ${sub === k ? "var(--accent)" : "transparent"}`, color: !has ? "var(--ink-4)" : sub === k ? "var(--ink)" : "var(--ink-3)", fontWeight: 500, fontSize: 13 }}>
              {label}
              {has && d?.versions?.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", marginLeft: 4 }}>· v{d.versions.length}</span>}
              {!has && <span style={{ fontSize: 10, color: "var(--ink-4)", marginLeft: 4 }}>(N/A)</span>}
            </button>
          );
        })}
      </div>

      {!wf ? (
        <div className="empty" style={{ padding: 30 }}>This product type doesn't use a {sub}.</div>
      ) : (
        <div className="design-tab-split">
          {/* LEFT: wireframe brief — full detail */}
          <div className="design-tab-brief">
            <RD2.WireframePreview p={p} kind={sub} />
          </div>

          {/* RIGHT: upload + version history */}
          <div className="design-tab-action">
            <div className="design-tab-action-h">
              <span style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 600 }}>Your work</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Owner: <RD2.Avatar user={RD2.person("esty")} size="xs" /> Esty</span>
            </div>

            <RD2.WireframeUpload kind={sub} onUpload={() => RD2.toast(`${sub} v${(data?.versions?.length || 0) + 1} uploaded`, "ok")} />

            <div className="design-tab-action-h" style={{ marginTop: 18 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 600 }}>Version history</span>
              {data?.status && data.status !== "N/A" && (
                <span className="bom-status" data-s={data.status === "Approved" ? "Approved" : "Quoting"} style={{ fontSize: 11 }}>{data.status}</span>
              )}
            </div>
            {!data || !data.versions?.length ? (
              <div style={{ padding: 16, fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", textAlign: "center", border: "1px dashed var(--line)", borderRadius: 6 }}>
                No versions yet — upload v1 above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...data.versions].reverse().map(v => {
                  const u = RD2.person(v.by);
                  const isLatest = v === data.versions[data.versions.length - 1];
                  return (
                    <div key={v.n} className="design-tab-version" style={{ background: isLatest ? "var(--accent-bg)" : "var(--bg-2)" }}>
                      <span className="mono" style={{ fontWeight: 600, fontSize: 12, width: 26 }}>v{v.n}</span>
                      <RD2.Avatar user={u} size="xs" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{v.note}"</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{u?.name} · {RD2.daysAgoLabel(v.daysAgo)}</div>
                      </div>
                      <button className="btn xs" onClick={() => RD2.toast(`Opening ${sub} v${v.n}`)}>View</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ListingTab is now in components/v3/listing-tab.jsx
window.RD2 = Object.assign(window.RD2 || {}, { EF, Comments, NicheDoc, DesignTab, CostTab });
