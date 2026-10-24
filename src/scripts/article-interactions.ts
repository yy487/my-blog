import type { WalineInstance } from "@waline/client";

let instance: WalineInstance | null = null;
let viewport: IntersectionObserver | null = null;
let counterAbort: AbortController | null = null;
let revision = 0;

function destroyComments() {
	revision++;
	viewport?.disconnect();
	counterAbort?.abort();
	instance?.destroy();
	viewport = null;
	counterAbort = null;
	instance = null;
}

function setupInteractions() {
	destroyComments();
	const section = document.querySelector<HTMLElement>(
		"[data-article-interactions]",
	);
	if (!section) return;

	const url = section.dataset.url || "";
	const title = section.dataset.title || document.title;
	const status = section.querySelector<HTMLElement>("[data-share-status]");
	const fallback = section.querySelector<HTMLInputElement>(
		"[data-share-fallback]",
	);
	const copy = section.querySelector<HTMLButtonElement>("[data-copy-article]");
	const share = section.querySelector<HTMLButtonElement>(
		"[data-share-article]",
	);
	const say = (message: string) => {
		if (status) status.textContent = message;
	};
	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(url);
			say("链接已复制，可以粘贴分享。");
		} catch {
			if (fallback) {
				fallback.hidden = false;
				fallback.focus();
				fallback.select();
			}
			say("请复制下方已选中的文章链接。");
		}
	};
	if (copy) copy.onclick = copyLink;
	if (share) {
		share.onclick = async () => {
			if (!navigator.share) return copyLink();
			try {
				await navigator.share({ title, url });
				say("感谢分享这篇文章。");
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") return;
				await copyLink();
			}
		};
	}

	const container = section.querySelector<HTMLElement>("[data-waline]");
	if (!container?.dataset.server) return;
	const current = revision;
	const like = section.querySelector<HTMLButtonElement>("[data-like-article]");
	const likeCount = section.querySelector<HTMLElement>("[data-like-count]");
	const likeLabel = section.querySelector<HTMLElement>("[data-like-label]");
	const likeStatus = section.querySelector<HTMLElement>("[data-like-status]");
	const message = section.querySelector<HTMLElement>("[data-comments-status]");
	const retry = section.querySelector<HTMLButtonElement>(
		"[data-comments-retry]",
	);
	let loading = false;

	async function mountComments() {
		if (!container || loading || current !== revision) return;
		loading = true;
		if (retry) retry.hidden = true;
		if (message) message.textContent = "评论区正在加载…";
		try {
			const { init, getArticleCounter, updateArticleCounter } = await import(
				"@waline/client"
			);
			if (current !== revision || !container.isConnected) return;
			instance = init({
				el: container,
				serverURL: container.dataset.server || "",
				path: container.dataset.path || "/",
				lang: "zh-CN",
				dark: "html.dark",
				login: "force",
				pageSize: 10,
				wordLimit: [1, 3000],
				imageUploader: false,
				search: false,
				emoji: false,
				texRenderer: false,
				pageview: false,
				reaction: false,
				turnstileKey: container.dataset.turnstile || undefined,
				locale: {
					placeholder: "写下你的想法，或聊聊文章与补丁。提交后请等待审核。",
				},
			});
			if (message) message.textContent = "";

			counterAbort = new AbortController();
			const serverURL = container.dataset.server || "";
			const path = container.dataset.path || "/";
			const storageKey = `yuyu-article-like:${path}`;
			let liked = false;
			try {
				liked = localStorage.getItem(storageKey) === "1";
			} catch {
				/* Storage may be disabled. */
			}
			let counters: Awaited<ReturnType<typeof getArticleCounter>>;
			try {
				counters = await getArticleCounter({
					serverURL,
					lang: "zh-CN",
					paths: [path],
					type: ["reaction0"],
					signal: counterAbort.signal,
				});
			} catch {
				if (current === revision) {
					if (likeStatus)
						likeStatus.textContent = "点赞暂时无法加载，请稍后重试。";
					if (retry) retry.hidden = false;
				}
				return;
			}
			if (current !== revision || !container.isConnected) return;
			let count = Math.max(0, Number(counters[0]?.reaction0) || 0);
			const renderLike = () => {
				if (likeCount) likeCount.textContent = String(count);
				if (likeLabel) likeLabel.textContent = liked ? "已点赞" : "点赞";
				if (like) like.setAttribute("aria-pressed", String(liked));
			};
			renderLike();
			if (like) {
				like.disabled = false;
				like.onclick = async () => {
					like.disabled = true;
					try {
						await updateArticleCounter({
							serverURL,
							lang: "zh-CN",
							path,
							type: "reaction0",
							action: liked ? "desc" : undefined,
						});
						count = Math.max(0, count + (liked ? -1 : 1));
						liked = !liked;
						try {
							localStorage.setItem(storageKey, liked ? "1" : "0");
						} catch {
							/* The current page still remembers the vote. */
						}
						if (current !== revision) return;
						renderLike();
						if (likeStatus)
							likeStatus.textContent = liked
								? "已点赞，感谢支持！"
								: "已取消点赞。";
					} catch {
						if (current === revision && likeStatus)
							likeStatus.textContent = "点赞未成功，请稍后再试。";
					} finally {
						like.disabled = false;
					}
				};
			}
		} catch {
			if (current !== revision) return;
			instance?.destroy();
			instance = null;
			if (like) like.disabled = true;
			if (message) message.textContent = "评论暂时无法加载，请稍后重试。";
			if (retry) retry.hidden = false;
		} finally {
			loading = false;
		}
	}

	if (retry)
		retry.onclick = () => {
			instance?.destroy();
			instance = null;
			counterAbort?.abort();
			if (like) like.disabled = true;
			void mountComments();
		};
	if (!("IntersectionObserver" in window)) {
		void mountComments();
		return;
	}
	viewport = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				viewport?.disconnect();
				void mountComments();
			}
		},
		{ rootMargin: "300px" },
	);
	viewport.observe(container);
}

function bindNavigation() {
	window.swup.hooks.on("content:replace", destroyComments);
	window.swup.hooks.on("page:view", setupInteractions);
}

setupInteractions();
if (window.swup?.hooks) bindNavigation();
else document.addEventListener("swup:enable", bindNavigation, { once: true });
