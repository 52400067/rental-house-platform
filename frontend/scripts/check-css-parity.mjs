#!/usr/bin/env node
/**
 * CSS selector parity check (TECH-DEBT #4 follow-up).
 *
 * Motivation: splitting theme.css / page.css into feature modules once dropped
 * a selector silently (.corner-fab recovery needed a hotfix). This script
 * tokenizes src/styles/*.css, normalizes every top-level selector and compares
 * the inventory against scripts/css-selectors.json (the golden manifest).
 *
 * Usage:
 *   node scripts/check-css-parity.mjs                 # live vs manifest (exit 1 on diff)
 *   node scripts/check-css-parity.mjs --update        # rewrite manifest from live CSS
 *   node scripts/check-css-parity.mjs --diff-from DIR # one-off: compare DIR's *.css vs live
 *
 * Notes:
 * - The import order in LOAD_ORDER below must match main.tsx: it is
 *   load-bearing (cascade), so reordering also fails the check.
 * - Per-route stylesheets (home.css, imported by Home.tsx) are not part of
 *   the global cascade; they are existence-checked but not parity-tracked.
 * - No dependency on PostCSS/CSSTree: tokenizer handles comments, strings,
 *   escapes and nested at-rule blocks; selectors are compared normalized
 *   (whitespace collapsed, `a > b` === `a>b`).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = join(__dirname, "..", "src", "styles");
const MANIFEST = join(__dirname, "css-selectors.json");

// Keep in sync with frontend/src/main.tsx imports.
const LOAD_ORDER = [
    "theme.css",
    "layout.css",
    "chrome.css",
    "auth.css",
    "messages.css",
    "chat.css",
    "widgets.css",
    "components.css",
];

// Loaded per-route from components, not via main.tsx.
const PER_ROUTE = ["home.css"];

// ---------------------------------------------------------------- tokenizer
function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, " ");
}

/** Split into top-level "prelude { body }" chunks, string/escape aware. */
function splitTopLevelBlocks(css) {
    const chunks = [];
    let depth = 0, buf = "", inStr = null, esc = false;
    for (const ch of css) {
        if (esc) { buf += ch; esc = false; continue; }
        if (ch === "\\") { buf += ch; esc = true; continue; }
        if (inStr) { buf += ch; if (ch === inStr) inStr = null; continue; }
        if (ch === '"' || ch === "'") { inStr = ch; buf += ch; continue; }
        if (ch === "{") { depth++; buf += ch; continue; }
        if (ch === "}") {
            depth--;
            buf += ch;
            if (depth === 0) { chunks.push(buf); buf = ""; }
            if (depth < 0) throw new Error("Unbalanced braces in stylesheet");
            continue;
        }
        buf += ch;
    }
    if (depth !== 0) throw new Error("Unbalanced braces at end of stylesheet");
    if (buf.trim()) chunks.push(buf);
    return chunks;
}

/** Split on commas that are not inside (), [] or strings. */
function splitTopLevelCommas(str) {
    const parts = [];
    let depth = 0, buf = "", inStr = null, esc = false;
    for (const ch of str) {
        if (esc) { buf += ch; esc = false; continue; }
        if (ch === "\\") { buf += ch; esc = true; continue; }
        if (inStr) { buf += ch; if (ch === inStr) inStr = null; continue; }
        if (ch === "(" || ch === "[") depth++;
        if (ch === ")" || ch === "]") depth--;
        if (ch === "," && depth === 0) { parts.push(buf); buf = ""; continue; }
        buf += ch;
    }
    parts.push(buf);
    return parts;
}

/** Whitespace-insensitive selector form so refactors don't create false diffs. */
function normalizeSelector(sel) {
    return sel
        .replace(/\\/g, "\\\\")
        .replace(/\s+/g, " ")
        .replace(/\s*([>+~])\s*/g, "$1")
        .trim();
}

// At-rules whose bodies contain real selectors to recurse into.
const NESTING_AT_RULES = /^@(media|supports|layer|container|scope|document)\b/i;
// At-rules with selector-less or non-selector bodies (keyframes = from/to/%).
const OPAQUE_AT_RULES = /^@(font-face|font-feature-values|keyframes|-webkit-keyframes|property|page|counter-style|viewport|color-profile|font-palette-values)\b/i;

function collectSelectors(css, selectors, origin) {
    for (const chunk of splitTopLevelBlocks(stripComments(css))) {
        const open = chunk.indexOf("{");
        if (open === -1) continue; // at-rule without block (@import/@charset)
        const prelude = chunk.slice(0, open).trim();
        const body = chunk.slice(open + 1, chunk.lastIndexOf("}"));
        if (prelude.startsWith("@")) {
            if (NESTING_AT_RULES.test(prelude)) {
                collectSelectors(body, selectors, origin);
            } else if (!OPAQUE_AT_RULES.test(prelude)) {
                throw new Error(`Unsupported at-rule "${prelude}" in ${origin} - teach the tokenizer or list it as opaque`);
            }
            continue;
        }
        for (const raw of splitTopLevelCommas(prelude)) {
            const sel = normalizeSelector(raw);
            if (!sel) continue;
            if (!selectors.has(sel)) selectors.set(sel, new Set());
            selectors.get(sel).add(origin);
        }
    }
}

