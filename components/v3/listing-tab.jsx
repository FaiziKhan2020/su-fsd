// ============================================================
// listing-tab.jsx — April's listing draft workspace
// ----------------------------------------------------------
// Owner: April (copy + listing submission)
// Contributors: Paresh (main image), Qaiser (gallery + A+)
//
// The screen mirrors how April actually works — she drafts
// title/bullets/keywords against Amazon's hard limits, then
// pulls visual assets from Paresh and Qaiser into matching
// briefs. This view shows BOTH what was asked for AND what
// was delivered, in one scannable column per asset.
// ============================================================

const { useState: useLT, useMemo: useMLT } = React;

// ---------- Pre-flight scorecard ----------
function PreflightCard({ p }) {
  const l = p.listing;
  const c = l.content || { title: "", bullets: [], keywordBytes: 0 };
  const imgs = l.images || { main: [], gallery: [], aplus: [] };
  const titleLen = (c.title || "").length;
  const bulletCount = (c.bullets || []).length;
  const longBullets = (c.bullets || []).filter(b => b.length > 200).length;
  const kwBytes = c.keywordBytes || 0;
  const main = (imgs.main || []).length;
  const gallery = (imgs.gallery || []).length;
  const aplus = (imgs.aplus || []).length;

  const checks = [
    { label: "Title",          ok: titleLen > 80 && titleLen <= 200, val: `${titleLen}/200`, hint: titleLen > 200 ? "Over Amazon limit" : titleLen < 80 ? "Add keywords — too short" : "Within range" },
    { label: "Bullets",        ok: bulletCount === 5 && longBullets === 0, val: `${bulletCount}/5`, hint: longBullets ? `${longBullets} bullet(s) over 200ch` : bulletCount < 5 ? "Need 5 bullets" : "Good" },
    { label: "Backend kwds",   ok: kwBytes > 0 && kwBytes <= 250, val: `${kwBytes}/250B`, hint: kwBytes > 250 ? "Over byte limit" : kwBytes === 0 ? "Empty" : "Good" },
    { label: "Main image",     ok: main >= 1, val: `${main}/1`, hint: main ? "Hero ready" : "Paresh needs to deliver" },
    { label: "Gallery",        ok: gallery >= 6, val: `${gallery}/6`, hint: gallery >= 6 ? "All slots filled" : `${6-gallery} slot(s) outstanding` },
    { label: "A+ modules",     ok: aplus >= 3, val: `${aplus}/3`, hint: aplus >= 3 ? "All 3 drafted" : `${3-aplus} module(s) outstanding` },
  ];
  const greenN = checks.filter(c => c.ok).length;
  const ready = greenN === checks.length;

  return (
    <div className="card preflight-card">
      <div className="card-h" style={{ borderBottom: 0, paddingBottom: 0 }}>
        <h3>Pre-flight</h3>
        <span className="meta">{greenN}/{checks.length} checks passing</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {ready
            ? <button className="btn sm primary" onClick={() => RD2.toast("Submitting listing to Amazon…", "ok")}>Submit to Amazon</button>
            : <button className="btn sm" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>Submit to Amazon</button>}
        </div>
      </div>
      <div className="preflight-grid">
        {checks.map(c => (
          <div key={c.label} className={`preflight-cell ${c.ok ? "ok" : "warn"}`}>
            <div className="preflight-row1">
              <span className="preflight-dot">{c.ok ? "✓" : "!"}</span>
              <span className="preflight-label">{c.label}</span>
              <span className="preflight-val mono">{c.val}</span>
            </div>
            <div className="preflight-hint">{c.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Status track (created → approved → live) ----------
function StatusTrack({ l }) {
  const steps = [
    { k: "created",  l: "Listing created",  d: l.created },
    { k: "approved", l: "Amazon approved",  d: l.approved },
    { k: "live",     l: "Live on Amazon",   d: l.live },
  ];
  return (
    <div className="lstatus">
      {steps.map(s => (
        <div key={s.k} className={`step ${s.d?.done ? "done" : ""}`}>
          <span className="ck">{s.d?.done ? "✓" : ""}</span>
          <div>
            <div className="lbl-stp">{s.l}</div>
            <div className="when">{s.d?.done
              ? `${RD2.person(s.d.by)?.name || "—"} · ${RD2.daysAgoLabel(s.d.daysAgo)}`
              : (s.d?.note || "Not started")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Copy workspace (title / bullets / keywords) ----------
function CopyWorkspace({ p, onDecide }) {
  const c = p.listing.content;
  const [versionsOpen, setVersionsOpen] = useLT(false);
  const editCopy = (patch) => onDecide && onDecide("__listingEditCopy", null, patch);

  // Faux version history for copy — lets April see her own iteration
  const copyVersions = [
    { v: 3, by: "april", daysAgo: 2, note: "Bumped collagen mg in title; tightened bullet 2", current: true },
    { v: 2, by: "april", daysAgo: 5, note: "Switched 'fast absorbing' to bullet 2; added stevia call-out" },
    { v: 1, by: "april", daysAgo: 8, note: "Initial draft from Claude PDF outline" },
  ];

  return (
    <div className="card">
      <div className="card-h">
        <h3>Copy</h3>
        <span className="meta">
          <RD2.Avatar user={RD2.person("april")} size="sm" /> April · v{copyVersions[0].v} · {RD2.daysAgoLabel(copyVersions[0].daysAgo)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn sm" onClick={() => setVersionsOpen(o => !o)}>
            {versionsOpen ? "Hide history" : `History (${copyVersions.length})`}
          </button>
          <button className="btn sm" onClick={() => RD2.toast(`Saved as v${copyVersions.length + 1}`, "ok")}>Save version</button>
        </div>
      </div>

      {versionsOpen && (
        <div className="copy-versions">
          {copyVersions.map(v => (
            <div key={v.v} className={`copy-ver-row ${v.current ? "current" : ""}`}>
              <span className="copy-ver-dot">{v.current ? "●" : "○"}</span>
              <span className="mono" style={{ width: 28, fontWeight: 600 }}>v{v.v}</span>
              {v.current && <span className="spec-ver-badge">CURRENT</span>}
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-2)" }}>{v.note}</span>
              <RD2.Avatar user={RD2.person(v.by)} size="sm" />
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", minWidth: 60, textAlign: "right" }}>{RD2.daysAgoLabel(v.daysAgo)}</span>
            </div>
          ))}
        </div>
      )}

      <CopyField
        label="Title"
        value={c.title}
        max={200}
        unit="chars"
        len={(c.title || "").length}
        block
        editable
        onChange={(v) => editCopy({ title: v })}
      />
      <CopyField
        label="Bullet points"
        bullets={c.bullets}
        editable
        onBulletChange={(i, v) => {
          const next = [...(c.bullets || [])];
          next[i] = v;
          editCopy({ bullets: next });
        }}
      />
      <CopyField
        label="Backend keywords"
        value={c.keywords}
        max={250}
        unit="bytes"
        len={c.keywordBytes || (c.keywords ? new Blob([c.keywords]).size : 0)}
        mono
        editable
        onChange={(v) => editCopy({ keywords: v, keywordBytes: new Blob([v]).size })}
      />
    </div>
  );
}

function CopyField({ label, value, max, unit, len, block, bullets, mono, editable, onChange, onBulletChange }) {
  const overLimit = len > max;
  const inputStyle = {
    width: "100%", border: "1px solid var(--line)", borderRadius: 6,
    padding: "8px 10px", fontFamily: mono ? "var(--mono, ui-monospace, monospace)" : "inherit",
    fontSize: 13, lineHeight: 1.5, background: "var(--bg-1, #fff)", color: "inherit",
    resize: "vertical", outline: "none",
  };
  return (
    <div className="copy-field">
      <div className="copy-field-h">
        <span className="copy-field-label">{label}</span>
        {max != null && (
          <span className={`copy-field-meter mono ${overLimit ? "over" : len > max * 0.9 ? "near" : ""}`}>
            {len}/{max} {unit}
          </span>
        )}
      </div>
      {bullets ? (
        <ul className="copy-bullets">
          {(bullets || []).map((b, i) => (
            <li key={i}>
              <span className="copy-bullet-num mono">{i+1}</span>
              {editable ? (
                <textarea
                  className="copy-bullet-text"
                  style={{ ...inputStyle, minHeight: 44 }}
                  value={b}
                  onChange={(e) => onBulletChange && onBulletChange(i, e.target.value)}
                />
              ) : (
                <span className="copy-bullet-text">{b}</span>
              )}
              <span className={`copy-bullet-len mono ${(b || "").length > 200 ? "over" : ""}`}>{(b || "").length}/200</span>
            </li>
          ))}
        </ul>
      ) : editable ? (
        block ? (
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={value || ""}
            onChange={(e) => onChange && onChange(e.target.value)}
          />
        ) : (
          <input
            style={inputStyle}
            value={value || ""}
            onChange={(e) => onChange && onChange(e.target.value)}
          />
        )
      ) : (
        <div className={`copy-field-val ${mono ? "mono" : ""} ${block ? "block" : ""}`}>{value}</div>
      )}
    </div>
  );
}

// ---------- Visual assets (main / gallery / A+) ----------
function VisualAssets({ p }) {
  const l = p.listing;

  return (
    <div className="card">
      <div className="card-h">
        <h3>Visual assets</h3>
        <span className="meta">9 slots · {(l.images.main.length + l.images.gallery.length + l.images.aplus.length)}/{1+6+3} delivered</span>
      </div>

      {/* Main image */}
      <AssetSection
        title="Main image"
        sub="White-bg hero, 2000×2000, no overlay text"
        owner={RD2.person("paresh")}
        slots={[{
          brief: l.images.mainBrief,
          delivery: l.images.main[0],
          aspectClass: "square",
          slotLabel: "Main",
        }]}
      />

      {/* Gallery */}
      <AssetSection
        title="Gallery"
        sub="Slots 2–7 — lifestyle, infographic, comparison, texture, lifestyle 2, trust badges"
        owner={RD2.person("qaiser")}
        slots={(l.images.galleryBriefs || []).map((brief, i) => ({
          brief,
          delivery: l.images.gallery[i],
          aspectClass: "square",
          slotLabel: `Slot ${i+2}`,
        }))}
      />

      {/* A+ modules */}
      <AssetSection
        title="A+ Content"
        sub="3 modules below the gallery on the listing page"
        owner={RD2.person("qaiser")}
        slots={(l.images.aplusBriefs || []).map((brief, i) => ({
          brief,
          delivery: l.images.aplus[i],
          aspectClass: "wide",
          slotLabel: `Module ${i+1}`,
        }))}
      />
    </div>
  );
}

function AssetSection({ title, sub, owner, slots }) {
  const delivered = slots.filter(s => s.delivery).length;
  const total = slots.length;
  return (
    <div className="asset-section">
      <div className="asset-section-h">
        <div>
          <div className="asset-section-title">{title}</div>
          <div className="asset-section-sub">{sub}</div>
        </div>
        <div className="asset-section-meta">
          <RD2.Avatar user={owner} size="sm" />
          <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{owner?.name}</span>
          <span className="mono" style={{ fontSize: 11, color: delivered === total ? "var(--ok)" : "var(--ink-3)" }}>{delivered}/{total}</span>
        </div>
      </div>
      <div className="asset-grid">
        {slots.map((s, i) => <AssetCard key={i} {...s} owner={owner} />)}
      </div>
    </div>
  );
}

function AssetCard({ brief, delivery, aspectClass, slotLabel, owner }) {
  return (
    <div className="asset-card">
      <div className={`asset-thumb ${aspectClass} ${delivery ? "filled" : "empty"}`}>
        <span className="asset-slot-label">{slotLabel}</span>
        {delivery
          ? <>
              <span className="asset-thumb-tag mono">v{delivery.n}</span>
              <span className="asset-thumb-by">{RD2.person(delivery.by)?.name}</span>
            </>
          : <span className="asset-thumb-empty">Awaiting</span>}
      </div>
      <div className="asset-brief">
        <div className="asset-brief-h">Brief</div>
        <div className="asset-brief-body">{brief || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>No brief yet</span>}</div>
      </div>
      <div className="asset-status">
        {delivery
          ? <span style={{ color: "var(--ok)", fontSize: 11.5, fontWeight: 500 }}>✓ Delivered · {RD2.daysAgoLabel(delivery.daysAgo)}</span>
          : <button className="btn xs" onClick={() => RD2.toast(`Pinged ${owner?.name?.split(" ")[0]}`)}>Ping {owner?.name?.split(" ")[0]}</button>}
      </div>
    </div>
  );
}

// ---------- Main ListingTab export ----------
// ---------- Mockup gate (Phase 2 unlock) ----------
function MockupGate({ p }) {
  const wf = p.wireframe;
  const labelApproved = wf?.status === "locked";
  const m = p.listing.mockup || {};
  const hasFront = !!m.front;
  const hasBack = !!m.back;
  const ready = labelApproved && hasFront && hasBack;

  const items = [
    { ok: labelApproved, label: "Label artwork approved", hint: labelApproved ? `Locked ${RD2.daysAgoLabel(wf.cheskyApprovedDaysAgo || 0)}` : "Waiting on Esty + Chesky in Packaging tab" },
    { ok: hasFront,      label: "Front mockup uploaded",  hint: hasFront ? "Ready" : "Esty hasn't delivered the front render yet" },
    { ok: hasBack,       label: "Back mockup uploaded",   hint: hasBack ? "Ready" : "Esty hasn't delivered the back render yet" },
  ];

  return (
    <div className="card" style={{ borderColor: ready ? "var(--ok)" : "var(--line)", background: ready ? "oklch(98% 0.02 150)" : "var(--bg-1)" }}>
      <div className="card-h" style={{ borderBottom: 0 }}>
        <h3>{ready ? "✓ Phase 2 unlocked — ready to build the listing" : "Phase 2 — Submission (locked)"}</h3>
        <span className="meta" style={{ marginLeft: "auto" }}>{items.filter(i => i.ok).length}/{items.length} ready</span>
      </div>
      <div style={{ padding: "10px 16px 14px", display: "grid", gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: it.ok ? "var(--ok)" : "var(--bg-2)", color: it.ok ? "#fff" : "var(--ink-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>{it.ok ? "✓" : "○"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: it.ok ? 500 : 400 }}>{it.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{it.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingTab({ p, currentUser, onDecide }) {
  if (!p.listing) {
    return <div className="empty" style={{ padding: 30 }}>Listing research unlocks once a spec sheet is attached.</div>;
  }
  const wf = p.wireframe;
  const labelApproved = wf?.status === "locked";
  const m = p.listing.mockup || {};
  const phase2Ready = labelApproved && m.front && m.back;
  const phase2Done = !!(p.listing.live?.done || p.listing.approved?.done);
  const amz = p.streams?.amazon;
  const phase3Available = phase2Done && !!amz;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* PHASE 1 — Research (always editable) */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ok)", textTransform: "uppercase" }}>Phase 1 · Research</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>April · always editable</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CopyWorkspace p={p} onDecide={onDecide} />
          <VisualAssets p={p} />
        </div>
      </div>

      {/* PHASE 2 — Submission (gated) */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, opacity: phase2Ready ? 1 : 0.85 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: phase2Ready ? "var(--ok)" : "var(--ink-3)", textTransform: "uppercase" }}>Phase 2 · Submission</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{phase2Ready ? "Ready to submit to Amazon" : "Locked — needs label + mockup"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MockupGate p={p} />
          {phase2Ready && (
            <>
              <PreflightCard p={p} />
              <StatusTrack l={p.listing} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { ListingTab });
