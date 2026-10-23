# Contribuer · Contributing

**[Français](#français) · [English](#english)**

---

## Français

Merci de votre intérêt! En participant, vous acceptez le [code de conduite](CODE_OF_CONDUCT.md). Vous utilisez l’IA? Lisez la [politique sur l’IA](AI_POLICY.md).
Les issues et les demandes de tirage sont bienvenues en français ou en anglais.

### Installation

```bash
corepack enable
yarn install
yarn build   # lint, traductions, vérification des types, tests, puis dist/recolte-crop-card.js
yarn start   # page de test sur http://localhost:5050/ (?dark&lang=en&width=320, ?direct)
```

### Conventions

* **Le français d’abord.** Toute documentation est bilingue, avec la section française en premier.
  `src/localize/languages/fr.json` est la référence : `yarn lint` vérifie que `en.json` a les mêmes
  clés et les mêmes `{variables}`, et la carte se rabat sur le français s’il manque un texte.
* **Le catalogue des produits** est dans `src/products.ts` et suit celui de l’intégration
  (`custom_components/recolte/products.py` dans [Récolte](https://github.com/olivierouellet/Recolte-Crop)) :
  changer l’un, c’est changer l’autre. Chaque produit a son nom dans `fr.json` et `en.json`.
* **La lecture d’AAC** (`src/data/aafc.ts`) suit les mêmes règles que `api.py` de l’intégration : le produit est
  toujours nommé, une requête à la fois. Les tests rejouent les réponses enregistrées par l’intégration
  (`tests/fixtures/`).
* **Commits** : `[Sujet] Ce qui a changé`, un sujet par commit (par exemple `[Card]`, `[Docs]`, `[Tooling]`).

---

## English

Thanks for your interest! By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Using AI tools? Read the [AI policy](AI_POLICY.md).
Issues and pull requests are welcome in French or English.

### Setup

```bash
corepack enable
yarn install
yarn build   # lint, translations, type check, tests, then dist/recolte-crop-card.js
yarn start   # test page at http://localhost:5050/ (?dark&lang=en&width=320, ?direct)
```

### Conventions

* **French first.** All documentation is bilingual, with the French section first.
  `src/localize/languages/fr.json` is the reference: `yarn lint` checks that `en.json` has the same
  keys and `{placeholders}`, and the card falls back to French when a string is missing.
* **The product catalog** is in `src/products.ts` and follows the integration’s
  (`custom_components/recolte/products.py` in [Récolte](https://github.com/olivierouellet/Recolte-Crop)):
  change one, change the other. Every product has its name in `fr.json` and `en.json`.
* **Reading AAFC** (`src/data/aafc.ts`) follows the same rules as the integration’s `api.py`: the product is always
  named, one request at a time. The tests replay the responses the integration recorded (`tests/fixtures/`).
* **Commits**: `[Topic] What changed`, one topic each (for example `[Card]`, `[Docs]`, `[Tooling]`).
