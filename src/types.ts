/** The parts of Home Assistant's `hass` object this card uses. */
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  config: { latitude: number; longitude: number; location_name?: string };
  language?: string;
  locale?: { language: string };
}

export type Language = 'auto' | 'fr' | 'en';

/** Card colours: Home Assistant's theme, earth tones, or the colour schemes of the big tractor makers. */
export type Theme = 'auto' | 'earth' | 'green_yellow' | 'blue' | 'red_black' | 'red_grey' | 'orange';

export interface RecolteCardConfig {
  type: string;
  /** The Récolte integration's sensors, in the order to show them. */
  entities?: string[];
  /** Direct mode: AAFC product codes (tType), in the order to show them. */
  products?: string[];
  /** Direct mode: where to read them; Home Assistant's home when left out. */
  latitude?: number;
  longitude?: number;
  title?: string;
  icon?: string;
  /** Your corn hybrid's rating: shows progress on the crop heat units tile. */
  chu_target?: number;
  /** A growing degree day target: shows progress on the degree day tiles. */
  gdd_target?: number;
  show_interpretation?: boolean;
  show_dates?: boolean;
  show_links?: boolean;
  theme?: Theme;
  language?: Language;
}

/** A product's value at the location, and the date (YYYY-MM-DD) its period ends. */
export interface Reading {
  key: string;
  value: number;
  date: string;
  /** The sensor it comes from, in integration mode: tapping the tile opens its history. */
  entity?: string;
}

declare global {
  interface HASSDomEvents {
    'config-changed': { config: RecolteCardConfig };
  }
}
