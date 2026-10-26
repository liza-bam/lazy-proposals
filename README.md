# lazy-proposals

Client proposals for Lazy: an email per proposal, with the Direct booking options whitepaper attached.

**Clients, online:** https://liza-bam.github.io/lazy-proposals/app/ — the main view lists clients. Each client opens their contacts, properties, photo collections, saved proposals, billing notes and business timeline. Property intakes retain their own content and build progress.

- `data/clients/<client-id>.json` holds the client, contact details, notes, client timeline and proposal history.
- `data/websites/<property-id>.json` holds the property intake and its `clientId`. Existing property IDs, URLs, attachments and photo folders are preserved.
- `?client=carson` opens Carson with both properties. `?client=carson&property=saddleback-lodge` opens one intake. Existing `?id=<property-id>` links still resolve to the correct property and client.
- **Timeline → Confirmation email sent → Send confirmation email** opens the thank-you email (`data/templates/confirmation-email.html`) in Mail: ready for review 2 business days after the intake.
- **Timeline → Website ready email sent → Make the email** opens `propose.html`: any or all of the client's properties, and **Attach the offer (PDF)**, on by default. One email (`data/templates/done-email.html`, the LAZY email design) can cover both of Carson's websites. Pricing comes from `data/settings.json`, including its additional-property rate. **Open in Mail** puts it in Mail, formatted, from `senderEmail`, the PDF attached.
- **Mail helper** (`tools/mail-helper`): the app's emails open in Mail through it. Run `tools/mail-helper/Mail helper.command` (Terminal needs Accessibility and Automation for System Events and Mail); Chrome asks once to let the app reach it.
- New proposals save to `proposals/clients/<client-id>/<token>/`; the client records the selected property IDs and saved artifact path. Existing property-level proposal files and legacy history remain accessible.
- The app uses the existing signed-in GitHub connection. Version SHA checks prevent overwriting a newer save. No sales-contact routing or automatic email sending is added.
- `node tools/make-proposal.js carson` previews the grouped proposal without writing. Add `--properties=saddleback-lodge` to select a subset; add `--make` to save the email and PDF plus client history. A legacy property ID also resolves to its client.
- Photo collections: https://github.com/liza-bam/lazy-proposals/tree/main/data/materials — one collection per property, linked from the client view.
- Checks: `node --test tools/intake-test.cjs tools/client-model-test.cjs`.

The local tools below are retained for compatibility; the online client app is the current workspace.

- `npm run intake` — open http://localhost:4317, add a client, a property, then a proposal. It saves `data/clients/<client>.json` and builds the email `emails/<code>.html` (local only) and the whitepaper `site/direct-booking-options.pdf`.
- In the intake, open the proposal's **email**: Copy subject, Copy email, paste into Gmail, attach the PDF it offers.
- **Make proposal** — http://localhost:4317/propose?property=<intake id>: a form filled from the website intake (lazy-project/Website maker/.intake-projects: owner, email, property), the Lazy account (website, login) and the offer in `data/settings.json` → `proposal`. Check it, press **Looks good**: it writes the short email and a one-page PDF to `emails/` (local only). Claude then makes the Gmail draft to the owner with the PDF attached and opens it.
- `npm run build` — rebuild after editing `data/booking-options.json` or `data/settings.json`. Commit and push: GitHub Pages serves the PDF and the logo the email links to.
