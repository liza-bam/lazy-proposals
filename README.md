# lazy-proposals

Client proposals for Lazy: an email per proposal, with the Direct booking options whitepaper attached.

- `npm run intake` — open http://localhost:4317, add a client, a property, then a proposal. It saves `data/clients/<client>.json` and builds the email `emails/<code>.html` (local only) and the whitepaper `site/direct-booking-options.pdf`.
- In the intake, open the proposal's **email**: Copy subject, Copy email, paste into Gmail, attach the PDF it offers.
- **Make proposal** — http://localhost:4317/propose?property=<intake id>: a form filled from the website intake (lazy-project/Website maker/.intake-projects: owner, email, property), the Lazy account (website, login) and the offer in `data/settings.json` → `proposal`. Check it, press **Looks good**: it writes the short email and a one-page PDF to `emails/` (local only). Claude then makes the Gmail draft to the owner with the PDF attached and opens it.
- `npm run build` — rebuild after editing `data/booking-options.json` or `data/settings.json`. Commit and push: GitHub Pages serves the PDF and the logo the email links to.
