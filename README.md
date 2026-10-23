<p align="center">
  <img src="https://raw.githubusercontent.com/olivierouellet/Recolte-Crop/main/assets/icon.svg" alt="Logo de Récolte" width="128" height="128">
</p>

<h1 align="center">Récolte Crop Card</h1>

<p align="center">Une carte agroclimatique pour Home Assistant · An agroclimate card for Home Assistant</p>

<p align="center"><b><a href="#français">Français</a> · <a href="#english">English</a></b></p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/olivierouellet/Recolte-Crop-Card/main/images/screenshot-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/olivierouellet/Recolte-Crop-Card/main/images/screenshot-light.png">
    <img src="https://raw.githubusercontent.com/olivierouellet/Recolte-Crop-Card/main/images/screenshot-light.png" alt="Récolte Crop Card en français et en anglais : couleurs terre et vert et jaune, unités thermiques avec la progression vers une cible, degrés-jours, précipitations, centile, jours secs, humidité du sol, SPEI et indice de Palmer (valeurs d’exemple pour les deux derniers) · Récolte Crop Card in French and English (example values for SPEI and Palmer)" width="800">
  </picture>
</p>

---

## Français

Une carte de tableau de bord pour les données agroclimatiques d’**Agriculture et Agroalimentaire Canada (AAC)** : unités thermiques de croissance (UTC), degrés-jours, précipitations et leur comparaison à la moyenne, jours secs, vagues de chaleur, humidité du sol et indices de sécheresse, à votre terre.

- Une **tuile par produit**, dans l’ordre de votre choix, avec la période mesurée.
- **L’interprétation** des centiles, des indices SPI et SPEI et des indices de Palmer : de « Extrêmement sec » à « Extrêmement humide ».
- **La progression vers les UTC de votre hybride** de maïs (ou vers une cible de degrés-jours).
- La date des données, et celle des produits hebdomadaires quand elle diffère.
- Toucher une tuile ouvre l’historique du capteur (avec l’intégration).
- **Sept jeux de couleurs** : terre, les couleurs des grandes marques de tracteurs (vert et jaune, bleu, rouge et noir, rouge et gris, orange), ou le thème de Home Assistant.
- En français et en anglais, en clair et en sombre, jusqu’à 320 px de large.

### Deux sources de données

