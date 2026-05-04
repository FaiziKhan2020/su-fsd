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
  const titleLen = l.content.title.length;
  const bulletCount = l.content.bullets.length;
  const longBullets = l.content.bullets.filter(b => b.length > 200).length;
  const kwBytes = l.content.keywordBytes;
  const main = l.images.main.length;
  const gallery = l.images.gallery.length;
  const aplus = l.images.aplus.length;

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
            ? <button className="btn sm primary">Submit to Amazon</button>
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
function CopyWorkspace({ p }) {
  const c = p.listing.content;
  const [versionsOpen, setVersionsOpen] = useLT(false);

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
          <button className="btn sm">Save version</button>
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
        len={c.title.length}
        block
      />
      <CopyField
        label="Bullet points"
        bullets={c.bullets}
      />
      <CopyField
        label="Backend keywords"
        value={c.keywords}
        max={250}
        unit="bytes"
        len={c.keywordBytes}
        mono
      />
    </div>
  );
}

function CopyField({ label, value, max, unit, len, block, bullets, mono }) {
  const overLimit = len > max;
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
          {bullets.map((b, i) => (
            <li key={i}>
              <span className="copy-bullet-num mono">{i+1}</span>
              <span className="copy-bullet-text">{b}</span>
              <span className={`copy-bullet-len mono ${b.length > 200 ? "over" : ""}`}>{b.length}/200</span>
            </li>
          ))}
        </ul>
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
          : <button className="btn xs">Ping {owner?.name?.split(" ")[0]}</button>}
      </div>
    </div>
  );
}

// ---------- Main ListingTab export ----------
function ListingTab({ p }) {
  if (!p.listing) {
    return <div className="empty" style={{ padding: 30 }}>Listing kicks off in build stage.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PreflightCard p={p} />
      <StatusTrack l={p.listing} />
      <CopyWorkspace p={p} />
      <VisualAssets p={p} />
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { ListingTab });
