const UPSERT = `
  INSERT INTO download_daily (day, file, requests) VALUES (?1, ?2, 1)
  ON CONFLICT (day, file) DO UPDATE SET requests = requests + 1
`;

export async function onRequest(context) {
  const { request, env } = context;
  const response = await context.next();
  const url = new URL(request.url);
  let file;
  try {
    file = decodeURIComponent(url.pathname).replace(/^\/downloads\//, "");
  } catch {
    return response;
  }

  // Only actual archives get attachment headers; never turn a 404 page into a download.
  if (
    !/^[^/\\?#\u0000-\u001f]+\.(zip|7z|rar|gz|xz)$/i.test(file) ||
    !response.ok ||
    response.headers.get("Content-Type")?.includes("text/html")
  ) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Disposition", "attachment");
  headers.set("Content-Type", "application/octet-stream");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store");

  const purpose = `${request.headers.get("Purpose") || ""} ${request.headers.get("Sec-Purpose") || ""}`;
  if (
    env.DOWNLOAD_DB &&
    url.hostname === "blog.yychess.top" &&
    request.method === "GET" &&
    response.status === 200 &&
    !request.headers.has("Range") &&
    !/prefetch|prerender/i.test(purpose) &&
    !/bot\b|crawler|spider|headless|preview/i.test(request.headers.get("User-Agent") || "")
  ) {
    // Count starts, not completed transfers; Range requests cannot identify one download.
    const day = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    context.waitUntil(
      Promise.resolve()
        .then(() => env.DOWNLOAD_DB.prepare(UPSERT).bind(day, file).run())
        .catch(() => console.error("Download statistics write failed; file delivery is unaffected.")),
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
