import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { HomeAssistant, Reading, RecolteCardConfig } from './types';
import { CARD_TAG, CARD_VERSION, DEFAULT_ICON, EDITOR_TAG, INFO_URL, MAPS_URL, REFRESH_MS } from './const';
import { DEFAULT_PRODUCTS, PRODUCTS, Product } from './products';
import { cachedReadings, fromEntity, isRecolteSensor, recolteSensors } from './data/aafc';
import { locationName, locationSensors, recolteLocations } from './data/locations';
import { interpret, progress } from './interpret';
import { visibleOrder } from './order';
import { Lang, intlLocale, localize, resolveLanguage } from './localize/localize';

console.info(
  `%c  RÉCOLTE CROP CARD \n%c  Version ${CARD_VERSION}    `,
  'color: #33691e; font-weight: bold; background: #f1f8e9',
  'color: white; font-weight: bold; background: #558b2f',
);

interface WindowWithCustomCards extends Window {
  customCards: Array<{ type: string; name: string; description: string; preview?: boolean; documentationURL?: string }>;
}
const w = window as unknown as WindowWithCustomCards;
w.customCards = w.customCards || [];
w.customCards.push({
  type: CARD_TAG,
  name: 'Récolte Crop Card',
  description:
    'Agroclimat d’AAC : UTC, degrés-jours, précipitations, sécheresse · AAFC agroclimate: CHU, GDD, precipitation, drought. FR / EN.',
  preview: true,
  documentationURL: 'https://github.com/olivierouellet/Recolte-Crop-Card',
});

const DEFAULTS = {
  show_interpretation: true,
  show_dates: true,
  show_links: true,
  language: 'auto',
  theme: 'earth',
} as const;

type ResolvedConfig = RecolteCardConfig & Required<Pick<RecolteCardConfig, keyof typeof DEFAULTS>>;

/** A tile: the product, and its reading once there is one. */
interface Tile {
  product: Product;
  reading?: Reading;
  entity?: string;
}

