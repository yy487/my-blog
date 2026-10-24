export function commentPath(value: string): string {
	const pathname = new URL(value, "https://blog.yychess.top").pathname;
	let decoded = pathname;
	try {
		decoded = decodeURI(pathname);
	} catch {
		// Keep older URLs with a literal percent sign usable.
	}
	return decoded.replace(/\/+$/, "") || "/";
}

export function walineServerURL(value: string | null | undefined): string {
	if (!value?.trim()) return "";
	const server = new URL(value.trim());
	if (
		server.protocol !== "https:" ||
		server.username ||
		server.password ||
		server.search ||
		server.hash
	) {
		throw new Error(
			"评论服务地址必须是 HTTPS 地址，不能包含密码、查询参数或锚点。",
		);
	}
	return server.href.replace(/\/+$/, "");
}
