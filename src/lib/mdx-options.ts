import remarkGfm from 'remark-gfm'
import type { MDXRemote } from 'next-mdx-remote/rsc'

/** GFM is required for pipe tables — the course source markdown uses them constantly. */
export const MDX_OPTIONS: NonNullable<Parameters<typeof MDXRemote>[0]['options']> = {
  mdxOptions: { remarkPlugins: [remarkGfm] },
}
