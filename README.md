# lazy-proposals

Client proposals for Lazy: a web page and a PDF per proposal.

- `npm run intake` — open http://localhost:4317, add a client, a property, then a proposal. It saves `data/clients/<client>.json` and builds two things: the web page `site/p/<code>/index.html` (with a Print / save as PDF button) and the email `emails/<code>.html` (open "email" in the intake, press Copy email, paste into Gmail).
- `npm run build` — rebuild every proposal (after editing `data/booking-options.json` or `data/settings.json`).
- Commit and push; GitHub Pages serves `site/` at https://liza-bam.github.io/lazy-proposals/p/<code>/.

Data: `data/booking-options.json` (one entry per booking card), `data/settings.json` (whitepaper link, site address).
