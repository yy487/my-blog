import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { onRequest } from "../functions/downloads/[[path]].js";

const schema = readFileSync(new URL("../migrations/0001_download_daily.sql", import.meta.url), "utf8");

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  return {
    sqlite,
    binding: {
      prepare: (sql) => ({
        bind: (...values) => ({ run: async () => sqlite.prepare(sql).run(...values) }),
      }),
    },
  };
}

async function download(binding, options = {}) {
  const pending = [];
  const response = await onRequest({
    request: new Request(options.url || "https://blog.yychess.top/downloads/けらけら星.zip", {
      method: options.method || "GET",
      headers: { "User-Agent": "Mozilla/5.0", ...options.headers },
    }),
    env: { DOWNLOAD_DB: binding },
    next: async () => new Response("body" in options ? options.body : "patch bytes", {
      status: options.status || 200,
      headers: { "Content-Type": options.type || "application/zip", "ETag": '"patch-v1"' },
    }),
    waitUntil: (promise) => pending.push(promise),
  });
  await Promise.all(pending);
  return response;
}

test("serves the original archive and atomically counts starts by file and China date", async () => {
  const db = database();
  const realNow = Date.now;
  Date.now = () => Date.parse("2026-10-15T16:01:00Z");
  try {
    const response = await download(db.binding);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "patch bytes");
    assert.equal(response.headers.get("Content-Disposition"), "attachment");
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("ETag"), '"patch-v1"');
    await download(db.binding, { url: "https://blog.yychess.top/downloads/%E3%81%91%E3%82%89%E3%81%91%E3%82%89%E6%98%9F.zip?source=article" });
    await download(db.binding, { url: "https://blog.yychess.top/downloads/patch-v2.7z" });
    assert.deepEqual(db.sqlite.prepare("SELECT * FROM download_daily ORDER BY file").all().map((row) => ({...row})), [
      { day: "2026-10-16", file: "patch-v2.7z", requests: 1 },
      { day: "2026-10-16", file: "けらけら星.zip", requests: 2 },
    ]);
  } finally {
    Date.now = realNow;
    db.sqlite.close();
  }
});

test("ignores HEAD, partial transfers, bots, prefetch, previews, missing files and non-archives", async () => {
  const db = database();
  try {
    for (const options of [
      { method: "HEAD" },
      { headers: { Range: "bytes=0-99" } },
      { status: 206 },
      { headers: { "User-Agent": "Googlebot" } },
      { headers: { "Sec-Purpose": "prefetch" } },
      { headers: { Purpose: "prefetch" } },
      { url: "https://preview.my-blog-pgn.pages.dev/downloads/patch.zip" },
      { status: 404 },
      { status: 304, body: null },
      { type: "text/html" },
      { url: "https://blog.yychess.top/downloads/test.html" },
      { url: "https://blog.yychess.top/downloads/folder%2Fpatch.zip" },
      { url: "https://blog.yychess.top/downloads/%zz.zip" },
    ]) {
      await download(db.binding, options);
    }
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS count FROM download_daily").get().count, 0);
  } finally {
    db.sqlite.close();
  }
});

test("missing or failed analytics never prevents downloading", async () => {
  const warn = console.error;
  const messages = [];
  console.error = (...args) => messages.push(args);
  try {
    for (const binding of [undefined, { prepare() { throw new Error("D1 unavailable"); } }]) {
      const response = await download(binding);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), "patch bytes");
    }
    assert.equal(messages.length, 1);
  } finally {
    console.error = warn;
  }
});

test("only download paths invoke Functions; reading articles remains static", () => {
  const routes = JSON.parse(readFileSync(new URL("../public/_routes.json", import.meta.url), "utf8"));
  assert.deepEqual(routes, { version: 1, include: ["/downloads/*"], exclude: [] });
});
