import { useState } from "react";

// ── Fonts ──────────────────────────────────────────────────────────────────
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap";
document.head.appendChild(FONT_LINK);

// ── Styles ─────────────────────────────────────────────────────────────────
const injectStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e8e6f0; font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #111; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes scan { 0%,100%{opacity:.3} 50%{opacity:1} }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
    .fade-up { animation: fadeUp .4s ease both; }
    textarea { resize: vertical; }
  `;
  document.head.appendChild(style);
};
injectStyles();

// ── WCAG Rules Engine (runs in browser) ───────────────────────────────────
const SEVERITY_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function parseHTMLToNodes(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = [];
  function walk(el, lineHint) {
    if (el.nodeType !== 1) return;
    const attrs = {};
    for (const a of el.attributes) attrs[a.name] = a.value;
    nodes.push({
      id: Math.random().toString(36).slice(2),
      tag: el.tagName.toLowerCase(),
      attrs,
      textContent: el.textContent?.trim() || "",
      children: [...el.children].map(c => c.tagName?.toLowerCase()),
      el,
    });
    for (const child of el.children) walk(child);
  }
  walk(doc.documentElement);
  return nodes;
}

const RULES = [
  {
    id: "missing-alt", wcag: "1.1.1", severity: "critical", label: "Missing Alt Text",
    disability: "visual",
    check(n) {
      if (n.tag !== "img") return null;
      if (!("alt" in n.attrs)) return `<img> missing alt attribute`;
      return null;
    },
    fix: `Add alt="description" (or alt="" for decorative images)`,
  },
  {
    id: "button-no-label", wcag: "4.1.2", severity: "critical", label: "Button No Label",
    disability: "visual",
    check(n) {
      if (n.tag !== "button") return null;
      if (!n.textContent && !n.attrs["aria-label"] && !n.attrs["title"]) return `<button> has no accessible name`;
      return null;
    },
    fix: `Add aria-label="action" or visible text inside button`,
  },
  {
    id: "link-vague", wcag: "2.4.4", severity: "serious", label: "Vague Link Text",
    disability: "visual",
    check(n) {
      if (n.tag !== "a") return null;
      const vague = ["click here", "here", "read more", "more", "link", ""];
      if (vague.includes(n.textContent.toLowerCase()) && !n.attrs["aria-label"]) {
        return `<a> has vague text: "${n.textContent || "(empty)"}"`;
      }
      return null;
    },
    fix: `Use descriptive text like "Read our accessibility guide"`,
  },
  {
    id: "input-no-label", wcag: "1.3.1", severity: "critical", label: "Input No Label",
    disability: "visual",
    check(n, all) {
      if (!["input", "select", "textarea"].includes(n.tag)) return null;
      if (n.attrs["type"] === "hidden") return null;
      const id = n.attrs["id"];
      const hasLinked = id && all.some(x => x.tag === "label" && x.attrs["for"] === id);
      if (!hasLinked && !n.attrs["aria-label"] && !n.attrs["title"]) {
        return `<${n.tag}> has no associated label`;
      }
      return null;
    },
    fix: `Add <label for="id"> or aria-label="..."`,
  },
  {
    id: "video-no-captions", wcag: "1.2.2", severity: "critical", label: "Video No Captions",
    disability: "hearing",
    check(n) {
      if (n.tag !== "video") return null;
      const hasCaptions = n.children.includes("track");
      if (!hasCaptions) return `<video> missing captions <track>`;
      return null;
    },
    fix: `Add <track kind="captions" src="subs.vtt" srclang="en">`,
  },
  {
    id: "autoplay", wcag: "1.4.2", severity: "serious", label: "Media Autoplay",
    disability: "hearing",
    check(n) {
      if (!["audio", "video"].includes(n.tag)) return null;
      if ("autoplay" in n.attrs && !("controls" in n.attrs)) return `<${n.tag}> autoplays without controls`;
      return null;
    },
    fix: `Add controls attribute or remove autoplay`,
  },
  {
    id: "missing-lang", wcag: "3.1.1", severity: "serious", label: "HTML Missing Lang",
    disability: "visual",
    check(n) {
      if (n.tag !== "html") return null;
      if (!n.attrs["lang"]) return `<html> missing lang attribute`;
      return null;
    },
    fix: `Add lang="en" to <html>`,
  },
  {
    id: "focus-removed", wcag: "2.4.7", severity: "serious", label: "Focus Outline Removed",
    disability: "motor",
    check(n) {
      const style = n.attrs["style"] || "";
      if (["button","a","input","select","textarea"].includes(n.tag) &&
          (style.includes("outline:none") || style.includes("outline: none") || style.includes("outline:0"))) {
        return `<${n.tag}> has outline removed — keyboard users can't see focus`;
      }
      return null;
    },
    fix: `Remove outline:none; use :focus-visible in CSS`,
  },
  {
    id: "form-no-submit", wcag: "3.2.2", severity: "moderate", label: "Form No Submit",
    disability: "motor",
    check(n) {
      if (n.tag !== "form") return null;
      const hasSubmit = n.children.includes("button") || n.children.includes("input");
      if (!hasSubmit) return `<form> has no submit button`;
      return null;
    },
    fix: `Add <button type="submit">Submit</button>`,
  },
];

