/* global React, RM */
// Direction B — TODAY (briefing-driven)
// Default screen: card-stack briefing. "3 niche reviews waiting · 2 blockers · 4 ideas".
// Tap a card → list of those items. Glanceable, not list-heavy.

function AvatarB({ user, size = 24 }) {
  if (!user) return null;
  return <div style={{ width: size, height: size, borderRadius: 99, background: user.color, color: "#fff",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.4, fontWeight: 600, flexShrink: 0 }}>{user.initials}</div>;
}
function AvatarStackB({ users, size = 22 }) {
  return <div style={{ display: "flex" }}>
    {users.map((u, i) => (
      <div key={i} style={{ marginLeft: i === 0 ? 0 : -8, border: "1.5px solid #fff", borderRadius: 99 }}>
        <AvatarB user={u} size={size} />
      </div>
    ))}
  </div>;
}
function BrandChipB({ b }) {
  return <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
    background: RM.brandBg(b), color: RM.brandColor(b), letterSpacing: "0.02em" }}>{b}</span>;
}

// ===== Today screen =====
function TodayScreen() {
  const approvalsCount = RM.PRODUCTS.filter(p => p.stage === "approval" && p.waitingOn === "chesky").length;
  const blockerCount = RM.PRODUCTS.filter(p => p.blocker).length;
  const mentions = RM.MENTIONS.length;
  const ideasNew = RM.PRODUCTS.filter(p => p.stage === "idea" && p.lastActivity < 2).length;

  // Build briefing cards (priority-ordered)
  const cards = [
    {
      id: "approvals", priority: "primary",
      tagline: "Waiting on you", count: approvalsCount,
      title: "Niche reviews to approve",
      sub: "Both you and Joel must sign off",
      tint: "#1F66F5", tintBg: "#EAF1FE",
      items: RM.PRODUCTS.filter(p => p.stage === "approval" && p.waitingOn === "chesky"),
    },
    {
      id: "blockers", priority: "warn",
      tagline: "Aging", count: blockerCount,
      title: "Products stuck in build",
      sub: "Push someone or unblock",
      tint: "#C12D2D", tintBg: "#FBE9E9",
      items: RM.PRODUCTS.filter(p => p.blocker),
    },
    {
      id: "mentions", priority: "med",
      tagline: "Mentions", count: mentions,
      title: "People @-ed you",
      sub: "Quick reply or open thread",
      tint: "#B86A12", tintBg: "#FBF1E2",
      items: RM.MENTIONS,
    },
  ];

  return (
    <div style={{ background: "#FAFAFB", minHeight: "100%", paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px 18px" }}>
        <div style={{ fontSize: 12.5, color: "#787A85", fontWeight: 500, textTransform: "uppercase",
          letterSpacing: "0.06em", marginBottom: 2 }}>Sunday · May 3</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em",
          color: "#0F0F11", lineHeight: 1.1 }}>Good morning,<br />Chesky.</div>
        <div style={{ fontSize: 14.5, color: "#3D3F47", marginTop: 10, lineHeight: 1.45,
          maxWidth: 320 }}>
          You have <b style={{ color: "#0F0F11" }}>{approvalsCount} niche reviews</b> waiting,
          and <b style={{ color: "#C12D2D" }}>{blockerCount} blockers</b> aging.
        </div>
      </div>

      {/* Hero: primary card */}
      <BriefingCard card={cards[0]} />

      {/* Secondary cards */}
      <BriefingCard card={cards[1]} />
      <BriefingCard card={cards[2]} />

      {/* Activity teaser */}
      <div style={{ padding: "20px 20px 8px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", margin: 0, color: "#0F0F11" }}>Today on the team</h2>
        <span style={{ fontSize: 13, color: "#1F66F5", fontWeight: 500 }}>See all</span>
      </div>
      <div style={{ padding: "0 20px" }}>
        {RM.ACTIVITY.slice(0, 4).map(a => {
          const u = RM.person(a.user);
          const p = RM.PRODUCTS.find(x => x.id === a.productId);
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 0", borderBottom: "0.5px solid #E7E7EB" }}>
              <AvatarB user={u} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#0F0F11" }}>
                  <b>{u.name}</b> <span style={{ color: "#3D3F47" }}>{a.text}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 10.5, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p?.code}</span>
                  <span style={{ fontSize: 10.5, color: "#787A85" }}>· {RM.ago(a.ts)} ago</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BriefingCard({ card }) {
  const isPrimary = card.priority === "primary";
  return (
    <div style={{ margin: "0 16px 12px", padding: isPrimary ? 18 : 14,
      borderRadius: 16, background: "#fff",
      border: isPrimary ? `1.5px solid ${card.tint}` : "0.5px solid #E7E7EB",
      boxShadow: isPrimary ? `0 8px 24px ${card.tintBg}` : "0 1px 3px rgba(0,0,0,0.03)" }}>
      {/* Tagline + count */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: card.tint,
          textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.tagline}</span>
        <div style={{ minWidth: 22, height: 22, padding: "0 7px", borderRadius: 99,
          background: card.tint, color: "#fff", fontSize: 12, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{card.count}</div>
      </div>
      <div style={{ fontSize: isPrimary ? 22 : 17, fontWeight: 700, letterSpacing: "-0.018em",
        color: "#0F0F11", lineHeight: 1.2 }}>{card.title}</div>
      <div style={{ fontSize: 13, color: "#787A85", marginTop: 4, lineHeight: 1.4 }}>{card.sub}</div>

      {/* Inline preview of top item */}
      {isPrimary && card.items[0] && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: card.tintBg,
          display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: card.tint, fontFamily: "ui-monospace, SFMono-Regular", fontWeight: 600 }}>{card.items[0].code}</span>
              <BrandChipB b={card.items[0].brand} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F0F11" }}>{card.items[0].name}</div>
            <div style={{ fontSize: 11.5, color: "#3D3F47", marginTop: 2 }}>
              R&D verdict: <b style={{ color: "#0E8B4F" }}>{card.items[0].nicheVerdict}</b>
            </div>
          </div>
          <div style={{ fontSize: 24, color: card.tint }}>›</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: isPrimary ? 12 : 10 }}>
        <AvatarStackB users={card.items.slice(0, 3).map(it => RM.person(it.owner || it.from)).filter(Boolean)} size={20} />
        <button style={{ background: "transparent", border: 0, color: card.tint, fontSize: 13.5,
          fontWeight: 600, padding: "4px 0", cursor: "pointer", fontFamily: "inherit" }}>
          {isPrimary ? "Review now →" : "Open ›"}
        </button>
      </div>
    </div>
  );
}

// ===== Approvals queue (after tapping the card) — swipe deck =====
function ApprovalsQueueScreen() {
  const items = RM.PRODUCTS.filter(p => p.stage === "approval" && p.waitingOn === "chesky");
  return (
    <div style={{ background: "#FAFAFB", minHeight: "100%", paddingBottom: 90 }}>
      <div style={{ padding: "10px 12px 0", display: "flex", alignItems: "center" }}>
        <button style={{ background: "transparent", border: 0, color: "#1F66F5", fontSize: 16,
          padding: "8px", cursor: "pointer", fontFamily: "inherit" }}>‹ Today</button>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#787A85", padding: "8px" }}>1 of {items.length}</div>
      </div>

      <div style={{ padding: "8px 20px 14px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "#0F0F11" }}>Niche reviews</h1>
        <div style={{ fontSize: 13, color: "#787A85", marginTop: 3 }}>Tap to open · Swipe for next</div>
      </div>

      {/* Card stack — top card prominent */}
      <div style={{ position: "relative", margin: "0 16px", height: 480 }}>
        {items.slice(0, 3).map((p, i) => (
          <div key={p.id} style={{
            position: "absolute", inset: 0,
            top: i * 8, transform: `scale(${1 - i * 0.03})`,
            zIndex: 10 - i, opacity: i === 0 ? 1 : 0.45,
            background: "#fff", borderRadius: 16,
            border: "0.5px solid #E7E7EB",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            padding: 18, transformOrigin: "top center",
          }}>
            {i === 0 && <ApprovalCardContent p={p} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalCardContent({ p }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#787A85", fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
        <BrandChipB b={p.brand} />
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#787A85" }}>{RM.ago(p.lastActivity)} ago</span>
      </div>
      <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.018em", margin: 0, color: "#0F0F11", lineHeight: 1.2 }}>{p.name}</h2>
      <div style={{ fontSize: 13.5, color: "#3D3F47", marginTop: 8, lineHeight: 1.5 }}>{p.synopsis}</div>

      {/* Verdict pill */}
      <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "#E5F3EC",
        display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 99, background: "#0E8B4F", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#0E8B4F", textTransform: "uppercase", letterSpacing: "0.06em" }}>R&D verdict</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0E8B4F", letterSpacing: "-0.015em" }}>{p.nicheVerdict}</div>
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: "#0F0F11", marginTop: 10, lineHeight: 1.4 }}>
        <b>Recommendation: </b>{p.recommendation}
      </div>

      {/* Joel's stamp */}
      {p.approvals.joel && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#F4F4F6",
          display: "flex", alignItems: "flex-start", gap: 8 }}>
          <AvatarB user={RM.person("joel")} size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Joel <span style={{ color: "#0E8B4F", fontWeight: 600 }}>· approved</span></div>
            <div style={{ fontSize: 11.5, fontStyle: "italic", color: "#3D3F47", lineHeight: 1.4, marginTop: 2 }}>"{p.approvals.joel.note}"</div>
          </div>
        </div>
      )}

      {p.approvals.joel === null && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#FBF1E2",
          fontSize: 12, color: "#B86A12" }}>
          Waiting on Joel as well. He'll be notified when you decide.
        </div>
      )}

      <div style={{ flex: 1 }}></div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <button style={{ flex: 1, background: "#FBE9E9", color: "#C12D2D", border: 0, borderRadius: 10,
          padding: "12px 0", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Reject</button>
        <button style={{ flex: 1, background: "#FBF1E2", color: "#B86A12", border: 0, borderRadius: 10,
          padding: "12px 0", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Changes</button>
        <button style={{ flex: 2, background: "#0E8B4F", color: "#fff", border: 0, borderRadius: 10,
          padding: "12px 0", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>Approve</button>
      </div>
    </div>
  );
}

// ===== Bottom nav (tabs) — different from Dir A; smaller, content-focused =====
function TabBarB({ active, onTap }) {
  const tabs = [
    { id: "today",    label: "Today" },
    { id: "pipeline", label: "Pipeline" },
    { id: "ideas",    label: "+" },
    { id: "activity", label: "Activity" },
    { id: "me",       label: "Me" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 86, paddingBottom: 22, paddingTop: 6,
      display: "flex", background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "0.5px solid rgba(0,0,0,0.08)", zIndex: 10 }}>
      {tabs.map(t => {
        const isFab = t.id === "ideas";
        if (isFab) return (
          <div key={t.id} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <button onClick={() => onTap?.(t.id)} style={{ width: 50, height: 50, borderRadius: 99,
              background: "#0F0F11", color: "#fff", border: 0, fontSize: 28, fontWeight: 300,
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)", cursor: "pointer", fontFamily: "inherit",
              lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        );
        return (
          <button key={t.id} onClick={() => onTap?.(t.id)}
            style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer",
              fontSize: 13, fontWeight: active === t.id ? 600 : 500,
              color: active === t.id ? "#0F0F11" : "#787A85", fontFamily: "inherit" }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

window.DirB = { TodayScreen, ApprovalsQueueScreen, TabBarB };
