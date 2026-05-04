/* global React, RM */
// Direction A — INBOX
// Default screen is one feed of items needing Chesky, sorted by urgency.
// Like Linear's notifications or email triage. Bottom tabs.

const { useState: useSAA } = React;

// ===== Atoms shared with this direction =====
function Avatar({ user, size = 24 }) {
  if (!user) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: 99, background: user.color, color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600, flexShrink: 0 }}>{user.initials}</div>
  );
}
function BrandChip({ b }) {
  return <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
    background: RM.brandBg(b), color: RM.brandColor(b), letterSpacing: "0.02em" }}>{b}</span>;
}
function StagePill({ s }) {
  const i = RM.stageInfo(s);
  return <span style={{ fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 99,
    background: i.bg, color: i.color }}>{i.label}</span>;
}

// ===== Inbox row — the workhorse =====
function InboxRow({ item, onTap }) {
  const u = RM.person(item.fromUser);
  const dot = item.urgent ? "#C12D2D" : item.unread ? "#1F66F5" : "transparent";
  return (
    <button onClick={onTap}
      style={{ width: "100%", textAlign: "left", background: "transparent", border: 0,
        padding: "12px 16px", display: "flex", gap: 11, borderBottom: "0.5px solid #E7E7EB",
        cursor: "pointer", font: "inherit", color: "inherit" }}>
      <div style={{ width: 8, display: "flex", alignItems: "flex-start", paddingTop: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: 99, background: dot }}></div>
      </div>
      <Avatar user={u} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 11.5, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>{item.code}</span>
          <BrandChip b={item.brand} />
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#787A85" }}>{RM.ago(item.at)}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, letterSpacing: "-0.01em",
          marginTop: 1, color: "#0F0F11" }}>{item.title}</div>
        <div style={{ fontSize: 12.5, color: "#3D3F47", marginTop: 3, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.preview}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 7px", borderRadius: 4,
            background: item.kindBg, color: item.kindColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {item.kind}
          </span>
        </div>
      </div>
    </button>
  );
}

// Build inbox items from data
function buildInboxItems() {
  const items = [];
  // Approvals waiting on you
  RM.PRODUCTS.filter(p => p.stage === "approval" && p.waitingOn === "chesky").forEach(p => {
    items.push({
      id: "approve-" + p.id, productId: p.id, code: p.code, brand: p.brand,
      title: "Niche review · " + p.name,
      preview: p.recommendation || p.synopsis,
      fromUser: p.owner, at: p.lastActivity,
      kind: "Approval", kindBg: "#EAF1FE", kindColor: "#1F66F5",
      unread: true, urgent: p.urgency === "high",
    });
  });
  // Mentions
  RM.MENTIONS.forEach(m => {
    const p = RM.PRODUCTS.find(x => x.id === m.productId);
    items.push({
      id: "ment-" + m.productId + "-" + m.from, productId: p.id, code: p.code, brand: p.brand,
      title: p.name,
      preview: m.text.replace("@chesky", ""),
      fromUser: m.from, at: m.at,
      kind: "Mention", kindBg: "#FBF1E2", kindColor: "#B86A12",
      unread: true,
    });
  });
  // Blockers — stuck > 5d
  RM.PRODUCTS.filter(p => p.blocker && p.blocker.days > 5).forEach(p => {
    items.push({
      id: "block-" + p.id, productId: p.id, code: p.code, brand: p.brand,
      title: "Blocker · " + p.name,
      preview: p.blocker.reason + " · " + p.blocker.days + "d in this state",
      fromUser: p.streams?.[p.blocker.stream]?.owner || p.owner,
      at: p.lastActivity,
      kind: "Stuck", kindBg: "#FBE9E9", kindColor: "#C12D2D",
      urgent: true, unread: false,
    });
  });
  return items.sort((a, b) => a.at - b.at);
}

