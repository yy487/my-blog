import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { z } from "astro/zod";
import ts from "typescript";

const { transform } = createRequire(import.meta.resolve("astro"))(
	"@astrojs/compiler",
);

// Use the actual content schema; astro:content is a build-time virtual module.
const schemaSource = readFileSync(
	new URL("../src/content/config.ts", import.meta.url),
	"utf8",
);
const compiled = ts.transpileModule(schemaSource, {
	compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const schemaModule = { exports: {} };
runInNewContext(compiled, {
	exports: schemaModule.exports,
	require: (id) => {
		assert.equal(id, "astro:content");
		return { defineCollection: (collection) => collection, z };
	},
});
const schema = schemaModule.exports.collections.posts.schema;
const post = { title: "Patch", published: "2026-10-12" };
assert.equal(schema.parse(post).downloads.length, 0);
for (const download of [
	{ name: "v1.0", file: "/downloads/patch-v1.zip" },
	{ name: "v1.0", file: "/downloads/patch-v1.7z" },
	{ name: "Mirror", url: "https://example.com/patch.zip", note: "v1.0" },
	{
		name: "Both",
		file: "/downloads/patch.zip",
		url: "https://example.com/patch.zip",
	},
]) {
	assert.equal(
		schema.parse({ ...post, downloads: [download] }).downloads.length,
		1,
	);
}
for (const download of [
	{ name: "Missing link" },
	{ name: "", file: "/downloads/patch.zip" },
	{ name: "Unsafe", url: "javascript:alert(1)" },
	{ name: "Unsafe", url: "data:text/html,test" },
	{ name: "Wrong folder", file: "/uploads/patch.zip" },
	{ name: "HTML", file: "/downloads/patch.html" },
]) {
	assert.equal(
		schema.safeParse({ ...post, downloads: [download] }).success,
		false,
	);
}

const requireYaml = createRequire(import.meta.resolve("@rollup/plugin-yaml"));
const cms = requireYaml("js-yaml").load(
	readFileSync(new URL("../.pages.yml", import.meta.url), "utf8"),
);
assert.equal(
	cms.media.find((media) => media.name === "images").output,
	"/uploads",
);
assert.equal(
	cms.media.find((media) => media.name === "patches").input,
	"public/downloads",
);
const fields = cms.content.find((content) => content.name === "posts").fields;
const downloads = fields.find((field) => field.name === "downloads");
assert.equal(downloads.type, "object");
assert.equal(downloads.list, true);
assert.equal(
	downloads.fields.find((field) => field.name === "file").options.media,
	"patches",
);
for (const name of ["image", "body"]) {
	assert.equal(
		fields.find((field) => field.name === name).options.media,
		"images",
	);
}
assert.equal(
	cms.content
		.find((content) => content.name === "site")
		.fields.find((field) => field.name === "avatar").options.media,
	"images",
);
const pageSource = readFileSync(
	new URL("../src/pages/posts/[...slug].astro", import.meta.url),
	"utf8",
);
await transform(pageSource, { filename: "[...slug].astro" });
console.log(
	"Download schema, CMS media configuration, and Astro component checks passed.",
);
