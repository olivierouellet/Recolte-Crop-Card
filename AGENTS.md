# Agent instructions

For AI coding assistants (Claude Code, GitHub Copilot, Codex, Cursor and others) working in this repository.
People should start with [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

A Home Assistant dashboard card (Lit and TypeScript, bundled by Rollup, distributed through HACS) for Agriculture
and Agri-Food Canada's agroclimate data. It reads the [Récolte](https://github.com/olivierouellet/Recolte-Crop)
integration's sensors, or reads AAFC's AgClimate image services directly.

## Before you finish

```bash
corepack enable && yarn install   # once
yarn build                        # lint, translations, type check, tests, then dist/recolte-crop-card.js
```

`yarn build` must pass; CI runs the same, plus HACS validation. For a visible change, look at it with
`yarn start` (`http://localhost:5050/?dark&lang=en&width=320`) in light and dark, and at 320 px.

## Conventions

* **French first.** Every document is bilingual, French section first; a change users see goes in both.
* `src/localize/languages/fr.json` is the reference: `yarn lint` checks that `en.json` has the same keys and
  `{placeholders}`, and the card falls back to French. Add every string to both files.
* `src/products.ts` is mirrored in Récolte's `custom_components/recolte/products.py`, and `src/data/aafc.ts`
  follows its `api.py`: change one, change the other.
* Always name the product (`tType`) in a mosaic rule, and make AAFC requests one at a time.
* Tests replay the responses in `tests/fixtures/` (recorded by the integration), never the network.
* The values are AAFC's: never correct or smooth them. Interpretation labels sit beside the value.
* Nothing from the network is inserted as HTML: no `unsafeHTML` or `innerHTML`; let Lit escape the text.
* `localStorage` may be missing or full: wrap every access in `try`.
* The card never asks for the device's location; only the editor does, once, when the user taps the button.
* `dist/` is never committed; the release workflow builds `recolte-crop-card.js` from the tag and attaches it.
* A release bumps `package.json` and `CARD_VERSION` in `src/const.ts` in a commit titled
  `[Card] Version X.Y.Z`, then a GitHub release tagged `vX.Y.Z`.

## Commits and publishing

* Commit titles read `[Topic] What changed`, one topic per commit. Topics in use: `[Card]`, `[Tests]`, `[Tooling]`, `[Docs]`.
* **Never commit, push, tag, publish a release, or open an issue or pull request unless asked.** Approval for
  one of these is not approval for the next.
* `main` is protected against force-pushes and deletion: never rewrite history that is already pushed.
* Never post comments on issues or pull requests on the user's behalf without their review.

## AI policy

This project follows its [AI policy](AI_POLICY.md): a person reviews and understands every change, no
autonomous contributions, and nothing is posted on someone's behalf without their review.