// ------------------------------------------------------------------- helpers
function collectCssFiles(dir) {
    const out = [];
    for (const name of readdirSync(dir).sort()) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) out.push(...collectCssFiles(p));
        else if (name.endsWith(".css")) out.push(p);
    }
    return out;
}

function selectorsFromFiles(files) {
    const map = new Map();
    for (const file of files) {
        const origin = relative(STYLES_DIR, file).split(sep).join("/") || file;
        collectSelectors(readFileSync(file, "utf8"), map, origin);
    }
    return map;
}

function mapToJson(map) {
    return Object.fromEntries(
        [...map.entries()]
            .map(([sel, files]) => [sel, [...files].sort()])
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
}

function reportDiff(label, live, golden) {
    // Values may be Sets (live map) or arrays (parsed manifest) - normalize.
    const filesOf = (v) => [...(v || [])].sort();
    const added = [...live.keys()].filter((k) => !golden.has(k));
    const removed = [...golden.keys()].filter((k) => !live.has(k));
    const moved = [...live.keys()].filter((k) => golden.has(k) && JSON.stringify([...live.get(k)].sort()) !== JSON.stringify(filesOf(golden.get(k))));
    let bad = false;
    if (added.length) {
        bad = true;
        console.log(`\n[${label}] selectors NOT in golden (new?):`);
        for (const k of added) console.log(`  + ${k}  (${[...live.get(k)].join(", ")})`);
    }
    if (removed.length) {
        bad = true;
        console.log(`\n[${label}] golden selectors MISSING from live CSS:`);
        for (const k of removed) console.log(`  - ${k}  (was in ${filesOf(golden.get(k)).join(", ")})`);
    }
    if (moved.length) {
        bad = true;
        console.log(`\n[${label}] selectors moved between files:`);
        for (const k of moved) console.log(`  ~ ${k}  ${filesOf(golden.get(k)).join(",")} -> ${[...live.get(k)].join(",")}`);
    }
    return { added, removed, moved, bad };
}

// ---------------------------------------------------------------------- main
const args = process.argv.slice(2);
const update = args.includes("--update");
const diffFromIdx = args.indexOf("--diff-from");
const diffFrom = diffFromIdx !== -1 ? args[diffFromIdx + 1] : null;

const styleFiles = [...LOAD_ORDER, ...PER_ROUTE].map((f) => join(STYLES_DIR, f));
for (const f of styleFiles) {
    if (!existsSync(f)) {
        console.error(`[X] Missing stylesheet: ${relative(process.cwd(), f)} - check LOAD_ORDER/PER_ROUTE`);
        process.exit(1);
    }
}

const live = selectorsFromFiles(styleFiles);
const total = [...live.values()].reduce((n, s) => n + s.size, 0);

if (diffFrom) {
    const base = selectorsFromFiles(collectCssFiles(diffFrom));
    const { added, removed, bad } = reportDiff(`${diffFrom} -> live`, live, base);
    console.log(`\nBaseline: ${base.size} selectors, live: ${live.size} (+${added.length}/-${removed.length})`);
    process.exit(bad ? 1 : 0);
}

if (update) {
    const doc = {
        _comment: "Golden selector inventory for src/styles. Regenerate with: node scripts/check-css-parity.mjs --update. Edit CSS first, review the diff (every removal must be intentional), then commit.",
        loadOrder: LOAD_ORDER,
        selectors: mapToJson(live),
    };
    writeFileSync(MANIFEST, JSON.stringify(doc, null, 2) + "\n");
    console.log(`[OK] ${relative(process.cwd(), MANIFEST)} written: ${live.size} selectors from ${styleFiles.length} files (${total} declarations of selector origins)`);
    process.exit(0);
}

if (!existsSync(MANIFEST)) {
    console.error(`[X] ${relative(process.cwd(), MANIFEST)} missing - run with --update to create it`);
    process.exit(1);
}

const golden = JSON.parse(readFileSync(MANIFEST, "utf8"));
if (JSON.stringify(golden.loadOrder) !== JSON.stringify(LOAD_ORDER)) {
    console.error("[X] Import order changed (cascade is load-bearing). If intentional, update LOAD_ORDER here AND main.tsx together, then --update.");
    process.exit(1);
}
const goldenMap = new Map(Object.entries(golden.selectors).map(([k, v]) => [k, v]));

console.log(`CSS parity: ${live.size} live selectors vs ${goldenMap.size} in manifest`);
const { added, removed, moved, bad } = reportDiff("live vs manifest", live, goldenMap);
if (bad) {
    console.error("\n[X] Selector inventory drifted. New selectors: add to manifest via --update after review. Removals/moves: only accept if intentional (update manifest), otherwise restore the CSS.");
    process.exit(1);
}
console.log("[OK] No selector lost, added or moved without intent.");
