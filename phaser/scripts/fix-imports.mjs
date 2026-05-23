#!/usr/bin/env node
/**
 * Converts relative imports in src/ to path-aliased imports.
 * Run once: node scripts/fix-imports.mjs
 * Dry-run: node scripts/fix-imports.mjs --dry-run
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const SRC_DIR = resolve(import.meta.dirname, "../src");

// Maps from src-relative directory prefix to alias prefix
// Order matters: more-specific first
const ALIAS_MAP = [
	["Engine/Scenes", "@Screens"],
	["TriggerSystem", "@TriggerSystem"],
	["Components", "@Components"],
	["Multiplayer", "@Multiplayer"],
	["Constants", "@Constants"],
	["Shaders", "@Shaders"],
	["Models", "@Models"],
	["Systems", "@Systems"],
	["Core", "@Core"],
	["Data", "@Data"],
	["Game", "@Game"],
	["Utils", "@Utils"],
	["lib", "@lib"],
	["i18n", "@i18n"],
	["UI", "@UI"],
	// Single-file aliases
	["phaser.io", "@PhaserIO"],
	["assets", "@assets"],
	["config", "@config"],
	["utils", "@utils"],
];

function* walkTs(dir) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			yield* walkTs(full);
		} else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) {
			yield full;
		}
	}
}

function toAlias(srcRelative) {
	// Remove .ts extension if present
	const withoutExt = srcRelative.replace(/\.ts$/, "");
	for (const [prefix, alias] of ALIAS_MAP) {
		if (withoutExt === prefix) {
			// Exact match for single-file aliases
			return alias;
		}
		if (withoutExt.startsWith(prefix + "/")) {
			return alias + withoutExt.slice(prefix.length);
		}
	}
	return null;
}

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

for (const filePath of walkTs(SRC_DIR)) {
	const fileDir = dirname(filePath);
	const original = readFileSync(filePath, "utf8");
	let updated = original;

	// Match: import ... from '../...' or from './...' (single or double quotes)
	const importRe = /from\s+(['"])(\.\.?\/[^'"]+)\1/g;

	updated = original.replace(importRe, (match, quote, importPath) => {
		const absImport = resolve(fileDir, importPath);
		const srcRelative = relative(SRC_DIR, absImport);
		if (srcRelative.startsWith("..")) {
			// Outside src/ — leave untouched
			return match;
		}
		const aliased = toAlias(srcRelative);
		if (!aliased) return match;
		totalReplacements++;
		return `from ${quote}${aliased}${quote}`;
	});

	totalFiles++;
	if (updated !== original) {
		modifiedFiles++;
		if (!DRY_RUN) {
			writeFileSync(filePath, updated, "utf8");
		}
		const relPath = relative(SRC_DIR, filePath);
		const lines = original
			.split("\n")
			.map((line, i) => ({ line, i }))
			.filter(({ line }) => importRe.test(line));
		importRe.lastIndex = 0;
		if (DRY_RUN) {
			console.log(`  [would modify] src/${relPath}`);
		} else {
			console.log(`  [modified]     src/${relPath}`);
		}
	}
}

console.log(
	`\nDone. ${modifiedFiles} files updated, ${totalReplacements} imports converted.${DRY_RUN ? " (dry-run)" : ""}`
);