@customElement(CARD_TAG)
export class RecolteCropCard extends LitElement {
  public static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor');
    return document.createElement(EDITOR_TAG);
  }

  /** Default config when the card is added from the picker: a Récolte location, else direct at home. */
  public static getStubConfig(hass: HomeAssistant): Partial<RecolteCardConfig> {
    const location = recolteLocations(hass)[0];
    if (location) return { device: location.id };
    const sensors = recolteSensors(hass);
    return sensors.length ? { entities: sensors.slice(0, 8) } : { products: DEFAULT_PRODUCTS };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: ResolvedConfig;
  @state() private _fetched?: Reading[];
  @state() private _error?: string;

  private _fetchedFor = '';
  private _fetchedAt = 0;
  private _timer?: number;

  public setConfig(config: RecolteCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    if (config.device && config.entities?.length) throw new Error(localize('card.both_sources', 'fr'));
    if (!config.device && config.entities?.length && config.products?.length) {
      throw new Error(localize('card.products_with_entities', 'fr'));
    }
    this._config = { ...DEFAULTS, ...config } as ResolvedConfig;
    this._maybeFetch();
  }

  public getCardSize(): number {
    const count = this._config?.entities?.length ?? this._config?.products?.length ?? 8;
    return 1 + Math.ceil(count / 2) * 2;
  }

  public getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 'auto' as const };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => this._maybeFetch(), 600_000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
  }

  protected willUpdate(): void {
    // The home location arrives with `hass`; the first fetch may wait for it.
    this._maybeFetch();
  }

  /** Direct mode: where to read, the configured point or Home Assistant's home. */
  private _location(): [number, number] | null {
    const cfg = this._config;
    if (cfg?.latitude !== undefined && cfg?.longitude !== undefined) return [cfg.latitude, cfg.longitude];
    const home = this.hass?.config;
    return home && typeof home.latitude === 'number' ? [home.latitude, home.longitude] : null;
  }

  private _maybeFetch(): void {
    const cfg = this._config;
    if (!cfg || cfg.device || cfg.entities?.length || !cfg.products?.length) return;
    const location = this._location();
    if (!location) return;
    const target = `${location.join(',')}:${cfg.products.join(',')}`;
    if (target === this._fetchedFor && Date.now() - this._fetchedAt < REFRESH_MS) return;
    if (target !== this._fetchedFor) this._fetched = undefined;
    this._fetchedFor = target;
    this._fetchedAt = Date.now();
    cachedReadings(location[0], location[1], cfg.products)
      .then((readings) => {
        if (target !== this._fetchedFor) return;
        this._fetched = readings;
        this._error = undefined;
      })
      .catch((err) => {
        console.warn('Récolte Crop Card:', err);
        this._fetchedAt = Date.now() - REFRESH_MS + 300_000; // retry in 5 minutes
        if (!this._fetched) this._error = 'card.fetch_failed';
      });
  }

  /** The tiles to show, in the configured order; null while direct mode is still loading. */
  private _tiles(): Tile[] | null {
    const cfg = this._config!;
    if (cfg.device) {
      const sensors = locationSensors(this.hass!, cfg.device);
      return visibleOrder([...sensors.keys()], cfg.products, cfg.hide).map((key) => {
        const entity = sensors.get(key)!;
        return { product: PRODUCTS[key], entity, reading: fromEntity(this.hass!.states[entity]) ?? undefined };
      });
    }
    if (cfg.entities?.length) {
      return cfg.entities.flatMap((entity): Tile[] => {
        const stateObj = this.hass?.states[entity];
        if (!stateObj || !isRecolteSensor(stateObj)) return [];
        const product = PRODUCTS[String(stateObj.attributes.product)];
        return [{ product, entity, reading: fromEntity(stateObj) ?? undefined }];
      });
    }
    if (!this._fetched) return null;
    const byKey = new Map(this._fetched.map((r) => [r.key, r]));
    return (cfg.products ?? [])
      .filter((key) => key in PRODUCTS)
      .map((key) => ({ product: PRODUCTS[key], reading: byKey.get(key) }));
  }

  protected render(): TemplateResult | typeof nothing {
    const cfg = this._config;
    if (!cfg || !this.hass) return nothing;
    const lang = resolveLanguage(cfg.language, this.hass);
    const t = (key: string, vars?: Record<string, string>) => localize(key, lang, vars);

    let message: string | undefined;
    if (cfg.device) {
      if (!locationSensors(this.hass, cfg.device).size) {
        message = locationName(this.hass, cfg.device)
          ? t('card.no_sensors')
          : t('card.device_not_found', { device: cfg.device });
      }
    } else if (!cfg.entities?.length && !cfg.products?.length) message = t('card.no_source');
    else if (cfg.entities?.length) {
      const missing = cfg.entities.find((e) => !this.hass!.states[e]);
      const foreign = cfg.entities.find((e) => this.hass!.states[e] && !isRecolteSensor(this.hass!.states[e]));
      if (missing) message = t('card.entity_not_found', { entity: missing });
      else if (foreign) message = t('card.not_recolte', { entity: foreign });
    } else if (this._error) message = t(this._error);

    const tiles = message ? null : this._tiles();
    // Direct mode only: with the integration, an unavailable sensor shows as its own tile.
    const empty = tiles && tiles.length > 0 && tiles.every((tile) => !tile.reading) && !tiles[0].entity;
    const title = cfg.title || (cfg.device && locationName(this.hass, cfg.device)) || t('card.default_title');

    return html`
      <ha-card class="theme-${cfg.theme} ${cfg.theme === 'auto' ? '' : 'banded'}">
        <div class="header">
          <ha-icon icon=${cfg.icon || DEFAULT_ICON}></ha-icon>
          <div class="title">${title}</div>
        </div>
        ${
          message
            ? html`<div class="message">${message}</div>`
            : !tiles
              ? html`<div class="message muted">${t('card.loading')}</div>`
              : empty
                ? html`<div class="message">${t('card.no_data_here')}</div>`
                : this._renderTiles(tiles, lang)
        }
        ${tiles && !empty ? this._renderFooter(tiles, lang) : nothing}
      </ha-card>
    `;
  }

  private _renderTiles(tiles: Tile[], lang: Lang): TemplateResult {
    const newest = this._newestDate(tiles);
    return html`<div class="tiles">${tiles.map((tile) => this._renderTile(tile, lang, newest))}</div>`;
  }

  private _renderTile(tile: Tile, lang: Lang, newest: string): TemplateResult {
    const cfg = this._config!;
    const t = (key: string, vars?: Record<string, string>) => localize(key, lang, vars);
    const { product, reading } = tile;
    const meaning = cfg.show_interpretation && reading ? interpret(product.scale, reading.value) : null;
    const target =
      product.key === 'ch_gs' ? cfg.chu_target : product.key.startsWith('gd_') ? cfg.gdd_target : undefined;
    const done = reading ? progress(reading.value, target) : null;
    const period = t(`product.${product.key}.period`);
    const older = cfg.show_dates && reading?.date && reading.date !== newest ? this._shortDate(reading.date, lang) : '';

    return html`
      <div
        class="tile ${tile.entity ? 'clickable' : ''} ${reading ? '' : 'missing'}"
        title=${t(`product.${product.key}.name`)}
        role=${tile.entity ? 'button' : nothing}
        tabindex=${tile.entity ? '0' : nothing}
        @click=${() => this._moreInfo(tile.entity)}
        @keydown=${(ev: KeyboardEvent) => (ev.key === 'Enter' || ev.key === ' ') && this._moreInfo(tile.entity)}
      >
        <div class="label">
          <ha-icon icon=${product.icon}></ha-icon><span>${t(`product.${product.key}.label`)}</span>
        </div>
        <div class="value">${reading ? this._formatValue(product, reading.value, lang) : t('card.no_data')}</div>
        <div class="period">${[period, older].filter(Boolean).join(' · ')}</div>
        ${meaning ? html`<div class="chip" data-tone=${meaning.tone}>${t(`class.${meaning.label}`)}</div>` : nothing}
        ${
          done !== null && target
            ? html`<div class="progress" title=${this._targetText(done, target, product, lang)}>
                  <div class="fill ${done >= 1 ? 'reached' : ''}" style="width:${done * 100}%"></div>
                </div>
                <div class="period">${this._targetText(done, target, product, lang)}</div>`
            : nothing
        }
      </div>
    `;
  }

  private _targetText(done: number, target: number, product: Product, lang: Lang): string {
    const t = (key: string, vars?: Record<string, string>) => localize(key, lang, vars);
    const goal = this._formatValue(product, target, lang);
    if (done >= 1) return t('card.target_reached', { target: goal });
    const percent = new Intl.NumberFormat(intlLocale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(
      done,
    );
    return t('card.target_progress', { percent, target: goal });
  }

  private _formatValue(product: Product, value: number, lang: Lang): string {
    const number = new Intl.NumberFormat(intlLocale(lang), {
      maximumFractionDigits: product.precision,
      minimumFractionDigits: product.precision,
    }).format(value);
    switch (product.unit) {
      case 'days':
        return localize(Math.abs(value) < 2 ? 'card.day' : 'card.days', lang, { value: number });
      case 'chu':
      case 'gdd':
        return localize(`card.${product.unit}`, lang, { value: number });
      case '%':
        return lang === 'fr' ? `${number} %` : `${number}%`;
      case null:
        return number;
      default:
        return `${number} ${product.unit}`;
    }
  }

  private _newestDate(tiles: Tile[]): string {
    return tiles.reduce(
      (newest, tile) => (tile.reading?.date && tile.reading.date > newest ? tile.reading.date : newest),
      '',
    );
  }

  /** "22 oct." / "Oct 22": the data date is a calendar day, not a moment. */
  private _shortDate(date: string, lang: Lang): string {
    return new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'UTC', day: 'numeric', month: 'short' })
      .format(Date.parse(`${date}T12:00:00Z`))
      .replace(/ /g, '\u00a0');
  }

  private _renderFooter(tiles: Tile[], lang: Lang): TemplateResult {
    const cfg = this._config!;
    const t = (key: string, vars?: Record<string, string>) => localize(key, lang, vars);
    const newest = this._newestDate(tiles);
    const long = newest
      ? new Intl.DateTimeFormat(intlLocale(lang), {
          timeZone: 'UTC',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(Date.parse(`${newest}T12:00:00Z`))
      : '';
    const link = (href: string, icon: string, label: string) =>
      html`<a href=${href} target="_blank" rel="noopener noreferrer"><ha-icon icon=${icon}></ha-icon>${label}</a>`;
    return html`
      <div class="footer">
        ${long ? html`<span class="muted">${t('card.data_as_of', { date: long })}</span>` : nothing}
        ${
          cfg.show_links
            ? html`<span class="links">
                ${link(MAPS_URL[lang], 'mdi:map-outline', t('card.link_maps'))}
                ${link(INFO_URL[lang], 'mdi:open-in-new', t('card.link_info'))}
              </span>`
            : nothing
        }
      </div>
    `;
  }

  private _moreInfo(entityId?: string): void {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
  }

  static styles = css`
    :host {
      display: block;
      --recolte-accent: var(--success-color, #43a047);
      --recolte-dry: var(--warning-color, #ffa600);
      --recolte-very-dry: var(--error-color, #db4437);
      --recolte-wet: var(--info-color, #039be5);
    }
    /* Themes: tile tint, tile icons, progress bars, and the header band. The dry and wet labels keep their
       colours in every theme: they carry meaning. */
    ha-card {
      padding: 12px 16px;
      --rc-tint: var(--primary-color, #03a9f4);
      --rc-ink: var(--recolte-accent);
      --rc-fill: var(--recolte-accent);
      --rc-header-icon: var(--recolte-accent);
    }
    ha-card.theme-earth {
      --rc-header-bg: #5d4037;
      --rc-header-fg: #fff;
      --rc-header-icon: #f9c74f;
      --rc-stripe: #7cb342;
      --rc-tint: #a1887f;
      --rc-ink: #558b2f;
      --rc-fill: #7cb342;
    }
    ha-card.theme-green_yellow {
      --rc-header-bg: #367c2b;
      --rc-header-fg: #fff;
      --rc-header-icon: #ffde00;
      --rc-stripe: #ffde00;
      --rc-tint: #367c2b;
      --rc-ink: #367c2b;
      --rc-fill: #367c2b;
    }
    ha-card.theme-blue {
      --rc-header-bg: #1f4e9e;
      --rc-header-fg: #fff;
      --rc-header-icon: #ffd100;
      --rc-stripe: #ffd100;
      --rc-tint: #1f4e9e;
      --rc-ink: #1f4e9e;
      --rc-fill: #1f4e9e;
    }
    ha-card.theme-red_black {
      --rc-header-bg: #231f20;
      --rc-header-fg: #fff;
      --rc-header-icon: #e31837;
      --rc-stripe: #d2232a;
      --rc-tint: #d2232a;
      --rc-ink: #c41e3a;
      --rc-fill: #d2232a;
    }
    ha-card.theme-red_grey {
      --rc-header-bg: #c8102e;
      --rc-header-fg: #fff;
      --rc-header-icon: #e6e6e6;
      --rc-stripe: #a7a9ac;
      --rc-tint: #a7a9ac;
      --rc-ink: #c8102e;
      --rc-fill: #c8102e;
    }
    ha-card.theme-orange {
      /* Dark text: white on this orange is too faint to read. */
      --rc-header-bg: #ed6b06;
      --rc-header-fg: #1a1a1a;
      --rc-header-icon: #1a1a1a;
      --rc-stripe: #3c3c3b;
      --rc-tint: #ed6b06;
      --rc-ink: #d35400;
      --rc-fill: #ed6b06;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .banded .header {
      margin: -12px -16px 12px;
      padding: 10px 16px;
      color: var(--rc-header-fg);
      background: var(--rc-header-bg);
      border-bottom: 3px solid var(--rc-stripe);
      border-radius: var(--ha-card-border-radius, 12px) var(--ha-card-border-radius, 12px) 0 0;
    }
    .header ha-icon {
      color: var(--rc-header-icon);
    }
    .title {
      font-size: 1.15em;
      font-weight: 500;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(132px, 100%), 1fr));
      gap: 8px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding: 8px 10px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--rc-tint) 11%, var(--card-background-color, #fff));
    }
    .tile.clickable {
      cursor: pointer;
    }
    .tile.clickable:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 1px;
    }
    .label {
      display: flex;
      align-items: flex-start;
      line-height: 1.3;
      gap: 4px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      --mdc-icon-size: 16px;
    }
    .label span {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .label ha-icon {
      flex-shrink: 0;
      /* Mixed with the text colour: darker in light mode, lighter in dark mode. */
      color: color-mix(in srgb, var(--rc-ink) 80%, var(--primary-text-color));
    }
    .value {
      font-size: 1.35em;
      font-weight: 500;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .missing .value {
      font-size: 1em;
      font-weight: 400;
      color: var(--secondary-text-color);
      line-height: 1.75;
    }
    .period {
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .chip {
      align-self: flex-start;
      margin-top: 4px;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 0.78em;
      font-weight: 500;
      --tone: var(--recolte-accent);
      color: var(--tone);
      background: color-mix(in srgb, var(--tone) 16%, transparent);
    }
    .chip[data-tone='-1'] {
      --tone: var(--recolte-dry);
    }
    .chip[data-tone='-2'],
    .chip[data-tone='-3'] {
      --tone: var(--recolte-very-dry);
    }
    .chip[data-tone='1'],
    .chip[data-tone='2'],
    .chip[data-tone='3'] {
      --tone: var(--recolte-wet);
    }
    .progress {
      height: 6px;
      margin-top: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: color-mix(in srgb, var(--rc-fill) 22%, transparent);
    }
    .fill {
      height: 100%;
      border-radius: 3px;
      background: color-mix(in srgb, var(--rc-fill) 85%, var(--primary-text-color));
    }
    .message {
      padding: 8px 0;
    }
    .muted {
      color: var(--secondary-text-color);
    }
    .footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 4px 16px;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color);
      font-size: 0.85em;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
    }
    .links a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary-color);
      text-decoration: none;
      --mdc-icon-size: 16px;
    }
    .banded .links a {
      color: color-mix(in srgb, var(--rc-ink) 80%, var(--primary-text-color));
    }
    .links a:hover {
      text-decoration: underline;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'recolte-crop-card': RecolteCropCard;
  }
}
