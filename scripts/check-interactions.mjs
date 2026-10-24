import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const utils = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL("../src/utils/interaction-utils.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: utils.exports, URL });

test("comment threads ignore share parameters and normalize encoded Chinese URLs", () => {
  const { commentPath } = utils.exports;
  assert.equal(commentPath("https://blog.yychess.top/posts/%E7%99%BD%E9%87%91%E4%B9%8B%E6%98%9F/?from=qq#comments"), "/posts/白金之星");
  assert.equal(commentPath("/posts/白金之星/"), "/posts/白金之星");
  assert.notEqual(commentPath("/posts/kungal-4108/"), commentPath("/posts/kungal-4167/"));
});

test("only clean HTTPS service URLs are published", () => {
  const { walineServerURL } = utils.exports;
  assert.equal(walineServerURL(""), "");
  assert.equal(walineServerURL(null), "");
  assert.equal(walineServerURL(" https://comments.example.com/ "), "https://comments.example.com");
  for (const value of ["http://comments.example.com", "javascript:alert(1)", "https://user:secret@example.com", "https://example.com/?token=secret", "https://example.com/#secret"]) {
    assert.throws(() => walineServerURL(value));
  }
});

function server(environment = {}) {
  const env = { OWNER_EMAIL: "owner@example.com", SMTP_USER: "mailer@example.com", SMTP_HOST: "smtp.example.com", ...environment };
  let config;
  runInNewContext(readFileSync(new URL("../services/waline/index.cjs", import.meta.url), "utf8"), {
    process: { env }, URL, module: { exports: {} },
    require: (name) => {
      assert.equal(name, "@waline/vercel");
      return (value) => { config = value; return value; };
    },
  });
  return { env, config };
}

test("moderation and authenticated comments cannot be disabled by environment overrides", () => {
  const { env, config } = server({ COMMENT_AUDIT: "false", LOGIN: "disable", DATABASE_URL: "postgresql://reader:pa%24%24word@db.example.com:5432/comments?sslmode=require" });
  assert.equal(env.COMMENT_AUDIT, "true");
  assert.equal(env.LOGIN, "force");
  assert.equal(env.PG_SSL, "true");
  assert.equal(env.PG_PASSWORD, "pa$$word");
  assert.equal(env.PG_DB, "comments");
  assert.equal(config.preSave({ comment: "hello" }), undefined);
  assert.ok(config.preSave({ comment: "x".repeat(3001) }).errmsg);
});

test("initial registration is restricted to the owner and requires a configured mailbox", async () => {
  for (const [environment, email, expected] of [
    [{}, "outsider@example.com", 403],
    [{}, "OWNER@example.com", 200],
    [{ OWNER_EMAIL: "" }, "outsider@example.com", 403],
    [{ REGISTRATION_OPEN: "true" }, "outsider@example.com", 200],
    [{ SMTP_USER: "" }, "owner@example.com", 503],
  ]) {
    const { config } = server(environment);
    const ctx = { method: "POST", path: "/api/user", post: () => email, status: 200 };
    let reached = false;
    await config.plugins[0].middlewares[0](ctx, async () => { reached = true; });
    assert.equal(ctx.status, expected);
    assert.equal(reached, expected === 200);
  }
  const { config } = server();
  let reached = false;
  await config.plugins[0].middlewares[0]({ method: "GET", path: "/api/comment" }, async () => { reached = true; });
  assert.ok(reached);
});

test("Neon variables with the configured DATABASE prefix are recognized", () => {
  for (const name of ["DATABASE_POSTGRES_URL", "DATABASE_DATABASE_URL"]) {
    const { env } = server({ [name]: "postgresql://reader:example-secret@db.example.com/neondb?sslmode=require" });
    assert.equal(env.PG_DB, "neondb");
    assert.equal(env.PG_HOST, "db.example.com");
    assert.equal(env.PG_SSL, "true");
  }
});
