/* global React, RM */
// Direction C — PIPELINE
// Default screen: horizontal pager mirroring desktop pipeline columns.
// Idea / Niche / Approval / Build / Production. Swipe between stages.

const { useState: useSCC } = React;

function AvatarC({ user, size = 22 }) {
  if (!user) return null;
  return <div style={{ width: size, height: size, borderRadius: 99, background: user.color, color: "#fff",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.4, fontWeight: 600, flexShrink: 0 }}>{user.initials}</div>;
}
function BrandChipC({ b }) {
  return <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
    background: RM.brandBg(b), color: RM.brandColor(b), letterSpacing: "0.02em" }}>{b}</span>;
}

const STAGES = [
  { id: "idea",       label: "Idea Inbox" },
  { id: "niche",      label: "Niche Analysis" },
  { id: "approval",   label: "Niche Review" },
  { id: "build",      label: "Build" },
  { id: "production", label: "Production" },
];

// ===== Stage segmented pager nav =====
function StageNav({ active, onTap }) {
  return (
    <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 5,
      borderBottom: "0.5px solid #E7E7EB" }}>
      <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none",
        padding: "10px 12px", gap: 4 }}>
        {STAGES.map(s => {
          const isActive = active === s.id;
          const count = RM.PRODUCTS.filter(p => p.stage === s.id).length;
          return (
            <button key={s.id} onClick={() => onTap?.(s.id)}
              style={{ padding: "7px 12px", borderRadius: 99, border: 0,
                background: isActive ? "#0F0F11" : "transparent",
                color: isActive ? "#fff" : "#3D3F47",
                fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
                fontFamily: "inherit", display: "flex", gap: 6, alignItems: "center" }}>
              {s.label}
              <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Card variants per stage =====
function StageCard({ p }) {
  const owner = RM.person(p.owner);
  const blocker = p.blocker;

  if (p.stage === "build") {
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: blocker ? "1px solid #C12D2D" : "0.5px solid #E7E7EB",
        padding: 14, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
          <BrandChipC b={p.brand} />
          {blocker && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600,
            color: "#C12D2D", textTransform: "uppercase", letterSpacing: "0.05em" }}>● Stuck {blocker.days}d</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.012em", color: "#0F0F11" }}>{p.name}</div>

        {/* 3 stream rails */}
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(p.streams).map(([k, s]) => {
            const isStuck = blocker && blocker.stream === k;
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 56, fontSize: 10.5, fontWeight: 600, color: "#787A85",
                  textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#F1F1F4", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: s.pct + "%",
                    background: isStuck ? "#C12D2D" : s.pct === 100 ? "#0E8B4F" : "#1F66F5",
                    transition: "width 200ms" }}></div>
                </div>
                <div style={{ width: 30, textAlign: "right", fontSize: 11, color: "#3D3F47",
                  fontFamily: "ui-monospace, SFMono-Regular" }}>{s.pct}%</div>
              </div>
            );
          })}
        </div>

        {blocker && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#FBE9E9",
            fontSize: 11.5, color: "#C12D2D", lineHeight: 1.4 }}>
            {blocker.reason}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 6 }}>
          <AvatarC user={owner} size={20} />
          <span style={{ fontSize: 11.5, color: "#787A85" }}>{owner?.name}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#787A85" }}>{RM.ago(p.lastActivity)} ago</span>
        </div>
      </div>
    );
  }

  if (p.stage === "approval") {
    const joelDone = !!p.approvals.joel;
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #1F66F5",
        padding: 14, marginBottom: 10, boxShadow: "0 4px 14px rgba(31,102,245,0.10)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
          <BrandChipC b={p.brand} />
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "#1F66F5",
            textTransform: "uppercase", letterSpacing: "0.06em" }}>Awaiting you</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.012em", color: "#0F0F11" }}>{p.name}</div>
        <div style={{ fontSize: 12.5, color: "#3D3F47", marginTop: 4, lineHeight: 1.4 }}>{p.synopsis}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
          padding: "8px 10px", background: joelDone ? "#E5F3EC" : "#F4F4F6", borderRadius: 8 }}>
          <AvatarC user={RM.person("joel")} size={18} />
          <span style={{ fontSize: 11.5, fontWeight: 500 }}>Joel</span>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600,
            color: joelDone ? "#0E8B4F" : "#787A85" }}>{joelDone ? "✓ Approved" : "Pending"}</span>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button style={{ flex: 1, background: "#FBE9E9", color: "#C12D2D", border: 0, borderRadius: 8,
            padding: "9px 0", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Reject</button>
          <button style={{ flex: 2, background: "#0E8B4F", color: "#fff", border: 0, borderRadius: 8,
            padding: "9px 0", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>Approve →</button>
        </div>
      </div>
    );
  }

  if (p.stage === "niche") {
    const isParsed = p.nicheSubState === "parsed";
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #E7E7EB",
        padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
          <BrandChipC b={p.brand} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.012em", color: "#0F0F11" }}>{p.name}</div>
        <div style={{ fontSize: 12.5, color: "#3D3F47", marginTop: 4, lineHeight: 1.4 }}>{p.synopsis}</div>
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8,
          background: isParsed ? "#E5F3EC" : "#FBF1E2",
          fontSize: 11.5, fontWeight: 500,
          color: isParsed ? "#0E8B4F" : "#B86A12",
          display: "flex", alignItems: "center", gap: 6 }}>
          {isParsed ? "✓ Doc parsed · ready to submit" : `⏱ Researching · ${p.researchingDaysAgo}d`}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 6 }}>
          <AvatarC user={owner} size={20} />
          <span style={{ fontSize: 11.5, color: "#787A85" }}>{owner?.name}</span>
        </div>
      </div>
    );
  }

  // idea / production — simple
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #E7E7EB",
      padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
        <BrandChipC b={p.brand} />
        {p.stage === "production" && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#6C3DBE", fontWeight: 600 }}>{p.poStatus} · {p.eta}d</span>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.012em", color: "#0F0F11" }}>{p.name}</div>
      {p.synopsis && <div style={{ fontSize: 12.5, color: "#3D3F47", marginTop: 4, lineHeight: 1.4 }}>{p.synopsis}</div>}
      <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 6 }}>
        <AvatarC user={owner} size={20} />
        <span style={{ fontSize: 11.5, color: "#787A85" }}>{owner?.name} · {RM.ago(p.lastActivity)} ago</span>
        {p.stage === "idea" && (
          <button style={{ marginLeft: "auto", background: "#EAF1FE", color: "#1F66F5", border: 0,
            borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit" }}>
            Promote →
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Pipeline screen (home) =====
function PipelineScreen({ stage = "approval" }) {
  const items = RM.PRODUCTS.filter(p => p.stage === stage);
  const stageInfo = STAGES.find(s => s.id === stage);
  return (
    <div style={{ background: "#FAFAFB", minHeight: "100%", paddingBottom: 90 }}>
      {/* Top header */}
      <div style={{ padding: "10px 16px 8px", background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#787A85", fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.06em" }}>R&D Pipeline</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.018em", margin: "1px 0 0", color: "#0F0F11" }}>
            All products
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ width: 38, height: 38, borderRadius: 99, background: "#F4F4F6",
            border: 0, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>⌕</button>
          <button style={{ width: 38, height: 38, borderRadius: 99, background: "#0F0F11",
            color: "#fff", border: 0, fontSize: 22, fontWeight: 300, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontFamily: "inherit" }}>+</button>
        </div>
      </div>

      <StageNav active={stage} />

      {/* Stage header bar */}
      <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "baseline", gap: 6 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", margin: 0, color: "#0F0F11" }}>{stageInfo.label}</h2>
        <span style={{ fontSize: 12.5, color: "#787A85" }}>{items.length} {items.length === 1 ? "item" : "items"}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#787A85" }}>‹ ›</span>
      </div>

      <div style={{ padding: "0 16px" }}>
        {items.map(p => <StageCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}

// ===== Bottom tabs (4) =====
function TabBarC({ active, onTap }) {
  const tabs = [
    { id: "pipeline", label: "Pipeline", icon: "▦" },
    { id: "feed",     label: "Feed",     icon: "≡" },
    { id: "people",   label: "People",   icon: "◐" },
    { id: "me",       label: "Me",       icon: "◉" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 86, paddingBottom: 22, paddingTop: 6,
      display: "flex", background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "0.5px solid rgba(0,0,0,0.08)", zIndex: 10 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTap?.(t.id)}
          style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: active === t.id ? "#0F0F11" : "#787A85", padding: "6px 0", fontFamily: "inherit" }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</div>
          <div style={{ fontSize: 10.5, fontWeight: 500 }}>{t.label}</div>
        </button>
      ))}
    </div>
  );
}

window.DirC = { PipelineScreen, TabBarC };
