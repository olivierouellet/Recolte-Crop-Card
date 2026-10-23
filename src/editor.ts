import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import type { HomeAssistant, RecolteCardConfig, Theme } from './types';
import { DEFAULT_ICON, EDITOR_TAG, INTEGRATION_DOMAIN } from './const';
import { DEFAULT_PRODUCTS, PRODUCTS } from './products';
import { recolteSensors } from './data/aafc';
import { locationSensors, recolteLocations } from './data/locations';
import { fullOrder, moved, storedOrder, visibleOrder } from './order';
import { Lang, localize, resolveLanguage } from './localize/localize';

type Source = 'location' | 'sensor' | 'direct';

// Material Design Icons "drag" (mdiDrag), drawn inline: the handle must show before ha-icon loads.
const DRAG_ICON =
  'M7,19V17H9V19H7M11,19V17H13V19H11M15,19V17H17V19H15M7,15V13H9V15H7M11,15V13H13V15H11M15,15V13H17V15H15M7,11V9H9V11H7M11,11V9H13V11H11M15,11V9H17V11H15M7,7V5H9V7H7M11,7V5H13V7H11M15,7V5H17V7H15Z';

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<{
      createCardElement: (config: object) => { constructor: { getConfigElement?: () => Promise<unknown> } };
    }>;
  }
}

const THEMES: Theme[] = ['earth', 'green_yellow', 'blue', 'red_black', 'red_grey', 'orange', 'auto'];
type LocationSource = 'home' | 'map';

/** Values the editor shows when the config does not set them (same as the card's defaults). */
const FORM_DEFAULTS: Partial<RecolteCardConfig> = {
  show_interpretation: true,
  show_dates: true,
  show_links: true,
  theme: 'earth',
  language: 'auto',
};

interface FormSchema {
  name: string;
  type?: string;
  title?: string;
  flatten?: boolean;
  expanded?: boolean;
  selector?: Record<string, unknown>;
  schema?: FormSchema[];
}

/** Four decimals: about ten metres, plenty for a 1 km grid and no more precise than it needs to be. */
const round = (n: number) => Math.round(n * 1e4) / 1e4;

