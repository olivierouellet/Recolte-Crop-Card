/**
 * Dev harness: renders the card with a mock `hass` (the Récolte integration's sensors at the Central
 * Experimental Farm, as recorded on 2026-10-23), plus minimal stand-ins for ha-card and ha-icon.
 * Run with `yarn start`. URL options: `?dark&lang=en&width=320`, `?direct` to read AAFC live, `?shot` for the
 * README screenshots.
 */
import '../src/recolte-crop-card';
import type { RecolteCropCard } from '../src/recolte-crop-card';
import type { HassEntity, HomeAssistant, RecolteCardConfig } from '../src/types';
import * as mdi from '@mdi/js';

class HaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:block;background:var(--card-background-color);
      border-radius:var(--ha-card-border-radius);box-shadow:var(--ha-card-box-shadow);color:var(--primary-text-color)}</style><slot></slot>`;
  }
}
customElements.define('ha-card', HaCard);

/** Real Material Design Icons, as Home Assistant draws them, so screenshots match. */
class HaIcon extends HTMLElement {
  static observedAttributes = ['icon'];
  attributeChangedCallback() {
    const name = (this.getAttribute('icon') ?? '').replace(/^mdi:/, '');
    const key = 'mdi' + name.replace(/(^|-)(\w)/g, (_, _dash, c: string) => c.toUpperCase());
    const path = (mdi as Record<string, string>)[key] ?? '';
    // In a shadow root: light-DOM children would shift the nodes Lit binds to while it clones templates.
    this.style.cssText = 'display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)';
    (this.shadowRoot ?? this.attachShadow({ mode: 'open' })).innerHTML =
      `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="${path}"/></svg>`;
  }
}
customElements.define('ha-icon', HaIcon);

const params = new URLSearchParams(location.search);
if (params.has('dark')) document.body.classList.add('dark');
// Phone-width check: ?width=320 lays the cards out in one column of that width.
if (params.get('width')) document.getElementById('cards')!.style.gridTemplateColumns = `${params.get('width')}px`;

const ATTRIBUTION = 'Agriculture et Agroalimentaire Canada (Licence du gouvernement ouvert – Canada)';
const sensor = (slug: string, product: string, state: string, date: string): [string, HassEntity] => {
  const entity_id = `sensor.ferme_${slug}`;
  return [entity_id, { entity_id, state, last_updated: '', attributes: { product, date, attribution: ATTRIBUTION } }];
};
const states = Object.fromEntries([
  sensor('crop_heat_units_corn', 'ch_gs', '3516.92', '2026-10-19'),
  sensor('growing_degree_days_base_5', 'gd_5', '2133.8', '2026-10-19'),
  sensor('precipitation_7_days', 'ac_07', '21.0217', '2026-10-22'),
  sensor('precipitation_growing_season', 'ac_gs', '761.411', '2026-10-22'),
  sensor('precipitation_as_of_average_growing_season', 'av_gs', '136.719', '2026-10-21'),
  sensor('precipitation_percentile_growing_season', 'pe_gs', '99.7365', '2026-10-21'),
  sensor('dry_days_in_a_row', 'ds_cc', '5', '2026-10-21'),
  sensor('soil_moisture_as_of_normal', 'pnm_im', '138.66', '2026-10-19'),
  // Not recorded: plausible values to show the drought labels.
  sensor('spei_90_days', 'spei_90', '-1.62', '2026-10-19'),
  sensor('palmer_drought_severity_index', 'pdsi_im', '-2.4', '2026-10-19'),
]);
const hass: HomeAssistant = {
  language: params.get('lang') ?? 'fr',
  config: { latitude: 45.3889, longitude: -75.7152, location_name: 'Ferme expérimentale' },
  states,
  // Every sensor belongs to one Récolte location (device), as in the entity and device registries.
  entities: Object.fromEntries(
    Object.keys(states).map((entity_id) => [entity_id, { entity_id, device_id: 'dev-ferme', platform: 'recolte' }]),
  ),
  devices: { 'dev-ferme': { id: 'dev-ferme', name: 'Ferme expérimentale', name_by_user: null } },
};
const all = Object.keys(states);

const themes = ['earth', 'green_yellow', 'blue', 'red_black', 'red_grey', 'orange', 'auto'] as const;
const scenarios: Array<{ label: string; config: Partial<RecolteCardConfig> }> = [
  { label: 'Endroit · ordre de l’intégration', config: { device: 'dev-ferme' } },
  {
    label: 'Endroit · réordonné, trois masqués',
    config: { device: 'dev-ferme', products: ['pe_gs', 'ds_cc', 'ch_gs'], hide: ['gd_5', 'spei_90', 'pdsi_im'] },
  },
  { label: 'Endroit introuvable', config: { device: 'dev-gone' } },
  ...themes.map((theme) => ({
    label: `Thème ${theme}`,
    config: { entities: [all[0], all[1], all[5], all[8]], theme, chu_target: 3800 },
  })),
  {
    label: 'English · huit produits',
    config: { entities: all.slice(0, 8), language: 'en' as const, gdd_target: 2000 },
  },
  {
    label: 'Sans interprétation ni liens',
    config: { entities: all.slice(2, 6), show_interpretation: false, show_links: false, show_dates: false },
  },
  { label: 'Capteur introuvable', config: { entities: ['sensor.ferme_nope'] } },
];
if (params.has('direct')) {
  scenarios.unshift(
    {
      label: 'Direct · AAC en direct (domicile)',
      config: { products: ['ch_gs', 'gd_5', 'ac_07', 'ac_gs', 'pe_gs', 'spi_90'] },
    },
    { label: 'Direct · hors de la grille', config: { products: ['ch_gs'], latitude: 45, longitude: -50 } },
  );
}

// README screenshots: ?shot shows French and English, without labels.
const shown = params.has('shot')
  ? [
      { label: '', config: { entities: all.slice(0, 8), chu_target: 3800, title: 'Ferme' } },
      {
        label: '',
        config: {
          entities: [all[0], all[3], all[5], all[6], all[8], all[9]],
          language: 'en' as const,
          theme: 'green_yellow' as const,
        },
      },
    ]
  : scenarios;
if (params.has('shot')) document.body.classList.add('shot');

const grid = document.getElementById('cards')!;
for (const s of shown) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.innerHTML = `<h3>${s.label}</h3>`;
  const card = document.createElement('recolte-crop-card') as RecolteCropCard;
  card.setConfig({ type: 'custom:recolte-crop-card', ...s.config });
  card.hass = hass;
  cell.append(card);
  grid.append(cell);
}
