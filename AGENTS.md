<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Responsive UI requirements

- Treat responsive behavior as a release requirement for every page and component, not as a desktop-only enhancement.
- Design mobile-first and verify layouts at 320px, 375px, 768px, 1024px, and wide desktop widths, including landscape where relevant.
- Prevent unintended horizontal scrolling. Reflow grids, forms, tables, diagrams, code blocks, and navigation instead of relying on fixed desktop widths.
- Keep interactive targets at least 44px, preserve visible `:focus-visible` states, and do not make essential behavior hover-only.
- Preserve all core content and functionality on small screens; use progressive disclosure only when it improves comprehension without hiding required actions.
- Respect readable text measures, safe spacing, keyboard navigation, screen readers, and `prefers-reduced-motion`.
- Before delivery, run the relevant tests, lint, build, and a responsive review covering mobile, tablet, desktop, touch, and keyboard interaction.
