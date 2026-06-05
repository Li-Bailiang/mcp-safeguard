# README images

Drop the demo screenshot here as **`demo.png`** — the main `README.md` references
it as `./docs/images/demo.png`.

## How to produce `demo.png`

1. Build the CLI: `pnpm build`
2. Copy a vulnerable sample somewhere **outside** this repo (so the repo's own
   `.mcp-safeguardrc.yaml` / `.mcpignore` don't filter it out), e.g. copy
   `tests/fixtures/vulnerable-extended` to a scratch folder.
3. Run a scan in that folder so the findings table + summary are on screen:
   `mcp-safeguard scan .`
4. Screenshot the terminal:
   - **Windows:** `Win + Shift + S`, select the terminal region.
5. Save the image as `docs/images/demo.png`.

Tip: a larger font + dark theme makes the screenshot more readable. Add the file
before publishing so the README image doesn't 404.
