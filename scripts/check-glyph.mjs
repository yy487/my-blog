import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as model from "../src/components/interactive/glyph-model.ts";
import {
	createDemoGlyph,
	getPixelLocation,
	hex,
	togglePixel,
} from "../src/components/interactive/glyph-model.ts";

test("article example and ROM boundaries", () => {
	assert.deepEqual(getPixelLocation(1537, 12, 5), {
		side: 1,
		byteIndex: 11,
		glyphOffset: 0xc020,
		romAddress: 0x6010,
		byteOffset: 0xc02b,
		mask: 0x08,
	});
	assert.equal(getPixelLocation(0, 0, 0).byteOffset, 0);
	assert.equal(getPixelLocation(4095, 15, 15).byteOffset, 0x1ffff);
	assert.equal(hex(0xc02b), "0xC02B");
	assert.equal(hex(8, 2), "0x08");
});

test("all pixels map to distinct bits without mutating the previous state", () => {
	let bytes = new Uint8Array(32);
	const positions = new Set();
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			const { byteIndex, mask } = getPixelLocation(0, x, y);
			positions.add(`${byteIndex}:${mask}`);
			const before = bytes.slice();
			const next = togglePixel(bytes, x, y);
			assert.deepEqual(bytes, before);
			assert.equal(next[byteIndex], before[byteIndex] ^ mask);
			assert.deepEqual(togglePixel(next, x, y), before);
			bytes = next;
		}
	}
	assert.equal(positions.size, 256);
	assert.ok(bytes.every((byte) => byte === 0xff));
	assert.equal(createDemoGlyph().length, 32);
});

test("invalid coordinates and malformed glyphs are rejected", () => {
	for (const values of [
		[-1, 0, 0],
		[4096, 0, 0],
		[0, 16, 0],
		[0, 0, -1],
		[1.5, 0, 0],
		[Number.NaN, 0, 0],
	]) {
		assert.throws(() => getPixelLocation(...values), RangeError);
	}
	assert.throws(() => togglePixel(new Uint8Array(31), 0, 0), RangeError);
});

test("React server output preserves the diagram and usable control labels", () => {
	const source = readFileSync(
		new URL("../src/components/interactive/GlyphExplorer.tsx", import.meta.url),
		"utf8",
	);
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.ReactJSX,
		},
	}).outputText;
	const componentModule = { exports: {} };
	const require = createRequire(import.meta.url);
	runInNewContext(compiled, {
		exports: componentModule.exports,
		require: (id) => {
			if (id === "./glyph-model") return model;
			if (id === "./GlyphExplorer.css") return {};
			return require(id);
		},
	});
	const html = renderToStaticMarkup(
		require("react").createElement(componentModule.exports.default),
	);
	assert.equal((html.match(/aria-label="像素 \(/g) || []).length, 256);
	assert.match(html, /0xC02B/);
	assert.match(html, /0x08/);
	assert.match(html, /data-pagefind-ignore/);
	assert.match(html, /切换所选像素/);
	assert.match(html, /当前字模的 32 个字节/);
});

test("CMS keeps MD and MDX in separate editors", () => {
	const requireYaml = createRequire(import.meta.resolve("@rollup/plugin-yaml"));
	const cms = requireYaml("js-yaml").load(
		readFileSync(new URL("../.pages.yml", import.meta.url), "utf8"),
	);
	const markdown = cms.content.find((entry) => entry.name === "posts");
	const mdx = cms.content.find((entry) => entry.name === "interactive");
	assert.ok(markdown.filename.template.endsWith(".md"));
	assert.ok(mdx.filename.template.endsWith(".mdx"));
	assert.equal(mdx.format, "code");
	assert.equal(mdx.fields, undefined);
	const article = readFileSync(
		new URL("../src/content/posts/kungal-4108.mdx", import.meta.url),
		"utf8",
	);
	assert.match(article, /<GlyphExplorer client:visible \/>/);
});