// ===== Tab bar =====
function TabBar({ active, onTap }) {
  const tabs = [
    { id: "inbox",    label: "Inbox",    icon: "✦", count: 5 },
    { id: "pipeline", label: "Pipeline", icon: "▦" },
    { id: "ideas",    label: "Ideas",    icon: "+" },
    { id: "people",   label: "People",   icon: "◐" },
    { id: "me",       label: "Me",       icon: "◉" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 86,
      paddingBottom: 22, paddingTop: 6, display: "flex",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "0.5px solid rgba(0,0,0,0.08)", zIndex: 10 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTap?.(t.id)}
          style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: active === t.id ? "#1F66F5" : "#787A85", padding: "6px 0", fontFamily: "inherit" }}>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</div>
            {t.count && (
              <div style={{ position: "absolute", top: -3, right: -8, minWidth: 16, height: 16, padding: "0 4px",
                borderRadius: 99, background: "#C12D2D", color: "#fff",
                fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {t.count}
              </div>
            )}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500 }}>{t.label}</div>
        </button>
      ))}
    </div>
  );
}

// ===== Screen 1: Inbox (Home) =====
function InboxScreen() {
  const items = buildInboxItems();
  const today = items.filter(i => i.at < 1);
  const earlier = items.filter(i => i.at >= 1);
  return (
    <div style={{ paddingBottom: 90, background: "#FAFAFB", minHeight: "100%" }}>
      {/* Large title */}
      <div style={{ padding: "8px 16px 12px", background: "#FAFAFB",
        position: "sticky", top: 0, zIndex: 5, borderBottom: "0.5px solid #E7E7EB" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "#0F0F11" }}>Inbox</h1>
          <span style={{ fontSize: 14, color: "#787A85" }}>{items.length} items</span>
        </div>
        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { l: "All", n: items.length, active: true },
            { l: "Approvals", n: items.filter(i => i.kind === "Approval").length },
            { l: "Mentions", n: items.filter(i => i.kind === "Mention").length },
            { l: "Stuck", n: items.filter(i => i.kind === "Stuck").length },
          ].map(c => (
            <span key={c.l} style={{
              padding: "5px 11px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
              background: c.active ? "#0F0F11" : "#fff", color: c.active ? "#fff" : "#3D3F47",
              border: c.active ? "0" : "0.5px solid #E7E7EB", whiteSpace: "nowrap"
            }}>
              {c.l} <span style={{ opacity: 0.6, marginLeft: 2 }}>{c.n}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 600, color: "#787A85",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>Today</div>
      {today.map(i => <InboxRow key={i.id} item={i} />)}

      <div style={{ padding: "16px 16px 4px", fontSize: 11, fontWeight: 600, color: "#787A85",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>Earlier</div>
      {earlier.map(i => <InboxRow key={i.id} item={i} />)}
    </div>
  );
}

// ===== Screen 2: Approval detail (swipe-to-approve UX) =====
function ApprovalDetailScreen() {
  const p = RM.PRODUCTS.find(x => x.id === "A-150");
  const joel = p.approvals.joel;
  return (
    <div style={{ paddingBottom: 90, background: "#FAFAFB", minHeight: "100%" }}>
      {/* Back nav */}
      <div style={{ padding: "8px 8px 0", display: "flex", alignItems: "center", gap: 4 }}>
        <button style={{ background: "transparent", border: 0, color: "#1F66F5", fontSize: 16, padding: "8px 8px",
          cursor: "pointer", fontFamily: "inherit" }}>‹ Inbox</button>
      </div>

      <div style={{ padding: "8px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
          <BrandChip b={p.brand} />
          <StagePill s={p.stage} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: "4px 0 8px", color: "#0F0F11" }}>{p.name}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3D3F47", margin: 0 }}>{p.synopsis}</p>
      </div>

      {/* Verdict card */}
      <div style={{ margin: "0 16px 14px", padding: 14, borderRadius: 12, background: "#fff",
        border: "1px solid #0E8B4F", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#0E8B4F", textTransform: "uppercase",
          letterSpacing: "0.08em" }}>R&D Verdict</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0E8B4F", letterSpacing: "-0.015em",
          margin: "2px 0 6px" }}>{p.nicheVerdict}</div>
        <div style={{ fontSize: 13, color: "#0F0F11", lineHeight: 1.45 }}>{p.recommendation}</div>
      </div>

      {/* Market card */}
      <div style={{ margin: "0 16px 14px", padding: 14, borderRadius: 12, background: "#fff",
        border: "0.5px solid #E7E7EB" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#787A85", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 8 }}>Market</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(p.market).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10.5, color: "#787A85", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
              <div style={{ fontSize: 17, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular", color: "#0F0F11", marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Approval slots */}
      <div style={{ margin: "0 16px 14px", padding: 14, borderRadius: 12, background: "#fff",
        border: "0.5px solid #E7E7EB" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#787A85", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 10 }}>Dual Approval Required</div>
        {/* Joel — done */}
        <div style={{ padding: 10, borderRadius: 8, background: "#E5F3EC", marginBottom: 8,
          display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Avatar user={RM.person("joel")} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Joel</span>
              <span style={{ fontSize: 11, color: "#787A85" }}>· Finance</span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#0E8B4F" }}>✓ Approved</span>
            </div>
            <div style={{ fontSize: 12, color: "#3D3F47", fontStyle: "italic", marginTop: 4, lineHeight: 1.4 }}>
              "{joel.note}"
            </div>
            <div style={{ fontSize: 10.5, color: "#787A85", marginTop: 2 }}>{RM.ago(joel.at)} ago</div>
          </div>
        </div>
        {/* Chesky — pending */}
        <div style={{ padding: 10, borderRadius: 8, background: "#FAFAFB",
          border: "1.5px solid #1F66F5",
          display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Avatar user={RM.person("chesky")} size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>You</span>
              <span style={{ fontSize: 11, color: "#787A85" }}>· Overseer</span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#1F66F5" }}>Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky action bar at bottom (above tab bar) */}
      <div style={{ position: "absolute", bottom: 86, left: 0, right: 0, padding: "10px 16px 12px",
        background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
        borderTop: "0.5px solid #E7E7EB", display: "flex", gap: 8, zIndex: 9 }}>
        <button style={{ flex: 1, background: "#FBE9E9", color: "#C12D2D", border: 0, borderRadius: 12,
          padding: "13px 0", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>Reject</button>
        <button style={{ flex: 1, background: "#FBF1E2", color: "#B86A12", border: 0, borderRadius: 12,
          padding: "13px 0", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>Changes</button>
        <button style={{ flex: 2, background: "#0E8B4F", color: "#fff", border: 0, borderRadius: 12,
          padding: "13px 0", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>Approve →</button>
      </div>
    </div>
  );
}

// ===== Screen 3: Idea capture =====
function IdeaCaptureScreen() {
  return (
    <div style={{ background: "#FAFAFB", minHeight: "100%", paddingBottom: 90 }}>
      <div style={{ padding: "8px 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button style={{ background: "transparent", border: 0, color: "#1F66F5", fontSize: 16,
            padding: "6px 0", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button style={{ background: "transparent", border: 0, color: "#787A85", fontSize: 15,
            fontWeight: 600, padding: "6px 0", fontFamily: "inherit" }}>Save</button>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "12px 0 4px", color: "#0F0F11" }}>New idea</h1>
        <div style={{ fontSize: 13, color: "#787A85" }}>Quick capture — flesh it out later in Niche Analysis.</div>
      </div>

      <div style={{ background: "#fff", padding: "0 16px", borderTop: "0.5px solid #E7E7EB", borderBottom: "0.5px solid #E7E7EB" }}>
        <div style={{ padding: "12px 0", borderBottom: "0.5px solid #F1F1F4" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#787A85", textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 4 }}>Working name</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: "#0F0F11" }}>Lymphatic Drainage Tea</div>
        </div>
        <div style={{ padding: "12px 0", borderBottom: "0.5px solid #F1F1F4", display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#787A85", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Brand</div>
            <div style={{ fontSize: 15, color: "#0F0F11" }}>DON</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#787A85", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Format</div>
            <div style={{ fontSize: 15, color: "#0F0F11" }}>Tea</div>
          </div>
        </div>
        <div style={{ padding: "12px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#787A85", textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 4 }}>Why?</div>
          <div style={{ fontSize: 14.5, color: "#0F0F11", lineHeight: 1.5 }}>
            TikTok bloating-cure search up 280%. No premium tea brand owns this category yet — we have shelf credibility.
          </div>
          <div style={{ fontSize: 11.5, color: "#787A85", marginTop: 8, marginBottom: 2 }}>132 / 280</div>
        </div>
      </div>

      <div style={{ padding: "16px 16px" }}>
        <button style={{ width: "100%", background: "#1F66F5", color: "#fff", border: 0, borderRadius: 12,
          padding: "14px 0", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          Capture idea →
        </button>
      </div>
    </div>
  );
}

window.DirA = { InboxScreen, ApprovalDetailScreen, IdeaCaptureScreen, TabBar };
