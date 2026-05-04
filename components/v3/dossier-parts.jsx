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
function NicheDoc({ p, onUpload }) {
  const c = p.niche?.current;
  if (!c) {
    if (p.nicheSubState === "researching" || (!p.docUrl && p.stage === "niche")) {
      return (
        <div className="empty" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏱</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Research in flight</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, maxWidth: 380, margin: "4px auto 0" }}>
            {RD2.person(p.owner)?.name} is doing the deep-dive in Google Docs.
            Once the doc is uploaded, AI will parse it into the structured 6-section view below.
          </div>
          <button className="btn sm primary" style={{ marginTop: 16 }} onClick={onUpload}>Upload niche analysis →</button>
        </div>
      );
    }
    return (
      <div className="empty" style={{ padding: 30 }}>
        <div style={{ fontSize: 13 }}>No structured doc parsed yet.</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{p.niche?.versions?.length || 0} versions in history.</div>
        <button className="btn sm primary" style={{ marginTop: 12 }} onClick={onUpload}>+ Upload version</button>
      </div>
    );
  }
  return (
    <div className="niche-doc">
      <section>
        <h2>1 · Niche Overview</h2>
        <h3>{c.overview.productName}</h3>
        <p>{c.overview.concept}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          <div><div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Format</div><div style={{ fontSize: 13 }}>{c.overview.format}</div></div>
          <div><div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Signal</div><div style={{ fontSize: 13 }}>{c.overview.signal}</div></div>
        </div>
        <div className="market-grid">
          {[
            ["Search vol", c.overview.market.sv],
            ["Top-30 rev", c.overview.market.revenue],
            ["YoY trend", c.overview.market.trend],
            ["CVR", c.overview.market.cvr],
            ["Format", c.overview.market.dominantFormat],
            ["TikTok", c.overview.market.tiktok],
          ].map(([l, val]) => (
            <div className="market-cell" key={l}><div className="l">{l}</div><div className="v">{val}</div></div>
          ))}
        </div>
      </section>

      <section>
        <h2>2 · Competitor Analysis</h2>
        <table className="bom-table">
          <thead><tr>
            <th>ASIN</th><th>Brand</th><th>Title</th><th>Price</th><th>Sales/mo</th><th>Rev/mo</th><th>Rating</th><th>Reviews</th><th>Strength</th>
          </tr></thead>
          <tbody>
            {c.competitors.map(co => (
              <tr key={co.asin}>
                <td className="mono" style={{ fontSize: 11 }}>{co.asin}</td>
                <td style={{ fontWeight: 500 }}>{co.brand}</td>
                <td style={{ color: "var(--ink-2)" }}>{co.title}</td>
                <td className="mono">{co.price}</td>
                <td className="mono">{co.sales}</td>
                <td className="mono">{co.revenue}</td>
                <td>{co.rating}★</td>
                <td className="mono" style={{ fontSize: 11 }}>{co.reviews.toLocaleString()}</td>
                <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{co.strength}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>3 · Differentiation</h2>
        <h3>Angle</h3><p>{c.differentiation.angle}</p>
        <h3>White space</h3><p>{c.differentiation.whitespace}</p>
      </section>

      <section>
        <h2>4 · Proposed Formula</h2>
        <table className="bom-table">
          <thead><tr><th>Ingredient</th><th>Dose</th><th>Rationale</th></tr></thead>
          <tbody>{c.formula.map((f, i) => (
            <tr key={i}><td style={{ fontWeight: 500 }}>{f.ingredient}</td><td className="mono">{f.dose}</td><td style={{ color: "var(--ink-2)" }}>{f.rationale}</td></tr>
          ))}</tbody>
        </table>
      </section>

      <section>
        <h2>5 · Packaging Direction</h2>
        <p>{c.packagingDirection}</p>
      </section>

      <section>
        <h2>6 · Verdict</h2>
        <div className="verdict-card">
          <div className="label">R&D Recommendation</div>
          <div className="rec">{c.verdict.recommendation}</div>
          <div className="rationale">{c.verdict.rationale}</div>
        </div>
      </section>
    </div>
  );
}

// ===== Sourcing Tab moved to sourcing-tab.jsx =====

// ===== Design Tab — Label / Box / Insert =====
function DesignTab({ p }) {
  const [sub, setSub] = useSD("label");
  const variants = [
    ["label",  "Label",  p.label],
    ["box",    "Box / Carton", p.box],
    ["insert", "Insert", p.insert],
  ];
  const cur = variants.find(([k]) => k === sub);
  const data = cur?.[2];
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--line)" }}>
        {variants.map(([k, label, d]) => (
          <button key={k} onClick={() => setSub(k)}
            style={{ background: "transparent", border: 0, padding: "8px 14px", cursor: "pointer", borderBottom: `2px solid ${sub === k ? "var(--accent)" : "transparent"}`, color: sub === k ? "var(--ink)" : "var(--ink-3)", fontWeight: 500, fontSize: 13 }}>
            {label} {d?.versions?.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", marginLeft: 4 }}>· {d.versions.length}</span>}
          </button>
        ))}
      </div>
      {!data || data.status === "N/A" ? (
        <div className="empty" style={{ padding: 30 }}>Not applicable for this product.</div>
      ) : data.versions.length === 0 ? (
        <div className="empty" style={{ padding: 30 }}>
          <div style={{ fontSize: 13 }}>No versions yet.</div>
          <button className="btn sm primary" style={{ marginTop: 12 }}>+ Upload {cur[1]} v1</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-h">
            <h3>{cur[1]}</h3>
            <span className="meta">Status: <span className="bom-status" data-s={data.status === "Approved" ? "Approved" : "Quoting"}>{data.status}</span></span>
            <span className="meta">Owner: <RD2.Avatar user={RD2.person("esty")} size="sm" /> Esty</span>
            <button className="btn sm primary" style={{ marginLeft: "auto" }}>+ Upload version</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...data.versions].reverse().map(v => {
              const u = RD2.person(v.by);
              return (
                <div key={v.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, background: v === data.versions[data.versions.length-1] ? "var(--accent-bg)" : "var(--bg-2)" }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 13, width: 32 }}>v{v.n}</span>
                  <RD2.Avatar user={u} size="sm" />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{u?.name}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>"{v.note}"</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{RD2.daysAgoLabel(v.daysAgo)}</span>
                  <button className="btn sm">View</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ListingTab is now in components/v3/listing-tab.jsx
window.RD2 = Object.assign(window.RD2 || {}, { EF, Comments, NicheDoc, DesignTab });