function runScan(html, disabilities) {
  if (!html.trim()) return [];
  const nodes = parseHTMLToNodes(html);
  const issues = [];
  const seen = new Set();
  for (const node of nodes) {
    for (const rule of RULES) {
      if (!disabilities.includes(rule.disability)) continue;
      const msg = rule.check(node, nodes);
      if (msg) {
        const key = rule.id + node.id;
        if (!seen.has(key)) {
          seen.add(key);
          issues.push({ ...rule, message: msg, nodeTag: node.tag });
        }
      }
    }
  }
  return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function computeScore(issues) {
  return Math.max(0, 100
    - issues.filter(i => i.severity === "critical").length * 20
    - issues.filter(i => i.severity === "serious").length * 10
    - issues.filter(i => i.severity === "moderate").length * 5
    - issues.filter(i => i.severity === "minor").length * 2
  );
}

// ── Colors ─────────────────────────────────────────────────────────────────
const SEV = {
  critical: { bg: "#ff2d551a", border: "#ff2d55", text: "#ff2d55", dot: "#ff2d55" },
  serious:  { bg: "#ff9f0a1a", border: "#ff9f0a", text: "#ff9f0a", dot: "#ff9f0a" },
  moderate: { bg: "#0a84ff1a", border: "#0a84ff", text: "#0a84ff", dot: "#0a84ff" },
  minor:    { bg: "#30d1581a", border: "#30d158", text: "#30d158", dot: "#30d158" },
};
const PHASES = {
  Foundation: "#4f8ef7", Parser: "#00d4aa", Rules: "#a855f7",
  Fix: "#f97316", AI: "#ec4899", Disability: "#f59e0b", CLI: "#10b981",
};

// ── Steps Data ─────────────────────────────────────────────────────────────
const STEPS = [
  { n:1,  phase:"Foundation", title:"Define Core Types & Interfaces",       summary:"ScanInput, ScanOutput, AccessibilityIssue, AutoFix interfaces in TypeScript" },
  { n:2,  phase:"Foundation", title:"Modular Project Architecture",          summary:"parser/, rules/, fix/, ai/, disability/, cli/ folder structure" },
  { n:3,  phase:"Parser",     title:"HTML Parsing Pipeline",                 summary:"Raw HTML → traversable DOM tree using parse5" },
  { n:4,  phase:"Parser",     title:"JSX Parsing via Babel AST",             summary:"React JSX → AST nodes via @babel/parser + @babel/traverse" },
  { n:5,  phase:"Parser",     title:"Unified Internal Node Model",           summary:"Normalize HTML & JSX into single UATNode format" },
  { n:6,  phase:"Rules",      title:"Rule Interface Contract",               summary:"check() returns issues, fix() returns code changes" },
  { n:7,  phase:"Rules",      title:"WCAG Rule Implementations",             summary:"img alt, contrast, aria-label, heading order, link purpose" },
  { n:8,  phase:"Rules",      title:"Rule Runner Engine",                    summary:"Filter by disability, deduplicate, sort by severity" },
  { n:9,  phase:"Rules",      title:"Color Contrast Checker",                summary:"WCAG AA/AAA contrast ratio via relative luminance formula" },
  { n:10, phase:"Fix",        title:"Fix Engine Core",                       summary:"Generate CodeChange objects for each fixable issue" },
  { n:11, phase:"Fix",        title:"HTML Source Patcher",                   summary:"Add/remove attributes, replace text, insert elements" },
  { n:12, phase:"Fix",        title:"JSX AST Fixer",                         summary:"Mutate Babel AST directly, regenerate source with @babel/generator" },
  { n:13, phase:"Fix",        title:"Diff & Preview Generator",              summary:"Side-by-side unified diff patch for review" },
  { n:14, phase:"Fix",        title:"Compliance Report Generator",           summary:"WCAG score 0–100, severity breakdown, pass/fail summary" },
  { n:15, phase:"Fix",        title:"VS Code Extension Setup",               summary:"Manifest, activation events, command registration" },
  { n:16, phase:"Fix",        title:"Inline Diagnostic Squiggles",           summary:"Red/yellow underlines in editor with hover messages" },
  { n:17, phase:"Fix",        title:"Quick Fix Code Actions",                summary:"One-click fixes directly inside VS Code" },
  { n:18, phase:"AI",         title:"AI Alt Text Generator",                 summary:"Claude Vision API generates descriptive alt text for images" },
  { n:19, phase:"AI",         title:"AI ARIA Label Generator",               summary:"Claude suggests meaningful aria-labels for icon buttons" },
  { n:20, phase:"AI",         title:"AI Issue Explanation Layer",            summary:"Plain-English why + before/after code for each issue" },
  { n:21, phase:"Disability", title:"Visual Accessibility Module",           summary:"7 rules: alt text, contrast, aria, heading order, focus" },
  { n:22, phase:"Disability", title:"Hearing Accessibility Module",          summary:"Video captions, audio alternatives, autoplay block" },
  { n:23, phase:"Disability", title:"Motor Accessibility Module",            summary:"Tab order, 44px touch targets, keyboard traps" },
  { n:24, phase:"Disability", title:"Cognitive Accessibility Module",        summary:"Plain language, timeout warnings, consistent navigation" },
  { n:25, phase:"Disability", title:"Multi-Disability Scanner Orchestrator", summary:"Run all modules, merge issues, deduplicate, priority sort" },
  { n:26, phase:"Disability", title:"Disability Simulation Layer",           summary:"Screen reader order, color blindness filter simulation" },
  { n:27, phase:"CLI",        title:"CLI Tool (uat scan)",                   summary:"uat scan ./src --disabilities visual,hearing --fix" },
  { n:28, phase:"CLI",        title:"CI/CD Integration & GitHub Action",     summary:"Fail PRs automatically when critical issues found" },
];

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
  <head><title>Test Page</title></head>
  <body>
    <h1>Welcome</h1>
    <img src="hero.jpg">
    <a href="/guide">Click here</a>
    <button></button>
    <input type="text" placeholder="Your name">
    <video src="demo.mp4" autoplay></video>
    <form>
      <input type="email" id="email">
    </form>
  </body>
</html>`;

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("scanner"); // "scanner" | "guide"
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 60,
        borderBottom: "1px solid #1e1e2e",
        background: "#0d0d15",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #4f8ef7, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>♿</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: -0.5 }}>
            UAT
          </span>
          <span style={{ color: "#444", fontSize: 13 }}>Universal Accessibility Tool</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#111", borderRadius: 10, padding: 4 }}>
          {[["scanner","🔍 Live Scanner"], ["guide","📖 28-Step Guide"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: tab === id ? "#1e1e2e" : "transparent",
              color: tab === id ? "#fff" : "#666",
              transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>
      </header>

      {tab === "scanner" ? <ScannerTab /> : <GuideTab />}
    </div>
  );
}

// ── Scanner Tab ────────────────────────────────────────────────────────────
function ScannerTab() {
  const [html, setHtml] = useState(SAMPLE_HTML);
  const [disabilities, setDisabilities] = useState(["visual","hearing","motor","cognitive"]);
  const [issues, setIssues] = useState(null);
  const [scanning, setScanning] = useState(false);

  const toggleDisability = d => setDisabilities(p => p.includes(d) ? p.filter(x=>x!==d) : [...p, d]);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setIssues(runScan(html, disabilities));
      setScanning(false);
    }, 600);
  };

  const score = issues ? computeScore(issues) : null;
  const grade = score === null ? null : score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "F";
  const gradeColor = { A: "#30d158", B: "#0a84ff", C: "#ff9f0a", F: "#ff2d55" }[grade] ?? "#888";

  const DBADGES = [
    { id: "visual",    icon: "👁", label: "Visual" },
    { id: "hearing",   icon: "👂", label: "Hearing" },
    { id: "motor",     icon: "🖐", label: "Motor" },
    { id: "cognitive", icon: "🧠", label: "Cognitive" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeUp .5s ease" }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 42,
          background: "linear-gradient(135deg, #fff 30%, #a855f7)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 10, letterSpacing: -1,
        }}>
          Accessibility Scanner
        </h1>
        <p style={{ color: "#666", fontSize: 15 }}>
          Paste any HTML below — get real WCAG 2.1 issues instantly
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Disability toggles */}
          <div style={{
            background: "#111", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Scan For Disabilities
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DBADGES.map(({ id, icon, label }) => {
                const on = disabilities.includes(id);
                return (
                  <button key={id} onClick={() => toggleDisability(id)} style={{
                    padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${on ? "#4f8ef7" : "#222"}`,
                    background: on ? "#4f8ef71a" : "transparent",
                    color: on ? "#4f8ef7" : "#555", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all .2s",
                  }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HTML Input */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              HTML Code
            </div>
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%", minHeight: 340,
                background: "#0d0d15", border: "1px solid #1e1e2e",
                borderRadius: 12, padding: "16px",
                color: "#c9d1d9", fontFamily: "'DM Mono', monospace", fontSize: 12.5, lineHeight: 1.7,
                outline: "none",
              }}
            />
          </div>

          <button onClick={handleScan} disabled={scanning} style={{
            padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
            background: scanning ? "#1e1e2e" : "linear-gradient(135deg, #4f8ef7, #a855f7)",
            color: "#fff", fontSize: 14, fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            transition: "all .2s",
            animation: scanning ? "scan 1s ease infinite" : "none",
          }}>
            {scanning ? "⚡ Scanning..." : "🔍 Run Accessibility Scan"}
          </button>
        </div>

        {/* Right: Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {issues === null ? (
            <div style={{
              background: "#111", border: "1px dashed #1e1e2e", borderRadius: 14,
              padding: 48, textAlign: "center", color: "#333",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>♿</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: "#444" }}>
                Paste HTML and click Scan
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Issues will appear here</div>
            </div>
          ) : (
            <>
              {/* Score card */}
              <div style={{
                background: "#111", border: "1px solid #1e1e2e", borderRadius: 14,
                padding: "20px 24px", display: "flex", alignItems: "center", gap: 24,
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 52,
                    color: gradeColor, lineHeight: 1,
                  }}>{grade}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Grade</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#666" }}>WCAG Score</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#fff" }}>{score}/100</span>
                  </div>
                  <div style={{ height: 6, background: "#1e1e2e", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: gradeColor, borderRadius: 3, transition: "width 1s ease" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    {["critical","serious","moderate"].map(sev => (
                      <div key={sev}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 700, color: SEV[sev].text }}>
                          {issues.filter(i => i.severity === sev).length}
                        </div>
                        <div style={{ fontSize: 10, color: "#444", textTransform: "capitalize" }}>{sev}</div>
                      </div>
                    ))}
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 700, color: "#e8e6f0" }}>
                        {issues.length}
                      </div>
                      <div style={{ fontSize: 10, color: "#444" }}>Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
                {issues.length === 0 ? (
                  <div style={{
                    background: "#0d1f12", border: "1px solid #30d158", borderRadius: 12,
                    padding: 24, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 32 }}>✅</div>
                    <div style={{ color: "#30d158", fontFamily: "'Syne',sans-serif", fontWeight: 700, marginTop: 8 }}>
                      No issues found!
                    </div>
                  </div>
                ) : issues.map((issue, i) => (
                  <div key={i} className="fade-up" style={{
                    background: SEV[issue.severity].bg,
                    border: `1px solid ${SEV[issue.severity].border}22`,
                    borderLeft: `3px solid ${SEV[issue.severity].border}`,
                    borderRadius: 10, padding: "12px 16px",
                    animationDelay: `${i * 0.04}s`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e6f0" }}>{issue.message}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: SEV[issue.severity].border + "22",
                        color: SEV[issue.severity].text, flexShrink: 0,
                        textTransform: "uppercase",
                      }}>{issue.severity}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#555" }}>
                        WCAG {issue.wcag}
                      </span>
                      <span style={{ fontSize: 10, color: "#30d158" }}>💡 {issue.fix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Guide Tab ──────────────────────────────────────────────────────────────
function GuideTab() {
  const [expanded, setExpanded] = useState(new Set());
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const toggle = n => setExpanded(p => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; });
  const visible = STEPS.filter(s =>
    (filter === "All" || s.phase === filter) &&
    (!search || s.title.toLowerCase().includes(search.toLowerCase()) || s.summary.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 38,
          background: "linear-gradient(135deg, #fff 30%, #4f8ef7)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: -1, marginBottom: 8,
        }}>28-Step Developer Guide</h1>
        <p style={{ color: "#555", fontSize: 14 }}>Complete implementation roadmap for UAT</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search steps..."
          style={{
            flex: "1 1 200px", padding: "9px 14px", borderRadius: 10,
            background: "#111", border: "1px solid #1e1e2e", color: "#e8e6f0",
            fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif",
          }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{
          padding: "9px 14px", borderRadius: 10, background: "#111",
          border: "1px solid #1e1e2e", color: "#e8e6f0", fontSize: 13, cursor: "pointer",
        }}>
          <option>All</option>
          {Object.keys(PHASES).map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => setExpanded(new Set(visible.map(s=>s.n)))} style={{
          padding: "9px 16px", borderRadius: 10, border: "1px solid #1e1e2e",
          background: "#111", color: "#4f8ef7", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Expand All</button>
        <button onClick={() => setExpanded(new Set())} style={{
          padding: "9px 16px", borderRadius: 10, border: "1px solid #1e1e2e",
          background: "#111", color: "#666", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Collapse</button>
      </div>

      {/* Phase pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {["All", ...Object.keys(PHASES)].map(p => (
          <button key={p} onClick={() => setFilter(p)} style={{
            padding: "4px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            background: filter === p ? (PHASES[p] ?? "#4f8ef7") + "33" : "#111",
            color: filter === p ? (PHASES[p] ?? "#4f8ef7") : "#555",
            fontSize: 12, fontWeight: 700,
            outline: filter === p ? `1px solid ${PHASES[p] ?? "#4f8ef7"}` : "none",
          }}>{p}</button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map(step => {
          const phColor = PHASES[step.phase];
          const open = expanded.has(step.n);
          return (
            <div key={step.n} onClick={() => toggle(step.n)} style={{
              background: "#111", border: `1px solid ${open ? phColor + "44" : "#1e1e2e"}`,
              borderLeft: `3px solid ${phColor}`,
              borderRadius: 12, padding: "14px 18px", cursor: "pointer",
              transition: "all .2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: phColor + "22",
                  color: phColor, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{step.n}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#e8e6f0" }}>{step.title}</div>
                  {open && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{step.summary}</div>}
                </div>
                <span style={{ fontSize: 11, color: phColor, fontWeight: 700 }}>{step.phase}</span>
                <span style={{ fontSize: 10, color: "#444" }}>{open ? "▲" : "▼"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#333" }}>
        UAT · 28 Steps · WCAG 2.1 AA/AAA · {visible.length} of {STEPS.length} shown
      </div>
    </div>
  );
}
