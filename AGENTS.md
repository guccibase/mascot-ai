<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## QA after critical changes

After billing, generation, studio, marketplace, or mascot-factory changes: run `npm test` **and** follow [`docs/comprehensive-qa.md`](docs/comprehensive-qa.md) (live balance checks, create/edit quality vs example packs, studio settings, app assets, top-ups, edge cases). See `.cursor/rules/comprehensive-qa-after-critical-changes.mdc`.