@customElement(EDITOR_TAG)
export class RecolteCropCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: RecolteCardConfig;
  @state() private _source?: Source;
  @state() private _locationSource?: LocationSource;
  @state() private _geo?: 'busy' | 'failed' | 'insecure';

  public setConfig(config: RecolteCardConfig): void {
    this._config = config;
    if (config.device) this._source = 'location';
    else if (config.entities?.length) this._source = 'sensor';
    else if (config.products?.length) this._source = 'direct';
    if (config.latitude !== undefined) this._locationSource = 'map';
  }

  private get _lang(): Lang {
    return resolveLanguage(this._config?.language, this.hass);
  }

  private _t(key: string): string {
    return localize(key, this._lang);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // `ha-sortable` is lazy-loaded by Home Assistant. Loading the entities card's editor, which uses it,
    // makes sure it is defined.
    if (!customElements.get('ha-sortable') && window.loadCardHelpers) {
      window.loadCardHelpers().then(async (helpers) => {
        const card = helpers.createCardElement({ type: 'entities', entities: [] });
        await card.constructor.getConfigElement?.();
        this.requestUpdate();
      });
    }
  }

  private _currentSource(): Source {
    if (this._source) return this._source;
    if (recolteLocations(this.hass).length) return 'location';
    return recolteSensors(this.hass).length ? 'sensor' : 'direct';
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const source = this._currentSource();

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ source }}
        .schema=${[
          {
            name: 'source',
            selector: {
              select: {
                mode: 'list',
                options: [
                  { value: 'location', label: this._t('editor.source_location') },
                  { value: 'sensor', label: this._t('editor.source_sensor') },
                  { value: 'direct', label: this._t('editor.source_direct') },
                ],
              },
            },
          },
        ]}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._sourceChanged}
      ></ha-form>

      <div class="source">
        ${source === 'location' ? this._renderLocation() : source === 'sensor' ? this._renderSensors() : this._renderDirect()}
      </div>
      ${this._renderTiles(source)}

      <ha-form
        .hass=${this.hass}
        .data=${{ ...FORM_DEFAULTS, ...this._config }}
        .schema=${this._optionsSchema()}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._optionsChanged}
      ></ha-form>
    `;
  }

  private _renderLocation(): TemplateResult {
    const locations = recolteLocations(this.hass);
    if (!locations.length) return html`<div class="note">${this._t('editor.no_location')}</div>`;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ device: this._config!.device }}
        .schema=${[{ name: 'device', selector: { device: { integration: INTEGRATION_DOMAIN } } }]}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._deviceChanged}
      ></ha-form>
      <a class="link" href="/config/integrations/integration/${INTEGRATION_DOMAIN}" target="_blank" rel="noopener">
        <ha-icon icon="mdi:cog-outline"></ha-icon>${this._t('editor.change_products')}
      </a>
    `;
  }

  /** The products of the chosen location, in the integration's order. */
  private _available(): string[] {
    return this._config?.device ? [...locationSensors(this.hass, this._config.device).keys()] : [];
  }

  /** What the tile list shows, in order: products, or sensors when they are chosen one by one. */
  private _items(source: Source): Array<{ id: string; product: string }> {
    const cfg = this._config!;
    if (source === 'location') {
      return fullOrder(this._available(), cfg.products).map((key) => ({ id: key, product: key }));
    }
    if (source === 'sensor') {
      return (cfg.entities ?? []).map((id) => ({
        id,
        product: String(this.hass.states[id]?.attributes.product ?? ''),
      }));
    }
    return (cfg.products ?? []).filter((key) => key in PRODUCTS).map((key) => ({ id: key, product: key }));
  }

  /** Drag to reorder; with a location, a switch per product to show or hide it. */
  private _renderTiles(source: Source): TemplateResult | typeof nothing {
    const items = this._items(source);
    if (items.length < 2 && source !== 'location') return nothing;
    if (!items.length) return nothing;
    const hidden = new Set(source === 'location' ? (this._config!.hide ?? []) : []);
    return html`
      <div class="tiles-title">${this._t('editor.tiles')}</div>
      <div class="note">${this._t(source === 'location' ? 'editor.tiles_hint_location' : 'editor.tiles_hint')}</div>
      <ha-sortable handle-selector=".handle" @item-moved=${(ev: CustomEvent) => this._tileMoved(ev, source)}>
        <div class="tiles">
          ${repeat(
            items,
            (item) => item.id,
            (item) => {
              const product = PRODUCTS[item.product];
              const name = product ? this._t(`product.${item.product}.name`) : item.id;
              return html`
                <div class="tile-row ${hidden.has(item.id) ? 'hidden' : ''}">
                  <div class="handle" title=${this._t('editor.drag')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${DRAG_ICON}></path></svg>
                  </div>
                  <ha-icon icon=${product?.icon ?? 'mdi:help-circle-outline'}></ha-icon>
                  <span class="name">${name}</span>
                  ${
                    source === 'location'
                      ? html`<ha-switch
                          .checked=${!hidden.has(item.id)}
                          aria-label=${name}
                          @change=${(ev: Event) => this._toggleTile(item.id, (ev.target as HTMLInputElement).checked)}
                        ></ha-switch>`
                      : nothing
                  }
                </div>
              `;
            },
          )}
        </div>
      </ha-sortable>
    `;
  }

  private _tileMoved(ev: CustomEvent<{ oldIndex: number; newIndex: number }>, source: Source): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const ids = moved(
      this._items(source).map((item) => item.id),
      oldIndex,
      newIndex,
    );
    const config = { ...this._config! };
    if (source === 'sensor') config.entities = ids;
    else if (source === 'direct') config.products = ids;
    else {
      const order = storedOrder(this._available(), ids);
      if (order) config.products = order;
      else delete config.products;
    }
    this._update(config);
  }

  private _toggleTile(key: string, shown: boolean): void {
    const hide = new Set(this._config!.hide ?? []);
    if (shown) hide.delete(key);
    else hide.add(key);
    const config: RecolteCardConfig = { ...this._config!, hide: [...hide] };
    if (!hide.size) delete config.hide;
    this._update(config);
  }

  private _deviceChanged(ev: CustomEvent): void {
    const config = { ...this._config!, device: ev.detail.value.device };
    // Another location has other products: start from its own order.
    delete config.products;
    delete config.hide;
    if (!config.device) delete config.device;
    this._update(config);
  }

  private _renderSensors(): TemplateResult {
    const sensors = recolteSensors(this.hass);
    if (!sensors.length) return html`<div class="note">${this._t('editor.no_sensor')}</div>`;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ entities: this._config!.entities ?? [] }}
        .schema=${[{ name: 'entities', selector: { entity: { multiple: true, include_entities: sensors } } }]}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._entitiesChanged}
      ></ha-form>
      <a class="link" href="/config/integrations/integration/${INTEGRATION_DOMAIN}" target="_blank" rel="noopener">
        <ha-icon icon="mdi:cog-outline"></ha-icon>${this._t('editor.change_products')}
      </a>
    `;
  }

  private _renderDirect(): TemplateResult {
    const cfg = this._config!;
    const where: LocationSource = this._locationSource ?? (cfg.latitude !== undefined ? 'map' : 'home');
    const point = {
      latitude: cfg.latitude ?? this.hass.config.latitude,
      longitude: cfg.longitude ?? this.hass.config.longitude,
    };
    const geoNote =
      this._geo === 'busy'
        ? 'editor.geolocating'
        : this._geo === 'failed'
          ? 'editor.geolocate_failed'
          : this._geo === 'insecure'
            ? 'editor.geolocate_insecure'
            : undefined;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ products: cfg.products ?? [], location_source: where }}
        .schema=${[
          {
            name: 'products',
            selector: {
              select: {
                multiple: true,
                mode: 'dropdown',
                options: Object.keys(PRODUCTS).map((key) => ({
                  value: key,
                  label: `${this._t(`product.${key}.name`)} (${key})`,
                })),
              },
            },
          },
          {
            name: 'location_source',
            selector: {
              select: {
                mode: 'list',
                options: [
                  { value: 'home', label: this._t('editor.location_home') },
                  { value: 'map', label: this._t('editor.location_map') },
                ],
              },
            },
          },
        ]}
        .computeLabel=${this._computeLabel}
        @value-changed=${(ev: CustomEvent) => this._directChanged(ev, where)}
      ></ha-form>
      ${
        where === 'map'
          ? html`
              <ha-form
                .hass=${this.hass}
                .data=${{ location: point }}
                .schema=${[{ name: 'location', selector: { location: { radius: false } } }]}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                @value-changed=${this._locationChanged}
              ></ha-form>
              <button class="link" type="button" @click=${this._geolocate} ?disabled=${this._geo === 'busy'}>
                <ha-icon icon="mdi:crosshairs-gps"></ha-icon>${this._t('editor.geolocate')}
              </button>
              ${geoNote ? html`<div class="note">${this._t(geoNote)}</div>` : nothing}
            `
          : nothing
      }
    `;
  }

  private _optionsSchema(): FormSchema[] {
    const source = this._currentSource();
    const shown =
      source === 'location'
        ? visibleOrder(this._available(), this._config?.products, this._config?.hide)
        : source === 'direct'
          ? (this._config?.products ?? [])
          : this._shownProducts();
    const hasChu = shown.includes('ch_gs');
    const hasGdd = shown.some((key) => key.startsWith('gd_'));
    const target = { number: { min: 0, max: 5000, step: 50, mode: 'box' } };
    return [
      { name: 'title', selector: { text: {} } },
      { name: 'icon', selector: { icon: { placeholder: DEFAULT_ICON } } },
      {
        name: 'theme',
        selector: {
          select: {
            mode: 'dropdown',
            options: THEMES.map((theme) => ({ value: theme, label: this._t(`editor.theme_${theme}`) })),
          },
        },
      },
      {
        name: 'language',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'auto', label: this._t('editor.lang_auto') },
              { value: 'fr', label: this._t('editor.lang_fr') },
              { value: 'en', label: this._t('editor.lang_en') },
            ],
          },
        },
      },
      {
        name: '',
        type: 'expandable',
        flatten: true,
        expanded: true,
        title: this._t('editor.section_display'),
        schema: [
          ...(hasChu ? [{ name: 'chu_target', selector: target }] : []),
          ...(hasGdd ? [{ name: 'gdd_target', selector: target }] : []),
          { name: 'show_interpretation', selector: { boolean: {} } },
          { name: 'show_dates', selector: { boolean: {} } },
          { name: 'show_links', selector: { boolean: {} } },
        ],
      },
    ];
  }

  /** The products of the chosen sensors. */
  private _shownProducts(): string[] {
    return (this._config?.entities ?? []).map((e) => String(this.hass.states[e]?.attributes.product ?? ''));
  }

  private _computeLabel = (schema: FormSchema): string => this._t(`editor.${schema.name}`);

  private _computeHelper = (schema: FormSchema): string | undefined => {
    if (['title', 'chu_target', 'gdd_target'].includes(schema.name)) return this._t(`editor.${schema.name}_helper`);
    if (schema.name === 'location') return this._t('editor.location_helper');
    return undefined;
  };

  private _sourceChanged(ev: CustomEvent): void {
    const source = ev.detail.value.source as Source;
    if (source === this._currentSource()) return;
    this._source = source;
    const config = { ...this._config! };
    for (const key of ['device', 'hide', 'entities', 'products', 'latitude', 'longitude'] as const) delete config[key];
    if (source === 'location') {
      const location = recolteLocations(this.hass)[0];
      if (location) config.device = location.id;
    } else if (source === 'sensor') {
      const sensors = recolteSensors(this.hass);
      if (sensors.length) config.entities = sensors.slice(0, 8);
    } else {
      config.products = [...DEFAULT_PRODUCTS];
    }
    this._update(config);
  }

  private _entitiesChanged(ev: CustomEvent): void {
    this._update({ ...this._config!, entities: ev.detail.value.entities });
  }

  private _directChanged(ev: CustomEvent, where: LocationSource): void {
    const value = ev.detail.value;
    const config = { ...this._config!, products: value.products as string[] };
    if (value.location_source !== where) {
      this._locationSource = value.location_source;
      this._geo = undefined;
      if (value.location_source === 'home') {
        delete config.latitude;
        delete config.longitude;
      } else {
        config.latitude = round(this.hass.config.latitude);
        config.longitude = round(this.hass.config.longitude);
      }
    }
    this._update(config);
  }

  private _locationChanged(ev: CustomEvent): void {
    const location = ev.detail.value.location;
    if (!location) return;
    this._update({ ...this._config!, latitude: round(location.latitude), longitude: round(location.longitude) });
  }

  /** Puts this device's position in the config once; the card itself never asks for it. */
  private _geolocate(): void {
    if (!window.isSecureContext || !navigator.geolocation) {
      this._geo = 'insecure';
      return;
    }
    this._geo = 'busy';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this._geo = undefined;
        this._update({
          ...this._config!,
          latitude: round(pos.coords.latitude),
          longitude: round(pos.coords.longitude),
        });
      },
      () => {
        this._geo = 'failed';
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  }

  private _optionsChanged(ev: CustomEvent): void {
    const value = { ...ev.detail.value };
    // Keep the YAML short: drop values equal to the defaults, and empty ones.
    for (const [key, def] of Object.entries(FORM_DEFAULTS)) if (value[key] === def) delete value[key];
    for (const key of ['title', 'icon', 'chu_target', 'gdd_target']) if (!value[key]) delete value[key];
    this._update(value as RecolteCardConfig);
  }

  private _update(config: RecolteCardConfig): void {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }

  static styles = css`
    .source {
      margin: 8px 0 16px;
    }
    .tiles-title {
      font-weight: 500;
      margin-top: 8px;
    }
    .tiles {
      margin-bottom: 16px;
    }
    .tile-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
      --mdc-icon-size: 20px;
    }
    .tile-row ha-icon {
      color: var(--secondary-text-color);
    }
    .tile-row.hidden .name,
    .tile-row.hidden ha-icon {
      color: var(--disabled-text-color);
    }
    .handle {
      display: flex;
      padding: 8px;
      margin-left: -8px;
      cursor: grab;
      color: var(--secondary-text-color);
    }
    .handle svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    .name {
      flex: 1;
      min-width: 0;
    }
    .note {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
    .link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      color: var(--primary-color);
      text-decoration: none;
      cursor: pointer;
      --mdc-icon-size: 18px;
    }
    .link[disabled] {
      opacity: 0.5;
      cursor: default;
    }
  `;
}
