# lazy-proposals

Client proposals for Lazy: an email per proposal, with the Direct booking options whitepaper attached.

- `npm run intake` — open http://localhost:4317, add a client, a property, then a proposal. It saves `data/clients/<client>.json` and builds the email `emails/<code>.html` (local only) and the whitepaper `site/direct-booking-options.pdf`.
- In the intake, open the proposal's **email**: Copy subject, Copy email, paste into Gmail, attach the PDF it offers.
- `npm run build` — rebuild after editing `data/booking-options.json` or `data/settings.json`. Commit and push: GitHub Pages serves the PDF and the logo the email links to.