| Source | Comment | Pour qui |
|---|---|---|
| **Intégration [Récolte](https://github.com/olivierouellet/Recolte-Crop)** | Choisissez ses capteurs. | Historique, statistiques à long terme, automatisations; une seule lecture par Home Assistant toutes les 3 heures. |
| **Directement d’AAC** | Choisissez les produits et l’endroit : le domicile, un repère sur la carte, ou la position de l’appareil qui modifie la carte. | Rien d’autre à installer. Chaque navigateur lit les valeurs lui-même et les garde 3 heures. |

### Installation

**Avec HACS (recommandé)**

[![Ouvrir votre instance Home Assistant et ce dépôt dans HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=olivierouellet&repository=Recolte-Crop-Card&category=plugin)

1. Dans Home Assistant, ouvrez **HACS** → **⋮** (en haut à droite) → **Dépôts personnalisés**.
2. Dépôt : `https://github.com/olivierouellet/Recolte-Crop-Card`, type : **Dashboard**, puis **Ajouter**. (Le bouton ci-dessus fait les étapes 1 et 2 pour vous.)
3. Cherchez **Récolte Crop Card**, ouvrez-la et cliquez sur **Télécharger**.
4. Rechargez la page du navigateur.

**Manuellement** : téléchargez `recolte-crop-card.js` de la [dernière version](https://github.com/olivierouellet/Recolte-Crop-Card/releases/latest), copiez-le dans `config/www/`, puis ajoutez la ressource `/local/recolte-crop-card.js` (type *Module JavaScript*) dans *Paramètres → Tableaux de bord → ⋮ → Ressources*.

### Configuration

Ajoutez la carte avec **+ Ajouter une carte → Récolte Crop Card**; l’éditeur visuel couvre toutes les options. En YAML :

```yaml
# Avec l’intégration Récolte
type: custom:recolte-crop-card
title: Ferme
entities:
  - sensor.ferme_unites_thermiques_de_croissance_mais
  - sensor.ferme_precipitations_saison_de_croissance
  - sensor.ferme_jours_secs_consecutifs
chu_target: 2700
```

```yaml
# Directement d’AAC, à un endroit précis (sans latitude ni longitude : le domicile)
type: custom:recolte-crop-card
products: [ch_gs, gd_5, ac_07, ac_gs, pe_gs, spi_90]
latitude: 46.8139
longitude: -71.2080
```

| Option | Défaut | Description |
|---|---|---|
| `entities` | | Capteurs de l’intégration Récolte, dans l’ordre d’affichage. |
| `products` | | Mode direct : codes des produits d’AAC (`ch_gs`, `ac_07`…), dans l’ordre d’affichage. La liste complète est dans le [README de l’intégration](https://github.com/olivierouellet/Recolte-Crop#produits). |
| `latitude`, `longitude` | domicile | Mode direct : l’endroit. Arrondis à quatre décimales par l’éditeur. |
| `title` | « Agroclimat » | Titre de la carte. |
| `icon` | `mdi:sprout` | Icône de l’en-tête. |
| `chu_target` | | UTC de votre hybride : une barre de progression sur la tuile des unités thermiques. |
| `gdd_target` | | Cible de degrés-jours : une barre sur les tuiles des degrés-jours. |
| `show_interpretation` | `true` | L’étiquette sec, normal ou humide des centiles et des indices. |
| `show_dates` | `true` | La date d’une tuile quand ses données sont plus anciennes que les autres. |
| `show_links` | `true` | Les liens vers les cartes agroclimatiques et la page météo d’AAC. |
| `theme` | `earth` | Couleurs de la carte : `earth` (brun, vert et jaune), `green_yellow`, `blue` (bleu et jaune), `red_black`, `red_grey`, `orange` (orange et gris foncé), ou `auto` pour suivre le thème de Home Assistant. |
| `language` | `auto` | `auto` (langue de Home Assistant), `fr` ou `en`. |

### Lire les valeurs

- **Produits quotidiens** (précipitations, températures, jours secs) : à jour d’hier. **Hebdomadaires** (UTC, degrés-jours, humidité du sol, indices) : à jour du lundi. Une tuile plus ancienne que les autres montre sa date.
- **Hors saison**, les produits de la saison de croissance (du 1er avril au 31 octobre) gardent leur valeur du 31 octobre.
- **Interprétation** : centiles sous 10 très bas, sous 25 bas, jusqu’à 75 normal, jusqu’à 90 élevé, au-delà très élevé; SPI et SPEI selon McKee (±1, ±1,5, ±2); Palmer selon Palmer (±1, ±2, ±3, ±4). La carte ne change jamais la valeur publiée.
- **Aucune donnée** : la grille d’AAC couvre les régions agricoles du Canada; au nord ou en mer, il n’y a pas de valeur.

### Développement

```bash
corepack enable && yarn install
yarn build   # lint, traductions, types, tests, puis dist/recolte-crop-card.js
yarn start   # page de test sur http://localhost:5050/ (?dark&lang=en&width=320, ?direct pour lire AAC en direct)
```

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

Données : [Agroclimat](https://agriculture.canada.ca/fr/production-agricole/meteo), Agriculture et Agroalimentaire Canada ([Licence du gouvernement ouvert – Canada](https://ouvert.canada.ca/fr/licence-du-gouvernement-ouvert-canada)). Récolte n’est pas affilié au gouvernement du Canada.

---

## English

A dashboard card for **Agriculture and Agri-Food Canada (AAFC)**’s agroclimate data: crop heat units (CHU), growing degree days, precipitation and how it compares with the average, dry days, heat waves, soil moisture and drought indices, at your field.

- **One tile per product**, in the order you choose, with the period measured.
- **What the values mean** for percentiles, SPI and SPEI, and Palmer indices: from “Extremely dry” to “Extremely wet”.
- **Progress toward your corn hybrid’s CHU rating** (or toward a degree day target).
- The data date, and that of weekly products when it differs.
- Tapping a tile opens the sensor’s history (with the integration).
- **Seven colour schemes**: earth tones, the colours of the big tractor makers (green and yellow, blue, red and black, red and grey, orange), or the Home Assistant theme.
- In French and English, light and dark, down to 320 px wide.

### Two data sources

| Source | How | Who it’s for |
|---|---|---|
| **[Récolte](https://github.com/olivierouellet/Recolte-Crop#english) integration** | Pick its sensors. | History, long-term statistics, automations; one read per Home Assistant every 3 hours. |
| **Directly from AAFC** | Pick the products and the location: the home, a pin on the map, or the location of the device editing the card. | Nothing else to install. Each browser reads the values itself and keeps them for 3 hours. |

### Installation

**With HACS (recommended)**

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=olivierouellet&repository=Recolte-Crop-Card&category=plugin)

1. In Home Assistant, open **HACS** → **⋮** (top right) → **Custom repositories**.
2. Repository: `https://github.com/olivierouellet/Recolte-Crop-Card`, type: **Dashboard**, then **Add**. (The button above does steps 1 and 2 for you.)
3. Search for **Récolte Crop Card**, open it and click **Download**.
4. Reload the browser page.

**Manually:** download `recolte-crop-card.js` from the [latest release](https://github.com/olivierouellet/Recolte-Crop-Card/releases/latest), copy it to `config/www/`, then add the resource `/local/recolte-crop-card.js` (type *JavaScript module*) under *Settings → Dashboards → ⋮ → Resources*.

### Configuration

Add the card with **+ Add card → Récolte Crop Card**; the visual editor covers every option. In YAML:

```yaml
# With the Récolte integration
type: custom:recolte-crop-card
title: Farm
entities:
  - sensor.farm_crop_heat_units_corn
  - sensor.farm_precipitation_growing_season
  - sensor.farm_dry_days_in_a_row
chu_target: 2700
```

```yaml
# Directly from AAFC, at a given place (without latitude and longitude: the home)
type: custom:recolte-crop-card
products: [ch_gs, gd_5, ac_07, ac_gs, pe_gs, spi_90]
latitude: 49.8951
longitude: -97.1384
language: en
```

| Option | Default | Description |
|---|---|---|
| `entities` | | Récolte integration sensors, in display order. |
| `products` | | Direct mode: AAFC product codes (`ch_gs`, `ac_07`…), in display order. The full list is in the [integration’s README](https://github.com/olivierouellet/Recolte-Crop#products). |
| `latitude`, `longitude` | home | Direct mode: the location. Rounded to four decimals by the editor. |
| `title` | “Agroclimate” | Card title. |
| `icon` | `mdi:sprout` | Header icon. |
| `chu_target` | | Your hybrid’s CHU rating: a progress bar on the crop heat units tile. |
| `gdd_target` | | A degree day target: a bar on the degree day tiles. |
| `show_interpretation` | `true` | The dry, normal or wet label on percentiles and indices. |
| `show_dates` | `true` | A tile’s date when its data is older than the others’. |
| `show_links` | `true` | Links to AAFC’s agroclimate maps and weather page. |
| `theme` | `earth` | Card colours: `earth` (brown, green and yellow), `green_yellow`, `blue` (blue and yellow), `red_black`, `red_grey`, `orange` (orange and dark grey), or `auto` to follow the Home Assistant theme. |
| `language` | `auto` | `auto` (Home Assistant’s language), `fr` or `en`. |

### Reading the values

- **Daily products** (precipitation, temperatures, dry days): as of yesterday. **Weekly** (CHU, degree days, soil moisture, indices): as of Monday. A tile older than the others shows its date.
- **Out of season**, growing season products (April 1 to October 31) keep their October 31 value.
- **Meaning**: percentiles under 10 much below, under 25 below, up to 75 normal, up to 90 above, beyond much above; SPI and SPEI on McKee’s scale (±1, ±1.5, ±2); Palmer indices on Palmer’s (±1, ±2, ±3, ±4). The card never changes the published value.
- **No data**: AAFC’s grid covers Canada’s agricultural regions; in the far north or at sea there is no value.

### Development

```bash
corepack enable && yarn install
yarn build   # lint, translations, types, tests, then dist/recolte-crop-card.js
yarn start   # test page at http://localhost:5050/ (?dark&lang=en&width=320, ?direct to read AAFC live)
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

Data: [AgClimate](https://agriculture.canada.ca/en/agricultural-production/weather), Agriculture and Agri-Food Canada ([Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)). Récolte is not affiliated with the Government of Canada.
