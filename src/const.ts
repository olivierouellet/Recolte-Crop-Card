export const CARD_VERSION = '0.2.0';
export const CARD_TAG = 'recolte-crop-card';
export const EDITOR_TAG = 'recolte-crop-card-editor';

/** Integration domain of the companion Home Assistant integration. */
export const INTEGRATION_DOMAIN = 'recolte';

export const DEFAULT_ICON = 'mdi:sprout';

/** AgClimate image services (English names; the French `agclimat` mirror serves the same rasters). */
export const SERVICES_URL = 'https://agriculture.canada.ca/imagery-images/rest/services/agclimate';

/** Direct mode re-reads the (cached) values this often; daily products come out once a day. */
export const REFRESH_MS = 3 * 3_600_000;

export const MAPS_URL = {
  fr: 'https://agriculture.canada.ca/atlas/agclimat',
  en: 'https://agriculture.canada.ca/atlas/agclimate',
};
export const INFO_URL = {
  fr: 'https://agriculture.canada.ca/fr/production-agricole/meteo',
  en: 'https://agriculture.canada.ca/en/agricultural-production/weather',
};
