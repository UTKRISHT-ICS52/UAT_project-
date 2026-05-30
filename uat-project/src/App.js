import { useState } from "react";

// ─── Color palette per phase ───────────────────────────────────────────────
const PHASES = {
  Foundation: { color: "#4f8ef7", bg: "#eef4ff", border: "#bfd4ff" },
  Parser:     { color: "#00d4aa", bg: "#e8fff8", border: "#9fe8cf" },
  Rules:      { color: "#a855f7", bg: "#f5eeff", border: "#d8b4fe" },
  Fix:        { color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  AI:         { color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8" },
  Disability: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  CLI:        { color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
};

// ─── All 28 steps ─────────────────────────────────────────────────────────
const STEPS = [
  {
    n: 1, phase: "Foundation", title: "Define Core Types & Interfaces",
    what: "Poore project ka foundation — ScanInput, ScanOutput, AccessibilityIssue aur AutoFix interfaces TypeScript mein define karo.",
    code: `// src/types.ts
interface ScanInput {
  html?: string;
  jsxCode?: string;
  url?: string;
  disabilities: ('visual'|'hearing'|'motor'|'cognitive')[];
}
interface ScanOutput {
  issues: AccessibilityIssue[];
  fixes: AutoFix[];
  report: ComplianceReport;
  wcagScore: number; // 0–100
}
interface AccessibilityIssue {
  id: string;
  rule: string;         // "missing-alt-text"
  severity: 'critical'|'serious'|'moderate'|'minor';
  element: string;      // CSS selector
  line: number;
  disability: string;
  message: string;
}`,
    tools: "TypeScript, Zod validation, JSON Schema",
    out: "types.ts — all shared interfaces",
  },
  {
    n: 2, phase: "Foundation", title: "Modular Project Architecture",
    what: "Poora project alag-alag folders mein divide karo — parser, rules, fix engine, AI, disability modules, simulation, CLI, editor.",
    code: `uat/
├── src/
│   ├── parser/       // Steps 3-5: HTML + JSX parsing
│   │   ├── html.ts
│   │   ├── jsx.ts
│   │   └── node-model.ts
│   ├── rules/        // Steps 6-9: Rule engine
│   │   ├── interface.ts
│   │   ├── wcag-rules.ts
│   │   └── runner.ts
│   ├── fix/          // Steps 10-13: Fix engine
│   │   ├── engine.ts
│   ├── ai/           // Steps 18-20: AI layer
│   ├── disability/   // Steps 21-25: Per-disability modules
│   ├── simulation/   // Step 26
│   ├── cli/          // Step 27
│   └── editor/       // Steps 15-17
├── tests/
└── package.json`,
    tools: "Node.js, TypeScript, npm workspaces",
    out: "Clean folder structure with separation of concerns",
  },
  {
    n: 3, phase: "Parser", title: "HTML Parsing Pipeline",
    what: "Raw HTML string ko traversable DOM tree mein convert karo jisme har node ka tag, attributes, children, aur line number ho.",
    code: `// src/parser/html.ts
// Uses: parse5 (install via: npm install parse5)
import * as parse5 from 'parse5';

function parseHTML(html: string): UATNode {
  const doc = parse5.parse(html, { sourceCodeLocationInfo: true });
  return buildNodeTree(doc);
}

function buildNodeTree(node: any): UATNode {
  return {
    tag: node.tagName ?? '#text',
    attrs: Object.fromEntries(
      (node.attrs ?? []).map((a: any) => [a.name, a.value])
    ),
    children: (node.childNodes ?? []).map(buildNodeTree),
    line: node.sourceCodeLocation?.startLine ?? 0,
    source: 'html'
  };
}`,
    tools: "parse5, htmlparser2",
    out: "parseHTML() → UATNode tree",
  },
  {
    n: 4, phase: "Parser", title: "JSX Parsing via AST",
    what: "React JSX ko Babel AST mein convert karo — traverse karke har JSX element nikalo.",
    code: `// src/parser/jsx.ts
// Uses: @babel/parser, @babel/traverse (npm install)
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

function parseJSX(code: string): UATNode[] {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  const nodes: UATNode[] = [];
  traverse(ast, {
    JSXElement(path: any) {
      const el = path.node.openingElement;
      nodes.push({
        tag: (el.name as any).name,
        attrs: Object.fromEntries(
          el.attributes.map((a: any) => [a.name?.name, a.value?.value ?? true])
        ),
        line: el.loc?.start.line ?? 0,
        jsxPath: path,
        source: 'jsx'
      });
    }
  });
  return nodes;
}`,
    tools: "@babel/parser, @babel/traverse",
    out: "parseJSX() → UATNode[] with paths",
  },
  {
    n: 5, phase: "Parser", title: "Unified Internal Node Model",
    what: "HTML aur JSX dono ke nodes ko ek common UATNode format mein normalize karo.",
    code: `// src/parser/node-model.ts
interface UATNode {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  textContent: string;
  children: UATNode[];
  parent: UATNode | null;
  line: number;
  source: 'html' | 'jsx';
  jsxPath?: any;
}
function normalizeNode(raw: any, src: 'html'|'jsx'): UATNode {
  return {
    id: crypto.randomUUID(),
    tag: raw.tagName ?? raw.name ?? 'unknown',
    attrs: extractAttrs(raw),
    textContent: extractText(raw),
    children: [],
    parent: null,
    line: raw.loc?.start?.line ?? raw.sourceCodeLocation?.startLine ?? 0,
    source: src
  };
}`,
    tools: "TypeScript interfaces",
    out: "UATNode — single unified node type",
  },
  {
    n: 6, phase: "Rules", title: "Rule Interface Contract",
    what: "Har accessibility rule ka same interface hoga — check() issue deta hai, fix() code change deta hai.",
    code: `// src/rules/interface.ts
interface AccessibilityRule {
  id: string;            // "missing-alt-text"
  name: string;
  wcagCriteria: string;  // "1.1.1"
  severity: Severity;
  disabilities: DisabilityType[];
  
  check(node: UATNode, context: RuleContext): Issue[];
  fix?(node: UATNode, issue: Issue): CodeChange;
}
interface CodeChange {
  type: 'add-attr' | 'remove-attr' | 'replace-text' | 'add-element';
  target: UATNode;
  attribute?: string;
  value?: string;
}`,
    tools: "TypeScript discriminated unions",
    out: "AccessibilityRule interface — plug-in system",
  },
  {
    n: 7, phase: "Rules", title: "WCAG Rule Implementations",
    what: "Actual WCAG 2.1 rules implement karo — img alt, color contrast, aria-label, heading order, link purpose.",
    code: `// src/rules/wcag-rules.ts
export const imgAltRule: AccessibilityRule = {
  id: 'missing-alt-text',
  name: 'Image Alt Text',
  wcagCriteria: '1.1.1',
  severity: 'critical',
  disabilities: ['visual'],
  check(node) {
    if (node.tag !== 'img') return [];
    if (!node.attrs['alt'] && node.attrs['role'] !== 'presentation') {
      return [{ ruleId: 'missing-alt-text', node,
        message: 'img element is missing alt attribute',
        fixable: true }];
    }
    return [];
  },
  fix(node) {
    return { type: 'add-attr', target: node,
      attribute: 'alt', value: '' }; // AI fills this in Step 18
  }
};`,
    tools: "Custom rule library, WCAG 2.1 spec",
    out: "10+ rule implementations in wcag-rules.ts",
  },
  {
    n: 8, phase: "Rules", title: "Rule Runner Engine",
    what: "Saare rules ko ek saath run karo — filter by disability, deduplicate, sort by severity.",
    code: `// src/rules/runner.ts
class RuleRunner {
  private rules: AccessibilityRule[] = [];
  
  register(rule: AccessibilityRule) { this.rules.push(rule); }
  
  run(nodes: UATNode[], disabilities: DisabilityType[]): Issue[] {
    const issues: Issue[] = [];
    const activeRules = this.rules.filter(r =>
      r.disabilities.some(d => disabilities.includes(d))
    );
    for (const node of nodes) {
      for (const rule of activeRules) {
        issues.push(...rule.check(node, { allNodes: nodes }));
      }
    }
    return deduplicateAndSort(issues);
  }
}
function deduplicateAndSort(issues: Issue[]) {
  const seen = new Set<string>();
  return issues
    .filter(i => !seen.has(i.node.id + i.ruleId) && seen.add(i.node.id + i.ruleId))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}`,
    tools: "Pure TypeScript, no dependencies",
    out: "RuleRunner class — scans all nodes with all rules",
  },
  {
    n: 9, phase: "Rules", title: "Color Contrast Checker",
    what: "WCAG AA/AAA contrast ratio calculate karo — relative luminance formula use karke.",
    code: `// src/rules/contrast.ts
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  return rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(fg: string, bg: string): number {
  const [l1, l2] = [getLuminance(fg), getLuminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
// Usage:
// contrastRatio('#333', '#fff') → 12.63 ✅ WCAG AAA
// contrastRatio('#aaa', '#fff') → 2.32  ❌ WCAG fail`,
    tools: "Pure math, no library needed",
    out: "contrastRatio() — WCAG AA/AAA checker",
  },
  {
    n: 10, phase: "Fix", title: "Fix Engine Core",
    what: "Issues ki list lo, har fixable issue ke liye code change generate karo, apply karo.",
    code: `// src/fix/engine.ts
class FixEngine {
  apply(issues: Issue[], rules: AccessibilityRule[], source: string): string {
    const changes: CodeChange[] = [];
    for (const issue of issues) {
      if (!issue.fixable) continue;
      const rule = rules.find(r => r.id === issue.ruleId);
      const change = rule?.fix?.(issue.node, issue);
      if (change) changes.push(change);
    }
    // Apply changes in reverse line order to preserve positions
    return applyChanges(source, changes.sort((a, b) =>
      (b.target.line ?? 0) - (a.target.line ?? 0)
    ));
  }
}`,
    tools: "String manipulation, AST mutation",
    out: "FixEngine.apply() → fixed source code string",
  },
  {
    n: 11, phase: "Fix", title: "HTML Source Patcher",
    what: "HTML string mein directly changes apply karo — attribute add/remove, text replace, element insert.",
    code: `// src/fix/html-patcher.ts
function patchHTML(html: string, change: CodeChange): string {
  switch (change.type) {
    case 'add-attr': {
      const tag = buildOpeningTag(change.target);
      const fixed = tag.replace('>', \` \${change.attribute}="\${change.value}">\`);
      return html.replace(tag, fixed);
    }
    case 'replace-text': {
      return html.replace(
        extractInnerHTML(change.target),
        change.value ?? ''
      );
    }
    case 'add-element': {
      const parentTag = buildOpeningTag(change.target);
      return html.replace(parentTag, parentTag + change.newElement);
    }
  }
  return html;
}`,
    tools: "String replace, regex, parse5 serializer",
    out: "patchHTML() → corrected HTML string",
  },
  {
    n: 12, phase: "Fix", title: "JSX AST Fixer",
    what: "Babel AST directly modify karo — JSX attribute add/remove/update, generate back to code.",
    code: `// src/fix/jsx-fixer.ts
import generate from '@babel/generator';
import * as t from '@babel/types';

function fixJSXNode(path: NodePath, change: CodeChange): string {
  const { type, attribute, value } = change;
  const openEl = path.node.openingElement;
  
  if (type === 'add-attr') {
    openEl.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier(attribute!),
        t.stringLiteral(value ?? '')
      )
    );
  } else if (type === 'remove-attr') {
    openEl.attributes = openEl.attributes.filter(
      (a: any) => a.name?.name !== attribute
    );
  }
  // Regenerate modified AST back to source
  return generate(path.parent).code;
}`,
    tools: "@babel/types, @babel/generator",
    out: "fixJSXNode() → corrected JSX source",
  },
  {
    n: 13, phase: "Fix", title: "Diff & Preview Generator",
    what: "Original aur fixed code ka side-by-side diff generate karo — user review ke liye.",
    code: `// src/fix/diff.ts
// Uses: diff (npm install diff)
import { createTwoFilesPatch } from 'diff';

function generateDiff(original: string, fixed: string, filename: string): DiffResult {
  const patch = createTwoFilesPatch(
    \`\${filename} (original)\`,
    \`\${filename} (fixed)\`,
    original, fixed,
    '', '',
    { context: 3 }
  );
  return {
    patch,
    additions: countLines(patch, '+'),
    deletions: countLines(patch, '-'),
    hunks: parsePatchHunks(patch)
  };
}`,
    tools: "diff library (npm install diff)",
    out: "generateDiff() → unified diff patch string",
  },
  {
    n: 14, phase: "Fix", title: "Compliance Report Generator",
    what: "Final scan report generate karo — WCAG score, issues by severity, disability breakdown, pass/fail summary.",
    code: `// src/report.ts
function generateReport(issues: Issue[], nodes: UATNode[]): ComplianceReport {
  const bySeverity = groupBy(issues, i => i.severity);
  const byDisability = groupBy(issues, i => i.disability);
  const score = Math.max(0,
    100 - (bySeverity.critical?.length ?? 0) * 20
        - (bySeverity.serious?.length ?? 0) * 10
        - (bySeverity.moderate?.length ?? 0) * 5
        - (bySeverity.minor?.length ?? 0) * 1
  );
  return {
    totalElements: nodes.length,
    totalIssues: issues.length,
    wcagScore: score,
    passedCriteria: getPassedCriteria(issues),
    failedCriteria: getFailedCriteria(issues),
    bySeverity, byDisability,
    generatedAt: new Date().toISOString()
  };
}`,
    tools: "Pure TypeScript",
    out: "ComplianceReport with WCAG score 0–100",
  },
  {
    n: 15, phase: "Fix", title: "VS Code Extension Setup",
    what: "VS Code extension scaffold banao — manifest, activation event, command registration.",
    code: `// package.json (extension manifest)
{
  "name": "uat-accessibility",
  "displayName": "UAT Accessibility Checker",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onLanguage:html","onLanguage:javascriptreact"],
  "contributes": {
    "commands": [{
      "command": "uat.scan",
      "title": "UAT: Scan for Accessibility Issues"
    }]
  }
}

// src/editor/extension.ts
import * as vscode from 'vscode';
export function activate(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('uat.scan', () => runScan())
  );
}`,
    tools: "vscode API, yo code generator",
    out: "VS Code extension skeleton",
  },
  {
    n: 16, phase: "Fix", title: "Inline Diagnostic Squiggles",
    what: "Accessibility issues ko editor mein red/yellow squiggles ke saath dikhao — hover pe message.",
    code: `// src/editor/diagnostics.ts
import * as vscode from 'vscode';
const diagCollection = vscode.languages.createDiagnosticCollection('uat');

function showDiagnostics(issues: Issue[], doc: vscode.TextDocument) {
  const diags: vscode.Diagnostic[] = issues.map(issue => {
    const line = doc.lineAt(issue.node.line - 1);
    const range = new vscode.Range(line.range.start, line.range.end);
    const diag = new vscode.Diagnostic(
      range,
      \`[UAT] \${issue.message}\`,
      issue.severity === 'critical'
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning
    );
    diag.code = issue.ruleId;
    return diag;
  });
  diagCollection.set(doc.uri, diags);
}`,
    tools: "vscode.languages.createDiagnosticCollection",
    out: "Inline squiggles with hover messages",
  },
  {
    n: 17, phase: "Fix", title: "Quick Fix Code Actions",
    what: "Squiggle pe click karo → 'Fix: Add alt text' action — one-click repair directly in editor.",
    code: `// src/editor/code-actions.ts
class UATCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(doc, range): vscode.CodeAction[] {
    const diags = vscode.languages.getDiagnostics(doc.uri)
      .filter(d => d.range.intersection(range));
    
    return diags.map(diag => {
      const action = new vscode.CodeAction(
        \`Fix: \${diag.message}\`,
        vscode.CodeActionKind.QuickFix
      );
      action.edit = new vscode.WorkspaceEdit();
      const fix = computeFix(diag.code as string, doc, diag.range);
      action.edit.replace(doc.uri, fix.range, fix.newText);
      return action;
    });
  }
}`,
    tools: "vscode.CodeActionProvider interface",
    out: "One-click accessibility fixes in VS Code",
  },
  {
    n: 18, phase: "AI", title: "AI Alt Text Generator",
    what: "Images ke liye AI se descriptive alt text generate karo — Claude Vision API use karke.",
    code: `// src/ai/alt-text.ts
// Uses Anthropic SDK (npm install @anthropic-ai/sdk)
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var

async function generateAltText(imageUrl: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text:
          'Write a concise, descriptive alt text (max 125 chars) for this image. '
          + 'Focus on what matters to screen reader users. No "image of" prefix.' }
      ]
    }]
  });
  return (response.content[0] as any).text.trim();
}`,
    tools: "@anthropic-ai/sdk (npm install)",
    out: "generateAltText(url) → descriptive alt string",
  },
  {
    n: 19, phase: "AI", title: "AI ARIA Label Generator",
    what: "Icon buttons aur unlabelled controls ke liye AI se meaningful aria-label generate karo.",
    code: `// src/ai/aria-labels.ts
async function generateAriaLabel(
  node: UATNode,
  context: string
): Promise<string> {
  const prompt = \`
    HTML element: <\${node.tag} class="\${node.attrs.class ?? ''}">
    Context (surrounding text): "\${context}"
    Task: Write a short aria-label (2–6 words) for this interactive element.
    Be specific about what clicking/activating it does.
    Return ONLY the label, no quotes, no explanation.
  \`;
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 30,
    messages: [{ role: 'user', content: prompt }]
  });
  return (response.content[0] as any).text.trim();
}`,
    tools: "@anthropic-ai/sdk",
    out: "generateAriaLabel() → short action label",
  },
  {
    n: 20, phase: "AI", title: "AI Issue Explanation Layer",
    what: "Har accessibility issue ka plain-English explanation + code example generate karo — junior devs ke liye.",
    code: `// src/ai/explainer.ts
async function explainIssue(issue: Issue): Promise<Explanation> {
  const prompt = \`
    Accessibility issue: \${issue.ruleId}
    Element: <\${issue.node.tag}>
    Message: \${issue.message}
    
    Explain in 2 sentences why this matters for disabled users.
    Then show a BEFORE and AFTER code snippet (HTML, max 3 lines each).
    Format: { "why": "...", "before": "...", "after": "..." }
    JSON only, no markdown.
  \`;
  const res = await client.messages.create({
    model: 'claude-opus-4-5', max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });
  return JSON.parse((res.content[0] as any).text);
}`,
    tools: "@anthropic-ai/sdk, JSON parsing",
    out: "explainIssue() → { why, before, after }",
  },
  {
    n: 21, phase: "Disability", title: "Visual Accessibility Module",
    what: "Visually impaired users ke liye — alt text, contrast, focus, heading order, link purpose rules bundle karo.",
    code: `// src/disability/visual.ts
class VisualModule extends DisabilityModule {
  name = 'visual' as DisabilityType;
  rules = [
    imgAltRule,         // missing alt text
    colorContrastRule,  // WCAG AA 4.5:1 ratio
    ariaLabelRule,      // interactive elements need labels
    headingOrderRule,   // h1 > h2 > h3 (no skipping)
    linkPurposeRule,    // "click here" is not descriptive
    focusVisibleRule,   // focus indicator must be visible
    readingOrderRule,   // DOM order = visual order
  ];
  
  fixContrast(node: UATNode): string {
    const bg = extractBackgroundColor(node);
    const fg = extractForegroundColor(node);
    const ratio = calculateContrastRatio(bg, fg);
    return ratio < 4.5
      ? darkenUntilAccessible(fg, bg, 4.5)
      : fg;
  }
}`,
    tools: "color-contrast-checker, custom rules",
    out: "VisualModule with 7+ rules + contrast fixer",
  },
  {
    n: 22, phase: "Disability", title: "Hearing Accessibility Module",
    what: "Deaf aur hard-of-hearing users ke liye — video captions, audio alternatives, autoplay block.",
    code: `// src/disability/hearing.ts
class HearingModule extends DisabilityModule {
  name = 'hearing' as DisabilityType;
  rules = [videoCaptionsRule, audioCaptionsRule, autoplayAudioRule];
  
  checkVideoCaptions(node: UATNode): Issue[] {
    if (node.tag !== 'video') return [];
    const hasCaptions = node.children.some(c =>
      c.tag === 'track' && c.attrs['kind'] === 'captions'
    );
    if (!hasCaptions) return [{
      ruleId: 'video-captions', node,
      message: 'Video missing captions — add <track kind="captions" src="captions.vtt">',
      fixable: true, severity: 'critical'
    }];
    return [];
  }
  fixAddCaptionsTrack(node: UATNode): CodeChange {
    return { type: 'add-element', parentNode: node,
      newElement: '<track kind="captions" src="captions.vtt" srclang="en" label="English">' };
  }
}`,
    tools: "Custom rules, WebVTT captions format",
    out: "HearingModule with video/audio caption rules",
  },
  {
    n: 23, phase: "Disability", title: "Motor Accessibility Module",
    what: "Keyboard-only users ke liye — tab order, click target size, keyboard shortcuts, focus trap.",
    code: `// src/disability/motor.ts
class MotorModule extends DisabilityModule {
  name = 'motor' as DisabilityType;
  rules = [tabOrderRule, targetSizeRule, keyboardTrapRule];
  
  checkTargetSize(node: UATNode): Issue[] {
    if (!isInteractive(node)) return [];
    const { width, height } = getComputedSize(node);
    if (width < 44 || height < 44) {
      return [{ ruleId: 'target-size', node,
        message: \`Touch target \${width}x\${height}px — minimum is 44x44px (WCAG 2.5.5)\`,
        fixable: true, severity: 'serious' }];
    }
    return [];
  }
  fixTargetSize(node: UATNode): CodeChange {
    return { type: 'add-attr', target: node,
      attribute: 'style', value: 'min-width:44px;min-height:44px;padding:10px' };
  }
}`,
    tools: "getComputedStyle, DOM measurement",
    out: "MotorModule with keyboard + touch target rules",
  },
  {
    n: 24, phase: "Disability", title: "Cognitive Accessibility Module",
    what: "Reading difficulties, ADHD, memory issues wale users ke liye — plain language, timeout warnings, consistent nav.",
    code: `// src/disability/cognitive.ts
class CognitiveModule extends DisabilityModule {
  name = 'cognitive' as DisabilityType;
  rules = [plainLanguageRule, timeoutWarningRule, consistentNavRule, flashingContentRule];
  
  checkReadingLevel(node: UATNode): Issue[] {
    if (!node.textContent || node.textContent.length < 50) return [];
    const flesch = calculateFleschKincaid(node.textContent);
    if (flesch.gradeLevel > 8) {
      return [{ ruleId: 'reading-level', node,
        message: \`Text at Grade \${flesch.gradeLevel} — aim for Grade 8 or lower\`,
        fixable: false, severity: 'moderate' }];
    }
    return [];
  }
}`,
    tools: "flesch-kincaid library, custom heuristics",
    out: "CognitiveModule with reading + UX rules",
  },
  {
    n: 25, phase: "Disability", title: "Multi-Disability Scanner Orchestrator",
    what: "Saare disability modules ko ek saath run karo — merge issues, deduplicate, priority sort.",
    code: `// src/scanner.ts
class UATScanner {
  private modules: DisabilityModule[] = [
    new VisualModule(), new HearingModule(),
    new MotorModule(), new CognitiveModule()
  ];
  
  async scan(input: ScanInput): Promise<ScanOutput> {
    const nodes = input.html
      ? parseHTML(input.html)
      : parseJSX(input.jsxCode!);
    
    const activeModules = this.modules.filter(m =>
      input.disabilities.includes(m.name)
    );
    const allIssues = activeModules.flatMap(m =>
      m.rules.flatMap(rule =>
        flattenNodes(nodes).flatMap(n => rule.check(n, { allNodes: flattenNodes(nodes) }))
      )
    );
    const deduped = deduplicateIssues(allIssues);
    const fixes = await this.generateFixes(deduped);
    return { issues: deduped, fixes, report: generateReport(deduped, flattenNodes(nodes)), wcagScore: 0 };
  }
}`,
    tools: "All modules combined",
    out: "UATScanner.scan() → full ScanOutput",
  },
  {
    n: 26, phase: "CLI", title: "Disability Simulation Layer",
    what: "Actual user experience simulate karo — screen reader order, color blindness filter, keyboard-only navigation.",
    code: `// src/simulation/index.ts
class DisabilitySimulator {
  // Screen reader: extract reading order as text
  simulateScreenReader(nodes: UATNode[]): string[] {
    return flattenNodes(nodes)
      .filter(n => n.textContent || n.attrs['aria-label'])
      .map(n => n.attrs['aria-label'] ?? n.textContent)
      .filter(Boolean);
  }
  
  // Color blindness: transform hex colors
  simulateColorBlindness(
    color: string,
    type: 'deuteranopia' | 'protanopia' | 'tritanopia'
  ): string {
    const [r, g, b] = hexToRgb(color);
    const matrix = COLOR_BLIND_MATRICES[type];
    const [nr, ng, nb] = multiplyMatrix(matrix, [r, g, b]);
    return rgbToHex(nr, ng, nb);
  }
}`,
    tools: "Color matrices, DOM traversal",
    out: "DisabilitySimulator — screen reader + color blindness",
  },
  {
    n: 27, phase: "CLI", title: "CLI Tool (uat scan)",
    what: "Command line se directly HTML/JSX files scan karo — uat scan ./src --disabilities visual,hearing.",
    code: `// src/cli/index.ts
// Uses: commander (npm install commander)
import { Command } from 'commander';
const program = new Command();

program
  .name('uat')
  .command('scan <path>')
  .option('-d, --disabilities <types>', 'comma-separated: visual,hearing,motor,cognitive', 'visual')
  .option('-f, --format <fmt>', 'output format: text|json|html', 'text')
  .option('--fix', 'auto-apply fixes')
  .action(async (filePath, opts) => {
    const html = readFileSync(filePath, 'utf-8');
    const scanner = new UATScanner();
    const result = await scanner.scan({
      html,
      disabilities: opts.disabilities.split(',')
    });
    if (opts.fix) applyFixes(filePath, result.fixes);
    printReport(result, opts.format);
  });
program.parse();`,
    tools: "commander, chalk, fs",
    out: "$ uat scan ./index.html --disabilities visual --fix",
  },
  {
    n: 28, phase: "CLI", title: "CI/CD Integration & GitHub Action",
    what: "GitHub Actions mein UAT scan chalao — PR pe fail karo agar critical issues hain.",
    code: `# .github/workflows/accessibility.yml
name: Accessibility Check
on: [pull_request]

jobs:
  uat-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g uat-accessibility
      - name: Run UAT Scan
        run: uat scan ./src --disabilities visual,hearing,motor,cognitive --format json > uat-report.json
      - name: Fail on Critical Issues
        run: |
          CRITICAL=$(jq '.issues | map(select(.severity=="critical")) | length' uat-report.json)
          if [ "$CRITICAL" -gt "0" ]; then
            echo "❌ $CRITICAL critical accessibility issues found!"
            exit 1
          fi
      - uses: actions/upload-artifact@v4
        with: { name: uat-report, path: uat-report.json }`,
    tools: "GitHub Actions, jq, uat CLI",
    out: "Automated accessibility gate on every PR",
  },
];

// ─── Step Card ────────────────────────────────────────────────────────────
function StepCard({ step, expanded, onToggle }) {
  const ph = PHASES[step.phase];
  return (
    <div
      style={{
        background: ph.bg,
        border: `1.5px solid ${ph.border}`,
        borderRadius: 14,
        marginBottom: 12,
        overflow: "hidden",
        transition: "box-shadow .2s",
        boxShadow: expanded ? "0 4px 20px rgba(0,0,0,.10)" : "none",
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "13px 16px", cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: ph.color, color: "#fff",
          fontWeight: 800, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>{step.n}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{step.title}</div>
          <div style={{ fontSize: 11, color: ph.color, fontWeight: 600, marginTop: 1 }}>
            {step.phase} Phase
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#999", marginRight: 4 }}>
          {expanded ? "▲ collapse" : "▼ expand"}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.65, marginBottom: 12 }}>
            {step.what}
          </p>
          <pre style={{
            background: "#1a1a2e", color: "#e0d4ff",
            borderRadius: 10, padding: "14px 16px",
            fontSize: 11.5, lineHeight: 1.7,
            overflowX: "auto", margin: "0 0 12px",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>{step.code}</pre>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
            <span style={{
              background: "#f0eeff", color: "#6c63ff",
              border: "1px solid #d0c0ff", borderRadius: 20,
              padding: "3px 11px", fontWeight: 600,
            }}>🛠 {step.tools}</span>
            <span style={{
              background: "#e8fff8", color: "#007a54",
              border: "1px solid #9fe8cf", borderRadius: 20,
              padding: "3px 11px", fontWeight: 600,
            }}>📦 {step.out}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function UATSetup() {
  const [expanded, setExpanded] = useState(new Set([1]));
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const phases = ["All", ...Object.keys(PHASES)];

  const toggle = (n) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(n) ? next.delete(n) : next.add(n);
    return next;
  });

  const visible = STEPS.filter(s => {
    const phaseOk = filter === "All" || s.phase === filter;
    const searchOk = !search || s.title.toLowerCase().includes(search.toLowerCase())
      || s.what.toLowerCase().includes(search.toLowerCase());
    return phaseOk && searchOk;
  });

  const expandAll = () => setExpanded(new Set(visible.map(s => s.n)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 820, margin: "0 auto", padding: "24px 16px" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#6c63ff", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
          28-Step Developer Guide
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1a1a2e", margin: "0 0 8px" }}>
          UAT — Universal Accessibility Tool
        </h1>
        <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
          Click any step to expand its code. Filter by phase or search below.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search steps…"
          style={{
            flex: "1 1 180px", padding: "8px 12px", borderRadius: 8,
            border: "1.5px solid #e0e0f0", fontSize: 13,
            outline: "none", background: "#f8f8ff",
          }}
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8,
            border: "1.5px solid #e0e0f0", fontSize: 13,
            background: "#f8f8ff", cursor: "pointer",
          }}
        >
          {phases.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={expandAll} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #c5bfff", background: "#f0eeff", color: "#6c63ff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Expand All
        </button>
        <button onClick={collapseAll} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e0e0f0", background: "#f8f8ff", color: "#666", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Collapse All
        </button>
      </div>

      {/* Phase legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.entries(PHASES).map(([name, { color, bg, border }]) => (
          <div key={name}
            onClick={() => setFilter(filter === name ? "All" : name)}
            style={{
              background: bg, border: `1.5px solid ${border}`,
              borderRadius: 20, padding: "3px 12px",
              fontSize: 11, fontWeight: 700, color,
              cursor: "pointer",
              boxShadow: filter === name ? `0 0 0 2px ${color}` : "none",
            }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Steps */}
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", color: "#aaa", padding: 40 }}>No steps match your search.</div>
      ) : (
        visible.map(step => (
          <StepCard
            key={step.n}
            step={step}
            expanded={expanded.has(step.n)}
            onToggle={() => toggle(step.n)}
          />
        ))
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#bbb" }}>
        UAT — Universal Accessibility Tool · 28 Steps · WCAG 2.1 AA/AAA
      </div>
    </div>
  );
}
