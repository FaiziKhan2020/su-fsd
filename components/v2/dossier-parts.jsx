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

// ===== Comments thread =====
function Comments({ productId }) {
  const [list, setList] = useSD([
    { who: "malik", t: "Final niche analysis is up. Strong recommend proceed.", ago: 1 },
    { who: "chesky", t: "Looks good. Question on margin at MOQ — Joel can you weigh in?", ago: 0.5 },
  ]);
  const [text, setText] = useSD("");
  const send = () => {
    if (!text.trim()) return;
    setList([...list, { who: "chesky", t: text, ago: 0 }]);
    setText("");
  };
  return (
    <div>
      <div className="comment-thread">
        {list.map((c, i) => {
          const u = RD2.person(c.who);
          return (
            <div className="comment" key={i}>
              <RD2.Avatar user={u} size="sm" />
              <div className="body">
                <div className="head"><span className="name">{u?.name}</span><span className="when">{RD2.daysAgoLabel(c.ago)}</span></div>
                <div className="text">{c.t}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="comment-input" style={{ marginTop: 12 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment, @-mention to ping" />
        <button onClick={send}>Post</button>
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

// ===== Sourcing Tab =====
function SourcingTab({ p }) {
  if (!p.bom) return <div className="empty" style={{ padding: 30 }}>
    <div style={{ fontSize: 13 }}>No BOM yet. Sourcing kicks in after Niche Approval.</div>
  </div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {p.costEst && (
        <div className="cost-summary">
          <div className="cost-cell"><div className="l">Unit cost</div><div className="v">{p.costEst.unit}</div><div className="sub">est. at MOQ</div></div>
          <div className="cost-cell"><div className="l">COGS @ MOQ</div><div className="v">{p.costEst.cogsAtMOQ}</div><div className="sub">5,000 units</div></div>
          <div className="cost-cell"><div className="l">Margin</div><div className="v" style={{ color: "var(--ok)" }}>{p.costEst.marginAtList}</div><div className="sub">at list price</div></div>
          <div className="cost-cell"><div className="l">Quoted</div><div className="v">{p.costEst.quotedPct}%</div><div className="sub">{p.bom.filter(b => b.status === "Quoting").length} pending</div></div>
        </div>
      )}
      <div className="card">
        <div className="card-h">
          <h3>Bill of Materials</h3>
          <span className="meta">Owner: <RD2.Avatar user={RD2.person("ronel")} size="sm" /> Ronel</span>
          <button className="btn sm" style={{ marginLeft: "auto" }}>Pull from spec v2</button>
          <button className="btn sm primary">+ Add ingredient</button>
        </div>
        <table className="bom-table">
          <thead><tr>
            <th>Ingredient</th><th>Spec</th><th>Status</th><th>Vendor</th><th>Cost</th><th>Lead</th><th>Last update</th><th></th>
          </tr></thead>
          <tbody>
            {p.bom.map((b, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{b.ingredient}</td>
                <td style={{ color: "var(--ink-3)", fontSize: 12 }}>{b.spec}</td>
                <td><span className="bom-status" data-s={b.status}>{b.status}</span></td>
                <td>{b.vendor}</td>
                <td className="mono">{b.cost}</td>
                <td className="mono" style={{ color: "var(--ink-3)" }}>{b.lead}</td>
                <td style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {b.note && <div style={{ color: "var(--ink-2)", fontStyle: "italic" }}>"{b.note}"</div>}
                  <span>{RD2.person(b.by)?.name} · {RD2.daysAgoLabel(b.daysAgo)}</span>
                </td>
                <td><button className="btn sm">RFQ</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.pos?.length > 0 && (
        <div className="card">
          <div className="card-h"><h3>Purchase Orders</h3><button className="btn sm primary">+ New PO</button></div>
          <table className="bom-table">
            <thead><tr><th>PO</th><th>Vendor</th><th>Items</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {p.pos.map(po => (
                <tr key={po.id}>
                  <td className="mono" style={{ fontWeight: 500 }}>{po.id}</td>
                  <td>{po.vendor}</td>
                  <td style={{ color: "var(--ink-2)", fontSize: 12 }}>{po.items.join(" · ")}</td>
                  <td><span className="bom-status" data-s={po.status === "Sent" ? "Quoting" : po.status === "Confirmed" ? "Quoted" : po.status}>{po.status}</span></td>
                  <td style={{ fontSize: 11, color: "var(--ink-3)" }}>{RD2.daysAgoLabel(po.created)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

// ===== Listing Tab =====
function ListingTab({ p }) {
  if (!p.listing) return <div className="empty" style={{ padding: 30 }}>Listing kicks off in build stage.</div>;
  const l = p.listing;
  const steps = [
    { k: "created",  l: "Listing created",  d: l.created },
    { k: "approved", l: "Amazon approved", d: l.approved },
    { k: "live",     l: "Live on Amazon",  d: l.live },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="lstatus">
        {steps.map(s => (
          <div key={s.k} className={`step ${s.d?.done ? "done" : ""}`}>
            <span className="ck">{s.d?.done ? "✓" : ""}</span>
            <div>
              <div className="lbl-stp">{s.l}</div>
              <div className="when">{s.d?.done ? `${RD2.person(s.d.by)?.name || "—"} · ${RD2.daysAgoLabel(s.d.daysAgo)}` : (s.d?.note || "Not started")}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-h"><h3>Listing content</h3>
          <span className="meta">Owner: <RD2.Avatar user={RD2.person("april")} size="sm" /> April</span>
          <button className="btn sm" style={{ marginLeft: "auto" }}>Save version</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Title <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)", color: l.content.title.length > 200 ? "var(--err)" : "var(--ink-3)" }}>{l.content.title.length}/200</span></div>
          <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5 }}>{l.content.title}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Bullet points</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>{l.content.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Backend keywords <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)", color: l.content.keywordBytes > 250 ? "var(--err)" : "var(--ink-3)" }}>{l.content.keywordBytes}/250 bytes</span></div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontFamily: "var(--font-mono)", background: "var(--bg-2)", padding: 10, borderRadius: 6 }}>{l.content.keywords}</div>
        </div>
      </div>

      {/* Images */}
      <div className="card">
        <div className="card-h"><h3>Images</h3>
          <span className="meta"><RD2.Avatar user={RD2.person("paresh")} size="sm" /> Paresh main · <RD2.Avatar user={RD2.person("qaiser")} size="sm" /> Qaiser gallery + A+</span>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Main image</div>
          <div style={{ display: "grid", gridTemplateColumns: "200px", gap: 10 }}>
            {l.images.main.map((v, i) => (
              <div key={i} className="img-slot filled">
                <span className="ph">Hero · white bg</span>
                <span className="by">{RD2.person(v.by)?.name}</span>
                <span className="v">v{v.n}</span>
              </div>
            ))}
            {l.images.main.length === 0 && <div className="img-slot"><span className="ph">+ Main image</span></div>}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Gallery (6 slots)</div>
          <div className="img-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            {[0,1,2,3,4,5].map(i => {
              const v = l.images.gallery[i];
              if (!v) return <div key={i} className="img-slot"><span className="ph">+ slot {i+2}</span></div>;
              return (
                <div key={i} className="img-slot filled">
                  <span className="ph" style={{ textAlign: "center", padding: "0 4px" }}>{v.note}</span>
                  <span className="by">{RD2.person(v.by)?.name}</span>
                  <span className="v">v{v.n}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>A+ Content modules</div>
          <div className="img-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[0,1,2].map(i => {
              const v = l.images.aplus[i];
              if (!v) return <div key={i} className="img-slot"><span className="ph">+ A+ module {i+1}</span></div>;
              return (
                <div key={i} className="img-slot filled" style={{ aspectRatio: "16/9" }}>
                  <span className="ph">{v.note}</span>
                  <span className="by">{RD2.person(v.by)?.name}</span>
                  <span className="v">v{v.n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { EF, Comments, NicheDoc, SourcingTab, DesignTab, ListingTab });
