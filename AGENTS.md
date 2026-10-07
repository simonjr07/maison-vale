<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Maison Vale engineering rules

- Read the relevant project documentation before modifying behavior, and inspect existing patterns before introducing new ones.
- Do not invent product requirements. Keep focused changes aligned with the documented roadmap and report assumptions or unresolved questions.
- Preserve server-side authority over totals, inventory, authentication, authorization, and payment verification.
- Never expose secrets or commit environment values. Do not use destructive database commands without explicit approval.
- Add tests for behavioral changes when the test infrastructure exists; do not create a fake test suite to inflate coverage.
- Update documentation when requirements, architecture, or contracts change.
- Prefer maintainable, accessible, responsive code over cleverness.
- Do not commit or push unless explicitly instructed.

## Reviewer-facing text

README content, documentation, UI copy, labels, validation messages, empty states, errors, admin text, portfolio descriptions, and reviewer-facing comments must be natural, concise, grammatically clean, consistent, and easy to scan. Avoid unnecessary symbols, decorative formatting, excessive punctuation, and awkward AI-style phrasing.
