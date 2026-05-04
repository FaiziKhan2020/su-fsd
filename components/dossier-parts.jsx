/* global React, RD */
const { useState: useStateP, useMemo: useMemoP } = React;

// ---------- Stream bar (used on board cards + dossier) ----------
function StreamBar({ stream, label }) {
  if (!stream) return (
    <div className="stream-bar pending">
      <span className="sb-label">{label}</span>
      <span className="sb-status">—</span>
    </div>
  );
  const lead = RD.person(stream.lead);
  const pct = stream.progress || 0;
  return (
    <div className={`stream-bar ${stream.status || "active"}`}>
      <span className="sb-label">{label}</span>
      <div className="sb-track"><div className="sb-fill" style={{ width: `${pct}%` }}></div></div>
      <span className="sb-pct mono">{pct}%</span>
      {lead && <RD.Avatar user={lead} size="xs" title={lead.name} />}
    </div>
  );
}

// ---------- Niche doc renderer (mirrors the Google Sheet structure) ----------
function NicheDoc({ p }) {
  const d = p.nicheDoc;
  if (!d) {
    return (
      <div className="empty">
        No structured niche analysis yet. Malik can paste a draft, upload the Google Sheet, or build it section-by-section here.
        <div style={{ marginTop: 12 }}><button className="btn sm primary">+ Start niche analysis</button></div>
      </div>
    );
  }
  return (
    <div className="niche-doc">
      {d.concept && (
        <section className="nd-sec">
          <h4>Product Concept</h4>
          <div className="nd-kv"><div className="k">Format</div><div>{d.concept.format || "—"}</div></div>
          <div className="nd-kv"><div className="k">Signal source</div><div>{d.concept.signal || "—"}</div></div>
          <p className="nd-p">{d.concept.thesis}</p>
        </section>
      )}
      {d.market && (
        <section className="nd-sec">
          <h4>1. Market Overview</h4>
          <div className="nd-table">
            {Object.entries(d.market).map(([k, v]) => (
              <div className="nd-row" key={k}><div className="k">{k}</div><div>{v}</div></div>
            ))}
          </div>
        </section>
      )}
      {d.barrier && (
        <section className="nd-sec">
          <h4>2. Barrier to Entry</h4>
          <div className="nd-summary">{d.barrier.summary}</div>
          <div className="nd-table">
            {(d.barrier.points || []).map((row, i) => (
              <div className="nd-row" key={i}><div className="k">{row.q}</div><div>{row.a}</div></div>
            ))}
          </div>
        </section>
      )}
      {d.ranking && (
        <section className="nd-sec">
          <h4>3. Ranking Landscape</h4>
          <div className="nd-summary">{d.ranking.summary}</div>
        </section>
      )}
      {d.differentiation && (
        <section className="nd-sec">
          <h4>4. Differentiation</h4>
          <p className="nd-p">{d.differentiation}</p>
        </section>
      )}
      {d.formula && (
        <section className="nd-sec">
          <h4>5. Proposed Formula</h4>
          <table className="nd-formula">
            <thead><tr><th>Ingredient</th><th>Dose</th><th>Rationale</th></tr></thead>
            <tbody>
              {d.formula.map((f, i) => (
                <tr key={i}><td>{f.name}</td><td className="mono">{f.dose}</td><td style={{ color: "var(--ink-2)" }}>{f.rationale}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {d.verdict && (
        <section className="nd-sec verdict">
          <h4>Final Verdict</h4>
          <div className={`verdict-pill ${d.verdict.go ? "go" : "no"}`}>{d.verdict.go ? "✓ Go" : "✗ No-go"}</div>
          <p className="nd-p">{d.verdict.note}</p>
        </section>
      )}
    </div>
  );
}

// ---------- BOM / Sourcing table ----------
function BOMTable({ p, editable }) {
  const rows = p.bom || [];
  const total = rows.reduce((s, r) => s + (r.cost || 0) * (r.qty || 0), 0);
  const quoted = rows.filter(r => r.status && r.status !== "Quoting").length;
  return (
    <div>
      <div className="bom-summary">
        <div><div className="ks">Est. unit cost</div><div className="kv mono">${total.toFixed(2)}</div></div>
        <div><div className="ks">Ingredients quoted</div><div className="kv mono">{quoted}/{rows.length}</div></div>
        <div><div className="ks">Owner</div><div className="kv">Ronel</div></div>
        <div style={{ marginLeft: "auto" }}><button className="btn sm primary">+ Add ingredient</button></div>
      </div>
      <table className="bom-table">
        <thead><tr><th>Ingredient</th><th>Qty</th><th>Unit cost</th><th>Vendor</th><th>Lead time</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="8" style={{ padding: 16, color: "var(--ink-3)", fontSize: 12.5 }}>
            No BOM yet. Click "Pull from spec" to auto-create rows from the latest spec sheet.
          </td></tr>}
          {rows.map((r, i) => (
            <tr key={i}>
              <td><b>{r.name}</b>{r.note && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.note}</div>}</td>
              <td className="mono">{r.qty} {r.unit || ""}</td>
              <td className="mono">{r.cost != null ? `$${r.cost.toFixed(2)}` : "—"}</td>
              <td>{r.vendor || "—"}</td>
              <td>{r.leadTime || "—"}</td>
              <td><span className={`bom-status s-${(r.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{r.status || "Pending"}</span></td>
              <td className="mono" style={{ color: "var(--ink-3)" }}>{r.updated || "—"}</td>
              <td><button className="btn sm">Quote</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- POs ----------
function POList({ p }) {
  const pos = p.pos || [];
  if (!pos.length) return <div className="empty">No purchase orders yet.</div>;
  return (
    <table className="po-table">
      <thead><tr><th>PO #</th><th>Vendor</th><th>Lines</th><th>Total</th><th>Expected</th><th>Status</th></tr></thead>
      <tbody>
        {pos.map(po => (
          <tr key={po.id}>
            <td className="mono">{po.id}</td>
            <td>{po.vendor}</td>
            <td>{po.lines}</td>
            <td className="mono">${po.total.toFixed(2)}</td>
            <td>{po.expected || "—"}</td>
            <td><span className={`bom-status s-${po.status.toLowerCase()}`}>{po.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Version timeline (re-used) ----------
function VersionTimeline({ versions, selected, onSelect }) {
  return (
    <div className="vt">
      {versions.slice().reverse().map(v => {
        const u = RD.person(v.by);
        return (
          <button key={v.n} className={`vt-row ${selected === v.n ? "sel" : ""}`} onClick={() => onSelect(v.n)}>
            <span className="vt-n mono">v{v.n}</span>
            <div className="vt-body">
              <div className="vt-note">{v.note || "—"}</div>
              <div className="vt-meta">
                {u && <RD.Avatar user={u} size="xs" />}
                <span>{u?.name || "—"}</span>
                <span className="mono" style={{ marginLeft: "auto", color: "var(--ink-3)" }}>{RD.daysAgoLabel(v.daysAgo)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Comments thread ----------
function CommentThread({ productId, scope }) {
  const all = (PIPELINE_DATA.comments || []).filter(c => c.productId === productId && (!scope || c.scope === scope));
  const [draft, setDraft] = useStateP("");
  return (
    <div className="card">
      <div className="card-h"><h3>Comments {scope ? `· ${scope}` : ""}</h3><span className="meta">{all.length}</span></div>
      <div className="comments">
        {all.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: "8px 0" }}>No comments yet. Start the thread.</div>}
        {all.map((c, i) => {
          const u = RD.person(c.user);
          return (
            <div className="comment" key={i}>
              <RD.Avatar user={u} size="sm" />
              <div className="c-body">
                <div className="c-meta"><b>{u?.name}</b><span className="mono">{RD.daysAgoLabel(c.ts)}</span></div>
                <div className="c-text">{c.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="comment-input">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a comment… use @ to mention" />
        <button className="btn sm primary" disabled={!draft.trim()}>Send</button>
      </div>
    </div>
  );
}

// ---------- Diff view (kept simple) ----------
function DiffView({ left, right, lLabel, rLabel }) {
  return (
    <div className="diff">
      <div className="diff-col">
        <div className="diff-h">{lLabel}</div>
        <pre>{(left || []).join("\n")}</pre>
      </div>
      <div className="diff-col">
        <div className="diff-h">{rLabel}</div>
        <pre>{(right || []).join("\n")}</pre>
      </div>
    </div>
  );
}

// ---------- Packaging preview (sandbox iframe placeholder) ----------
function PackagingPreview({ p, kind, version }) {
  const v = (p.versions?.[kind] || []).find(x => x.n === version);
  const html = v?.html || `<div style="font-family:system-ui;padding:40px;color:#666;text-align:center">
    <div style="font-size:14px;margin-bottom:8px;letter-spacing:.06em;text-transform:uppercase">${kind}</div>
    <h2 style="margin:0;font-size:24px">${p.name}</h2>
    <div style="margin-top:8px;font-size:13px">${p.brand} · v${version || "—"}</div>
    <div style="margin-top:24px;font-size:11px;opacity:.6">Drop a wireframe HTML here</div>
  </div>`;
  return <iframe sandbox="" srcDoc={html} title="preview" style={{ width: "100%", height: "100%", border: 0, background: "#fff" }} />;
}

// ---------- Image gallery (listing) ----------
function ImageGallery({ p }) {
  const main = p.images?.main;
  const gallery = p.images?.gallery || [];
  return (
    <div className="img-gallery">
      <div className="ig-main">
        <div className="ig-h">Main image · Paresh</div>
        <div className="ig-slot main">
          {main ? <div className="ig-thumb" style={{ background: main.color || "#eee" }}>{main.label || ""}</div>
                : <div className="ig-empty">Drop main image (white bg, hero shot)</div>}
        </div>
      </div>
      <div className="ig-rest">
        <div className="ig-h">Gallery · Qaiser</div>
        <div className="ig-grid">
          {Array.from({ length: 6 }).map((_, i) => {
            const img = gallery[i];
            return (
              <div className="ig-slot" key={i}>
                {img ? <div className="ig-thumb" style={{ background: img.color || "#eee" }}>{img.label || `#${i + 1}`}</div>
                     : <div className="ig-empty">+</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.RD = window.RD || {};
Object.assign(window.RD, { StreamBar, NicheDoc, BOMTable, POList, VersionTimeline, CommentThread, DiffView, PackagingPreview, ImageGallery });
