import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		// Pages CMS serializes frontmatter dates as strings.
		published: z.coerce.date(),
		updated: z.coerce.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		downloads: z
			.array(
				z
					.object({
						name: z.string().trim().min(1),
						file: z
							.string()
							.regex(/^$|^\/downloads\/[^?#]+\.(zip|7z|rar|gz|xz)$/i)
							.optional()
							.default(""),
						url: z
							.union([
								z.literal(""),
								z
									.string()
									.url()
									.regex(/^https?:\/\//i),
							])
							.optional()
							.default(""),
						note: z.string().optional().default(""),
					})
					.refine((download) => download.file || download.url, {
						message: "补丁下载需要选择文件或填写外部链接",
					}),
			)
			.optional()
			.default([]),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
};
